import { NextResponse } from "next/server";
import {
  GetDefaultKharchaCategory,
  KHARCHA_EMAIL_BATCH_SCHEMA,
  VerifyKharchaSignature,
  type KharchaEmailBatch,
} from "@/lib/kharcha-ingestion";
import {
  GetBsDate,
  GetKathmanduDateKey,
  GetKharchaSourceFromSender,
  ParseKharchaEmail,
} from "@/lib/kharcha";
import { CreateAdminSupabaseClient } from "@/lib/supabase/admin";
import { InsertTables } from "@/lib/supabase/database.types";

export const runtime = "nodejs";

const MAX_REQUEST_BYTES = 512000;
const USER_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type AdminClient = ReturnType<typeof CreateAdminSupabaseClient>;
type EmailInput = KharchaEmailBatch["emails"][number];
type IngestionResult = {
  gmailMessageId: string;
  status: "processed" | "duplicate" | "needs_review" | "unsupported" | "failed";
  transactionId: string | null;
};

export async function POST(request: Request) {
  const configuredSecret = process.env.KHARCHA_INGEST_SECRET;
  const configuredUserId = process.env.KHARCHA_USER_ID;

  if (!configuredSecret || configuredSecret.length < 32 || !configuredUserId || !USER_ID_PATTERN.test(configuredUserId)) {
    return NextResponse.json({ error: "Kharcha ingestion is not configured" }, { status: 503 });
  }

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_REQUEST_BYTES) {
    return NextResponse.json({ error: "Request is too large" }, { status: 413 });
  }

  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, "utf8") > MAX_REQUEST_BYTES) {
    return NextResponse.json({ error: "Request is too large" }, { status: 413 });
  }

  const timestamp = request.headers.get("x-kharcha-timestamp") || "";
  const signature = request.headers.get("x-kharcha-signature") || "";
  if (!VerifyKharchaSignature(rawBody, timestamp, signature, configuredSecret)) {
    return NextResponse.json({ error: "Invalid request signature" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }

  const validation = KHARCHA_EMAIL_BATCH_SCHEMA.safeParse(payload);
  if (!validation.success) {
    return NextResponse.json({ error: "Request body is invalid" }, { status: 400 });
  }

  let client: AdminClient;
  try {
    client = CreateAdminSupabaseClient();
  } catch {
    return NextResponse.json({ error: "Kharcha ingestion is not configured" }, { status: 503 });
  }

  const results: IngestionResult[] = [];
  for (const email of validation.data.emails) {
    try {
      results.push(await ProcessEmail(client, configuredUserId, email));
    } catch {
      await RecordFailedEmail(client, configuredUserId, email);
      results.push({
        gmailMessageId: email.gmailMessageId,
        status: "failed",
        transactionId: null,
      });
    }
  }

  const hasFailures = results.some((result) => result.status === "failed");
  try {
    await UpdateSyncState(client, configuredUserId, validation.data.emails, hasFailures);
  } catch {
    return NextResponse.json({ error: "Could not update Kharcha sync state", results }, { status: 503 });
  }

  if (hasFailures) {
    return NextResponse.json({ error: "Some messages could not be stored", results }, { status: 503 });
  }

  return NextResponse.json({ ok: true, results });
}

async function ProcessEmail(client: AdminClient, userId: string, email: EmailInput): Promise<IngestionResult> {
  const { data: existingEvent, error: eventLookupError } = await client
    .from("kharcha_ingestion_events")
    .select("status, transaction_id")
    .eq("user_id", userId)
    .eq("gmail_message_id", email.gmailMessageId)
    .maybeSingle();

  if (eventLookupError) {
    throw eventLookupError;
  }

  if (existingEvent?.transaction_id && (existingEvent.status === "processed" || existingEvent.status === "duplicate")) {
    return {
      gmailMessageId: email.gmailMessageId,
      status: "duplicate",
      transactionId: existingEvent.transaction_id,
    };
  }

  const parsed = ParseKharchaEmail(email);
  const source = GetKharchaSourceFromSender(email.from);

  if (parsed.status !== "processed") {
    await UpsertEvent(client, {
      user_id: userId,
      gmail_message_id: email.gmailMessageId,
      sender: email.from,
      subject: email.subject,
      received_at: email.receivedAt,
      source,
      status: parsed.status,
      reason: parsed.reason,
      transaction_id: null,
    });

    return {
      gmailMessageId: email.gmailMessageId,
      status: parsed.status,
      transactionId: null,
    };
  }

  const existingTransactionId = await FindExistingTransaction(
    client,
    userId,
    email.gmailMessageId,
    parsed.transaction.source,
    parsed.transaction.externalTransactionId
  );

  if (existingTransactionId) {
    await UpsertEvent(client, {
      user_id: userId,
      gmail_message_id: email.gmailMessageId,
      sender: email.from,
      subject: email.subject,
      received_at: email.receivedAt,
      source: parsed.transaction.source,
      status: "duplicate",
      reason: "Transaction was already imported",
      transaction_id: existingTransactionId,
    });

    return {
      gmailMessageId: email.gmailMessageId,
      status: "duplicate",
      transactionId: existingTransactionId,
    };
  }

  const occurredAt = new Date(parsed.transaction.occurredAt);
  const bsDate = GetBsDate(occurredAt);
  const transaction: InsertTables<"kharcha_transactions"> = {
    user_id: userId,
    amount: parsed.transaction.amount,
    currency: parsed.transaction.currency,
    source: parsed.transaction.source,
    channel: parsed.transaction.channel,
    category: GetDefaultKharchaCategory(parsed.transaction.channel),
    merchant: parsed.transaction.merchant,
    description: parsed.transaction.description,
    external_transaction_id: parsed.transaction.externalTransactionId,
    gmail_message_id: email.gmailMessageId,
    occurred_at: parsed.transaction.occurredAt,
    occurred_on: GetKathmanduDateKey(occurredAt),
    bs_year: bsDate.year,
    bs_month: bsDate.month,
    bs_day: bsDate.day,
    ingestion_method: "email",
    status: "posted",
  };

  const { data: createdTransaction, error: createError } = await client
    .from("kharcha_transactions")
    .insert(transaction)
    .select("id")
    .single();

  if (createError) {
    if (createError.code === "23505") {
      const racedTransactionId = await FindExistingTransaction(
        client,
        userId,
        email.gmailMessageId,
        parsed.transaction.source,
        parsed.transaction.externalTransactionId
      );
      if (racedTransactionId) {
        await UpsertEvent(client, {
          user_id: userId,
          gmail_message_id: email.gmailMessageId,
          sender: email.from,
          subject: email.subject,
          received_at: email.receivedAt,
          source: parsed.transaction.source,
          status: "duplicate",
          reason: "Transaction was already imported",
          transaction_id: racedTransactionId,
        });
        return {
          gmailMessageId: email.gmailMessageId,
          status: "duplicate",
          transactionId: racedTransactionId,
        };
      }
    }
    throw createError;
  }

  await UpsertEvent(client, {
    user_id: userId,
    gmail_message_id: email.gmailMessageId,
    sender: email.from,
    subject: email.subject,
    received_at: email.receivedAt,
    source: parsed.transaction.source,
    status: "processed",
    reason: "",
    transaction_id: createdTransaction.id,
  });

  return {
    gmailMessageId: email.gmailMessageId,
    status: "processed",
    transactionId: createdTransaction.id,
  };
}

async function FindExistingTransaction(
  client: AdminClient,
  userId: string,
  gmailMessageId: string,
  source: "NIMB" | "ESEWA",
  externalTransactionId: string | null
): Promise<string | null> {
  const { data: gmailMatch, error: gmailError } = await client
    .from("kharcha_transactions")
    .select("id")
    .eq("user_id", userId)
    .eq("gmail_message_id", gmailMessageId)
    .maybeSingle();

  if (gmailError) {
    throw gmailError;
  }
  if (gmailMatch) {
    return gmailMatch.id;
  }
  if (!externalTransactionId) {
    return null;
  }

  const { data: externalMatch, error: externalError } = await client
    .from("kharcha_transactions")
    .select("id")
    .eq("user_id", userId)
    .eq("source", source)
    .eq("external_transaction_id", externalTransactionId)
    .maybeSingle();

  if (externalError) {
    throw externalError;
  }

  return externalMatch?.id || null;
}

async function UpsertEvent(client: AdminClient, event: InsertTables<"kharcha_ingestion_events">) {
  const { error } = await client
    .from("kharcha_ingestion_events")
    .upsert(event, { onConflict: "user_id,gmail_message_id" });

  if (error) {
    throw error;
  }
}

async function RecordFailedEmail(client: AdminClient, userId: string, email: EmailInput) {
  try {
    await UpsertEvent(client, {
      user_id: userId,
      gmail_message_id: email.gmailMessageId,
      sender: email.from,
      subject: email.subject,
      received_at: email.receivedAt,
      source: GetKharchaSourceFromSender(email.from),
      status: "failed",
      reason: "Message could not be stored",
      transaction_id: null,
    });
  } catch {
    return;
  }
}

async function UpdateSyncState(
  client: AdminClient,
  userId: string,
  emails: EmailInput[],
  failed: boolean
) {
  const now = new Date().toISOString();
  const syncState: InsertTables<"kharcha_sync_state"> = {
    user_id: userId,
    last_checked_at: now,
    consecutive_failures: failed ? 1 : 0,
  };

  if (failed) {
    syncState.last_error_at = now;
    syncState.last_error = "One or more messages could not be stored";
  } else {
    syncState.last_success_at = now;
    syncState.last_error_at = null;
    syncState.last_error = null;
  }

  if (emails.length > 0) {
    syncState.last_message_at = emails
      .map((email) => email.receivedAt)
      .sort((first, second) => second.localeCompare(first))[0];
  }

  const { error } = await client
    .from("kharcha_sync_state")
    .upsert(syncState, { onConflict: "user_id" });

  if (error) {
    throw error;
  }
}

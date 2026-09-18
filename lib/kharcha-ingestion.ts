import { createHmac, timingSafeEqual } from "crypto";
import { z } from "zod";
import { KharchaCategory, KharchaChannel } from "./kharcha";

const SIGNATURE_REPLAY_WINDOW_MS = 5 * 60 * 1000;

export const KHARCHA_EMAIL_SCHEMA = z.object({
  gmailMessageId: z.string().trim().min(1).max(255),
  from: z.string().trim().min(3).max(320),
  subject: z.string().trim().max(500),
  receivedAt: z.string().datetime({ offset: true }),
  bodyText: z.string().min(1).max(50000),
}).strict();

export const KHARCHA_EMAIL_BATCH_SCHEMA = z.object({
  heartbeat: z.boolean().optional().default(false),
  emails: z.array(KHARCHA_EMAIL_SCHEMA).max(25),
}).strict().refine((value) => value.heartbeat || value.emails.length > 0, {
  message: "A batch must contain email or heartbeat data",
});

export type KharchaEmailBatch = z.infer<typeof KHARCHA_EMAIL_BATCH_SCHEMA>;

export function CreateKharchaSignature(body: string, timestamp: string, secret: string): string {
  return createHmac("sha256", secret).update(`${timestamp}.${body}`, "utf8").digest("base64url");
}

export function VerifyKharchaSignature(
  body: string,
  timestamp: string,
  signature: string,
  secret: string,
  currentTime = Date.now()
): boolean {
  if (!/^\d{13}$/.test(timestamp) || !/^[A-Za-z0-9_-]{43}$/.test(signature)) {
    return false;
  }

  const requestTime = Number(timestamp);
  if (!Number.isFinite(requestTime) || Math.abs(currentTime - requestTime) > SIGNATURE_REPLAY_WINDOW_MS) {
    return false;
  }

  const expectedSignature = CreateKharchaSignature(body, timestamp, secret);
  const expectedBuffer = Buffer.from(expectedSignature, "utf8");
  const actualBuffer = Buffer.from(signature, "utf8");

  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, actualBuffer);
}

export function GetDefaultKharchaCategory(channel: KharchaChannel): KharchaCategory {
  if (channel === "wallet_top_up" || channel === "bank_transfer") {
    return "Transfers";
  }

  if (channel === "cash_withdrawal") {
    return "Cash Withdrawal";
  }

  if (channel === "fee") {
    return "Fees";
  }

  return "Other";
}

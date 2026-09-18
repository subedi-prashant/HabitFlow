import NepaliDate from "nepali-date-converter";

export const KHARCHA_SOURCES = ["NIMB", "NIC_ASIA", "ESEWA", "MANUAL"] as const;
export const KHARCHA_CHANNELS = [
  "merchant_payment",
  "qr_payment",
  "bank_transfer",
  "wallet_top_up",
  "card_payment",
  "cash_withdrawal",
  "fee",
  "cash",
  "other",
] as const;
export const KHARCHA_CATEGORIES = [
  "Food & Drink",
  "Transport",
  "Bills & Utilities",
  "Shopping",
  "Health",
  "Education",
  "Entertainment",
  "Housing",
  "Travel",
  "Transfers",
  "Cash Withdrawal",
  "Fees",
  "Other",
] as const;
export const KHARCHA_STATUSES = ["posted", "reversed", "excluded"] as const;
export const KHARCHA_INGESTION_METHODS = ["email", "manual"] as const;
export const KHARCHA_SOURCE_LABELS: Record<KharchaSource, string> = {
  NIMB: "NIMB",
  NIC_ASIA: "NIC ASIA",
  ESEWA: "eSewa",
  MANUAL: "Manual",
};
export const KHARCHA_CHANNEL_LABELS: Record<KharchaChannel, string> = {
  merchant_payment: "Merchant payment",
  qr_payment: "QR payment",
  bank_transfer: "Bank transfer",
  wallet_top_up: "Wallet top-up",
  card_payment: "Card payment",
  cash_withdrawal: "Cash withdrawal",
  fee: "Fee",
  cash: "Cash",
  other: "Other",
};

export type KharchaSource = (typeof KHARCHA_SOURCES)[number];
export type KharchaChannel = (typeof KHARCHA_CHANNELS)[number];
export type KharchaCategory = (typeof KHARCHA_CATEGORIES)[number];
export type KharchaStatus = (typeof KHARCHA_STATUSES)[number];
export type KharchaIngestionMethod = (typeof KHARCHA_INGESTION_METHODS)[number];

export interface KharchaEmailInput {
  gmailMessageId: string;
  from: string;
  subject: string;
  receivedAt: string;
  bodyText: string;
}

export interface ManualKharchaInput {
  amount: number;
  channel: KharchaChannel;
  category: KharchaCategory;
  merchant: string;
  description: string;
  occurredAt: string;
}

export interface ParsedKharchaTransaction {
  source: Extract<KharchaSource, "NIMB" | "ESEWA">;
  amount: number;
  currency: "NPR";
  occurredAt: string;
  merchant: string;
  description: string;
  externalTransactionId: string | null;
  channel: KharchaChannel;
}

export type KharchaEmailParseResult =
  | { status: "processed"; transaction: ParsedKharchaTransaction }
  | { status: "needs_review"; source: Extract<KharchaSource, "NIMB" | "ESEWA">; reason: string }
  | { status: "unsupported"; reason: string };

export interface BSEntryDate {
  year: number;
  month: number;
  day: number;
}

const NIMB_SENDER = "donot_reply@nimb.com.np";
const ESEWA_SENDER = "donotreply@esewa.com.np";
const KATHMANDU_OFFSET_MINUTES = 345;
const MONTHS: Record<string, number> = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

export function ParseKharchaEmail(email: KharchaEmailInput): KharchaEmailParseResult {
  const source = GetKharchaSourceFromSender(email.from);

  if (source === "NIMB") {
    return ParseNimbEmail(email.bodyText);
  }

  if (source === "ESEWA") {
    return ParseEsewaEmail(email.bodyText);
  }

  return { status: "unsupported", reason: "Sender is not supported" };
}

export function GetKharchaSourceFromSender(from: string): Extract<KharchaSource, "NIMB" | "ESEWA"> | null {
  const sender = NormalizeSender(from);
  if (sender === NIMB_SENDER) {
    return "NIMB";
  }
  if (sender === ESEWA_SENDER) {
    return "ESEWA";
  }
  return null;
}

export function FormatNpr(amount: number): string {
  return `NPR ${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount)}`;
}

export function GetBsDate(date: Date): BSEntryDate {
  const kathmanduParts = GetKathmanduParts(date);
  const neutralDate = new Date(
    kathmanduParts.year,
    kathmanduParts.month - 1,
    kathmanduParts.day,
    12,
    0,
    0
  );
  const bsDate = new NepaliDate(neutralDate);

  return {
    year: bsDate.getYear(),
    month: bsDate.getMonth() + 1,
    day: bsDate.getDate(),
  };
}

export function FormatBsDate(date: BSEntryDate): string {
  return `${date.year}/${String(date.month).padStart(2, "0")}/${String(date.day).padStart(2, "0")}`;
}

export function GetKathmanduDateKey(date: Date): string {
  const parts = GetKathmanduParts(date);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

function ParseNimbEmail(bodyText: string): KharchaEmailParseResult {
  const normalized = NormalizeEmailText(bodyText);
  const collapsed = normalized.replace(/\s+/g, " ").trim();

  if (/\bhas been credited by\b/i.test(collapsed)) {
    return { status: "unsupported", reason: "Incoming credits are not expenses" };
  }

  if (!/\bhas been debited\b/i.test(collapsed)) {
    return { status: "needs_review", source: "NIMB", reason: "NIMB debit marker is missing" };
  }

  const debitMatch = collapsed.match(
    /has been debited by\s+NPR\s+([0-9][0-9,]*(?:\.[0-9]{1,2})?)\s+on\s+(\d{1,2}[A-Za-z]{3}\d{2}\s+\d{1,2}:\d{2}:\d{2})\s*\./i
  );
  const detailMatch = collapsed.match(/The transaction detail is\s+(.+?)\s+Available Balance\b/i);

  if (!debitMatch || !detailMatch) {
    return { status: "needs_review", source: "NIMB", reason: "Required NIMB debit fields could not be parsed" };
  }

  const amount = ParseNprAmount(debitMatch[1]);
  const occurredAt = ParseNimbDate(debitMatch[2]);
  const description = BoundText(detailMatch[1], 500);
  const merchant = BoundText(description.split(",")[0].replace(/[.\s]+$/g, ""), 120);

  if (amount === null || !occurredAt || !merchant) {
    return { status: "needs_review", source: "NIMB", reason: "NIMB values are invalid" };
  }

  return {
    status: "processed",
    transaction: {
      source: "NIMB",
      amount,
      currency: "NPR",
      occurredAt,
      merchant,
      description,
      externalTransactionId: null,
      channel: InferNimbChannel(merchant, description),
    },
  };
}

function ParseEsewaEmail(bodyText: string): KharchaEmailParseResult {
  const normalized = NormalizeEmailText(bodyText);

  if (/\b(?:failed|unsuccessful|cancelled|canceled)\b/i.test(normalized)) {
    return { status: "unsupported", reason: "Unsuccessful eSewa payments are not expenses" };
  }

  if (!/Thank you for the payment/i.test(normalized)) {
    return { status: "needs_review", source: "ESEWA", reason: "eSewa success marker is missing" };
  }

  const fields = ParseEsewaFields(normalized);
  if (!fields) {
    return { status: "needs_review", source: "ESEWA", reason: "Required eSewa payment fields could not be parsed" };
  }

  const amount = ParseNprAmount(fields.amount);
  const occurredAt = ParseEsewaDate(fields.transactionDate);
  const merchant = BoundText(fields.merchant, 120);
  const externalTransactionId = BoundText(fields.transactionCode, 120);

  if (amount === null || !occurredAt || !merchant || !externalTransactionId) {
    return { status: "needs_review", source: "ESEWA", reason: "eSewa values are invalid" };
  }

  return {
    status: "processed",
    transaction: {
      source: "ESEWA",
      amount,
      currency: "NPR",
      occurredAt,
      merchant,
      description: merchant,
      externalTransactionId,
      channel: "merchant_payment",
    },
  };
}

function ParseEsewaFields(text: string) {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const labels = ["Merchant Name", "Transaction Date", "Transaction Code", "Transaction Amount (NPR)"];

  const tabularHeaderIndex = lines.findIndex((line) => labels.every((label) => line.toLowerCase().includes(label.toLowerCase())));
  if (tabularHeaderIndex >= 0 && lines[tabularHeaderIndex + 1]) {
    const headers = lines[tabularHeaderIndex].split(/\t+|\s{3,}/).map((item) => item.trim()).filter(Boolean);
    const values = lines[tabularHeaderIndex + 1].split(/\t+|\s{3,}/).map((item) => item.trim()).filter(Boolean);
    const fields = MapEsewaColumns(headers, values);
    if (fields) {
      return fields;
    }
  }

  const headerStart = lines.findIndex((line) => line.toLowerCase() === labels[0].toLowerCase());
  if (headerStart >= 0) {
    const headerLines = lines.slice(headerStart, headerStart + labels.length);
    const valueLines = lines.slice(headerStart + labels.length, headerStart + labels.length * 2);
    if (
      headerLines.every((line, index) => line.toLowerCase() === labels[index].toLowerCase()) &&
      valueLines.length === labels.length
    ) {
      return {
        merchant: valueLines[0],
        transactionDate: valueLines[1],
        transactionCode: valueLines[2],
        amount: valueLines[3],
      };
    }
  }

  const sequentialValues = labels.map((label) => {
    const index = lines.findIndex((line) => line.toLowerCase() === label.toLowerCase());
    return index >= 0 ? lines[index + 1] : undefined;
  });
  if (sequentialValues.every(Boolean)) {
    return {
      merchant: sequentialValues[0]!,
      transactionDate: sequentialValues[1]!,
      transactionCode: sequentialValues[2]!,
      amount: sequentialValues[3]!,
    };
  }

  return null;
}

function MapEsewaColumns(headers: string[], values: string[]) {
  if (headers.length !== values.length) {
    return null;
  }

  const entries = new Map(headers.map((header, index) => [header.toLowerCase(), values[index]]));
  const merchant = entries.get("merchant name");
  const transactionDate = entries.get("transaction date");
  const transactionCode = entries.get("transaction code");
  const amount = entries.get("transaction amount (npr)");

  if (!merchant || !transactionDate || !transactionCode || !amount) {
    return null;
  }

  return { merchant, transactionDate, transactionCode, amount };
}

function ParseNprAmount(value: string): number | null {
  const normalized = value.replace(/^NPR\s*/i, "").replace(/,/g, "").trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) {
    return null;
  }

  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 9999999999.99) {
    return null;
  }

  return amount;
}

function ParseNimbDate(value: string): string | null {
  const match = value.match(/^(\d{1,2})([A-Za-z]{3})(\d{2})\s+(\d{1,2}):(\d{2}):(\d{2})$/);
  if (!match) {
    return null;
  }

  const month = MONTHS[match[2].toLowerCase()];
  if (month === undefined) {
    return null;
  }

  return BuildKathmanduIso(
    2000 + Number(match[3]),
    month,
    Number(match[1]),
    Number(match[4]),
    Number(match[5]),
    Number(match[6])
  );
}

function ParseEsewaDate(value: string): string | null {
  const match = value.match(/^(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4}),?\s+(\d{1,2}):(\d{2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) {
    return null;
  }

  const month = MONTHS[match[2].slice(0, 3).toLowerCase()];
  const period = match[7].toUpperCase();
  let hour = Number(match[4]);

  if (month === undefined || hour < 1 || hour > 12) {
    return null;
  }

  if (period === "AM") {
    hour = hour === 12 ? 0 : hour;
  } else {
    hour = hour === 12 ? 12 : hour + 12;
  }

  return BuildKathmanduIso(
    Number(match[3]),
    month,
    Number(match[1]),
    hour,
    Number(match[5]),
    Number(match[6])
  );
}

function BuildKathmanduIso(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number
): string | null {
  const naiveTimestamp = Date.UTC(year, month, day, hour, minute, second);
  const naiveDate = new Date(naiveTimestamp);

  if (
    naiveDate.getUTCFullYear() !== year ||
    naiveDate.getUTCMonth() !== month ||
    naiveDate.getUTCDate() !== day ||
    naiveDate.getUTCHours() !== hour ||
    naiveDate.getUTCMinutes() !== minute ||
    naiveDate.getUTCSeconds() !== second
  ) {
    return null;
  }

  return new Date(naiveTimestamp - KATHMANDU_OFFSET_MINUTES * 60 * 1000).toISOString();
}

function NormalizeSender(from: string): string {
  const bracketMatch = from.match(/<([^>]+)>/);
  const emailMatch = (bracketMatch?.[1] || from).match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return emailMatch?.[0].toLowerCase() || "";
}

function NormalizeEmailText(text: string): string {
  const decoded = text
    .replace(/\r\n?/g, "\n")
    .replace(/&nbsp;|&#160;|\u00a0/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;|&apos;/gi, "'");

  return decoded
    .split("\n")
    .map((line) => line.replace(/[^\S\t]+/g, " ").trim())
    .join("\n")
    .trim();
}

function InferNimbChannel(merchant: string, description: string): KharchaChannel {
  const value = `${merchant} ${description}`.toLowerCase();
  if (value.includes("esewa") || value.includes("wallet") || value.includes("topup") || value.includes("top up")) {
    return "wallet_top_up";
  }
  if (value.includes("fonepay") || value.includes(" qr")) {
    return "qr_payment";
  }
  if (value.includes("atm")) {
    return "cash_withdrawal";
  }
  if (value.includes("card") || value.includes(" pos")) {
    return "card_payment";
  }
  if (value.includes("fee") || value.includes("charge")) {
    return "fee";
  }
  return "bank_transfer";
}

function BoundText(value: string, maximumLength: number): string {
  return value.replace(/\s+/g, " ").trim().slice(0, maximumLength);
}

function GetKathmanduParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kathmandu",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = new Map(parts.map((part) => [part.type, part.value]));

  return {
    year: Number(values.get("year")),
    month: Number(values.get("month")),
    day: Number(values.get("day")),
  };
}

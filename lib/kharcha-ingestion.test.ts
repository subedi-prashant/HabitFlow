import { describe, expect, it } from "vitest";
import {
  CreateKharchaSignature,
  GetDefaultKharchaCategory,
  KHARCHA_EMAIL_BATCH_SCHEMA,
  VerifyKharchaSignature,
} from "./kharcha-ingestion";

const secret = "synthetic_secret_that_is_long_enough_for_testing";
const timestamp = "1789725600000";

describe("Kharcha ingestion authentication", () => {
  it("accepts a valid HMAC inside the replay window", () => {
    const body = JSON.stringify({ emails: [], heartbeat: true });
    const signature = CreateKharchaSignature(body, timestamp, secret);

    expect(VerifyKharchaSignature(body, timestamp, signature, secret, Number(timestamp) + 1000)).toBe(true);
  });

  it("rejects changed bodies, signatures, and stale timestamps", () => {
    const body = JSON.stringify({ emails: [], heartbeat: true });
    const signature = CreateKharchaSignature(body, timestamp, secret);

    expect(VerifyKharchaSignature(`${body} `, timestamp, signature, secret, Number(timestamp) + 1000)).toBe(false);
    expect(VerifyKharchaSignature(body, timestamp, "invalid", secret, Number(timestamp) + 1000)).toBe(false);
    expect(VerifyKharchaSignature(body, timestamp, signature, secret, Number(timestamp) + 6 * 60 * 1000)).toBe(false);
  });
});

describe("KHARCHA_EMAIL_BATCH_SCHEMA", () => {
  it("accepts a bounded synthetic email batch", () => {
    const result = KHARCHA_EMAIL_BATCH_SCHEMA.safeParse({
      heartbeat: false,
      emails: [{
        gmailMessageId: "gmail_synthetic_001",
        from: "alerts@example.com",
        subject: "Synthetic alert",
        receivedAt: "2026-01-03T08:22:00.000Z",
        bodyText: "Synthetic body",
      }],
    });

    expect(result.success).toBe(true);
  });

  it("rejects oversized batches and bodies", () => {
    const email = {
      gmailMessageId: "gmail_synthetic_001",
      from: "alerts@example.com",
      subject: "Synthetic alert",
      receivedAt: "2026-01-03T08:22:00.000Z",
      bodyText: "Synthetic body",
    };

    expect(KHARCHA_EMAIL_BATCH_SCHEMA.safeParse({ emails: Array.from({ length: 26 }, () => email) }).success).toBe(false);
    expect(KHARCHA_EMAIL_BATCH_SCHEMA.safeParse({ emails: [{ ...email, bodyText: "x".repeat(50001) }] }).success).toBe(false);
  });
});

describe("GetDefaultKharchaCategory", () => {
  it("maps explicit transfer, cash, and fee channels without guessing merchant categories", () => {
    expect(GetDefaultKharchaCategory("wallet_top_up")).toBe("Transfers");
    expect(GetDefaultKharchaCategory("bank_transfer")).toBe("Transfers");
    expect(GetDefaultKharchaCategory("cash_withdrawal")).toBe("Cash Withdrawal");
    expect(GetDefaultKharchaCategory("fee")).toBe("Fees");
    expect(GetDefaultKharchaCategory("merchant_payment")).toBe("Other");
  });
});

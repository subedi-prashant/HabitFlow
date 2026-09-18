import { describe, expect, it } from "vitest";
import { ParseKharchaEmail } from "./kharcha";

const baseEmail = {
  gmailMessageId: "gmail_synthetic_001",
  subject: "Synthetic transaction alert",
  receivedAt: "2026-01-03T08:22:00.000Z",
};

describe("ParseKharchaEmail", () => {
  it("parses the observed NIMB debit format without mistaking the balance for the expense", () => {
    const result = ParseKharchaEmail({
      ...baseEmail,
      from: "Nepal Investment Mega Bank Ltd - Alert System <donot_reply@nimb.com.np>",
      bodyText: `Dear Customer,

Your a/c 123XX4567 has been Debited by NPR 1,234.50 on 03Jan26 14:05:06.
The transaction detail is
ESEWA,REF_SYNTHETIC,CONTACT_SYNTHETIC,NOTE.
Available Balance on 03Jan26 14:06:00 is NPR 98,765.43

This is a system generated email.`,
    });

    expect(result).toEqual({
      status: "processed",
      transaction: {
        source: "NIMB",
        amount: 1234.5,
        currency: "NPR",
        occurredAt: "2026-01-03T08:20:06.000Z",
        merchant: "ESEWA",
        description: "ESEWA,REF_SYNTHETIC,CONTACT_SYNTHETIC,NOTE.",
        externalTransactionId: null,
        channel: "wallet_top_up",
      },
    });
  });

  it("parses a flattened eSewa payment table", () => {
    const result = ParseKharchaEmail({
      ...baseEmail,
      gmailMessageId: "gmail_synthetic_002",
      from: "eSewa <donotreply@esewa.com.np>",
      bodyText: `Dear Customer,

Thank you for the payment. The details are as follows:

Merchant Name\tTransaction Date\tTransaction Code\tTransaction Amount (NPR)
Sample Merchant\t03 Jan 2026, 02:05:06 PM\tTXN_SYNTHETIC_001\t250.75

To view more details, please login to eSewa app.`,
    });

    expect(result).toEqual({
      status: "processed",
      transaction: {
        source: "ESEWA",
        amount: 250.75,
        currency: "NPR",
        occurredAt: "2026-01-03T08:20:06.000Z",
        merchant: "Sample Merchant",
        description: "Sample Merchant",
        externalTransactionId: "TXN_SYNTHETIC_001",
        channel: "merchant_payment",
      },
    });
  });

  it("parses an eSewa table converted to separate header and value lines", () => {
    const result = ParseKharchaEmail({
      ...baseEmail,
      gmailMessageId: "gmail_synthetic_003",
      from: "donotreply@esewa.com.np",
      bodyText: `Thank you for the payment.
Merchant Name
Transaction Date
Transaction Code
Transaction Amount (NPR)
Sample Grocer
03 Jan 2026, 02:05:06 PM
TXN_SYNTHETIC_002
75.25`,
    });

    expect(result.status).toBe("processed");
    if (result.status === "processed") {
      expect(result.transaction).toMatchObject({
        amount: 75.25,
        merchant: "Sample Grocer",
        externalTransactionId: "TXN_SYNTHETIC_002",
      });
    }
  });

  it("parses an eSewa table converted to label and value lines", () => {
    const result = ParseKharchaEmail({
      ...baseEmail,
      gmailMessageId: "gmail_synthetic_003",
      from: "donotreply@esewa.com.np",
      bodyText: `Thank you for the payment.
Merchant Name
Sample Utility
Transaction Date
03 Jan 2026, 02:05:06 PM
Transaction Code
TXN_SYNTHETIC_002
Transaction Amount (NPR)
1,050.00`,
    });

    expect(result.status).toBe("processed");
    if (result.status === "processed") {
      expect(result.transaction).toMatchObject({
        amount: 1050,
        merchant: "Sample Utility",
        externalTransactionId: "TXN_SYNTHETIC_002",
      });
    }
  });

  it("rejects incoming NIMB credits", () => {
    const result = ParseKharchaEmail({
      ...baseEmail,
      from: "donot_reply@nimb.com.np",
      bodyText: "Your a/c 123XX4567 has been Credited by NPR 500.00 on 03Jan26 14:05:06.",
    });

    expect(result.status).toBe("unsupported");
  });

  it("routes a malformed message from a supported sender to review", () => {
    const result = ParseKharchaEmail({
      ...baseEmail,
      from: "donot_reply@nimb.com.np",
      bodyText: "Your account has been Debited, but this template no longer contains labeled fields.",
    });

    expect(result).toMatchObject({
      status: "needs_review",
      source: "NIMB",
    });
  });

  it("rejects mail from an unsupported sender", () => {
    const result = ParseKharchaEmail({
      ...baseEmail,
      from: "alerts@example.com",
      bodyText: "Your account has been Debited by NPR 100.00.",
    });

    expect(result.status).toBe("unsupported");
  });
});

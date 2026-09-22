import { readFileSync } from "node:fs";
import vm from "node:vm";
import { describe, expect, it, vi } from "vitest";

const collectorSource = readFileSync(
  new URL("../integrations/kharcha-gmail/Code.gs", import.meta.url),
  "utf8"
);

function CreateNimbMessage(
  id: string,
  threadId: string,
  receivedAt: number,
  amount: number,
  labelIds: string[] = [],
  returnDecodedBytes = false
) {
  const bodyText = `Dear Customer,
Your a/c 123XX4567 has been Debited by NPR ${amount}.00 on 22Sep26 19:31:17.
The transaction detail is SAMPLE,REFERENCE,MERCHANT.
Available Balance on 22Sep26 19:35:04 is NPR 1,000.00`;
  const bodyBytes = Buffer.from(bodyText, "utf8");
  const headers = [
    { name: "From", value: "Nepal Investment Mega Bank Ltd <donot_reply@nimb.com.np>" },
    { name: "Subject", value: "NIMB Alert: Transaction in your a/c" },
  ];

  return {
    id,
    threadId,
    internalDate: String(receivedAt),
    labelIds,
    payload: {
      headers,
      mimeType: "text/plain",
      body: { data: returnDecodedBytes ? Array.from(bodyBytes) : bodyBytes.toString("base64url") },
    },
  };
}

describe("Kharcha Gmail collector", () => {
  it("collects every recent supported message when only one message in the Gmail thread has the approved label", () => {
    const labelId = "Label_KharchaBank";
    const threadId = "thread_nimb_alerts";
    const firstReceivedAt = Date.parse("2026-09-22T07:38:02.000Z");
    const messages = [
      CreateNimbMessage("message_300", threadId, firstReceivedAt, 300, [labelId]),
      CreateNimbMessage("message_479", threadId, firstReceivedAt + 5 * 60 * 60 * 1000, 479, [], true),
      CreateNimbMessage("message_339", threadId, firstReceivedAt + 6 * 60 * 60 * 1000, 339),
    ];
    const messageById = new Map(messages.map((message) => [message.id, message]));
    const getMessage = vi.fn((_userId: string, messageId: string, options: { format: string }) => {
      const message = messageById.get(messageId);
      if (!message) {
        throw new Error(`Unknown message ${messageId}`);
      }
      if (options.format === "metadata") {
        return {
          id: message.id,
          threadId: message.threadId,
          internalDate: message.internalDate,
          labelIds: message.labelIds,
          payload: { headers: message.payload.headers },
        };
      }
      return message;
    });
    const context = vm.createContext({
      Gmail: {
        Users: {
          Messages: { get: getMessage },
          Threads: {
            get: vi.fn(() => ({
              messages: messages.map(({ id, threadId: currentThreadId, labelIds }) => ({
                id,
                threadId: currentThreadId,
                labelIds,
              })),
            })),
          },
        },
      },
      Utilities: {
        base64DecodeWebSafe: (value: string) => {
          if (value.length % 4 !== 0) {
            throw new Error("Could not decode string");
          }
          return Buffer.from(value, "base64url");
        },
        newBlob: (value: Buffer | number[]) => ({
          getDataAsString: () => Buffer.from(value).toString("utf8"),
        }),
      },
    });
    vm.runInContext(collectorSource, context);
    context.messageReferences = messages.map(({ id }) => ({ id }));
    context.lowerBound = firstReceivedAt - 1000;
    context.upperBound = firstReceivedAt + 7 * 60 * 60 * 1000;
    context.gmailLabelId = labelId;

    const collected = vm.runInContext(
      "CollectMessages(messageReferences, lowerBound, upperBound, gmailLabelId)",
      context
    ) as Array<{ gmailMessageId: string }>;

    expect(collected.map((email) => email.gmailMessageId)).toEqual([
      "message_300",
      "message_479",
      "message_339",
    ]);
    expect(getMessage).toHaveBeenCalledTimes(6);
  });
});

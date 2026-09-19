const PROPERTY_KEYS = {
  API_URL: "KHARCHA_API_URL",
  INGEST_SECRET: "KHARCHA_INGEST_SECRET",
  GMAIL_LABEL: "KHARCHA_GMAIL_LABEL",
  STARTED_AT_MS: "KHARCHA_STARTED_AT_MS",
  LAST_SYNC_MS: "KHARCHA_LAST_SYNC_MS",
  LAST_HEARTBEAT_MS: "KHARCHA_LAST_HEARTBEAT_MS",
};
const DEFAULT_GMAIL_LABEL = "KharchaBank";
const SUPPORTED_SENDERS_QUERY = "{from:donot_reply@nimb.com.np from:donotreply@esewa.com.np}";
const COLLECTOR_HANDLER = "CollectKharchaEmails";
const MAX_MESSAGES_PER_RUN = 100;
const MAX_BATCH_SIZE = 25;
const MAX_BODY_LENGTH = 50000;
const OVERLAP_MS = 5 * 60 * 1000;
const HEARTBEAT_INTERVAL_MS = 15 * 60 * 1000;

function Setup() {
  const configuration = GetConfiguration();
  ValidateGmailLabel(configuration.gmailLabel);
  const properties = PropertiesService.getScriptProperties();
  const now = Date.now();

  RemoveCollectorTriggers();
  ScriptApp.newTrigger(COLLECTOR_HANDLER).timeBased().everyMinutes(1).create();
  properties.setProperties({
    [PROPERTY_KEYS.STARTED_AT_MS]: String(now),
    [PROPERTY_KEYS.LAST_SYNC_MS]: String(now),
    [PROPERTY_KEYS.LAST_HEARTBEAT_MS]: "0",
  });

  SendPayload(configuration, { heartbeat: true, emails: [] });
  properties.setProperty(PROPERTY_KEYS.LAST_HEARTBEAT_MS, String(Date.now()));
}

function Disable() {
  RemoveCollectorTriggers();
}

function TestConnection() {
  const configuration = GetConfiguration();
  ValidateGmailLabel(configuration.gmailLabel);
  SendPayload(configuration, { heartbeat: true, emails: [] });
  PropertiesService.getScriptProperties().setProperty(PROPERTY_KEYS.LAST_HEARTBEAT_MS, String(Date.now()));
}

function CollectKharchaEmails() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) {
    return;
  }

  try {
    const configuration = GetConfiguration();
    const properties = PropertiesService.getScriptProperties();
    const now = Date.now();
    const startedAt = Number(properties.getProperty(PROPERTY_KEYS.STARTED_AT_MS) || now);
    const lastSync = Number(properties.getProperty(PROPERTY_KEYS.LAST_SYNC_MS) || startedAt);
    const lowerBound = Math.max(startedAt, lastSync - OVERLAP_MS);
    const query = `label:${configuration.gmailLabel} ${SUPPORTED_SENDERS_QUERY} after:${Math.floor((lowerBound - 1000) / 1000)}`;
    const messageReferences = ListMessageReferences(query);
    const messages = CollectMessages(messageReferences, lowerBound, now);

    for (let index = 0; index < messages.length; index += MAX_BATCH_SIZE) {
      SendPayload(configuration, {
        heartbeat: false,
        emails: messages.slice(index, index + MAX_BATCH_SIZE),
      });
    }

    if (messages.length === 0) {
      const lastHeartbeat = Number(properties.getProperty(PROPERTY_KEYS.LAST_HEARTBEAT_MS) || 0);
      if (now - lastHeartbeat >= HEARTBEAT_INTERVAL_MS) {
        SendPayload(configuration, { heartbeat: true, emails: [] });
        properties.setProperty(PROPERTY_KEYS.LAST_HEARTBEAT_MS, String(now));
      }
    }

    properties.setProperty(PROPERTY_KEYS.LAST_SYNC_MS, String(now));
  } finally {
    lock.releaseLock();
  }
}

function ListMessageReferences(query) {
  const response = Gmail.Users.Messages.list("me", {
    q: query,
    maxResults: MAX_MESSAGES_PER_RUN,
    includeSpamTrash: false,
  });
  return response.messages || [];
}

function CollectMessages(messageReferences, lowerBound, upperBound) {
  const seen = {};
  const emails = [];

  messageReferences.forEach(function (messageReference) {
    const message = Gmail.Users.Messages.get("me", messageReference.id, { format: "full" });
    const receivedAt = Number(message.internalDate);
    const gmailMessageId = message.id;
    if (!Number.isFinite(receivedAt) || receivedAt < lowerBound || receivedAt > upperBound || seen[gmailMessageId]) {
      return;
    }

    seen[gmailMessageId] = true;
    const headers = message.payload && message.payload.headers ? message.payload.headers : [];
    const from = GetMessageHeader(headers, "From");
    const subject = GetMessageHeader(headers, "Subject");
    let bodyText = NormalizeBodyText(GetMessageBody(message.payload, "text/plain", gmailMessageId));
    if (!HasExpectedFields(from, bodyText)) {
      bodyText = NormalizeBodyText(ConvertHtmlToText(GetMessageBody(message.payload, "text/html", gmailMessageId)));
    }

    if (!bodyText) {
      bodyText = "Email body could not be converted to text";
    }

    emails.push({
      gmailMessageId: gmailMessageId,
      from: from,
      subject: subject.slice(0, 500),
      receivedAt: new Date(receivedAt).toISOString(),
      bodyText: bodyText.slice(0, MAX_BODY_LENGTH),
    });
  });

  return emails.sort(function (first, second) {
    return first.receivedAt.localeCompare(second.receivedAt);
  });
}

function GetMessageHeader(headers, name) {
  const header = headers.find(function (item) {
    return item.name && item.name.toLowerCase() === name.toLowerCase();
  });
  return header && header.value ? header.value : "";
}

function GetMessageBody(payload, mimeType, gmailMessageId) {
  if (!payload) {
    return "";
  }

  const parts = [payload];
  while (parts.length > 0) {
    const part = parts.shift();
    if (part.mimeType && part.mimeType.toLowerCase() === mimeType) {
      return DecodeMessagePart(part, gmailMessageId);
    }
    if (part.parts && part.parts.length > 0) {
      parts.push.apply(parts, part.parts);
    }
  }

  return "";
}

function DecodeMessagePart(part, gmailMessageId) {
  let encodedBody = part.body && part.body.data ? part.body.data : "";
  if (!encodedBody && part.body && part.body.attachmentId) {
    const attachment = Gmail.Users.Messages.Attachments.get("me", gmailMessageId, part.body.attachmentId);
    encodedBody = attachment.data || "";
  }
  if (!encodedBody) {
    return "";
  }

  const bytes = Utilities.base64DecodeWebSafe(encodedBody);
  return Utilities.newBlob(bytes).getDataAsString("UTF-8");
}

function SendPayload(configuration, payload) {
  const body = JSON.stringify(payload);
  const timestamp = String(Date.now());
  const signatureBytes = Utilities.computeHmacSha256Signature(
    `${timestamp}.${body}`,
    configuration.ingestSecret,
    Utilities.Charset.UTF_8
  );
  const signature = Utilities.base64EncodeWebSafe(signatureBytes).replace(/=+$/g, "");
  const response = UrlFetchApp.fetch(configuration.apiUrl, {
    method: "post",
    contentType: "application/json",
    payload: body,
    headers: {
      "X-Kharcha-Timestamp": timestamp,
      "X-Kharcha-Signature": signature,
    },
    muteHttpExceptions: true,
  });
  const statusCode = response.getResponseCode();

  if (statusCode < 200 || statusCode >= 300) {
    throw new Error(`Kharcha API returned HTTP ${statusCode}`);
  }
}

function GetConfiguration() {
  const properties = PropertiesService.getScriptProperties();
  const apiUrl = properties.getProperty(PROPERTY_KEYS.API_URL);
  const ingestSecret = properties.getProperty(PROPERTY_KEYS.INGEST_SECRET);
  const gmailLabel = properties.getProperty(PROPERTY_KEYS.GMAIL_LABEL) || DEFAULT_GMAIL_LABEL;

  if (!apiUrl || !/^https:\/\//i.test(apiUrl)) {
    throw new Error(`${PROPERTY_KEYS.API_URL} must be an HTTPS endpoint`);
  }
  if (!ingestSecret || ingestSecret.length < 32) {
    throw new Error(`${PROPERTY_KEYS.INGEST_SECRET} must contain at least 32 characters`);
  }
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(gmailLabel)) {
    throw new Error(`${PROPERTY_KEYS.GMAIL_LABEL} must use only letters, numbers, hyphens, or underscores`);
  }

  return { apiUrl: apiUrl, ingestSecret: ingestSecret, gmailLabel: gmailLabel };
}

function ValidateGmailLabel(gmailLabel) {
  const response = Gmail.Users.Labels.list("me");
  const labels = response.labels || [];
  const exists = labels.some(function (label) {
    return label.name === gmailLabel;
  });

  if (!exists) {
    throw new Error(`Gmail label ${gmailLabel} does not exist`);
  }
}

function RemoveCollectorTriggers() {
  ScriptApp.getProjectTriggers().forEach(function (trigger) {
    if (trigger.getHandlerFunction() === COLLECTOR_HANDLER) {
      ScriptApp.deleteTrigger(trigger);
    }
  });
}

function HasExpectedFields(from, bodyText) {
  const sender = ExtractSender(from);
  if (sender === "donot_reply@nimb.com.np") {
    return /has been Debited by NPR/i.test(bodyText) && /Available Balance/i.test(bodyText);
  }
  if (sender === "donotreply@esewa.com.np") {
    return /Merchant Name/i.test(bodyText) && /Transaction Amount \(NPR\)/i.test(bodyText);
  }
  return false;
}

function ExtractSender(from) {
  const bracketMatch = from.match(/<([^>]+)>/);
  const emailMatch = (bracketMatch ? bracketMatch[1] : from).match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return emailMatch ? emailMatch[0].toLowerCase() : "";
}

function ConvertHtmlToText(html) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<img\b[^>]*>/gi, " ")
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<\/t[dh]>/gi, "\t")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<\/p>|<\/div>|<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, " ");
}

function NormalizeBodyText(text) {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/&nbsp;|&#160;|\u00a0/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;|&apos;/gi, "'")
    .split("\n")
    .map(function (line) {
      return line.replace(/[^\S\t]+/g, " ").trim();
    })
    .filter(function (line, index, lines) {
      return line || (index > 0 && lines[index - 1]);
    })
    .join("\n")
    .trim();
}

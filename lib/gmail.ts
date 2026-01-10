import { google } from "googleapis";

export interface GmailMessage {
  id: string;
  threadId: string;
  from: string;
  subject: string;
  body: string;
  date: string;
  snippet: string;
}

/**
 * Create Gmail API client with access token
 */
export function createGmailClient(accessToken: string) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });

  return google.gmail({ version: "v1", auth });
}

/**
 * List emails from bank senders with pagination support
 */
export async function listBankEmails(
  accessToken: string,
  options: {
    maxResults?: number;
    bankEmails?: string[];
    afterDate?: Date;
    beforeDate?: Date;
  } = {}
): Promise<GmailMessage[]> {
  const gmail = createGmailClient(accessToken);

  const {
    maxResults = 500,
    bankEmails = ["Alertas@davibank.cr", "AlertasScotiabank@scotiabank.com"],
    afterDate,
    beforeDate,
  } = options;

  // Build query - wrap in parentheses for proper OR logic
  let query = `(${bankEmails.map((email) => `from:${email}`).join(" OR ")})`;
  
  if (afterDate) {
    const dateStr = afterDate.toISOString().split("T")[0].replace(/-/g, "/");
    query += ` after:${dateStr}`;
  }
  
  if (beforeDate) {
    const dateStr = beforeDate.toISOString().split("T")[0].replace(/-/g, "/");
    query += ` before:${dateStr}`;
  }

  console.log("Gmail query:", query);

  try {
    const allMessages: { id: string }[] = [];
    let pageToken: string | undefined;

    // Paginate through all results
    do {
      const listResponse = await gmail.users.messages.list({
        userId: "me",
        q: query,
        maxResults: Math.min(100, maxResults - allMessages.length), // Gmail max per page is 100
        pageToken,
      });

      const messages = listResponse.data.messages || [];
      allMessages.push(...messages.map(m => ({ id: m.id! })));
      
      pageToken = listResponse.data.nextPageToken || undefined;
      
      console.log(`Fetched ${messages.length} messages, total: ${allMessages.length}, hasMore: ${!!pageToken}`);
      
    } while (pageToken && allMessages.length < maxResults);

    console.log(`Total emails found: ${allMessages.length}`);

    // Fetch full message details in batches to avoid rate limits
    const batchSize = 10;
    const fullMessages: GmailMessage[] = [];

    for (let i = 0; i < allMessages.length; i += batchSize) {
      const batch = allMessages.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(async (msg) => {
          try {
            const fullMsg = await gmail.users.messages.get({
              userId: "me",
              id: msg.id,
              format: "full",
            });
            return parseGmailMessage(fullMsg.data);
          } catch (error) {
            console.error(`Error fetching message ${msg.id}:`, error);
            return null;
          }
        })
      );
      fullMessages.push(...batchResults.filter((m): m is GmailMessage => m !== null));
    }

    return fullMessages;
  } catch (error) {
    console.error("Gmail API error:", error);
    throw error;
  }
}

/**
 * Get a single email by ID
 */
export async function getEmail(
  accessToken: string,
  emailId: string
): Promise<GmailMessage | null> {
  const gmail = createGmailClient(accessToken);

  try {
    const response = await gmail.users.messages.get({
      userId: "me",
      id: emailId,
      format: "full",
    });

    return parseGmailMessage(response.data);
  } catch (error) {
    console.error("Error fetching email:", error);
    return null;
  }
}

/**
 * Parse Gmail API message to our format
 */
function parseGmailMessage(message: any): GmailMessage {
  const headers = message.payload?.headers || [];

  const getHeader = (name: string): string => {
    const header = headers.find(
      (h: any) => h.name.toLowerCase() === name.toLowerCase()
    );
    return header?.value || "";
  };

  // Extract body
  let body = "";
  
  if (message.payload?.body?.data) {
    body = decodeBase64(message.payload.body.data);
  } else if (message.payload?.parts) {
    // Multipart message
    const textPart = message.payload.parts.find(
      (part: any) => part.mimeType === "text/plain"
    );
    const htmlPart = message.payload.parts.find(
      (part: any) => part.mimeType === "text/html"
    );

    if (textPart?.body?.data) {
      body = decodeBase64(textPart.body.data);
    } else if (htmlPart?.body?.data) {
      body = stripHtml(decodeBase64(htmlPart.body.data));
    }
  }

  return {
    id: message.id,
    threadId: message.threadId,
    from: getHeader("From"),
    subject: getHeader("Subject"),
    body,
    date: getHeader("Date"),
    snippet: message.snippet || "",
  };
}

/**
 * Decode base64 URL-safe encoded string
 */
function decodeBase64(encoded: string): string {
  // Replace URL-safe characters
  const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
  
  try {
    return Buffer.from(base64, "base64").toString("utf-8");
  } catch {
    return "";
  }
}

/**
 * Strip HTML tags from string
 */
function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>.*?<\/style>/gi, "")
    .replace(/<script[^>]*>.*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}


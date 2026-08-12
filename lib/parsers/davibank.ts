import { EmailParseResult } from "../types";

/**
 * Parser for DAVIbank transaction emails
 * 
 * Example email format:
 * "DAVIbank le notifica que la transacción realizada en DLC* UBER EATS SAN JOSE Costa Rica, 
 * el día 09/01/2026 a las 08:21 PM con su tarjeta de crédito titular VISA terminada en 9936 
 * con número de autorización 478128 y referencia 601002090581 por CRC 8,851.00, fue aprobada."
 */

const DAVIBANK_PATTERNS = {
  // Matches: "realizada en MERCHANT_NAME,"
  merchant: /realizada en\s+(.+?),\s*el día/i,
  
  // Matches: "el día DD/MM/YYYY a las HH:MM AM/PM"
  dateTime: /el día\s+(\d{2}\/\d{2}\/\d{4})\s+a las\s+(\d{2}:\d{2}\s*(?:AM|PM)?)/i,
  
  // Matches: "terminada en XXXX"
  cardLastFour: /terminada en\s+(\d{4})/i,
  
  // Matches: "autorización XXXXXX"
  authorizationCode: /autorización\s+(\d+)/i,
  
  // Matches: "referencia XXXXXXXXXXXX"
  reference: /referencia\s+(\d+)/i,
  
  // Matches: "por CRC 1,234.56" or "por USD 1,234.56"
  amount: /por\s+(CRC|USD)\s+([\d,]+\.?\d*)/i,
  
  // Check if approved
  approved: /fue aprobada/i,
};

export function parseDavibankEmail(
  emailBody: string,
  emailId: string
): EmailParseResult {
  try {
    // Check if this is actually a DAVIbank/Scotiabank transaction email
    const lowerBody = emailBody.toLowerCase();
    if (!lowerBody.includes("davibank") && !lowerBody.includes("scotiabank")) {
      return { success: false, error: "Not a DAVIbank/Scotiabank email" };
    }

    // Check if transaction was approved
    if (!DAVIBANK_PATTERNS.approved.test(emailBody)) {
      return { success: false, error: "Transaction not approved" };
    }

    // Extract merchant
    const merchantMatch = emailBody.match(DAVIBANK_PATTERNS.merchant);
    if (!merchantMatch) {
      return { success: false, error: "Could not extract merchant" };
    }
    const merchant = merchantMatch[1].trim();

    // Extract date and time
    const dateTimeMatch = emailBody.match(DAVIBANK_PATTERNS.dateTime);
    if (!dateTimeMatch) {
      return { success: false, error: "Could not extract date/time" };
    }
    const [, dateStr, timeStr] = dateTimeMatch;
    
    // Parse date (DD/MM/YYYY to YYYY-MM-DD)
    const [day, month, year] = dateStr.split("/");
    const transactionDate = parseDateTime(year, month, day, timeStr);

    // Extract amount
    const amountMatch = emailBody.match(DAVIBANK_PATTERNS.amount);
    if (!amountMatch) {
      return { success: false, error: "Could not extract amount" };
    }
    const currency = amountMatch[1].toUpperCase();
    const amount = parseFloat(amountMatch[2].replace(/,/g, ""));

    // Extract optional fields
    const cardMatch = emailBody.match(DAVIBANK_PATTERNS.cardLastFour);
    const cardLastFour = cardMatch ? cardMatch[1] : undefined;

    const authMatch = emailBody.match(DAVIBANK_PATTERNS.authorizationCode);
    const authorizationCode = authMatch ? authMatch[1] : undefined;

    const refMatch = emailBody.match(DAVIBANK_PATTERNS.reference);
    const reference = refMatch ? refMatch[1] : undefined;

    return {
      success: true,
      transaction: {
        amount,
        currency,
        merchant,
        transactionDate,
        authorizationCode,
        reference,
        cardLastFour,
        bankSource: "davibank",
        emailId,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Parse error: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

function parseDateTime(
  year: string,
  month: string,
  day: string,
  timeStr: string
): string {
  // Clean time string
  let time = timeStr.trim().toUpperCase();
  let hours = 0;
  let minutes = 0;

  // Parse time (HH:MM AM/PM or HH:MM)
  const timeMatch = time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/);
  if (timeMatch) {
    hours = parseInt(timeMatch[1], 10);
    minutes = parseInt(timeMatch[2], 10);
    const period = timeMatch[3];

    if (period === "PM" && hours !== 12) {
      hours += 12;
    } else if (period === "AM" && hours === 12) {
      hours = 0;
    }
  }

  // The bank timestamps are in Costa Rica local time (UTC-6, no DST). Build the
  // instant with an explicit offset so it does NOT depend on the server's
  // timezone (Vercel runs in UTC, which would otherwise shift the time 6h).
  const pad = (n: number | string) => String(n).padStart(2, "0");
  const iso = `${year}-${pad(month)}-${pad(day)}T${pad(hours)}:${pad(
    minutes
  )}:00-06:00`;

  return new Date(iso).toISOString();
}

// Test if email is from DAVIbank or Scotiabank (same format)
export function isDavibankEmail(fromAddress: string): boolean {
  const lower = fromAddress.toLowerCase();
  return lower.includes("davibank") || lower.includes("scotiabank");
}


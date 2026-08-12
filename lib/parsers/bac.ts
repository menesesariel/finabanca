import { EmailParseResult } from "../types";

/**
 * Parser for BAC Credomatic (Costa Rica) transaction alert emails.
 *
 * Emails are a label/value table that, once HTML is stripped, reads roughly:
 *   "Hola NOMBRE A continuación le detallamos la transacción realizada:
 *    Comercio: MUSI CARTAGO  Ciudad y país: CARTAGO, Costa Rica
 *    Fecha: Ago 10, 2026 07:35  VISA: ************7979
 *    Autorización: 203441  Referencia: 622213179563
 *    Tipo de Transacción: COMPRA  Monto: CRC 1,950.01"
 */

const SPANISH_MONTHS: Record<string, number> = {
  ene: 0, feb: 1, mar: 2, abr: 3, may: 4, jun: 5,
  jul: 6, ago: 7, sep: 8, set: 8, oct: 9, nov: 10, dic: 11,
};

const CURRENCY_MAP: Record<string, string> = {
  CRC: "CRC", USD: "USD", "₡": "CRC", $: "USD",
};

const BAC_PATTERNS = {
  merchant:
    /Comercio:\s*(.+?)\s*(?:Ciudad|Fecha|VISA|MASTER|Tarjeta|Autorizaci|Monto)/i,
  dateTime:
    /Fecha:\s*([A-Za-zÁÉÍÓÚáéíóú]{3,})\s+(\d{1,2}),?\s+(\d{4})\s+(\d{1,2}):(\d{2})\s*(AM|PM)?/i,
  amount: /Monto:\s*(CRC|USD|₡|\$)\s*([\d.,]+)/i,
  card: /(?:VISA|MASTER(?:CARD)?|Tarjeta)[:\s]+\**\s*(\d{4})/i,
  authorizationCode: /Autorizaci[oó]n:\s*(\w+)/i,
  reference: /Referencia:\s*(\w+)/i,
  transactionType: /Tipo de Transacci[oó]n:\s*([A-Za-zÁÉÍÓÚÑ ]+?)\s*(?:Monto|VISA|$)/i,
};

// Transaction types that are NOT a spend (should be skipped, not imported).
const NON_PURCHASE = /revers|anula|devoluci|rechaz|declin/i;

export function parseBacEmail(
  emailBody: string,
  emailId: string
): EmailParseResult {
  try {
    // Skip reversals / refunds / declined transactions.
    const typeMatch = emailBody.match(BAC_PATTERNS.transactionType);
    if (typeMatch && NON_PURCHASE.test(typeMatch[1])) {
      return { success: false, error: "Transacción no es una compra" };
    }

    const merchantMatch = emailBody.match(BAC_PATTERNS.merchant);
    if (!merchantMatch) {
      return { success: false, error: "Could not extract merchant" };
    }
    const merchant = merchantMatch[1].trim();

    const amountMatch = emailBody.match(BAC_PATTERNS.amount);
    if (!amountMatch) {
      return { success: false, error: "Could not extract amount" };
    }
    const currency = CURRENCY_MAP[amountMatch[1].toUpperCase()] || "CRC";
    const amount = parseFloat(amountMatch[2].replace(/,/g, ""));

    const dateMatch = emailBody.match(BAC_PATTERNS.dateTime);
    if (!dateMatch) {
      return { success: false, error: "Could not extract date/time" };
    }
    const transactionDate = parseBacDate(dateMatch);

    const cardMatch = emailBody.match(BAC_PATTERNS.card);
    const authMatch = emailBody.match(BAC_PATTERNS.authorizationCode);
    const refMatch = emailBody.match(BAC_PATTERNS.reference);

    return {
      success: true,
      transaction: {
        amount,
        currency,
        merchant,
        transactionDate,
        authorizationCode: authMatch ? authMatch[1] : undefined,
        reference: refMatch ? refMatch[1] : undefined,
        cardLastFour: cardMatch ? cardMatch[1] : undefined,
        bankSource: "bac",
        emailId,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Parse error: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    };
  }
}

function parseBacDate(match: RegExpMatchArray): string {
  const [, monthStr, dayStr, yearStr, hourStr, minStr, period] = match;
  const month = SPANISH_MONTHS[monthStr.slice(0, 3).toLowerCase()] ?? 0;
  const day = parseInt(dayStr, 10);
  const year = parseInt(yearStr, 10);
  let hours = parseInt(hourStr, 10);
  const minutes = parseInt(minStr, 10);

  if (period) {
    const p = period.toUpperCase();
    if (p === "PM" && hours !== 12) hours += 12;
    else if (p === "AM" && hours === 12) hours = 0;
  }

  // Costa Rica local time (UTC-6, no DST); build with explicit offset so it
  // doesn't depend on the server timezone.
  const pad = (n: number) => String(n).padStart(2, "0");
  const iso = `${year}-${pad(month + 1)}-${pad(day)}T${pad(hours)}:${pad(
    minutes
  )}:00-06:00`;

  return new Date(iso).toISOString();
}

export function isBacEmail(fromAddress: string): boolean {
  return fromAddress.toLowerCase().includes("baccredomatic");
}

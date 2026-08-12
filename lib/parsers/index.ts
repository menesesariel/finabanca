import { EmailParseResult } from "../types";
import { parseDavibankEmail, isDavibankEmail } from "./davibank";
import { parseBacEmail, isBacEmail } from "./bac";

interface EmailData {
  id: string;
  from: string;
  subject: string;
  body: string;
  date: string;
}

/**
 * Bank email parsers registry
 * Add new bank parsers here as they are implemented
 */
const BANK_PARSERS: {
  check: (from: string) => boolean;
  parse: (body: string, emailId: string) => EmailParseResult;
  name: string;
}[] = [
  {
    name: "DAVIbank",
    check: isDavibankEmail,
    parse: parseDavibankEmail,
  },
  {
    name: "BAC Credomatic",
    check: isBacEmail,
    parse: parseBacEmail,
  },
];

/**
 * Parse an email using the appropriate bank parser
 */
export function parseTransactionEmail(email: EmailData): EmailParseResult {
  // Find matching parser
  const parser = BANK_PARSERS.find((p) => p.check(email.from));

  if (!parser) {
    return {
      success: false,
      error: `No parser available for: ${email.from}`,
    };
  }

  return parser.parse(email.body, email.id);
}

/**
 * Check if an email is from a supported bank
 */
export function isSupportedBankEmail(from: string): boolean {
  return BANK_PARSERS.some((p) => p.check(from));
}

/**
 * Get list of supported banks
 */
export function getSupportedBanks(): string[] {
  return BANK_PARSERS.map((p) => p.name);
}

export { parseDavibankEmail, isDavibankEmail };
export { parseBacEmail, isBacEmail };


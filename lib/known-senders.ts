export interface BankSender {
  id: string;
  bank: string;
  email: string;
  country: string;
  hasParser: boolean;
}

/**
 * Lista de remitentes conocidos de bancos en Costa Rica
 * hasParser indica si tenemos un parser específico para ese banco
 */
export const KNOWN_BANK_SENDERS: BankSender[] = [
  {
    id: "davibank",
    bank: "DAVIbank",
    email: "Alertas@davibank.cr",
    country: "CR",
    hasParser: true,
  },
  {
    id: "scotiabank-alertas",
    bank: "Scotiabank (Alertas)",
    email: "AlertasScotiabank@scotiabank.com",
    country: "CR",
    hasParser: true,
  },
  {
    id: "bac",
    bank: "BAC Credomatic",
    email: "notificacion@baccredomatic.cr",
    country: "CR",
    hasParser: true,
  },
  {
    id: "bn",
    bank: "Banco Nacional",
    email: "alertas@bncr.fi.cr",
    country: "CR",
    hasParser: false,
  },
  {
    id: "bcr",
    bank: "Banco de Costa Rica",
    email: "notificaciones@bancobcr.com",
    country: "CR",
    hasParser: false,
  },
  {
    id: "scotiabank",
    bank: "Scotiabank (otros)",
    email: "alertas.cr@scotiabank.com",
    country: "CR",
    hasParser: true,
  },
  {
    id: "promerica",
    bank: "Banco Promerica",
    email: "alertas@promerica.fi.cr",
    country: "CR",
    hasParser: false,
  },
  {
    id: "lafise",
    bank: "Banco Lafise",
    email: "notificaciones@lafise.com",
    country: "CR",
    hasParser: false,
  },
];

export function getBankByEmail(email: string): BankSender | undefined {
  const lowerEmail = email.toLowerCase();
  return KNOWN_BANK_SENDERS.find(
    (bank) => lowerEmail.includes(bank.email.toLowerCase())
  );
}

export function getBankById(id: string): BankSender | undefined {
  return KNOWN_BANK_SENDERS.find((bank) => bank.id === id);
}


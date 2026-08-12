"use client";

import { CategoryId, Transaction } from "./types";

export interface ParsedTransaction {
  merchant: string;
  amount: number;
  currency: string;
  transactionDate: string;
  authorizationCode?: string;
  reference?: string;
  cardLastFour?: string;
  bankSource: string;
  emailId: string;
}

/**
 * Categorize a parsed transaction with the LLM and build the full Transaction
 * object ready to store. Falls back to the "other" category if the LLM call
 * fails. Shared by the auto-sync loop and the manual import modal.
 */
export async function buildTransactionFromParsed(
  tx: ParsedTransaction
): Promise<Transaction> {
  let categoryId: CategoryId = "other";
  let confidence = 50;

  try {
    const response = await fetch("/api/categorize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        merchant: tx.merchant,
        amount: tx.amount,
        currency: tx.currency,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      categoryId = data.categoryId;
      confidence = data.confidence;
    }
  } catch {
    // Keep the default category if the LLM call fails.
  }

  return {
    id: crypto.randomUUID(),
    amount: tx.amount,
    currency: tx.currency,
    merchant: tx.merchant,
    categoryId,
    confidence,
    isManuallyClassified: false,
    transactionDate: tx.transactionDate,
    authorizationCode: tx.authorizationCode,
    reference: tx.reference,
    cardLastFour: tx.cardLastFour,
    bankSource: tx.bankSource,
    emailId: tx.emailId,
    createdAt: new Date().toISOString(),
  };
}

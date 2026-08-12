"use client";

import { CategoryId, Transaction } from "./types";
import { matchMerchantCategory } from "./merchant-rules";

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
 * Categorize a merchant: deterministic rules first (no LLM call for well-known
 * merchants), then fall back to the AI categorizer. Never throws — returns the
 * "other" category with a low confidence if everything fails. Shared by the
 * import flow and the "auto-classify pending" action.
 */
export async function categorizeMerchant(
  merchant: string,
  amount?: number,
  currency?: string
): Promise<{ categoryId: CategoryId; confidence: number }> {
  // 1) Deterministic rules first.
  const ruleMatch = matchMerchantCategory(merchant);
  if (ruleMatch) return ruleMatch;

  // 2) AI categorizer for anything unknown.
  try {
    const response = await fetch("/api/categorize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ merchant, amount, currency }),
    });

    if (response.ok) {
      const data = await response.json();
      return { categoryId: data.categoryId, confidence: data.confidence };
    }
  } catch {
    // Fall through to the default below.
  }

  return { categoryId: "other", confidence: 50 };
}

/**
 * Categorize a parsed transaction and build the full Transaction object ready
 * to store. Shared by the auto-sync loop and the manual import modal.
 */
export async function buildTransactionFromParsed(
  tx: ParsedTransaction
): Promise<Transaction> {
  const { categoryId, confidence } = await categorizeMerchant(
    tx.merchant,
    tx.amount,
    tx.currency
  );

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

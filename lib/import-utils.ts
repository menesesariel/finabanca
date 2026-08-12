"use client";

import { CategoryId, Transaction, UserRule } from "./types";
import { matchMerchantCategory, matchUserRules } from "./merchant-rules";
import { getUserRules } from "./db";

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

export interface CategorizationResult {
  categoryId: CategoryId;
  confidence: number;
  /** True when the LLM was actually called (used to throttle only real API hits). */
  usedLlm: boolean;
}

/**
 * Categorize a merchant, in priority order:
 *   1. the user's own rules (authoritative)
 *   2. the built-in deterministic rules (no LLM call)
 *   3. the AI categorizer
 * Never throws — returns "other" with low confidence if everything fails.
 *
 * Pass `userRules` to avoid re-reading them from IndexedDB on every call inside
 * a bulk loop; when omitted they are loaded once here.
 */
export async function categorizeMerchant(
  merchant: string,
  amount?: number,
  currency?: string,
  userRules?: UserRule[]
): Promise<CategorizationResult> {
  // 1) User rules win.
  const rules = userRules ?? (await getUserRules());
  const userMatch = matchUserRules(merchant, rules);
  if (userMatch) return { ...userMatch, usedLlm: false };

  // 2) Built-in deterministic rules.
  const ruleMatch = matchMerchantCategory(merchant);
  if (ruleMatch) return { ...ruleMatch, usedLlm: false };

  // 3) AI categorizer for anything unknown.
  try {
    const response = await fetch("/api/categorize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ merchant, amount, currency }),
    });

    if (response.ok) {
      const data = await response.json();
      return {
        categoryId: data.categoryId,
        confidence: data.confidence,
        usedLlm: true,
      };
    }
  } catch {
    // Fall through to the default below.
  }

  return { categoryId: "other", confidence: 50, usedLlm: true };
}

/**
 * Categorize a parsed transaction and build the full Transaction object ready
 * to store. Returns whether the LLM was used so callers can throttle only real
 * API hits. Shared by the auto-sync loop and the manual import modal.
 */
export async function buildTransactionFromParsed(
  tx: ParsedTransaction,
  userRules?: UserRule[]
): Promise<{ transaction: Transaction; usedLlm: boolean }> {
  const { categoryId, confidence, usedLlm } = await categorizeMerchant(
    tx.merchant,
    tx.amount,
    tx.currency,
    userRules
  );

  const transaction: Transaction = {
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

  return { transaction, usedLlm };
}

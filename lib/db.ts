"use client";

import { openDB, DBSchema, IDBPDatabase } from "idb";
import { Transaction, CategoryId, UserRule } from "./types";

interface ExpenseTrackerDB extends DBSchema {
  transactions: {
    key: string;
    value: Transaction;
    indexes: {
      "by-date": string;
      "by-category": CategoryId;
      "by-email": string;
    };
  };
  settings: {
    key: string;
    value: unknown;
  };
  processedEmails: {
    key: string;
    value: { emailId: string; processedAt: string };
  };
  userRules: {
    key: string;
    value: UserRule;
  };
}

const DB_VERSION = 2;

let dbPromise: Promise<IDBPDatabase<ExpenseTrackerDB>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<ExpenseTrackerDB>("expense-tracker", DB_VERSION, {
      upgrade(db, oldVersion) {
        // v1: initial stores
        if (oldVersion < 1) {
          const transactionStore = db.createObjectStore("transactions", {
            keyPath: "id",
          });
          transactionStore.createIndex("by-date", "transactionDate");
          transactionStore.createIndex("by-category", "categoryId");
          transactionStore.createIndex("by-email", "emailId");

          db.createObjectStore("settings", { keyPath: "key" });
          db.createObjectStore("processedEmails", { keyPath: "emailId" });
        }

        // v2: user-defined categorization rules
        if (oldVersion < 2) {
          db.createObjectStore("userRules", { keyPath: "pattern" });
        }
      },
    });
  }
  return dbPromise;
}

// Transaction operations
export async function addTransaction(transaction: Transaction): Promise<void> {
  const db = await getDB();
  await db.put("transactions", transaction);
}

export async function getTransaction(id: string): Promise<Transaction | undefined> {
  const db = await getDB();
  return db.get("transactions", id);
}

export async function getAllTransactions(): Promise<Transaction[]> {
  const db = await getDB();
  const transactions = await db.getAll("transactions");
  return transactions.sort(
    (a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime()
  );
}

export async function getTransactionsByDateRange(
  startDate: Date,
  endDate: Date
): Promise<Transaction[]> {
  const db = await getDB();
  const transactions = await db.getAll("transactions");
  return transactions
    .filter((t) => {
      const date = new Date(t.transactionDate);
      return date >= startDate && date <= endDate;
    })
    .sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime());
}

export async function getTransactionsByCategory(categoryId: CategoryId): Promise<Transaction[]> {
  const db = await getDB();
  return db.getAllFromIndex("transactions", "by-category", categoryId);
}

export async function updateTransactionCategory(
  id: string,
  categoryId: CategoryId
): Promise<void> {
  const db = await getDB();
  const transaction = await db.get("transactions", id);
  if (transaction) {
    transaction.categoryId = categoryId;
    transaction.isManuallyClassified = true;
    transaction.confidence = 100;
    await db.put("transactions", transaction);
  }
}

/**
 * Update a transaction's category from an automatic re-classification (rules or
 * LLM). Unlike updateTransactionCategory, this keeps isManuallyClassified false
 * so a low-confidence result can still land back in "pending".
 */
export async function setTransactionCategory(
  id: string,
  categoryId: CategoryId,
  confidence: number
): Promise<void> {
  const db = await getDB();
  const transaction = await db.get("transactions", id);
  if (transaction) {
    transaction.categoryId = categoryId;
    transaction.confidence = confidence;
    transaction.isManuallyClassified = false;
    await db.put("transactions", transaction);
  }
}

export async function deleteTransaction(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("transactions", id);
}

export async function getUncategorizedTransactions(): Promise<Transaction[]> {
  const db = await getDB();
  const transactions = await db.getAll("transactions");
  return transactions.filter((t) => t.categoryId === "other" && !t.isManuallyClassified);
}

export async function getPendingCategorization(): Promise<Transaction[]> {
  const db = await getDB();
  const transactions = await db.getAll("transactions");
  return transactions.filter((t) => t.confidence < 70 && !t.isManuallyClassified);
}

// Processed emails operations
export async function isEmailProcessed(emailId: string): Promise<boolean> {
  const db = await getDB();
  const result = await db.get("processedEmails", emailId);
  return !!result;
}

export async function markEmailProcessed(emailId: string): Promise<void> {
  const db = await getDB();
  await db.put("processedEmails", {
    emailId,
    processedAt: new Date().toISOString(),
  });
}

// Settings operations
export async function getSetting<T>(key: string): Promise<T | undefined> {
  const db = await getDB();
  const result = (await db.get("settings", key)) as
    | { key: string; value: T }
    | undefined;
  return result?.value;
}

export async function setSetting<T>(key: string, value: T): Promise<void> {
  const db = await getDB();
  await db.put("settings", { key, value } as unknown as { key: string });
}

// User-defined categorization rules
export async function getUserRules(): Promise<UserRule[]> {
  const db = await getDB();
  return db.getAll("userRules");
}

export async function addUserRule(
  pattern: string,
  categoryId: CategoryId
): Promise<void> {
  const clean = pattern.trim().toLowerCase();
  if (!clean) return;
  const db = await getDB();
  await db.put("userRules", {
    pattern: clean,
    categoryId,
    createdAt: new Date().toISOString(),
  });
}

export async function deleteUserRule(pattern: string): Promise<void> {
  const db = await getDB();
  await db.delete("userRules", pattern);
}

/**
 * NOTE: currency-aware aggregations (monthly totals, category totals, "this
 * month", etc.) live in `lib/stats.ts` and operate on the transaction list.
 * They intentionally never sum amounts across different currencies.
 */


"use client";

import { openDB, DBSchema, IDBPDatabase } from "idb";
import { Transaction, CategoryId } from "./types";

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
}

let dbPromise: Promise<IDBPDatabase<ExpenseTrackerDB>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<ExpenseTrackerDB>("expense-tracker", 1, {
      upgrade(db) {
        // Transactions store
        const transactionStore = db.createObjectStore("transactions", {
          keyPath: "id",
        });
        transactionStore.createIndex("by-date", "transactionDate");
        transactionStore.createIndex("by-category", "categoryId");
        transactionStore.createIndex("by-email", "emailId");

        // Settings store
        db.createObjectStore("settings", { keyPath: "key" });

        // Processed emails store (to avoid duplicates)
        db.createObjectStore("processedEmails", { keyPath: "emailId" });
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

/**
 * NOTE: currency-aware aggregations (monthly totals, category totals, "this
 * month", etc.) live in `lib/stats.ts` and operate on the transaction list.
 * They intentionally never sum amounts across different currencies.
 */


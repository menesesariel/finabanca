"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { addTransaction, isEmailProcessed, markEmailProcessed } from "@/lib/db";
import { Transaction, CategoryId } from "@/lib/types";

interface AutoSyncProps {
  intervalMinutes?: number;
  onNewTransactions?: (count: number) => void;
  enabled?: boolean;
}

export function AutoSync({ 
  intervalMinutes = 5, 
  onNewTransactions,
  enabled = true 
}: AutoSyncProps) {
  const { data: session } = useSession();
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [syncing, setSyncing] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const sync = useCallback(async () => {
    if (!session?.accessToken || syncing) return;

    setSyncing(true);

    try {
      // Fetch recent emails (last 24 hours)
      const response = await fetch("/api/gmail?maxResults=20");
      const data = await response.json();

      if (!response.ok) {
        console.error("Auto-sync error:", data.error);
        return;
      }

      let newCount = 0;

      for (const email of data.emails || []) {
        // Skip if already processed
        const alreadyProcessed = await isEmailProcessed(email.emailId);
        if (alreadyProcessed) continue;

        // Skip if parsing failed
        if (!email.parsed?.success || !email.parsed?.transaction) continue;

        const parsedTx = email.parsed.transaction;

        // Categorize with LLM
        let categoryId: CategoryId = "other";
        let confidence = 50;

        try {
          const catResponse = await fetch("/api/categorize", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              merchant: parsedTx.merchant,
              amount: parsedTx.amount,
              currency: parsedTx.currency,
            }),
          });

          if (catResponse.ok) {
            const catData = await catResponse.json();
            categoryId = catData.categoryId;
            confidence = catData.confidence;
          }
        } catch {
          // Use default category if LLM fails
        }

        // Create transaction
        const transaction: Transaction = {
          id: crypto.randomUUID(),
          amount: parsedTx.amount,
          currency: parsedTx.currency,
          merchant: parsedTx.merchant,
          categoryId,
          confidence,
          isManuallyClassified: false,
          transactionDate: parsedTx.transactionDate,
          authorizationCode: parsedTx.authorizationCode,
          reference: parsedTx.reference,
          cardLastFour: parsedTx.cardLastFour,
          bankSource: parsedTx.bankSource,
          emailId: parsedTx.emailId,
          createdAt: new Date().toISOString(),
        };

        await addTransaction(transaction);
        await markEmailProcessed(email.emailId);
        newCount++;
      }

      setLastSync(new Date());

      if (newCount > 0) {
        onNewTransactions?.(newCount);
        
        // Show browser notification if permitted
        if (Notification.permission === "granted") {
          new Notification("ExpenseAI", {
            body: `${newCount} nueva${newCount > 1 ? "s" : ""} transacción${newCount > 1 ? "es" : ""} importada${newCount > 1 ? "s" : ""}`,
            icon: "/icon.png",
          });
        }
      }
    } catch (error) {
      console.error("Auto-sync error:", error);
    } finally {
      setSyncing(false);
    }
  }, [session?.accessToken, syncing, onNewTransactions]);

  // Request notification permission
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission();
      }
    }
  }, []);

  // Setup interval
  useEffect(() => {
    if (!enabled || !session?.accessToken) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Initial sync after 30 seconds
    const initialTimeout = setTimeout(() => {
      sync();
    }, 30000);

    // Setup recurring interval
    intervalRef.current = setInterval(() => {
      sync();
    }, intervalMinutes * 60 * 1000);

    return () => {
      clearTimeout(initialTimeout);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, session?.accessToken, intervalMinutes, sync]);

  // This component doesn't render anything visible
  return null;
}


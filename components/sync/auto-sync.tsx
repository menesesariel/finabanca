"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { addTransaction, isEmailProcessed, markEmailProcessed } from "@/lib/db";
import { buildTransactionFromParsed } from "@/lib/import-utils";

interface AutoSyncProps {
  intervalMinutes?: number;
  onNewTransactions?: (count: number) => void;
  enabled?: boolean;
}

export function AutoSync({
  intervalMinutes = 5,
  onNewTransactions,
  enabled = true,
}: AutoSyncProps) {
  const { data: session } = useSession();
  const [, setLastSync] = useState<Date | null>(null);

  // Refs so the interval callback can be stable (no re-subscription loop):
  // - syncingRef guards against overlapping runs without being an effect dep.
  // - syncRef always points at the latest sync implementation.
  const syncingRef = useRef(false);
  const syncRef = useRef<() => Promise<void>>(async () => {});

  const sync = useCallback(async () => {
    if (!session?.accessToken || syncingRef.current) return;
    syncingRef.current = true;

    try {
      // Fetch recent emails
      const response = await fetch("/api/gmail?maxResults=20");
      const data = await response.json();

      if (!response.ok) {
        console.error("Auto-sync error:", data.error);
        return;
      }

      let newCount = 0;

      for (const email of data.emails || []) {
        // Skip if already processed
        if (await isEmailProcessed(email.emailId)) continue;

        // Skip if parsing failed
        if (!email.parsed?.success || !email.parsed?.transaction) continue;

        const transaction = await buildTransactionFromParsed(
          email.parsed.transaction
        );

        await addTransaction(transaction);
        await markEmailProcessed(email.emailId);
        newCount++;
      }

      setLastSync(new Date());

      if (newCount > 0) {
        onNewTransactions?.(newCount);

        // Show browser notification if permitted
        if (
          typeof Notification !== "undefined" &&
          Notification.permission === "granted"
        ) {
          new Notification("ExpenseAI", {
            body: `${newCount} nueva${newCount > 1 ? "s" : ""} transacción${
              newCount > 1 ? "es" : ""
            } importada${newCount > 1 ? "s" : ""}`,
          });
        }
      }
    } catch (error) {
      console.error("Auto-sync error:", error);
    } finally {
      syncingRef.current = false;
    }
  }, [session?.accessToken, onNewTransactions]);

  // Keep the ref pointing at the latest sync function.
  useEffect(() => {
    syncRef.current = sync;
  }, [sync]);

  // Request notification permission once.
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission();
      }
    }
  }, []);

  // Setup interval. Depends only on primitives, so it is NOT torn down and
  // rebuilt every time a sync runs (which was causing repeated fetches).
  useEffect(() => {
    if (!enabled || !session?.accessToken) return;

    const initialTimeout = setTimeout(() => {
      syncRef.current();
    }, 30_000);

    const interval = setInterval(() => {
      syncRef.current();
    }, intervalMinutes * 60 * 1000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [enabled, session?.accessToken, intervalMinutes]);

  // This component doesn't render anything visible
  return null;
}

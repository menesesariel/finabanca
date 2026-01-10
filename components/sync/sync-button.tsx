"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { RefreshCw, Check, AlertCircle, Mail } from "lucide-react";
import { addTransaction, isEmailProcessed, markEmailProcessed } from "@/lib/db";
import { Transaction, CategoryId } from "@/lib/types";
import { cn } from "@/lib/utils";

interface SyncButtonProps {
  onComplete?: (newCount: number) => void;
}

export function SyncButton({ onComplete }: SyncButtonProps) {
  const { data: session } = useSession();
  const [syncing, setSyncing] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSync = async () => {
    if (!session?.accessToken || syncing) return;

    setSyncing(true);
    setStatus("idle");
    setMessage("Buscando emails...");

    try {
      // Fetch emails from Gmail
      const response = await fetch("/api/gmail?maxResults=50");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error fetching emails");
      }

      setMessage(`Procesando ${data.count} emails...`);

      let newTransactions = 0;
      let skipped = 0;

      for (const email of data.emails) {
        // Skip if already processed
        const alreadyProcessed = await isEmailProcessed(email.emailId);
        if (alreadyProcessed) {
          skipped++;
          continue;
        }

        // Skip if parsing failed
        if (!email.parsed.success || !email.parsed.transaction) {
          continue;
        }

        const parsedTx = email.parsed.transaction;

        // Categorize with LLM
        setMessage(`Categorizando: ${parsedTx.merchant.slice(0, 30)}...`);
        
        const catResponse = await fetch("/api/categorize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            merchant: parsedTx.merchant,
            amount: parsedTx.amount,
            currency: parsedTx.currency,
          }),
        });

        let categoryId: CategoryId = "other";
        let confidence = 50;

        if (catResponse.ok) {
          const catData = await catResponse.json();
          categoryId = catData.categoryId;
          confidence = catData.confidence;
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
        newTransactions++;
      }

      setStatus("success");
      setMessage(
        newTransactions > 0
          ? `✓ ${newTransactions} nuevas transacciones`
          : skipped > 0
          ? "Ya sincronizado"
          : "No hay transacciones nuevas"
      );

      onComplete?.(newTransactions);
    } catch (error) {
      console.error("Sync error:", error);
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Error de sincronización");
    } finally {
      setSyncing(false);
      
      // Reset status after 3 seconds
      setTimeout(() => {
        setStatus("idle");
        setMessage("");
      }, 3000);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <Button
        onClick={handleSync}
        disabled={syncing || !session?.accessToken}
        variant={status === "success" ? "primary" : status === "error" ? "danger" : "secondary"}
        className={cn(
          "min-w-[160px]",
          syncing && "animate-pulse"
        )}
      >
        {syncing ? (
          <>
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            Sincronizando...
          </>
        ) : status === "success" ? (
          <>
            <Check className="w-4 h-4 mr-2" />
            Sincronizado
          </>
        ) : status === "error" ? (
          <>
            <AlertCircle className="w-4 h-4 mr-2" />
            Error
          </>
        ) : (
          <>
            <Mail className="w-4 h-4 mr-2" />
            Sincronizar Gmail
          </>
        )}
      </Button>
      
      {message && (
        <span className={cn(
          "text-sm",
          status === "success" && "text-primary-400",
          status === "error" && "text-red-400",
          status === "idle" && "text-dark-400"
        )}>
          {message}
        </span>
      )}
    </div>
  );
}


"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TransactionList } from "@/components/transactions/transaction-list";
import { getPendingCategorization, setTransactionCategory } from "@/lib/db";
import { categorizeMerchant } from "@/lib/import-utils";
import { Transaction } from "@/lib/types";
import { AlertCircle, CheckCircle2, Sparkles, Loader2 } from "lucide-react";

export default function PendingPage() {
  const { status } = useSession();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [reclassifying, setReclassifying] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const loadData = async () => {
    try {
      const pending = await getPendingCategorization();
      setTransactions(pending);
    } catch (error) {
      console.error("Error loading pending:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAutoClassify = async () => {
    if (reclassifying || transactions.length === 0) return;
    setReclassifying(true);
    setProgress({ current: 0, total: transactions.length });

    // Snapshot the current pending list so re-classification is deterministic.
    const pending = [...transactions];
    for (let i = 0; i < pending.length; i++) {
      const t = pending[i];
      setProgress({ current: i + 1, total: pending.length });
      try {
        const { categoryId, confidence } = await categorizeMerchant(
          t.merchant,
          t.amount,
          t.currency
        );
        await setTransactionCategory(t.id, categoryId, confidence);
      } catch (error) {
        console.error("Re-classify error:", t.merchant, error);
      }
    }

    await loadData();
    setReclassifying(false);
  };

  useEffect(() => {
    if (status === "authenticated") {
      loadData();
    }
  }, [status]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    redirect("/login");
  }

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="md:ml-64 p-4 md:p-8 pt-20 md:pt-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">
              Pendientes de categorizar
            </h1>
            <p className="text-dark-400 mt-1">
              Transacciones que la IA no pudo clasificar con confianza
            </p>
          </div>
          {transactions.length > 0 && (
            <Button onClick={handleAutoClassify} disabled={reclassifying}>
              {reclassifying ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Clasificando {progress.current}/{progress.total}
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Auto-clasificar
                </>
              )}
            </Button>
          )}
        </div>

        {/* Alert */}
        {transactions.length > 0 && (
          <div className="mb-6 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-yellow-400 font-medium">
                {transactions.length} transacción{transactions.length !== 1 ? "es" : ""} necesita{transactions.length !== 1 ? "n" : ""} tu atención
              </p>
              <p className="text-dark-400 text-sm mt-1">
                Haz clic en cada transacción para expandirla y asignar la categoría correcta.
              </p>
            </div>
          </div>
        )}

        {/* Transactions list */}
        <Card>
          <CardContent className="p-4">
            {loading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-20 animate-shimmer rounded-xl" />
                ))}
              </div>
            ) : transactions.length > 0 ? (
              <TransactionList
                transactions={transactions}
                onUpdate={loadData}
              />
            ) : (
              <div className="py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-green-400" />
                </div>
                <h3 className="text-lg font-medium text-white mb-2">
                  ¡Todo al día!
                </h3>
                <p className="text-dark-400">
                  No hay transacciones pendientes de categorizar.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}


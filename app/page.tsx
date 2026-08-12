"use client";

import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { CategoryChart } from "@/components/charts/category-chart";
import { MonthlyChart } from "@/components/charts/monthly-chart";
import { TransactionList } from "@/components/transactions/transaction-list";
import { SyncButton } from "@/components/sync/sync-button";
import { AutoSync } from "@/components/sync/auto-sync";
import { SyncStatus } from "@/components/sync/sync-status";
import { ImportModal } from "@/components/import/import-modal";
import { Button } from "@/components/ui/button";
import { CurrencyToggle } from "@/components/ui/currency-toggle";
import { getAllTransactions, getPendingCategorization } from "@/lib/db";
import {
  getCurrencies,
  getPrimaryCurrency,
  thisMonthTotal,
  monthlyTotals,
  categoryTotals,
} from "@/lib/stats";
import { Transaction } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  CreditCard,
  AlertCircle,
  ArrowRight,
  Calendar,
} from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [currency, setCurrency] = useState<string>("CRC");
  const [loading, setLoading] = useState(true);
  const [showImportModal, setShowImportModal] = useState(false);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);

  const loadData = async () => {
    try {
      const [txns, pending] = await Promise.all([
        getAllTransactions(),
        getPendingCategorization(),
      ]);
      setAllTransactions(txns);
      setPendingCount(pending.length);
      // Default the currency selector to whichever currency is most used.
      setCurrency((prev) =>
        getCurrencies(txns).includes(prev) ? prev : getPrimaryCurrency(txns)
      );
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated") {
      loadData();
    }
  }, [status]);

  const currencies = useMemo(
    () => getCurrencies(allTransactions),
    [allTransactions]
  );

  // All figures below are scoped to the selected currency (never mixed).
  const thisMonth = useMemo(
    () => thisMonthTotal(allTransactions, currency),
    [allTransactions, currency]
  );
  const monthly = useMemo(
    () => monthlyTotals(allTransactions, currency),
    [allTransactions, currency]
  );
  const catTotals = useMemo(
    () => categoryTotals(allTransactions, currency),
    [allTransactions, currency]
  );
  const recentTransactions = useMemo(
    () => allTransactions.slice(0, 5),
    [allTransactions]
  );

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

  // Last month comparison (same currency).
  const sortedMonths = Object.entries(monthly).sort((a, b) =>
    b[0].localeCompare(a[0])
  );
  const lastMonthTotal = sortedMonths[1]?.[1] || 0;
  const monthChange =
    lastMonthTotal > 0
      ? ((thisMonth - lastMonthTotal) / lastMonthTotal) * 100
      : 0;

  const dayOfMonth = new Date().getDate();
  const averageDaily = thisMonth / dayOfMonth;

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Auto-sync background process */}
      <AutoSync
        enabled={autoSyncEnabled}
        intervalMinutes={5}
        onNewTransactions={() => {
          loadData();
        }}
      />

      <main className="md:ml-64 p-4 md:p-8 pt-20 md:pt-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">
              Bienvenido, {session?.user?.name?.split(" ")[0]} 👋
            </h1>
            <div className="flex flex-wrap items-center gap-3 mt-1">
              <p className="text-dark-400">Aquí está el resumen de tus gastos</p>
              <SyncStatus
                enabled={autoSyncEnabled}
                onToggle={() => setAutoSyncEnabled(!autoSyncEnabled)}
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <CurrencyToggle
              currencies={currencies}
              value={currency}
              onChange={setCurrency}
            />
            <Button variant="secondary" onClick={() => setShowImportModal(true)}>
              <Calendar className="w-4 h-4 mr-2" />
              Importar Historial
            </Button>
            <SyncButton onComplete={() => loadData()} />
          </div>
        </div>

        {/* Import Modal */}
        <ImportModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          onComplete={() => {
            loadData();
            setShowImportModal(false);
          }}
        />

        {/* Stats cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="p-6 animate-slide-up" style={{ animationDelay: "0ms" }}>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-dark-400 text-sm">Este mes</p>
                <p className="text-2xl font-bold text-white mt-1 truncate">
                  {formatCurrency(thisMonth, currency)}
                </p>
              </div>
              <div
                className={`shrink-0 p-3 rounded-xl ${
                  monthChange >= 0 ? "bg-red-500/10" : "bg-green-500/10"
                }`}
              >
                {monthChange >= 0 ? (
                  <TrendingUp className="w-6 h-6 text-red-400" />
                ) : (
                  <TrendingDown className="w-6 h-6 text-green-400" />
                )}
              </div>
            </div>
            {lastMonthTotal > 0 && (
              <p
                className={`text-sm mt-2 ${
                  monthChange >= 0 ? "text-red-400" : "text-green-400"
                }`}
              >
                {monthChange >= 0 ? "+" : ""}
                {monthChange.toFixed(1)}% vs mes anterior
              </p>
            )}
          </Card>

          <Card className="p-6 animate-slide-up" style={{ animationDelay: "100ms" }}>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-dark-400 text-sm">Transacciones</p>
                <p className="text-2xl font-bold text-white mt-1 truncate">
                  {allTransactions.length}
                </p>
              </div>
              <div className="shrink-0 p-3 rounded-xl bg-blue-500/10">
                <CreditCard className="w-6 h-6 text-blue-400" />
              </div>
            </div>
            <p className="text-sm mt-2 text-dark-400">Total registradas</p>
          </Card>

          <Card className="p-6 animate-slide-up" style={{ animationDelay: "200ms" }}>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-dark-400 text-sm">Pendientes</p>
                <p className="text-2xl font-bold text-white mt-1 truncate">
                  {pendingCount}
                </p>
              </div>
              <div className="shrink-0 p-3 rounded-xl bg-yellow-500/10">
                <AlertCircle className="w-6 h-6 text-yellow-400" />
              </div>
            </div>
            {pendingCount > 0 && (
              <Link
                href="/pending"
                className="text-sm mt-2 text-yellow-400 hover:underline flex items-center gap-1"
              >
                Revisar ahora <ArrowRight className="w-3 h-3" />
              </Link>
            )}
          </Card>

          <Card className="p-6 animate-slide-up" style={{ animationDelay: "300ms" }}>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-dark-400 text-sm">Promedio diario</p>
                <p className="text-2xl font-bold text-white mt-1 truncate">
                  {formatCurrency(averageDaily, currency)}
                </p>
              </div>
              <div className="shrink-0 p-3 rounded-xl bg-purple-500/10">
                <TrendingUp className="w-6 h-6 text-purple-400" />
              </div>
            </div>
            <p className="text-sm mt-2 text-dark-400">
              Basado en {dayOfMonth} días
            </p>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card className="animate-slide-up" style={{ animationDelay: "400ms" }}>
            <CardHeader>
              <CardTitle>Gastos por Categoría</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-80 animate-shimmer rounded-lg" />
              ) : (
                <CategoryChart data={catTotals} currency={currency} />
              )}
            </CardContent>
          </Card>

          <Card className="animate-slide-up" style={{ animationDelay: "500ms" }}>
            <CardHeader>
              <CardTitle>Tendencia Mensual</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-64 animate-shimmer rounded-lg" />
              ) : (
                <MonthlyChart data={monthly} currency={currency} />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent transactions */}
        <Card className="animate-slide-up" style={{ animationDelay: "600ms" }}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Transacciones Recientes</CardTitle>
            <Link
              href="/transactions"
              className="text-sm text-primary-400 hover:underline flex items-center gap-1"
            >
              Ver todas <ArrowRight className="w-3 h-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-20 animate-shimmer rounded-xl" />
                ))}
              </div>
            ) : (
              <TransactionList transactions={recentTransactions} onUpdate={loadData} />
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

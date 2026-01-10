"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
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
import { 
  getAllTransactions, 
  getCategoryTotals, 
  getMonthlyTotals, 
  getThisMonthTotal,
  getPendingCategorization,
  getTransactionCount 
} from "@/lib/db";
import { Transaction, CategoryId } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { 
  TrendingUp, 
  TrendingDown, 
  CreditCard, 
  AlertCircle,
  ArrowRight,
  Calendar
} from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categoryTotals, setCategoryTotals] = useState<Record<CategoryId, number>>({} as Record<CategoryId, number>);
  const [monthlyTotals, setMonthlyTotals] = useState<Record<string, number>>({});
  const [thisMonthTotal, setThisMonthTotal] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [transactionCount, setTransactionCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showImportModal, setShowImportModal] = useState(false);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);

  const loadData = async () => {
    try {
      const [txns, cats, monthly, monthTotal, pending, count] = await Promise.all([
        getAllTransactions(),
        getCategoryTotals(),
        getMonthlyTotals(),
        getThisMonthTotal(),
        getPendingCategorization(),
        getTransactionCount(),
      ]);

      setTransactions(txns.slice(0, 5)); // Last 5
      setCategoryTotals(cats);
      setMonthlyTotals(monthly);
      setThisMonthTotal(monthTotal);
      setPendingCount(pending.length);
      setTransactionCount(count);
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

  // Calculate last month comparison
  const sortedMonths = Object.entries(monthlyTotals).sort((a, b) => b[0].localeCompare(a[0]));
  const lastMonthTotal = sortedMonths[1]?.[1] || 0;
  const monthChange = lastMonthTotal > 0 
    ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100 
    : 0;

  return (
    <div className="min-h-screen">
      <Navbar />
      
      {/* Auto-sync background process */}
      <AutoSync 
        enabled={autoSyncEnabled} 
        intervalMinutes={5}
        onNewTransactions={(count) => {
          loadData();
        }}
      />
      
      <main className="md:ml-64 p-4 md:p-8 pt-20 md:pt-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">
              Bienvenido, {session?.user?.name?.split(" ")[0]} 👋
            </h1>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-dark-400">
                Aquí está el resumen de tus gastos
              </p>
              <SyncStatus 
                enabled={autoSyncEnabled} 
                onToggle={() => setAutoSyncEnabled(!autoSyncEnabled)} 
              />
            </div>
          </div>
          <div className="flex gap-3">
            <Button 
              variant="secondary" 
              onClick={() => setShowImportModal(true)}
            >
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
          onComplete={(count) => {
            loadData();
            setShowImportModal(false);
          }}
        />

        {/* Stats cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="p-6 animate-slide-up" style={{ animationDelay: "0ms" }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-dark-400 text-sm">Este mes</p>
                <p className="text-2xl font-bold text-white mt-1">
                  {formatCurrency(thisMonthTotal)}
                </p>
              </div>
              <div className={`p-3 rounded-xl ${monthChange >= 0 ? "bg-red-500/10" : "bg-green-500/10"}`}>
                {monthChange >= 0 ? (
                  <TrendingUp className="w-6 h-6 text-red-400" />
                ) : (
                  <TrendingDown className="w-6 h-6 text-green-400" />
                )}
              </div>
            </div>
            {lastMonthTotal > 0 && (
              <p className={`text-sm mt-2 ${monthChange >= 0 ? "text-red-400" : "text-green-400"}`}>
                {monthChange >= 0 ? "+" : ""}{monthChange.toFixed(1)}% vs mes anterior
              </p>
            )}
          </Card>

          <Card className="p-6 animate-slide-up" style={{ animationDelay: "100ms" }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-dark-400 text-sm">Transacciones</p>
                <p className="text-2xl font-bold text-white mt-1">
                  {transactionCount}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-blue-500/10">
                <CreditCard className="w-6 h-6 text-blue-400" />
              </div>
            </div>
            <p className="text-sm mt-2 text-dark-400">
              Total registradas
            </p>
          </Card>

          <Card className="p-6 animate-slide-up" style={{ animationDelay: "200ms" }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-dark-400 text-sm">Pendientes</p>
                <p className="text-2xl font-bold text-white mt-1">
                  {pendingCount}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-yellow-500/10">
                <AlertCircle className="w-6 h-6 text-yellow-400" />
              </div>
            </div>
            {pendingCount > 0 && (
              <Link href="/pending" className="text-sm mt-2 text-yellow-400 hover:underline flex items-center gap-1">
                Revisar ahora <ArrowRight className="w-3 h-3" />
              </Link>
            )}
          </Card>

          <Card className="p-6 animate-slide-up" style={{ animationDelay: "300ms" }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-dark-400 text-sm">Promedio diario</p>
                <p className="text-2xl font-bold text-white mt-1">
                  {formatCurrency(thisMonthTotal / new Date().getDate())}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-purple-500/10">
                <TrendingUp className="w-6 h-6 text-purple-400" />
              </div>
            </div>
            <p className="text-sm mt-2 text-dark-400">
              Basado en {new Date().getDate()} días
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
                <CategoryChart data={categoryTotals} />
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
                <MonthlyChart data={monthlyTotals} />
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
              <TransactionList transactions={transactions} onUpdate={loadData} />
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}


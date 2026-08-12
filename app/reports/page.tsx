"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useMemo } from "react";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { CurrencyToggle } from "@/components/ui/currency-toggle";
import { CategoryChart } from "@/components/charts/category-chart";
import { DailyChart } from "@/components/charts/daily-chart";
import { TransactionList } from "@/components/transactions/transaction-list";
import { getAllTransactions } from "@/lib/db";
import { Transaction, CategoryId } from "@/lib/types";
import { CATEGORIES } from "@/lib/categories";
import { formatCurrency } from "@/lib/utils";
import {
  getCurrencies,
  getPrimaryCurrency,
  filterByCurrency,
  totalForCurrency,
  categoryTotals as categoryTotalsFor,
} from "@/lib/stats";
import {
  getAvailableMonths,
  getMonthRange,
  getPreviousMonth,
  getDaysInMonth,
  formatMonthLabel,
  getCurrentMonthKey,
} from "@/lib/month-utils";
import {
  TrendingUp,
  Calendar,
  Minus,
  ArrowUpRight,
  ArrowDownRight,
  CreditCard,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ReportsPage() {
  const { status } = useSession();
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthKey());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | "all">("all");
  const [currency, setCurrency] = useState<string>("CRC");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "authenticated") {
      loadData();
    }
  }, [status]);

  const loadData = async () => {
    try {
      const txns = await getAllTransactions();
      setAllTransactions(txns);
      setCurrency((prev) =>
        getCurrencies(txns).includes(prev) ? prev : getPrimaryCurrency(txns)
      );
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const currencies = useMemo(
    () => getCurrencies(allTransactions),
    [allTransactions]
  );

  // Available months from transactions
  const availableMonths = useMemo(() => {
    const dates = allTransactions.map((t) => t.transactionDate);
    return getAvailableMonths(dates);
  }, [allTransactions]);

  // Transactions for the selected month (all currencies)
  const monthTransactionsAll = useMemo(() => {
    const { start, end } = getMonthRange(selectedMonth);
    return allTransactions.filter((t) => {
      const date = new Date(t.transactionDate);
      return date >= start && date <= end;
    });
  }, [allTransactions, selectedMonth]);

  // Transactions shown in the list (respect category filter, keep all currencies
  // so each row renders in its own currency)
  const monthTransactions = useMemo(() => {
    if (selectedCategory === "all") return monthTransactionsAll;
    return monthTransactionsAll.filter((t) => t.categoryId === selectedCategory);
  }, [monthTransactionsAll, selectedCategory]);

  // Stats for the selected month, scoped to the selected currency (never mixed)
  const monthStats = useMemo(() => {
    const daysInMonth = getDaysInMonth(selectedMonth);
    const inCurrency = filterByCurrency(monthTransactionsAll, currency);

    const total = totalForCurrency(monthTransactionsAll, currency);
    const byCategory = categoryTotalsFor(monthTransactionsAll, currency);

    const topCategoryId = Object.entries(byCategory).sort(
      (a, b) => b[1] - a[1]
    )[0]?.[0] as CategoryId | undefined;

    return {
      total,
      count: inCurrency.length,
      averageDaily: total / daysInMonth,
      byCategory,
      topCategory: topCategoryId ? CATEGORIES[topCategoryId] : null,
      topCategoryAmount: topCategoryId ? byCategory[topCategoryId] : 0,
    };
  }, [monthTransactionsAll, selectedMonth, currency]);

  // Previous month total (selected currency) for comparison
  const prevMonthTotal = useMemo(() => {
    const prevMonthKey = getPreviousMonth(selectedMonth);
    const { start, end } = getMonthRange(prevMonthKey);
    const prevTransactions = allTransactions.filter((t) => {
      const date = new Date(t.transactionDate);
      return date >= start && date <= end;
    });
    return totalForCurrency(prevTransactions, currency);
  }, [allTransactions, selectedMonth, currency]);

  const changePercent = useMemo(() => {
    if (prevMonthTotal === 0) return null;
    return ((monthStats.total - prevMonthTotal) / prevMonthTotal) * 100;
  }, [monthStats.total, prevMonthTotal]);

  // Daily spending data for chart (selected currency, filtered by category)
  const dailyData = useMemo(() => {
    const daysInMonth = getDaysInMonth(selectedMonth);
    const [year, month] = selectedMonth.split("-").map(Number);

    const dailyTotals: Record<number, number> = {};
    for (let day = 1; day <= daysInMonth; day++) {
      dailyTotals[day] = 0;
    }

    const filteredTxns = filterByCurrency(monthTransactionsAll, currency).filter(
      (t) => selectedCategory === "all" || t.categoryId === selectedCategory
    );

    filteredTxns.forEach((t) => {
      const day = new Date(t.transactionDate).getDate();
      dailyTotals[day] = (dailyTotals[day] || 0) + t.amount;
    });

    return Object.entries(dailyTotals).map(([day, amount]) => ({
      day: parseInt(day),
      amount,
      date: new Date(year, month - 1, parseInt(day)).toISOString(),
    }));
  }, [monthTransactionsAll, selectedMonth, selectedCategory, currency]);

  const highestDay = useMemo(() => {
    if (dailyData.length === 0) return null;
    return dailyData.reduce((max, d) => (d.amount > max.amount ? d : max), dailyData[0]);
  }, [dailyData]);

  // Transactions for the selected day (all currencies, rows render their own)
  const dayTransactions = useMemo(() => {
    if (selectedDay === null) return [];
    return monthTransactions.filter(
      (t) => new Date(t.transactionDate).getDate() === selectedDay
    );
  }, [monthTransactions, selectedDay]);

  const handleDayClick = (_date: string, day: number) => setSelectedDay(day);
  const clearDaySelection = () => setSelectedDay(null);

  const handleMonthChange = (newMonth: string) => {
    setSelectedMonth(newMonth);
    setSelectedDay(null);
    setSelectedCategory("all");
  };

  const handleCategoryChange = (category: CategoryId | "all") => {
    setSelectedCategory(category);
    setSelectedDay(null);
  };

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
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">
              Reporte Mensual
            </h1>
            <p className="text-dark-400 mt-1">Análisis detallado de tus gastos</p>
          </div>

          {/* Filters row */}
          <div className="flex flex-col sm:flex-row flex-wrap gap-3 w-full lg:w-auto">
            <CurrencyToggle
              currencies={currencies}
              value={currency}
              onChange={setCurrency}
            />
            <div className="w-full sm:w-44">
              <Select
                value={selectedMonth}
                onChange={(e) => handleMonthChange(e.target.value)}
                options={availableMonths.map((m) => ({
                  value: m.value,
                  label: m.label,
                }))}
              />
            </div>
            <div className="w-full sm:w-52">
              <Select
                value={selectedCategory}
                onChange={(e) => handleCategoryChange(e.target.value as CategoryId | "all")}
                options={[
                  { value: "all", label: "📊 Todas las categorías" },
                  ...Object.values(CATEGORIES).map((c) => ({
                    value: c.id,
                    label: `${c.icon} ${c.name}`,
                  })),
                ]}
              />
            </div>
          </div>
        </div>

        {/* Stats cards (selected currency) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Total */}
          <Card className="p-6 animate-slide-up" style={{ animationDelay: "0ms" }}>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-dark-400 text-sm">Total del mes</p>
                <p className="text-2xl font-bold text-white mt-1 truncate">
                  {formatCurrency(monthStats.total, currency)}
                </p>
              </div>
              <div className="shrink-0 p-3 rounded-xl bg-primary-500/10">
                <span className="text-xl">{currency === "USD" ? "$" : "₡"}</span>
              </div>
            </div>
            {changePercent !== null && (
              <div className="flex items-center gap-1 mt-2">
                {changePercent > 0 ? (
                  <ArrowUpRight className="w-4 h-4 text-red-400" />
                ) : changePercent < 0 ? (
                  <ArrowDownRight className="w-4 h-4 text-green-400" />
                ) : (
                  <Minus className="w-4 h-4 text-dark-400" />
                )}
                <span
                  className={`text-sm ${
                    changePercent > 0
                      ? "text-red-400"
                      : changePercent < 0
                      ? "text-green-400"
                      : "text-dark-400"
                  }`}
                >
                  {changePercent > 0 ? "+" : ""}
                  {changePercent.toFixed(1)}% vs mes anterior
                </span>
              </div>
            )}
          </Card>

          {/* Count */}
          <Card className="p-6 animate-slide-up" style={{ animationDelay: "100ms" }}>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-dark-400 text-sm">Transacciones</p>
                <p className="text-2xl font-bold text-white mt-1 truncate">
                  {monthStats.count}
                </p>
              </div>
              <div className="shrink-0 p-3 rounded-xl bg-blue-500/10">
                <CreditCard className="w-6 h-6 text-blue-400" />
              </div>
            </div>
            <p className="text-sm mt-2 text-dark-400">
              en {currency === "USD" ? "dólares" : "colones"}
            </p>
          </Card>

          {/* Average daily */}
          <Card className="p-6 animate-slide-up" style={{ animationDelay: "200ms" }}>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-dark-400 text-sm">Promedio diario</p>
                <p className="text-2xl font-bold text-white mt-1 truncate">
                  {formatCurrency(monthStats.averageDaily, currency)}
                </p>
              </div>
              <div className="shrink-0 p-3 rounded-xl bg-purple-500/10">
                <TrendingUp className="w-6 h-6 text-purple-400" />
              </div>
            </div>
            <p className="text-sm mt-2 text-dark-400">
              {getDaysInMonth(selectedMonth)} días
            </p>
          </Card>

          {/* Top category */}
          <Card className="p-6 animate-slide-up" style={{ animationDelay: "300ms" }}>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-dark-400 text-sm">Mayor gasto</p>
                {monthStats.topCategory ? (
                  <p className="text-2xl font-bold text-white mt-1 truncate">
                    {monthStats.topCategory.icon}{" "}
                    {monthStats.topCategory.name.split(" ")[0]}
                  </p>
                ) : (
                  <p className="text-2xl font-bold text-dark-500 mt-1">-</p>
                )}
              </div>
              {monthStats.topCategory && (
                <div
                  className="shrink-0 p-3 rounded-xl"
                  style={{ backgroundColor: `${monthStats.topCategory.color}20` }}
                >
                  <span className="text-2xl">{monthStats.topCategory.icon}</span>
                </div>
              )}
            </div>
            {monthStats.topCategoryAmount > 0 && monthStats.total > 0 && (
              <p className="text-sm mt-2 text-dark-400">
                {formatCurrency(monthStats.topCategoryAmount, currency)} (
                {((monthStats.topCategoryAmount / monthStats.total) * 100).toFixed(0)}%)
              </p>
            )}
          </Card>
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card className="animate-slide-up" style={{ animationDelay: "400ms" }}>
            <CardHeader>
              <CardTitle className="flex flex-wrap items-center justify-between gap-2">
                <span>Gasto por Día</span>
                {highestDay && highestDay.amount > 0 && (
                  <span className="text-sm font-normal text-dark-400">
                    Día más alto: {highestDay.day} (
                    {formatCurrency(highestDay.amount, currency)})
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-72 animate-shimmer rounded-lg" />
              ) : (
                <DailyChart
                  data={dailyData}
                  averageDaily={monthStats.averageDaily}
                  currency={currency}
                  onDayClick={handleDayClick}
                />
              )}
            </CardContent>
          </Card>

          <Card className="animate-slide-up" style={{ animationDelay: "500ms" }}>
            <CardHeader>
              <CardTitle>Gastos por Categoría</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-80 animate-shimmer rounded-lg" />
              ) : (
                <CategoryChart data={monthStats.byCategory} currency={currency} />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Transactions section */}
        <Card className="animate-slide-up" style={{ animationDelay: "600ms" }}>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              {selectedDay !== null ? (
                <>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-primary-400" />
                    Día {selectedDay} de {formatMonthLabel(selectedMonth)}
                  </CardTitle>
                  <p className="text-dark-400 text-sm mt-1">
                    {dayTransactions.length} transacción
                    {dayTransactions.length !== 1 ? "es" : ""}
                  </p>
                </>
              ) : (
                <CardTitle>
                  Transacciones de {formatMonthLabel(selectedMonth)}
                  <span className="text-dark-400 text-sm font-normal ml-2">
                    ({monthTransactions.length} total)
                  </span>
                </CardTitle>
              )}
            </div>
            {selectedDay !== null && (
              <Button variant="secondary" size="sm" onClick={clearDaySelection}>
                <X className="w-4 h-4 mr-1" />
                Ver todo el mes
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-20 animate-shimmer rounded-xl" />
                ))}
              </div>
            ) : selectedDay !== null ? (
              dayTransactions.length > 0 ? (
                <TransactionList transactions={dayTransactions} onUpdate={loadData} />
              ) : (
                <p className="text-dark-400 text-center py-8">
                  No hay transacciones el día {selectedDay}
                </p>
              )
            ) : (
              <TransactionList transactions={monthTransactions} onUpdate={loadData} />
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

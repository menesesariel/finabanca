"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useMemo } from "react";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { CategoryChart } from "@/components/charts/category-chart";
import { DailyChart } from "@/components/charts/daily-chart";
import { TransactionList } from "@/components/transactions/transaction-list";
import { getAllTransactions } from "@/lib/db";
import { Transaction, CategoryId } from "@/lib/types";
import { CATEGORIES } from "@/lib/categories";
import { formatCurrency } from "@/lib/utils";
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
  TrendingDown,
  Calendar,
  CreditCard,
  Minus,
  ArrowUpRight,
  ArrowDownRight,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ReportsPage() {
  const { status } = useSession();
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthKey());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | "all">("all");
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
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Get available months from transactions
  const availableMonths = useMemo(() => {
    const dates = allTransactions.map((t) => t.transactionDate);
    return getAvailableMonths(dates);
  }, [allTransactions]);

  // Filter transactions for selected month
  const monthTransactionsAll = useMemo(() => {
    const { start, end } = getMonthRange(selectedMonth);
    return allTransactions.filter((t) => {
      const date = new Date(t.transactionDate);
      return date >= start && date <= end;
    });
  }, [allTransactions, selectedMonth]);

  // Filter by category
  const monthTransactions = useMemo(() => {
    if (selectedCategory === "all") return monthTransactionsAll;
    return monthTransactionsAll.filter((t) => t.categoryId === selectedCategory);
  }, [monthTransactionsAll, selectedCategory]);

  // Calculate stats for selected month - SEPARATED BY CURRENCY
  const monthStats = useMemo(() => {
    const daysInMonth = getDaysInMonth(selectedMonth);

    // Separate by currency
    const byCurrency: Record<string, { total: number; count: number }> = {};
    monthTransactionsAll.forEach((t) => {
      if (!byCurrency[t.currency]) {
        byCurrency[t.currency] = { total: 0, count: 0 };
      }
      byCurrency[t.currency].total += t.amount;
      byCurrency[t.currency].count += 1;
    });

    // Category totals (separate by currency too)
    const byCategory: Record<CategoryId, Record<string, number>> = {} as Record<CategoryId, Record<string, number>>;
    monthTransactionsAll.forEach((t) => {
      if (!byCategory[t.categoryId]) {
        byCategory[t.categoryId] = {};
      }
      byCategory[t.categoryId][t.currency] = (byCategory[t.categoryId][t.currency] || 0) + t.amount;
    });

    // Category totals for chart (only CRC for simplicity in pie chart)
    const byCategoryCRC: Record<CategoryId, number> = {} as Record<CategoryId, number>;
    monthTransactionsAll.filter(t => t.currency === "CRC").forEach((t) => {
      byCategoryCRC[t.categoryId] = (byCategoryCRC[t.categoryId] || 0) + t.amount;
    });

    // Top category by CRC
    const topCategoryId = Object.entries(byCategoryCRC)
      .sort((a, b) => b[1] - a[1])[0]?.[0] as CategoryId | undefined;

    return {
      byCurrency,
      totalCRC: byCurrency["CRC"]?.total || 0,
      totalUSD: byCurrency["USD"]?.total || 0,
      countCRC: byCurrency["CRC"]?.count || 0,
      countUSD: byCurrency["USD"]?.count || 0,
      count: monthTransactionsAll.length,
      averageDailyCRC: (byCurrency["CRC"]?.total || 0) / daysInMonth,
      averageDailyUSD: (byCurrency["USD"]?.total || 0) / daysInMonth,
      byCategory,
      byCategoryCRC,
      topCategory: topCategoryId ? CATEGORIES[topCategoryId] : null,
      topCategoryAmount: topCategoryId ? byCategoryCRC[topCategoryId] : 0,
    };
  }, [monthTransactionsAll, selectedMonth]);

  // Calculate previous month stats for comparison
  const prevMonthStats = useMemo(() => {
    const prevMonthKey = getPreviousMonth(selectedMonth);
    const { start, end } = getMonthRange(prevMonthKey);
    const prevTransactions = allTransactions.filter((t) => {
      const date = new Date(t.transactionDate);
      return date >= start && date <= end;
    });
    
    const totalCRC = prevTransactions.filter(t => t.currency === "CRC").reduce((sum, t) => sum + t.amount, 0);
    const totalUSD = prevTransactions.filter(t => t.currency === "USD").reduce((sum, t) => sum + t.amount, 0);
    
    return { totalCRC, totalUSD, count: prevTransactions.length };
  }, [allTransactions, selectedMonth]);

  // Calculate change percentage (CRC only for now)
  const changePercentCRC = useMemo(() => {
    if (prevMonthStats.totalCRC === 0) return null;
    return ((monthStats.totalCRC - prevMonthStats.totalCRC) / prevMonthStats.totalCRC) * 100;
  }, [monthStats.totalCRC, prevMonthStats.totalCRC]);

  const changePercentUSD = useMemo(() => {
    if (prevMonthStats.totalUSD === 0) return null;
    return ((monthStats.totalUSD - prevMonthStats.totalUSD) / prevMonthStats.totalUSD) * 100;
  }, [monthStats.totalUSD, prevMonthStats.totalUSD]);

  // Daily spending data for chart (CRC only for consistency)
  const dailyData = useMemo(() => {
    const daysInMonth = getDaysInMonth(selectedMonth);
    const [year, month] = selectedMonth.split("-").map(Number);

    const dailyTotals: Record<number, number> = {};

    // Initialize all days to 0
    for (let day = 1; day <= daysInMonth; day++) {
      dailyTotals[day] = 0;
    }

    // Sum transactions by day (CRC only, filtered by category if selected)
    const filteredTxns = selectedCategory === "all" 
      ? monthTransactionsAll.filter(t => t.currency === "CRC")
      : monthTransactionsAll.filter(t => t.currency === "CRC" && t.categoryId === selectedCategory);
    
    filteredTxns.forEach((t) => {
      const date = new Date(t.transactionDate);
      const day = date.getDate();
      dailyTotals[day] = (dailyTotals[day] || 0) + t.amount;
    });

    return Object.entries(dailyTotals).map(([day, amount]) => ({
      day: parseInt(day),
      amount,
      date: new Date(year, month - 1, parseInt(day)).toISOString(),
    }));
  }, [monthTransactionsAll, selectedMonth, selectedCategory]);

  // Get highest spending day
  const highestDay = useMemo(() => {
    if (dailyData.length === 0) return null;
    return dailyData.reduce((max, d) => (d.amount > max.amount ? d : max), dailyData[0]);
  }, [dailyData]);

  // Filter transactions by selected day
  const dayTransactions = useMemo(() => {
    if (selectedDay === null) return [];
    return monthTransactions.filter((t) => {
      const date = new Date(t.transactionDate);
      return date.getDate() === selectedDay;
    });
  }, [monthTransactions, selectedDay]);

  // Handle day click from chart
  const handleDayClick = (date: string, day: number) => {
    setSelectedDay(day);
  };

  // Clear day selection
  const clearDaySelection = () => {
    setSelectedDay(null);
  };

  // Reset selections when month changes
  const handleMonthChange = (newMonth: string) => {
    setSelectedMonth(newMonth);
    setSelectedDay(null);
    setSelectedCategory("all");
  };

  // Handle category change
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
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">
              Reporte Mensual
            </h1>
            <p className="text-dark-400 mt-1">
              Análisis detallado de tus gastos
            </p>
          </div>

          {/* Filters row */}
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            {/* Month selector */}
            <div className="w-full sm:w-48">
              <Select
                value={selectedMonth}
                onChange={(e) => handleMonthChange(e.target.value)}
                options={availableMonths.map((m) => ({
                  value: m.value,
                  label: m.label,
                }))}
              />
            </div>
            {/* Category filter */}
            <div className="w-full sm:w-56">
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

        {/* Stats cards - Separated by currency */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Total CRC */}
          <Card className="p-6 animate-slide-up" style={{ animationDelay: "0ms" }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-dark-400 text-sm">Total Colones (₡)</p>
                <p className="text-2xl font-bold text-white mt-1">
                  {formatCurrency(monthStats.totalCRC, "CRC")}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-primary-500/10">
                <span className="text-xl">₡</span>
              </div>
            </div>
            {changePercentCRC !== null && (
              <div className="flex items-center gap-1 mt-2">
                {changePercentCRC > 0 ? (
                  <ArrowUpRight className="w-4 h-4 text-red-400" />
                ) : changePercentCRC < 0 ? (
                  <ArrowDownRight className="w-4 h-4 text-green-400" />
                ) : (
                  <Minus className="w-4 h-4 text-dark-400" />
                )}
                <span
                  className={`text-sm ${
                    changePercentCRC > 0
                      ? "text-red-400"
                      : changePercentCRC < 0
                      ? "text-green-400"
                      : "text-dark-400"
                  }`}
                >
                  {changePercentCRC > 0 ? "+" : ""}
                  {changePercentCRC.toFixed(1)}% vs mes anterior
                </span>
              </div>
            )}
            <p className="text-xs text-dark-500 mt-1">{monthStats.countCRC} transacciones</p>
          </Card>

          {/* Total USD */}
          <Card className="p-6 animate-slide-up" style={{ animationDelay: "100ms" }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-dark-400 text-sm">Total Dólares ($)</p>
                <p className="text-2xl font-bold text-white mt-1">
                  {formatCurrency(monthStats.totalUSD, "USD")}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-blue-500/10">
                <span className="text-xl text-blue-400">$</span>
              </div>
            </div>
            {changePercentUSD !== null && (
              <div className="flex items-center gap-1 mt-2">
                {changePercentUSD > 0 ? (
                  <ArrowUpRight className="w-4 h-4 text-red-400" />
                ) : changePercentUSD < 0 ? (
                  <ArrowDownRight className="w-4 h-4 text-green-400" />
                ) : (
                  <Minus className="w-4 h-4 text-dark-400" />
                )}
                <span
                  className={`text-sm ${
                    changePercentUSD > 0
                      ? "text-red-400"
                      : changePercentUSD < 0
                      ? "text-green-400"
                      : "text-dark-400"
                  }`}
                >
                  {changePercentUSD > 0 ? "+" : ""}
                  {changePercentUSD.toFixed(1)}% vs mes anterior
                </span>
              </div>
            )}
            <p className="text-xs text-dark-500 mt-1">{monthStats.countUSD} transacciones</p>
          </Card>

          {/* Promedio diario CRC */}
          <Card className="p-6 animate-slide-up" style={{ animationDelay: "200ms" }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-dark-400 text-sm">Promedio diario ₡</p>
                <p className="text-2xl font-bold text-white mt-1">
                  {formatCurrency(monthStats.averageDailyCRC, "CRC")}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-purple-500/10">
                <TrendingUp className="w-6 h-6 text-purple-400" />
              </div>
            </div>
            <p className="text-sm mt-2 text-dark-400">
              {getDaysInMonth(selectedMonth)} días • {monthStats.count} transacciones
            </p>
          </Card>

          {/* Categoría principal */}
          <Card className="p-6 animate-slide-up" style={{ animationDelay: "300ms" }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-dark-400 text-sm">Mayor gasto (₡)</p>
                {monthStats.topCategory ? (
                  <p className="text-2xl font-bold text-white mt-1">
                    {monthStats.topCategory.icon} {monthStats.topCategory.name.split(" ")[0]}
                  </p>
                ) : (
                  <p className="text-2xl font-bold text-dark-500 mt-1">-</p>
                )}
              </div>
              {monthStats.topCategory && (
                <div
                  className="p-3 rounded-xl"
                  style={{ backgroundColor: `${monthStats.topCategory.color}20` }}
                >
                  <span className="text-2xl">{monthStats.topCategory.icon}</span>
                </div>
              )}
            </div>
            {monthStats.topCategoryAmount > 0 && monthStats.totalCRC > 0 && (
              <p className="text-sm mt-2 text-dark-400">
                {formatCurrency(monthStats.topCategoryAmount, "CRC")} (
                {((monthStats.topCategoryAmount / monthStats.totalCRC) * 100).toFixed(0)}%)
              </p>
            )}
          </Card>
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Daily chart */}
          <Card className="animate-slide-up" style={{ animationDelay: "400ms" }}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Gasto por Día</span>
                {highestDay && highestDay.amount > 0 && (
                  <span className="text-sm font-normal text-dark-400">
                    Día más alto: {highestDay.day} ({formatCurrency(highestDay.amount)})
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
                  averageDaily={monthStats.averageDailyCRC}
                  onDayClick={handleDayClick}
                />
              )}
            </CardContent>
          </Card>

          {/* Category chart */}
          <Card className="animate-slide-up" style={{ animationDelay: "500ms" }}>
            <CardHeader>
              <CardTitle>Gastos por Categoría</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-80 animate-shimmer rounded-lg" />
              ) : (
                <CategoryChart data={monthStats.byCategoryCRC} />
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
                    {dayTransactions.length} transacción{dayTransactions.length !== 1 ? "es" : ""} • 
                    Total: {formatCurrency(dayTransactions.reduce((sum, t) => sum + t.amount, 0))}
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


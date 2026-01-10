"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { TransactionList } from "@/components/transactions/transaction-list";
import { SyncButton } from "@/components/sync/sync-button";
import { Select } from "@/components/ui/select";
import { getAllTransactions, getTransactionsByCategory } from "@/lib/db";
import { Transaction, CategoryId } from "@/lib/types";
import { CATEGORY_LIST } from "@/lib/categories";
import { Search } from "lucide-react";

export default function TransactionsPage() {
  const { status } = useSession();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const loadData = async () => {
    try {
      const txns = await getAllTransactions();
      setTransactions(txns);
      setFilteredTransactions(txns);
    } catch (error) {
      console.error("Error loading transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated") {
      loadData();
    }
  }, [status]);

  // Filter transactions
  useEffect(() => {
    let filtered = transactions;

    // Filter by category
    if (categoryFilter !== "all") {
      filtered = filtered.filter((t) => t.categoryId === categoryFilter);
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.merchant.toLowerCase().includes(term) ||
          t.reference?.toLowerCase().includes(term) ||
          t.authorizationCode?.toLowerCase().includes(term)
      );
    }

    setFilteredTransactions(filtered);
  }, [transactions, searchTerm, categoryFilter]);

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

  const categoryOptions = [
    { value: "all", label: "Todas las categorías" },
    ...CATEGORY_LIST.map((c) => ({ value: c.id, label: `${c.icon} ${c.name}` })),
  ];

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="md:ml-64 p-4 md:p-8 pt-20 md:pt-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">
              Transacciones
            </h1>
            <p className="text-dark-400 mt-1">
              {filteredTransactions.length} de {transactions.length} transacciones
            </p>
          </div>
          <SyncButton onComplete={() => loadData()} />
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
            <input
              type="text"
              placeholder="Buscar por comercio, referencia..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-dark-800 border border-dark-700 text-white placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
            />
          </div>
          <div className="w-full md:w-64">
            <Select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              options={categoryOptions}
            />
          </div>
        </div>

        {/* Transactions list */}
        <Card>
          <CardContent className="p-4">
            {loading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-20 animate-shimmer rounded-xl" />
                ))}
              </div>
            ) : (
              <TransactionList
                transactions={filteredTransactions}
                onUpdate={loadData}
              />
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}


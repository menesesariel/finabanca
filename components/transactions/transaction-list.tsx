"use client";

import { useState } from "react";
import { Transaction, CategoryId } from "@/lib/types";
import { CATEGORIES, CATEGORY_LIST } from "@/lib/categories";
import { formatCurrency, formatDate, formatTime } from "@/lib/utils";
import { updateTransactionCategory } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { 
  CreditCard, 
  AlertCircle, 
  CheckCircle2, 
  ChevronDown,
  ChevronUp,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TransactionListProps {
  transactions: Transaction[];
  onUpdate?: () => void;
  showPending?: boolean;
}

export function TransactionList({ 
  transactions, 
  onUpdate,
  showPending = false 
}: TransactionListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<CategoryId>("other");

  const filteredTransactions = showPending
    ? transactions.filter(t => t.confidence < 70 && !t.isManuallyClassified)
    : transactions;

  if (filteredTransactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-dark-400">
        <CreditCard className="w-12 h-12 mb-4 opacity-50" />
        <p>No hay transacciones</p>
      </div>
    );
  }

  const handleCategoryUpdate = async (transactionId: string) => {
    await updateTransactionCategory(transactionId, selectedCategory);
    setEditingId(null);
    onUpdate?.();
  };

  return (
    <div className="space-y-3">
      {filteredTransactions.map((transaction, index) => {
        const category = CATEGORIES[transaction.categoryId];
        const isExpanded = expandedId === transaction.id;
        const isEditing = editingId === transaction.id;
        const needsReview = transaction.confidence < 70 && !transaction.isManuallyClassified;

        return (
          <Card 
            key={transaction.id} 
            hover
            className={cn(
              "overflow-hidden animate-fade-in",
              needsReview && "border-yellow-500/30"
            )}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div 
              className="p-4 cursor-pointer"
              onClick={() => setExpandedId(isExpanded ? null : transaction.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                    style={{ backgroundColor: `${category.color}20` }}
                  >
                    {category.icon}
                  </div>
                  <div>
                    <p className="text-white font-medium truncate max-w-[200px]">
                      {transaction.merchant}
                    </p>
                    <p className="text-dark-400 text-sm">
                      {formatDate(transaction.transactionDate)} • {formatTime(transaction.transactionDate)}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-white font-semibold">
                      {formatCurrency(transaction.amount, transaction.currency)}
                    </p>
                    <div className="flex items-center gap-1">
                      {needsReview ? (
                        <Badge variant="warning" className="text-xs">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          Revisar
                        </Badge>
                      ) : transaction.isManuallyClassified ? (
                        <Badge variant="success" className="text-xs">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Manual
                        </Badge>
                      ) : (
                        <Badge variant="info" className="text-xs">
                          {transaction.confidence}% conf
                        </Badge>
                      )}
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-dark-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-dark-400" />
                  )}
                </div>
              </div>
            </div>

            {/* Expanded details */}
            {isExpanded && (
              <div className="px-4 pb-4 pt-0 border-t border-dark-700/50 animate-fade-in">
                <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-dark-400">Categoría</p>
                    {isEditing ? (
                      <div className="mt-1 flex gap-2">
                        <Select
                          value={selectedCategory}
                          onChange={(e) => setSelectedCategory(e.target.value as CategoryId)}
                          options={CATEGORY_LIST.map(c => ({
                            value: c.id,
                            label: `${c.icon} ${c.name}`
                          }))}
                          className="flex-1"
                        />
                        <Button size="sm" onClick={() => handleCategoryUpdate(transaction.id)}>
                          ✓
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <p 
                        className="text-white cursor-pointer hover:text-primary-400 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCategory(transaction.categoryId);
                          setEditingId(transaction.id);
                        }}
                      >
                        {category.icon} {category.name}
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-dark-400">Tarjeta</p>
                    <p className="text-white">•••• {transaction.cardLastFour || "----"}</p>
                  </div>
                  <div>
                    <p className="text-dark-400">Autorización</p>
                    <p className="text-white font-mono text-xs">
                      {transaction.authorizationCode || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-dark-400">Referencia</p>
                    <p className="text-white font-mono text-xs truncate">
                      {transaction.reference || "N/A"}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}


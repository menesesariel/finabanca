"use client";

import { useState } from "react";
import { Transaction, CategoryId } from "@/lib/types";
import { CATEGORIES, CATEGORY_LIST } from "@/lib/categories";
import { formatCurrency, formatDate, formatTime } from "@/lib/utils";
import { updateTransactionCategory, addUserRule } from "@/lib/db";
import { suggestKeyword } from "@/lib/merchant-rules";
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
  Sparkles,
  X,
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
  const [rulePrompt, setRulePrompt] = useState<{
    merchant: string;
    categoryId: CategoryId;
    keyword: string;
  } | null>(null);

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

  const handleCategoryUpdate = async (transaction: Transaction) => {
    const categoryId = selectedCategory;
    await updateTransactionCategory(transaction.id, categoryId);
    setEditingId(null);
    // Offer to remember this as a rule for similar merchants next time.
    setRulePrompt({
      merchant: transaction.merchant,
      categoryId,
      keyword: suggestKeyword(transaction.merchant),
    });
    onUpdate?.();
  };

  const handleCreateRule = async () => {
    if (!rulePrompt) return;
    await addUserRule(rulePrompt.keyword, rulePrompt.categoryId);
    setRulePrompt(null);
  };

  const promptCategory = rulePrompt ? CATEGORIES[rulePrompt.categoryId] : null;

  return (
    <>
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
                        <Button size="sm" onClick={() => handleCategoryUpdate(transaction)}>
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

      {/* "Remember this rule?" prompt after a manual re-categorization */}
      {rulePrompt && promptCategory && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[70] w-[calc(100%-2rem)] max-w-md">
          <Card className="p-4 shadow-2xl border-primary-500/30">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary-500/20 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 text-primary-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium">
                  ¿Recordar esta regla?
                </p>
                <p className="text-dark-400 text-xs mt-1">
                  Los comercios que contengan esta palabra se clasificarán como{" "}
                  <span className="text-white">
                    {promptCategory.icon} {promptCategory.name}
                  </span>
                  .
                </p>
                <input
                  type="text"
                  value={rulePrompt.keyword}
                  onChange={(e) =>
                    setRulePrompt((prev) =>
                      prev ? { ...prev, keyword: e.target.value } : prev
                    )
                  }
                  className="mt-2 w-full px-3 py-2 rounded-lg bg-dark-800 border border-dark-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <div className="flex justify-end gap-2 mt-3">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setRulePrompt(null)}
                  >
                    Ahora no
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleCreateRule}
                    disabled={!rulePrompt.keyword.trim()}
                  >
                    Crear regla
                  </Button>
                </div>
              </div>
              <button
                onClick={() => setRulePrompt(null)}
                className="text-dark-400 hover:text-white shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}


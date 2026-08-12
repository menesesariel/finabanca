"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { KNOWN_BANK_SENDERS, BankSender } from "@/lib/known-senders";
import { DATE_RANGES, getDateRangeById } from "@/lib/date-ranges";
import {
  addTransaction,
  isEmailProcessed,
  markEmailProcessed,
  getUserRules,
} from "@/lib/db";
import { buildTransactionFromParsed } from "@/lib/import-utils";
import { cn } from "@/lib/utils";
import {
  X,
  Calendar,
  Mail,
  Download,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Building2,
} from "lucide-react";

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (newCount: number) => void;
}

type ImportStep = "config" | "searching" | "preview" | "importing" | "done";

interface ImportProgress {
  current: number;
  total: number;
  currentMerchant?: string;
}

interface EmailResult {
  emailId: string;
  from: string;
  subject: string;
  date: string;
  parsed: {
    success: boolean;
    transaction?: {
      merchant: string;
      amount: number;
      currency: string;
      transactionDate: string;
      authorizationCode?: string;
      reference?: string;
      cardLastFour?: string;
      bankSource: string;
      emailId: string;
    };
    error?: string;
  };
}

export function ImportModal({ isOpen, onClose, onComplete }: ImportModalProps) {
  const { data: session } = useSession();
  const [step, setStep] = useState<ImportStep>("config");
  const [selectedRange, setSelectedRange] = useState("last-month");
  const [selectedSenders, setSelectedSenders] = useState<string[]>([
    "Alertas@davibank.cr",
    "AlertasScotiabank@scotiabank.com",
    "notificacion@baccredomatic.cr",
  ]);
  const [customSender, setCustomSender] = useState("");
  const [emails, setEmails] = useState<EmailResult[]>([]);
  const [progress, setProgress] = useState<ImportProgress>({ current: 0, total: 0 });
  const [results, setResults] = useState({ imported: 0, skipped: 0, failed: 0 });
  const [error, setError] = useState<string | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep("config");
      setEmails([]);
      setProgress({ current: 0, total: 0 });
      setResults({ imported: 0, skipped: 0, failed: 0 });
      setError(null);
    }
  }, [isOpen]);

  const toggleSender = (email: string) => {
    setSelectedSenders((prev) =>
      prev.includes(email)
        ? prev.filter((e) => e !== email)
        : [...prev, email]
    );
  };

  const addCustomSender = () => {
    if (customSender && customSender.includes("@")) {
      if (!selectedSenders.includes(customSender)) {
        setSelectedSenders((prev) => [...prev, customSender]);
      }
      setCustomSender("");
    }
  };

  const handleSearch = async () => {
    if (selectedSenders.length === 0) {
      setError("Selecciona al menos un remitente");
      return;
    }

    setStep("searching");
    setError(null);

    try {
      const range = getDateRangeById(selectedRange);
      if (!range) throw new Error("Invalid date range");

      const { start, end } = range.getRange();

      const response = await fetch("/api/gmail/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senders: selectedSenders,
          startDate: start.toISOString(),
          endDate: end.toISOString(),
          // High cap so long ranges (e.g. 6 months) aren't truncated to the
          // most-recent 500 emails. The date range still bounds the results.
          maxResults: 2000,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error searching emails");
      }

      setEmails(data.emails || []);
      setStep("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
      setStep("config");
    }
  };

  const handleImport = async () => {
    const validEmails = emails.filter((e) => e.parsed.success && e.parsed.transaction);
    
    if (validEmails.length === 0) {
      setError("No hay transacciones válidas para importar");
      return;
    }

    setStep("importing");
    setProgress({ current: 0, total: validEmails.length });

    // Load the user's rules once for the whole batch.
    const userRules = await getUserRules();

    let imported = 0;
    let skipped = 0;
    let failed = 0;

    for (let i = 0; i < validEmails.length; i++) {
      const email = validEmails[i];
      const tx = email.parsed.transaction!;

      setProgress({
        current: i + 1,
        total: validEmails.length,
        currentMerchant: tx.merchant.slice(0, 30),
      });

      try {
        // Check if already processed
        const alreadyProcessed = await isEmailProcessed(email.emailId);
        if (alreadyProcessed) {
          skipped++;
          continue;
        }

        // Categorize (user rules -> built-in rules -> LLM) and build it.
        const { transaction, usedLlm } = await buildTransactionFromParsed(
          tx,
          userRules
        );

        await addTransaction(transaction);
        await markEmailProcessed(email.emailId);
        imported++;

        // Only throttle when we actually hit the LLM API (rule matches are free).
        if (usedLlm && i < validEmails.length - 1) {
          await new Promise((r) => setTimeout(r, 200));
        }
      } catch (err) {
        failed++;
      }
    }

    setResults({ imported, skipped, failed });
    setStep("done");
    onComplete(imported);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <Card className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-dark-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center">
              <Download className="w-5 h-5 text-primary-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                Importar Transacciones
              </h2>
              <p className="text-sm text-dark-400">
                {step === "config" && "Configura la importación"}
                {step === "searching" && "Buscando emails..."}
                {step === "preview" && `${emails.length} emails encontrados`}
                {step === "importing" && "Procesando..."}
                {step === "done" && "¡Completado!"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-dark-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-red-400">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Step: Config */}
          {step === "config" && (
            <div className="space-y-6">
              {/* Date range */}
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  <Calendar className="w-4 h-4 inline mr-2" />
                  Período
                </label>
                <Select
                  value={selectedRange}
                  onChange={(e) => setSelectedRange(e.target.value)}
                  options={DATE_RANGES.map((r) => ({
                    value: r.id,
                    label: r.label,
                  }))}
                />
              </div>

              {/* Senders */}
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  <Mail className="w-4 h-4 inline mr-2" />
                  Buscar emails de:
                </label>
                <div className="space-y-2">
                  {KNOWN_BANK_SENDERS.map((bank) => (
                    <label
                      key={bank.id}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                        selectedSenders.includes(bank.email)
                          ? "bg-primary-500/10 border-primary-500/30"
                          : "bg-dark-800 border-dark-700 hover:border-dark-600"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={selectedSenders.includes(bank.email)}
                        onChange={() => toggleSender(bank.email)}
                        className="sr-only"
                      />
                      <div
                        className={cn(
                          "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors",
                          selectedSenders.includes(bank.email)
                            ? "bg-primary-500 border-primary-500"
                            : "border-dark-500"
                        )}
                      >
                        {selectedSenders.includes(bank.email) && (
                          <CheckCircle2 className="w-3 h-3 text-white" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-dark-400" />
                          <span className="text-white font-medium">
                            {bank.bank}
                          </span>
                          {bank.hasParser && (
                            <Badge variant="success" className="text-xs">
                              Parser ✓
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-dark-400 mt-0.5">
                          {bank.email}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>

                {/* Custom sender */}
                <div className="mt-3 flex gap-2">
                  <input
                    type="email"
                    value={customSender}
                    onChange={(e) => setCustomSender(e.target.value)}
                    placeholder="Agregar otro remitente..."
                    className="flex-1 px-3 py-2 rounded-xl bg-dark-800 border border-dark-700 text-white placeholder-dark-400 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    onKeyDown={(e) => e.key === "Enter" && addCustomSender()}
                  />
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={addCustomSender}
                    disabled={!customSender.includes("@")}
                  >
                    Agregar
                  </Button>
                </div>

                {/* Custom senders list */}
                {selectedSenders.filter(
                  (s) => !KNOWN_BANK_SENDERS.some((b) => b.email === s)
                ).length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedSenders
                      .filter((s) => !KNOWN_BANK_SENDERS.some((b) => b.email === s))
                      .map((sender) => (
                        <Badge
                          key={sender}
                          className="flex items-center gap-1 cursor-pointer hover:bg-dark-600"
                          onClick={() => toggleSender(sender)}
                        >
                          {sender}
                          <X className="w-3 h-3" />
                        </Badge>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step: Searching */}
          {step === "searching" && (
            <div className="py-12 text-center">
              <Loader2 className="w-12 h-12 text-primary-400 animate-spin mx-auto mb-4" />
              <p className="text-white font-medium">Buscando emails...</p>
              <p className="text-dark-400 text-sm mt-1">
                Esto puede tomar unos segundos
              </p>
            </div>
          )}

          {/* Step: Preview */}
          {step === "preview" && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20">
                  <p className="text-2xl font-bold text-green-400">
                    {emails.filter((e) => e.parsed.success).length}
                  </p>
                  <p className="text-xs text-dark-400">Transacciones válidas</p>
                </div>
                <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                  <p className="text-2xl font-bold text-yellow-400">
                    {emails.filter((e) => !e.parsed.success).length}
                  </p>
                  <p className="text-xs text-dark-400">No reconocidos</p>
                </div>
              </div>

              {/* Email list preview */}
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {emails.slice(0, 10).map((email) => (
                  <div
                    key={email.emailId}
                    className={cn(
                      "p-3 rounded-xl border",
                      email.parsed.success
                        ? "bg-dark-800 border-dark-700"
                        : "bg-dark-800/50 border-dark-700/50 opacity-60"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-white font-medium truncate">
                        {email.parsed.transaction?.merchant || email.subject}
                      </p>
                      {email.parsed.success ? (
                        <Badge variant="success" className="text-xs">
                          ✓
                        </Badge>
                      ) : (
                        <Badge variant="warning" className="text-xs">
                          ?
                        </Badge>
                      )}
                    </div>
                    {email.parsed.transaction && (
                      <p className="text-xs text-dark-400 mt-1">
                        {email.parsed.transaction.currency}{" "}
                        {email.parsed.transaction.amount.toLocaleString()}
                      </p>
                    )}
                  </div>
                ))}
                {emails.length > 10 && (
                  <p className="text-center text-dark-400 text-sm">
                    y {emails.length - 10} más...
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Step: Importing */}
          {step === "importing" && (
            <div className="py-8">
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-dark-400">Procesando...</span>
                  <span className="text-white">
                    {progress.current} / {progress.total}
                  </span>
                </div>
                <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary-500 transition-all duration-300"
                    style={{
                      width: `${(progress.current / progress.total) * 100}%`,
                    }}
                  />
                </div>
              </div>
              {progress.currentMerchant && (
                <p className="text-center text-dark-400 text-sm">
                  {progress.currentMerchant}...
                </p>
              )}
            </div>
          )}

          {/* Step: Done */}
          {step === "done" && (
            <div className="py-8 text-center">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">
                ¡Importación Completa!
              </h3>
              <div className="flex justify-center gap-4 mt-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-400">
                    {results.imported}
                  </p>
                  <p className="text-xs text-dark-400">Importadas</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-yellow-400">
                    {results.skipped}
                  </p>
                  <p className="text-xs text-dark-400">Ya existían</p>
                </div>
                {results.failed > 0 && (
                  <div className="text-center">
                    <p className="text-2xl font-bold text-red-400">
                      {results.failed}
                    </p>
                    <p className="text-xs text-dark-400">Fallaron</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-dark-700 flex justify-end gap-3">
          {step === "config" && (
            <>
              <Button variant="ghost" onClick={onClose}>
                Cancelar
              </Button>
              <Button onClick={handleSearch} disabled={selectedSenders.length === 0}>
                <Mail className="w-4 h-4 mr-2" />
                Buscar Emails
              </Button>
            </>
          )}

          {step === "preview" && (
            <>
              <Button variant="ghost" onClick={() => setStep("config")}>
                Atrás
              </Button>
              <Button
                onClick={handleImport}
                disabled={emails.filter((e) => e.parsed.success).length === 0}
              >
                <Download className="w-4 h-4 mr-2" />
                Importar {emails.filter((e) => e.parsed.success).length} transacciones
              </Button>
            </>
          )}

          {step === "done" && (
            <Button onClick={onClose}>
              Cerrar
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}


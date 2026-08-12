"use client";

import { cn } from "@/lib/utils";

const CURRENCY_LABELS: Record<string, string> = {
  CRC: "₡ Colones",
  USD: "$ Dólares",
};

interface CurrencyToggleProps {
  /** Currencies available to choose from (e.g. ["CRC", "USD"]). */
  currencies: string[];
  value: string;
  onChange: (currency: string) => void;
  className?: string;
}

/**
 * Segmented control to switch the currency a page's amounts are shown in.
 * Renders nothing when there is 0 or 1 currency to choose from.
 */
export function CurrencyToggle({
  currencies,
  value,
  onChange,
  className,
}: CurrencyToggleProps) {
  if (currencies.length <= 1) return null;

  return (
    <div
      className={cn(
        "inline-flex rounded-xl bg-dark-800 border border-dark-700 p-1",
        className
      )}
    >
      {currencies.map((currency) => (
        <button
          key={currency}
          onClick={() => onChange(currency)}
          className={cn(
            "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
            value === currency
              ? "bg-primary-500 text-white"
              : "text-dark-300 hover:text-white"
          )}
        >
          {CURRENCY_LABELS[currency] || currency}
        </button>
      ))}
    </div>
  );
}

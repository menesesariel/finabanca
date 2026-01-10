"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatCurrency } from "@/lib/utils";

interface MonthlyChartProps {
  data: Record<string, number>;
  currency?: string;
}

export function MonthlyChart({ data, currency = "CRC" }: MonthlyChartProps) {
  const chartData = Object.entries(data)
    .map(([month, total]) => {
      const [year, monthNum] = month.split("-");
      const date = new Date(parseInt(year), parseInt(monthNum) - 1);
      const monthName = date.toLocaleDateString("es-CR", { month: "short" });
      
      return {
        month: `${monthName} ${year.slice(2)}`,
        rawMonth: month,
        total,
      };
    })
    .sort((a, b) => a.rawMonth.localeCompare(b.rawMonth))
    .slice(-12); // Last 12 months

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-dark-400">
        No hay datos para mostrar
      </div>
    );
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#262626"
            vertical={false}
          />
          <XAxis
            dataKey="month"
            stroke="#737373"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="#737373"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => 
              value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value
            }
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="glass rounded-lg px-3 py-2 shadow-xl">
                    <p className="text-white font-medium">{label}</p>
                    <p className="text-primary-400">
                      {formatCurrency(payload[0].value as number, currency)}
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Area
            type="monotone"
            dataKey="total"
            stroke="#22c55e"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorTotal)"
            animationDuration={1000}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}


"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";
import { formatCurrency } from "@/lib/utils";

interface DailyChartProps {
  data: { day: number; amount: number; date: string }[];
  currency?: string;
  averageDaily?: number;
  onDayClick?: (date: string, day: number) => void;
}

export function DailyChart({ data, currency = "CRC", averageDaily, onDayClick }: DailyChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-dark-400">
        No hay datos para mostrar
      </div>
    );
  }

  const maxAmount = Math.max(...data.map((d) => d.amount));

  const handleBarClick = (data: any) => {
    if (data && data.activePayload && data.activePayload.length > 0) {
      const clickedData = data.activePayload[0].payload;
      if (clickedData.amount > 0 && onDayClick) {
        onDayClick(clickedData.date, clickedData.day);
      }
    }
  };

  return (
    <div className="flex flex-col">
      {/* Fixed-height chart area so the caption below never overlaps it */}
      <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          onClick={handleBarClick}
          style={{ cursor: "pointer" }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#262626"
            vertical={false}
          />
          <XAxis
            dataKey="day"
            stroke="#737373"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            interval={1}
          />
          <YAxis
            stroke="#737373"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) =>
              value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value
            }
          />
          {averageDaily && averageDaily > 0 && (
            <ReferenceLine
              y={averageDaily}
              stroke="#22c55e"
              strokeDasharray="5 5"
              strokeWidth={2}
              label={{
                value: "Promedio",
                position: "right",
                fill: "#22c55e",
                fontSize: 10,
              }}
            />
          )}
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                return (
                  <div className="glass rounded-lg px-3 py-2 shadow-xl">
                    <p className="text-white font-medium">
                      Día {data.day}
                    </p>
                    <p className="text-primary-400">
                      {formatCurrency(data.amount, currency)}
                    </p>
                    {data.amount > 0 && (
                      <p className="text-dark-400 text-xs mt-1">
                        Click para ver transacciones
                      </p>
                    )}
                  </div>
                );
              }
              return null;
            }}
          />
          <Bar
            dataKey="amount"
            radius={[4, 4, 0, 0]}
            animationDuration={800}
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.amount > 0 ? (entry.amount === maxAmount ? "#22c55e" : "#3b82f6") : "#1e293b"}
                style={{ cursor: entry.amount > 0 ? "pointer" : "default" }}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      </div>
      <p className="text-center text-dark-500 text-xs mt-2">
        Haz clic en una barra para ver las transacciones de ese día
      </p>
    </div>
  );
}


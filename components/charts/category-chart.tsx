"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { CategoryId } from "@/lib/types";
import { CATEGORIES } from "@/lib/categories";
import { formatCurrency } from "@/lib/utils";

interface CategoryChartProps {
  data: Record<CategoryId, number>;
  currency?: string;
}

export function CategoryChart({ data, currency = "CRC" }: CategoryChartProps) {
  const chartData = Object.entries(data)
    .filter(([, value]) => value > 0)
    .map(([categoryId, value]) => {
      const category = CATEGORIES[categoryId as CategoryId];
      return {
        name: category?.name || categoryId,
        value,
        color: category?.color || "#6b7280",
        icon: category?.icon || "📦",
      };
    })
    .sort((a, b) => b.value - a.value);

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-dark-400">
        No hay datos para mostrar
      </div>
    );
  }

  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="flex flex-col">
      {/* Fixed-height chart area so the legend below never overlaps it */}
      <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            dataKey="value"
            animationBegin={0}
            animationDuration={800}
          >
            {chartData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.color}
                stroke="transparent"
              />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                const percentage = ((data.value / total) * 100).toFixed(1);
                return (
                  <div className="glass rounded-lg px-3 py-2 shadow-xl">
                    <p className="text-white font-medium">
                      {data.icon} {data.name}
                    </p>
                    <p className="text-dark-300 text-sm">
                      {formatCurrency(data.value, currency)}
                    </p>
                    <p className="text-dark-400 text-xs">{percentage}%</p>
                  </div>
                );
              }
              return null;
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        {chartData.slice(0, 8).map((item) => (
          <div key={item.name} className="flex items-center gap-2 text-sm">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-dark-300 truncate">{item.icon} {item.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}


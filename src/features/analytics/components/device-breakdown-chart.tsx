"use client";

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import type { BreakdownItem } from "../types/analytics.types";
import { Smartphone } from "lucide-react";

interface DeviceBreakdownChartProps {
  devices: BreakdownItem[];
}

const DEVICE_COLORS: Record<string, string> = {
  mobile: "#2563eb",
  desktop: "#38bdf8",
  tablet: "#818cf8",
  unknown: "#94a3b8",
};

const DEFAULT_PALETTE = ["#2563eb", "#38bdf8", "#818cf8", "#c084fc", "#94a3b8"];

export function DeviceBreakdownChart({ devices }: DeviceBreakdownChartProps) {
  const hasData = devices.length > 0 && devices.some((d) => d.count > 0);

  const chartData = devices.map((d, index) => ({
    name: d.name,
    value: d.count,
    percentage: d.percentage,
    color: DEVICE_COLORS[d.name.toLowerCase()] || DEFAULT_PALETTE[index % DEFAULT_PALETTE.length],
  }));

  return (
    <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
          <Smartphone className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Device Form Factor</h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Hardware category breakdown of scanning visitors
          </p>
        </div>
      </div>

      {!hasData ? (
        <div className="flex h-56 flex-col items-center justify-center text-center">
          <p className="text-xs text-slate-400">No device data available</p>
        </div>
      ) : (
        <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-6">
          {/* Donut Chart */}
          <div className="h-48 w-48 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {chartData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => [
                    `${Number(value || 0).toLocaleString()} scans`,
                    "Volume",
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend Table */}
          <div className="w-full space-y-2.5">
            {chartData.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="font-semibold text-slate-800 capitalize dark:text-slate-200">
                    {item.name}
                  </span>
                </div>
                <div className="flex items-center gap-2 font-mono">
                  <span className="text-slate-500 dark:text-slate-400">
                    {item.value.toLocaleString()}
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white w-9 text-right">
                    {item.percentage}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

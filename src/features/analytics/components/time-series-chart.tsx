"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import type { TimeSeriesPoint } from "../types/analytics.types";
import { Activity } from "lucide-react";

interface TimeSeriesChartProps {
  data: TimeSeriesPoint[];
  title?: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color: string }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white/95 p-3.5 shadow-xl backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95">
        <p className="text-xs font-bold text-slate-900 dark:text-white mb-2">{label}</p>
        <div className="space-y-1.5">
          {payload.map((entry) => (
            <div key={entry.name} className="flex items-center justify-between gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
                {entry.name === "scans" ? "Total Scans" : "Unique Visitors"}
              </span>
              <span className="font-bold text-slate-900 dark:text-white font-mono">
                {entry.value.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
}

export function TimeSeriesChart({
  data,
  title = "Scan Volume & Unique Visitors",
}: TimeSeriesChartProps) {
  const hasData = data.some((d) => d.scans > 0);

  return (
    <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 gap-2">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">{title}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Real-time telemetry showing total redirect volume vs. unique visitors
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs font-medium">
          <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
            <span>Total Scans</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            <span>Unique Visitors</span>
          </div>
        </div>
      </div>

      {!hasData ? (
        <div className="flex h-72 flex-col items-center justify-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800">
            <Activity className="h-6 w-6" />
          </div>
          <p className="mt-3 text-xs font-bold text-slate-900 dark:text-white">
            No scan data in this timeframe
          </p>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            Activity will automatically populate as visitors scan your QR code.
          </p>
        </div>
      ) : (
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorScans" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorUniques" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.15)" />

              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                stroke="#94a3b8"
                fontSize={11}
                dy={6}
              />

              <YAxis
                tickLine={false}
                axisLine={false}
                stroke="#94a3b8"
                fontSize={11}
                allowDecimals={false}
              />

              <Tooltip content={<CustomTooltip />} />

              <Area
                type="monotone"
                dataKey="scans"
                name="scans"
                stroke="#2563eb"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorScans)"
              />

              <Area
                type="monotone"
                dataKey="uniques"
                name="uniques"
                stroke="#10b981"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorUniques)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

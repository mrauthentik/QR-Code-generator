"use client";

import { useState } from "react";
import type { BreakdownItem } from "../types/analytics.types";
import { Monitor, Compass } from "lucide-react";

interface OsBrowserChartProps {
  os: BreakdownItem[];
  browsers: BreakdownItem[];
}

export function OsBrowserChart({ os, browsers }: OsBrowserChartProps) {
  const [activeTab, setActiveTab] = useState<"os" | "browser">("os");
  const items = activeTab === "os" ? os : browsers;
  const hasData = items.length > 0 && items.some((i) => i.count > 0);

  return (
    <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
            {activeTab === "os" ? (
              <Monitor className="h-4 w-4" />
            ) : (
              <Compass className="h-4 w-4" />
            )}
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Client Environment
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Operating system and browser distributions
            </p>
          </div>
        </div>

        {/* Tab switch */}
        <div className="flex items-center rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab("os")}
            className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
              activeTab === "os"
                ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            OS
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("browser")}
            className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
              activeTab === "browser"
                ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            Browser
          </button>
        </div>
      </div>

      {!hasData ? (
        <div className="flex h-56 flex-col items-center justify-center text-center">
          <p className="text-xs text-slate-400">No client data available in this timeframe</p>
        </div>
      ) : (
        <div className="mt-4 space-y-3.5">
          {items.map((item) => (
            <div key={item.name} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-800 truncate dark:text-slate-200">
                  {item.name}
                </span>
                <div className="flex items-center gap-2 font-mono">
                  <span className="text-slate-500 dark:text-slate-400">
                    {item.count.toLocaleString()}
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white w-9 text-right">
                    {item.percentage}%
                  </span>
                </div>
              </div>

              {/* Bar */}
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className="h-full rounded-full bg-indigo-600 transition-all duration-500"
                  style={{ width: `${Math.max(item.percentage, 2)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

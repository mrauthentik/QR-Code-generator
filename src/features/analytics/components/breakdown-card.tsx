import { LucideIcon } from "lucide-react";
import type { BreakdownItem } from "../types/analytics.types";

interface BreakdownCardProps {
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  items: BreakdownItem[];
  emptyMessage?: string;
  totalLabel?: string;
}

export function BreakdownCard({
  title,
  subtitle,
  icon: Icon,
  items,
  emptyMessage = "No activity recorded yet",
  totalLabel = "Scans",
}: BreakdownCardProps) {
  return (
    <div className="flex flex-col justify-between rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div>
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">{title}</h3>
              {subtitle && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400">{subtitle}</p>
              )}
            </div>
          </div>
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Share
          </span>
        </div>

        {items.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center text-center">
            <p className="text-xs text-slate-400">{emptyMessage}</p>
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
                      {item.count.toLocaleString()} {totalLabel}
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white w-9 text-right">
                      {item.percentage}%
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className="h-full rounded-full bg-blue-600 transition-all duration-500"
                    style={{ width: `${Math.max(item.percentage, 2)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

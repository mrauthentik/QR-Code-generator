import { History, ArrowRight, ExternalLink } from "lucide-react";
import type { DestinationHistoryItem } from "../types/analytics.types";

interface DestinationHistoryCardProps {
  history: DestinationHistoryItem[];
  currentDestinationUrl?: string;
}

export function DestinationHistoryCard({
  history,
  currentDestinationUrl,
}: DestinationHistoryCardProps) {
  return (
    <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400">
          <History className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Destination Mutation Audit Trail
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Immutable log of destination URL modifications for this QR code
          </p>
        </div>
      </div>

      {history.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50/50 p-4 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-400">
          <p>
            No previous destination changes. This QR code is currently pointing to its original
            configured destination.
          </p>
          {currentDestinationUrl && (
            <p className="mt-2 truncate font-mono text-slate-800 dark:text-slate-200">
              {currentDestinationUrl}
            </p>
          )}
        </div>
      ) : (
        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100 dark:border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/75 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:bg-slate-950/50 dark:text-slate-400">
              <tr>
                <th className="py-2.5 px-3">Date & Time</th>
                <th className="py-2.5 px-3">Previous Target</th>
                <th className="py-2.5 px-3">New Target</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {history.map((item) => {
                const dateStr = new Date(item.changedAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                });
                const timeStr = new Date(item.changedAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                });

                return (
                  <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-2.5 px-3 whitespace-nowrap text-slate-500 dark:text-slate-400">
                      {dateStr} {timeStr}
                    </td>
                    <td className="py-2.5 px-3 max-w-[200px] truncate text-slate-600 line-through dark:text-slate-400">
                      {item.oldUrl}
                    </td>
                    <td className="py-2.5 px-3 max-w-[200px] truncate font-medium text-slate-900 dark:text-white">
                      <div className="flex items-center gap-1">
                        <ArrowRight className="h-3 w-3 text-emerald-500 shrink-0" />
                        <span className="truncate">{item.newUrl}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

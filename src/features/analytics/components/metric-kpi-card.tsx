import { LucideIcon } from "lucide-react";

interface MetricKpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: string;
  variant?: "default" | "blue" | "emerald" | "amber";
}

export function MetricKpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = "default",
}: MetricKpiCardProps) {
  const variantStyles = {
    default: "bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400",
    emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400",
    amber: "bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400",
  };

  return (
    <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {title}
        </span>
        <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${variantStyles[variant]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-4">
        <div className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          {typeof value === "number" ? value.toLocaleString() : value}
        </div>
        {subtitle && (
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {subtitle}
          </p>
        )}
        {trend && (
          <div className="mt-2 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
            {trend}
          </div>
        )}
      </div>
    </div>
  );
}

import { redirect } from "next/navigation";
import Link from "next/link";
import { AuthService } from "@/features/auth/services/auth.service";
import { UserMenu } from "@/features/auth/components/user-menu";
import { QrCode, BarChart3, Plus, ShieldCheck } from "lucide-react";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await AuthService.getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/80 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Left: Brand & Navigation */}
          <div className="flex items-center gap-8">
            <Link href="/qr-codes" className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/25">
                <QrCode className="h-5 w-5" />
              </div>
              <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                QR Pulse
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              <Link
                href="/qr-codes"
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <QrCode className="h-4 w-4 text-blue-600" />
                QR Codes
              </Link>
              <Link
                href="/analytics"
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                <BarChart3 className="h-4 w-4" />
                Scan Telemetry
              </Link>
            </nav>
          </div>

          {/* Right: Primary Create Action & User Profile */}
          <div className="flex items-center gap-3">
            <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-400">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              <span>Zero-Cookie Telemetry</span>
            </div>

            <Link
              href="/qr-codes/new"
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-md shadow-blue-500/20 transition hover:bg-blue-500"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Create QR</span>
            </Link>

            <UserMenu email={user.email} />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}

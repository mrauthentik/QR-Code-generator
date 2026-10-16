import Link from "next/link";
import { ArrowRight, QrCode, ShieldCheck, BarChart3, Zap } from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/70 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/70">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-500/20">
              <QrCode className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              QR Pulse
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
            >
              Sign In
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-500"
            >
              Get Started <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="relative overflow-hidden px-6 pt-24 pb-20 text-center">
          <div className="mx-auto max-w-4xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300">
              <Zap className="h-3.5 w-3.5" /> Next-Generation Dynamic QR Redirects
            </div>
            <h1 className="mt-6 text-5xl font-extrabold tracking-tight text-slate-900 sm:text-6xl dark:text-white">
              Print Once. Redirect Anywhere.{" "}
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Measure Every Scan.
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600 dark:text-slate-400">
              Update destination links on the fly without reprinting packaging or collateral.
              Sub-40ms redirect resolution with zero-cookie GDPR-compliant visitor analytics.
            </p>
            <div className="mt-10 flex items-center justify-center gap-4">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:bg-blue-500"
              >
                Create Dynamic QR Code <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/docs"
                className="rounded-xl border border-slate-300 bg-white px-6 py-3.5 text-base font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                View Architecture
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-16">
          <div className="grid gap-8 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-8 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
                <Zap className="h-6 w-6" />
              </div>
              <h2 className="mt-4 text-xl font-bold text-slate-900 dark:text-white">Sacred Redirect Path</h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                Sub-40ms redirect response times with Upstash Redis cache and asynchronous background telemetry logging.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-8 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h2 className="mt-4 text-xl font-bold text-slate-900 dark:text-white">Zero-Cookie Privacy</h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                No raw IP addresses stored. Daily-rotating HMAC visitor hashing provides accurate unique scan metrics without cross-day tracking.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-8 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                <BarChart3 className="h-6 w-6" />
              </div>
              <h2 className="mt-4 text-xl font-bold text-slate-900 dark:text-white">Deep Telemetry & Rollups</h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                Geographic location, OS, device type, browser, and referrer metrics accelerated by scheduled database rollup routines.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 py-8 text-center text-sm text-slate-500 dark:border-slate-800">
        &copy; {new Date().getFullYear()} QR Pulse Platform. Production-grade dynamic QR redirects.
      </footer>
    </div>
  );
}

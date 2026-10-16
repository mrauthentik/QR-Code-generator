"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@/server/db/browser";
import { User, LogOut, ChevronDown, Sparkles } from "lucide-react";

interface UserMenuProps {
  email: string | null;
}

export function UserMenu({ email }: UserMenuProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const supabase = createClientComponentClient();

  const handleSignOut = async () => {
    setLoggingOut(true);
    try {
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    } finally {
      setLoggingOut(false);
      setOpen(false);
    }
  };

  const initial = email ? email[0].toUpperCase() : "U";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2.5 rounded-2xl border border-slate-200/80 bg-white/80 p-1.5 pr-3 text-xs font-medium text-slate-700 shadow-sm backdrop-blur transition hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-200"
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-xs font-bold text-white shadow-sm">
          {initial}
        </div>
        <span className="hidden sm:inline-block max-w-[120px] truncate">{email || "Account"}</span>
        <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-30 w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-in fade-in zoom-in-95 duration-100">
          <div className="border-b border-slate-100 p-2 text-xs dark:border-slate-800">
            <p className="font-semibold text-slate-900 dark:text-white">Signed in as</p>
            <p className="truncate text-slate-500 dark:text-slate-400">{email || "User"}</p>
          </div>

          <div className="py-1">
            <div className="flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs text-slate-600 dark:text-slate-300">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              <span>Pro Plan • Unlimited Scans</span>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-1 dark:border-slate-800">
            <button
              type="button"
              disabled={loggingOut}
              onClick={handleSignOut}
              className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-xs font-semibold text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40 disabled:opacity-50"
            >
              <LogOut className="h-3.5 w-3.5" />
              {loggingOut ? "Signing out..." : "Sign Out"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

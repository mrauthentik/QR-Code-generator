import { AuthService } from "@/features/auth/services/auth.service";
import { QRForm } from "@/features/qr-codes/components/qr-form";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

export default async function NewQRCodePage() {
  await AuthService.requireUser();

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
        <Link href="/qr-codes" className="hover:text-slate-900 dark:hover:text-white">
          QR Codes
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-slate-900 font-semibold dark:text-white">Create New</span>
      </nav>

      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Create Dynamic QR Code
        </h1>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Point to any destination URL now and update it whenever needed without reprinting.
        </p>
      </div>

      {/* Unified QR Form in Create Mode */}
      <QRForm mode="create" />
    </div>
  );
}

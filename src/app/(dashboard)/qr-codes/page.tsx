import { AuthService } from "@/features/auth/services/auth.service";
import { createClient } from "@/server/db/client";
import { QRCodesRepository } from "@/server/repositories/qr-codes.repo";
import { QRCodeService } from "@/features/qr-codes/services/qr-code.service";
import { QRListView } from "@/features/qr-codes/components/qr-list-view";
import type { QRStatus } from "@/server/db/types.generated";
import Link from "next/link";
import { Plus, QrCode } from "lucide-react";

interface QRCodesPageProps {
  searchParams: Promise<{
    page?: string;
    status?: string;
    search?: string;
  }>;
}

export default async function QRCodesPage({ searchParams }: QRCodesPageProps) {
  const user = await AuthService.requireUser();
  const params = await searchParams;

  const page = parseInt(params.page || "1", 10) || 1;
  const limit = 12;
  const search = params.search || "";
  const rawStatus = params.status;

  const status: QRStatus | undefined =
    rawStatus === "active" || rawStatus === "paused" || rawStatus === "archived"
      ? rawStatus
      : undefined;

  const db = await createClient();
  const repo = new QRCodesRepository(db);
  const service = new QRCodeService(repo);

  const { data, total } = await service.listQRCodes(user.id, {
    page,
    limit,
    status,
    search: search || undefined,
  });

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Dynamic QR Codes
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Enterprise QR codes with sub-40ms redirects, full styling control, and zero-cookie telemetry.
          </p>
        </div>

        <Link
          href="/qr-codes/new"
          className="inline-flex items-center gap-2 self-start sm:self-auto rounded-2xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:bg-blue-500"
        >
          <Plus className="h-4 w-4" /> Create QR Code
        </Link>
      </div>

      {/* QR List View with Search & Status Filters */}
      <QRListView
        initialCodes={data}
        total={total}
        page={page}
        limit={limit}
        currentStatus={rawStatus || "all"}
        currentSearch={search}
      />
    </div>
  );
}

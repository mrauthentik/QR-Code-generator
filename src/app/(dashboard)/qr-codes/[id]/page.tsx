import { AuthService } from "@/features/auth/services/auth.service";
import { createClient } from "@/server/db/client";
import { QRCodesRepository } from "@/server/repositories/qr-codes.repo";
import { ScansRepository } from "@/server/repositories/scans.repo";
import { QRCodeService } from "@/features/qr-codes/services/qr-code.service";
import { QRDetailView } from "@/features/qr-codes/components/qr-detail-view";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

interface QRCodeDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function QRCodeDetailPage({ params }: QRCodeDetailPageProps) {
  const user = await AuthService.requireUser();
  const { id } = await params;

  const db = await createClient();
  const qrRepo = new QRCodesRepository(db);
  const scansRepo = new ScansRepository(db);
  const qrService = new QRCodeService(qrRepo);

  let qrCode;
  try {
    qrCode = await qrService.getQRCode(id, user.id);
  } catch {
    notFound();
  }

  // Fetch telemetry overview
  const totalScans = await scansRepo.getTotalScansCount(qrCode.id);
  const recentRawScans = await scansRepo.getRecentScans(qrCode.id, 10);

  const formattedScans = recentRawScans.map((s) => ({
    id: s.id,
    scanned_at: s.scanned_at,
    country: s.country,
    device_type: s.device_type,
    browser: s.browser,
    os: s.os,
  }));

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
        <Link href="/qr-codes" className="hover:text-slate-900 dark:hover:text-white">
          QR Codes
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="max-w-[200px] truncate text-slate-900 font-semibold dark:text-white">
          {qrCode.name}
        </span>
      </nav>

      {/* Main Detail View */}
      <QRDetailView
        qrCode={qrCode}
        totalScans={totalScans}
        recentScans={formattedScans}
      />
    </div>
  );
}

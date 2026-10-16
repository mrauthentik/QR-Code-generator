import { AuthService } from "@/features/auth/services/auth.service";
import { createClient } from "@/server/db/client";
import { QRCodesRepository } from "@/server/repositories/qr-codes.repo";
import { QRCodeService } from "@/features/qr-codes/services/qr-code.service";
import { QRForm } from "@/features/qr-codes/components/qr-form";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

interface EditQRCodePageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditQRCodePage({ params }: EditQRCodePageProps) {
  const user = await AuthService.requireUser();
  const { id } = await params;

  const db = await createClient();
  const repo = new QRCodesRepository(db);
  const service = new QRCodeService(repo);

  let qrCode;
  try {
    qrCode = await service.getQRCode(id, user.id);
  } catch {
    notFound();
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
        <Link href="/qr-codes" className="hover:text-slate-900 dark:hover:text-white">
          QR Codes
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link
          href={`/qr-codes/${qrCode.id}`}
          className="max-w-[200px] truncate hover:text-slate-900 dark:hover:text-white"
        >
          {qrCode.name}
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-slate-900 font-semibold dark:text-white">Edit</span>
      </nav>

      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Edit QR Code
        </h1>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Update the destination URL, change status, or customize styling. Printed codes remain valid.
        </p>
      </div>

      {/* Unified QR Form in Edit Mode */}
      <QRForm mode="edit" initialData={qrCode} />
    </div>
  );
}

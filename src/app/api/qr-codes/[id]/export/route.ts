import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/features/auth/services/auth.service";
import { createClient } from "@/server/db/client";
import { QRCodesRepository } from "@/server/repositories/qr-codes.repo";
import { ScansRepository } from "@/server/repositories/scans.repo";
import { CSVExportService } from "@/features/analytics/services/csv-export.service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await AuthService.requireUser();
    const { id } = await params;

    const db = await createClient();
    const qrRepo = new QRCodesRepository(db);
    const scansRepo = new ScansRepository(db);

    const qr = await qrRepo.findById(id, user.id);
    if (!qr) {
      return NextResponse.json({ error: "QR code not found" }, { status: 404 });
    }

    const scans = await scansRepo.getAllScansForExport(qr.id);
    const csvData = CSVExportService.generateScansCSV(scans);

    const filename = `${qr.slug}-telemetry-${new Date().toISOString().slice(0, 10)}.csv`;

    return new Response(csvData, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to export telemetry data";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

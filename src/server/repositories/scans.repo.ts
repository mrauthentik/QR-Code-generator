import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/server/db/types.generated";
import { DatabaseError } from "@/lib/errors";

export type ScanRow = Database["public"]["Tables"]["scans"]["Row"];
export type InsertScan = Database["public"]["Tables"]["scans"]["Insert"];

import type { SupabaseServerClient } from "@/server/db/client";
import type { SupabaseAdminClient } from "@/server/db/admin";

export class ScansRepository {
  constructor(private readonly db: SupabaseServerClient | SupabaseAdminClient) {}

  /**
   * Fast append-only insert for an individual scan event.
   * Invoked asynchronously inside Next.js after() with admin/service_role client.
   */
  async recordScan(payload: InsertScan): Promise<void> {
    const { error } = await this.db.from("scans").insert(payload);

    if (error) {
      throw new DatabaseError(`Failed to record scan for QR ${payload.qr_id}: ${error.message}`, error);
    }
  }

  /**
   * Retrieves recent raw scans for a specific QR code.
   */
  async getRecentScans(qrId: string, limit: number = 50): Promise<ScanRow[]> {
    const { data, error } = await this.db
      .from("scans")
      .select("*")
      .eq("qr_id", qrId)
      .order("scanned_at", { ascending: false })
      .limit(limit);

    if (error) {
      throw new DatabaseError(`Failed to fetch recent scans: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Returns total count of scans recorded for a QR code.
   */
  async getTotalScansCount(qrId: string): Promise<number> {
    const { count, error } = await this.db
      .from("scans")
      .select("*", { count: "exact", head: true })
      .eq("qr_id", qrId);

    if (error) {
      throw new DatabaseError(`Failed to count scans: ${error.message}`);
    }

    return count || 0;
  }

  /**
   * Retrieves raw scans for a specific QR code since a given timestamp.
   */
  async getScansSince(qrId: string, sinceIso: string): Promise<ScanRow[]> {
    const { data, error } = await this.db
      .from("scans")
      .select("*")
      .eq("qr_id", qrId)
      .gte("scanned_at", sinceIso)
      .order("scanned_at", { ascending: true });

    if (error) {
      throw new DatabaseError(`Failed to fetch scans since ${sinceIso}: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Retrieves all scans for CSV export or full aggregate analysis.
   */
  async getAllScansForExport(qrId: string, limit: number = 10000): Promise<ScanRow[]> {
    const { data, error } = await this.db
      .from("scans")
      .select("*")
      .eq("qr_id", qrId)
      .order("scanned_at", { ascending: false })
      .limit(limit);

    if (error) {
      throw new DatabaseError(`Failed to fetch scans for export: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Retrieves raw scans across multiple QR codes since a given timestamp.
   */
  async getScansForQRsSince(qrIds: string[], sinceIso: string): Promise<ScanRow[]> {
    if (qrIds.length === 0) return [];

    const { data, error } = await this.db
      .from("scans")
      .select("*")
      .in("qr_id", qrIds)
      .gte("scanned_at", sinceIso)
      .order("scanned_at", { ascending: true });

    if (error) {
      throw new DatabaseError(`Failed to fetch scans for QR array: ${error.message}`);
    }

    return data || [];
  }
}

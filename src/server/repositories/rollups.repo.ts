import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/server/db/types.generated";
import { DatabaseError } from "@/lib/errors";

export type DestinationHistoryRow = Database["public"]["Tables"]["qr_destination_history"]["Row"];
export type ScanDailyStatsRow = Database["public"]["Tables"]["scan_daily_stats"]["Row"];

import type { SupabaseServerClient } from "@/server/db/client";
import type { SupabaseAdminClient } from "@/server/db/admin";

export class RollupsRepository {
  constructor(private readonly db: SupabaseServerClient | SupabaseAdminClient) {}

  /**
   * Retrieves audit trail of destination changes for a QR code.
   */
  async getDestinationHistory(qrId: string): Promise<DestinationHistoryRow[]> {
    const { data, error } = await this.db
      .from("qr_destination_history")
      .select("*")
      .eq("qr_id", qrId)
      .order("changed_at", { ascending: false });

    if (error) {
      throw new DatabaseError(`Failed to fetch destination history: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Retrieves aggregated daily stats for a QR code within a date range.
   */
  async getDailyStats(
    qrId: string,
    startDate: string,
    endDate: string
  ): Promise<ScanDailyStatsRow[]> {
    const { data, error } = await this.db
      .from("scan_daily_stats")
      .select("*")
      .eq("qr_id", qrId)
      .gte("day", startDate)
      .lte("day", endDate)
      .order("day", { ascending: true });

    if (error) {
      throw new DatabaseError(`Failed to fetch daily stats: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Retrieves aggregated daily stats for multiple QR codes within a date range.
   */
  async getDailyStatsForQRs(
    qrIds: string[],
    startDate: string,
    endDate: string
  ): Promise<ScanDailyStatsRow[]> {
    if (qrIds.length === 0) return [];

    const { data, error } = await this.db
      .from("scan_daily_stats")
      .select("*")
      .in("qr_id", qrIds)
      .gte("day", startDate)
      .lte("day", endDate)
      .order("day", { ascending: true });

    if (error) {
      throw new DatabaseError(`Failed to fetch daily stats for multiple QRs: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Triggers the database stored procedure to compute and upsert daily aggregates for a given date.
   */
  async executeDailyRollup(targetDate: string): Promise<number> {
    const { data, error } = await this.db.rpc("rollup_scans_for_date", {
      p_target_date: targetDate,
    });

    if (error) {
      throw new DatabaseError(`Rollup execution failed for date ${targetDate}: ${error.message}`);
    }

    return data ?? 0;
  }
}

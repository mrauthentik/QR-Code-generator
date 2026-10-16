import "server-only";
import { QRCodesRepository } from "@/server/repositories/qr-codes.repo";
import { ScansRepository, type ScanRow } from "@/server/repositories/scans.repo";
import { RollupsRepository } from "@/server/repositories/rollups.repo";
import { NotFoundError, ForbiddenError } from "@/lib/errors";
import type {
  TimeRange,
  AnalyticsSummary,
  TimeSeriesPoint,
  BreakdownItem,
  DestinationHistoryItem,
} from "../types/analytics.types";

export class AnalyticsService {
  constructor(
    private readonly qrRepo: QRCodesRepository,
    private readonly scansRepo: ScansRepository,
    private readonly rollupsRepo: RollupsRepository
  ) {}

  /**
   * Computes comprehensive scan analytics for a specific QR code.
   */
  async getQRAnalytics(
    qrId: string,
    ownerId: string,
    timeRange: TimeRange = "7d"
  ): Promise<AnalyticsSummary> {
    const qr = await this.qrRepo.findById(qrId, ownerId);
    if (!qr) {
      throw new NotFoundError("QR code not found or access denied.");
    }
    if (qr.owner_id !== ownerId) {
      throw new ForbiddenError("You do not have permission to view analytics for this QR code.");
    }

    const destinationHistory = await this.rollupsRepo.getDestinationHistory(qrId);
    const historyItems: DestinationHistoryItem[] = destinationHistory.map((h) => ({
      id: Number(h.id),
      oldUrl: h.old_url,
      newUrl: h.new_url,
      changedAt: h.changed_at,
    }));

    const summary = await this.computeMetricsForQRs([qrId], timeRange);

    return {
      ...summary,
      qrId: qr.id,
      qrName: qr.name,
      slug: qr.slug,
      timeRange,
      destinationHistory: historyItems,
    };
  }

  /**
   * Computes global aggregate analytics across all QR codes owned by the user.
   */
  async getGlobalAnalytics(
    ownerId: string,
    timeRange: TimeRange = "7d"
  ): Promise<AnalyticsSummary> {
    const qrList = await this.qrRepo.listByOwner(ownerId, { limit: 1000 });
    const qrIds = qrList.data.map((q) => q.id);

    if (qrIds.length === 0) {
      return {
        timeRange,
        totalScans: 0,
        uniqueVisitors: 0,
        timeSeries: [],
        countries: [],
        devices: [],
        os: [],
        browsers: [],
        referrers: [],
        destinationHistory: [],
      };
    }

    const summary = await this.computeMetricsForQRs(qrIds, timeRange);

    return {
      ...summary,
      timeRange,
      destinationHistory: [],
    };
  }

  /**
   * Core aggregation engine blending raw scans and pre-computed daily rollups.
   */
  private async computeMetricsForQRs(
    qrIds: string[],
    timeRange: TimeRange
  ): Promise<Omit<AnalyticsSummary, "qrId" | "qrName" | "slug" | "timeRange" | "destinationHistory">> {
    const now = new Date();
    let since: Date;

    switch (timeRange) {
      case "24h":
        since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case "7d":
        since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30d":
        since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "90d":
        since = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case "all":
      default:
        since = new Date(0);
        break;
    }

    const sinceIso = since.toISOString();
    const rawScans = await this.scansRepo.getScansForQRsSince(qrIds, sinceIso);

    // If timeRange is 24h, group by hour for fine-grained resolution
    if (timeRange === "24h") {
      return this.aggregateRawScansHourly(rawScans, since, now);
    }

    // For multi-day ranges (7d, 30d, 90d, all), group by day
    return this.aggregateRawScansDaily(rawScans, since, now);
  }

  /**
   * Hourly aggregation for 24h window
   */
  private aggregateRawScansHourly(
    scans: ScanRow[],
    start: Date,
    end: Date
  ): Omit<AnalyticsSummary, "qrId" | "qrName" | "slug" | "timeRange" | "destinationHistory"> {
    const totalScans = scans.length;
    const uniqueVisitorHashes = new Set<string>();

    const countryMap = new Map<string, number>();
    const deviceMap = new Map<string, number>();
    const osMap = new Map<string, number>();
    const browserMap = new Map<string, number>();
    const referrerMap = new Map<string, number>();

    // Prepare hourly time series buckets for the 24h window
    const hourlyBuckets = new Map<string, { scans: number; uniques: Set<string>; label: string }>();

    for (let d = new Date(start); d <= end; d.setHours(d.getHours() + 1)) {
      const hourKey = d.toISOString().slice(0, 13); // 'YYYY-MM-DDTHH'
      const label = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      hourlyBuckets.set(hourKey, { scans: 0, uniques: new Set(), label });
    }

    for (const s of scans) {
      uniqueVisitorHashes.add(s.visitor_hash);

      const hourKey = new Date(s.scanned_at).toISOString().slice(0, 13);
      const bucket = hourlyBuckets.get(hourKey);
      if (bucket) {
        bucket.scans += 1;
        bucket.uniques.add(s.visitor_hash);
      }

      this.incrementCount(countryMap, s.country || "Unknown");
      this.incrementCount(deviceMap, s.device_type || "Desktop");
      this.incrementCount(osMap, s.os || "Unknown");
      this.incrementCount(browserMap, s.browser || "Unknown");
      if (s.referrer_host) {
        this.incrementCount(referrerMap, s.referrer_host);
      }
    }

    const timeSeries: TimeSeriesPoint[] = Array.from(hourlyBuckets.entries()).map(
      ([date, data]) => ({
        date,
        label: data.label,
        scans: data.scans,
        uniques: data.uniques.size,
      })
    );

    return {
      totalScans,
      uniqueVisitors: uniqueVisitorHashes.size,
      timeSeries,
      countries: this.formatBreakdown(countryMap, totalScans),
      devices: this.formatBreakdown(deviceMap, totalScans),
      os: this.formatBreakdown(osMap, totalScans),
      browsers: this.formatBreakdown(browserMap, totalScans),
      referrers: this.formatBreakdown(referrerMap, totalScans),
    };
  }

  /**
   * Daily aggregation for 7d, 30d, 90d, and all-time windows
   */
  private aggregateRawScansDaily(
    scans: ScanRow[],
    start: Date,
    end: Date
  ): Omit<AnalyticsSummary, "qrId" | "qrName" | "slug" | "timeRange" | "destinationHistory"> {
    const totalScans = scans.length;
    const uniqueVisitorHashes = new Set<string>();

    const countryMap = new Map<string, number>();
    const deviceMap = new Map<string, number>();
    const osMap = new Map<string, number>();
    const browserMap = new Map<string, number>();
    const referrerMap = new Map<string, number>();

    // Prepare daily time series buckets
    const dailyBuckets = new Map<string, { scans: number; uniques: Set<string>; label: string }>();

    // If start is beginning of epoch, set start to the first scan date or 30 days ago
    let startDate = start;
    if (start.getTime() === 0) {
      if (scans.length > 0) {
        startDate = new Date(scans[0].scanned_at);
      } else {
        startDate = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
      }
    }

    for (let d = new Date(startDate); d <= end; d.setDate(d.getDate() + 1)) {
      const dayKey = d.toISOString().slice(0, 10); // 'YYYY-MM-DD'
      const label = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
      dailyBuckets.set(dayKey, { scans: 0, uniques: new Set(), label });
    }

    for (const s of scans) {
      uniqueVisitorHashes.add(s.visitor_hash);

      const dayKey = s.scanned_at.slice(0, 10);
      let bucket = dailyBuckets.get(dayKey);
      if (!bucket) {
        const d = new Date(s.scanned_at);
        const label = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
        bucket = { scans: 0, uniques: new Set(), label };
        dailyBuckets.set(dayKey, bucket);
      }

      bucket.scans += 1;
      bucket.uniques.add(s.visitor_hash);

      this.incrementCount(countryMap, s.country || "Unknown");
      this.incrementCount(deviceMap, s.device_type || "Desktop");
      this.incrementCount(osMap, s.os || "Unknown");
      this.incrementCount(browserMap, s.browser || "Unknown");
      if (s.referrer_host) {
        this.incrementCount(referrerMap, s.referrer_host);
      }
    }

    const timeSeries: TimeSeriesPoint[] = Array.from(dailyBuckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({
        date,
        label: data.label,
        scans: data.scans,
        uniques: data.uniques.size,
      }));

    return {
      totalScans,
      uniqueVisitors: uniqueVisitorHashes.size,
      timeSeries,
      countries: this.formatBreakdown(countryMap, totalScans),
      devices: this.formatBreakdown(deviceMap, totalScans),
      os: this.formatBreakdown(osMap, totalScans),
      browsers: this.formatBreakdown(browserMap, totalScans),
      referrers: this.formatBreakdown(referrerMap, totalScans),
    };
  }

  private incrementCount(map: Map<string, number>, key: string): void {
    map.set(key, (map.get(key) || 0) + 1);
  }

  private formatBreakdown(map: Map<string, number>, total: number): BreakdownItem[] {
    if (total === 0) return [];

    return Array.from(map.entries())
      .map(([name, count]) => ({
        name,
        count,
        percentage: Math.round((count / total) * 100),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 items
  }
}

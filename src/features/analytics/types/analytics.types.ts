export type TimeRange = "24h" | "7d" | "30d" | "90d" | "all";

export interface TimeSeriesPoint {
  date: string;
  label: string;
  scans: number;
  uniques: number;
}

export interface BreakdownItem {
  name: string;
  code?: string;
  count: number;
  percentage: number;
}

export interface DestinationHistoryItem {
  id: number;
  oldUrl: string;
  newUrl: string;
  changedAt: string;
}

export interface AnalyticsSummary {
  qrId?: string;
  qrName?: string;
  slug?: string;
  timeRange: TimeRange;
  totalScans: number;
  uniqueVisitors: number;
  timeSeries: TimeSeriesPoint[];
  countries: BreakdownItem[];
  devices: BreakdownItem[];
  os: BreakdownItem[];
  browsers: BreakdownItem[];
  referrers: BreakdownItem[];
  destinationHistory: DestinationHistoryItem[];
}

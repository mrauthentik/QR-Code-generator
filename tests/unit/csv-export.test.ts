import { describe, it, expect } from "vitest";
import { CSVExportService } from "@/features/analytics/services/csv-export.service";
import type { ScanRow } from "@/server/repositories/scans.repo";

describe("CSVExportService", () => {
  it("should generate CSV with correct RFC 4180 headers", () => {
    const csv = CSVExportService.generateScansCSV([]);
    const lines = csv.split("\r\n");

    expect(lines).toHaveLength(1);
    expect(lines[0]).toBe(
      "Scan Timestamp (UTC),Country,Region,City,Device Type,Operating System,Browser,Referrer Host,Unique In Day"
    );
  });

  it("should escape commas and quotes properly", () => {
    const mockScans: ScanRow[] = [
      {
        id: 1,
        qr_id: "qr-1",
        scanned_at: "2026-10-15T10:00:00Z",
        country: "US",
        region: "CA",
        city: "San Francisco, CA",
        device_type: "mobile",
        os: 'iOS "17.0"',
        browser: "Mobile Safari",
        referrer_host: "google.com",
        visitor_hash: "hash123",
        is_unique_in_day: true,
      },
    ];

    const csv = CSVExportService.generateScansCSV(mockScans);
    const lines = csv.split("\r\n");

    expect(lines).toHaveLength(2);
    // City has comma so must be quoted: "San Francisco, CA"
    expect(lines[1]).toContain('"San Francisco, CA"');
    // OS has quotes so must be double-quoted: "iOS ""17.0"""
    expect(lines[1]).toContain('"iOS ""17.0"""');
    expect(lines[1]).toContain("Yes");
  });

  it("should neutralize formula injection attacks starting with =, +, -, @, or tab", () => {
    const maliciousScans: ScanRow[] = [
      {
        id: 2,
        qr_id: "qr-1",
        scanned_at: "2026-10-15T10:05:00Z",
        country: "=cmd|' /C calc'!A0",
        region: "+12345",
        city: "@SUM(1+1)",
        device_type: "-minus",
        os: "Linux",
        browser: "Firefox",
        referrer_host: "evil.com",
        visitor_hash: "hash456",
        is_unique_in_day: false,
      },
    ];

    const csv = CSVExportService.generateScansCSV(maliciousScans);
    const lines = csv.split("\r\n");

    // All fields starting with =, +, -, @ must be prepended with a single quote '
    expect(lines[1]).toContain("'=cmd|' /C calc'!A0");
    expect(lines[1]).toContain("'+12345");
    expect(lines[1]).toContain("'@SUM(1+1)");
    expect(lines[1]).toContain("'-minus");
    expect(lines[1]).toContain("No");
  });
});

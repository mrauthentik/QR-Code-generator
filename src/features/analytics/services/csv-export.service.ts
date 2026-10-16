import type { ScanRow } from "@/server/repositories/scans.repo";

function escapeCSVField(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) {
    return "";
  }

  let str = String(value);

  // Formula injection defense: prepend single quote if value begins with executable characters
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }

  // If contains double quotes, commas, or line breaks, enclose in double quotes
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

export class CSVExportService {
  /**
   * Transforms raw scan records into an RFC 4180 compliant CSV string.
   */
  static generateScansCSV(scans: ScanRow[]): string {
    const headers = [
      "Scan Timestamp (UTC)",
      "Country",
      "Region",
      "City",
      "Device Type",
      "Operating System",
      "Browser",
      "Referrer Host",
      "Unique In Day",
    ];

    const rows: string[] = [headers.join(",")];

    for (const scan of scans) {
      const row = [
        escapeCSVField(scan.scanned_at),
        escapeCSVField(scan.country),
        escapeCSVField(scan.region),
        escapeCSVField(scan.city),
        escapeCSVField(scan.device_type),
        escapeCSVField(scan.os),
        escapeCSVField(scan.browser),
        escapeCSVField(scan.referrer_host),
        escapeCSVField(scan.is_unique_in_day ? "Yes" : "No"),
      ];
      rows.push(row.join(","));
    }

    return rows.join("\r\n");
  }
}

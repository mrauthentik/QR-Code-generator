-- Migration: 20261009000002_create_scans.sql
-- Description: Create scans table for high-throughput append-only scan logging

CREATE TABLE IF NOT EXISTS scans (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    qr_id UUID NOT NULL REFERENCES qr_codes(id) ON DELETE CASCADE,
    scanned_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    country VARCHAR(2) NULL,
    region VARCHAR(100) NULL,
    city VARCHAR(100) NULL,
    device_type VARCHAR(30) NULL,
    os VARCHAR(50) NULL,
    browser VARCHAR(50) NULL,
    referrer_host VARCHAR(255) NULL,
    visitor_hash VARCHAR(64) NOT NULL,
    is_unique_in_day BOOLEAN DEFAULT FALSE
);

-- Optimized indexes for telemetry queries and unique visitor calculations
CREATE INDEX IF NOT EXISTS idx_scans_qr_time 
    ON scans (qr_id, scanned_at DESC);

CREATE INDEX IF NOT EXISTS idx_scans_visitor_day 
    ON scans (qr_id, visitor_hash, scanned_at);

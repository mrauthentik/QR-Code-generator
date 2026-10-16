-- Migration: 20261009000003_create_audit_and_rollups.sql
-- Description: Audit trail for destination changes and pre-aggregated daily rollup statistics

-- 1. Destination History Table
CREATE TABLE IF NOT EXISTS qr_destination_history (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    qr_id UUID NOT NULL REFERENCES qr_codes(id) ON DELETE CASCADE,
    old_url TEXT NOT NULL,
    new_url TEXT NOT NULL,
    changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_destination_history_qr 
    ON qr_destination_history (qr_id, changed_at DESC);

-- Trigger to automatically record destination URL mutations
CREATE OR REPLACE FUNCTION log_qr_destination_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.destination_url <> NEW.destination_url THEN
        INSERT INTO qr_destination_history (
            qr_id,
            old_url,
            new_url,
            changed_by,
            changed_at
        ) VALUES (
            NEW.id,
            OLD.destination_url,
            NEW.destination_url,
            auth.uid(),
            clock_timestamp()
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_qr_destination_change ON qr_codes;
CREATE TRIGGER trg_qr_destination_change
    AFTER UPDATE ON qr_codes
    FOR EACH ROW
    EXECUTE FUNCTION log_qr_destination_change();

-- 2. Scan Daily Stats Rollup Table
CREATE TABLE IF NOT EXISTS scan_daily_stats (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    qr_id UUID NOT NULL REFERENCES qr_codes(id) ON DELETE CASCADE,
    day DATE NOT NULL,
    total_scans INTEGER NOT NULL DEFAULT 0,
    unique_visitors INTEGER NOT NULL DEFAULT 0,
    country_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
    device_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
    os_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
    browser_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
    referrer_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),

    CONSTRAINT uq_scan_daily_stats_qr_day UNIQUE (qr_id, day)
);

CREATE INDEX IF NOT EXISTS idx_scan_daily_stats_qr_day 
    ON scan_daily_stats (qr_id, day DESC);

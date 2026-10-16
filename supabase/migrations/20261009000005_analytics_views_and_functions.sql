-- Migration: 20261009000005_analytics_views_and_functions.sql
-- Description: Analytics aggregation stored procedures and query acceleration functions

-- 1. Stored procedure to compute and upsert daily scan rollups for a target date
CREATE OR REPLACE FUNCTION rollup_scans_for_date(p_target_date DATE)
RETURNS INTEGER AS $$
DECLARE
    v_rows_processed INTEGER := 0;
BEGIN
    WITH daily_aggregates AS (
        SELECT
            qr_id,
            p_target_date AS day,
            COUNT(*)::INTEGER AS total_scans,
            COUNT(DISTINCT visitor_hash)::INTEGER AS unique_visitors,
            COALESCE(
                jsonb_object_agg(country, country_count) FILTER (WHERE country IS NOT NULL),
                '{}'::jsonb
            ) AS country_breakdown,
            COALESCE(
                jsonb_object_agg(device_type, device_count) FILTER (WHERE device_type IS NOT NULL),
                '{}'::jsonb
            ) AS device_breakdown,
            COALESCE(
                jsonb_object_agg(os, os_count) FILTER (WHERE os IS NOT NULL),
                '{}'::jsonb
            ) AS os_breakdown,
            COALESCE(
                jsonb_object_agg(browser, browser_count) FILTER (WHERE browser IS NOT NULL),
                '{}'::jsonb
            ) AS browser_breakdown,
            COALESCE(
                jsonb_object_agg(referrer_host, referrer_count) FILTER (WHERE referrer_host IS NOT NULL),
                '{}'::jsonb
            ) AS referrer_breakdown
        FROM (
            SELECT
                s.qr_id,
                s.country,
                s.device_type,
                s.os,
                s.browser,
                s.referrer_host,
                s.visitor_hash,
                COUNT(*) OVER (PARTITION BY s.qr_id, s.country) AS country_count,
                COUNT(*) OVER (PARTITION BY s.qr_id, s.device_type) AS device_count,
                COUNT(*) OVER (PARTITION BY s.qr_id, s.os) AS os_count,
                COUNT(*) OVER (PARTITION BY s.qr_id, s.browser) AS browser_count,
                COUNT(*) OVER (PARTITION BY s.qr_id, s.referrer_host) AS referrer_count
            FROM scans s
            WHERE s.scanned_at >= p_target_date::timestamptz
              AND s.scanned_at < (p_target_date + INTERVAL '1 day')::timestamptz
        ) sub
        GROUP BY qr_id
    )
    INSERT INTO scan_daily_stats (
        qr_id,
        day,
        total_scans,
        unique_visitors,
        country_breakdown,
        device_breakdown,
        os_breakdown,
        browser_breakdown,
        referrer_breakdown,
        updated_at
    )
    SELECT
        da.qr_id,
        da.day,
        da.total_scans,
        da.unique_visitors,
        da.country_breakdown,
        da.device_breakdown,
        da.os_breakdown,
        da.browser_breakdown,
        da.referrer_breakdown,
        clock_timestamp()
    FROM daily_aggregates da
    ON CONFLICT (qr_id, day) DO UPDATE
    SET
        total_scans = EXCLUDED.total_scans,
        unique_visitors = EXCLUDED.unique_visitors,
        country_breakdown = EXCLUDED.country_breakdown,
        device_breakdown = EXCLUDED.device_breakdown,
        os_breakdown = EXCLUDED.os_breakdown,
        browser_breakdown = EXCLUDED.browser_breakdown,
        referrer_breakdown = EXCLUDED.referrer_breakdown,
        updated_at = clock_timestamp();

    GET DIAGNOSTICS v_rows_processed = ROW_COUNT;
    RETURN v_rows_processed;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

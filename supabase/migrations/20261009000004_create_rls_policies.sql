-- Migration: 20261009000004_create_rls_policies.sql
-- Description: Enable Row Level Security (RLS) on all tables and configure tenant isolation policies

-- 1. Enable RLS on all tables
ALTER TABLE qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_destination_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_daily_stats ENABLE ROW LEVEL SECURITY;

-- 2. Policies for qr_codes
CREATE POLICY "Users can view their own non-deleted qr codes"
    ON qr_codes FOR SELECT
    TO authenticated
    USING (auth.uid() = owner_id AND deleted_at IS NULL);

CREATE POLICY "Users can insert their own qr codes"
    ON qr_codes FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own qr codes"
    ON qr_codes FOR UPDATE
    TO authenticated
    USING (auth.uid() = owner_id)
    WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own qr codes"
    ON qr_codes FOR DELETE
    TO authenticated
    USING (auth.uid() = owner_id);

-- 3. Policies for scans
-- Authenticated users can only read scans for QR codes they own
CREATE POLICY "Owners can view scans for their qr codes"
    ON scans FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM qr_codes
            WHERE qr_codes.id = scans.qr_id
            AND qr_codes.owner_id = auth.uid()
        )
    );

-- Scans can ONLY be inserted by service_role (background after() worker)
-- No public or authenticated INSERT policy is provided.

-- 4. Policies for qr_destination_history
CREATE POLICY "Owners can view destination history for their qr codes"
    ON qr_destination_history FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM qr_codes
            WHERE qr_codes.id = qr_destination_history.qr_id
            AND qr_codes.owner_id = auth.uid()
        )
    );

-- 5. Policies for scan_daily_stats
CREATE POLICY "Owners can view daily stats for their qr codes"
    ON scan_daily_stats FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM qr_codes
            WHERE qr_codes.id = scan_daily_stats.qr_id
            AND qr_codes.owner_id = auth.uid()
        )
    );

-- 6. Helper function for sacred redirect resolution
-- Runs with SECURITY DEFINER to resolve active destination URL without exposing owner data or requiring public read on qr_codes table
CREATE OR REPLACE FUNCTION resolve_redirect_destination(p_slug VARCHAR)
RETURNS TABLE (
    qr_id UUID,
    destination_url TEXT,
    status VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT q.id, q.destination_url, q.status
    FROM qr_codes q
    WHERE q.slug = p_slug
      AND q.deleted_at IS NULL
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute on redirect resolution to anon and authenticated
GRANT EXECUTE ON FUNCTION resolve_redirect_destination(VARCHAR) TO anon, authenticated, service_role;

-- Migration: 20261009000001_create_qr_codes.sql
-- Description: Create qr_codes table with constraints, triggers, and immutability checks

-- 1. Helper function for updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = clock_timestamp();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Prevent slug mutation trigger function
CREATE OR REPLACE FUNCTION prevent_qr_code_slug_mutation()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.slug <> NEW.slug THEN
        RAISE EXCEPTION 'QR Code slug is immutable once created to preserve physical prints';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Create qr_codes table
CREATE TABLE IF NOT EXISTS qr_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    slug VARCHAR(16) NOT NULL,
    name VARCHAR(100) NOT NULL,
    destination_url TEXT NOT NULL,
    status VARCHAR(12) NOT NULL DEFAULT 'active',
    style JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    deleted_at TIMESTAMPTZ NULL,

    -- Constraints
    CONSTRAINT chk_qr_codes_slug_format CHECK (slug ~ '^[a-zA-Z0-9_-]{3,16}$'),
    CONSTRAINT chk_qr_codes_status CHECK (status IN ('active', 'paused', 'archived')),
    CONSTRAINT chk_qr_codes_url_length CHECK (char_length(destination_url) <= 2048),
    CONSTRAINT chk_qr_codes_url_protocol CHECK (destination_url ~* '^https?://')
);

-- 4. Indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_qr_codes_slug_unique 
    ON qr_codes (slug) 
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_qr_codes_owner_created 
    ON qr_codes (owner_id, created_at DESC) 
    WHERE deleted_at IS NULL;

-- 5. Triggers
DROP TRIGGER IF EXISTS trg_qr_codes_updated_at ON qr_codes;
CREATE TRIGGER trg_qr_codes_updated_at
    BEFORE UPDATE ON qr_codes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_qr_codes_slug_immutable ON qr_codes;
CREATE TRIGGER trg_qr_codes_slug_immutable
    BEFORE UPDATE ON qr_codes
    FOR EACH ROW
    EXECUTE FUNCTION prevent_qr_code_slug_mutation();

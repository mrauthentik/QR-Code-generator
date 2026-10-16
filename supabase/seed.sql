-- Seed data for local testing
-- Inserts a demo user and sample active QR codes

DO $$
DECLARE
    demo_user_id UUID := '00000000-0000-0000-0000-000000000001'::uuid;
    demo_qr_id UUID := '11111111-1111-1111-1111-111111111111'::uuid;
BEGIN
    -- Insert demo user into auth.users if not present
    INSERT INTO auth.users (id, email, raw_user_meta_data, created_at, updated_at)
    VALUES (
        demo_user_id,
        'demo@example.com',
        '{"name": "Demo User"}'::jsonb,
        clock_timestamp(),
        clock_timestamp()
    )
    ON CONFLICT (id) DO NOTHING;

    -- Insert demo QR code
    INSERT INTO qr_codes (id, owner_id, slug, name, destination_url, status, style)
    VALUES (
        demo_qr_id,
        demo_user_id,
        'welcome',
        'Welcome Campaign',
        'https://example.com/welcome',
        'active',
        '{"dotsColor": "#0f172a", "cornersColor": "#2563eb", "dotType": "rounded"}'::jsonb
    )
    ON CONFLICT (id) DO NOTHING;
END;
$$;

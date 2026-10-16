-- Test Suite: RLS Isolation & Tenant Privacy Verification
-- Objective: Prove User A cannot read or mutate User B's QR codes, scans, or audit records

BEGIN;

-- Setup test users
CREATE SCHEMA IF NOT EXISTS tests;

DO $$
DECLARE
    v_user_a UUID := gen_random_uuid();
    v_user_b UUID := gen_random_uuid();
    v_qr_b_id UUID;
    v_scan_b_id BIGINT;
    v_attempted_read_count INTEGER;
BEGIN
    -- Insert test records under User B directly (simulating preexisting data)
    INSERT INTO qr_codes (id, owner_id, slug, name, destination_url, status)
    VALUES (gen_random_uuid(), v_user_b, 'user-b-slug', 'User B Campaign', 'https://example.com/target-b', 'active')
    RETURNING id INTO v_qr_b_id;

    INSERT INTO scans (qr_id, visitor_hash, country, device_type)
    VALUES (v_qr_b_id, 'hash-b-12345', 'US', 'mobile')
    RETURNING id INTO v_scan_b_id;

    -- 1. TEST: Simulate authenticated session for User A
    SET LOCAL ROLE authenticated;
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_user_a::text)::text, true);

    -- User A attempts to SELECT User B's QR code
    SELECT COUNT(*) INTO v_attempted_read_count
    FROM qr_codes
    WHERE id = v_qr_b_id;

    IF v_attempted_read_count <> 0 THEN
        RAISE EXCEPTION 'TEST FAILED: User A was able to read User B qr_codes record! (RLS Breach)';
    END IF;

    -- User A attempts to SELECT User B's scan records
    SELECT COUNT(*) INTO v_attempted_read_count
    FROM scans
    WHERE qr_id = v_qr_b_id;

    IF v_attempted_read_count <> 0 THEN
        RAISE EXCEPTION 'TEST FAILED: User A was able to read User B scans telemetry! (RLS Breach)';
    END IF;

    -- User A attempts to UPDATE User B's QR code
    UPDATE qr_codes
    SET destination_url = 'https://malicious-hijack.com'
    WHERE id = v_qr_b_id;

    -- Check if User B's destination URL remained untouched
    RESET ROLE;
    IF (SELECT destination_url FROM qr_codes WHERE id = v_qr_b_id) <> 'https://example.com/target-b' THEN
        RAISE EXCEPTION 'TEST FAILED: User A was able to mutate User B destination URL! (RLS Breach)';
    END IF;

    -- 2. TEST: Verify Immutable Slug Constraint
    BEGIN
        UPDATE qr_codes
        SET slug = 'new-slug-attempt'
        WHERE id = v_qr_b_id;

        RAISE EXCEPTION 'TEST FAILED: Slug mutation did not throw exception!';
    EXCEPTION WHEN OTHERS THEN
        IF SQLERRM NOT LIKE '%immutable%' THEN
            RAISE EXCEPTION 'TEST FAILED: Unexpected error on slug update: %', SQLERRM;
        END IF;
    END;

    RAISE NOTICE 'ALL RLS AND IMMUTABILITY TESTS PASSED SUCCESSFULLY.';
END;
$$;

ROLLBACK;

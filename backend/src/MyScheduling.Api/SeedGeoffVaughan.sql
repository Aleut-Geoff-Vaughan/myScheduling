-- Add Geoff Vaughan as Platform Admin
-- Run this script manually in the database

DO $$
DECLARE
    geoff_user_id UUID;
    geoff_person_id UUID;
    aleut_tenant_id UUID;
BEGIN
    -- Get Aleut Federal tenant ID
    SELECT id INTO aleut_tenant_id FROM tenants WHERE name = 'Aleut Federal' LIMIT 1;

    -- Check if user already exists
    SELECT id INTO geoff_user_id FROM users WHERE email = 'Geoff.Vaughan@aleutfederal.com';

    IF geoff_user_id IS NULL THEN
        -- Create user
        INSERT INTO users (
            id, entra_object_id, email, display_name, is_system_admin, is_active,
            created_at, updated_at, is_deleted
        ) VALUES (
            gen_random_uuid(),
            'geoff-vaughan-entra-id',  -- Placeholder, will be replaced with real Entra ID
            'Geoff.Vaughan@aleutfederal.com',
            'Geoff Vaughan',
            true,  -- System Admin
            true,
            NOW(),
            NOW(),
            false
        ) RETURNING id INTO geoff_user_id;

        RAISE NOTICE 'Created user Geoff Vaughan with ID: %', geoff_user_id;
    ELSE
        -- Update existing user to be system admin
        UPDATE users
        SET is_system_admin = true, is_active = true, is_deleted = false
        WHERE id = geoff_user_id;

        RAISE NOTICE 'Updated existing user Geoff Vaughan to System Admin';
    END IF;

    -- Check if person exists
    SELECT id INTO geoff_person_id FROM people WHERE email = 'Geoff.Vaughan@aleutfederal.com';

    IF geoff_person_id IS NULL AND aleut_tenant_id IS NOT NULL THEN
        -- Create person record
        INSERT INTO people (
            id, tenant_id, user_id, name, email, job_title, type, status,
            created_at, updated_at, is_deleted
        ) VALUES (
            gen_random_uuid(),
            aleut_tenant_id,
            geoff_user_id,
            'Geoff Vaughan',
            'Geoff.Vaughan@aleutfederal.com',
            'Chief Technology Officer',
            0,  -- Employee
            0,  -- Active
            NOW(),
            NOW(),
            false
        ) RETURNING id INTO geoff_person_id;

        RAISE NOTICE 'Created person record for Geoff Vaughan with ID: %', geoff_person_id;
    ELSE
        -- Link person to user if not already linked
        IF geoff_person_id IS NOT NULL THEN
            UPDATE people
            SET user_id = geoff_user_id, is_deleted = false
            WHERE id = geoff_person_id;

            -- Update user with person link
            UPDATE users
            SET person_id = geoff_person_id
            WHERE id = geoff_user_id;

            RAISE NOTICE 'Linked person and user records';
        END IF;
    END IF;

    -- Ensure tenant membership with TenantAdmin role
    IF aleut_tenant_id IS NOT NULL THEN
        INSERT INTO tenant_memberships (
            id, user_id, tenant_id, roles, is_active, joined_at,
            created_at, updated_at, is_deleted
        ) VALUES (
            gen_random_uuid(),
            geoff_user_id,
            aleut_tenant_id,
            '[6]',  -- TenantAdmin role (AppRole.TenantAdmin = 6) - JSON array format
            true,
            NOW(),
            NOW(),
            NOW(),
            false
        ) ON CONFLICT DO NOTHING;

        RAISE NOTICE 'Ensured tenant membership for Geoff Vaughan in Aleut Federal';
    END IF;

    RAISE NOTICE 'Successfully configured Geoff Vaughan as Platform Admin';
    RAISE NOTICE 'Email: Geoff.Vaughan@aleutfederal.com';
    RAISE NOTICE 'User ID: %', geoff_user_id;
    RAISE NOTICE 'Person ID: %', geoff_person_id;
    RAISE NOTICE 'System Admin: TRUE';

END $$;

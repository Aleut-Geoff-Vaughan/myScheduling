CREATE TABLE IF NOT EXISTS "__EFMigrationsHistory" (
    "MigrationId" character varying(150) NOT NULL,
    "ProductVersion" character varying(32) NOT NULL,
    CONSTRAINT "PK___EFMigrationsHistory" PRIMARY KEY ("MigrationId")
);

START TRANSACTION;


DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE TABLE certifications (
        id uuid NOT NULL,
        name character varying(200) NOT NULL,
        issuer text,
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone,
        created_by_user_id uuid,
        updated_by_user_id uuid,
        is_deleted boolean NOT NULL,
        deleted_at timestamp with time zone,
        deleted_by_user_id uuid,
        deletion_reason text,
        CONSTRAINT pk_certifications PRIMARY KEY (id)
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE TABLE login_audits (
        id uuid NOT NULL,
        user_id uuid,
        email text,
        is_success boolean NOT NULL,
        ip_address text,
        user_agent text,
        device text,
        operating_system text,
        browser text,
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone,
        created_by_user_id uuid,
        updated_by_user_id uuid,
        is_deleted boolean NOT NULL,
        deleted_at timestamp with time zone,
        deleted_by_user_id uuid,
        deletion_reason text,
        CONSTRAINT pk_login_audits PRIMARY KEY (id)
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE TABLE skills (
        id uuid NOT NULL,
        name character varying(100) NOT NULL,
        category integer NOT NULL,
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone,
        created_by_user_id uuid,
        updated_by_user_id uuid,
        is_deleted boolean NOT NULL,
        deleted_at timestamp with time zone,
        deleted_by_user_id uuid,
        deletion_reason text,
        CONSTRAINT pk_skills PRIMARY KEY (id)
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE TABLE tenants (
        id uuid NOT NULL,
        name character varying(200) NOT NULL,
        status integer NOT NULL,
        configuration text,
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone,
        created_by_user_id uuid,
        updated_by_user_id uuid,
        is_deleted boolean NOT NULL,
        deleted_at timestamp with time zone,
        deleted_by_user_id uuid,
        deletion_reason text,
        CONSTRAINT pk_tenants PRIMARY KEY (id)
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE TABLE company_holidays (
        id uuid NOT NULL,
        name character varying(200) NOT NULL,
        holiday_date date NOT NULL,
        type integer NOT NULL,
        is_recurring boolean NOT NULL,
        description character varying(500),
        is_observed boolean NOT NULL,
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone,
        created_by_user_id uuid,
        updated_by_user_id uuid,
        is_deleted boolean NOT NULL,
        deleted_at timestamp with time zone,
        deleted_by_user_id uuid,
        deletion_reason text,
        tenant_id uuid NOT NULL,
        CONSTRAINT pk_company_holidays PRIMARY KEY (id),
        CONSTRAINT fk_company_holidays__tenants_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE TABLE offices (
        id uuid NOT NULL,
        name character varying(200) NOT NULL,
        address text,
        timezone text,
        status integer NOT NULL,
        is_client_site boolean NOT NULL,
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone,
        created_by_user_id uuid,
        updated_by_user_id uuid,
        is_deleted boolean NOT NULL,
        deleted_at timestamp with time zone,
        deleted_by_user_id uuid,
        deletion_reason text,
        tenant_id uuid NOT NULL,
        CONSTRAINT pk_offices PRIMARY KEY (id),
        CONSTRAINT fk_offices__tenants_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE TABLE projects (
        id uuid NOT NULL,
        name character varying(255) NOT NULL,
        program_code text,
        customer text,
        start_date timestamp with time zone NOT NULL,
        end_date timestamp with time zone,
        status integer NOT NULL,
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone,
        created_by_user_id uuid,
        updated_by_user_id uuid,
        is_deleted boolean NOT NULL,
        deleted_at timestamp with time zone,
        deleted_by_user_id uuid,
        deletion_reason text,
        tenant_id uuid NOT NULL,
        CONSTRAINT pk_projects PRIMARY KEY (id),
        CONSTRAINT fk_projects__tenants_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE TABLE role_permission_templates (
        id uuid NOT NULL,
        tenant_id uuid,
        role integer NOT NULL,
        resource character varying(100) NOT NULL,
        action integer NOT NULL,
        default_scope integer NOT NULL,
        default_conditions text,
        is_system_template boolean NOT NULL,
        description text,
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone,
        created_by_user_id uuid,
        updated_by_user_id uuid,
        is_deleted boolean NOT NULL,
        deleted_at timestamp with time zone,
        deleted_by_user_id uuid,
        deletion_reason text,
        CONSTRAINT pk_role_permission_templates PRIMARY KEY (id),
        CONSTRAINT fk_role_permission_templates__tenants_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants (id)
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE TABLE share_point_configurations (
        id uuid NOT NULL,
        site_url character varying(500) NOT NULL,
        site_id character varying(200) NOT NULL,
        drive_id character varying(200) NOT NULL,
        drive_name character varying(200) NOT NULL,
        client_id character varying(200) NOT NULL,
        client_secret character varying(500) NOT NULL,
        tenant_id_microsoft character varying(200) NOT NULL,
        is_active boolean NOT NULL DEFAULT TRUE,
        last_synced_at timestamp with time zone,
        folder_structure text,
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone,
        created_by_user_id uuid,
        updated_by_user_id uuid,
        is_deleted boolean NOT NULL,
        deleted_at timestamp with time zone,
        deleted_by_user_id uuid,
        deletion_reason text,
        tenant_id uuid NOT NULL,
        CONSTRAINT pk_share_point_configurations PRIMARY KEY (id),
        CONSTRAINT fk_share_point_configurations__tenants_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE TABLE tenant_dropdown_configurations (
        id uuid NOT NULL,
        category character varying(100) NOT NULL,
        options_json text NOT NULL,
        allow_custom_values boolean NOT NULL,
        is_active boolean NOT NULL,
        description text,
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone,
        created_by_user_id uuid,
        updated_by_user_id uuid,
        is_deleted boolean NOT NULL,
        deleted_at timestamp with time zone,
        deleted_by_user_id uuid,
        deletion_reason text,
        tenant_id uuid NOT NULL,
        CONSTRAINT pk_tenant_dropdown_configurations PRIMARY KEY (id),
        CONSTRAINT fk_tenant_dropdown_configurations_tenants_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE TABLE user_invitations (
        id uuid NOT NULL,
        email character varying(255) NOT NULL,
        tenant_id uuid NOT NULL,
        roles integer[] NOT NULL,
        invitation_token character varying(255) NOT NULL,
        status integer NOT NULL,
        expires_at timestamp with time zone NOT NULL,
        accepted_at timestamp with time zone,
        created_by_user_id uuid,
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone NOT NULL,
        CONSTRAINT pk_user_invitations PRIMARY KEY (id),
        CONSTRAINT fk_user_invitations_tenants_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE TABLE users (
        id uuid NOT NULL,
        entra_object_id character varying(100) NOT NULL,
        email character varying(255) NOT NULL,
        display_name character varying(255) NOT NULL,
        password_hash text,
        is_system_admin boolean NOT NULL DEFAULT FALSE,
        is_active boolean NOT NULL,
        last_login_at timestamp with time zone,
        deactivated_at timestamp with time zone,
        deactivated_by_user_id uuid,
        password_changed_at timestamp with time zone,
        failed_login_attempts integer NOT NULL,
        locked_out_until timestamp with time zone,
        phone_number text,
        job_title text,
        department text,
        profile_photo_url text,
        org_unit text,
        location text,
        labor_category text,
        cost_center text,
        type integer NOT NULL,
        status integer NOT NULL,
        manager_id uuid,
        tenant_id uuid,
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone,
        created_by_user_id uuid,
        updated_by_user_id uuid,
        is_deleted boolean NOT NULL,
        deleted_at timestamp with time zone,
        deleted_by_user_id uuid,
        deletion_reason text,
        CONSTRAINT pk_users PRIMARY KEY (id),
        CONSTRAINT fk_users_tenants_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants (id),
        CONSTRAINT fk_users_users_manager_id FOREIGN KEY (manager_id) REFERENCES users (id) ON DELETE RESTRICT
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE TABLE validation_rules (
        id uuid NOT NULL,
        entity_type character varying(100) NOT NULL,
        field_name character varying(100),
        rule_type integer NOT NULL,
        severity integer NOT NULL,
        rule_expression text NOT NULL,
        error_message character varying(1000) NOT NULL,
        is_active boolean NOT NULL DEFAULT TRUE,
        name character varying(200) NOT NULL,
        description text,
        execution_order integer NOT NULL DEFAULT 0,
        conditions text,
        metadata text,
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone,
        created_by_user_id uuid,
        updated_by_user_id uuid,
        is_deleted boolean NOT NULL,
        deleted_at timestamp with time zone,
        deleted_by_user_id uuid,
        deletion_reason text,
        tenant_id uuid NOT NULL,
        CONSTRAINT pk_validation_rules PRIMARY KEY (id),
        CONSTRAINT fk_validation_rules_tenants_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE TABLE authorization_audit_logs (
        id uuid NOT NULL,
        user_id uuid NOT NULL,
        tenant_id uuid,
        resource character varying(100) NOT NULL,
        resource_id uuid,
        action integer NOT NULL,
        was_allowed boolean NOT NULL,
        denial_reason text,
        granted_scope integer,
        ip_address text,
        user_agent text,
        request_path text,
        timestamp timestamp with time zone NOT NULL,
        additional_context text,
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone,
        created_by_user_id uuid,
        updated_by_user_id uuid,
        is_deleted boolean NOT NULL,
        deleted_at timestamp with time zone,
        deleted_by_user_id uuid,
        deletion_reason text,
        CONSTRAINT pk_authorization_audit_logs PRIMARY KEY (id),
        CONSTRAINT fk_authorization_audit_logs__tenants_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants (id),
        CONSTRAINT fk_authorization_audit_logs__users_user_id FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE TABLE data_archive_exports (
        id uuid NOT NULL,
        tenant_id uuid,
        requested_by_user_id uuid NOT NULL,
        entity_type character varying(100) NOT NULL,
        filter_json text,
        requested_at timestamp with time zone NOT NULL,
        status integer NOT NULL,
        stored_file_id text,
        record_count integer NOT NULL,
        file_size_bytes bigint NOT NULL,
        completed_at timestamp with time zone,
        error_message text,
        requested_by_id uuid NOT NULL,
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone,
        created_by_user_id uuid,
        updated_by_user_id uuid,
        is_deleted boolean NOT NULL,
        deleted_at timestamp with time zone,
        deleted_by_user_id uuid,
        deletion_reason text,
        CONSTRAINT pk_data_archive_exports PRIMARY KEY (id),
        CONSTRAINT fk_data_archive_exports__tenants_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants (id),
        CONSTRAINT fk_data_archive_exports__users_requested_by_id FOREIGN KEY (requested_by_id) REFERENCES users (id) ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE TABLE data_archives (
        id uuid NOT NULL,
        tenant_id uuid,
        entity_type character varying(100) NOT NULL,
        entity_id uuid NOT NULL,
        entity_snapshot text NOT NULL,
        archived_at timestamp with time zone NOT NULL,
        archived_by_user_id uuid NOT NULL,
        archival_reason text,
        status integer NOT NULL,
        restored_at timestamp with time zone,
        restored_by_user_id uuid,
        restoration_notes text,
        permanently_deleted_at timestamp with time zone,
        permanently_deleted_by_user_id uuid,
        permanent_deletion_reason text,
        was_exported boolean NOT NULL,
        exported_at timestamp with time zone,
        exported_by_user_id uuid,
        scheduled_permanent_deletion_at timestamp with time zone,
        retention_days integer NOT NULL,
        archived_by_id uuid NOT NULL,
        restored_by_id uuid,
        permanently_deleted_by_id uuid,
        exported_by_id uuid,
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone,
        created_by_user_id uuid,
        updated_by_user_id uuid,
        is_deleted boolean NOT NULL,
        deleted_at timestamp with time zone,
        deleted_by_user_id uuid,
        deletion_reason text,
        CONSTRAINT pk_data_archives PRIMARY KEY (id),
        CONSTRAINT fk_data_archives__tenants_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants (id),
        CONSTRAINT fk_data_archives__users_archived_by_id FOREIGN KEY (archived_by_id) REFERENCES users (id) ON DELETE CASCADE,
        CONSTRAINT fk_data_archives__users_exported_by_id FOREIGN KEY (exported_by_id) REFERENCES users (id),
        CONSTRAINT fk_data_archives__users_permanently_deleted_by_id FOREIGN KEY (permanently_deleted_by_id) REFERENCES users (id),
        CONSTRAINT fk_data_archives__users_restored_by_id FOREIGN KEY (restored_by_id) REFERENCES users (id)
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE TABLE delegation_of_authority_letters (
        id uuid NOT NULL,
        tenant_id uuid NOT NULL,
        delegator_user_id uuid NOT NULL,
        designee_user_id uuid NOT NULL,
        letter_content text NOT NULL,
        effective_start_date timestamp with time zone NOT NULL,
        effective_end_date timestamp with time zone NOT NULL,
        is_financial_authority boolean NOT NULL DEFAULT FALSE,
        is_operational_authority boolean NOT NULL DEFAULT FALSE,
        status integer NOT NULL,
        notes character varying(1000),
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone,
        created_by_user_id uuid,
        updated_by_user_id uuid,
        is_deleted boolean NOT NULL,
        deleted_at timestamp with time zone,
        deleted_by_user_id uuid,
        deletion_reason text,
        CONSTRAINT pk_delegation_of_authority_letters PRIMARY KEY (id),
        CONSTRAINT fk_delegation_of_authority_letters__tenants_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE,
        CONSTRAINT fk_delegation_of_authority_letters__users_delegator_user_id FOREIGN KEY (delegator_user_id) REFERENCES users (id) ON DELETE RESTRICT,
        CONSTRAINT fk_delegation_of_authority_letters__users_designee_user_id FOREIGN KEY (designee_user_id) REFERENCES users (id) ON DELETE RESTRICT
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE TABLE permissions (
        id uuid NOT NULL,
        tenant_id uuid,
        resource character varying(100) NOT NULL,
        resource_id uuid,
        action integer NOT NULL,
        scope integer NOT NULL,
        user_id uuid,
        role integer,
        conditions text,
        expires_at timestamp with time zone,
        is_active boolean NOT NULL,
        description text,
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone,
        created_by_user_id uuid,
        updated_by_user_id uuid,
        is_deleted boolean NOT NULL,
        deleted_at timestamp with time zone,
        deleted_by_user_id uuid,
        deletion_reason text,
        CONSTRAINT pk_permissions PRIMARY KEY (id),
        CONSTRAINT fk_permissions__tenants_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants (id),
        CONSTRAINT fk_permissions__users_user_id FOREIGN KEY (user_id) REFERENCES users (id)
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE TABLE person_certifications (
        id uuid NOT NULL,
        user_id uuid NOT NULL,
        certification_id uuid NOT NULL,
        issue_date timestamp with time zone NOT NULL,
        expiry_date timestamp with time zone,
        credential_id text,
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone,
        created_by_user_id uuid,
        updated_by_user_id uuid,
        is_deleted boolean NOT NULL,
        deleted_at timestamp with time zone,
        deleted_by_user_id uuid,
        deletion_reason text,
        CONSTRAINT pk_person_certifications PRIMARY KEY (id),
        CONSTRAINT fk_person_certifications__users_user_id FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        CONSTRAINT fk_person_certifications_certifications_certification_id FOREIGN KEY (certification_id) REFERENCES certifications (id) ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE TABLE person_skills (
        id uuid NOT NULL,
        user_id uuid NOT NULL,
        skill_id uuid NOT NULL,
        proficiency_level integer NOT NULL,
        last_used_date timestamp with time zone,
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone,
        created_by_user_id uuid,
        updated_by_user_id uuid,
        is_deleted boolean NOT NULL,
        deleted_at timestamp with time zone,
        deleted_by_user_id uuid,
        deletion_reason text,
        CONSTRAINT pk_person_skills PRIMARY KEY (id),
        CONSTRAINT fk_person_skills__skills_skill_id FOREIGN KEY (skill_id) REFERENCES skills (id) ON DELETE CASCADE,
        CONSTRAINT fk_person_skills__users_user_id FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE TABLE role_assignments (
        id uuid NOT NULL,
        user_id uuid NOT NULL,
        role integer NOT NULL,
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone,
        created_by_user_id uuid,
        updated_by_user_id uuid,
        is_deleted boolean NOT NULL,
        deleted_at timestamp with time zone,
        deleted_by_user_id uuid,
        deletion_reason text,
        tenant_id uuid NOT NULL,
        CONSTRAINT pk_role_assignments PRIMARY KEY (id),
        CONSTRAINT fk_role_assignments__tenants_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE,
        CONSTRAINT fk_role_assignments__users_user_id FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE TABLE spaces (
        id uuid NOT NULL,
        office_id uuid NOT NULL,
        name character varying(100) NOT NULL,
        type integer NOT NULL,
        capacity integer NOT NULL,
        metadata text,
        manager_user_id uuid,
        requires_approval boolean NOT NULL,
        is_active boolean NOT NULL,
        equipment text,
        features text,
        daily_cost numeric,
        max_booking_days integer,
        booking_rules text,
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone,
        created_by_user_id uuid,
        updated_by_user_id uuid,
        is_deleted boolean NOT NULL,
        deleted_at timestamp with time zone,
        deleted_by_user_id uuid,
        deletion_reason text,
        tenant_id uuid NOT NULL,
        CONSTRAINT pk_spaces PRIMARY KEY (id),
        CONSTRAINT fk_spaces__tenants_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE,
        CONSTRAINT fk_spaces__users_manager_user_id FOREIGN KEY (manager_user_id) REFERENCES users (id) ON DELETE SET NULL,
        CONSTRAINT fk_spaces_offices_office_id FOREIGN KEY (office_id) REFERENCES offices (id) ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE TABLE stored_files (
        id uuid NOT NULL,
        file_name character varying(500) NOT NULL,
        original_file_name character varying(500) NOT NULL,
        content_type character varying(200) NOT NULL,
        file_size_bytes bigint NOT NULL,
        file_hash character varying(64) NOT NULL,
        storage_provider integer NOT NULL,
        storage_provider_id character varying(500) NOT NULL,
        storage_path character varying(1000) NOT NULL,
        share_point_site_id text,
        share_point_drive_id text,
        share_point_item_id text,
        entity_type character varying(100) NOT NULL,
        entity_id uuid NOT NULL,
        category text,
        tags text,
        access_level integer NOT NULL DEFAULT 0,
        expires_at timestamp with time zone,
        is_deleted boolean NOT NULL DEFAULT FALSE,
        deleted_at timestamp with time zone,
        deleted_by_user_id uuid,
        version integer NOT NULL DEFAULT 1,
        previous_version_id uuid,
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone,
        created_by_user_id uuid,
        updated_by_user_id uuid,
        deletion_reason text,
        tenant_id uuid NOT NULL,
        CONSTRAINT pk_stored_files PRIMARY KEY (id),
        CONSTRAINT fk_stored_files__tenants_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE,
        CONSTRAINT fk_stored_files__users_deleted_by_user_id FOREIGN KEY (deleted_by_user_id) REFERENCES users (id) ON DELETE SET NULL,
        CONSTRAINT fk_stored_files_stored_files_previous_version_id FOREIGN KEY (previous_version_id) REFERENCES stored_files (id) ON DELETE SET NULL
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE TABLE team_calendars (
        id uuid NOT NULL,
        name character varying(200) NOT NULL,
        description character varying(500),
        type integer NOT NULL,
        is_active boolean NOT NULL DEFAULT TRUE,
        owner_user_id uuid,
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone,
        created_by_user_id uuid,
        updated_by_user_id uuid,
        is_deleted boolean NOT NULL,
        deleted_at timestamp with time zone,
        deleted_by_user_id uuid,
        deletion_reason text,
        tenant_id uuid NOT NULL,
        CONSTRAINT pk_team_calendars PRIMARY KEY (id),
        CONSTRAINT fk_team_calendars__tenants_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE,
        CONSTRAINT fk_team_calendars__users_owner_user_id FOREIGN KEY (owner_user_id) REFERENCES users (id) ON DELETE SET NULL
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE TABLE tenant_memberships (
        id uuid NOT NULL,
        user_id uuid NOT NULL,
        tenant_id uuid NOT NULL,
        roles jsonb NOT NULL,
        joined_at timestamp with time zone NOT NULL,
        is_active boolean NOT NULL DEFAULT TRUE,
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone,
        created_by_user_id uuid,
        updated_by_user_id uuid,
        is_deleted boolean NOT NULL,
        deleted_at timestamp with time zone,
        deleted_by_user_id uuid,
        deletion_reason text,
        CONSTRAINT pk_tenant_memberships PRIMARY KEY (id),
        CONSTRAINT fk_tenant_memberships__users_user_id FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        CONSTRAINT fk_tenant_memberships_tenants_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE TABLE wbs_elements (
        id uuid NOT NULL,
        project_id uuid NOT NULL,
        code character varying(100) NOT NULL,
        description character varying(500) NOT NULL,
        valid_from timestamp with time zone NOT NULL,
        valid_to timestamp with time zone,
        start_date timestamp with time zone NOT NULL,
        end_date timestamp with time zone,
        type integer NOT NULL,
        status integer NOT NULL,
        is_billable boolean NOT NULL,
        owner_user_id uuid,
        approver_user_id uuid,
        approval_status integer NOT NULL,
        approval_notes text,
        approved_at timestamp with time zone,
        owner_id uuid,
        approver_id uuid,
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone,
        created_by_user_id uuid,
        updated_by_user_id uuid,
        is_deleted boolean NOT NULL,
        deleted_at timestamp with time zone,
        deleted_by_user_id uuid,
        deletion_reason text,
        tenant_id uuid NOT NULL,
        CONSTRAINT pk_wbs_elements PRIMARY KEY (id),
        CONSTRAINT fk_wbs_elements_projects_project_id FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
        CONSTRAINT fk_wbs_elements_tenants_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE,
        CONSTRAINT fk_wbs_elements_users_approver_id FOREIGN KEY (approver_id) REFERENCES users (id),
        CONSTRAINT fk_wbs_elements_users_owner_id FOREIGN KEY (owner_id) REFERENCES users (id)
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE TABLE work_location_templates (
        id uuid NOT NULL,
        user_id uuid NOT NULL,
        tenant_id uuid NOT NULL,
        name character varying(200) NOT NULL,
        description character varying(500),
        type integer NOT NULL,
        is_shared boolean NOT NULL DEFAULT FALSE,
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone,
        created_by_user_id uuid,
        updated_by_user_id uuid,
        is_deleted boolean NOT NULL,
        deleted_at timestamp with time zone,
        deleted_by_user_id uuid,
        deletion_reason text,
        CONSTRAINT pk_work_location_templates PRIMARY KEY (id),
        CONSTRAINT fk_work_location_templates_tenants_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE,
        CONSTRAINT fk_work_location_templates_users_user_id FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE TABLE digital_signatures (
        id uuid NOT NULL,
        doaletter_id uuid NOT NULL,
        signer_user_id uuid NOT NULL,
        role integer NOT NULL,
        signature_data text NOT NULL,
        signed_at timestamp with time zone NOT NULL,
        ip_address character varying(45) NOT NULL,
        user_agent character varying(500) NOT NULL,
        is_verified boolean NOT NULL DEFAULT TRUE,
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone,
        created_by_user_id uuid,
        updated_by_user_id uuid,
        is_deleted boolean NOT NULL,
        deleted_at timestamp with time zone,
        deleted_by_user_id uuid,
        deletion_reason text,
        CONSTRAINT pk_digital_signatures PRIMARY KEY (id),
        CONSTRAINT fk_digital_signatures__users_signer_user_id FOREIGN KEY (signer_user_id) REFERENCES users (id) ON DELETE RESTRICT,
        CONSTRAINT "fk_digital_signatures_delegation_of_authority_letters_doalette~" FOREIGN KEY (doaletter_id) REFERENCES delegation_of_authority_letters (id) ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE TABLE doaactivations (
        id uuid NOT NULL,
        doaletter_id uuid NOT NULL,
        tenant_id uuid NOT NULL,
        start_date date NOT NULL,
        end_date date NOT NULL,
        reason character varying(200) NOT NULL,
        notes character varying(500),
        is_active boolean NOT NULL DEFAULT TRUE,
        deactivated_at timestamp with time zone,
        deactivated_by_user_id uuid,
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone,
        created_by_user_id uuid,
        updated_by_user_id uuid,
        is_deleted boolean NOT NULL,
        deleted_at timestamp with time zone,
        deleted_by_user_id uuid,
        deletion_reason text,
        CONSTRAINT pk_doaactivations PRIMARY KEY (id),
        CONSTRAINT fk_doaactivations__delegation_of_authority_letters_doaletter_id FOREIGN KEY (doaletter_id) REFERENCES delegation_of_authority_letters (id) ON DELETE CASCADE,
        CONSTRAINT fk_doaactivations__tenants_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE TABLE bookings (
        id uuid NOT NULL,
        space_id uuid NOT NULL,
        user_id uuid NOT NULL,
        start_datetime timestamp with time zone NOT NULL,
        end_datetime timestamp with time zone NOT NULL,
        status integer NOT NULL,
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone,
        created_by_user_id uuid,
        updated_by_user_id uuid,
        is_deleted boolean NOT NULL,
        deleted_at timestamp with time zone,
        deleted_by_user_id uuid,
        deletion_reason text,
        tenant_id uuid NOT NULL,
        CONSTRAINT pk_bookings PRIMARY KEY (id),
        CONSTRAINT fk_bookings__spaces_space_id FOREIGN KEY (space_id) REFERENCES spaces (id) ON DELETE CASCADE,
        CONSTRAINT fk_bookings__tenants_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE,
        CONSTRAINT fk_bookings__users_user_id FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE TABLE facility_permissions (
        id uuid NOT NULL,
        office_id uuid,
        space_id uuid,
        user_id uuid,
        role integer,
        access_level integer NOT NULL,
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone,
        created_by_user_id uuid,
        updated_by_user_id uuid,
        is_deleted boolean NOT NULL,
        deleted_at timestamp with time zone,
        deleted_by_user_id uuid,
        deletion_reason text,
        CONSTRAINT pk_facility_permissions PRIMARY KEY (id),
        CONSTRAINT fk_facility_permissions__offices_office_id FOREIGN KEY (office_id) REFERENCES offices (id) ON DELETE CASCADE,
        CONSTRAINT fk_facility_permissions__spaces_space_id FOREIGN KEY (space_id) REFERENCES spaces (id) ON DELETE CASCADE,
        CONSTRAINT fk_facility_permissions__users_user_id FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE TABLE space_maintenance_logs (
        id uuid NOT NULL,
        space_id uuid NOT NULL,
        scheduled_date timestamp with time zone NOT NULL,
        completed_date timestamp with time zone,
        type integer NOT NULL,
        status integer NOT NULL,
        reported_by_user_id uuid NOT NULL,
        assigned_to_user_id uuid,
        description character varying(1000) NOT NULL,
        resolution text,
        cost numeric,
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone,
        created_by_user_id uuid,
        updated_by_user_id uuid,
        is_deleted boolean NOT NULL,
        deleted_at timestamp with time zone,
        deleted_by_user_id uuid,
        deletion_reason text,
        CONSTRAINT pk_space_maintenance_logs PRIMARY KEY (id),
        CONSTRAINT fk_space_maintenance_logs__users_assigned_to_user_id FOREIGN KEY (assigned_to_user_id) REFERENCES users (id) ON DELETE SET NULL,
        CONSTRAINT fk_space_maintenance_logs__users_reported_by_user_id FOREIGN KEY (reported_by_user_id) REFERENCES users (id) ON DELETE RESTRICT,
        CONSTRAINT fk_space_maintenance_logs_spaces_space_id FOREIGN KEY (space_id) REFERENCES spaces (id) ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE TABLE file_access_logs (
        id uuid NOT NULL,
        stored_file_id uuid NOT NULL,
        accessed_by_user_id uuid NOT NULL,
        accessed_at timestamp with time zone NOT NULL,
        access_type integer NOT NULL,
        ip_address text,
        user_agent text,
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone,
        created_by_user_id uuid,
        updated_by_user_id uuid,
        is_deleted boolean NOT NULL,
        deleted_at timestamp with time zone,
        deleted_by_user_id uuid,
        deletion_reason text,
        CONSTRAINT pk_file_access_logs PRIMARY KEY (id),
        CONSTRAINT fk_file_access_logs__stored_files_stored_file_id FOREIGN KEY (stored_file_id) REFERENCES stored_files (id) ON DELETE CASCADE,
        CONSTRAINT fk_file_access_logs__users_accessed_by_user_id FOREIGN KEY (accessed_by_user_id) REFERENCES users (id) ON DELETE RESTRICT
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE TABLE resume_templates (
        id uuid NOT NULL,
        name character varying(200) NOT NULL,
        description character varying(1000) NOT NULL,
        type integer NOT NULL,
        template_content text NOT NULL,
        stored_file_id uuid,
        is_default boolean NOT NULL DEFAULT FALSE,
        is_active boolean NOT NULL DEFAULT TRUE,
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone,
        created_by_user_id uuid,
        updated_by_user_id uuid,
        is_deleted boolean NOT NULL,
        deleted_at timestamp with time zone,
        deleted_by_user_id uuid,
        deletion_reason text,
        tenant_id uuid NOT NULL,
        CONSTRAINT pk_resume_templates PRIMARY KEY (id),
        CONSTRAINT fk_resume_templates__stored_files_stored_file_id FOREIGN KEY (stored_file_id) REFERENCES stored_files (id) ON DELETE SET NULL,
        CONSTRAINT fk_resume_templates__tenants_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE TABLE team_calendar_members (
        id uuid NOT NULL,
        team_calendar_id uuid NOT NULL,
        user_id uuid NOT NULL,
        membership_type integer NOT NULL,
        added_date timestamp with time zone NOT NULL,
        added_by_user_id uuid,
        is_active boolean NOT NULL DEFAULT TRUE,
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone,
        created_by_user_id uuid,
        updated_by_user_id uuid,
        is_deleted boolean NOT NULL,
        deleted_at timestamp with time zone,
        deleted_by_user_id uuid,
        deletion_reason text,
        tenant_id uuid NOT NULL,
        CONSTRAINT pk_team_calendar_members PRIMARY KEY (id),
        CONSTRAINT fk_team_calendar_members__tenants_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE,
        CONSTRAINT fk_team_calendar_members__users_added_by_user_id FOREIGN KEY (added_by_user_id) REFERENCES users (id) ON DELETE SET NULL,
        CONSTRAINT fk_team_calendar_members__users_user_id FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        CONSTRAINT fk_team_calendar_members_team_calendars_team_calendar_id FOREIGN KEY (team_calendar_id) REFERENCES team_calendars (id) ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE TABLE project_roles (
        id uuid NOT NULL,
        wbs_element_id uuid NOT NULL,
        title character varying(255) NOT NULL,
        labor_category text,
        required_skills text,
        fte_required numeric NOT NULL,
        start_date timestamp with time zone NOT NULL,
        end_date timestamp with time zone,
        status integer NOT NULL,
        allow_self_request boolean NOT NULL,
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone,
        created_by_user_id uuid,
        updated_by_user_id uuid,
        is_deleted boolean NOT NULL,
        deleted_at timestamp with time zone,
        deleted_by_user_id uuid,
        deletion_reason text,
        tenant_id uuid NOT NULL,
        CONSTRAINT pk_project_roles PRIMARY KEY (id),
        CONSTRAINT fk_project_roles__tenants_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE,
        CONSTRAINT fk_project_roles__wbs_elements_wbs_element_id FOREIGN KEY (wbs_element_id) REFERENCES wbs_elements (id) ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE TABLE wbs_change_histories (
        id uuid NOT NULL,
        wbs_element_id uuid NOT NULL,
        changed_by_user_id uuid NOT NULL,
        changed_at timestamp with time zone NOT NULL,
        change_type character varying(50) NOT NULL,
        old_values text,
        new_values text,
        notes text,
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone,
        created_by_user_id uuid,
        updated_by_user_id uuid,
        is_deleted boolean NOT NULL,
        deleted_at timestamp with time zone,
        deleted_by_user_id uuid,
        deletion_reason text,
        CONSTRAINT pk_wbs_change_histories PRIMARY KEY (id),
        CONSTRAINT fk_wbs_change_histories__wbs_elements_wbs_element_id FOREIGN KEY (wbs_element_id) REFERENCES wbs_elements (id) ON DELETE CASCADE,
        CONSTRAINT fk_wbs_change_histories_users_changed_by_user_id FOREIGN KEY (changed_by_user_id) REFERENCES users (id) ON DELETE RESTRICT
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE TABLE work_location_template_items (
        id uuid NOT NULL,
        template_id uuid NOT NULL,
        day_offset integer NOT NULL,
        day_of_week integer,
        location_type integer NOT NULL,
        office_id uuid,
        remote_location character varying(200),
        city character varying(100),
        state character varying(100),
        country character varying(100),
        notes character varying(500),
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone,
        created_by_user_id uuid,
        updated_by_user_id uuid,
        is_deleted boolean NOT NULL,
        deleted_at timestamp with time zone,
        deleted_by_user_id uuid,
        deletion_reason text,
        CONSTRAINT pk_work_location_template_items PRIMARY KEY (id),
        CONSTRAINT fk_work_location_template_items_offices_office_id FOREIGN KEY (office_id) REFERENCES offices (id) ON DELETE SET NULL,
        CONSTRAINT "fk_work_location_template_items_work_location_templates_templa~" FOREIGN KEY (template_id) REFERENCES work_location_templates (id) ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE TABLE check_in_events (
        id uuid NOT NULL,
        booking_id uuid NOT NULL,
        timestamp timestamp with time zone NOT NULL,
        method character varying(50) NOT NULL,
        processed_by_user_id uuid,
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone,
        created_by_user_id uuid,
        updated_by_user_id uuid,
        is_deleted boolean NOT NULL,
        deleted_at timestamp with time zone,
        deleted_by_user_id uuid,
        deletion_reason text,
        CONSTRAINT pk_check_in_events PRIMARY KEY (id),
        CONSTRAINT fk_check_in_events_bookings_booking_id FOREIGN KEY (booking_id) REFERENCES bookings (id) ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE TABLE work_location_preferences (
        id uuid NOT NULL,
        user_id uuid NOT NULL,
        work_date date NOT NULL,
        location_type integer NOT NULL,
        office_id uuid,
        booking_id uuid,
        remote_location character varying(200),
        city character varying(100),
        state character varying(100),
        country character varying(100),
        notes character varying(500),
        doaactivation_id uuid,
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone,
        created_by_user_id uuid,
        updated_by_user_id uuid,
        is_deleted boolean NOT NULL,
        deleted_at timestamp with time zone,
        deleted_by_user_id uuid,
        deletion_reason text,
        tenant_id uuid NOT NULL,
        CONSTRAINT pk_work_location_preferences PRIMARY KEY (id),
        CONSTRAINT fk_work_location_preferences_bookings_booking_id FOREIGN KEY (booking_id) REFERENCES bookings (id) ON DELETE SET NULL,
        CONSTRAINT fk_work_location_preferences_doaactivations_doaactivation_id FOREIGN KEY (doaactivation_id) REFERENCES doaactivations (id) ON DELETE SET NULL,
        CONSTRAINT fk_work_location_preferences_offices_office_id FOREIGN KEY (office_id) REFERENCES offices (id) ON DELETE SET NULL,
        CONSTRAINT fk_work_location_preferences_tenants_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE,
        CONSTRAINT fk_work_location_preferences_users_user_id FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE TABLE assignments (
        id uuid NOT NULL,
        user_id uuid NOT NULL,
        project_role_id uuid,
        wbs_element_id uuid NOT NULL,
        allocation_pct integer NOT NULL,
        start_date timestamp with time zone NOT NULL,
        end_date timestamp with time zone,
        status integer NOT NULL,
        is_pto_or_training boolean NOT NULL,
        approved_by_user_id uuid,
        approved_at timestamp with time zone,
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone,
        created_by_user_id uuid,
        updated_by_user_id uuid,
        is_deleted boolean NOT NULL,
        deleted_at timestamp with time zone,
        deleted_by_user_id uuid,
        deletion_reason text,
        tenant_id uuid NOT NULL,
        CONSTRAINT pk_assignments PRIMARY KEY (id),
        CONSTRAINT fk_assignments__project_roles_project_role_id FOREIGN KEY (project_role_id) REFERENCES project_roles (id) ON DELETE SET NULL,
        CONSTRAINT fk_assignments__tenants_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE,
        CONSTRAINT fk_assignments__users_approved_by_user_id FOREIGN KEY (approved_by_user_id) REFERENCES users (id) ON DELETE SET NULL,
        CONSTRAINT fk_assignments__users_user_id FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        CONSTRAINT fk_assignments__wbs_elements_wbs_element_id FOREIGN KEY (wbs_element_id) REFERENCES wbs_elements (id) ON DELETE RESTRICT
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE TABLE assignment_history (
        id uuid NOT NULL,
        assignment_id uuid NOT NULL,
        allocation_pct integer NOT NULL,
        start_date timestamp with time zone NOT NULL,
        end_date timestamp with time zone,
        status integer NOT NULL,
        approved_by_user_id uuid,
        changed_at timestamp with time zone NOT NULL,
        changed_by_user_id uuid,
        change_reason text,
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone,
        created_by_user_id uuid,
        updated_by_user_id uuid,
        is_deleted boolean NOT NULL,
        deleted_at timestamp with time zone,
        deleted_by_user_id uuid,
        deletion_reason text,
        CONSTRAINT pk_assignment_history PRIMARY KEY (id),
        CONSTRAINT fk_assignment_history_assignments_assignment_id FOREIGN KEY (assignment_id) REFERENCES assignments (id) ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE TABLE linked_in_imports (
        id uuid NOT NULL,
        user_id uuid NOT NULL,
        resume_profile_id uuid NOT NULL,
        linked_in_profile_url character varying(500) NOT NULL,
        imported_at timestamp with time zone NOT NULL,
        imported_by_user_id uuid NOT NULL,
        raw_data text,
        status integer NOT NULL,
        error_message text,
        items_imported integer NOT NULL,
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone,
        created_by_user_id uuid,
        updated_by_user_id uuid,
        is_deleted boolean NOT NULL,
        deleted_at timestamp with time zone,
        deleted_by_user_id uuid,
        deletion_reason text,
        CONSTRAINT pk_linked_in_imports PRIMARY KEY (id),
        CONSTRAINT fk_linked_in_imports__users_imported_by_user_id FOREIGN KEY (imported_by_user_id) REFERENCES users (id) ON DELETE RESTRICT,
        CONSTRAINT fk_linked_in_imports__users_user_id FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE TABLE resume_approvals (
        id uuid NOT NULL,
        resume_profile_id uuid NOT NULL,
        resume_version_id uuid,
        requested_by_user_id uuid NOT NULL,
        reviewed_by_user_id uuid,
        requested_at timestamp with time zone NOT NULL,
        reviewed_at timestamp with time zone,
        status integer NOT NULL DEFAULT 0,
        review_notes text,
        request_notes text,
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone,
        created_by_user_id uuid,
        updated_by_user_id uuid,
        is_deleted boolean NOT NULL,
        deleted_at timestamp with time zone,
        deleted_by_user_id uuid,
        deletion_reason text,
        CONSTRAINT pk_resume_approvals PRIMARY KEY (id),
        CONSTRAINT fk_resume_approvals__users_requested_by_user_id FOREIGN KEY (requested_by_user_id) REFERENCES users (id) ON DELETE RESTRICT,
        CONSTRAINT fk_resume_approvals__users_reviewed_by_user_id FOREIGN KEY (reviewed_by_user_id) REFERENCES users (id) ON DELETE SET NULL
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE TABLE resume_documents (
        id uuid NOT NULL,
        resume_profile_id uuid NOT NULL,
        resume_version_id uuid,
        stored_file_id uuid NOT NULL,
        document_type character varying(50) NOT NULL,
        template_name text,
        generated_at timestamp with time zone NOT NULL,
        generated_by_user_id uuid NOT NULL,
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone,
        created_by_user_id uuid,
        updated_by_user_id uuid,
        is_deleted boolean NOT NULL,
        deleted_at timestamp with time zone,
        deleted_by_user_id uuid,
        deletion_reason text,
        CONSTRAINT pk_resume_documents PRIMARY KEY (id),
        CONSTRAINT fk_resume_documents__stored_files_stored_file_id FOREIGN KEY (stored_file_id) REFERENCES stored_files (id) ON DELETE RESTRICT,
        CONSTRAINT fk_resume_documents__users_generated_by_user_id FOREIGN KEY (generated_by_user_id) REFERENCES users (id) ON DELETE RESTRICT
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE TABLE resume_entries (
        id uuid NOT NULL,
        resume_section_id uuid NOT NULL,
        title character varying(255) NOT NULL,
        organization text,
        start_date timestamp with time zone,
        end_date timestamp with time zone,
        description text,
        additional_fields text,
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone,
        created_by_user_id uuid,
        updated_by_user_id uuid,
        is_deleted boolean NOT NULL,
        deleted_at timestamp with time zone,
        deleted_by_user_id uuid,
        deletion_reason text,
        CONSTRAINT pk_resume_entries PRIMARY KEY (id)
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE TABLE resume_profiles (
        id uuid NOT NULL,
        user_id uuid NOT NULL,
        template_config text,
        status integer NOT NULL DEFAULT 0,
        current_version_id uuid,
        last_reviewed_at timestamp with time zone,
        last_reviewed_by_user_id uuid,
        is_public boolean NOT NULL DEFAULT FALSE,
        linked_in_profile_url text,
        linked_in_last_synced_at timestamp with time zone,
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone,
        created_by_user_id uuid,
        updated_by_user_id uuid,
        is_deleted boolean NOT NULL,
        deleted_at timestamp with time zone,
        deleted_by_user_id uuid,
        deletion_reason text,
        CONSTRAINT pk_resume_profiles PRIMARY KEY (id),
        CONSTRAINT fk_resume_profiles__users_last_reviewed_by_user_id FOREIGN KEY (last_reviewed_by_user_id) REFERENCES users (id) ON DELETE SET NULL,
        CONSTRAINT fk_resume_profiles__users_user_id FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE TABLE resume_sections (
        id uuid NOT NULL,
        resume_profile_id uuid NOT NULL,
        user_id uuid NOT NULL,
        type integer NOT NULL,
        display_order integer NOT NULL,
        resume_profile_id1 uuid NOT NULL,
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone,
        created_by_user_id uuid,
        updated_by_user_id uuid,
        is_deleted boolean NOT NULL,
        deleted_at timestamp with time zone,
        deleted_by_user_id uuid,
        deletion_reason text,
        CONSTRAINT pk_resume_sections PRIMARY KEY (id),
        CONSTRAINT fk_resume_sections__users_user_id FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        CONSTRAINT fk_resume_sections_resume_profiles_resume_profile_id FOREIGN KEY (resume_profile_id) REFERENCES resume_profiles (id) ON DELETE CASCADE,
        CONSTRAINT fk_resume_sections_resume_profiles_resume_profile_id1 FOREIGN KEY (resume_profile_id1) REFERENCES resume_profiles (id) ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE TABLE resume_versions (
        id uuid NOT NULL,
        resume_profile_id uuid NOT NULL,
        version_number integer NOT NULL,
        version_name character varying(200) NOT NULL,
        description text,
        content_snapshot text,
        created_by_user_id uuid NOT NULL,
        is_active boolean NOT NULL DEFAULT TRUE,
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone,
        updated_by_user_id uuid,
        is_deleted boolean NOT NULL,
        deleted_at timestamp with time zone,
        deleted_by_user_id uuid,
        deletion_reason text,
        CONSTRAINT pk_resume_versions PRIMARY KEY (id),
        CONSTRAINT fk_resume_versions__users_created_by_user_id FOREIGN KEY (created_by_user_id) REFERENCES users (id) ON DELETE RESTRICT,
        CONSTRAINT fk_resume_versions_resume_profiles_resume_profile_id FOREIGN KEY (resume_profile_id) REFERENCES resume_profiles (id) ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_assignment_history_assignment_id_changed_at ON assignment_history (assignment_id, changed_at);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_assignments_approved_by_user_id ON assignments (approved_by_user_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_assignments_project_role_id ON assignments (project_role_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_assignments_start_date_end_date ON assignments (start_date, end_date);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_assignments_tenant_id_user_id_status ON assignments (tenant_id, user_id, status);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_assignments_user_id ON assignments (user_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_assignments_wbs_element_id_status ON assignments (wbs_element_id, status);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_authorization_audit_logs_tenant_id_timestamp ON authorization_audit_logs (tenant_id, timestamp);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_authorization_audit_logs_timestamp ON authorization_audit_logs (timestamp);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_authorization_audit_logs_user_id_timestamp ON authorization_audit_logs (user_id, timestamp);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_bookings_space_id_start_datetime_end_datetime ON bookings (space_id, start_datetime, end_datetime);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_bookings_status ON bookings (status);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_bookings_tenant_id ON bookings (tenant_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_bookings_user_id_status ON bookings (user_id, status);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_certifications_name ON certifications (name);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_check_in_events_booking_id ON check_in_events (booking_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_company_holidays_tenant_id_holiday_date_type ON company_holidays (tenant_id, holiday_date, type);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_company_holidays_tenant_id_is_observed ON company_holidays (tenant_id, is_observed);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_data_archive_exports_requested_at ON data_archive_exports (requested_at);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_data_archive_exports_requested_by_id ON data_archive_exports (requested_by_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_data_archive_exports_tenant_id_status ON data_archive_exports (tenant_id, status);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_data_archives_archived_at ON data_archives (archived_at);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_data_archives_archived_by_id ON data_archives (archived_by_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_data_archives_entity_type_entity_id ON data_archives (entity_type, entity_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_data_archives_exported_by_id ON data_archives (exported_by_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_data_archives_permanently_deleted_by_id ON data_archives (permanently_deleted_by_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_data_archives_restored_by_id ON data_archives (restored_by_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_data_archives_scheduled_permanent_deletion_at ON data_archives (scheduled_permanent_deletion_at);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_data_archives_tenant_id_status ON data_archives (tenant_id, status);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_delegation_of_authority_letters_delegator_user_id ON delegation_of_authority_letters (delegator_user_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_delegation_of_authority_letters_designee_user_id ON delegation_of_authority_letters (designee_user_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX "ix_delegation_of_authority_letters_status_effective_start_date~" ON delegation_of_authority_letters (status, effective_start_date, effective_end_date);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX "ix_delegation_of_authority_letters_tenant_id_delegator_user_id~" ON delegation_of_authority_letters (tenant_id, delegator_user_id, status);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX "ix_delegation_of_authority_letters_tenant_id_designee_user_id_~" ON delegation_of_authority_letters (tenant_id, designee_user_id, status);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_digital_signatures_doaletter_id_role ON digital_signatures (doaletter_id, role);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_digital_signatures_signer_user_id ON digital_signatures (signer_user_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_doaactivations_doaletter_id ON doaactivations (doaletter_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_doaactivations_start_date_end_date ON doaactivations (start_date, end_date);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_doaactivations_tenant_id_doaletter_id_is_active ON doaactivations (tenant_id, doaletter_id, is_active);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_facility_permissions_office_id_space_id_user_id ON facility_permissions (office_id, space_id, user_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_facility_permissions_role_access_level ON facility_permissions (role, access_level);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_facility_permissions_space_id ON facility_permissions (space_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_facility_permissions_user_id ON facility_permissions (user_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_file_access_logs_access_type_accessed_at ON file_access_logs (access_type, accessed_at);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_file_access_logs_accessed_by_user_id_accessed_at ON file_access_logs (accessed_by_user_id, accessed_at);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_file_access_logs_stored_file_id_accessed_at ON file_access_logs (stored_file_id, accessed_at);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_linked_in_imports_imported_by_user_id ON linked_in_imports (imported_by_user_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_linked_in_imports_resume_profile_id_status ON linked_in_imports (resume_profile_id, status);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_linked_in_imports_user_id_imported_at ON linked_in_imports (user_id, imported_at);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_offices_tenant_id_status ON offices (tenant_id, status);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_permissions_role_resource_action ON permissions (role, resource, action);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_permissions_tenant_id ON permissions (tenant_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_permissions_user_id_resource_action ON permissions (user_id, resource, action);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_person_certifications_certification_id ON person_certifications (certification_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_person_certifications_user_id_certification_id ON person_certifications (user_id, certification_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_person_skills_skill_id ON person_skills (skill_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE UNIQUE INDEX ix_person_skills_user_id_skill_id ON person_skills (user_id, skill_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_project_roles_tenant_id_wbs_element_id_status ON project_roles (tenant_id, wbs_element_id, status);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_project_roles_wbs_element_id ON project_roles (wbs_element_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_projects_program_code ON projects (program_code);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_projects_tenant_id_status ON projects (tenant_id, status);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_resume_approvals_requested_by_user_id ON resume_approvals (requested_by_user_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_resume_approvals_resume_profile_id_status ON resume_approvals (resume_profile_id, status);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_resume_approvals_resume_version_id ON resume_approvals (resume_version_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_resume_approvals_reviewed_by_user_id ON resume_approvals (reviewed_by_user_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_resume_approvals_status_requested_at ON resume_approvals (status, requested_at);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_resume_documents_generated_by_user_id ON resume_documents (generated_by_user_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_resume_documents_resume_profile_id_generated_at ON resume_documents (resume_profile_id, generated_at);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_resume_documents_resume_version_id ON resume_documents (resume_version_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_resume_documents_stored_file_id ON resume_documents (stored_file_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_resume_entries_resume_section_id ON resume_entries (resume_section_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_resume_profiles_current_version_id ON resume_profiles (current_version_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_resume_profiles_last_reviewed_by_user_id ON resume_profiles (last_reviewed_by_user_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_resume_profiles_status ON resume_profiles (status);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE UNIQUE INDEX ix_resume_profiles_user_id ON resume_profiles (user_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_resume_sections_resume_profile_id ON resume_sections (resume_profile_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_resume_sections_resume_profile_id1 ON resume_sections (resume_profile_id1);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_resume_sections_user_id_display_order ON resume_sections (user_id, display_order);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_resume_templates_stored_file_id ON resume_templates (stored_file_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_resume_templates_tenant_id_is_default ON resume_templates (tenant_id, is_default);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_resume_templates_tenant_id_type_is_active ON resume_templates (tenant_id, type, is_active);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_resume_versions_created_by_user_id ON resume_versions (created_by_user_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_resume_versions_resume_profile_id_is_active ON resume_versions (resume_profile_id, is_active);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_resume_versions_resume_profile_id_version_number ON resume_versions (resume_profile_id, version_number);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE UNIQUE INDEX ix_role_assignments_tenant_id_user_id_role ON role_assignments (tenant_id, user_id, role);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_role_assignments_user_id ON role_assignments (user_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_role_permission_templates_role_resource ON role_permission_templates (role, resource);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_role_permission_templates_tenant_id ON role_permission_templates (tenant_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE UNIQUE INDEX ix_share_point_configurations_tenant_id_is_active ON share_point_configurations (tenant_id, is_active);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE UNIQUE INDEX ix_skills_name ON skills (name);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_space_maintenance_logs_assigned_to_user_id ON space_maintenance_logs (assigned_to_user_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_space_maintenance_logs_reported_by_user_id ON space_maintenance_logs (reported_by_user_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_space_maintenance_logs_scheduled_date_status ON space_maintenance_logs (scheduled_date, status);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_space_maintenance_logs_space_id_status ON space_maintenance_logs (space_id, status);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_spaces_manager_user_id_is_active ON spaces (manager_user_id, is_active);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_spaces_office_id ON spaces (office_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_spaces_tenant_id_office_id_type ON spaces (tenant_id, office_id, type);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_stored_files_deleted_by_user_id ON stored_files (deleted_by_user_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_stored_files_file_hash ON stored_files (file_hash);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_stored_files_previous_version_id ON stored_files (previous_version_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_stored_files_storage_provider_storage_provider_id ON stored_files (storage_provider, storage_provider_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_stored_files_tenant_id_entity_type_entity_id ON stored_files (tenant_id, entity_type, entity_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_stored_files_tenant_id_is_deleted ON stored_files (tenant_id, is_deleted);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_team_calendar_members_added_by_user_id ON team_calendar_members (added_by_user_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_team_calendar_members_team_calendar_id_is_active ON team_calendar_members (team_calendar_id, is_active);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE UNIQUE INDEX ix_team_calendar_members_tenant_id_team_calendar_id_user_id ON team_calendar_members (tenant_id, team_calendar_id, user_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_team_calendar_members_user_id_is_active ON team_calendar_members (user_id, is_active);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_team_calendars_owner_user_id ON team_calendars (owner_user_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_team_calendars_tenant_id_is_active ON team_calendars (tenant_id, is_active);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_team_calendars_tenant_id_type ON team_calendars (tenant_id, type);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE UNIQUE INDEX ix_tenant_dropdown_configurations_tenant_id_category ON tenant_dropdown_configurations (tenant_id, category);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_tenant_memberships_tenant_id_is_active ON tenant_memberships (tenant_id, is_active);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE UNIQUE INDEX ix_tenant_memberships_user_id_tenant_id ON tenant_memberships (user_id, tenant_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_tenants_name ON tenants (name);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_user_invitations_tenant_id ON user_invitations (tenant_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE UNIQUE INDEX ix_users_email ON users (email);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE UNIQUE INDEX ix_users_entra_object_id ON users (entra_object_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_users_manager_id ON users (manager_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_users_tenant_id ON users (tenant_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_validation_rules_entity_type_execution_order ON validation_rules (entity_type, execution_order);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_validation_rules_tenant_id_entity_type_field_name_is_active ON validation_rules (tenant_id, entity_type, field_name, is_active);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_validation_rules_tenant_id_is_active ON validation_rules (tenant_id, is_active);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_wbs_change_histories_changed_by_user_id ON wbs_change_histories (changed_by_user_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_wbs_change_histories_wbs_element_id ON wbs_change_histories (wbs_element_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_wbs_change_histories_wbs_element_id_changed_at ON wbs_change_histories (wbs_element_id, changed_at);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_wbs_elements_approver_id ON wbs_elements (approver_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_wbs_elements_owner_id ON wbs_elements (owner_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_wbs_elements_project_id ON wbs_elements (project_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE UNIQUE INDEX ix_wbs_elements_tenant_id_code ON wbs_elements (tenant_id, code);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_work_location_preferences_booking_id ON work_location_preferences (booking_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_work_location_preferences_doaactivation_id ON work_location_preferences (doaactivation_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_work_location_preferences_office_id ON work_location_preferences (office_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE UNIQUE INDEX ix_work_location_preferences_tenant_id_user_id_work_date ON work_location_preferences (tenant_id, user_id, work_date);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_work_location_preferences_user_id ON work_location_preferences (user_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_work_location_preferences_work_date_location_type ON work_location_preferences (work_date, location_type);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_work_location_template_items_office_id ON work_location_template_items (office_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_work_location_template_items_template_id_day_offset ON work_location_template_items (template_id, day_offset);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_work_location_templates_tenant_id_user_id_is_shared ON work_location_templates (tenant_id, user_id, is_shared);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_work_location_templates_type ON work_location_templates (type);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    CREATE INDEX ix_work_location_templates_user_id ON work_location_templates (user_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    ALTER TABLE linked_in_imports ADD CONSTRAINT fk_linked_in_imports__resume_profiles_resume_profile_id FOREIGN KEY (resume_profile_id) REFERENCES resume_profiles (id) ON DELETE CASCADE;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    ALTER TABLE resume_approvals ADD CONSTRAINT fk_resume_approvals__resume_profiles_resume_profile_id FOREIGN KEY (resume_profile_id) REFERENCES resume_profiles (id) ON DELETE CASCADE;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    ALTER TABLE resume_approvals ADD CONSTRAINT fk_resume_approvals__resume_versions_resume_version_id FOREIGN KEY (resume_version_id) REFERENCES resume_versions (id) ON DELETE SET NULL;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    ALTER TABLE resume_documents ADD CONSTRAINT fk_resume_documents__resume_profiles_resume_profile_id FOREIGN KEY (resume_profile_id) REFERENCES resume_profiles (id) ON DELETE CASCADE;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    ALTER TABLE resume_documents ADD CONSTRAINT fk_resume_documents__resume_versions_resume_version_id FOREIGN KEY (resume_version_id) REFERENCES resume_versions (id) ON DELETE SET NULL;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    ALTER TABLE resume_entries ADD CONSTRAINT fk_resume_entries__resume_sections_resume_section_id FOREIGN KEY (resume_section_id) REFERENCES resume_sections (id) ON DELETE CASCADE;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    ALTER TABLE resume_profiles ADD CONSTRAINT fk_resume_profiles__resume_versions_current_version_id FOREIGN KEY (current_version_id) REFERENCES resume_versions (id) ON DELETE SET NULL;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251124153802_InitialUserOnly') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20251124153802_InitialUserOnly', '8.0.11');
    END IF;
END $EF$;
COMMIT;

START TRANSACTION;


DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251125210724_AddGroupsAndAssignmentRequests') THEN
    CREATE TABLE groups (
        id uuid NOT NULL,
        name character varying(200) NOT NULL,
        description character varying(1000),
        is_active boolean NOT NULL DEFAULT TRUE,
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone,
        created_by_user_id uuid,
        updated_by_user_id uuid,
        is_deleted boolean NOT NULL,
        deleted_at timestamp with time zone,
        deleted_by_user_id uuid,
        deletion_reason text,
        tenant_id uuid NOT NULL,
        CONSTRAINT pk_groups PRIMARY KEY (id),
        CONSTRAINT fk_groups__tenants_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251125210724_AddGroupsAndAssignmentRequests') THEN
    CREATE TABLE assignment_requests (
        id uuid NOT NULL,
        requested_by_user_id uuid NOT NULL,
        requested_for_user_id uuid NOT NULL,
        project_id uuid NOT NULL,
        wbs_element_id uuid,
        project_role_id uuid,
        start_date timestamp with time zone,
        end_date timestamp with time zone,
        allocation_pct integer NOT NULL,
        status integer NOT NULL,
        notes character varying(2000),
        approved_by_user_id uuid,
        resolved_at timestamp with time zone,
        assignment_id uuid,
        approver_group_id uuid,
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone,
        created_by_user_id uuid,
        updated_by_user_id uuid,
        is_deleted boolean NOT NULL,
        deleted_at timestamp with time zone,
        deleted_by_user_id uuid,
        deletion_reason text,
        tenant_id uuid NOT NULL,
        CONSTRAINT pk_assignment_requests PRIMARY KEY (id),
        CONSTRAINT fk_assignment_requests__groups_approver_group_id FOREIGN KEY (approver_group_id) REFERENCES groups (id) ON DELETE SET NULL,
        CONSTRAINT fk_assignment_requests__projects_project_id FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE RESTRICT,
        CONSTRAINT fk_assignment_requests__tenants_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE,
        CONSTRAINT fk_assignment_requests__users_approved_by_user_id FOREIGN KEY (approved_by_user_id) REFERENCES users (id) ON DELETE SET NULL,
        CONSTRAINT fk_assignment_requests__users_requested_by_user_id FOREIGN KEY (requested_by_user_id) REFERENCES users (id) ON DELETE RESTRICT,
        CONSTRAINT fk_assignment_requests__users_requested_for_user_id FOREIGN KEY (requested_for_user_id) REFERENCES users (id) ON DELETE RESTRICT,
        CONSTRAINT fk_assignment_requests__wbs_elements_wbs_element_id FOREIGN KEY (wbs_element_id) REFERENCES wbs_elements (id) ON DELETE SET NULL,
        CONSTRAINT fk_assignment_requests_assignments_assignment_id FOREIGN KEY (assignment_id) REFERENCES assignments (id) ON DELETE SET NULL
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251125210724_AddGroupsAndAssignmentRequests') THEN
    CREATE TABLE group_members (
        id uuid NOT NULL,
        group_id uuid NOT NULL,
        user_id uuid NOT NULL,
        role integer NOT NULL,
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone,
        created_by_user_id uuid,
        updated_by_user_id uuid,
        is_deleted boolean NOT NULL,
        deleted_at timestamp with time zone,
        deleted_by_user_id uuid,
        deletion_reason text,
        tenant_id uuid NOT NULL,
        CONSTRAINT pk_group_members PRIMARY KEY (id),
        CONSTRAINT fk_group_members__tenants_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE,
        CONSTRAINT fk_group_members__users_user_id FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        CONSTRAINT fk_group_members_groups_group_id FOREIGN KEY (group_id) REFERENCES groups (id) ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251125210724_AddGroupsAndAssignmentRequests') THEN
    CREATE INDEX ix_assignment_requests_approved_by_user_id ON assignment_requests (approved_by_user_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251125210724_AddGroupsAndAssignmentRequests') THEN
    CREATE INDEX ix_assignment_requests_approver_group_id_status ON assignment_requests (approver_group_id, status);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251125210724_AddGroupsAndAssignmentRequests') THEN
    CREATE INDEX ix_assignment_requests_assignment_id ON assignment_requests (assignment_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251125210724_AddGroupsAndAssignmentRequests') THEN
    CREATE INDEX ix_assignment_requests_project_id ON assignment_requests (project_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251125210724_AddGroupsAndAssignmentRequests') THEN
    CREATE INDEX ix_assignment_requests_requested_by_user_id ON assignment_requests (requested_by_user_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251125210724_AddGroupsAndAssignmentRequests') THEN
    CREATE INDEX ix_assignment_requests_requested_for_user_id ON assignment_requests (requested_for_user_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251125210724_AddGroupsAndAssignmentRequests') THEN
    CREATE INDEX ix_assignment_requests_tenant_id_requested_for_user_id_status ON assignment_requests (tenant_id, requested_for_user_id, status);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251125210724_AddGroupsAndAssignmentRequests') THEN
    CREATE INDEX ix_assignment_requests_tenant_id_status ON assignment_requests (tenant_id, status);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251125210724_AddGroupsAndAssignmentRequests') THEN
    CREATE INDEX ix_assignment_requests_wbs_element_id ON assignment_requests (wbs_element_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251125210724_AddGroupsAndAssignmentRequests') THEN
    CREATE INDEX ix_group_members_group_id_role ON group_members (group_id, role);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251125210724_AddGroupsAndAssignmentRequests') THEN
    CREATE UNIQUE INDEX ix_group_members_tenant_id_group_id_user_id ON group_members (tenant_id, group_id, user_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251125210724_AddGroupsAndAssignmentRequests') THEN
    CREATE INDEX ix_group_members_user_id ON group_members (user_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251125210724_AddGroupsAndAssignmentRequests') THEN
    CREATE INDEX ix_groups_tenant_id_is_active ON groups (tenant_id, is_active);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251125210724_AddGroupsAndAssignmentRequests') THEN
    CREATE UNIQUE INDEX ix_groups_tenant_id_name ON groups (tenant_id, name);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251125210724_AddGroupsAndAssignmentRequests') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20251125210724_AddGroupsAndAssignmentRequests', '8.0.11');
    END IF;
END $EF$;
COMMIT;

START TRANSACTION;


DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251125220223_AddWbsApproverGroup') THEN
    ALTER TABLE wbs_elements ADD approver_group_id uuid;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251125220223_AddWbsApproverGroup') THEN
    CREATE INDEX ix_wbs_elements_approver_group_id ON wbs_elements (approver_group_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251125220223_AddWbsApproverGroup') THEN
    ALTER TABLE wbs_elements ADD CONSTRAINT fk_wbs_elements_groups_approver_group_id FOREIGN KEY (approver_group_id) REFERENCES groups (id) ON DELETE SET NULL;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251125220223_AddWbsApproverGroup') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20251125220223_AddWbsApproverGroup', '8.0.11');
    END IF;
END $EF$;
COMMIT;

START TRANSACTION;


DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251125225229_AddAssignmentHistoryNotes') THEN
    ALTER TABLE assignment_history ADD notes text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251125225229_AddAssignmentHistoryNotes') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20251125225229_AddAssignmentHistoryNotes', '8.0.11');
    END IF;
END $EF$;
COMMIT;

START TRANSACTION;


DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251126130911_AddProjectAssignmentsTwoStepModel') THEN
    ALTER TABLE assignments ADD project_assignment_id uuid;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251126130911_AddProjectAssignmentsTwoStepModel') THEN
    CREATE TABLE project_assignments (
        id uuid NOT NULL,
        user_id uuid NOT NULL,
        project_id uuid NOT NULL,
        start_date timestamp with time zone NOT NULL,
        end_date timestamp with time zone,
        status integer NOT NULL,
        notes text,
        approved_by_user_id uuid,
        approved_at timestamp with time zone,
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone,
        created_by_user_id uuid,
        updated_by_user_id uuid,
        is_deleted boolean NOT NULL,
        deleted_at timestamp with time zone,
        deleted_by_user_id uuid,
        deletion_reason text,
        tenant_id uuid NOT NULL,
        CONSTRAINT pk_project_assignments PRIMARY KEY (id),
        CONSTRAINT fk_project_assignments__tenants_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE,
        CONSTRAINT fk_project_assignments__users_approved_by_user_id FOREIGN KEY (approved_by_user_id) REFERENCES users (id) ON DELETE SET NULL,
        CONSTRAINT fk_project_assignments__users_user_id FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        CONSTRAINT fk_project_assignments_projects_project_id FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE RESTRICT
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251126130911_AddProjectAssignmentsTwoStepModel') THEN
    CREATE INDEX ix_assignments_project_assignment_id_status ON assignments (project_assignment_id, status);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251126130911_AddProjectAssignmentsTwoStepModel') THEN
    CREATE INDEX ix_project_assignments_approved_by_user_id ON project_assignments (approved_by_user_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251126130911_AddProjectAssignmentsTwoStepModel') THEN
    CREATE INDEX ix_project_assignments_project_id_status ON project_assignments (project_id, status);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251126130911_AddProjectAssignmentsTwoStepModel') THEN
    CREATE INDEX ix_project_assignments_start_date_end_date ON project_assignments (start_date, end_date);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251126130911_AddProjectAssignmentsTwoStepModel') THEN
    CREATE INDEX ix_project_assignments_tenant_id_user_id_status ON project_assignments (tenant_id, user_id, status);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251126130911_AddProjectAssignmentsTwoStepModel') THEN
    CREATE INDEX ix_project_assignments_user_id ON project_assignments (user_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251126130911_AddProjectAssignmentsTwoStepModel') THEN
    ALTER TABLE assignments ADD CONSTRAINT fk_assignments__project_assignments_project_assignment_id FOREIGN KEY (project_assignment_id) REFERENCES project_assignments (id) ON DELETE SET NULL;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251126130911_AddProjectAssignmentsTwoStepModel') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20251126130911_AddProjectAssignmentsTwoStepModel', '8.0.11');
    END IF;
END $EF$;
COMMIT;

START TRANSACTION;


DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251126170318_AddDefaultDelegateToUser') THEN
    ALTER TABLE users ADD default_delegate_id uuid;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251126170318_AddDefaultDelegateToUser') THEN
    ALTER TABLE users ADD default_delegate_user_id uuid;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251126170318_AddDefaultDelegateToUser') THEN
    CREATE INDEX ix_users_default_delegate_id ON users (default_delegate_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251126170318_AddDefaultDelegateToUser') THEN
    ALTER TABLE users ADD CONSTRAINT fk_users_users_default_delegate_id FOREIGN KEY (default_delegate_id) REFERENCES users (id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251126170318_AddDefaultDelegateToUser') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20251126170318_AddDefaultDelegateToUser', '8.0.11');
    END IF;
END $EF$;
COMMIT;

START TRANSACTION;


DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251126171808_EnhanceDOAWithTemplatesAndSettings') THEN
    ALTER TABLE digital_signatures ADD signature_type integer NOT NULL DEFAULT 0;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251126171808_EnhanceDOAWithTemplatesAndSettings') THEN
    ALTER TABLE digital_signatures ADD typed_signature text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251126171808_EnhanceDOAWithTemplatesAndSettings') THEN
    ALTER TABLE delegation_of_authority_letters ADD subject_line text NOT NULL DEFAULT '';
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251126171808_EnhanceDOAWithTemplatesAndSettings') THEN
    CREATE TABLE doatemplates (
        id uuid NOT NULL,
        tenant_id uuid NOT NULL,
        name text NOT NULL,
        description text NOT NULL,
        letter_content text NOT NULL,
        is_default boolean NOT NULL,
        is_active boolean NOT NULL,
        sort_order integer NOT NULL,
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone,
        created_by_user_id uuid,
        updated_by_user_id uuid,
        is_deleted boolean NOT NULL,
        deleted_at timestamp with time zone,
        deleted_by_user_id uuid,
        deletion_reason text,
        CONSTRAINT pk_doatemplates PRIMARY KEY (id),
        CONSTRAINT fk_doatemplates__tenants_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251126171808_EnhanceDOAWithTemplatesAndSettings') THEN
    CREATE TABLE tenant_settings (
        id uuid NOT NULL,
        tenant_id uuid NOT NULL,
        logo_url text,
        logo_file_name text,
        logo_width integer,
        logo_height integer,
        doaprint_header_content text,
        doaprint_footer_content text,
        doaprint_letterhead text,
        company_name text,
        company_address text,
        company_phone text,
        company_email text,
        company_website text,
        primary_color text,
        secondary_color text,
        font_family text,
        font_size integer,
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone,
        created_by_user_id uuid,
        updated_by_user_id uuid,
        is_deleted boolean NOT NULL,
        deleted_at timestamp with time zone,
        deleted_by_user_id uuid,
        deletion_reason text,
        CONSTRAINT pk_tenant_settings PRIMARY KEY (id),
        CONSTRAINT fk_tenant_settings_tenants_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251126171808_EnhanceDOAWithTemplatesAndSettings') THEN
    CREATE INDEX ix_doatemplates_tenant_id ON doatemplates (tenant_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251126171808_EnhanceDOAWithTemplatesAndSettings') THEN
    CREATE INDEX ix_tenant_settings_tenant_id ON tenant_settings (tenant_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251126171808_EnhanceDOAWithTemplatesAndSettings') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20251126171808_EnhanceDOAWithTemplatesAndSettings', '8.0.11');
    END IF;
END $EF$;
COMMIT;

START TRANSACTION;


DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251127125515_AddNotificationBannerSettings') THEN
    ALTER TABLE tenant_settings ADD environment_name text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251127125515_AddNotificationBannerSettings') THEN
    ALTER TABLE tenant_settings ADD notification_banner_enabled boolean NOT NULL DEFAULT FALSE;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251127125515_AddNotificationBannerSettings') THEN
    ALTER TABLE tenant_settings ADD notification_banner_expires_at timestamp with time zone;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251127125515_AddNotificationBannerSettings') THEN
    ALTER TABLE tenant_settings ADD notification_banner_message text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251127125515_AddNotificationBannerSettings') THEN
    ALTER TABLE tenant_settings ADD notification_banner_type text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251127125515_AddNotificationBannerSettings') THEN
    ALTER TABLE tenant_settings ADD show_environment_banner boolean NOT NULL DEFAULT FALSE;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251127125515_AddNotificationBannerSettings') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20251127125515_AddNotificationBannerSettings', '8.0.11');
    END IF;
END $EF$;
COMMIT;

START TRANSACTION;


DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251127134136_AddOfficeLocationFields') THEN
    ALTER TABLE offices ADD city text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251127134136_AddOfficeLocationFields') THEN
    ALTER TABLE offices ADD country_code text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251127134136_AddOfficeLocationFields') THEN
    ALTER TABLE offices ADD icon_url text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251127134136_AddOfficeLocationFields') THEN
    ALTER TABLE offices ADD latitude double precision;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251127134136_AddOfficeLocationFields') THEN
    ALTER TABLE offices ADD longitude double precision;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251127134136_AddOfficeLocationFields') THEN
    ALTER TABLE offices ADD state_code text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251127134136_AddOfficeLocationFields') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20251127134136_AddOfficeLocationFields', '8.0.11');
    END IF;
END $EF$;
COMMIT;

START TRANSACTION;


DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251127134832_AddOfficeAddress2Field') THEN
    ALTER TABLE offices ADD address2 text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251127134832_AddOfficeAddress2Field') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20251127134832_AddOfficeAddress2Field', '8.0.11');
    END IF;
END $EF$;
COMMIT;

START TRANSACTION;


DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251128105005_AddFacilitiesEntities') THEN
    ALTER TABLE spaces ADD availability_type integer NOT NULL DEFAULT 0;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251128105005_AddFacilitiesEntities') THEN
    ALTER TABLE spaces ADD floor_id uuid;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251128105005_AddFacilitiesEntities') THEN
    ALTER TABLE spaces ADD zone_id uuid;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251128105005_AddFacilitiesEntities') THEN
    CREATE TABLE booking_rules (
        id uuid NOT NULL,
        office_id uuid,
        space_id uuid,
        space_type integer,
        name character varying(200) NOT NULL,
        description character varying(1000),
        min_duration_minutes integer,
        max_duration_minutes integer,
        min_advance_booking_minutes integer,
        max_advance_booking_days integer,
        earliest_start_time time without time zone,
        latest_end_time time without time zone,
        allowed_days_of_week character varying(50),
        allow_recurring boolean NOT NULL,
        max_recurring_weeks integer,
        requires_approval boolean NOT NULL,
        auto_approve_for_roles boolean NOT NULL,
        auto_approve_roles character varying(500),
        max_bookings_per_user_per_day integer,
        max_bookings_per_user_per_week integer,
        is_active boolean NOT NULL,
        priority integer NOT NULL,
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone,
        created_by_user_id uuid,
        updated_by_user_id uuid,
        is_deleted boolean NOT NULL,
        deleted_at timestamp with time zone,
        deleted_by_user_id uuid,
        deletion_reason text,
        tenant_id uuid NOT NULL,
        CONSTRAINT pk_booking_rules PRIMARY KEY (id),
        CONSTRAINT fk_booking_rules__offices_office_id FOREIGN KEY (office_id) REFERENCES offices (id) ON DELETE CASCADE,
        CONSTRAINT fk_booking_rules__spaces_space_id FOREIGN KEY (space_id) REFERENCES spaces (id) ON DELETE CASCADE,
        CONSTRAINT fk_booking_rules__tenants_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251128105005_AddFacilitiesEntities') THEN
    CREATE TABLE floors (
        id uuid NOT NULL,
        office_id uuid NOT NULL,
        name character varying(100) NOT NULL,
        level integer NOT NULL,
        floor_plan_url text,
        square_footage numeric,
        is_active boolean NOT NULL,
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone,
        created_by_user_id uuid,
        updated_by_user_id uuid,
        is_deleted boolean NOT NULL,
        deleted_at timestamp with time zone,
        deleted_by_user_id uuid,
        deletion_reason text,
        tenant_id uuid NOT NULL,
        CONSTRAINT pk_floors PRIMARY KEY (id),
        CONSTRAINT fk_floors__offices_office_id FOREIGN KEY (office_id) REFERENCES offices (id) ON DELETE CASCADE,
        CONSTRAINT fk_floors__tenants_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251128105005_AddFacilitiesEntities') THEN
    CREATE TABLE space_assignments (
        id uuid NOT NULL,
        space_id uuid NOT NULL,
        user_id uuid NOT NULL,
        start_date date NOT NULL,
        end_date date,
        type integer NOT NULL,
        notes character varying(1000),
        status integer NOT NULL,
        approved_by_user_id uuid,
        approved_at timestamp with time zone,
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone,
        created_by_user_id uuid,
        updated_by_user_id uuid,
        is_deleted boolean NOT NULL,
        deleted_at timestamp with time zone,
        deleted_by_user_id uuid,
        deletion_reason text,
        tenant_id uuid NOT NULL,
        CONSTRAINT pk_space_assignments PRIMARY KEY (id),
        CONSTRAINT fk_space_assignments__tenants_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE,
        CONSTRAINT fk_space_assignments__users_approved_by_user_id FOREIGN KEY (approved_by_user_id) REFERENCES users (id) ON DELETE SET NULL,
        CONSTRAINT fk_space_assignments__users_user_id FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        CONSTRAINT fk_space_assignments_spaces_space_id FOREIGN KEY (space_id) REFERENCES spaces (id) ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251128105005_AddFacilitiesEntities') THEN
    CREATE TABLE zones (
        id uuid NOT NULL,
        floor_id uuid NOT NULL,
        name character varying(100) NOT NULL,
        description character varying(500),
        color character varying(7),
        is_active boolean NOT NULL,
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone,
        created_by_user_id uuid,
        updated_by_user_id uuid,
        is_deleted boolean NOT NULL,
        deleted_at timestamp with time zone,
        deleted_by_user_id uuid,
        deletion_reason text,
        tenant_id uuid NOT NULL,
        CONSTRAINT pk_zones PRIMARY KEY (id),
        CONSTRAINT fk_zones_floors_floor_id FOREIGN KEY (floor_id) REFERENCES floors (id) ON DELETE CASCADE,
        CONSTRAINT fk_zones_tenants_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251128105005_AddFacilitiesEntities') THEN
    CREATE INDEX ix_spaces_floor_id_zone_id ON spaces (floor_id, zone_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251128105005_AddFacilitiesEntities') THEN
    CREATE INDEX ix_spaces_zone_id ON spaces (zone_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251128105005_AddFacilitiesEntities') THEN
    CREATE INDEX ix_booking_rules_office_id ON booking_rules (office_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251128105005_AddFacilitiesEntities') THEN
    CREATE INDEX ix_booking_rules_priority ON booking_rules (priority);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251128105005_AddFacilitiesEntities') THEN
    CREATE INDEX ix_booking_rules_space_id ON booking_rules (space_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251128105005_AddFacilitiesEntities') THEN
    CREATE INDEX ix_booking_rules_space_type_is_active ON booking_rules (space_type, is_active);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251128105005_AddFacilitiesEntities') THEN
    CREATE INDEX ix_booking_rules_tenant_id_office_id_is_active ON booking_rules (tenant_id, office_id, is_active);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251128105005_AddFacilitiesEntities') THEN
    CREATE INDEX ix_floors_office_id_is_active ON floors (office_id, is_active);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251128105005_AddFacilitiesEntities') THEN
    CREATE INDEX ix_floors_tenant_id_office_id_level ON floors (tenant_id, office_id, level);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251128105005_AddFacilitiesEntities') THEN
    CREATE INDEX ix_space_assignments_approved_by_user_id ON space_assignments (approved_by_user_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251128105005_AddFacilitiesEntities') THEN
    CREATE INDEX ix_space_assignments_space_id ON space_assignments (space_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251128105005_AddFacilitiesEntities') THEN
    CREATE INDEX ix_space_assignments_start_date_end_date ON space_assignments (start_date, end_date);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251128105005_AddFacilitiesEntities') THEN
    CREATE INDEX ix_space_assignments_tenant_id_space_id_status ON space_assignments (tenant_id, space_id, status);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251128105005_AddFacilitiesEntities') THEN
    CREATE INDEX ix_space_assignments_tenant_id_user_id_status ON space_assignments (tenant_id, user_id, status);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251128105005_AddFacilitiesEntities') THEN
    CREATE INDEX ix_space_assignments_user_id ON space_assignments (user_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251128105005_AddFacilitiesEntities') THEN
    CREATE INDEX ix_zones_floor_id_is_active ON zones (floor_id, is_active);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251128105005_AddFacilitiesEntities') THEN
    CREATE INDEX ix_zones_tenant_id_floor_id ON zones (tenant_id, floor_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251128105005_AddFacilitiesEntities') THEN
    ALTER TABLE spaces ADD CONSTRAINT fk_spaces__zones_zone_id FOREIGN KEY (zone_id) REFERENCES zones (id) ON DELETE SET NULL;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251128105005_AddFacilitiesEntities') THEN
    ALTER TABLE spaces ADD CONSTRAINT fk_spaces_floors_floor_id FOREIGN KEY (floor_id) REFERENCES floors (id) ON DELETE SET NULL;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251128105005_AddFacilitiesEntities') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20251128105005_AddFacilitiesEntities', '8.0.11');
    END IF;
END $EF$;
COMMIT;

START TRANSACTION;


DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251128115648_AddBookingEnhancements') THEN
    ALTER TABLE bookings ALTER COLUMN end_datetime DROP NOT NULL;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251128115648_AddBookingEnhancements') THEN
    ALTER TABLE bookings ADD booked_at timestamp with time zone NOT NULL DEFAULT TIMESTAMPTZ '-infinity';
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251128115648_AddBookingEnhancements') THEN
    ALTER TABLE bookings ADD booked_by_user_id uuid;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251128115648_AddBookingEnhancements') THEN
    ALTER TABLE bookings ADD is_permanent boolean NOT NULL DEFAULT FALSE;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251128115648_AddBookingEnhancements') THEN
    CREATE INDEX ix_bookings_booked_by_user_id ON bookings (booked_by_user_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251128115648_AddBookingEnhancements') THEN
    CREATE INDEX ix_bookings_is_permanent ON bookings (is_permanent);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251128115648_AddBookingEnhancements') THEN
    ALTER TABLE bookings ADD CONSTRAINT fk_bookings__users_booked_by_user_id FOREIGN KEY (booked_by_user_id) REFERENCES users (id) ON DELETE SET NULL;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251128115648_AddBookingEnhancements') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20251128115648_AddBookingEnhancements', '8.0.11');
    END IF;
END $EF$;
COMMIT;

START TRANSACTION;


DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251128121344_EnhanceCheckInEvents') THEN
    ALTER TABLE check_in_events ADD check_in_date date NOT NULL DEFAULT DATE '-infinity';
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251128121344_EnhanceCheckInEvents') THEN
    ALTER TABLE check_in_events ADD status integer NOT NULL DEFAULT 0;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251128121344_EnhanceCheckInEvents') THEN
    CREATE UNIQUE INDEX ix_check_in_events_booking_id_check_in_date ON check_in_events (booking_id, check_in_date);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251128121344_EnhanceCheckInEvents') THEN
    CREATE INDEX ix_check_in_events_processed_by_user_id ON check_in_events (processed_by_user_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251128121344_EnhanceCheckInEvents') THEN
    ALTER TABLE check_in_events ADD CONSTRAINT fk_check_in_events__users_processed_by_user_id FOREIGN KEY (processed_by_user_id) REFERENCES users (id) ON DELETE SET NULL;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251128121344_EnhanceCheckInEvents') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20251128121344_EnhanceCheckInEvents', '8.0.11');
    END IF;
END $EF$;
COMMIT;

START TRANSACTION;


DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251128204214_FixResumeSectionForeignKey') THEN
    ALTER TABLE resume_sections DROP CONSTRAINT fk_resume_sections_resume_profiles_resume_profile_id1;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251128204214_FixResumeSectionForeignKey') THEN
    DROP INDEX ix_resume_sections_resume_profile_id1;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251128204214_FixResumeSectionForeignKey') THEN
    ALTER TABLE resume_sections DROP COLUMN resume_profile_id1;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251128204214_FixResumeSectionForeignKey') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20251128204214_FixResumeSectionForeignKey', '8.0.11');
    END IF;
END $EF$;
COMMIT;

START TRANSACTION;


DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251128212040_AddSkillIsApproved') THEN
    ALTER TABLE skills ADD is_approved boolean NOT NULL DEFAULT FALSE;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251128212040_AddSkillIsApproved') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20251128212040_AddSkillIsApproved', '8.0.11');
    END IF;
END $EF$;
COMMIT;

START TRANSACTION;


DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251129105521_AddResumeShareLink') THEN
    CREATE TABLE resume_share_links (
        id uuid NOT NULL,
        resume_profile_id uuid NOT NULL,
        resume_version_id uuid,
        share_token character varying(50) NOT NULL,
        expires_at timestamp with time zone,
        password_hash character varying(100),
        visible_sections character varying(500),
        hide_contact_info boolean NOT NULL DEFAULT FALSE,
        view_count integer NOT NULL DEFAULT 0,
        is_active boolean NOT NULL DEFAULT TRUE,
        created_by_user_id uuid NOT NULL,
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone,
        updated_by_user_id uuid,
        is_deleted boolean NOT NULL,
        deleted_at timestamp with time zone,
        deleted_by_user_id uuid,
        deletion_reason text,
        CONSTRAINT pk_resume_share_links PRIMARY KEY (id),
        CONSTRAINT fk_resume_share_links__resume_versions_resume_version_id FOREIGN KEY (resume_version_id) REFERENCES resume_versions (id) ON DELETE SET NULL,
        CONSTRAINT fk_resume_share_links__users_created_by_user_id FOREIGN KEY (created_by_user_id) REFERENCES users (id) ON DELETE RESTRICT,
        CONSTRAINT fk_resume_share_links_resume_profiles_resume_profile_id FOREIGN KEY (resume_profile_id) REFERENCES resume_profiles (id) ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251129105521_AddResumeShareLink') THEN
    CREATE INDEX ix_resume_share_links_created_by_user_id ON resume_share_links (created_by_user_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251129105521_AddResumeShareLink') THEN
    CREATE INDEX ix_resume_share_links_resume_profile_id_is_active ON resume_share_links (resume_profile_id, is_active);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251129105521_AddResumeShareLink') THEN
    CREATE INDEX ix_resume_share_links_resume_version_id ON resume_share_links (resume_version_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251129105521_AddResumeShareLink') THEN
    CREATE UNIQUE INDEX ix_resume_share_links_share_token ON resume_share_links (share_token);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251129105521_AddResumeShareLink') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20251129105521_AddResumeShareLink', '8.0.11');
    END IF;
END $EF$;
COMMIT;

START TRANSACTION;


DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251130212334_AddDayPortionToWorkLocation') THEN
    ALTER TABLE work_location_template_items ADD day_portion integer NOT NULL DEFAULT 0;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251130212334_AddDayPortionToWorkLocation') THEN
    ALTER TABLE work_location_preferences ADD day_portion integer NOT NULL DEFAULT 0;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251130212334_AddDayPortionToWorkLocation') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20251130212334_AddDayPortionToWorkLocation', '8.0.11');
    END IF;
END $EF$;
COMMIT;

START TRANSACTION;


DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251130220154_UpdateWorkLocationPreferenceUniqueIndexWithDayPortion') THEN
    DROP INDEX ix_work_location_preferences_tenant_id_user_id_work_date;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251130220154_UpdateWorkLocationPreferenceUniqueIndexWithDayPortion') THEN
    CREATE UNIQUE INDEX "ix_work_location_preferences_tenant_id_user_id_work_date_day_p~" ON work_location_preferences (tenant_id, user_id, work_date, day_portion);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251130220154_UpdateWorkLocationPreferenceUniqueIndexWithDayPortion') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20251130220154_UpdateWorkLocationPreferenceUniqueIndexWithDayPortion', '8.0.11');
    END IF;
END $EF$;
COMMIT;

START TRANSACTION;


DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251130230635_AddHolidayRecurrenceAndAutoApply') THEN
    ALTER TABLE company_holidays ADD auto_apply_to_forecast boolean NOT NULL DEFAULT FALSE;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251130230635_AddHolidayRecurrenceAndAutoApply') THEN
    ALTER TABLE company_holidays ADD auto_apply_to_schedule boolean NOT NULL DEFAULT FALSE;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251130230635_AddHolidayRecurrenceAndAutoApply') THEN
    ALTER TABLE company_holidays ADD is_active boolean NOT NULL DEFAULT FALSE;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251130230635_AddHolidayRecurrenceAndAutoApply') THEN
    ALTER TABLE company_holidays ADD recurrence_rule integer;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251130230635_AddHolidayRecurrenceAndAutoApply') THEN
    ALTER TABLE company_holidays ADD recurring_day integer;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251130230635_AddHolidayRecurrenceAndAutoApply') THEN
    ALTER TABLE company_holidays ADD recurring_month integer;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251130230635_AddHolidayRecurrenceAndAutoApply') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20251130230635_AddHolidayRecurrenceAndAutoApply', '8.0.11');
    END IF;
END $EF$;
COMMIT;

START TRANSACTION;


DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251130232436_AddEnhancedStaffingModule') THEN
    ALTER TABLE wbs_elements ADD budgeted_hours numeric;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251130232436_AddEnhancedStaffingModule') THEN
    ALTER TABLE wbs_elements ADD target_hours_per_month numeric;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251130232436_AddEnhancedStaffingModule') THEN
    ALTER TABLE users ADD career_job_family_id uuid;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251130232436_AddEnhancedStaffingModule') THEN
    ALTER TABLE users ADD career_level integer;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251130232436_AddEnhancedStaffingModule') THEN
    ALTER TABLE users ADD is_hourly boolean NOT NULL DEFAULT FALSE;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251130232436_AddEnhancedStaffingModule') THEN
    ALTER TABLE users ADD position_title character varying(200);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251130232436_AddEnhancedStaffingModule') THEN
    ALTER TABLE users ADD standard_hours_per_week numeric(5,2);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251130232436_AddEnhancedStaffingModule') THEN
    ALTER TABLE projects ADD budgeted_hours numeric;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251130232436_AddEnhancedStaffingModule') THEN
    ALTER TABLE projects ADD target_hours_per_month numeric;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251130232436_AddEnhancedStaffingModule') THEN
    ALTER TABLE projects ADD type integer NOT NULL DEFAULT 0;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251130232436_AddEnhancedStaffingModule') THEN
    CREATE TABLE career_job_families (
        id uuid NOT NULL,
        name character varying(200) NOT NULL,
        description character varying(500),
        code character varying(50),
        sort_order integer NOT NULL,
        is_active boolean NOT NULL,
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone,
        created_by_user_id uuid,
        updated_by_user_id uuid,
        is_deleted boolean NOT NULL,
        deleted_at timestamp with time zone,
        deleted_by_user_id uuid,
        deletion_reason text,
        tenant_id uuid NOT NULL,
        CONSTRAINT pk_career_job_families PRIMARY KEY (id),
        CONSTRAINT fk_career_job_families__tenants_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251130232436_AddEnhancedStaffingModule') THEN
    CREATE TABLE forecast_approval_schedules (
        id uuid NOT NULL,
        name character varying(200) NOT NULL,
        is_default boolean NOT NULL,
        submission_deadline_day integer NOT NULL,
        approval_deadline_day integer NOT NULL,
        lock_day integer NOT NULL,
        forecast_months_ahead integer NOT NULL,
        is_active boolean NOT NULL,
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone,
        created_by_user_id uuid,
        updated_by_user_id uuid,
        is_deleted boolean NOT NULL,
        deleted_at timestamp with time zone,
        deleted_by_user_id uuid,
        deletion_reason text,
        tenant_id uuid NOT NULL,
        CONSTRAINT pk_forecast_approval_schedules PRIMARY KEY (id),
        CONSTRAINT fk_forecast_approval_schedules__tenants_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251130232436_AddEnhancedStaffingModule') THEN
    CREATE TABLE forecast_versions (
        id uuid NOT NULL,
        name character varying(200) NOT NULL,
        description character varying(1000),
        type integer NOT NULL,
        project_id uuid,
        user_id uuid,
        is_current boolean NOT NULL,
        version_number integer NOT NULL,
        based_on_version_id uuid,
        start_year integer NOT NULL,
        start_month integer NOT NULL,
        end_year integer NOT NULL,
        end_month integer NOT NULL,
        promoted_at timestamp with time zone,
        promoted_by_user_id uuid,
        archived_at timestamp with time zone,
        archive_reason character varying(500),
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone,
        created_by_user_id uuid,
        updated_by_user_id uuid,
        is_deleted boolean NOT NULL,
        deleted_at timestamp with time zone,
        deleted_by_user_id uuid,
        deletion_reason text,
        tenant_id uuid NOT NULL,
        CONSTRAINT pk_forecast_versions PRIMARY KEY (id),
        CONSTRAINT fk_forecast_versions__projects_project_id FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE SET NULL,
        CONSTRAINT fk_forecast_versions__tenants_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE,
        CONSTRAINT fk_forecast_versions__users_promoted_by_user_id FOREIGN KEY (promoted_by_user_id) REFERENCES users (id) ON DELETE SET NULL,
        CONSTRAINT fk_forecast_versions__users_user_id FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL,
        CONSTRAINT fk_forecast_versions_forecast_versions_based_on_version_id FOREIGN KEY (based_on_version_id) REFERENCES forecast_versions (id) ON DELETE SET NULL
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251130232436_AddEnhancedStaffingModule') THEN
    CREATE TABLE labor_categories (
        id uuid NOT NULL,
        project_id uuid NOT NULL,
        name character varying(200) NOT NULL,
        code character varying(50),
        description character varying(500),
        bill_rate numeric(18,2),
        cost_rate numeric(18,2),
        is_active boolean NOT NULL,
        sort_order integer NOT NULL,
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone,
        created_by_user_id uuid,
        updated_by_user_id uuid,
        is_deleted boolean NOT NULL,
        deleted_at timestamp with time zone,
        deleted_by_user_id uuid,
        deletion_reason text,
        tenant_id uuid NOT NULL,
        CONSTRAINT pk_labor_categories PRIMARY KEY (id),
        CONSTRAINT fk_labor_categories__projects_project_id FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
        CONSTRAINT fk_labor_categories__tenants_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251130232436_AddEnhancedStaffingModule') THEN
    CREATE TABLE subcontractor_companies (
        id uuid NOT NULL,
        name character varying(200) NOT NULL,
        code character varying(50),
        address character varying(500),
        city character varying(100),
        state character varying(100),
        country character varying(100),
        postal_code character varying(20),
        phone character varying(50),
        website character varying(500),
        primary_contact_user_id uuid,
        forecast_contact_name character varying(200),
        forecast_contact_email character varying(255),
        forecast_contact_phone character varying(50),
        status integer NOT NULL,
        notes character varying(2000),
        contract_number character varying(100),
        contract_start_date date,
        contract_end_date date,
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone,
        created_by_user_id uuid,
        updated_by_user_id uuid,
        is_deleted boolean NOT NULL,
        deleted_at timestamp with time zone,
        deleted_by_user_id uuid,
        deletion_reason text,
        tenant_id uuid NOT NULL,
        CONSTRAINT pk_subcontractor_companies PRIMARY KEY (id),
        CONSTRAINT fk_subcontractor_companies__tenants_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE,
        CONSTRAINT fk_subcontractor_companies__users_primary_contact_user_id FOREIGN KEY (primary_contact_user_id) REFERENCES users (id) ON DELETE SET NULL
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251130232436_AddEnhancedStaffingModule') THEN
    CREATE TABLE forecast_import_exports (
        id uuid NOT NULL,
        type integer NOT NULL,
        operation_at timestamp with time zone NOT NULL,
        operation_by_user_id uuid NOT NULL,
        project_id uuid,
        forecast_version_id uuid,
        year integer,
        month integer,
        file_name character varying(500) NOT NULL,
        file_format character varying(10) NOT NULL,
        file_size_bytes bigint NOT NULL,
        file_hash character varying(64),
        status integer NOT NULL,
        records_processed integer NOT NULL,
        records_succeeded integer NOT NULL,
        records_failed integer NOT NULL,
        error_details jsonb,
        resulting_version_id uuid,
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone,
        created_by_user_id uuid,
        updated_by_user_id uuid,
        is_deleted boolean NOT NULL,
        deleted_at timestamp with time zone,
        deleted_by_user_id uuid,
        deletion_reason text,
        tenant_id uuid NOT NULL,
        CONSTRAINT pk_forecast_import_exports PRIMARY KEY (id),
        CONSTRAINT fk_forecast_import_exports__forecast_versions_forecast_version_id FOREIGN KEY (forecast_version_id) REFERENCES forecast_versions (id) ON DELETE SET NULL,
        CONSTRAINT "fk_forecast_import_exports__forecast_versions_resulting_version_~" FOREIGN KEY (resulting_version_id) REFERENCES forecast_versions (id) ON DELETE SET NULL,
        CONSTRAINT fk_forecast_import_exports__projects_project_id FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE SET NULL,
        CONSTRAINT fk_forecast_import_exports__tenants_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE,
        CONSTRAINT fk_forecast_import_exports__users_operation_by_user_id FOREIGN KEY (operation_by_user_id) REFERENCES users (id) ON DELETE RESTRICT
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251130232436_AddEnhancedStaffingModule') THEN
    CREATE TABLE subcontractors (
        id uuid NOT NULL,
        subcontractor_company_id uuid NOT NULL,
        first_name character varying(100) NOT NULL,
        last_name character varying(100) NOT NULL,
        email character varying(255),
        phone character varying(50),
        position_title character varying(200),
        career_job_family_id uuid,
        career_level integer,
        is_forecast_submitter boolean NOT NULL,
        status integer NOT NULL,
        notes character varying(2000),
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone,
        created_by_user_id uuid,
        updated_by_user_id uuid,
        is_deleted boolean NOT NULL,
        deleted_at timestamp with time zone,
        deleted_by_user_id uuid,
        deletion_reason text,
        tenant_id uuid NOT NULL,
        CONSTRAINT pk_subcontractors PRIMARY KEY (id),
        CONSTRAINT "fk_subcontractors__subcontractor_companies_subcontractor_company~" FOREIGN KEY (subcontractor_company_id) REFERENCES subcontractor_companies (id) ON DELETE CASCADE,
        CONSTRAINT fk_subcontractors__tenants_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE,
        CONSTRAINT fk_subcontractors_career_job_families_career_job_family_id FOREIGN KEY (career_job_family_id) REFERENCES career_job_families (id) ON DELETE SET NULL
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251130232436_AddEnhancedStaffingModule') THEN
    CREATE TABLE project_role_assignments (
        id uuid NOT NULL,
        project_id uuid NOT NULL,
        wbs_element_id uuid,
        user_id uuid,
        subcontractor_id uuid,
        is_tbd boolean NOT NULL,
        tbd_description character varying(500),
        position_title character varying(200) NOT NULL,
        career_job_family_id uuid,
        career_level integer,
        labor_category_id uuid,
        start_date date NOT NULL,
        end_date date,
        status integer NOT NULL,
        notes character varying(2000),
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone,
        created_by_user_id uuid,
        updated_by_user_id uuid,
        is_deleted boolean NOT NULL,
        deleted_at timestamp with time zone,
        deleted_by_user_id uuid,
        deletion_reason text,
        tenant_id uuid NOT NULL,
        CONSTRAINT pk_project_role_assignments PRIMARY KEY (id),
        CONSTRAINT fk_project_role_assignments__subcontractors_subcontractor_id FOREIGN KEY (subcontractor_id) REFERENCES subcontractors (id) ON DELETE SET NULL,
        CONSTRAINT fk_project_role_assignments__tenants_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE,
        CONSTRAINT fk_project_role_assignments__users_user_id FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL,
        CONSTRAINT fk_project_role_assignments__wbs_elements_wbs_element_id FOREIGN KEY (wbs_element_id) REFERENCES wbs_elements (id) ON DELETE SET NULL,
        CONSTRAINT "fk_project_role_assignments_career_job_families_career_job_fam~" FOREIGN KEY (career_job_family_id) REFERENCES career_job_families (id) ON DELETE SET NULL,
        CONSTRAINT fk_project_role_assignments_labor_categories_labor_category_id FOREIGN KEY (labor_category_id) REFERENCES labor_categories (id) ON DELETE SET NULL,
        CONSTRAINT fk_project_role_assignments_projects_project_id FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251130232436_AddEnhancedStaffingModule') THEN
    CREATE TABLE forecasts (
        id uuid NOT NULL,
        project_role_assignment_id uuid NOT NULL,
        forecast_version_id uuid NOT NULL,
        year integer NOT NULL,
        month integer NOT NULL,
        week integer,
        forecasted_hours numeric(10,2) NOT NULL,
        recommended_hours numeric(10,2),
        status integer NOT NULL,
        submitted_by_user_id uuid,
        submitted_at timestamp with time zone,
        approved_by_user_id uuid,
        approved_at timestamp with time zone,
        approval_notes character varying(1000),
        is_override boolean NOT NULL,
        overridden_by_user_id uuid,
        overridden_at timestamp with time zone,
        override_reason character varying(500),
        original_forecasted_hours numeric(10,2),
        notes character varying(2000),
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone,
        created_by_user_id uuid,
        updated_by_user_id uuid,
        is_deleted boolean NOT NULL,
        deleted_at timestamp with time zone,
        deleted_by_user_id uuid,
        deletion_reason text,
        tenant_id uuid NOT NULL,
        CONSTRAINT pk_forecasts PRIMARY KEY (id),
        CONSTRAINT fk_forecasts__forecast_versions_forecast_version_id FOREIGN KEY (forecast_version_id) REFERENCES forecast_versions (id) ON DELETE CASCADE,
        CONSTRAINT fk_forecasts__project_role_assignments_project_role_assignment_id FOREIGN KEY (project_role_assignment_id) REFERENCES project_role_assignments (id) ON DELETE CASCADE,
        CONSTRAINT fk_forecasts__tenants_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE,
        CONSTRAINT fk_forecasts__users_approved_by_user_id FOREIGN KEY (approved_by_user_id) REFERENCES users (id) ON DELETE SET NULL,
        CONSTRAINT fk_forecasts__users_overridden_by_user_id FOREIGN KEY (overridden_by_user_id) REFERENCES users (id) ON DELETE SET NULL,
        CONSTRAINT fk_forecasts__users_submitted_by_user_id FOREIGN KEY (submitted_by_user_id) REFERENCES users (id) ON DELETE SET NULL
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251130232436_AddEnhancedStaffingModule') THEN
    CREATE TABLE forecast_histories (
        id uuid NOT NULL,
        forecast_id uuid NOT NULL,
        changed_by_user_id uuid NOT NULL,
        changed_at timestamp with time zone NOT NULL,
        change_type integer NOT NULL,
        old_hours numeric(10,2),
        new_hours numeric(10,2),
        old_status integer,
        new_status integer,
        change_reason character varying(500),
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone,
        created_by_user_id uuid,
        updated_by_user_id uuid,
        is_deleted boolean NOT NULL,
        deleted_at timestamp with time zone,
        deleted_by_user_id uuid,
        deletion_reason text,
        CONSTRAINT pk_forecast_histories PRIMARY KEY (id),
        CONSTRAINT fk_forecast_histories__users_changed_by_user_id FOREIGN KEY (changed_by_user_id) REFERENCES users (id) ON DELETE RESTRICT,
        CONSTRAINT fk_forecast_histories_forecasts_forecast_id FOREIGN KEY (forecast_id) REFERENCES forecasts (id) ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251130232436_AddEnhancedStaffingModule') THEN
    CREATE INDEX ix_users_career_job_family_id ON users (career_job_family_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251130232436_AddEnhancedStaffingModule') THEN
    CREATE UNIQUE INDEX ix_career_job_families_tenant_id_code ON career_job_families (tenant_id, code);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251130232436_AddEnhancedStaffingModule') THEN
    CREATE INDEX ix_career_job_families_tenant_id_is_active ON career_job_families (tenant_id, is_active);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251130232436_AddEnhancedStaffingModule') THEN
    CREATE INDEX ix_forecast_approval_schedules_tenant_id_is_active ON forecast_approval_schedules (tenant_id, is_active);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251130232436_AddEnhancedStaffingModule') THEN
    CREATE INDEX ix_forecast_approval_schedules_tenant_id_is_default ON forecast_approval_schedules (tenant_id, is_default);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251130232436_AddEnhancedStaffingModule') THEN
    CREATE INDEX ix_forecast_histories_changed_by_user_id ON forecast_histories (changed_by_user_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251130232436_AddEnhancedStaffingModule') THEN
    CREATE INDEX ix_forecast_histories_forecast_id_changed_at ON forecast_histories (forecast_id, changed_at);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251130232436_AddEnhancedStaffingModule') THEN
    CREATE INDEX ix_forecast_import_exports_file_hash ON forecast_import_exports (file_hash);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251130232436_AddEnhancedStaffingModule') THEN
    CREATE INDEX ix_forecast_import_exports_forecast_version_id ON forecast_import_exports (forecast_version_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251130232436_AddEnhancedStaffingModule') THEN
    CREATE INDEX ix_forecast_import_exports_operation_by_user_id ON forecast_import_exports (operation_by_user_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251130232436_AddEnhancedStaffingModule') THEN
    CREATE INDEX ix_forecast_import_exports_project_id ON forecast_import_exports (project_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251130232436_AddEnhancedStaffingModule') THEN
    CREATE INDEX ix_forecast_import_exports_resulting_version_id ON forecast_import_exports (resulting_version_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251130232436_AddEnhancedStaffingModule') THEN
    CREATE INDEX ix_forecast_import_exports_tenant_id_type_operation_at ON forecast_import_exports (tenant_id, type, operation_at);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251130232436_AddEnhancedStaffingModule') THEN
    CREATE INDEX ix_forecast_versions_based_on_version_id ON forecast_versions (based_on_version_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251130232436_AddEnhancedStaffingModule') THEN
    CREATE INDEX ix_forecast_versions_project_id ON forecast_versions (project_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251130232436_AddEnhancedStaffingModule') THEN
    CREATE INDEX ix_forecast_versions_promoted_by_user_id ON forecast_versions (promoted_by_user_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251130232436_AddEnhancedStaffingModule') THEN
    CREATE INDEX ix_forecast_versions_tenant_id_project_id_is_current ON forecast_versions (tenant_id, project_id, is_current);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251130232436_AddEnhancedStaffingModule') THEN
    CREATE INDEX ix_forecast_versions_tenant_id_type_is_current ON forecast_versions (tenant_id, type, is_current);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251130232436_AddEnhancedStaffingModule') THEN
    CREATE INDEX ix_forecast_versions_tenant_id_user_id_type ON forecast_versions (tenant_id, user_id, type);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251130232436_AddEnhancedStaffingModule') THEN
    CREATE INDEX ix_forecast_versions_user_id ON forecast_versions (user_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251130232436_AddEnhancedStaffingModule') THEN
    CREATE INDEX ix_forecasts_approved_by_user_id ON forecasts (approved_by_user_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251130232436_AddEnhancedStaffingModule') THEN
    CREATE INDEX ix_forecasts_forecast_version_id ON forecasts (forecast_version_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251130232436_AddEnhancedStaffingModule') THEN
    CREATE INDEX ix_forecasts_overridden_by_user_id ON forecasts (overridden_by_user_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251130232436_AddEnhancedStaffingModule') THEN
    CREATE INDEX ix_forecasts_project_role_assignment_id_year_month_week ON forecasts (project_role_assignment_id, year, month, week);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251130232436_AddEnhancedStaffingModule') THEN
    CREATE INDEX ix_forecasts_submitted_by_user_id ON forecasts (submitted_by_user_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251130232436_AddEnhancedStaffingModule') THEN
    CREATE INDEX ix_forecasts_tenant_id_forecast_version_id_year_month ON forecasts (tenant_id, forecast_version_id, year, month);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251130232436_AddEnhancedStaffingModule') THEN
    CREATE INDEX ix_forecasts_tenant_id_status ON forecasts (tenant_id, status);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251130232436_AddEnhancedStaffingModule') THEN
    CREATE INDEX ix_labor_categories_project_id ON labor_categories (project_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251130232436_AddEnhancedStaffingModule') THEN
    CREATE INDEX ix_labor_categories_tenant_id_project_id_is_active ON labor_categories (tenant_id, project_id, is_active);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251130232436_AddEnhancedStaffingModule') THEN
    CREATE INDEX ix_project_role_assignments_career_job_family_id ON project_role_assignments (career_job_family_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251130232436_AddEnhancedStaffingModule') THEN
    CREATE INDEX ix_project_role_assignments_labor_category_id ON project_role_assignments (labor_category_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251130232436_AddEnhancedStaffingModule') THEN
    CREATE INDEX ix_project_role_assignments_project_id ON project_role_assignments (project_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251130232436_AddEnhancedStaffingModule') THEN
    CREATE INDEX ix_project_role_assignments_start_date_end_date ON project_role_assignments (start_date, end_date);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251130232436_AddEnhancedStaffingModule') THEN
    CREATE INDEX ix_project_role_assignments_subcontractor_id ON project_role_assignments (subcontractor_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251130232436_AddEnhancedStaffingModule') THEN
    CREATE INDEX ix_project_role_assignments_tenant_id_is_tbd_status ON project_role_assignments (tenant_id, is_tbd, status);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251130232436_AddEnhancedStaffingModule') THEN
    CREATE INDEX ix_project_role_assignments_tenant_id_project_id_status ON project_role_assignments (tenant_id, project_id, status);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251130232436_AddEnhancedStaffingModule') THEN
    CREATE INDEX ix_project_role_assignments_tenant_id_subcontractor_id_status ON project_role_assignments (tenant_id, subcontractor_id, status);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251130232436_AddEnhancedStaffingModule') THEN
    CREATE INDEX ix_project_role_assignments_tenant_id_user_id_status ON project_role_assignments (tenant_id, user_id, status);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251130232436_AddEnhancedStaffingModule') THEN
    CREATE INDEX ix_project_role_assignments_user_id ON project_role_assignments (user_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251130232436_AddEnhancedStaffingModule') THEN
    CREATE INDEX ix_project_role_assignments_wbs_element_id ON project_role_assignments (wbs_element_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251130232436_AddEnhancedStaffingModule') THEN
    CREATE INDEX ix_subcontractor_companies_primary_contact_user_id ON subcontractor_companies (primary_contact_user_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251130232436_AddEnhancedStaffingModule') THEN
    CREATE INDEX ix_subcontractor_companies_tenant_id_code ON subcontractor_companies (tenant_id, code);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251130232436_AddEnhancedStaffingModule') THEN
    CREATE INDEX ix_subcontractor_companies_tenant_id_status ON subcontractor_companies (tenant_id, status);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251130232436_AddEnhancedStaffingModule') THEN
    CREATE INDEX ix_subcontractors_career_job_family_id ON subcontractors (career_job_family_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251130232436_AddEnhancedStaffingModule') THEN
    CREATE INDEX ix_subcontractors_subcontractor_company_id ON subcontractors (subcontractor_company_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251130232436_AddEnhancedStaffingModule') THEN
    CREATE INDEX ix_subcontractors_tenant_id_email ON subcontractors (tenant_id, email);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251130232436_AddEnhancedStaffingModule') THEN
    CREATE INDEX ix_subcontractors_tenant_id_subcontractor_company_id_status ON subcontractors (tenant_id, subcontractor_company_id, status);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251130232436_AddEnhancedStaffingModule') THEN
    ALTER TABLE users ADD CONSTRAINT fk_users_career_job_families_career_job_family_id FOREIGN KEY (career_job_family_id) REFERENCES career_job_families (id) ON DELETE SET NULL;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251130232436_AddEnhancedStaffingModule') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20251130232436_AddEnhancedStaffingModule', '8.0.11');
    END IF;
END $EF$;
COMMIT;

START TRANSACTION;


DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251202152031_AddMagicLinkAndImpersonation') THEN
    CREATE TABLE impersonation_sessions (
        id uuid NOT NULL,
        admin_user_id uuid NOT NULL,
        impersonated_user_id uuid NOT NULL,
        started_at timestamp with time zone NOT NULL,
        ended_at timestamp with time zone,
        reason character varying(1000) NOT NULL,
        ip_address character varying(45),
        user_agent character varying(500),
        end_reason integer,
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone,
        created_by_user_id uuid,
        updated_by_user_id uuid,
        is_deleted boolean NOT NULL,
        deleted_at timestamp with time zone,
        deleted_by_user_id uuid,
        deletion_reason text,
        CONSTRAINT pk_impersonation_sessions PRIMARY KEY (id),
        CONSTRAINT fk_impersonation_sessions__users_admin_user_id FOREIGN KEY (admin_user_id) REFERENCES users (id) ON DELETE RESTRICT,
        CONSTRAINT fk_impersonation_sessions__users_impersonated_user_id FOREIGN KEY (impersonated_user_id) REFERENCES users (id) ON DELETE RESTRICT
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251202152031_AddMagicLinkAndImpersonation') THEN
    CREATE TABLE magic_link_tokens (
        id uuid NOT NULL,
        user_id uuid NOT NULL,
        token_hash character varying(64) NOT NULL,
        expires_at timestamp with time zone NOT NULL,
        used_at timestamp with time zone,
        requested_from_ip character varying(45),
        requested_user_agent character varying(500),
        used_from_ip character varying(45),
        used_user_agent character varying(500),
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone,
        created_by_user_id uuid,
        updated_by_user_id uuid,
        is_deleted boolean NOT NULL,
        deleted_at timestamp with time zone,
        deleted_by_user_id uuid,
        deletion_reason text,
        CONSTRAINT pk_magic_link_tokens PRIMARY KEY (id),
        CONSTRAINT fk_magic_link_tokens__users_user_id FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251202152031_AddMagicLinkAndImpersonation') THEN
    CREATE INDEX ix_impersonation_sessions_admin_user_id_ended_at ON impersonation_sessions (admin_user_id, ended_at);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251202152031_AddMagicLinkAndImpersonation') THEN
    CREATE INDEX ix_impersonation_sessions_impersonated_user_id_started_at ON impersonation_sessions (impersonated_user_id, started_at);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251202152031_AddMagicLinkAndImpersonation') THEN
    CREATE INDEX ix_impersonation_sessions_started_at ON impersonation_sessions (started_at);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251202152031_AddMagicLinkAndImpersonation') THEN
    CREATE INDEX ix_magic_link_tokens_expires_at ON magic_link_tokens (expires_at);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251202152031_AddMagicLinkAndImpersonation') THEN
    CREATE UNIQUE INDEX ix_magic_link_tokens_token_hash ON magic_link_tokens (token_hash);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251202152031_AddMagicLinkAndImpersonation') THEN
    CREATE INDEX ix_magic_link_tokens_user_id_expires_at ON magic_link_tokens (user_id, expires_at);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251202152031_AddMagicLinkAndImpersonation') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20251202152031_AddMagicLinkAndImpersonation', '8.0.11');
    END IF;
END $EF$;
COMMIT;

START TRANSACTION;


DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251206124321_AddProjectBudgetVersioning') THEN

                    DO $$
                    BEGIN
                        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                            WHERE table_name = 'tenant_settings' AND column_name = 'default_budget_months_ahead') THEN
                            ALTER TABLE tenant_settings ADD COLUMN default_budget_months_ahead integer NOT NULL DEFAULT 0;
                        END IF;
                        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                            WHERE table_name = 'tenant_settings' AND column_name = 'fiscal_year_start_month') THEN
                            ALTER TABLE tenant_settings ADD COLUMN fiscal_year_start_month integer NOT NULL DEFAULT 0;
                        END IF;
                        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                            WHERE table_name = 'tenant_settings' AND column_name = 'require_budget_approval') THEN
                            ALTER TABLE tenant_settings ADD COLUMN require_budget_approval boolean NOT NULL DEFAULT false;
                        END IF;
                    END $$;
                
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251206124321_AddProjectBudgetVersioning') THEN
    CREATE TABLE project_budgets (
        id uuid NOT NULL,
        project_id uuid NOT NULL,
        fiscal_year integer NOT NULL,
        name character varying(200) NOT NULL,
        description character varying(1000),
        type integer NOT NULL,
        version_number integer NOT NULL,
        is_active boolean NOT NULL,
        previous_version_id uuid,
        total_budgeted_hours numeric(12,2) NOT NULL,
        status integer NOT NULL,
        submitted_by_user_id uuid,
        submitted_at timestamp with time zone,
        approved_by_user_id uuid,
        approved_at timestamp with time zone,
        approval_notes character varying(1000),
        effective_from timestamp with time zone,
        effective_to timestamp with time zone,
        notes character varying(2000),
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone,
        created_by_user_id uuid,
        updated_by_user_id uuid,
        is_deleted boolean NOT NULL,
        deleted_at timestamp with time zone,
        deleted_by_user_id uuid,
        deletion_reason text,
        tenant_id uuid NOT NULL,
        CONSTRAINT pk_project_budgets PRIMARY KEY (id),
        CONSTRAINT fk_project_budgets__tenants_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE,
        CONSTRAINT fk_project_budgets__users_approved_by_user_id FOREIGN KEY (approved_by_user_id) REFERENCES users (id) ON DELETE SET NULL,
        CONSTRAINT fk_project_budgets__users_submitted_by_user_id FOREIGN KEY (submitted_by_user_id) REFERENCES users (id) ON DELETE SET NULL,
        CONSTRAINT fk_project_budgets_project_budgets_previous_version_id FOREIGN KEY (previous_version_id) REFERENCES project_budgets (id) ON DELETE SET NULL,
        CONSTRAINT fk_project_budgets_projects_project_id FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251206124321_AddProjectBudgetVersioning') THEN
    CREATE TABLE project_budget_histories (
        id uuid NOT NULL,
        project_budget_id uuid NOT NULL,
        changed_by_user_id uuid NOT NULL,
        changed_at timestamp with time zone NOT NULL,
        change_type integer NOT NULL,
        old_total_hours numeric(12,2),
        new_total_hours numeric(12,2),
        old_status integer,
        new_status integer,
        change_reason character varying(500),
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone,
        created_by_user_id uuid,
        updated_by_user_id uuid,
        is_deleted boolean NOT NULL,
        deleted_at timestamp with time zone,
        deleted_by_user_id uuid,
        deletion_reason text,
        CONSTRAINT pk_project_budget_histories PRIMARY KEY (id),
        CONSTRAINT fk_project_budget_histories__users_changed_by_user_id FOREIGN KEY (changed_by_user_id) REFERENCES users (id) ON DELETE RESTRICT,
        CONSTRAINT fk_project_budget_histories_project_budgets_project_budget_id FOREIGN KEY (project_budget_id) REFERENCES project_budgets (id) ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251206124321_AddProjectBudgetVersioning') THEN
    CREATE TABLE project_budget_lines (
        id uuid NOT NULL,
        project_budget_id uuid NOT NULL,
        year integer NOT NULL,
        month integer NOT NULL,
        budgeted_hours numeric(10,2) NOT NULL,
        wbs_element_id uuid,
        labor_category_id uuid,
        notes character varying(1000),
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone,
        created_by_user_id uuid,
        updated_by_user_id uuid,
        is_deleted boolean NOT NULL,
        deleted_at timestamp with time zone,
        deleted_by_user_id uuid,
        deletion_reason text,
        tenant_id uuid NOT NULL,
        CONSTRAINT pk_project_budget_lines PRIMARY KEY (id),
        CONSTRAINT fk_project_budget_lines__tenants_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE,
        CONSTRAINT fk_project_budget_lines__wbs_elements_wbs_element_id FOREIGN KEY (wbs_element_id) REFERENCES wbs_elements (id) ON DELETE SET NULL,
        CONSTRAINT fk_project_budget_lines_labor_categories_labor_category_id FOREIGN KEY (labor_category_id) REFERENCES labor_categories (id) ON DELETE SET NULL,
        CONSTRAINT fk_project_budget_lines_project_budgets_project_budget_id FOREIGN KEY (project_budget_id) REFERENCES project_budgets (id) ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251206124321_AddProjectBudgetVersioning') THEN
    CREATE INDEX ix_project_budget_histories_changed_by_user_id ON project_budget_histories (changed_by_user_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251206124321_AddProjectBudgetVersioning') THEN
    CREATE INDEX ix_project_budget_histories_project_budget_id_changed_at ON project_budget_histories (project_budget_id, changed_at);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251206124321_AddProjectBudgetVersioning') THEN
    CREATE INDEX ix_project_budget_lines_labor_category_id ON project_budget_lines (labor_category_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251206124321_AddProjectBudgetVersioning') THEN
    CREATE INDEX "ix_project_budget_lines_project_budget_id_wbs_element_id_year_~" ON project_budget_lines (project_budget_id, wbs_element_id, year, month);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251206124321_AddProjectBudgetVersioning') THEN
    CREATE INDEX ix_project_budget_lines_tenant_id_project_budget_id_year_month ON project_budget_lines (tenant_id, project_budget_id, year, month);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251206124321_AddProjectBudgetVersioning') THEN
    CREATE INDEX ix_project_budget_lines_wbs_element_id ON project_budget_lines (wbs_element_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251206124321_AddProjectBudgetVersioning') THEN
    CREATE INDEX ix_project_budgets_approved_by_user_id ON project_budgets (approved_by_user_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251206124321_AddProjectBudgetVersioning') THEN
    CREATE INDEX ix_project_budgets_previous_version_id ON project_budgets (previous_version_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251206124321_AddProjectBudgetVersioning') THEN
    CREATE INDEX ix_project_budgets_project_id_fiscal_year_version_number ON project_budgets (project_id, fiscal_year, version_number);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251206124321_AddProjectBudgetVersioning') THEN
    CREATE INDEX ix_project_budgets_submitted_by_user_id ON project_budgets (submitted_by_user_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251206124321_AddProjectBudgetVersioning') THEN
    CREATE INDEX ix_project_budgets_tenant_id_project_id_fiscal_year_is_active ON project_budgets (tenant_id, project_id, fiscal_year, is_active);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251206124321_AddProjectBudgetVersioning') THEN
    CREATE INDEX ix_project_budgets_tenant_id_status ON project_budgets (tenant_id, status);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251206124321_AddProjectBudgetVersioning') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20251206124321_AddProjectBudgetVersioning', '8.0.11');
    END IF;
END $EF$;
COMMIT;

START TRANSACTION;


DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251206161538_RemoveDOAActivations') THEN
    ALTER TABLE work_location_preferences DROP CONSTRAINT fk_work_location_preferences_doaactivations_doaactivation_id;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251206161538_RemoveDOAActivations') THEN
    DROP TABLE doaactivations;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251206161538_RemoveDOAActivations') THEN
    DROP INDEX ix_work_location_preferences_doaactivation_id;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251206161538_RemoveDOAActivations') THEN
    ALTER TABLE work_location_preferences DROP COLUMN doaactivation_id;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251206161538_RemoveDOAActivations') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20251206161538_RemoveDOAActivations', '8.0.11');
    END IF;
END $EF$;
COMMIT;

START TRANSACTION;


DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251207140930_AddForecastEnhancements') THEN
    ALTER TABLE tenant_settings ADD default_pto_days_per_month numeric NOT NULL DEFAULT 0.0;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251207140930_AddForecastEnhancements') THEN
    ALTER TABLE tenant_settings ADD exclude_saturdays boolean NOT NULL DEFAULT FALSE;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251207140930_AddForecastEnhancements') THEN
    ALTER TABLE tenant_settings ADD exclude_sundays boolean NOT NULL DEFAULT FALSE;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251207140930_AddForecastEnhancements') THEN
    ALTER TABLE tenant_settings ADD fiscal_year_prefix text NOT NULL DEFAULT '';
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251207140930_AddForecastEnhancements') THEN
    ALTER TABLE tenant_settings ADD standard_hours_per_day numeric NOT NULL DEFAULT 0.0;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251207140930_AddForecastEnhancements') THEN
    CREATE TABLE cost_rate_import_batches (
        id uuid NOT NULL,
        file_name character varying(255) NOT NULL,
        file_type character varying(10) NOT NULL,
        total_records integer NOT NULL,
        success_count integer NOT NULL,
        error_count integer NOT NULL,
        status integer NOT NULL,
        error_details text,
        completed_at timestamp with time zone,
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone,
        created_by_user_id uuid,
        updated_by_user_id uuid,
        is_deleted boolean NOT NULL,
        deleted_at timestamp with time zone,
        deleted_by_user_id uuid,
        deletion_reason text,
        tenant_id uuid NOT NULL,
        CONSTRAINT pk_cost_rate_import_batches PRIMARY KEY (id),
        CONSTRAINT fk_cost_rate_import_batches__tenants_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251207140930_AddForecastEnhancements') THEN
    CREATE TABLE non_labor_cost_types (
        id uuid NOT NULL,
        name character varying(100) NOT NULL,
        code character varying(20),
        category integer NOT NULL,
        description character varying(500),
        is_active boolean NOT NULL,
        sort_order integer NOT NULL,
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone,
        created_by_user_id uuid,
        updated_by_user_id uuid,
        is_deleted boolean NOT NULL,
        deleted_at timestamp with time zone,
        deleted_by_user_id uuid,
        deletion_reason text,
        tenant_id uuid NOT NULL,
        CONSTRAINT pk_non_labor_cost_types PRIMARY KEY (id),
        CONSTRAINT fk_non_labor_cost_types__tenants_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251207140930_AddForecastEnhancements') THEN
    CREATE TABLE employee_cost_rates (
        id uuid NOT NULL,
        user_id uuid NOT NULL,
        effective_date date NOT NULL,
        end_date date,
        loaded_cost_rate numeric(18,2) NOT NULL,
        notes character varying(1000),
        source integer NOT NULL,
        import_batch_id uuid,
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone,
        created_by_user_id uuid,
        updated_by_user_id uuid,
        is_deleted boolean NOT NULL,
        deleted_at timestamp with time zone,
        deleted_by_user_id uuid,
        deletion_reason text,
        tenant_id uuid NOT NULL,
        CONSTRAINT pk_employee_cost_rates PRIMARY KEY (id),
        CONSTRAINT fk_employee_cost_rates__tenants_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE,
        CONSTRAINT fk_employee_cost_rates__users_user_id FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        CONSTRAINT fk_employee_cost_rates_cost_rate_import_batches_import_batch_id FOREIGN KEY (import_batch_id) REFERENCES cost_rate_import_batches (id) ON DELETE SET NULL
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251207140930_AddForecastEnhancements') THEN
    CREATE TABLE actual_non_labor_costs (
        id uuid NOT NULL,
        project_id uuid NOT NULL,
        non_labor_cost_type_id uuid NOT NULL,
        wbs_element_id uuid,
        year integer NOT NULL,
        month integer NOT NULL,
        actual_amount numeric(18,2) NOT NULL,
        source integer NOT NULL,
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone,
        created_by_user_id uuid,
        updated_by_user_id uuid,
        is_deleted boolean NOT NULL,
        deleted_at timestamp with time zone,
        deleted_by_user_id uuid,
        deletion_reason text,
        tenant_id uuid NOT NULL,
        CONSTRAINT pk_actual_non_labor_costs PRIMARY KEY (id),
        CONSTRAINT "fk_actual_non_labor_costs__non_labor_cost_types_non_labor_cost_typ~" FOREIGN KEY (non_labor_cost_type_id) REFERENCES non_labor_cost_types (id) ON DELETE RESTRICT,
        CONSTRAINT fk_actual_non_labor_costs__projects_project_id FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
        CONSTRAINT fk_actual_non_labor_costs__tenants_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE,
        CONSTRAINT fk_actual_non_labor_costs__wbs_elements_wbs_element_id FOREIGN KEY (wbs_element_id) REFERENCES wbs_elements (id) ON DELETE SET NULL
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251207140930_AddForecastEnhancements') THEN
    CREATE TABLE non_labor_budget_lines (
        id uuid NOT NULL,
        project_budget_id uuid NOT NULL,
        non_labor_cost_type_id uuid NOT NULL,
        wbs_element_id uuid,
        year integer NOT NULL,
        month integer NOT NULL,
        budgeted_amount numeric(18,2) NOT NULL,
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone,
        created_by_user_id uuid,
        updated_by_user_id uuid,
        is_deleted boolean NOT NULL,
        deleted_at timestamp with time zone,
        deleted_by_user_id uuid,
        deletion_reason text,
        tenant_id uuid NOT NULL,
        CONSTRAINT pk_non_labor_budget_lines PRIMARY KEY (id),
        CONSTRAINT "fk_non_labor_budget_lines__non_labor_cost_types_non_labor_cost_typ~" FOREIGN KEY (non_labor_cost_type_id) REFERENCES non_labor_cost_types (id) ON DELETE RESTRICT,
        CONSTRAINT fk_non_labor_budget_lines__project_budgets_project_budget_id FOREIGN KEY (project_budget_id) REFERENCES project_budgets (id) ON DELETE CASCADE,
        CONSTRAINT fk_non_labor_budget_lines__tenants_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE,
        CONSTRAINT fk_non_labor_budget_lines__wbs_elements_wbs_element_id FOREIGN KEY (wbs_element_id) REFERENCES wbs_elements (id) ON DELETE SET NULL
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251207140930_AddForecastEnhancements') THEN
    CREATE TABLE non_labor_forecasts (
        id uuid NOT NULL,
        project_id uuid NOT NULL,
        wbs_element_id uuid,
        non_labor_cost_type_id uuid NOT NULL,
        forecast_version_id uuid,
        year integer NOT NULL,
        month integer NOT NULL,
        forecasted_amount numeric(18,2) NOT NULL,
        notes character varying(1000),
        status integer NOT NULL,
        submitted_by_user_id uuid,
        submitted_at timestamp with time zone,
        approved_by_user_id uuid,
        approved_at timestamp with time zone,
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone,
        created_by_user_id uuid,
        updated_by_user_id uuid,
        is_deleted boolean NOT NULL,
        deleted_at timestamp with time zone,
        deleted_by_user_id uuid,
        deletion_reason text,
        tenant_id uuid NOT NULL,
        CONSTRAINT pk_non_labor_forecasts PRIMARY KEY (id),
        CONSTRAINT fk_non_labor_forecasts__projects_project_id FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
        CONSTRAINT fk_non_labor_forecasts__tenants_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE,
        CONSTRAINT fk_non_labor_forecasts__users_approved_by_user_id FOREIGN KEY (approved_by_user_id) REFERENCES users (id) ON DELETE SET NULL,
        CONSTRAINT fk_non_labor_forecasts__users_submitted_by_user_id FOREIGN KEY (submitted_by_user_id) REFERENCES users (id) ON DELETE SET NULL,
        CONSTRAINT fk_non_labor_forecasts__wbs_elements_wbs_element_id FOREIGN KEY (wbs_element_id) REFERENCES wbs_elements (id) ON DELETE SET NULL,
        CONSTRAINT fk_non_labor_forecasts_forecast_versions_forecast_version_id FOREIGN KEY (forecast_version_id) REFERENCES forecast_versions (id) ON DELETE SET NULL,
        CONSTRAINT "fk_non_labor_forecasts_non_labor_cost_types_non_labor_cost_typ~" FOREIGN KEY (non_labor_cost_type_id) REFERENCES non_labor_cost_types (id) ON DELETE RESTRICT
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251207140930_AddForecastEnhancements') THEN
    CREATE INDEX ix_actual_non_labor_costs_non_labor_cost_type_id ON actual_non_labor_costs (non_labor_cost_type_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251207140930_AddForecastEnhancements') THEN
    CREATE INDEX ix_actual_non_labor_costs_project_id ON actual_non_labor_costs (project_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251207140930_AddForecastEnhancements') THEN
    CREATE INDEX ix_actual_non_labor_costs_tenant_id_project_id_year_month ON actual_non_labor_costs (tenant_id, project_id, year, month);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251207140930_AddForecastEnhancements') THEN
    CREATE INDEX ix_actual_non_labor_costs_wbs_element_id ON actual_non_labor_costs (wbs_element_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251207140930_AddForecastEnhancements') THEN
    CREATE INDEX ix_cost_rate_import_batches_tenant_id_created_at ON cost_rate_import_batches (tenant_id, created_at);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251207140930_AddForecastEnhancements') THEN
    CREATE INDEX ix_employee_cost_rates_import_batch_id ON employee_cost_rates (import_batch_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251207140930_AddForecastEnhancements') THEN
    CREATE INDEX ix_employee_cost_rates_tenant_id_effective_date ON employee_cost_rates (tenant_id, effective_date);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251207140930_AddForecastEnhancements') THEN
    CREATE UNIQUE INDEX ix_employee_cost_rates_tenant_id_user_id_effective_date ON employee_cost_rates (tenant_id, user_id, effective_date);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251207140930_AddForecastEnhancements') THEN
    CREATE INDEX ix_employee_cost_rates_user_id_effective_date ON employee_cost_rates (user_id, effective_date);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251207140930_AddForecastEnhancements') THEN
    CREATE INDEX ix_non_labor_budget_lines_non_labor_cost_type_id ON non_labor_budget_lines (non_labor_cost_type_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251207140930_AddForecastEnhancements') THEN
    CREATE INDEX ix_non_labor_budget_lines_project_budget_id ON non_labor_budget_lines (project_budget_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251207140930_AddForecastEnhancements') THEN
    CREATE INDEX "ix_non_labor_budget_lines_tenant_id_project_budget_id_year_mon~" ON non_labor_budget_lines (tenant_id, project_budget_id, year, month);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251207140930_AddForecastEnhancements') THEN
    CREATE INDEX ix_non_labor_budget_lines_wbs_element_id ON non_labor_budget_lines (wbs_element_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251207140930_AddForecastEnhancements') THEN
    CREATE INDEX ix_non_labor_cost_types_tenant_id_code ON non_labor_cost_types (tenant_id, code);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251207140930_AddForecastEnhancements') THEN
    CREATE INDEX ix_non_labor_cost_types_tenant_id_is_active_sort_order ON non_labor_cost_types (tenant_id, is_active, sort_order);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251207140930_AddForecastEnhancements') THEN
    CREATE INDEX ix_non_labor_forecasts_approved_by_user_id ON non_labor_forecasts (approved_by_user_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251207140930_AddForecastEnhancements') THEN
    CREATE INDEX ix_non_labor_forecasts_forecast_version_id ON non_labor_forecasts (forecast_version_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251207140930_AddForecastEnhancements') THEN
    CREATE INDEX ix_non_labor_forecasts_non_labor_cost_type_id ON non_labor_forecasts (non_labor_cost_type_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251207140930_AddForecastEnhancements') THEN
    CREATE INDEX "ix_non_labor_forecasts_project_id_non_labor_cost_type_id_year_~" ON non_labor_forecasts (project_id, non_labor_cost_type_id, year, month);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251207140930_AddForecastEnhancements') THEN
    CREATE INDEX ix_non_labor_forecasts_submitted_by_user_id ON non_labor_forecasts (submitted_by_user_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251207140930_AddForecastEnhancements') THEN
    CREATE INDEX ix_non_labor_forecasts_tenant_id_project_id_year_month ON non_labor_forecasts (tenant_id, project_id, year, month);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251207140930_AddForecastEnhancements') THEN
    CREATE INDEX ix_non_labor_forecasts_wbs_element_id ON non_labor_forecasts (wbs_element_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251207140930_AddForecastEnhancements') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20251207140930_AddForecastEnhancements', '8.0.11');
    END IF;
END $EF$;
COMMIT;

START TRANSACTION;


DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251207145957_FixTenantSettingsDefaults') THEN

                    UPDATE tenant_settings
                    SET default_pto_days_per_month = 1.5,
                        standard_hours_per_day = 8.0,
                        exclude_saturdays = true,
                        exclude_sundays = true,
                        fiscal_year_prefix = 'FY'
                    WHERE default_pto_days_per_month = 0
                       OR fiscal_year_prefix = ''
                       OR fiscal_year_prefix IS NULL;
                
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251207145957_FixTenantSettingsDefaults') THEN
    ALTER TABLE cost_rate_import_batches ADD imported_at timestamp with time zone;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251207145957_FixTenantSettingsDefaults') THEN
    ALTER TABLE cost_rate_import_batches ADD imported_by_user_id uuid;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251207145957_FixTenantSettingsDefaults') THEN
    CREATE INDEX ix_cost_rate_import_batches_imported_by_user_id ON cost_rate_import_batches (imported_by_user_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251207145957_FixTenantSettingsDefaults') THEN
    ALTER TABLE cost_rate_import_batches ADD CONSTRAINT fk_cost_rate_import_batches__users_imported_by_user_id FOREIGN KEY (imported_by_user_id) REFERENCES users (id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251207145957_FixTenantSettingsDefaults') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20251207145957_FixTenantSettingsDefaults', '8.0.11');
    END IF;
END $EF$;
COMMIT;

START TRANSACTION;


DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251210122428_FacilitiesPortalEntities') THEN
    ALTER TABLE tenant_settings ADD certification_expiry_email_days integer NOT NULL DEFAULT 0;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251210122428_FacilitiesPortalEntities') THEN
    ALTER TABLE tenant_settings ADD certification_expiry_warning_days integer NOT NULL DEFAULT 0;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251210122428_FacilitiesPortalEntities') THEN
    ALTER TABLE tenant_settings ADD enable_certification_expiry_emails boolean NOT NULL DEFAULT FALSE;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251210122428_FacilitiesPortalEntities') THEN
    CREATE TABLE certification_expiry_notifications (
        id uuid NOT NULL,
        person_certification_id uuid NOT NULL,
        sent_at timestamp with time zone NOT NULL,
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone,
        created_by_user_id uuid,
        updated_by_user_id uuid,
        is_deleted boolean NOT NULL,
        deleted_at timestamp with time zone,
        deleted_by_user_id uuid,
        deletion_reason text,
        CONSTRAINT pk_certification_expiry_notifications PRIMARY KEY (id),
        CONSTRAINT "fk_certification_expiry_notifications__person_certifications_per~" FOREIGN KEY (person_certification_id) REFERENCES person_certifications (id) ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251210122428_FacilitiesPortalEntities') THEN
    CREATE TABLE client_site_details (
        id uuid NOT NULL,
        office_id uuid NOT NULL,
        client_name character varying(200) NOT NULL,
        contract_number character varying(100),
        task_order_number character varying(100),
        client_poc_name character varying(200),
        client_poc_email character varying(255),
        client_poc_phone character varying(50),
        required_clearance integer NOT NULL,
        requires_badge boolean NOT NULL,
        badge_type character varying(50),
        badge_instructions character varying(1000),
        has_scif boolean NOT NULL,
        scif_access_instructions character varying(1000),
        security_poc_name character varying(200),
        security_poc_email character varying(255),
        security_poc_phone character varying(50),
        site_hours character varying(500),
        access_instructions character varying(1000),
        check_in_procedure character varying(1000),
        escort_requirements character varying(500),
        network_access character varying(500),
        it_support_contact character varying(200),
        approved_devices character varying(500),
        assigned_fso_user_id uuid,
        custom_attributes jsonb,
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone,
        created_by_user_id uuid,
        updated_by_user_id uuid,
        is_deleted boolean NOT NULL,
        deleted_at timestamp with time zone,
        deleted_by_user_id uuid,
        deletion_reason text,
        tenant_id uuid NOT NULL,
        CONSTRAINT pk_client_site_details PRIMARY KEY (id),
        CONSTRAINT fk_client_site_details__offices_office_id FOREIGN KEY (office_id) REFERENCES offices (id) ON DELETE CASCADE,
        CONSTRAINT fk_client_site_details__tenants_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE,
        CONSTRAINT fk_client_site_details__users_assigned_fso_user_id FOREIGN KEY (assigned_fso_user_id) REFERENCES users (id) ON DELETE SET NULL
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251210122428_FacilitiesPortalEntities') THEN
    CREATE TABLE employee_clearances (
        id uuid NOT NULL,
        user_id uuid NOT NULL,
        level integer NOT NULL,
        status integer NOT NULL,
        investigation_type character varying(50),
        investigation_date date,
        granted_date date,
        expiration_date date,
        reinvestigation_date date,
        has_polygraph boolean NOT NULL,
        polygraph_type character varying(50),
        polygraph_date date,
        polygraph_expiration_date date,
        has_sci_access boolean NOT NULL,
        sci_compartments jsonb,
        sci_access_date date,
        sponsoring_agency character varying(200),
        contractor_code character varying(50),
        verified_by_user_id uuid,
        verified_at timestamp with time zone,
        notes character varying(2000),
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone,
        created_by_user_id uuid,
        updated_by_user_id uuid,
        is_deleted boolean NOT NULL,
        deleted_at timestamp with time zone,
        deleted_by_user_id uuid,
        deletion_reason text,
        tenant_id uuid NOT NULL,
        CONSTRAINT pk_employee_clearances PRIMARY KEY (id),
        CONSTRAINT fk_employee_clearances__tenants_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE,
        CONSTRAINT fk_employee_clearances__users_user_id FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        CONSTRAINT fk_employee_clearances__users_verified_by_user_id FOREIGN KEY (verified_by_user_id) REFERENCES users (id) ON DELETE SET NULL
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251210122428_FacilitiesPortalEntities') THEN
    CREATE TABLE facility_announcements (
        id uuid NOT NULL,
        office_id uuid,
        title character varying(200) NOT NULL,
        content character varying(4000) NOT NULL,
        type integer NOT NULL,
        priority integer NOT NULL,
        effective_date date,
        expiration_date date,
        is_active boolean NOT NULL,
        requires_acknowledgment boolean NOT NULL,
        authored_by_user_id uuid NOT NULL,
        published_at timestamp with time zone,
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone,
        created_by_user_id uuid,
        updated_by_user_id uuid,
        is_deleted boolean NOT NULL,
        deleted_at timestamp with time zone,
        deleted_by_user_id uuid,
        deletion_reason text,
        tenant_id uuid NOT NULL,
        CONSTRAINT pk_facility_announcements PRIMARY KEY (id),
        CONSTRAINT fk_facility_announcements__offices_office_id FOREIGN KEY (office_id) REFERENCES offices (id) ON DELETE CASCADE,
        CONSTRAINT fk_facility_announcements__tenants_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE,
        CONSTRAINT fk_facility_announcements__users_authored_by_user_id FOREIGN KEY (authored_by_user_id) REFERENCES users (id) ON DELETE RESTRICT
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251210122428_FacilitiesPortalEntities') THEN
    CREATE TABLE facility_attribute_definitions (
        id uuid NOT NULL,
        name character varying(100) NOT NULL,
        display_name character varying(200) NOT NULL,
        attribute_type integer NOT NULL,
        entity_type integer NOT NULL,
        description character varying(500),
        is_required boolean NOT NULL,
        is_searchable boolean NOT NULL,
        default_value character varying(500),
        validation_rule character varying(500),
        options jsonb,
        display_order integer NOT NULL,
        is_active boolean NOT NULL,
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone,
        created_by_user_id uuid,
        updated_by_user_id uuid,
        is_deleted boolean NOT NULL,
        deleted_at timestamp with time zone,
        deleted_by_user_id uuid,
        deletion_reason text,
        tenant_id uuid NOT NULL,
        CONSTRAINT pk_facility_attribute_definitions PRIMARY KEY (id),
        CONSTRAINT fk_facility_attribute_definitions__tenants_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251210122428_FacilitiesPortalEntities') THEN
    CREATE TABLE facility_check_ins (
        id uuid NOT NULL,
        user_id uuid NOT NULL,
        office_id uuid NOT NULL,
        check_in_time timestamp with time zone NOT NULL,
        check_out_time timestamp with time zone,
        method integer NOT NULL,
        badge_id character varying(100),
        qr_code character varying(500),
        space_id uuid,
        notes character varying(500),
        device_info character varying(500),
        latitude double precision,
        longitude double precision,
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone,
        created_by_user_id uuid,
        updated_by_user_id uuid,
        is_deleted boolean NOT NULL,
        deleted_at timestamp with time zone,
        deleted_by_user_id uuid,
        deletion_reason text,
        tenant_id uuid NOT NULL,
        CONSTRAINT pk_facility_check_ins PRIMARY KEY (id),
        CONSTRAINT fk_facility_check_ins__offices_office_id FOREIGN KEY (office_id) REFERENCES offices (id) ON DELETE CASCADE,
        CONSTRAINT fk_facility_check_ins__spaces_space_id FOREIGN KEY (space_id) REFERENCES spaces (id) ON DELETE SET NULL,
        CONSTRAINT fk_facility_check_ins__tenants_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE,
        CONSTRAINT fk_facility_check_ins__users_user_id FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251210122428_FacilitiesPortalEntities') THEN
    CREATE TABLE facility_usage_daily (
        id uuid NOT NULL,
        office_id uuid NOT NULL,
        date date NOT NULL,
        total_bookings integer NOT NULL,
        checked_in_count integer NOT NULL,
        no_show_count integer NOT NULL,
        cancelled_count integer NOT NULL,
        total_spaces integer NOT NULL,
        booked_spaces integer NOT NULL,
        utilization_rate numeric(5,2) NOT NULL,
        total_check_ins integer NOT NULL,
        unique_visitors integer NOT NULL,
        average_stay_hours numeric(5,2) NOT NULL,
        peak_occupancy integer NOT NULL,
        peak_time time without time zone,
        utilization_by_space_type jsonb,
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone,
        created_by_user_id uuid,
        updated_by_user_id uuid,
        is_deleted boolean NOT NULL,
        deleted_at timestamp with time zone,
        deleted_by_user_id uuid,
        deletion_reason text,
        tenant_id uuid NOT NULL,
        CONSTRAINT pk_facility_usage_daily PRIMARY KEY (id),
        CONSTRAINT fk_facility_usage_daily__offices_office_id FOREIGN KEY (office_id) REFERENCES offices (id) ON DELETE CASCADE,
        CONSTRAINT fk_facility_usage_daily__tenants_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251210122428_FacilitiesPortalEntities') THEN
    CREATE TABLE field_assignments (
        id uuid NOT NULL,
        user_id uuid NOT NULL,
        client_site_office_id uuid NOT NULL,
        start_date date NOT NULL,
        end_date date,
        status integer NOT NULL,
        project_name character varying(200),
        task_description character varying(500),
        contract_number character varying(100),
        bill_rate numeric(12,2),
        expected_hours_per_week integer,
        clearance_verified boolean NOT NULL,
        clearance_verified_date date,
        clearance_verified_by_user_id uuid,
        badge_issued boolean NOT NULL,
        badge_number character varying(50),
        badge_expiration_date date,
        security_briefing_completed boolean NOT NULL,
        security_briefing_date date,
        approved_by_user_id uuid,
        approved_at timestamp with time zone,
        approval_notes character varying(1000),
        notes character varying(2000),
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone,
        created_by_user_id uuid,
        updated_by_user_id uuid,
        is_deleted boolean NOT NULL,
        deleted_at timestamp with time zone,
        deleted_by_user_id uuid,
        deletion_reason text,
        tenant_id uuid NOT NULL,
        CONSTRAINT pk_field_assignments PRIMARY KEY (id),
        CONSTRAINT fk_field_assignments__offices_client_site_office_id FOREIGN KEY (client_site_office_id) REFERENCES offices (id) ON DELETE RESTRICT,
        CONSTRAINT fk_field_assignments__tenants_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE,
        CONSTRAINT fk_field_assignments__users_approved_by_user_id FOREIGN KEY (approved_by_user_id) REFERENCES users (id) ON DELETE SET NULL,
        CONSTRAINT fk_field_assignments__users_clearance_verified_by_user_id FOREIGN KEY (clearance_verified_by_user_id) REFERENCES users (id) ON DELETE SET NULL,
        CONSTRAINT fk_field_assignments__users_user_id FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251210122428_FacilitiesPortalEntities') THEN
    CREATE TABLE foreign_travel_records (
        id uuid NOT NULL,
        user_id uuid NOT NULL,
        destination_country character varying(100) NOT NULL,
        destination_city character varying(100),
        departure_date date NOT NULL,
        return_date date NOT NULL,
        purpose integer NOT NULL,
        purpose_description character varying(500),
        status integer NOT NULL,
        briefing_completed boolean NOT NULL,
        briefing_date date,
        briefed_by_user_id uuid,
        fso_approved boolean NOT NULL,
        approved_by_user_id uuid,
        approved_at timestamp with time zone,
        approval_notes character varying(1000),
        debriefing_completed boolean NOT NULL,
        debriefing_date date,
        debriefed_by_user_id uuid,
        debriefing_notes character varying(2000),
        foreign_contacts_reported boolean NOT NULL,
        foreign_contacts jsonb,
        notes character varying(2000),
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone,
        created_by_user_id uuid,
        updated_by_user_id uuid,
        is_deleted boolean NOT NULL,
        deleted_at timestamp with time zone,
        deleted_by_user_id uuid,
        deletion_reason text,
        tenant_id uuid NOT NULL,
        CONSTRAINT pk_foreign_travel_records PRIMARY KEY (id),
        CONSTRAINT fk_foreign_travel_records__tenants_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE,
        CONSTRAINT fk_foreign_travel_records__users_approved_by_user_id FOREIGN KEY (approved_by_user_id) REFERENCES users (id) ON DELETE SET NULL,
        CONSTRAINT fk_foreign_travel_records__users_briefed_by_user_id FOREIGN KEY (briefed_by_user_id) REFERENCES users (id) ON DELETE SET NULL,
        CONSTRAINT fk_foreign_travel_records__users_debriefed_by_user_id FOREIGN KEY (debriefed_by_user_id) REFERENCES users (id) ON DELETE SET NULL,
        CONSTRAINT fk_foreign_travel_records__users_user_id FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251210122428_FacilitiesPortalEntities') THEN
    CREATE TABLE leases (
        id uuid NOT NULL,
        office_id uuid NOT NULL,
        lease_number character varying(50) NOT NULL,
        external_lease_id character varying(100),
        landlord_name character varying(200) NOT NULL,
        landlord_contact_name character varying(200),
        landlord_email character varying(255),
        landlord_phone character varying(50),
        property_management_company character varying(200),
        property_manager_name character varying(200),
        property_manager_email character varying(255),
        property_manager_phone character varying(50),
        lease_start_date date NOT NULL,
        lease_end_date date NOT NULL,
        lease_term integer NOT NULL,
        status integer NOT NULL,
        square_footage numeric(12,2) NOT NULL,
        usable_square_footage numeric(12,2),
        parking_spots integer,
        reserved_parking_spots integer,
        has_loading_dock boolean NOT NULL,
        max_occupancy integer,
        base_rent_monthly numeric(12,2) NOT NULL,
        cam_charges_monthly numeric(12,2),
        utilities_monthly numeric(12,2),
        taxes_monthly numeric(12,2),
        insurance_monthly numeric(12,2),
        other_charges_monthly numeric(12,2),
        other_charges_description character varying(500),
        security_deposit numeric(12,2),
        escalation_percentage numeric(5,2),
        next_escalation_date date,
        renewal_notice_deadline date,
        renewal_notice_days integer,
        early_termination_date date,
        early_termination_fee numeric(12,2),
        is_ada_compliant boolean NOT NULL,
        required_security_level integer,
        has_scif boolean NOT NULL,
        scif_details character varying(1000),
        insurance_provider character varying(200),
        insurance_policy_number character varying(100),
        insurance_expiration_date date,
        insurance_coverage_amount numeric(14,2),
        critical_clauses jsonb,
        special_terms character varying(4000),
        notes character varying(2000),
        custom_attributes jsonb,
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone,
        created_by_user_id uuid,
        updated_by_user_id uuid,
        is_deleted boolean NOT NULL,
        deleted_at timestamp with time zone,
        deleted_by_user_id uuid,
        deletion_reason text,
        tenant_id uuid NOT NULL,
        CONSTRAINT pk_leases PRIMARY KEY (id),
        CONSTRAINT fk_leases__offices_office_id FOREIGN KEY (office_id) REFERENCES offices (id) ON DELETE CASCADE,
        CONSTRAINT fk_leases__tenants_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251210122428_FacilitiesPortalEntities') THEN
    CREATE TABLE office_pocs (
        id uuid NOT NULL,
        office_id uuid NOT NULL,
        user_id uuid,
        name character varying(200) NOT NULL,
        title character varying(200),
        email character varying(255),
        phone character varying(50),
        mobile_phone character varying(50),
        role integer NOT NULL,
        responsibilities character varying(500),
        is_primary boolean NOT NULL,
        is_emergency_contact boolean NOT NULL,
        display_order integer NOT NULL,
        is_active boolean NOT NULL,
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone,
        created_by_user_id uuid,
        updated_by_user_id uuid,
        is_deleted boolean NOT NULL,
        deleted_at timestamp with time zone,
        deleted_by_user_id uuid,
        deletion_reason text,
        tenant_id uuid NOT NULL,
        CONSTRAINT pk_office_pocs PRIMARY KEY (id),
        CONSTRAINT fk_office_pocs__tenants_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE,
        CONSTRAINT fk_office_pocs__users_user_id FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL,
        CONSTRAINT fk_office_pocs_offices_office_id FOREIGN KEY (office_id) REFERENCES offices (id) ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251210122428_FacilitiesPortalEntities') THEN
    CREATE TABLE office_travel_guides (
        id uuid NOT NULL,
        office_id uuid NOT NULL,
        nearest_airport character varying(200),
        airport_code character varying(10),
        airport_distance character varying(100),
        recommended_ground_transport character varying(1000),
        public_transit_options character varying(2000),
        driving_directions character varying(2000),
        parking_instructions character varying(1000),
        parking_daily_cost numeric(8,2),
        recommended_hotels jsonb,
        corporate_hotel_code character varying(50),
        neighborhood_tips character varying(1000),
        building_hours character varying(500),
        after_hours_access character varying(1000),
        visitor_check_in character varying(1000),
        security_requirements character varying(1000),
        badge_instructions character varying(1000),
        dress_code character varying(500),
        cafeteria_info character varying(1000),
        nearby_restaurants jsonb,
        wifi_instructions character varying(500),
        conference_room_booking character varying(500),
        printing_instructions character varying(500),
        amenities character varying(1000),
        reception_phone character varying(50),
        security_phone character varying(50),
        facilities_email character varying(255),
        emergency_contact character varying(200),
        welcome_message character varying(4000),
        important_notes character varying(4000),
        photo_gallery jsonb,
        video_tour_url character varying(500),
        virtual_tour_url character varying(500),
        current_announcements jsonb,
        special_instructions character varying(2000),
        last_updated timestamp with time zone,
        last_updated_by_user_id uuid,
        custom_attributes jsonb,
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone,
        created_by_user_id uuid,
        updated_by_user_id uuid,
        is_deleted boolean NOT NULL,
        deleted_at timestamp with time zone,
        deleted_by_user_id uuid,
        deletion_reason text,
        tenant_id uuid NOT NULL,
        CONSTRAINT pk_office_travel_guides PRIMARY KEY (id),
        CONSTRAINT fk_office_travel_guides__tenants_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE,
        CONSTRAINT fk_office_travel_guides__users_last_updated_by_user_id FOREIGN KEY (last_updated_by_user_id) REFERENCES users (id) ON DELETE SET NULL,
        CONSTRAINT fk_office_travel_guides_offices_office_id FOREIGN KEY (office_id) REFERENCES offices (id) ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251210122428_FacilitiesPortalEntities') THEN
    CREATE TABLE scif_access_logs (
        id uuid NOT NULL,
        user_id uuid NOT NULL,
        office_id uuid NOT NULL,
        access_time timestamp with time zone NOT NULL,
        exit_time timestamp with time zone,
        access_type integer NOT NULL,
        purpose character varying(500),
        escort_required boolean NOT NULL,
        escort_user_id uuid,
        badge_number character varying(50),
        notes character varying(500),
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone,
        created_by_user_id uuid,
        updated_by_user_id uuid,
        is_deleted boolean NOT NULL,
        deleted_at timestamp with time zone,
        deleted_by_user_id uuid,
        deletion_reason text,
        tenant_id uuid NOT NULL,
        CONSTRAINT pk_scif_access_logs PRIMARY KEY (id),
        CONSTRAINT fk_scif_access_logs__tenants_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE,
        CONSTRAINT fk_scif_access_logs__users_escort_user_id FOREIGN KEY (escort_user_id) REFERENCES users (id) ON DELETE SET NULL,
        CONSTRAINT fk_scif_access_logs__users_user_id FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        CONSTRAINT fk_scif_access_logs_offices_office_id FOREIGN KEY (office_id) REFERENCES offices (id) ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251210122428_FacilitiesPortalEntities') THEN
    CREATE TABLE announcement_acknowledgments (
        id uuid NOT NULL,
        announcement_id uuid NOT NULL,
        user_id uuid NOT NULL,
        acknowledged_at timestamp with time zone NOT NULL,
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone,
        created_by_user_id uuid,
        updated_by_user_id uuid,
        is_deleted boolean NOT NULL,
        deleted_at timestamp with time zone,
        deleted_by_user_id uuid,
        deletion_reason text,
        CONSTRAINT pk_announcement_acknowledgments PRIMARY KEY (id),
        CONSTRAINT "fk_announcement_acknowledgments__facility_announcements_announce~" FOREIGN KEY (announcement_id) REFERENCES facility_announcements (id) ON DELETE CASCADE,
        CONSTRAINT fk_announcement_acknowledgments__users_user_id FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251210122428_FacilitiesPortalEntities') THEN
    CREATE TABLE lease_amendments (
        id uuid NOT NULL,
        lease_id uuid NOT NULL,
        amendment_number character varying(50) NOT NULL,
        effective_date date NOT NULL,
        executed_date date,
        description character varying(500) NOT NULL,
        type integer NOT NULL,
        rent_change numeric(12,2),
        square_footage_change numeric(12,2),
        new_lease_end_date date,
        terms character varying(4000),
        processed_by_user_id uuid,
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone,
        created_by_user_id uuid,
        updated_by_user_id uuid,
        is_deleted boolean NOT NULL,
        deleted_at timestamp with time zone,
        deleted_by_user_id uuid,
        deletion_reason text,
        tenant_id uuid NOT NULL,
        CONSTRAINT pk_lease_amendments PRIMARY KEY (id),
        CONSTRAINT fk_lease_amendments__tenants_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE,
        CONSTRAINT fk_lease_amendments__users_processed_by_user_id FOREIGN KEY (processed_by_user_id) REFERENCES users (id) ON DELETE SET NULL,
        CONSTRAINT fk_lease_amendments_leases_lease_id FOREIGN KEY (lease_id) REFERENCES leases (id) ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251210122428_FacilitiesPortalEntities') THEN
    CREATE TABLE lease_option_years (
        id uuid NOT NULL,
        lease_id uuid NOT NULL,
        option_number integer NOT NULL,
        option_start_date date NOT NULL,
        option_end_date date NOT NULL,
        term_months integer NOT NULL,
        proposed_rent_monthly numeric(12,2),
        exercise_deadline date NOT NULL,
        status integer NOT NULL,
        exercised_date date,
        exercised_by_user_id uuid,
        notes character varying(1000),
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone,
        created_by_user_id uuid,
        updated_by_user_id uuid,
        is_deleted boolean NOT NULL,
        deleted_at timestamp with time zone,
        deleted_by_user_id uuid,
        deletion_reason text,
        tenant_id uuid NOT NULL,
        CONSTRAINT pk_lease_option_years PRIMARY KEY (id),
        CONSTRAINT fk_lease_option_years__tenants_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE,
        CONSTRAINT fk_lease_option_years__users_exercised_by_user_id FOREIGN KEY (exercised_by_user_id) REFERENCES users (id) ON DELETE SET NULL,
        CONSTRAINT fk_lease_option_years_leases_lease_id FOREIGN KEY (lease_id) REFERENCES leases (id) ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251210122428_FacilitiesPortalEntities') THEN
    CREATE TABLE lease_attachments (
        id uuid NOT NULL,
        lease_id uuid,
        amendment_id uuid,
        stored_file_id uuid,
        file_name character varying(500) NOT NULL,
        storage_path character varying(1000) NOT NULL,
        content_type character varying(100) NOT NULL,
        file_size_bytes bigint NOT NULL,
        type integer NOT NULL,
        description character varying(500),
        uploaded_by_user_id uuid NOT NULL,
        uploaded_at timestamp with time zone NOT NULL,
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone,
        created_by_user_id uuid,
        updated_by_user_id uuid,
        is_deleted boolean NOT NULL,
        deleted_at timestamp with time zone,
        deleted_by_user_id uuid,
        deletion_reason text,
        tenant_id uuid NOT NULL,
        CONSTRAINT pk_lease_attachments PRIMARY KEY (id),
        CONSTRAINT fk_lease_attachments__stored_files_stored_file_id FOREIGN KEY (stored_file_id) REFERENCES stored_files (id),
        CONSTRAINT fk_lease_attachments__tenants_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE,
        CONSTRAINT fk_lease_attachments__users_uploaded_by_user_id FOREIGN KEY (uploaded_by_user_id) REFERENCES users (id) ON DELETE RESTRICT,
        CONSTRAINT fk_lease_attachments_lease_amendments_amendment_id FOREIGN KEY (amendment_id) REFERENCES lease_amendments (id) ON DELETE CASCADE,
        CONSTRAINT fk_lease_attachments_leases_lease_id FOREIGN KEY (lease_id) REFERENCES leases (id) ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251210122428_FacilitiesPortalEntities') THEN
    CREATE UNIQUE INDEX ix_announcement_acknowledgments_announcement_id_user_id ON announcement_acknowledgments (announcement_id, user_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251210122428_FacilitiesPortalEntities') THEN
    CREATE INDEX ix_announcement_acknowledgments_user_id ON announcement_acknowledgments (user_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251210122428_FacilitiesPortalEntities') THEN
    CREATE INDEX ix_certification_expiry_notifications_person_certification_id ON certification_expiry_notifications (person_certification_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251210122428_FacilitiesPortalEntities') THEN
    CREATE INDEX ix_client_site_details_assigned_fso_user_id ON client_site_details (assigned_fso_user_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251210122428_FacilitiesPortalEntities') THEN
    CREATE INDEX ix_client_site_details_office_id ON client_site_details (office_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251210122428_FacilitiesPortalEntities') THEN
    CREATE UNIQUE INDEX ix_client_site_details_tenant_id_office_id ON client_site_details (tenant_id, office_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251210122428_FacilitiesPortalEntities') THEN
    CREATE INDEX ix_client_site_details_tenant_id_required_clearance ON client_site_details (tenant_id, required_clearance);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251210122428_FacilitiesPortalEntities') THEN
    CREATE INDEX ix_employee_clearances_expiration_date ON employee_clearances (expiration_date);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251210122428_FacilitiesPortalEntities') THEN
    CREATE INDEX ix_employee_clearances_reinvestigation_date ON employee_clearances (reinvestigation_date);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251210122428_FacilitiesPortalEntities') THEN
    CREATE INDEX ix_employee_clearances_tenant_id_level_status ON employee_clearances (tenant_id, level, status);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251210122428_FacilitiesPortalEntities') THEN
    CREATE INDEX ix_employee_clearances_tenant_id_user_id_status ON employee_clearances (tenant_id, user_id, status);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251210122428_FacilitiesPortalEntities') THEN
    CREATE INDEX ix_employee_clearances_user_id ON employee_clearances (user_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251210122428_FacilitiesPortalEntities') THEN
    CREATE INDEX ix_employee_clearances_verified_by_user_id ON employee_clearances (verified_by_user_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251210122428_FacilitiesPortalEntities') THEN
    CREATE INDEX ix_facility_announcements_authored_by_user_id ON facility_announcements (authored_by_user_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251210122428_FacilitiesPortalEntities') THEN
    CREATE INDEX ix_facility_announcements_effective_date_expiration_date ON facility_announcements (effective_date, expiration_date);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251210122428_FacilitiesPortalEntities') THEN
    CREATE INDEX ix_facility_announcements_office_id ON facility_announcements (office_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251210122428_FacilitiesPortalEntities') THEN
    CREATE INDEX ix_facility_announcements_tenant_id_office_id_is_active ON facility_announcements (tenant_id, office_id, is_active);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251210122428_FacilitiesPortalEntities') THEN
    CREATE INDEX ix_facility_announcements_tenant_id_priority_is_active ON facility_announcements (tenant_id, priority, is_active);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251210122428_FacilitiesPortalEntities') THEN
    CREATE INDEX "ix_facility_attribute_definitions_tenant_id_entity_type_is_act~" ON facility_attribute_definitions (tenant_id, entity_type, is_active);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251210122428_FacilitiesPortalEntities') THEN
    CREATE UNIQUE INDEX ix_facility_attribute_definitions_tenant_id_name ON facility_attribute_definitions (tenant_id, name);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251210122428_FacilitiesPortalEntities') THEN
    CREATE INDEX ix_facility_check_ins_method_check_in_time ON facility_check_ins (method, check_in_time);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251210122428_FacilitiesPortalEntities') THEN
    CREATE INDEX ix_facility_check_ins_office_id ON facility_check_ins (office_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251210122428_FacilitiesPortalEntities') THEN
    CREATE INDEX ix_facility_check_ins_space_id ON facility_check_ins (space_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251210122428_FacilitiesPortalEntities') THEN
    CREATE INDEX ix_facility_check_ins_tenant_id_office_id_check_in_time ON facility_check_ins (tenant_id, office_id, check_in_time);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251210122428_FacilitiesPortalEntities') THEN
    CREATE INDEX ix_facility_check_ins_tenant_id_user_id_check_in_time ON facility_check_ins (tenant_id, user_id, check_in_time);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251210122428_FacilitiesPortalEntities') THEN
    CREATE INDEX ix_facility_check_ins_user_id ON facility_check_ins (user_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251210122428_FacilitiesPortalEntities') THEN
    CREATE INDEX ix_facility_usage_daily_office_id ON facility_usage_daily (office_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251210122428_FacilitiesPortalEntities') THEN
    CREATE INDEX ix_facility_usage_daily_tenant_id_date ON facility_usage_daily (tenant_id, date);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251210122428_FacilitiesPortalEntities') THEN
    CREATE UNIQUE INDEX ix_facility_usage_daily_tenant_id_office_id_date ON facility_usage_daily (tenant_id, office_id, date);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251210122428_FacilitiesPortalEntities') THEN
    CREATE INDEX ix_field_assignments_approved_by_user_id ON field_assignments (approved_by_user_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251210122428_FacilitiesPortalEntities') THEN
    CREATE INDEX ix_field_assignments_clearance_verified_by_user_id ON field_assignments (clearance_verified_by_user_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251210122428_FacilitiesPortalEntities') THEN
    CREATE INDEX ix_field_assignments_client_site_office_id ON field_assignments (client_site_office_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251210122428_FacilitiesPortalEntities') THEN
    CREATE INDEX ix_field_assignments_start_date_end_date ON field_assignments (start_date, end_date);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251210122428_FacilitiesPortalEntities') THEN
    CREATE INDEX ix_field_assignments_tenant_id_client_site_office_id_status ON field_assignments (tenant_id, client_site_office_id, status);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251210122428_FacilitiesPortalEntities') THEN
    CREATE INDEX ix_field_assignments_tenant_id_user_id_status ON field_assignments (tenant_id, user_id, status);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251210122428_FacilitiesPortalEntities') THEN
    CREATE INDEX ix_field_assignments_user_id ON field_assignments (user_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251210122428_FacilitiesPortalEntities') THEN
    CREATE INDEX ix_foreign_travel_records_approved_by_user_id ON foreign_travel_records (approved_by_user_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251210122428_FacilitiesPortalEntities') THEN
    CREATE INDEX ix_foreign_travel_records_briefed_by_user_id ON foreign_travel_records (briefed_by_user_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251210122428_FacilitiesPortalEntities') THEN
    CREATE INDEX ix_foreign_travel_records_debriefed_by_user_id ON foreign_travel_records (debriefed_by_user_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251210122428_FacilitiesPortalEntities') THEN
    CREATE INDEX ix_foreign_travel_records_departure_date_return_date ON foreign_travel_records (departure_date, return_date);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251210122428_FacilitiesPortalEntities') THEN
    CREATE INDEX ix_foreign_travel_records_tenant_id_status_departure_date ON foreign_travel_records (tenant_id, status, departure_date);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251210122428_FacilitiesPortalEntities') THEN
    CREATE INDEX ix_foreign_travel_records_tenant_id_user_id_status ON foreign_travel_records (tenant_id, user_id, status);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251210122428_FacilitiesPortalEntities') THEN
    CREATE INDEX ix_foreign_travel_records_user_id ON foreign_travel_records (user_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251210122428_FacilitiesPortalEntities') THEN
    CREATE INDEX ix_lease_amendments_lease_id ON lease_amendments (lease_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251210122428_FacilitiesPortalEntities') THEN
    CREATE INDEX ix_lease_amendments_processed_by_user_id ON lease_amendments (processed_by_user_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251210122428_FacilitiesPortalEntities') THEN
    CREATE INDEX ix_lease_amendments_tenant_id_lease_id_effective_date ON lease_amendments (tenant_id, lease_id, effective_date);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251210122428_FacilitiesPortalEntities') THEN
    CREATE INDEX ix_lease_attachments_amendment_id ON lease_attachments (amendment_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251210122428_FacilitiesPortalEntities') THEN
    CREATE INDEX ix_lease_attachments_lease_id ON lease_attachments (lease_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251210122428_FacilitiesPortalEntities') THEN
    CREATE INDEX ix_lease_attachments_stored_file_id ON lease_attachments (stored_file_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251210122428_FacilitiesPortalEntities') THEN
    CREATE INDEX ix_lease_attachments_tenant_id_lease_id_type ON lease_attachments (tenant_id, lease_id, type);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251210122428_FacilitiesPortalEntities') THEN
    CREATE INDEX ix_lease_attachments_uploaded_by_user_id ON lease_attachments (uploaded_by_user_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251210122428_FacilitiesPortalEntities') THEN
    CREATE INDEX ix_lease_option_years_exercised_by_user_id ON lease_option_years (exercised_by_user_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251210122428_FacilitiesPortalEntities') THEN
    CREATE INDEX ix_lease_option_years_lease_id ON lease_option_years (lease_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251210122428_FacilitiesPortalEntities') THEN
    CREATE INDEX ix_lease_option_years_status_exercise_deadline ON lease_option_years (status, exercise_deadline);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251210122428_FacilitiesPortalEntities') THEN
    CREATE INDEX ix_lease_option_years_tenant_id_lease_id_option_number ON lease_option_years (tenant_id, lease_id, option_number);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251210122428_FacilitiesPortalEntities') THEN
    CREATE INDEX ix_leases_office_id ON leases (office_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251210122428_FacilitiesPortalEntities') THEN
    CREATE INDEX ix_leases_tenant_id_lease_end_date ON leases (tenant_id, lease_end_date);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251210122428_FacilitiesPortalEntities') THEN
    CREATE UNIQUE INDEX ix_leases_tenant_id_lease_number ON leases (tenant_id, lease_number);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251210122428_FacilitiesPortalEntities') THEN
    CREATE INDEX ix_leases_tenant_id_office_id_status ON leases (tenant_id, office_id, status);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251210122428_FacilitiesPortalEntities') THEN
    CREATE INDEX ix_office_pocs_office_id_is_primary ON office_pocs (office_id, is_primary);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251210122428_FacilitiesPortalEntities') THEN
    CREATE INDEX ix_office_pocs_tenant_id_office_id_role ON office_pocs (tenant_id, office_id, role);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251210122428_FacilitiesPortalEntities') THEN
    CREATE INDEX ix_office_pocs_user_id ON office_pocs (user_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251210122428_FacilitiesPortalEntities') THEN
    CREATE INDEX ix_office_travel_guides_last_updated_by_user_id ON office_travel_guides (last_updated_by_user_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251210122428_FacilitiesPortalEntities') THEN
    CREATE INDEX ix_office_travel_guides_office_id ON office_travel_guides (office_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251210122428_FacilitiesPortalEntities') THEN
    CREATE UNIQUE INDEX ix_office_travel_guides_tenant_id_office_id ON office_travel_guides (tenant_id, office_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251210122428_FacilitiesPortalEntities') THEN
    CREATE INDEX ix_scif_access_logs_escort_user_id ON scif_access_logs (escort_user_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251210122428_FacilitiesPortalEntities') THEN
    CREATE INDEX ix_scif_access_logs_office_id ON scif_access_logs (office_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251210122428_FacilitiesPortalEntities') THEN
    CREATE INDEX ix_scif_access_logs_tenant_id_office_id_access_time ON scif_access_logs (tenant_id, office_id, access_time);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251210122428_FacilitiesPortalEntities') THEN
    CREATE INDEX ix_scif_access_logs_tenant_id_user_id_access_time ON scif_access_logs (tenant_id, user_id, access_time);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251210122428_FacilitiesPortalEntities') THEN
    CREATE INDEX ix_scif_access_logs_user_id ON scif_access_logs (user_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251210122428_FacilitiesPortalEntities') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20251210122428_FacilitiesPortalEntities', '8.0.11');
    END IF;
END $EF$;
COMMIT;

START TRANSACTION;


DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251212000021_AddHelpArticles') THEN
    CREATE TABLE help_articles (
        id uuid NOT NULL,
        tenant_id uuid,
        context_key text NOT NULL,
        title text NOT NULL,
        description text,
        jira_article_url text,
        video_url text,
        video_title text,
        content text,
        sort_order integer NOT NULL,
        is_active boolean NOT NULL,
        module_name text,
        tags text,
        icon_name text,
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone,
        created_by_user_id uuid,
        updated_by_user_id uuid,
        is_deleted boolean NOT NULL,
        deleted_at timestamp with time zone,
        deleted_by_user_id uuid,
        deletion_reason text,
        CONSTRAINT pk_help_articles PRIMARY KEY (id),
        CONSTRAINT fk_help_articles__tenants_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants (id)
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251212000021_AddHelpArticles') THEN
    CREATE INDEX ix_wbs_elements_project_id_approval_status ON wbs_elements (project_id, approval_status);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251212000021_AddHelpArticles') THEN
    CREATE INDEX ix_wbs_elements_project_id_type ON wbs_elements (project_id, type);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251212000021_AddHelpArticles') THEN
    CREATE INDEX ix_help_articles_tenant_id ON help_articles (tenant_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251212000021_AddHelpArticles') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20251212000021_AddHelpArticles', '8.0.11');
    END IF;
END $EF$;
COMMIT;

START TRANSACTION;


DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251212001504_AddAppTilesAndFeedback') THEN
    CREATE TABLE app_tiles (
        id uuid NOT NULL,
        tenant_id uuid,
        user_id uuid,
        name character varying(100) NOT NULL,
        description character varying(500),
        icon character varying(200) NOT NULL,
        background_color character varying(20) NOT NULL,
        text_color character varying(20) NOT NULL,
        url character varying(2000) NOT NULL,
        open_in_new_tab boolean NOT NULL,
        sort_order integer NOT NULL,
        is_built_in boolean NOT NULL,
        is_active boolean NOT NULL,
        category character varying(100),
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone,
        created_by_user_id uuid,
        updated_by_user_id uuid,
        is_deleted boolean NOT NULL,
        deleted_at timestamp with time zone,
        deleted_by_user_id uuid,
        deletion_reason text,
        CONSTRAINT pk_app_tiles PRIMARY KEY (id),
        CONSTRAINT fk_app_tiles__tenants_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE,
        CONSTRAINT fk_app_tiles__users_user_id FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251212001504_AddAppTilesAndFeedback') THEN
    CREATE TABLE feedbacks (
        id uuid NOT NULL,
        submitted_by_user_id uuid NOT NULL,
        type integer NOT NULL,
        priority integer NOT NULL,
        title character varying(200) NOT NULL,
        description character varying(4000) NOT NULL,
        page_url character varying(500),
        steps_to_reproduce character varying(4000),
        expected_behavior character varying(2000),
        actual_behavior character varying(2000),
        browser_info character varying(500),
        screenshot_url character varying(2000),
        status integer NOT NULL,
        admin_notes character varying(4000),
        external_ticket_id character varying(100),
        external_ticket_url character varying(500),
        ai_conversation_history text,
        refined_requirements character varying(8000),
        resolved_at timestamp with time zone,
        resolved_by_user_id uuid,
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone,
        created_by_user_id uuid,
        updated_by_user_id uuid,
        is_deleted boolean NOT NULL,
        deleted_at timestamp with time zone,
        deleted_by_user_id uuid,
        deletion_reason text,
        tenant_id uuid NOT NULL,
        CONSTRAINT pk_feedbacks PRIMARY KEY (id),
        CONSTRAINT fk_feedbacks__tenants_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE,
        CONSTRAINT fk_feedbacks__users_resolved_by_user_id FOREIGN KEY (resolved_by_user_id) REFERENCES users (id) ON DELETE SET NULL,
        CONSTRAINT fk_feedbacks__users_submitted_by_user_id FOREIGN KEY (submitted_by_user_id) REFERENCES users (id) ON DELETE RESTRICT
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251212001504_AddAppTilesAndFeedback') THEN
    CREATE INDEX ix_app_tiles_is_built_in ON app_tiles (is_built_in);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251212001504_AddAppTilesAndFeedback') THEN
    CREATE INDEX ix_app_tiles_tenant_id_sort_order ON app_tiles (tenant_id, sort_order);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251212001504_AddAppTilesAndFeedback') THEN
    CREATE INDEX ix_app_tiles_user_id_sort_order ON app_tiles (user_id, sort_order);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251212001504_AddAppTilesAndFeedback') THEN
    CREATE INDEX ix_feedbacks_created_at ON feedbacks (created_at);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251212001504_AddAppTilesAndFeedback') THEN
    CREATE INDEX ix_feedbacks_resolved_by_user_id ON feedbacks (resolved_by_user_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251212001504_AddAppTilesAndFeedback') THEN
    CREATE INDEX ix_feedbacks_submitted_by_user_id ON feedbacks (submitted_by_user_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251212001504_AddAppTilesAndFeedback') THEN
    CREATE INDEX ix_feedbacks_tenant_id_status ON feedbacks (tenant_id, status);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251212001504_AddAppTilesAndFeedback') THEN
    CREATE INDEX ix_feedbacks_tenant_id_type ON feedbacks (tenant_id, type);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251212001504_AddAppTilesAndFeedback') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20251212001504_AddAppTilesAndFeedback', '8.0.11');
    END IF;
END $EF$;
COMMIT;

START TRANSACTION;


DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251215145750_AddUserDelegateFields') THEN
    ALTER TABLE users ADD executive_assistant_id uuid;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251215145750_AddUserDelegateFields') THEN
    ALTER TABLE users ADD home_office_id uuid;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251215145750_AddUserDelegateFields') THEN
    ALTER TABLE users ADD standard_delegate_ids jsonb NOT NULL DEFAULT '{}';
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251215145750_AddUserDelegateFields') THEN
    CREATE INDEX ix_users_executive_assistant_id ON users (executive_assistant_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251215145750_AddUserDelegateFields') THEN
    CREATE INDEX ix_users_home_office_id ON users (home_office_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251215145750_AddUserDelegateFields') THEN
    ALTER TABLE users ADD CONSTRAINT fk_users_offices_home_office_id FOREIGN KEY (home_office_id) REFERENCES offices (id) ON DELETE SET NULL;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251215145750_AddUserDelegateFields') THEN
    ALTER TABLE users ADD CONSTRAINT fk_users_users_executive_assistant_id FOREIGN KEY (executive_assistant_id) REFERENCES users (id) ON DELETE SET NULL;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20251215145750_AddUserDelegateFields') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20251215145750_AddUserDelegateFields', '8.0.11');
    END IF;
END $EF$;
COMMIT;


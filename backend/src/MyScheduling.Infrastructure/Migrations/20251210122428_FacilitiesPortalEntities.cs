using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MyScheduling.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class FacilitiesPortalEntities : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "certification_expiry_email_days",
                table: "tenant_settings",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "certification_expiry_warning_days",
                table: "tenant_settings",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<bool>(
                name: "enable_certification_expiry_emails",
                table: "tenant_settings",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "certification_expiry_notifications",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    person_certification_id = table.Column<Guid>(type: "uuid", nullable: false),
                    sent_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    is_deleted = table.Column<bool>(type: "boolean", nullable: false),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    deleted_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    deletion_reason = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_certification_expiry_notifications", x => x.id);
                    table.ForeignKey(
                        name: "fk_certification_expiry_notifications__person_certifications_per~",
                        column: x => x.person_certification_id,
                        principalTable: "person_certifications",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "client_site_details",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    office_id = table.Column<Guid>(type: "uuid", nullable: false),
                    client_name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    contract_number = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    task_order_number = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    client_poc_name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    client_poc_email = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    client_poc_phone = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    required_clearance = table.Column<int>(type: "integer", nullable: false),
                    requires_badge = table.Column<bool>(type: "boolean", nullable: false),
                    badge_type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    badge_instructions = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    has_scif = table.Column<bool>(type: "boolean", nullable: false),
                    scif_access_instructions = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    security_poc_name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    security_poc_email = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    security_poc_phone = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    site_hours = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    access_instructions = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    check_in_procedure = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    escort_requirements = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    network_access = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    it_support_contact = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    approved_devices = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    assigned_fso_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    custom_attributes = table.Column<string>(type: "jsonb", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    is_deleted = table.Column<bool>(type: "boolean", nullable: false),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    deleted_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    deletion_reason = table.Column<string>(type: "text", nullable: true),
                    tenant_id = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_client_site_details", x => x.id);
                    table.ForeignKey(
                        name: "fk_client_site_details__offices_office_id",
                        column: x => x.office_id,
                        principalTable: "offices",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_client_site_details__tenants_tenant_id",
                        column: x => x.tenant_id,
                        principalTable: "tenants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_client_site_details__users_assigned_fso_user_id",
                        column: x => x.assigned_fso_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "employee_clearances",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    level = table.Column<int>(type: "integer", nullable: false),
                    status = table.Column<int>(type: "integer", nullable: false),
                    investigation_type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    investigation_date = table.Column<DateOnly>(type: "date", nullable: true),
                    granted_date = table.Column<DateOnly>(type: "date", nullable: true),
                    expiration_date = table.Column<DateOnly>(type: "date", nullable: true),
                    reinvestigation_date = table.Column<DateOnly>(type: "date", nullable: true),
                    has_polygraph = table.Column<bool>(type: "boolean", nullable: false),
                    polygraph_type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    polygraph_date = table.Column<DateOnly>(type: "date", nullable: true),
                    polygraph_expiration_date = table.Column<DateOnly>(type: "date", nullable: true),
                    has_sci_access = table.Column<bool>(type: "boolean", nullable: false),
                    sci_compartments = table.Column<string>(type: "jsonb", nullable: true),
                    sci_access_date = table.Column<DateOnly>(type: "date", nullable: true),
                    sponsoring_agency = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    contractor_code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    verified_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    verified_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    notes = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    is_deleted = table.Column<bool>(type: "boolean", nullable: false),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    deleted_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    deletion_reason = table.Column<string>(type: "text", nullable: true),
                    tenant_id = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_employee_clearances", x => x.id);
                    table.ForeignKey(
                        name: "fk_employee_clearances__tenants_tenant_id",
                        column: x => x.tenant_id,
                        principalTable: "tenants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_employee_clearances__users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_employee_clearances__users_verified_by_user_id",
                        column: x => x.verified_by_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "facility_announcements",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    office_id = table.Column<Guid>(type: "uuid", nullable: true),
                    title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    content = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    type = table.Column<int>(type: "integer", nullable: false),
                    priority = table.Column<int>(type: "integer", nullable: false),
                    effective_date = table.Column<DateOnly>(type: "date", nullable: true),
                    expiration_date = table.Column<DateOnly>(type: "date", nullable: true),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    requires_acknowledgment = table.Column<bool>(type: "boolean", nullable: false),
                    authored_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    published_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    is_deleted = table.Column<bool>(type: "boolean", nullable: false),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    deleted_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    deletion_reason = table.Column<string>(type: "text", nullable: true),
                    tenant_id = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_facility_announcements", x => x.id);
                    table.ForeignKey(
                        name: "fk_facility_announcements__offices_office_id",
                        column: x => x.office_id,
                        principalTable: "offices",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_facility_announcements__tenants_tenant_id",
                        column: x => x.tenant_id,
                        principalTable: "tenants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_facility_announcements__users_authored_by_user_id",
                        column: x => x.authored_by_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "facility_attribute_definitions",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    display_name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    attribute_type = table.Column<int>(type: "integer", nullable: false),
                    entity_type = table.Column<int>(type: "integer", nullable: false),
                    description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    is_required = table.Column<bool>(type: "boolean", nullable: false),
                    is_searchable = table.Column<bool>(type: "boolean", nullable: false),
                    default_value = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    validation_rule = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    options = table.Column<string>(type: "jsonb", nullable: true),
                    display_order = table.Column<int>(type: "integer", nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    is_deleted = table.Column<bool>(type: "boolean", nullable: false),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    deleted_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    deletion_reason = table.Column<string>(type: "text", nullable: true),
                    tenant_id = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_facility_attribute_definitions", x => x.id);
                    table.ForeignKey(
                        name: "fk_facility_attribute_definitions__tenants_tenant_id",
                        column: x => x.tenant_id,
                        principalTable: "tenants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "facility_check_ins",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    office_id = table.Column<Guid>(type: "uuid", nullable: false),
                    check_in_time = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    check_out_time = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    method = table.Column<int>(type: "integer", nullable: false),
                    badge_id = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    qr_code = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    space_id = table.Column<Guid>(type: "uuid", nullable: true),
                    notes = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    device_info = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    latitude = table.Column<double>(type: "double precision", nullable: true),
                    longitude = table.Column<double>(type: "double precision", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    is_deleted = table.Column<bool>(type: "boolean", nullable: false),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    deleted_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    deletion_reason = table.Column<string>(type: "text", nullable: true),
                    tenant_id = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_facility_check_ins", x => x.id);
                    table.ForeignKey(
                        name: "fk_facility_check_ins__offices_office_id",
                        column: x => x.office_id,
                        principalTable: "offices",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_facility_check_ins__spaces_space_id",
                        column: x => x.space_id,
                        principalTable: "spaces",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "fk_facility_check_ins__tenants_tenant_id",
                        column: x => x.tenant_id,
                        principalTable: "tenants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_facility_check_ins__users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "facility_usage_daily",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    office_id = table.Column<Guid>(type: "uuid", nullable: false),
                    date = table.Column<DateOnly>(type: "date", nullable: false),
                    total_bookings = table.Column<int>(type: "integer", nullable: false),
                    checked_in_count = table.Column<int>(type: "integer", nullable: false),
                    no_show_count = table.Column<int>(type: "integer", nullable: false),
                    cancelled_count = table.Column<int>(type: "integer", nullable: false),
                    total_spaces = table.Column<int>(type: "integer", nullable: false),
                    booked_spaces = table.Column<int>(type: "integer", nullable: false),
                    utilization_rate = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false),
                    total_check_ins = table.Column<int>(type: "integer", nullable: false),
                    unique_visitors = table.Column<int>(type: "integer", nullable: false),
                    average_stay_hours = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false),
                    peak_occupancy = table.Column<int>(type: "integer", nullable: false),
                    peak_time = table.Column<TimeOnly>(type: "time without time zone", nullable: true),
                    utilization_by_space_type = table.Column<string>(type: "jsonb", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    is_deleted = table.Column<bool>(type: "boolean", nullable: false),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    deleted_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    deletion_reason = table.Column<string>(type: "text", nullable: true),
                    tenant_id = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_facility_usage_daily", x => x.id);
                    table.ForeignKey(
                        name: "fk_facility_usage_daily__offices_office_id",
                        column: x => x.office_id,
                        principalTable: "offices",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_facility_usage_daily__tenants_tenant_id",
                        column: x => x.tenant_id,
                        principalTable: "tenants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "field_assignments",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    client_site_office_id = table.Column<Guid>(type: "uuid", nullable: false),
                    start_date = table.Column<DateOnly>(type: "date", nullable: false),
                    end_date = table.Column<DateOnly>(type: "date", nullable: true),
                    status = table.Column<int>(type: "integer", nullable: false),
                    project_name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    task_description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    contract_number = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    bill_rate = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: true),
                    expected_hours_per_week = table.Column<int>(type: "integer", nullable: true),
                    clearance_verified = table.Column<bool>(type: "boolean", nullable: false),
                    clearance_verified_date = table.Column<DateOnly>(type: "date", nullable: true),
                    clearance_verified_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    badge_issued = table.Column<bool>(type: "boolean", nullable: false),
                    badge_number = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    badge_expiration_date = table.Column<DateOnly>(type: "date", nullable: true),
                    security_briefing_completed = table.Column<bool>(type: "boolean", nullable: false),
                    security_briefing_date = table.Column<DateOnly>(type: "date", nullable: true),
                    approved_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    approved_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    approval_notes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    notes = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    is_deleted = table.Column<bool>(type: "boolean", nullable: false),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    deleted_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    deletion_reason = table.Column<string>(type: "text", nullable: true),
                    tenant_id = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_field_assignments", x => x.id);
                    table.ForeignKey(
                        name: "fk_field_assignments__offices_client_site_office_id",
                        column: x => x.client_site_office_id,
                        principalTable: "offices",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_field_assignments__tenants_tenant_id",
                        column: x => x.tenant_id,
                        principalTable: "tenants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_field_assignments__users_approved_by_user_id",
                        column: x => x.approved_by_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "fk_field_assignments__users_clearance_verified_by_user_id",
                        column: x => x.clearance_verified_by_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "fk_field_assignments__users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "foreign_travel_records",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    destination_country = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    destination_city = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    departure_date = table.Column<DateOnly>(type: "date", nullable: false),
                    return_date = table.Column<DateOnly>(type: "date", nullable: false),
                    purpose = table.Column<int>(type: "integer", nullable: false),
                    purpose_description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    status = table.Column<int>(type: "integer", nullable: false),
                    briefing_completed = table.Column<bool>(type: "boolean", nullable: false),
                    briefing_date = table.Column<DateOnly>(type: "date", nullable: true),
                    briefed_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    fso_approved = table.Column<bool>(type: "boolean", nullable: false),
                    approved_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    approved_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    approval_notes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    debriefing_completed = table.Column<bool>(type: "boolean", nullable: false),
                    debriefing_date = table.Column<DateOnly>(type: "date", nullable: true),
                    debriefed_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    debriefing_notes = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    foreign_contacts_reported = table.Column<bool>(type: "boolean", nullable: false),
                    foreign_contacts = table.Column<string>(type: "jsonb", nullable: true),
                    notes = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    is_deleted = table.Column<bool>(type: "boolean", nullable: false),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    deleted_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    deletion_reason = table.Column<string>(type: "text", nullable: true),
                    tenant_id = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_foreign_travel_records", x => x.id);
                    table.ForeignKey(
                        name: "fk_foreign_travel_records__tenants_tenant_id",
                        column: x => x.tenant_id,
                        principalTable: "tenants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_foreign_travel_records__users_approved_by_user_id",
                        column: x => x.approved_by_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "fk_foreign_travel_records__users_briefed_by_user_id",
                        column: x => x.briefed_by_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "fk_foreign_travel_records__users_debriefed_by_user_id",
                        column: x => x.debriefed_by_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "fk_foreign_travel_records__users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "leases",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    office_id = table.Column<Guid>(type: "uuid", nullable: false),
                    lease_number = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    external_lease_id = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    landlord_name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    landlord_contact_name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    landlord_email = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    landlord_phone = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    property_management_company = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    property_manager_name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    property_manager_email = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    property_manager_phone = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    lease_start_date = table.Column<DateOnly>(type: "date", nullable: false),
                    lease_end_date = table.Column<DateOnly>(type: "date", nullable: false),
                    lease_term = table.Column<int>(type: "integer", nullable: false),
                    status = table.Column<int>(type: "integer", nullable: false),
                    square_footage = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false),
                    usable_square_footage = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: true),
                    parking_spots = table.Column<int>(type: "integer", nullable: true),
                    reserved_parking_spots = table.Column<int>(type: "integer", nullable: true),
                    has_loading_dock = table.Column<bool>(type: "boolean", nullable: false),
                    max_occupancy = table.Column<int>(type: "integer", nullable: true),
                    base_rent_monthly = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false),
                    cam_charges_monthly = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: true),
                    utilities_monthly = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: true),
                    taxes_monthly = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: true),
                    insurance_monthly = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: true),
                    other_charges_monthly = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: true),
                    other_charges_description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    security_deposit = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: true),
                    escalation_percentage = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: true),
                    next_escalation_date = table.Column<DateOnly>(type: "date", nullable: true),
                    renewal_notice_deadline = table.Column<DateOnly>(type: "date", nullable: true),
                    renewal_notice_days = table.Column<int>(type: "integer", nullable: true),
                    early_termination_date = table.Column<DateOnly>(type: "date", nullable: true),
                    early_termination_fee = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: true),
                    is_ada_compliant = table.Column<bool>(type: "boolean", nullable: false),
                    required_security_level = table.Column<int>(type: "integer", nullable: true),
                    has_scif = table.Column<bool>(type: "boolean", nullable: false),
                    scif_details = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    insurance_provider = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    insurance_policy_number = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    insurance_expiration_date = table.Column<DateOnly>(type: "date", nullable: true),
                    insurance_coverage_amount = table.Column<decimal>(type: "numeric(14,2)", precision: 14, scale: 2, nullable: true),
                    critical_clauses = table.Column<string>(type: "jsonb", nullable: true),
                    special_terms = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    notes = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    custom_attributes = table.Column<string>(type: "jsonb", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    is_deleted = table.Column<bool>(type: "boolean", nullable: false),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    deleted_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    deletion_reason = table.Column<string>(type: "text", nullable: true),
                    tenant_id = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_leases", x => x.id);
                    table.ForeignKey(
                        name: "fk_leases__offices_office_id",
                        column: x => x.office_id,
                        principalTable: "offices",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_leases__tenants_tenant_id",
                        column: x => x.tenant_id,
                        principalTable: "tenants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "office_pocs",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    office_id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    email = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    phone = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    mobile_phone = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    role = table.Column<int>(type: "integer", nullable: false),
                    responsibilities = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    is_primary = table.Column<bool>(type: "boolean", nullable: false),
                    is_emergency_contact = table.Column<bool>(type: "boolean", nullable: false),
                    display_order = table.Column<int>(type: "integer", nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    is_deleted = table.Column<bool>(type: "boolean", nullable: false),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    deleted_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    deletion_reason = table.Column<string>(type: "text", nullable: true),
                    tenant_id = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_office_pocs", x => x.id);
                    table.ForeignKey(
                        name: "fk_office_pocs__tenants_tenant_id",
                        column: x => x.tenant_id,
                        principalTable: "tenants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_office_pocs__users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "fk_office_pocs_offices_office_id",
                        column: x => x.office_id,
                        principalTable: "offices",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "office_travel_guides",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    office_id = table.Column<Guid>(type: "uuid", nullable: false),
                    nearest_airport = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    airport_code = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    airport_distance = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    recommended_ground_transport = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    public_transit_options = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    driving_directions = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    parking_instructions = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    parking_daily_cost = table.Column<decimal>(type: "numeric(8,2)", precision: 8, scale: 2, nullable: true),
                    recommended_hotels = table.Column<string>(type: "jsonb", nullable: true),
                    corporate_hotel_code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    neighborhood_tips = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    building_hours = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    after_hours_access = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    visitor_check_in = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    security_requirements = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    badge_instructions = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    dress_code = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    cafeteria_info = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    nearby_restaurants = table.Column<string>(type: "jsonb", nullable: true),
                    wifi_instructions = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    conference_room_booking = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    printing_instructions = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    amenities = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    reception_phone = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    security_phone = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    facilities_email = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    emergency_contact = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    welcome_message = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    important_notes = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    photo_gallery = table.Column<string>(type: "jsonb", nullable: true),
                    video_tour_url = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    virtual_tour_url = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    current_announcements = table.Column<string>(type: "jsonb", nullable: true),
                    special_instructions = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    last_updated = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    last_updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    custom_attributes = table.Column<string>(type: "jsonb", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    is_deleted = table.Column<bool>(type: "boolean", nullable: false),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    deleted_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    deletion_reason = table.Column<string>(type: "text", nullable: true),
                    tenant_id = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_office_travel_guides", x => x.id);
                    table.ForeignKey(
                        name: "fk_office_travel_guides__tenants_tenant_id",
                        column: x => x.tenant_id,
                        principalTable: "tenants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_office_travel_guides__users_last_updated_by_user_id",
                        column: x => x.last_updated_by_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "fk_office_travel_guides_offices_office_id",
                        column: x => x.office_id,
                        principalTable: "offices",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "scif_access_logs",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    office_id = table.Column<Guid>(type: "uuid", nullable: false),
                    access_time = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    exit_time = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    access_type = table.Column<int>(type: "integer", nullable: false),
                    purpose = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    escort_required = table.Column<bool>(type: "boolean", nullable: false),
                    escort_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    badge_number = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    notes = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    is_deleted = table.Column<bool>(type: "boolean", nullable: false),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    deleted_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    deletion_reason = table.Column<string>(type: "text", nullable: true),
                    tenant_id = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_scif_access_logs", x => x.id);
                    table.ForeignKey(
                        name: "fk_scif_access_logs__tenants_tenant_id",
                        column: x => x.tenant_id,
                        principalTable: "tenants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_scif_access_logs__users_escort_user_id",
                        column: x => x.escort_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "fk_scif_access_logs__users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_scif_access_logs_offices_office_id",
                        column: x => x.office_id,
                        principalTable: "offices",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "announcement_acknowledgments",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    announcement_id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    acknowledged_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    is_deleted = table.Column<bool>(type: "boolean", nullable: false),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    deleted_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    deletion_reason = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_announcement_acknowledgments", x => x.id);
                    table.ForeignKey(
                        name: "fk_announcement_acknowledgments__facility_announcements_announce~",
                        column: x => x.announcement_id,
                        principalTable: "facility_announcements",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_announcement_acknowledgments__users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "lease_amendments",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    lease_id = table.Column<Guid>(type: "uuid", nullable: false),
                    amendment_number = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    effective_date = table.Column<DateOnly>(type: "date", nullable: false),
                    executed_date = table.Column<DateOnly>(type: "date", nullable: true),
                    description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    type = table.Column<int>(type: "integer", nullable: false),
                    rent_change = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: true),
                    square_footage_change = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: true),
                    new_lease_end_date = table.Column<DateOnly>(type: "date", nullable: true),
                    terms = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    processed_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    is_deleted = table.Column<bool>(type: "boolean", nullable: false),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    deleted_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    deletion_reason = table.Column<string>(type: "text", nullable: true),
                    tenant_id = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_lease_amendments", x => x.id);
                    table.ForeignKey(
                        name: "fk_lease_amendments__tenants_tenant_id",
                        column: x => x.tenant_id,
                        principalTable: "tenants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_lease_amendments__users_processed_by_user_id",
                        column: x => x.processed_by_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "fk_lease_amendments_leases_lease_id",
                        column: x => x.lease_id,
                        principalTable: "leases",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "lease_option_years",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    lease_id = table.Column<Guid>(type: "uuid", nullable: false),
                    option_number = table.Column<int>(type: "integer", nullable: false),
                    option_start_date = table.Column<DateOnly>(type: "date", nullable: false),
                    option_end_date = table.Column<DateOnly>(type: "date", nullable: false),
                    term_months = table.Column<int>(type: "integer", nullable: false),
                    proposed_rent_monthly = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: true),
                    exercise_deadline = table.Column<DateOnly>(type: "date", nullable: false),
                    status = table.Column<int>(type: "integer", nullable: false),
                    exercised_date = table.Column<DateOnly>(type: "date", nullable: true),
                    exercised_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    notes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    is_deleted = table.Column<bool>(type: "boolean", nullable: false),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    deleted_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    deletion_reason = table.Column<string>(type: "text", nullable: true),
                    tenant_id = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_lease_option_years", x => x.id);
                    table.ForeignKey(
                        name: "fk_lease_option_years__tenants_tenant_id",
                        column: x => x.tenant_id,
                        principalTable: "tenants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_lease_option_years__users_exercised_by_user_id",
                        column: x => x.exercised_by_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "fk_lease_option_years_leases_lease_id",
                        column: x => x.lease_id,
                        principalTable: "leases",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "lease_attachments",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    lease_id = table.Column<Guid>(type: "uuid", nullable: true),
                    amendment_id = table.Column<Guid>(type: "uuid", nullable: true),
                    stored_file_id = table.Column<Guid>(type: "uuid", nullable: true),
                    file_name = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    storage_path = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    content_type = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    file_size_bytes = table.Column<long>(type: "bigint", nullable: false),
                    type = table.Column<int>(type: "integer", nullable: false),
                    description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    uploaded_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    uploaded_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    is_deleted = table.Column<bool>(type: "boolean", nullable: false),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    deleted_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    deletion_reason = table.Column<string>(type: "text", nullable: true),
                    tenant_id = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_lease_attachments", x => x.id);
                    table.ForeignKey(
                        name: "fk_lease_attachments__stored_files_stored_file_id",
                        column: x => x.stored_file_id,
                        principalTable: "stored_files",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "fk_lease_attachments__tenants_tenant_id",
                        column: x => x.tenant_id,
                        principalTable: "tenants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_lease_attachments__users_uploaded_by_user_id",
                        column: x => x.uploaded_by_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_lease_attachments_lease_amendments_amendment_id",
                        column: x => x.amendment_id,
                        principalTable: "lease_amendments",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_lease_attachments_leases_lease_id",
                        column: x => x.lease_id,
                        principalTable: "leases",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_announcement_acknowledgments_announcement_id_user_id",
                table: "announcement_acknowledgments",
                columns: new[] { "announcement_id", "user_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_announcement_acknowledgments_user_id",
                table: "announcement_acknowledgments",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "ix_certification_expiry_notifications_person_certification_id",
                table: "certification_expiry_notifications",
                column: "person_certification_id");

            migrationBuilder.CreateIndex(
                name: "ix_client_site_details_assigned_fso_user_id",
                table: "client_site_details",
                column: "assigned_fso_user_id");

            migrationBuilder.CreateIndex(
                name: "ix_client_site_details_office_id",
                table: "client_site_details",
                column: "office_id");

            migrationBuilder.CreateIndex(
                name: "ix_client_site_details_tenant_id_office_id",
                table: "client_site_details",
                columns: new[] { "tenant_id", "office_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_client_site_details_tenant_id_required_clearance",
                table: "client_site_details",
                columns: new[] { "tenant_id", "required_clearance" });

            migrationBuilder.CreateIndex(
                name: "ix_employee_clearances_expiration_date",
                table: "employee_clearances",
                column: "expiration_date");

            migrationBuilder.CreateIndex(
                name: "ix_employee_clearances_reinvestigation_date",
                table: "employee_clearances",
                column: "reinvestigation_date");

            migrationBuilder.CreateIndex(
                name: "ix_employee_clearances_tenant_id_level_status",
                table: "employee_clearances",
                columns: new[] { "tenant_id", "level", "status" });

            migrationBuilder.CreateIndex(
                name: "ix_employee_clearances_tenant_id_user_id_status",
                table: "employee_clearances",
                columns: new[] { "tenant_id", "user_id", "status" });

            migrationBuilder.CreateIndex(
                name: "ix_employee_clearances_user_id",
                table: "employee_clearances",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "ix_employee_clearances_verified_by_user_id",
                table: "employee_clearances",
                column: "verified_by_user_id");

            migrationBuilder.CreateIndex(
                name: "ix_facility_announcements_authored_by_user_id",
                table: "facility_announcements",
                column: "authored_by_user_id");

            migrationBuilder.CreateIndex(
                name: "ix_facility_announcements_effective_date_expiration_date",
                table: "facility_announcements",
                columns: new[] { "effective_date", "expiration_date" });

            migrationBuilder.CreateIndex(
                name: "ix_facility_announcements_office_id",
                table: "facility_announcements",
                column: "office_id");

            migrationBuilder.CreateIndex(
                name: "ix_facility_announcements_tenant_id_office_id_is_active",
                table: "facility_announcements",
                columns: new[] { "tenant_id", "office_id", "is_active" });

            migrationBuilder.CreateIndex(
                name: "ix_facility_announcements_tenant_id_priority_is_active",
                table: "facility_announcements",
                columns: new[] { "tenant_id", "priority", "is_active" });

            migrationBuilder.CreateIndex(
                name: "ix_facility_attribute_definitions_tenant_id_entity_type_is_act~",
                table: "facility_attribute_definitions",
                columns: new[] { "tenant_id", "entity_type", "is_active" });

            migrationBuilder.CreateIndex(
                name: "ix_facility_attribute_definitions_tenant_id_name",
                table: "facility_attribute_definitions",
                columns: new[] { "tenant_id", "name" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_facility_check_ins_method_check_in_time",
                table: "facility_check_ins",
                columns: new[] { "method", "check_in_time" });

            migrationBuilder.CreateIndex(
                name: "ix_facility_check_ins_office_id",
                table: "facility_check_ins",
                column: "office_id");

            migrationBuilder.CreateIndex(
                name: "ix_facility_check_ins_space_id",
                table: "facility_check_ins",
                column: "space_id");

            migrationBuilder.CreateIndex(
                name: "ix_facility_check_ins_tenant_id_office_id_check_in_time",
                table: "facility_check_ins",
                columns: new[] { "tenant_id", "office_id", "check_in_time" });

            migrationBuilder.CreateIndex(
                name: "ix_facility_check_ins_tenant_id_user_id_check_in_time",
                table: "facility_check_ins",
                columns: new[] { "tenant_id", "user_id", "check_in_time" });

            migrationBuilder.CreateIndex(
                name: "ix_facility_check_ins_user_id",
                table: "facility_check_ins",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "ix_facility_usage_daily_office_id",
                table: "facility_usage_daily",
                column: "office_id");

            migrationBuilder.CreateIndex(
                name: "ix_facility_usage_daily_tenant_id_date",
                table: "facility_usage_daily",
                columns: new[] { "tenant_id", "date" });

            migrationBuilder.CreateIndex(
                name: "ix_facility_usage_daily_tenant_id_office_id_date",
                table: "facility_usage_daily",
                columns: new[] { "tenant_id", "office_id", "date" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_field_assignments_approved_by_user_id",
                table: "field_assignments",
                column: "approved_by_user_id");

            migrationBuilder.CreateIndex(
                name: "ix_field_assignments_clearance_verified_by_user_id",
                table: "field_assignments",
                column: "clearance_verified_by_user_id");

            migrationBuilder.CreateIndex(
                name: "ix_field_assignments_client_site_office_id",
                table: "field_assignments",
                column: "client_site_office_id");

            migrationBuilder.CreateIndex(
                name: "ix_field_assignments_start_date_end_date",
                table: "field_assignments",
                columns: new[] { "start_date", "end_date" });

            migrationBuilder.CreateIndex(
                name: "ix_field_assignments_tenant_id_client_site_office_id_status",
                table: "field_assignments",
                columns: new[] { "tenant_id", "client_site_office_id", "status" });

            migrationBuilder.CreateIndex(
                name: "ix_field_assignments_tenant_id_user_id_status",
                table: "field_assignments",
                columns: new[] { "tenant_id", "user_id", "status" });

            migrationBuilder.CreateIndex(
                name: "ix_field_assignments_user_id",
                table: "field_assignments",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "ix_foreign_travel_records_approved_by_user_id",
                table: "foreign_travel_records",
                column: "approved_by_user_id");

            migrationBuilder.CreateIndex(
                name: "ix_foreign_travel_records_briefed_by_user_id",
                table: "foreign_travel_records",
                column: "briefed_by_user_id");

            migrationBuilder.CreateIndex(
                name: "ix_foreign_travel_records_debriefed_by_user_id",
                table: "foreign_travel_records",
                column: "debriefed_by_user_id");

            migrationBuilder.CreateIndex(
                name: "ix_foreign_travel_records_departure_date_return_date",
                table: "foreign_travel_records",
                columns: new[] { "departure_date", "return_date" });

            migrationBuilder.CreateIndex(
                name: "ix_foreign_travel_records_tenant_id_status_departure_date",
                table: "foreign_travel_records",
                columns: new[] { "tenant_id", "status", "departure_date" });

            migrationBuilder.CreateIndex(
                name: "ix_foreign_travel_records_tenant_id_user_id_status",
                table: "foreign_travel_records",
                columns: new[] { "tenant_id", "user_id", "status" });

            migrationBuilder.CreateIndex(
                name: "ix_foreign_travel_records_user_id",
                table: "foreign_travel_records",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "ix_lease_amendments_lease_id",
                table: "lease_amendments",
                column: "lease_id");

            migrationBuilder.CreateIndex(
                name: "ix_lease_amendments_processed_by_user_id",
                table: "lease_amendments",
                column: "processed_by_user_id");

            migrationBuilder.CreateIndex(
                name: "ix_lease_amendments_tenant_id_lease_id_effective_date",
                table: "lease_amendments",
                columns: new[] { "tenant_id", "lease_id", "effective_date" });

            migrationBuilder.CreateIndex(
                name: "ix_lease_attachments_amendment_id",
                table: "lease_attachments",
                column: "amendment_id");

            migrationBuilder.CreateIndex(
                name: "ix_lease_attachments_lease_id",
                table: "lease_attachments",
                column: "lease_id");

            migrationBuilder.CreateIndex(
                name: "ix_lease_attachments_stored_file_id",
                table: "lease_attachments",
                column: "stored_file_id");

            migrationBuilder.CreateIndex(
                name: "ix_lease_attachments_tenant_id_lease_id_type",
                table: "lease_attachments",
                columns: new[] { "tenant_id", "lease_id", "type" });

            migrationBuilder.CreateIndex(
                name: "ix_lease_attachments_uploaded_by_user_id",
                table: "lease_attachments",
                column: "uploaded_by_user_id");

            migrationBuilder.CreateIndex(
                name: "ix_lease_option_years_exercised_by_user_id",
                table: "lease_option_years",
                column: "exercised_by_user_id");

            migrationBuilder.CreateIndex(
                name: "ix_lease_option_years_lease_id",
                table: "lease_option_years",
                column: "lease_id");

            migrationBuilder.CreateIndex(
                name: "ix_lease_option_years_status_exercise_deadline",
                table: "lease_option_years",
                columns: new[] { "status", "exercise_deadline" });

            migrationBuilder.CreateIndex(
                name: "ix_lease_option_years_tenant_id_lease_id_option_number",
                table: "lease_option_years",
                columns: new[] { "tenant_id", "lease_id", "option_number" });

            migrationBuilder.CreateIndex(
                name: "ix_leases_office_id",
                table: "leases",
                column: "office_id");

            migrationBuilder.CreateIndex(
                name: "ix_leases_tenant_id_lease_end_date",
                table: "leases",
                columns: new[] { "tenant_id", "lease_end_date" });

            migrationBuilder.CreateIndex(
                name: "ix_leases_tenant_id_lease_number",
                table: "leases",
                columns: new[] { "tenant_id", "lease_number" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_leases_tenant_id_office_id_status",
                table: "leases",
                columns: new[] { "tenant_id", "office_id", "status" });

            migrationBuilder.CreateIndex(
                name: "ix_office_pocs_office_id_is_primary",
                table: "office_pocs",
                columns: new[] { "office_id", "is_primary" });

            migrationBuilder.CreateIndex(
                name: "ix_office_pocs_tenant_id_office_id_role",
                table: "office_pocs",
                columns: new[] { "tenant_id", "office_id", "role" });

            migrationBuilder.CreateIndex(
                name: "ix_office_pocs_user_id",
                table: "office_pocs",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "ix_office_travel_guides_last_updated_by_user_id",
                table: "office_travel_guides",
                column: "last_updated_by_user_id");

            migrationBuilder.CreateIndex(
                name: "ix_office_travel_guides_office_id",
                table: "office_travel_guides",
                column: "office_id");

            migrationBuilder.CreateIndex(
                name: "ix_office_travel_guides_tenant_id_office_id",
                table: "office_travel_guides",
                columns: new[] { "tenant_id", "office_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_scif_access_logs_escort_user_id",
                table: "scif_access_logs",
                column: "escort_user_id");

            migrationBuilder.CreateIndex(
                name: "ix_scif_access_logs_office_id",
                table: "scif_access_logs",
                column: "office_id");

            migrationBuilder.CreateIndex(
                name: "ix_scif_access_logs_tenant_id_office_id_access_time",
                table: "scif_access_logs",
                columns: new[] { "tenant_id", "office_id", "access_time" });

            migrationBuilder.CreateIndex(
                name: "ix_scif_access_logs_tenant_id_user_id_access_time",
                table: "scif_access_logs",
                columns: new[] { "tenant_id", "user_id", "access_time" });

            migrationBuilder.CreateIndex(
                name: "ix_scif_access_logs_user_id",
                table: "scif_access_logs",
                column: "user_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "announcement_acknowledgments");

            migrationBuilder.DropTable(
                name: "certification_expiry_notifications");

            migrationBuilder.DropTable(
                name: "client_site_details");

            migrationBuilder.DropTable(
                name: "employee_clearances");

            migrationBuilder.DropTable(
                name: "facility_attribute_definitions");

            migrationBuilder.DropTable(
                name: "facility_check_ins");

            migrationBuilder.DropTable(
                name: "facility_usage_daily");

            migrationBuilder.DropTable(
                name: "field_assignments");

            migrationBuilder.DropTable(
                name: "foreign_travel_records");

            migrationBuilder.DropTable(
                name: "lease_attachments");

            migrationBuilder.DropTable(
                name: "lease_option_years");

            migrationBuilder.DropTable(
                name: "office_pocs");

            migrationBuilder.DropTable(
                name: "office_travel_guides");

            migrationBuilder.DropTable(
                name: "scif_access_logs");

            migrationBuilder.DropTable(
                name: "facility_announcements");

            migrationBuilder.DropTable(
                name: "lease_amendments");

            migrationBuilder.DropTable(
                name: "leases");

            migrationBuilder.DropColumn(
                name: "certification_expiry_email_days",
                table: "tenant_settings");

            migrationBuilder.DropColumn(
                name: "certification_expiry_warning_days",
                table: "tenant_settings");

            migrationBuilder.DropColumn(
                name: "enable_certification_expiry_emails",
                table: "tenant_settings");
        }
    }
}

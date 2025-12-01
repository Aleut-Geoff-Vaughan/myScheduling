using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MyScheduling.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddEnhancedStaffingModule : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "budgeted_hours",
                table: "wbs_elements",
                type: "numeric",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "target_hours_per_month",
                table: "wbs_elements",
                type: "numeric",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "career_job_family_id",
                table: "users",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "career_level",
                table: "users",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "is_hourly",
                table: "users",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "position_title",
                table: "users",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "standard_hours_per_week",
                table: "users",
                type: "numeric(5,2)",
                precision: 5,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "budgeted_hours",
                table: "projects",
                type: "numeric",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "target_hours_per_month",
                table: "projects",
                type: "numeric",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "type",
                table: "projects",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateTable(
                name: "career_job_families",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    sort_order = table.Column<int>(type: "integer", nullable: false),
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
                    table.PrimaryKey("pk_career_job_families", x => x.id);
                    table.ForeignKey(
                        name: "fk_career_job_families__tenants_tenant_id",
                        column: x => x.tenant_id,
                        principalTable: "tenants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "forecast_approval_schedules",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    is_default = table.Column<bool>(type: "boolean", nullable: false),
                    submission_deadline_day = table.Column<int>(type: "integer", nullable: false),
                    approval_deadline_day = table.Column<int>(type: "integer", nullable: false),
                    lock_day = table.Column<int>(type: "integer", nullable: false),
                    forecast_months_ahead = table.Column<int>(type: "integer", nullable: false),
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
                    table.PrimaryKey("pk_forecast_approval_schedules", x => x.id);
                    table.ForeignKey(
                        name: "fk_forecast_approval_schedules__tenants_tenant_id",
                        column: x => x.tenant_id,
                        principalTable: "tenants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "forecast_versions",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    type = table.Column<int>(type: "integer", nullable: false),
                    project_id = table.Column<Guid>(type: "uuid", nullable: true),
                    user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    is_current = table.Column<bool>(type: "boolean", nullable: false),
                    version_number = table.Column<int>(type: "integer", nullable: false),
                    based_on_version_id = table.Column<Guid>(type: "uuid", nullable: true),
                    start_year = table.Column<int>(type: "integer", nullable: false),
                    start_month = table.Column<int>(type: "integer", nullable: false),
                    end_year = table.Column<int>(type: "integer", nullable: false),
                    end_month = table.Column<int>(type: "integer", nullable: false),
                    promoted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    promoted_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    archived_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    archive_reason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
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
                    table.PrimaryKey("pk_forecast_versions", x => x.id);
                    table.ForeignKey(
                        name: "fk_forecast_versions__projects_project_id",
                        column: x => x.project_id,
                        principalTable: "projects",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "fk_forecast_versions__tenants_tenant_id",
                        column: x => x.tenant_id,
                        principalTable: "tenants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_forecast_versions__users_promoted_by_user_id",
                        column: x => x.promoted_by_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "fk_forecast_versions__users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "fk_forecast_versions_forecast_versions_based_on_version_id",
                        column: x => x.based_on_version_id,
                        principalTable: "forecast_versions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "labor_categories",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    project_id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    bill_rate = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    cost_rate = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    sort_order = table.Column<int>(type: "integer", nullable: false),
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
                    table.PrimaryKey("pk_labor_categories", x => x.id);
                    table.ForeignKey(
                        name: "fk_labor_categories__projects_project_id",
                        column: x => x.project_id,
                        principalTable: "projects",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_labor_categories__tenants_tenant_id",
                        column: x => x.tenant_id,
                        principalTable: "tenants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "subcontractor_companies",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    address = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    city = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    state = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    country = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    postal_code = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    phone = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    website = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    primary_contact_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    forecast_contact_name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    forecast_contact_email = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    forecast_contact_phone = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    status = table.Column<int>(type: "integer", nullable: false),
                    notes = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    contract_number = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    contract_start_date = table.Column<DateOnly>(type: "date", nullable: true),
                    contract_end_date = table.Column<DateOnly>(type: "date", nullable: true),
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
                    table.PrimaryKey("pk_subcontractor_companies", x => x.id);
                    table.ForeignKey(
                        name: "fk_subcontractor_companies__tenants_tenant_id",
                        column: x => x.tenant_id,
                        principalTable: "tenants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_subcontractor_companies__users_primary_contact_user_id",
                        column: x => x.primary_contact_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "forecast_import_exports",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    type = table.Column<int>(type: "integer", nullable: false),
                    operation_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    operation_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    project_id = table.Column<Guid>(type: "uuid", nullable: true),
                    forecast_version_id = table.Column<Guid>(type: "uuid", nullable: true),
                    year = table.Column<int>(type: "integer", nullable: true),
                    month = table.Column<int>(type: "integer", nullable: true),
                    file_name = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    file_format = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    file_size_bytes = table.Column<long>(type: "bigint", nullable: false),
                    file_hash = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    status = table.Column<int>(type: "integer", nullable: false),
                    records_processed = table.Column<int>(type: "integer", nullable: false),
                    records_succeeded = table.Column<int>(type: "integer", nullable: false),
                    records_failed = table.Column<int>(type: "integer", nullable: false),
                    error_details = table.Column<string>(type: "jsonb", nullable: true),
                    resulting_version_id = table.Column<Guid>(type: "uuid", nullable: true),
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
                    table.PrimaryKey("pk_forecast_import_exports", x => x.id);
                    table.ForeignKey(
                        name: "fk_forecast_import_exports__forecast_versions_forecast_version_id",
                        column: x => x.forecast_version_id,
                        principalTable: "forecast_versions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "fk_forecast_import_exports__forecast_versions_resulting_version_~",
                        column: x => x.resulting_version_id,
                        principalTable: "forecast_versions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "fk_forecast_import_exports__projects_project_id",
                        column: x => x.project_id,
                        principalTable: "projects",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "fk_forecast_import_exports__tenants_tenant_id",
                        column: x => x.tenant_id,
                        principalTable: "tenants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_forecast_import_exports__users_operation_by_user_id",
                        column: x => x.operation_by_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "subcontractors",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    subcontractor_company_id = table.Column<Guid>(type: "uuid", nullable: false),
                    first_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    last_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    email = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    phone = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    position_title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    career_job_family_id = table.Column<Guid>(type: "uuid", nullable: true),
                    career_level = table.Column<int>(type: "integer", nullable: true),
                    is_forecast_submitter = table.Column<bool>(type: "boolean", nullable: false),
                    status = table.Column<int>(type: "integer", nullable: false),
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
                    table.PrimaryKey("pk_subcontractors", x => x.id);
                    table.ForeignKey(
                        name: "fk_subcontractors__subcontractor_companies_subcontractor_company~",
                        column: x => x.subcontractor_company_id,
                        principalTable: "subcontractor_companies",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_subcontractors__tenants_tenant_id",
                        column: x => x.tenant_id,
                        principalTable: "tenants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_subcontractors_career_job_families_career_job_family_id",
                        column: x => x.career_job_family_id,
                        principalTable: "career_job_families",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "project_role_assignments",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    project_id = table.Column<Guid>(type: "uuid", nullable: false),
                    wbs_element_id = table.Column<Guid>(type: "uuid", nullable: true),
                    user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    subcontractor_id = table.Column<Guid>(type: "uuid", nullable: true),
                    is_tbd = table.Column<bool>(type: "boolean", nullable: false),
                    tbd_description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    position_title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    career_job_family_id = table.Column<Guid>(type: "uuid", nullable: true),
                    career_level = table.Column<int>(type: "integer", nullable: true),
                    labor_category_id = table.Column<Guid>(type: "uuid", nullable: true),
                    start_date = table.Column<DateOnly>(type: "date", nullable: false),
                    end_date = table.Column<DateOnly>(type: "date", nullable: true),
                    status = table.Column<int>(type: "integer", nullable: false),
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
                    table.PrimaryKey("pk_project_role_assignments", x => x.id);
                    table.ForeignKey(
                        name: "fk_project_role_assignments__subcontractors_subcontractor_id",
                        column: x => x.subcontractor_id,
                        principalTable: "subcontractors",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "fk_project_role_assignments__tenants_tenant_id",
                        column: x => x.tenant_id,
                        principalTable: "tenants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_project_role_assignments__users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "fk_project_role_assignments__wbs_elements_wbs_element_id",
                        column: x => x.wbs_element_id,
                        principalTable: "wbs_elements",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "fk_project_role_assignments_career_job_families_career_job_fam~",
                        column: x => x.career_job_family_id,
                        principalTable: "career_job_families",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "fk_project_role_assignments_labor_categories_labor_category_id",
                        column: x => x.labor_category_id,
                        principalTable: "labor_categories",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "fk_project_role_assignments_projects_project_id",
                        column: x => x.project_id,
                        principalTable: "projects",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "forecasts",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    project_role_assignment_id = table.Column<Guid>(type: "uuid", nullable: false),
                    forecast_version_id = table.Column<Guid>(type: "uuid", nullable: false),
                    year = table.Column<int>(type: "integer", nullable: false),
                    month = table.Column<int>(type: "integer", nullable: false),
                    week = table.Column<int>(type: "integer", nullable: true),
                    forecasted_hours = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: false),
                    recommended_hours = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: true),
                    status = table.Column<int>(type: "integer", nullable: false),
                    submitted_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    submitted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    approved_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    approved_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    approval_notes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    is_override = table.Column<bool>(type: "boolean", nullable: false),
                    overridden_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    overridden_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    override_reason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    original_forecasted_hours = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: true),
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
                    table.PrimaryKey("pk_forecasts", x => x.id);
                    table.ForeignKey(
                        name: "fk_forecasts__forecast_versions_forecast_version_id",
                        column: x => x.forecast_version_id,
                        principalTable: "forecast_versions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_forecasts__project_role_assignments_project_role_assignment_id",
                        column: x => x.project_role_assignment_id,
                        principalTable: "project_role_assignments",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_forecasts__tenants_tenant_id",
                        column: x => x.tenant_id,
                        principalTable: "tenants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_forecasts__users_approved_by_user_id",
                        column: x => x.approved_by_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "fk_forecasts__users_overridden_by_user_id",
                        column: x => x.overridden_by_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "fk_forecasts__users_submitted_by_user_id",
                        column: x => x.submitted_by_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "forecast_histories",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    forecast_id = table.Column<Guid>(type: "uuid", nullable: false),
                    changed_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    changed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    change_type = table.Column<int>(type: "integer", nullable: false),
                    old_hours = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: true),
                    new_hours = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: true),
                    old_status = table.Column<int>(type: "integer", nullable: true),
                    new_status = table.Column<int>(type: "integer", nullable: true),
                    change_reason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
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
                    table.PrimaryKey("pk_forecast_histories", x => x.id);
                    table.ForeignKey(
                        name: "fk_forecast_histories__users_changed_by_user_id",
                        column: x => x.changed_by_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_forecast_histories_forecasts_forecast_id",
                        column: x => x.forecast_id,
                        principalTable: "forecasts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_users_career_job_family_id",
                table: "users",
                column: "career_job_family_id");

            migrationBuilder.CreateIndex(
                name: "ix_career_job_families_tenant_id_code",
                table: "career_job_families",
                columns: new[] { "tenant_id", "code" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_career_job_families_tenant_id_is_active",
                table: "career_job_families",
                columns: new[] { "tenant_id", "is_active" });

            migrationBuilder.CreateIndex(
                name: "ix_forecast_approval_schedules_tenant_id_is_active",
                table: "forecast_approval_schedules",
                columns: new[] { "tenant_id", "is_active" });

            migrationBuilder.CreateIndex(
                name: "ix_forecast_approval_schedules_tenant_id_is_default",
                table: "forecast_approval_schedules",
                columns: new[] { "tenant_id", "is_default" });

            migrationBuilder.CreateIndex(
                name: "ix_forecast_histories_changed_by_user_id",
                table: "forecast_histories",
                column: "changed_by_user_id");

            migrationBuilder.CreateIndex(
                name: "ix_forecast_histories_forecast_id_changed_at",
                table: "forecast_histories",
                columns: new[] { "forecast_id", "changed_at" });

            migrationBuilder.CreateIndex(
                name: "ix_forecast_import_exports_file_hash",
                table: "forecast_import_exports",
                column: "file_hash");

            migrationBuilder.CreateIndex(
                name: "ix_forecast_import_exports_forecast_version_id",
                table: "forecast_import_exports",
                column: "forecast_version_id");

            migrationBuilder.CreateIndex(
                name: "ix_forecast_import_exports_operation_by_user_id",
                table: "forecast_import_exports",
                column: "operation_by_user_id");

            migrationBuilder.CreateIndex(
                name: "ix_forecast_import_exports_project_id",
                table: "forecast_import_exports",
                column: "project_id");

            migrationBuilder.CreateIndex(
                name: "ix_forecast_import_exports_resulting_version_id",
                table: "forecast_import_exports",
                column: "resulting_version_id");

            migrationBuilder.CreateIndex(
                name: "ix_forecast_import_exports_tenant_id_type_operation_at",
                table: "forecast_import_exports",
                columns: new[] { "tenant_id", "type", "operation_at" });

            migrationBuilder.CreateIndex(
                name: "ix_forecast_versions_based_on_version_id",
                table: "forecast_versions",
                column: "based_on_version_id");

            migrationBuilder.CreateIndex(
                name: "ix_forecast_versions_project_id",
                table: "forecast_versions",
                column: "project_id");

            migrationBuilder.CreateIndex(
                name: "ix_forecast_versions_promoted_by_user_id",
                table: "forecast_versions",
                column: "promoted_by_user_id");

            migrationBuilder.CreateIndex(
                name: "ix_forecast_versions_tenant_id_project_id_is_current",
                table: "forecast_versions",
                columns: new[] { "tenant_id", "project_id", "is_current" });

            migrationBuilder.CreateIndex(
                name: "ix_forecast_versions_tenant_id_type_is_current",
                table: "forecast_versions",
                columns: new[] { "tenant_id", "type", "is_current" });

            migrationBuilder.CreateIndex(
                name: "ix_forecast_versions_tenant_id_user_id_type",
                table: "forecast_versions",
                columns: new[] { "tenant_id", "user_id", "type" });

            migrationBuilder.CreateIndex(
                name: "ix_forecast_versions_user_id",
                table: "forecast_versions",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "ix_forecasts_approved_by_user_id",
                table: "forecasts",
                column: "approved_by_user_id");

            migrationBuilder.CreateIndex(
                name: "ix_forecasts_forecast_version_id",
                table: "forecasts",
                column: "forecast_version_id");

            migrationBuilder.CreateIndex(
                name: "ix_forecasts_overridden_by_user_id",
                table: "forecasts",
                column: "overridden_by_user_id");

            migrationBuilder.CreateIndex(
                name: "ix_forecasts_project_role_assignment_id_year_month_week",
                table: "forecasts",
                columns: new[] { "project_role_assignment_id", "year", "month", "week" });

            migrationBuilder.CreateIndex(
                name: "ix_forecasts_submitted_by_user_id",
                table: "forecasts",
                column: "submitted_by_user_id");

            migrationBuilder.CreateIndex(
                name: "ix_forecasts_tenant_id_forecast_version_id_year_month",
                table: "forecasts",
                columns: new[] { "tenant_id", "forecast_version_id", "year", "month" });

            migrationBuilder.CreateIndex(
                name: "ix_forecasts_tenant_id_status",
                table: "forecasts",
                columns: new[] { "tenant_id", "status" });

            migrationBuilder.CreateIndex(
                name: "ix_labor_categories_project_id",
                table: "labor_categories",
                column: "project_id");

            migrationBuilder.CreateIndex(
                name: "ix_labor_categories_tenant_id_project_id_is_active",
                table: "labor_categories",
                columns: new[] { "tenant_id", "project_id", "is_active" });

            migrationBuilder.CreateIndex(
                name: "ix_project_role_assignments_career_job_family_id",
                table: "project_role_assignments",
                column: "career_job_family_id");

            migrationBuilder.CreateIndex(
                name: "ix_project_role_assignments_labor_category_id",
                table: "project_role_assignments",
                column: "labor_category_id");

            migrationBuilder.CreateIndex(
                name: "ix_project_role_assignments_project_id",
                table: "project_role_assignments",
                column: "project_id");

            migrationBuilder.CreateIndex(
                name: "ix_project_role_assignments_start_date_end_date",
                table: "project_role_assignments",
                columns: new[] { "start_date", "end_date" });

            migrationBuilder.CreateIndex(
                name: "ix_project_role_assignments_subcontractor_id",
                table: "project_role_assignments",
                column: "subcontractor_id");

            migrationBuilder.CreateIndex(
                name: "ix_project_role_assignments_tenant_id_is_tbd_status",
                table: "project_role_assignments",
                columns: new[] { "tenant_id", "is_tbd", "status" });

            migrationBuilder.CreateIndex(
                name: "ix_project_role_assignments_tenant_id_project_id_status",
                table: "project_role_assignments",
                columns: new[] { "tenant_id", "project_id", "status" });

            migrationBuilder.CreateIndex(
                name: "ix_project_role_assignments_tenant_id_subcontractor_id_status",
                table: "project_role_assignments",
                columns: new[] { "tenant_id", "subcontractor_id", "status" });

            migrationBuilder.CreateIndex(
                name: "ix_project_role_assignments_tenant_id_user_id_status",
                table: "project_role_assignments",
                columns: new[] { "tenant_id", "user_id", "status" });

            migrationBuilder.CreateIndex(
                name: "ix_project_role_assignments_user_id",
                table: "project_role_assignments",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "ix_project_role_assignments_wbs_element_id",
                table: "project_role_assignments",
                column: "wbs_element_id");

            migrationBuilder.CreateIndex(
                name: "ix_subcontractor_companies_primary_contact_user_id",
                table: "subcontractor_companies",
                column: "primary_contact_user_id");

            migrationBuilder.CreateIndex(
                name: "ix_subcontractor_companies_tenant_id_code",
                table: "subcontractor_companies",
                columns: new[] { "tenant_id", "code" });

            migrationBuilder.CreateIndex(
                name: "ix_subcontractor_companies_tenant_id_status",
                table: "subcontractor_companies",
                columns: new[] { "tenant_id", "status" });

            migrationBuilder.CreateIndex(
                name: "ix_subcontractors_career_job_family_id",
                table: "subcontractors",
                column: "career_job_family_id");

            migrationBuilder.CreateIndex(
                name: "ix_subcontractors_subcontractor_company_id",
                table: "subcontractors",
                column: "subcontractor_company_id");

            migrationBuilder.CreateIndex(
                name: "ix_subcontractors_tenant_id_email",
                table: "subcontractors",
                columns: new[] { "tenant_id", "email" });

            migrationBuilder.CreateIndex(
                name: "ix_subcontractors_tenant_id_subcontractor_company_id_status",
                table: "subcontractors",
                columns: new[] { "tenant_id", "subcontractor_company_id", "status" });

            migrationBuilder.AddForeignKey(
                name: "fk_users_career_job_families_career_job_family_id",
                table: "users",
                column: "career_job_family_id",
                principalTable: "career_job_families",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_users_career_job_families_career_job_family_id",
                table: "users");

            migrationBuilder.DropTable(
                name: "forecast_approval_schedules");

            migrationBuilder.DropTable(
                name: "forecast_histories");

            migrationBuilder.DropTable(
                name: "forecast_import_exports");

            migrationBuilder.DropTable(
                name: "forecasts");

            migrationBuilder.DropTable(
                name: "forecast_versions");

            migrationBuilder.DropTable(
                name: "project_role_assignments");

            migrationBuilder.DropTable(
                name: "subcontractors");

            migrationBuilder.DropTable(
                name: "labor_categories");

            migrationBuilder.DropTable(
                name: "subcontractor_companies");

            migrationBuilder.DropTable(
                name: "career_job_families");

            migrationBuilder.DropIndex(
                name: "ix_users_career_job_family_id",
                table: "users");

            migrationBuilder.DropColumn(
                name: "budgeted_hours",
                table: "wbs_elements");

            migrationBuilder.DropColumn(
                name: "target_hours_per_month",
                table: "wbs_elements");

            migrationBuilder.DropColumn(
                name: "career_job_family_id",
                table: "users");

            migrationBuilder.DropColumn(
                name: "career_level",
                table: "users");

            migrationBuilder.DropColumn(
                name: "is_hourly",
                table: "users");

            migrationBuilder.DropColumn(
                name: "position_title",
                table: "users");

            migrationBuilder.DropColumn(
                name: "standard_hours_per_week",
                table: "users");

            migrationBuilder.DropColumn(
                name: "budgeted_hours",
                table: "projects");

            migrationBuilder.DropColumn(
                name: "target_hours_per_month",
                table: "projects");

            migrationBuilder.DropColumn(
                name: "type",
                table: "projects");
        }
    }
}

using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MyScheduling.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddAuthorizationFramework : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "deleted_at",
                table: "work_location_templates",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "deleted_by_user_id",
                table: "work_location_templates",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "deletion_reason",
                table: "work_location_templates",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "is_deleted",
                table: "work_location_templates",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "deleted_at",
                table: "work_location_template_items",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "deleted_by_user_id",
                table: "work_location_template_items",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "deletion_reason",
                table: "work_location_template_items",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "is_deleted",
                table: "work_location_template_items",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "deleted_at",
                table: "work_location_preferences",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "deleted_by_user_id",
                table: "work_location_preferences",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "deletion_reason",
                table: "work_location_preferences",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "is_deleted",
                table: "work_location_preferences",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "deleted_at",
                table: "wbs_elements",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "deleted_by_user_id",
                table: "wbs_elements",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "deletion_reason",
                table: "wbs_elements",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "is_deleted",
                table: "wbs_elements",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "deleted_at",
                table: "wbs_change_histories",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "deleted_by_user_id",
                table: "wbs_change_histories",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "deletion_reason",
                table: "wbs_change_histories",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "is_deleted",
                table: "wbs_change_histories",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "deleted_at",
                table: "validation_rules",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "deleted_by_user_id",
                table: "validation_rules",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "deletion_reason",
                table: "validation_rules",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "is_deleted",
                table: "validation_rules",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "deleted_at",
                table: "users",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "deleted_by_user_id",
                table: "users",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "deletion_reason",
                table: "users",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "is_deleted",
                table: "users",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "deleted_at",
                table: "tenants",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "deleted_by_user_id",
                table: "tenants",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "deletion_reason",
                table: "tenants",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "is_deleted",
                table: "tenants",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "deleted_at",
                table: "tenant_memberships",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "deleted_by_user_id",
                table: "tenant_memberships",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "deletion_reason",
                table: "tenant_memberships",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "is_deleted",
                table: "tenant_memberships",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "deleted_at",
                table: "team_calendars",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "deleted_by_user_id",
                table: "team_calendars",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "deletion_reason",
                table: "team_calendars",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "is_deleted",
                table: "team_calendars",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "deleted_at",
                table: "team_calendar_members",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "deleted_by_user_id",
                table: "team_calendar_members",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "deletion_reason",
                table: "team_calendar_members",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "is_deleted",
                table: "team_calendar_members",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "deletion_reason",
                table: "stored_files",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "deleted_at",
                table: "spaces",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "deleted_by_user_id",
                table: "spaces",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "deletion_reason",
                table: "spaces",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "is_deleted",
                table: "spaces",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "deleted_at",
                table: "space_maintenance_logs",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "deleted_by_user_id",
                table: "space_maintenance_logs",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "deletion_reason",
                table: "space_maintenance_logs",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "is_deleted",
                table: "space_maintenance_logs",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "deleted_at",
                table: "skills",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "deleted_by_user_id",
                table: "skills",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "deletion_reason",
                table: "skills",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "is_deleted",
                table: "skills",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "deleted_at",
                table: "share_point_configurations",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "deleted_by_user_id",
                table: "share_point_configurations",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "deletion_reason",
                table: "share_point_configurations",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "is_deleted",
                table: "share_point_configurations",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "deleted_at",
                table: "role_assignments",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "deleted_by_user_id",
                table: "role_assignments",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "deletion_reason",
                table: "role_assignments",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "is_deleted",
                table: "role_assignments",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "deleted_at",
                table: "resume_versions",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "deleted_by_user_id",
                table: "resume_versions",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "deletion_reason",
                table: "resume_versions",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "is_deleted",
                table: "resume_versions",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "deleted_at",
                table: "resume_templates",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "deleted_by_user_id",
                table: "resume_templates",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "deletion_reason",
                table: "resume_templates",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "is_deleted",
                table: "resume_templates",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "deleted_at",
                table: "resume_sections",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "deleted_by_user_id",
                table: "resume_sections",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "deletion_reason",
                table: "resume_sections",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "is_deleted",
                table: "resume_sections",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "deleted_at",
                table: "resume_profiles",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "deleted_by_user_id",
                table: "resume_profiles",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "deletion_reason",
                table: "resume_profiles",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "is_deleted",
                table: "resume_profiles",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "deleted_at",
                table: "resume_entries",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "deleted_by_user_id",
                table: "resume_entries",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "deletion_reason",
                table: "resume_entries",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "is_deleted",
                table: "resume_entries",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "deleted_at",
                table: "resume_documents",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "deleted_by_user_id",
                table: "resume_documents",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "deletion_reason",
                table: "resume_documents",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "is_deleted",
                table: "resume_documents",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "deleted_at",
                table: "resume_approvals",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "deleted_by_user_id",
                table: "resume_approvals",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "deletion_reason",
                table: "resume_approvals",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "is_deleted",
                table: "resume_approvals",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "deleted_at",
                table: "projects",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "deleted_by_user_id",
                table: "projects",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "deletion_reason",
                table: "projects",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "is_deleted",
                table: "projects",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "deleted_at",
                table: "project_roles",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "deleted_by_user_id",
                table: "project_roles",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "deletion_reason",
                table: "project_roles",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "is_deleted",
                table: "project_roles",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "deleted_at",
                table: "person_skills",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "deleted_by_user_id",
                table: "person_skills",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "deletion_reason",
                table: "person_skills",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "is_deleted",
                table: "person_skills",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "deleted_at",
                table: "person_certifications",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "deleted_by_user_id",
                table: "person_certifications",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "deletion_reason",
                table: "person_certifications",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "is_deleted",
                table: "person_certifications",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "deleted_at",
                table: "people",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "deleted_by_user_id",
                table: "people",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "deletion_reason",
                table: "people",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "is_deleted",
                table: "people",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "deleted_at",
                table: "offices",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "deleted_by_user_id",
                table: "offices",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "deletion_reason",
                table: "offices",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "is_deleted",
                table: "offices",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "deleted_at",
                table: "linked_in_imports",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "deleted_by_user_id",
                table: "linked_in_imports",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "deletion_reason",
                table: "linked_in_imports",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "is_deleted",
                table: "linked_in_imports",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "deleted_at",
                table: "file_access_logs",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "deleted_by_user_id",
                table: "file_access_logs",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "deletion_reason",
                table: "file_access_logs",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "is_deleted",
                table: "file_access_logs",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "deleted_at",
                table: "facility_permissions",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "deleted_by_user_id",
                table: "facility_permissions",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "deletion_reason",
                table: "facility_permissions",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "is_deleted",
                table: "facility_permissions",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "deleted_at",
                table: "doaactivations",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "deleted_by_user_id",
                table: "doaactivations",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "deletion_reason",
                table: "doaactivations",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "is_deleted",
                table: "doaactivations",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "deleted_at",
                table: "digital_signatures",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "deleted_by_user_id",
                table: "digital_signatures",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "deletion_reason",
                table: "digital_signatures",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "is_deleted",
                table: "digital_signatures",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "deleted_at",
                table: "delegation_of_authority_letters",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "deleted_by_user_id",
                table: "delegation_of_authority_letters",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "deletion_reason",
                table: "delegation_of_authority_letters",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "is_deleted",
                table: "delegation_of_authority_letters",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "deleted_at",
                table: "company_holidays",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "deleted_by_user_id",
                table: "company_holidays",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "deletion_reason",
                table: "company_holidays",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "is_deleted",
                table: "company_holidays",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "deleted_at",
                table: "check_in_events",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "deleted_by_user_id",
                table: "check_in_events",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "deletion_reason",
                table: "check_in_events",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "is_deleted",
                table: "check_in_events",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "deleted_at",
                table: "certifications",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "deleted_by_user_id",
                table: "certifications",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "deletion_reason",
                table: "certifications",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "is_deleted",
                table: "certifications",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "deleted_at",
                table: "bookings",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "deleted_by_user_id",
                table: "bookings",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "deletion_reason",
                table: "bookings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "is_deleted",
                table: "bookings",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "deleted_at",
                table: "assignments",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "deleted_by_user_id",
                table: "assignments",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "deletion_reason",
                table: "assignments",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "is_deleted",
                table: "assignments",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "deleted_at",
                table: "assignment_history",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "deleted_by_user_id",
                table: "assignment_history",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "deletion_reason",
                table: "assignment_history",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "is_deleted",
                table: "assignment_history",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "authorization_audit_logs",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    tenant_id = table.Column<Guid>(type: "uuid", nullable: true),
                    resource = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    resource_id = table.Column<Guid>(type: "uuid", nullable: true),
                    action = table.Column<int>(type: "integer", nullable: false),
                    was_allowed = table.Column<bool>(type: "boolean", nullable: false),
                    denial_reason = table.Column<string>(type: "text", nullable: true),
                    granted_scope = table.Column<int>(type: "integer", nullable: true),
                    ip_address = table.Column<string>(type: "text", nullable: true),
                    user_agent = table.Column<string>(type: "text", nullable: true),
                    request_path = table.Column<string>(type: "text", nullable: true),
                    timestamp = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    additional_context = table.Column<string>(type: "text", nullable: true),
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
                    table.PrimaryKey("pk_authorization_audit_logs", x => x.id);
                    table.ForeignKey(
                        name: "fk_authorization_audit_logs__tenants_tenant_id",
                        column: x => x.tenant_id,
                        principalTable: "tenants",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "fk_authorization_audit_logs__users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "data_archive_exports",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    tenant_id = table.Column<Guid>(type: "uuid", nullable: true),
                    requested_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    entity_type = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    filter_json = table.Column<string>(type: "text", nullable: true),
                    requested_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    status = table.Column<int>(type: "integer", nullable: false),
                    stored_file_id = table.Column<string>(type: "text", nullable: true),
                    record_count = table.Column<int>(type: "integer", nullable: false),
                    file_size_bytes = table.Column<long>(type: "bigint", nullable: false),
                    completed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    error_message = table.Column<string>(type: "text", nullable: true),
                    requested_by_id = table.Column<Guid>(type: "uuid", nullable: false),
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
                    table.PrimaryKey("pk_data_archive_exports", x => x.id);
                    table.ForeignKey(
                        name: "fk_data_archive_exports__tenants_tenant_id",
                        column: x => x.tenant_id,
                        principalTable: "tenants",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "fk_data_archive_exports__users_requested_by_id",
                        column: x => x.requested_by_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "data_archives",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    tenant_id = table.Column<Guid>(type: "uuid", nullable: true),
                    entity_type = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    entity_id = table.Column<Guid>(type: "uuid", nullable: false),
                    entity_snapshot = table.Column<string>(type: "text", nullable: false),
                    archived_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    archived_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    archival_reason = table.Column<string>(type: "text", nullable: true),
                    status = table.Column<int>(type: "integer", nullable: false),
                    restored_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    restored_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    restoration_notes = table.Column<string>(type: "text", nullable: true),
                    permanently_deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    permanently_deleted_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    permanent_deletion_reason = table.Column<string>(type: "text", nullable: true),
                    was_exported = table.Column<bool>(type: "boolean", nullable: false),
                    exported_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    exported_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    scheduled_permanent_deletion_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    retention_days = table.Column<int>(type: "integer", nullable: false),
                    archived_by_id = table.Column<Guid>(type: "uuid", nullable: false),
                    restored_by_id = table.Column<Guid>(type: "uuid", nullable: true),
                    permanently_deleted_by_id = table.Column<Guid>(type: "uuid", nullable: true),
                    exported_by_id = table.Column<Guid>(type: "uuid", nullable: true),
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
                    table.PrimaryKey("pk_data_archives", x => x.id);
                    table.ForeignKey(
                        name: "fk_data_archives__tenants_tenant_id",
                        column: x => x.tenant_id,
                        principalTable: "tenants",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "fk_data_archives__users_archived_by_id",
                        column: x => x.archived_by_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_data_archives__users_exported_by_id",
                        column: x => x.exported_by_id,
                        principalTable: "users",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "fk_data_archives__users_permanently_deleted_by_id",
                        column: x => x.permanently_deleted_by_id,
                        principalTable: "users",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "fk_data_archives__users_restored_by_id",
                        column: x => x.restored_by_id,
                        principalTable: "users",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "permissions",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    tenant_id = table.Column<Guid>(type: "uuid", nullable: true),
                    resource = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    resource_id = table.Column<Guid>(type: "uuid", nullable: true),
                    action = table.Column<int>(type: "integer", nullable: false),
                    scope = table.Column<int>(type: "integer", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    role = table.Column<int>(type: "integer", nullable: true),
                    conditions = table.Column<string>(type: "text", nullable: true),
                    expires_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    description = table.Column<string>(type: "text", nullable: true),
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
                    table.PrimaryKey("pk_permissions", x => x.id);
                    table.ForeignKey(
                        name: "fk_permissions__tenants_tenant_id",
                        column: x => x.tenant_id,
                        principalTable: "tenants",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "fk_permissions__users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "role_permission_templates",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    tenant_id = table.Column<Guid>(type: "uuid", nullable: true),
                    role = table.Column<int>(type: "integer", nullable: false),
                    resource = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    action = table.Column<int>(type: "integer", nullable: false),
                    default_scope = table.Column<int>(type: "integer", nullable: false),
                    default_conditions = table.Column<string>(type: "text", nullable: true),
                    is_system_template = table.Column<bool>(type: "boolean", nullable: false),
                    description = table.Column<string>(type: "text", nullable: true),
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
                    table.PrimaryKey("pk_role_permission_templates", x => x.id);
                    table.ForeignKey(
                        name: "fk_role_permission_templates__tenants_tenant_id",
                        column: x => x.tenant_id,
                        principalTable: "tenants",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "tenant_dropdown_configurations",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    category = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    options_json = table.Column<string>(type: "text", nullable: false),
                    allow_custom_values = table.Column<bool>(type: "boolean", nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    description = table.Column<string>(type: "text", nullable: true),
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
                    table.PrimaryKey("pk_tenant_dropdown_configurations", x => x.id);
                    table.ForeignKey(
                        name: "fk_tenant_dropdown_configurations_tenants_tenant_id",
                        column: x => x.tenant_id,
                        principalTable: "tenants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_authorization_audit_logs_tenant_id_timestamp",
                table: "authorization_audit_logs",
                columns: new[] { "tenant_id", "timestamp" });

            migrationBuilder.CreateIndex(
                name: "ix_authorization_audit_logs_timestamp",
                table: "authorization_audit_logs",
                column: "timestamp");

            migrationBuilder.CreateIndex(
                name: "ix_authorization_audit_logs_user_id_timestamp",
                table: "authorization_audit_logs",
                columns: new[] { "user_id", "timestamp" });

            migrationBuilder.CreateIndex(
                name: "ix_data_archive_exports_requested_at",
                table: "data_archive_exports",
                column: "requested_at");

            migrationBuilder.CreateIndex(
                name: "ix_data_archive_exports_requested_by_id",
                table: "data_archive_exports",
                column: "requested_by_id");

            migrationBuilder.CreateIndex(
                name: "ix_data_archive_exports_tenant_id_status",
                table: "data_archive_exports",
                columns: new[] { "tenant_id", "status" });

            migrationBuilder.CreateIndex(
                name: "ix_data_archives_archived_at",
                table: "data_archives",
                column: "archived_at");

            migrationBuilder.CreateIndex(
                name: "ix_data_archives_archived_by_id",
                table: "data_archives",
                column: "archived_by_id");

            migrationBuilder.CreateIndex(
                name: "ix_data_archives_entity_type_entity_id",
                table: "data_archives",
                columns: new[] { "entity_type", "entity_id" });

            migrationBuilder.CreateIndex(
                name: "ix_data_archives_exported_by_id",
                table: "data_archives",
                column: "exported_by_id");

            migrationBuilder.CreateIndex(
                name: "ix_data_archives_permanently_deleted_by_id",
                table: "data_archives",
                column: "permanently_deleted_by_id");

            migrationBuilder.CreateIndex(
                name: "ix_data_archives_restored_by_id",
                table: "data_archives",
                column: "restored_by_id");

            migrationBuilder.CreateIndex(
                name: "ix_data_archives_scheduled_permanent_deletion_at",
                table: "data_archives",
                column: "scheduled_permanent_deletion_at");

            migrationBuilder.CreateIndex(
                name: "ix_data_archives_tenant_id_status",
                table: "data_archives",
                columns: new[] { "tenant_id", "status" });

            migrationBuilder.CreateIndex(
                name: "ix_permissions_role_resource_action",
                table: "permissions",
                columns: new[] { "role", "resource", "action" });

            migrationBuilder.CreateIndex(
                name: "ix_permissions_tenant_id",
                table: "permissions",
                column: "tenant_id");

            migrationBuilder.CreateIndex(
                name: "ix_permissions_user_id_resource_action",
                table: "permissions",
                columns: new[] { "user_id", "resource", "action" });

            migrationBuilder.CreateIndex(
                name: "ix_role_permission_templates_role_resource",
                table: "role_permission_templates",
                columns: new[] { "role", "resource" });

            migrationBuilder.CreateIndex(
                name: "ix_role_permission_templates_tenant_id",
                table: "role_permission_templates",
                column: "tenant_id");

            migrationBuilder.CreateIndex(
                name: "ix_tenant_dropdown_configurations_tenant_id_category",
                table: "tenant_dropdown_configurations",
                columns: new[] { "tenant_id", "category" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "authorization_audit_logs");

            migrationBuilder.DropTable(
                name: "data_archive_exports");

            migrationBuilder.DropTable(
                name: "data_archives");

            migrationBuilder.DropTable(
                name: "permissions");

            migrationBuilder.DropTable(
                name: "role_permission_templates");

            migrationBuilder.DropTable(
                name: "tenant_dropdown_configurations");

            migrationBuilder.DropColumn(
                name: "deleted_at",
                table: "work_location_templates");

            migrationBuilder.DropColumn(
                name: "deleted_by_user_id",
                table: "work_location_templates");

            migrationBuilder.DropColumn(
                name: "deletion_reason",
                table: "work_location_templates");

            migrationBuilder.DropColumn(
                name: "is_deleted",
                table: "work_location_templates");

            migrationBuilder.DropColumn(
                name: "deleted_at",
                table: "work_location_template_items");

            migrationBuilder.DropColumn(
                name: "deleted_by_user_id",
                table: "work_location_template_items");

            migrationBuilder.DropColumn(
                name: "deletion_reason",
                table: "work_location_template_items");

            migrationBuilder.DropColumn(
                name: "is_deleted",
                table: "work_location_template_items");

            migrationBuilder.DropColumn(
                name: "deleted_at",
                table: "work_location_preferences");

            migrationBuilder.DropColumn(
                name: "deleted_by_user_id",
                table: "work_location_preferences");

            migrationBuilder.DropColumn(
                name: "deletion_reason",
                table: "work_location_preferences");

            migrationBuilder.DropColumn(
                name: "is_deleted",
                table: "work_location_preferences");

            migrationBuilder.DropColumn(
                name: "deleted_at",
                table: "wbs_elements");

            migrationBuilder.DropColumn(
                name: "deleted_by_user_id",
                table: "wbs_elements");

            migrationBuilder.DropColumn(
                name: "deletion_reason",
                table: "wbs_elements");

            migrationBuilder.DropColumn(
                name: "is_deleted",
                table: "wbs_elements");

            migrationBuilder.DropColumn(
                name: "deleted_at",
                table: "wbs_change_histories");

            migrationBuilder.DropColumn(
                name: "deleted_by_user_id",
                table: "wbs_change_histories");

            migrationBuilder.DropColumn(
                name: "deletion_reason",
                table: "wbs_change_histories");

            migrationBuilder.DropColumn(
                name: "is_deleted",
                table: "wbs_change_histories");

            migrationBuilder.DropColumn(
                name: "deleted_at",
                table: "validation_rules");

            migrationBuilder.DropColumn(
                name: "deleted_by_user_id",
                table: "validation_rules");

            migrationBuilder.DropColumn(
                name: "deletion_reason",
                table: "validation_rules");

            migrationBuilder.DropColumn(
                name: "is_deleted",
                table: "validation_rules");

            migrationBuilder.DropColumn(
                name: "deleted_at",
                table: "users");

            migrationBuilder.DropColumn(
                name: "deleted_by_user_id",
                table: "users");

            migrationBuilder.DropColumn(
                name: "deletion_reason",
                table: "users");

            migrationBuilder.DropColumn(
                name: "is_deleted",
                table: "users");

            migrationBuilder.DropColumn(
                name: "deleted_at",
                table: "tenants");

            migrationBuilder.DropColumn(
                name: "deleted_by_user_id",
                table: "tenants");

            migrationBuilder.DropColumn(
                name: "deletion_reason",
                table: "tenants");

            migrationBuilder.DropColumn(
                name: "is_deleted",
                table: "tenants");

            migrationBuilder.DropColumn(
                name: "deleted_at",
                table: "tenant_memberships");

            migrationBuilder.DropColumn(
                name: "deleted_by_user_id",
                table: "tenant_memberships");

            migrationBuilder.DropColumn(
                name: "deletion_reason",
                table: "tenant_memberships");

            migrationBuilder.DropColumn(
                name: "is_deleted",
                table: "tenant_memberships");

            migrationBuilder.DropColumn(
                name: "deleted_at",
                table: "team_calendars");

            migrationBuilder.DropColumn(
                name: "deleted_by_user_id",
                table: "team_calendars");

            migrationBuilder.DropColumn(
                name: "deletion_reason",
                table: "team_calendars");

            migrationBuilder.DropColumn(
                name: "is_deleted",
                table: "team_calendars");

            migrationBuilder.DropColumn(
                name: "deleted_at",
                table: "team_calendar_members");

            migrationBuilder.DropColumn(
                name: "deleted_by_user_id",
                table: "team_calendar_members");

            migrationBuilder.DropColumn(
                name: "deletion_reason",
                table: "team_calendar_members");

            migrationBuilder.DropColumn(
                name: "is_deleted",
                table: "team_calendar_members");

            migrationBuilder.DropColumn(
                name: "deletion_reason",
                table: "stored_files");

            migrationBuilder.DropColumn(
                name: "deleted_at",
                table: "spaces");

            migrationBuilder.DropColumn(
                name: "deleted_by_user_id",
                table: "spaces");

            migrationBuilder.DropColumn(
                name: "deletion_reason",
                table: "spaces");

            migrationBuilder.DropColumn(
                name: "is_deleted",
                table: "spaces");

            migrationBuilder.DropColumn(
                name: "deleted_at",
                table: "space_maintenance_logs");

            migrationBuilder.DropColumn(
                name: "deleted_by_user_id",
                table: "space_maintenance_logs");

            migrationBuilder.DropColumn(
                name: "deletion_reason",
                table: "space_maintenance_logs");

            migrationBuilder.DropColumn(
                name: "is_deleted",
                table: "space_maintenance_logs");

            migrationBuilder.DropColumn(
                name: "deleted_at",
                table: "skills");

            migrationBuilder.DropColumn(
                name: "deleted_by_user_id",
                table: "skills");

            migrationBuilder.DropColumn(
                name: "deletion_reason",
                table: "skills");

            migrationBuilder.DropColumn(
                name: "is_deleted",
                table: "skills");

            migrationBuilder.DropColumn(
                name: "deleted_at",
                table: "share_point_configurations");

            migrationBuilder.DropColumn(
                name: "deleted_by_user_id",
                table: "share_point_configurations");

            migrationBuilder.DropColumn(
                name: "deletion_reason",
                table: "share_point_configurations");

            migrationBuilder.DropColumn(
                name: "is_deleted",
                table: "share_point_configurations");

            migrationBuilder.DropColumn(
                name: "deleted_at",
                table: "role_assignments");

            migrationBuilder.DropColumn(
                name: "deleted_by_user_id",
                table: "role_assignments");

            migrationBuilder.DropColumn(
                name: "deletion_reason",
                table: "role_assignments");

            migrationBuilder.DropColumn(
                name: "is_deleted",
                table: "role_assignments");

            migrationBuilder.DropColumn(
                name: "deleted_at",
                table: "resume_versions");

            migrationBuilder.DropColumn(
                name: "deleted_by_user_id",
                table: "resume_versions");

            migrationBuilder.DropColumn(
                name: "deletion_reason",
                table: "resume_versions");

            migrationBuilder.DropColumn(
                name: "is_deleted",
                table: "resume_versions");

            migrationBuilder.DropColumn(
                name: "deleted_at",
                table: "resume_templates");

            migrationBuilder.DropColumn(
                name: "deleted_by_user_id",
                table: "resume_templates");

            migrationBuilder.DropColumn(
                name: "deletion_reason",
                table: "resume_templates");

            migrationBuilder.DropColumn(
                name: "is_deleted",
                table: "resume_templates");

            migrationBuilder.DropColumn(
                name: "deleted_at",
                table: "resume_sections");

            migrationBuilder.DropColumn(
                name: "deleted_by_user_id",
                table: "resume_sections");

            migrationBuilder.DropColumn(
                name: "deletion_reason",
                table: "resume_sections");

            migrationBuilder.DropColumn(
                name: "is_deleted",
                table: "resume_sections");

            migrationBuilder.DropColumn(
                name: "deleted_at",
                table: "resume_profiles");

            migrationBuilder.DropColumn(
                name: "deleted_by_user_id",
                table: "resume_profiles");

            migrationBuilder.DropColumn(
                name: "deletion_reason",
                table: "resume_profiles");

            migrationBuilder.DropColumn(
                name: "is_deleted",
                table: "resume_profiles");

            migrationBuilder.DropColumn(
                name: "deleted_at",
                table: "resume_entries");

            migrationBuilder.DropColumn(
                name: "deleted_by_user_id",
                table: "resume_entries");

            migrationBuilder.DropColumn(
                name: "deletion_reason",
                table: "resume_entries");

            migrationBuilder.DropColumn(
                name: "is_deleted",
                table: "resume_entries");

            migrationBuilder.DropColumn(
                name: "deleted_at",
                table: "resume_documents");

            migrationBuilder.DropColumn(
                name: "deleted_by_user_id",
                table: "resume_documents");

            migrationBuilder.DropColumn(
                name: "deletion_reason",
                table: "resume_documents");

            migrationBuilder.DropColumn(
                name: "is_deleted",
                table: "resume_documents");

            migrationBuilder.DropColumn(
                name: "deleted_at",
                table: "resume_approvals");

            migrationBuilder.DropColumn(
                name: "deleted_by_user_id",
                table: "resume_approvals");

            migrationBuilder.DropColumn(
                name: "deletion_reason",
                table: "resume_approvals");

            migrationBuilder.DropColumn(
                name: "is_deleted",
                table: "resume_approvals");

            migrationBuilder.DropColumn(
                name: "deleted_at",
                table: "projects");

            migrationBuilder.DropColumn(
                name: "deleted_by_user_id",
                table: "projects");

            migrationBuilder.DropColumn(
                name: "deletion_reason",
                table: "projects");

            migrationBuilder.DropColumn(
                name: "is_deleted",
                table: "projects");

            migrationBuilder.DropColumn(
                name: "deleted_at",
                table: "project_roles");

            migrationBuilder.DropColumn(
                name: "deleted_by_user_id",
                table: "project_roles");

            migrationBuilder.DropColumn(
                name: "deletion_reason",
                table: "project_roles");

            migrationBuilder.DropColumn(
                name: "is_deleted",
                table: "project_roles");

            migrationBuilder.DropColumn(
                name: "deleted_at",
                table: "person_skills");

            migrationBuilder.DropColumn(
                name: "deleted_by_user_id",
                table: "person_skills");

            migrationBuilder.DropColumn(
                name: "deletion_reason",
                table: "person_skills");

            migrationBuilder.DropColumn(
                name: "is_deleted",
                table: "person_skills");

            migrationBuilder.DropColumn(
                name: "deleted_at",
                table: "person_certifications");

            migrationBuilder.DropColumn(
                name: "deleted_by_user_id",
                table: "person_certifications");

            migrationBuilder.DropColumn(
                name: "deletion_reason",
                table: "person_certifications");

            migrationBuilder.DropColumn(
                name: "is_deleted",
                table: "person_certifications");

            migrationBuilder.DropColumn(
                name: "deleted_at",
                table: "people");

            migrationBuilder.DropColumn(
                name: "deleted_by_user_id",
                table: "people");

            migrationBuilder.DropColumn(
                name: "deletion_reason",
                table: "people");

            migrationBuilder.DropColumn(
                name: "is_deleted",
                table: "people");

            migrationBuilder.DropColumn(
                name: "deleted_at",
                table: "offices");

            migrationBuilder.DropColumn(
                name: "deleted_by_user_id",
                table: "offices");

            migrationBuilder.DropColumn(
                name: "deletion_reason",
                table: "offices");

            migrationBuilder.DropColumn(
                name: "is_deleted",
                table: "offices");

            migrationBuilder.DropColumn(
                name: "deleted_at",
                table: "linked_in_imports");

            migrationBuilder.DropColumn(
                name: "deleted_by_user_id",
                table: "linked_in_imports");

            migrationBuilder.DropColumn(
                name: "deletion_reason",
                table: "linked_in_imports");

            migrationBuilder.DropColumn(
                name: "is_deleted",
                table: "linked_in_imports");

            migrationBuilder.DropColumn(
                name: "deleted_at",
                table: "file_access_logs");

            migrationBuilder.DropColumn(
                name: "deleted_by_user_id",
                table: "file_access_logs");

            migrationBuilder.DropColumn(
                name: "deletion_reason",
                table: "file_access_logs");

            migrationBuilder.DropColumn(
                name: "is_deleted",
                table: "file_access_logs");

            migrationBuilder.DropColumn(
                name: "deleted_at",
                table: "facility_permissions");

            migrationBuilder.DropColumn(
                name: "deleted_by_user_id",
                table: "facility_permissions");

            migrationBuilder.DropColumn(
                name: "deletion_reason",
                table: "facility_permissions");

            migrationBuilder.DropColumn(
                name: "is_deleted",
                table: "facility_permissions");

            migrationBuilder.DropColumn(
                name: "deleted_at",
                table: "doaactivations");

            migrationBuilder.DropColumn(
                name: "deleted_by_user_id",
                table: "doaactivations");

            migrationBuilder.DropColumn(
                name: "deletion_reason",
                table: "doaactivations");

            migrationBuilder.DropColumn(
                name: "is_deleted",
                table: "doaactivations");

            migrationBuilder.DropColumn(
                name: "deleted_at",
                table: "digital_signatures");

            migrationBuilder.DropColumn(
                name: "deleted_by_user_id",
                table: "digital_signatures");

            migrationBuilder.DropColumn(
                name: "deletion_reason",
                table: "digital_signatures");

            migrationBuilder.DropColumn(
                name: "is_deleted",
                table: "digital_signatures");

            migrationBuilder.DropColumn(
                name: "deleted_at",
                table: "delegation_of_authority_letters");

            migrationBuilder.DropColumn(
                name: "deleted_by_user_id",
                table: "delegation_of_authority_letters");

            migrationBuilder.DropColumn(
                name: "deletion_reason",
                table: "delegation_of_authority_letters");

            migrationBuilder.DropColumn(
                name: "is_deleted",
                table: "delegation_of_authority_letters");

            migrationBuilder.DropColumn(
                name: "deleted_at",
                table: "company_holidays");

            migrationBuilder.DropColumn(
                name: "deleted_by_user_id",
                table: "company_holidays");

            migrationBuilder.DropColumn(
                name: "deletion_reason",
                table: "company_holidays");

            migrationBuilder.DropColumn(
                name: "is_deleted",
                table: "company_holidays");

            migrationBuilder.DropColumn(
                name: "deleted_at",
                table: "check_in_events");

            migrationBuilder.DropColumn(
                name: "deleted_by_user_id",
                table: "check_in_events");

            migrationBuilder.DropColumn(
                name: "deletion_reason",
                table: "check_in_events");

            migrationBuilder.DropColumn(
                name: "is_deleted",
                table: "check_in_events");

            migrationBuilder.DropColumn(
                name: "deleted_at",
                table: "certifications");

            migrationBuilder.DropColumn(
                name: "deleted_by_user_id",
                table: "certifications");

            migrationBuilder.DropColumn(
                name: "deletion_reason",
                table: "certifications");

            migrationBuilder.DropColumn(
                name: "is_deleted",
                table: "certifications");

            migrationBuilder.DropColumn(
                name: "deleted_at",
                table: "bookings");

            migrationBuilder.DropColumn(
                name: "deleted_by_user_id",
                table: "bookings");

            migrationBuilder.DropColumn(
                name: "deletion_reason",
                table: "bookings");

            migrationBuilder.DropColumn(
                name: "is_deleted",
                table: "bookings");

            migrationBuilder.DropColumn(
                name: "deleted_at",
                table: "assignments");

            migrationBuilder.DropColumn(
                name: "deleted_by_user_id",
                table: "assignments");

            migrationBuilder.DropColumn(
                name: "deletion_reason",
                table: "assignments");

            migrationBuilder.DropColumn(
                name: "is_deleted",
                table: "assignments");

            migrationBuilder.DropColumn(
                name: "deleted_at",
                table: "assignment_history");

            migrationBuilder.DropColumn(
                name: "deleted_by_user_id",
                table: "assignment_history");

            migrationBuilder.DropColumn(
                name: "deletion_reason",
                table: "assignment_history");

            migrationBuilder.DropColumn(
                name: "is_deleted",
                table: "assignment_history");
        }
    }
}

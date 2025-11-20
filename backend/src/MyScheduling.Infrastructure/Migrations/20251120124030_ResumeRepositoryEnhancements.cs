using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MyScheduling.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class ResumeRepositoryEnhancements : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "current_version_id",
                table: "resume_profiles",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "is_public",
                table: "resume_profiles",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "last_reviewed_at",
                table: "resume_profiles",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "last_reviewed_by_user_id",
                table: "resume_profiles",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "linked_in_last_synced_at",
                table: "resume_profiles",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "linked_in_profile_url",
                table: "resume_profiles",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "status",
                table: "resume_profiles",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateTable(
                name: "linked_in_imports",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    person_id = table.Column<Guid>(type: "uuid", nullable: false),
                    resume_profile_id = table.Column<Guid>(type: "uuid", nullable: false),
                    linked_in_profile_url = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    imported_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    imported_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    raw_data = table.Column<string>(type: "text", nullable: true),
                    status = table.Column<int>(type: "integer", nullable: false),
                    error_message = table.Column<string>(type: "text", nullable: true),
                    items_imported = table.Column<int>(type: "integer", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_linked_in_imports", x => x.id);
                    table.ForeignKey(
                        name: "fk_linked_in_imports__people_person_id",
                        column: x => x.person_id,
                        principalTable: "people",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_linked_in_imports__resume_profiles_resume_profile_id",
                        column: x => x.resume_profile_id,
                        principalTable: "resume_profiles",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_linked_in_imports__users_imported_by_user_id",
                        column: x => x.imported_by_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "resume_versions",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    resume_profile_id = table.Column<Guid>(type: "uuid", nullable: false),
                    version_number = table.Column<int>(type: "integer", nullable: false),
                    version_name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    description = table.Column<string>(type: "text", nullable: true),
                    content_snapshot = table.Column<string>(type: "text", nullable: true),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_resume_versions", x => x.id);
                    table.ForeignKey(
                        name: "fk_resume_versions__users_created_by_user_id",
                        column: x => x.created_by_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_resume_versions_resume_profiles_resume_profile_id",
                        column: x => x.resume_profile_id,
                        principalTable: "resume_profiles",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "share_point_configurations",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    site_url = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    site_id = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    drive_id = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    drive_name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    client_id = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    client_secret = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    tenant_id_microsoft = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    last_synced_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    folder_structure = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    tenant_id = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_share_point_configurations", x => x.id);
                    table.ForeignKey(
                        name: "fk_share_point_configurations__tenants_tenant_id",
                        column: x => x.tenant_id,
                        principalTable: "tenants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "stored_files",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    file_name = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    original_file_name = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    content_type = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    file_size_bytes = table.Column<long>(type: "bigint", nullable: false),
                    file_hash = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    storage_provider = table.Column<int>(type: "integer", nullable: false),
                    storage_provider_id = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    storage_path = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    share_point_site_id = table.Column<string>(type: "text", nullable: true),
                    share_point_drive_id = table.Column<string>(type: "text", nullable: true),
                    share_point_item_id = table.Column<string>(type: "text", nullable: true),
                    entity_type = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    entity_id = table.Column<Guid>(type: "uuid", nullable: false),
                    category = table.Column<string>(type: "text", nullable: true),
                    tags = table.Column<string>(type: "text", nullable: true),
                    access_level = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    expires_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    is_deleted = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    deleted_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<int>(type: "integer", nullable: false, defaultValue: 1),
                    previous_version_id = table.Column<Guid>(type: "uuid", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    tenant_id = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_stored_files", x => x.id);
                    table.ForeignKey(
                        name: "fk_stored_files__tenants_tenant_id",
                        column: x => x.tenant_id,
                        principalTable: "tenants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_stored_files__users_deleted_by_user_id",
                        column: x => x.deleted_by_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "fk_stored_files_stored_files_previous_version_id",
                        column: x => x.previous_version_id,
                        principalTable: "stored_files",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "resume_approvals",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    resume_profile_id = table.Column<Guid>(type: "uuid", nullable: false),
                    resume_version_id = table.Column<Guid>(type: "uuid", nullable: true),
                    requested_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    reviewed_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    requested_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    reviewed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    status = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    review_notes = table.Column<string>(type: "text", nullable: true),
                    request_notes = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_resume_approvals", x => x.id);
                    table.ForeignKey(
                        name: "fk_resume_approvals__resume_profiles_resume_profile_id",
                        column: x => x.resume_profile_id,
                        principalTable: "resume_profiles",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_resume_approvals__resume_versions_resume_version_id",
                        column: x => x.resume_version_id,
                        principalTable: "resume_versions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "fk_resume_approvals__users_requested_by_user_id",
                        column: x => x.requested_by_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_resume_approvals__users_reviewed_by_user_id",
                        column: x => x.reviewed_by_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "file_access_logs",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    stored_file_id = table.Column<Guid>(type: "uuid", nullable: false),
                    accessed_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    accessed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    access_type = table.Column<int>(type: "integer", nullable: false),
                    ip_address = table.Column<string>(type: "text", nullable: true),
                    user_agent = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_file_access_logs", x => x.id);
                    table.ForeignKey(
                        name: "fk_file_access_logs__stored_files_stored_file_id",
                        column: x => x.stored_file_id,
                        principalTable: "stored_files",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_file_access_logs__users_accessed_by_user_id",
                        column: x => x.accessed_by_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "resume_documents",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    resume_profile_id = table.Column<Guid>(type: "uuid", nullable: false),
                    resume_version_id = table.Column<Guid>(type: "uuid", nullable: true),
                    stored_file_id = table.Column<Guid>(type: "uuid", nullable: false),
                    document_type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    template_name = table.Column<string>(type: "text", nullable: true),
                    generated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    generated_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_resume_documents", x => x.id);
                    table.ForeignKey(
                        name: "fk_resume_documents__resume_profiles_resume_profile_id",
                        column: x => x.resume_profile_id,
                        principalTable: "resume_profiles",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_resume_documents__resume_versions_resume_version_id",
                        column: x => x.resume_version_id,
                        principalTable: "resume_versions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "fk_resume_documents__stored_files_stored_file_id",
                        column: x => x.stored_file_id,
                        principalTable: "stored_files",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_resume_documents__users_generated_by_user_id",
                        column: x => x.generated_by_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "resume_templates",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    type = table.Column<int>(type: "integer", nullable: false),
                    template_content = table.Column<string>(type: "text", nullable: false),
                    stored_file_id = table.Column<Guid>(type: "uuid", nullable: true),
                    is_default = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    tenant_id = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_resume_templates", x => x.id);
                    table.ForeignKey(
                        name: "fk_resume_templates__stored_files_stored_file_id",
                        column: x => x.stored_file_id,
                        principalTable: "stored_files",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "fk_resume_templates__tenants_tenant_id",
                        column: x => x.tenant_id,
                        principalTable: "tenants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_resume_profiles_current_version_id",
                table: "resume_profiles",
                column: "current_version_id");

            migrationBuilder.CreateIndex(
                name: "ix_resume_profiles_last_reviewed_by_user_id",
                table: "resume_profiles",
                column: "last_reviewed_by_user_id");

            migrationBuilder.CreateIndex(
                name: "ix_resume_profiles_status",
                table: "resume_profiles",
                column: "status");

            migrationBuilder.CreateIndex(
                name: "ix_file_access_logs_access_type_accessed_at",
                table: "file_access_logs",
                columns: new[] { "access_type", "accessed_at" });

            migrationBuilder.CreateIndex(
                name: "ix_file_access_logs_accessed_by_user_id_accessed_at",
                table: "file_access_logs",
                columns: new[] { "accessed_by_user_id", "accessed_at" });

            migrationBuilder.CreateIndex(
                name: "ix_file_access_logs_stored_file_id_accessed_at",
                table: "file_access_logs",
                columns: new[] { "stored_file_id", "accessed_at" });

            migrationBuilder.CreateIndex(
                name: "ix_linked_in_imports_imported_by_user_id",
                table: "linked_in_imports",
                column: "imported_by_user_id");

            migrationBuilder.CreateIndex(
                name: "ix_linked_in_imports_person_id_imported_at",
                table: "linked_in_imports",
                columns: new[] { "person_id", "imported_at" });

            migrationBuilder.CreateIndex(
                name: "ix_linked_in_imports_resume_profile_id_status",
                table: "linked_in_imports",
                columns: new[] { "resume_profile_id", "status" });

            migrationBuilder.CreateIndex(
                name: "ix_resume_approvals_requested_by_user_id",
                table: "resume_approvals",
                column: "requested_by_user_id");

            migrationBuilder.CreateIndex(
                name: "ix_resume_approvals_resume_profile_id_status",
                table: "resume_approvals",
                columns: new[] { "resume_profile_id", "status" });

            migrationBuilder.CreateIndex(
                name: "ix_resume_approvals_resume_version_id",
                table: "resume_approvals",
                column: "resume_version_id");

            migrationBuilder.CreateIndex(
                name: "ix_resume_approvals_reviewed_by_user_id",
                table: "resume_approvals",
                column: "reviewed_by_user_id");

            migrationBuilder.CreateIndex(
                name: "ix_resume_approvals_status_requested_at",
                table: "resume_approvals",
                columns: new[] { "status", "requested_at" });

            migrationBuilder.CreateIndex(
                name: "ix_resume_documents_generated_by_user_id",
                table: "resume_documents",
                column: "generated_by_user_id");

            migrationBuilder.CreateIndex(
                name: "ix_resume_documents_resume_profile_id_generated_at",
                table: "resume_documents",
                columns: new[] { "resume_profile_id", "generated_at" });

            migrationBuilder.CreateIndex(
                name: "ix_resume_documents_resume_version_id",
                table: "resume_documents",
                column: "resume_version_id");

            migrationBuilder.CreateIndex(
                name: "ix_resume_documents_stored_file_id",
                table: "resume_documents",
                column: "stored_file_id");

            migrationBuilder.CreateIndex(
                name: "ix_resume_templates_stored_file_id",
                table: "resume_templates",
                column: "stored_file_id");

            migrationBuilder.CreateIndex(
                name: "ix_resume_templates_tenant_id_is_default",
                table: "resume_templates",
                columns: new[] { "tenant_id", "is_default" });

            migrationBuilder.CreateIndex(
                name: "ix_resume_templates_tenant_id_type_is_active",
                table: "resume_templates",
                columns: new[] { "tenant_id", "type", "is_active" });

            migrationBuilder.CreateIndex(
                name: "ix_resume_versions_created_by_user_id",
                table: "resume_versions",
                column: "created_by_user_id");

            migrationBuilder.CreateIndex(
                name: "ix_resume_versions_resume_profile_id_is_active",
                table: "resume_versions",
                columns: new[] { "resume_profile_id", "is_active" });

            migrationBuilder.CreateIndex(
                name: "ix_resume_versions_resume_profile_id_version_number",
                table: "resume_versions",
                columns: new[] { "resume_profile_id", "version_number" });

            migrationBuilder.CreateIndex(
                name: "ix_share_point_configurations_tenant_id_is_active",
                table: "share_point_configurations",
                columns: new[] { "tenant_id", "is_active" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_stored_files_deleted_by_user_id",
                table: "stored_files",
                column: "deleted_by_user_id");

            migrationBuilder.CreateIndex(
                name: "ix_stored_files_file_hash",
                table: "stored_files",
                column: "file_hash");

            migrationBuilder.CreateIndex(
                name: "ix_stored_files_previous_version_id",
                table: "stored_files",
                column: "previous_version_id");

            migrationBuilder.CreateIndex(
                name: "ix_stored_files_storage_provider_storage_provider_id",
                table: "stored_files",
                columns: new[] { "storage_provider", "storage_provider_id" });

            migrationBuilder.CreateIndex(
                name: "ix_stored_files_tenant_id_entity_type_entity_id",
                table: "stored_files",
                columns: new[] { "tenant_id", "entity_type", "entity_id" });

            migrationBuilder.CreateIndex(
                name: "ix_stored_files_tenant_id_is_deleted",
                table: "stored_files",
                columns: new[] { "tenant_id", "is_deleted" });

            migrationBuilder.AddForeignKey(
                name: "fk_resume_profiles__resume_versions_current_version_id",
                table: "resume_profiles",
                column: "current_version_id",
                principalTable: "resume_versions",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "fk_resume_profiles__users_last_reviewed_by_user_id",
                table: "resume_profiles",
                column: "last_reviewed_by_user_id",
                principalTable: "users",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_resume_profiles__resume_versions_current_version_id",
                table: "resume_profiles");

            migrationBuilder.DropForeignKey(
                name: "fk_resume_profiles__users_last_reviewed_by_user_id",
                table: "resume_profiles");

            migrationBuilder.DropTable(
                name: "file_access_logs");

            migrationBuilder.DropTable(
                name: "linked_in_imports");

            migrationBuilder.DropTable(
                name: "resume_approvals");

            migrationBuilder.DropTable(
                name: "resume_documents");

            migrationBuilder.DropTable(
                name: "resume_templates");

            migrationBuilder.DropTable(
                name: "share_point_configurations");

            migrationBuilder.DropTable(
                name: "resume_versions");

            migrationBuilder.DropTable(
                name: "stored_files");

            migrationBuilder.DropIndex(
                name: "ix_resume_profiles_current_version_id",
                table: "resume_profiles");

            migrationBuilder.DropIndex(
                name: "ix_resume_profiles_last_reviewed_by_user_id",
                table: "resume_profiles");

            migrationBuilder.DropIndex(
                name: "ix_resume_profiles_status",
                table: "resume_profiles");

            migrationBuilder.DropColumn(
                name: "current_version_id",
                table: "resume_profiles");

            migrationBuilder.DropColumn(
                name: "is_public",
                table: "resume_profiles");

            migrationBuilder.DropColumn(
                name: "last_reviewed_at",
                table: "resume_profiles");

            migrationBuilder.DropColumn(
                name: "last_reviewed_by_user_id",
                table: "resume_profiles");

            migrationBuilder.DropColumn(
                name: "linked_in_last_synced_at",
                table: "resume_profiles");

            migrationBuilder.DropColumn(
                name: "linked_in_profile_url",
                table: "resume_profiles");

            migrationBuilder.DropColumn(
                name: "status",
                table: "resume_profiles");
        }
    }
}

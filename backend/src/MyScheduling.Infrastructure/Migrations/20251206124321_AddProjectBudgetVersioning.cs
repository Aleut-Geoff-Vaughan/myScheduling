using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MyScheduling.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddProjectBudgetVersioning : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Add tenant_settings columns using raw SQL with IF NOT EXISTS for idempotency
            // (these may already exist from a partial previous migration attempt)
            migrationBuilder.Sql(@"
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
            ");

            // Skip actual_hours table creation - it already exists from a previous migration
            // The table was created in AddEnhancedStaffingModule migration

            migrationBuilder.CreateTable(
                name: "project_budgets",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    project_id = table.Column<Guid>(type: "uuid", nullable: false),
                    fiscal_year = table.Column<int>(type: "integer", nullable: false),
                    name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    type = table.Column<int>(type: "integer", nullable: false),
                    version_number = table.Column<int>(type: "integer", nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    previous_version_id = table.Column<Guid>(type: "uuid", nullable: true),
                    total_budgeted_hours = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false),
                    status = table.Column<int>(type: "integer", nullable: false),
                    submitted_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    submitted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    approved_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    approved_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    approval_notes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    effective_from = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    effective_to = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
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
                    table.PrimaryKey("pk_project_budgets", x => x.id);
                    table.ForeignKey(
                        name: "fk_project_budgets__tenants_tenant_id",
                        column: x => x.tenant_id,
                        principalTable: "tenants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_project_budgets__users_approved_by_user_id",
                        column: x => x.approved_by_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "fk_project_budgets__users_submitted_by_user_id",
                        column: x => x.submitted_by_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "fk_project_budgets_project_budgets_previous_version_id",
                        column: x => x.previous_version_id,
                        principalTable: "project_budgets",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "fk_project_budgets_projects_project_id",
                        column: x => x.project_id,
                        principalTable: "projects",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "project_budget_histories",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    project_budget_id = table.Column<Guid>(type: "uuid", nullable: false),
                    changed_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    changed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    change_type = table.Column<int>(type: "integer", nullable: false),
                    old_total_hours = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: true),
                    new_total_hours = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: true),
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
                    table.PrimaryKey("pk_project_budget_histories", x => x.id);
                    table.ForeignKey(
                        name: "fk_project_budget_histories__users_changed_by_user_id",
                        column: x => x.changed_by_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_project_budget_histories_project_budgets_project_budget_id",
                        column: x => x.project_budget_id,
                        principalTable: "project_budgets",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "project_budget_lines",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    project_budget_id = table.Column<Guid>(type: "uuid", nullable: false),
                    year = table.Column<int>(type: "integer", nullable: false),
                    month = table.Column<int>(type: "integer", nullable: false),
                    budgeted_hours = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: false),
                    wbs_element_id = table.Column<Guid>(type: "uuid", nullable: true),
                    labor_category_id = table.Column<Guid>(type: "uuid", nullable: true),
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
                    table.PrimaryKey("pk_project_budget_lines", x => x.id);
                    table.ForeignKey(
                        name: "fk_project_budget_lines__tenants_tenant_id",
                        column: x => x.tenant_id,
                        principalTable: "tenants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_project_budget_lines__wbs_elements_wbs_element_id",
                        column: x => x.wbs_element_id,
                        principalTable: "wbs_elements",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "fk_project_budget_lines_labor_categories_labor_category_id",
                        column: x => x.labor_category_id,
                        principalTable: "labor_categories",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "fk_project_budget_lines_project_budgets_project_budget_id",
                        column: x => x.project_budget_id,
                        principalTable: "project_budgets",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            // actual_hours indexes already exist from previous migration

            migrationBuilder.CreateIndex(
                name: "ix_project_budget_histories_changed_by_user_id",
                table: "project_budget_histories",
                column: "changed_by_user_id");

            migrationBuilder.CreateIndex(
                name: "ix_project_budget_histories_project_budget_id_changed_at",
                table: "project_budget_histories",
                columns: new[] { "project_budget_id", "changed_at" });

            migrationBuilder.CreateIndex(
                name: "ix_project_budget_lines_labor_category_id",
                table: "project_budget_lines",
                column: "labor_category_id");

            migrationBuilder.CreateIndex(
                name: "ix_project_budget_lines_project_budget_id_wbs_element_id_year_~",
                table: "project_budget_lines",
                columns: new[] { "project_budget_id", "wbs_element_id", "year", "month" });

            migrationBuilder.CreateIndex(
                name: "ix_project_budget_lines_tenant_id_project_budget_id_year_month",
                table: "project_budget_lines",
                columns: new[] { "tenant_id", "project_budget_id", "year", "month" });

            migrationBuilder.CreateIndex(
                name: "ix_project_budget_lines_wbs_element_id",
                table: "project_budget_lines",
                column: "wbs_element_id");

            migrationBuilder.CreateIndex(
                name: "ix_project_budgets_approved_by_user_id",
                table: "project_budgets",
                column: "approved_by_user_id");

            migrationBuilder.CreateIndex(
                name: "ix_project_budgets_previous_version_id",
                table: "project_budgets",
                column: "previous_version_id");

            migrationBuilder.CreateIndex(
                name: "ix_project_budgets_project_id_fiscal_year_version_number",
                table: "project_budgets",
                columns: new[] { "project_id", "fiscal_year", "version_number" });

            migrationBuilder.CreateIndex(
                name: "ix_project_budgets_submitted_by_user_id",
                table: "project_budgets",
                column: "submitted_by_user_id");

            migrationBuilder.CreateIndex(
                name: "ix_project_budgets_tenant_id_project_id_fiscal_year_is_active",
                table: "project_budgets",
                columns: new[] { "tenant_id", "project_id", "fiscal_year", "is_active" });

            migrationBuilder.CreateIndex(
                name: "ix_project_budgets_tenant_id_status",
                table: "project_budgets",
                columns: new[] { "tenant_id", "status" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Don't drop actual_hours - it belongs to AddEnhancedStaffingModule migration

            migrationBuilder.DropTable(
                name: "project_budget_histories");

            migrationBuilder.DropTable(
                name: "project_budget_lines");

            migrationBuilder.DropTable(
                name: "project_budgets");

            migrationBuilder.DropColumn(
                name: "default_budget_months_ahead",
                table: "tenant_settings");

            migrationBuilder.DropColumn(
                name: "fiscal_year_start_month",
                table: "tenant_settings");

            migrationBuilder.DropColumn(
                name: "require_budget_approval",
                table: "tenant_settings");
        }
    }
}

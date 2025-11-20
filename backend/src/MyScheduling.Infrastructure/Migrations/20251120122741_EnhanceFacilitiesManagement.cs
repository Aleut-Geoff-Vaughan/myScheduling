using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MyScheduling.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class EnhanceFacilitiesManagement : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "booking_rules",
                table: "spaces",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "daily_cost",
                table: "spaces",
                type: "numeric",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "equipment",
                table: "spaces",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "features",
                table: "spaces",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "is_active",
                table: "spaces",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<Guid>(
                name: "manager_user_id",
                table: "spaces",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "max_booking_days",
                table: "spaces",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "requires_approval",
                table: "spaces",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "facility_permissions",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    office_id = table.Column<Guid>(type: "uuid", nullable: true),
                    space_id = table.Column<Guid>(type: "uuid", nullable: true),
                    user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    role = table.Column<int>(type: "integer", nullable: true),
                    access_level = table.Column<int>(type: "integer", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_facility_permissions", x => x.id);
                    table.ForeignKey(
                        name: "fk_facility_permissions__offices_office_id",
                        column: x => x.office_id,
                        principalTable: "offices",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_facility_permissions__spaces_space_id",
                        column: x => x.space_id,
                        principalTable: "spaces",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_facility_permissions__users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "space_maintenance_logs",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    space_id = table.Column<Guid>(type: "uuid", nullable: false),
                    scheduled_date = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    completed_date = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    type = table.Column<int>(type: "integer", nullable: false),
                    status = table.Column<int>(type: "integer", nullable: false),
                    reported_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    assigned_to_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    resolution = table.Column<string>(type: "text", nullable: true),
                    cost = table.Column<decimal>(type: "numeric", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_space_maintenance_logs", x => x.id);
                    table.ForeignKey(
                        name: "fk_space_maintenance_logs__users_assigned_to_user_id",
                        column: x => x.assigned_to_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "fk_space_maintenance_logs__users_reported_by_user_id",
                        column: x => x.reported_by_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_space_maintenance_logs_spaces_space_id",
                        column: x => x.space_id,
                        principalTable: "spaces",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_spaces_manager_user_id_is_active",
                table: "spaces",
                columns: new[] { "manager_user_id", "is_active" });

            migrationBuilder.CreateIndex(
                name: "ix_facility_permissions_office_id_space_id_user_id",
                table: "facility_permissions",
                columns: new[] { "office_id", "space_id", "user_id" });

            migrationBuilder.CreateIndex(
                name: "ix_facility_permissions_role_access_level",
                table: "facility_permissions",
                columns: new[] { "role", "access_level" });

            migrationBuilder.CreateIndex(
                name: "ix_facility_permissions_space_id",
                table: "facility_permissions",
                column: "space_id");

            migrationBuilder.CreateIndex(
                name: "ix_facility_permissions_user_id",
                table: "facility_permissions",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "ix_space_maintenance_logs_assigned_to_user_id",
                table: "space_maintenance_logs",
                column: "assigned_to_user_id");

            migrationBuilder.CreateIndex(
                name: "ix_space_maintenance_logs_reported_by_user_id",
                table: "space_maintenance_logs",
                column: "reported_by_user_id");

            migrationBuilder.CreateIndex(
                name: "ix_space_maintenance_logs_scheduled_date_status",
                table: "space_maintenance_logs",
                columns: new[] { "scheduled_date", "status" });

            migrationBuilder.CreateIndex(
                name: "ix_space_maintenance_logs_space_id_status",
                table: "space_maintenance_logs",
                columns: new[] { "space_id", "status" });

            migrationBuilder.AddForeignKey(
                name: "fk_spaces__users_manager_user_id",
                table: "spaces",
                column: "manager_user_id",
                principalTable: "users",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_spaces__users_manager_user_id",
                table: "spaces");

            migrationBuilder.DropTable(
                name: "facility_permissions");

            migrationBuilder.DropTable(
                name: "space_maintenance_logs");

            migrationBuilder.DropIndex(
                name: "ix_spaces_manager_user_id_is_active",
                table: "spaces");

            migrationBuilder.DropColumn(
                name: "booking_rules",
                table: "spaces");

            migrationBuilder.DropColumn(
                name: "daily_cost",
                table: "spaces");

            migrationBuilder.DropColumn(
                name: "equipment",
                table: "spaces");

            migrationBuilder.DropColumn(
                name: "features",
                table: "spaces");

            migrationBuilder.DropColumn(
                name: "is_active",
                table: "spaces");

            migrationBuilder.DropColumn(
                name: "manager_user_id",
                table: "spaces");

            migrationBuilder.DropColumn(
                name: "max_booking_days",
                table: "spaces");

            migrationBuilder.DropColumn(
                name: "requires_approval",
                table: "spaces");
        }
    }
}

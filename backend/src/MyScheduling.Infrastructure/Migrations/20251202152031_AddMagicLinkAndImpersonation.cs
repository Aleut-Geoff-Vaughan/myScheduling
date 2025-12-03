using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MyScheduling.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddMagicLinkAndImpersonation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "impersonation_sessions",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    admin_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    impersonated_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    started_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ended_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    reason = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    ip_address = table.Column<string>(type: "character varying(45)", maxLength: 45, nullable: true),
                    user_agent = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    end_reason = table.Column<int>(type: "integer", nullable: true),
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
                    table.PrimaryKey("pk_impersonation_sessions", x => x.id);
                    table.ForeignKey(
                        name: "fk_impersonation_sessions__users_admin_user_id",
                        column: x => x.admin_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_impersonation_sessions__users_impersonated_user_id",
                        column: x => x.impersonated_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "magic_link_tokens",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    token_hash = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    expires_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    used_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    requested_from_ip = table.Column<string>(type: "character varying(45)", maxLength: 45, nullable: true),
                    requested_user_agent = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    used_from_ip = table.Column<string>(type: "character varying(45)", maxLength: 45, nullable: true),
                    used_user_agent = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
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
                    table.PrimaryKey("pk_magic_link_tokens", x => x.id);
                    table.ForeignKey(
                        name: "fk_magic_link_tokens__users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_impersonation_sessions_admin_user_id_ended_at",
                table: "impersonation_sessions",
                columns: new[] { "admin_user_id", "ended_at" });

            migrationBuilder.CreateIndex(
                name: "ix_impersonation_sessions_impersonated_user_id_started_at",
                table: "impersonation_sessions",
                columns: new[] { "impersonated_user_id", "started_at" });

            migrationBuilder.CreateIndex(
                name: "ix_impersonation_sessions_started_at",
                table: "impersonation_sessions",
                column: "started_at");

            migrationBuilder.CreateIndex(
                name: "ix_magic_link_tokens_expires_at",
                table: "magic_link_tokens",
                column: "expires_at");

            migrationBuilder.CreateIndex(
                name: "ix_magic_link_tokens_token_hash",
                table: "magic_link_tokens",
                column: "token_hash",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_magic_link_tokens_user_id_expires_at",
                table: "magic_link_tokens",
                columns: new[] { "user_id", "expires_at" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "impersonation_sessions");

            migrationBuilder.DropTable(
                name: "magic_link_tokens");
        }
    }
}

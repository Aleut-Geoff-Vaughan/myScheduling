using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MyScheduling.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddResumeShareLink : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "resume_share_links",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    resume_profile_id = table.Column<Guid>(type: "uuid", nullable: false),
                    resume_version_id = table.Column<Guid>(type: "uuid", nullable: true),
                    share_token = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    expires_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    password_hash = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    visible_sections = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    hide_contact_info = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    view_count = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    is_active = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    is_deleted = table.Column<bool>(type: "boolean", nullable: false),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    deleted_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    deletion_reason = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_resume_share_links", x => x.id);
                    table.ForeignKey(
                        name: "fk_resume_share_links__resume_versions_resume_version_id",
                        column: x => x.resume_version_id,
                        principalTable: "resume_versions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "fk_resume_share_links__users_created_by_user_id",
                        column: x => x.created_by_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_resume_share_links_resume_profiles_resume_profile_id",
                        column: x => x.resume_profile_id,
                        principalTable: "resume_profiles",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_resume_share_links_created_by_user_id",
                table: "resume_share_links",
                column: "created_by_user_id");

            migrationBuilder.CreateIndex(
                name: "ix_resume_share_links_resume_profile_id_is_active",
                table: "resume_share_links",
                columns: new[] { "resume_profile_id", "is_active" });

            migrationBuilder.CreateIndex(
                name: "ix_resume_share_links_resume_version_id",
                table: "resume_share_links",
                column: "resume_version_id");

            migrationBuilder.CreateIndex(
                name: "ix_resume_share_links_share_token",
                table: "resume_share_links",
                column: "share_token",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "resume_share_links");
        }
    }
}

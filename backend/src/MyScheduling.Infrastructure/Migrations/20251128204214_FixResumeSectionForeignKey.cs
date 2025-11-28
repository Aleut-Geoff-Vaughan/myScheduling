using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MyScheduling.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class FixResumeSectionForeignKey : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_resume_sections_resume_profiles_resume_profile_id1",
                table: "resume_sections");

            migrationBuilder.DropIndex(
                name: "ix_resume_sections_resume_profile_id1",
                table: "resume_sections");

            migrationBuilder.DropColumn(
                name: "resume_profile_id1",
                table: "resume_sections");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "resume_profile_id1",
                table: "resume_sections",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.CreateIndex(
                name: "ix_resume_sections_resume_profile_id1",
                table: "resume_sections",
                column: "resume_profile_id1");

            migrationBuilder.AddForeignKey(
                name: "fk_resume_sections_resume_profiles_resume_profile_id1",
                table: "resume_sections",
                column: "resume_profile_id1",
                principalTable: "resume_profiles",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}

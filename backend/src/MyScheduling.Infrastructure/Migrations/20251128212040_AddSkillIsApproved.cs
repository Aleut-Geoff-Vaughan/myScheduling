using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MyScheduling.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddSkillIsApproved : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "is_approved",
                table: "skills",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "is_approved",
                table: "skills");
        }
    }
}

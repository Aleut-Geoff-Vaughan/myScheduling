using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MyScheduling.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddHolidayRecurrenceAndAutoApply : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "auto_apply_to_forecast",
                table: "company_holidays",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "auto_apply_to_schedule",
                table: "company_holidays",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "is_active",
                table: "company_holidays",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "recurrence_rule",
                table: "company_holidays",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "recurring_day",
                table: "company_holidays",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "recurring_month",
                table: "company_holidays",
                type: "integer",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "auto_apply_to_forecast",
                table: "company_holidays");

            migrationBuilder.DropColumn(
                name: "auto_apply_to_schedule",
                table: "company_holidays");

            migrationBuilder.DropColumn(
                name: "is_active",
                table: "company_holidays");

            migrationBuilder.DropColumn(
                name: "recurrence_rule",
                table: "company_holidays");

            migrationBuilder.DropColumn(
                name: "recurring_day",
                table: "company_holidays");

            migrationBuilder.DropColumn(
                name: "recurring_month",
                table: "company_holidays");
        }
    }
}

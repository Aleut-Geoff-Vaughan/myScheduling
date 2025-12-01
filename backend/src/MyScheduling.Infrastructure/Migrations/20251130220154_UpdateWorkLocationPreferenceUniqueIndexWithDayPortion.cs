using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MyScheduling.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class UpdateWorkLocationPreferenceUniqueIndexWithDayPortion : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ix_work_location_preferences_tenant_id_user_id_work_date",
                table: "work_location_preferences");

            migrationBuilder.CreateIndex(
                name: "ix_work_location_preferences_tenant_id_user_id_work_date_day_p~",
                table: "work_location_preferences",
                columns: new[] { "tenant_id", "user_id", "work_date", "day_portion" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ix_work_location_preferences_tenant_id_user_id_work_date_day_p~",
                table: "work_location_preferences");

            migrationBuilder.CreateIndex(
                name: "ix_work_location_preferences_tenant_id_user_id_work_date",
                table: "work_location_preferences",
                columns: new[] { "tenant_id", "user_id", "work_date" },
                unique: true);
        }
    }
}

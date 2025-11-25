using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MyScheduling.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddWbsApproverGroup : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "approver_group_id",
                table: "wbs_elements",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "ix_wbs_elements_approver_group_id",
                table: "wbs_elements",
                column: "approver_group_id");

            migrationBuilder.AddForeignKey(
                name: "fk_wbs_elements_groups_approver_group_id",
                table: "wbs_elements",
                column: "approver_group_id",
                principalTable: "groups",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_wbs_elements_groups_approver_group_id",
                table: "wbs_elements");

            migrationBuilder.DropIndex(
                name: "ix_wbs_elements_approver_group_id",
                table: "wbs_elements");

            migrationBuilder.DropColumn(
                name: "approver_group_id",
                table: "wbs_elements");
        }
    }
}

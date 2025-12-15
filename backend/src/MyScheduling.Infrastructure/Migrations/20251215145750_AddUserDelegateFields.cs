using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MyScheduling.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddUserDelegateFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "executive_assistant_id",
                table: "users",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "home_office_id",
                table: "users",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "standard_delegate_ids",
                table: "users",
                type: "jsonb",
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateIndex(
                name: "ix_users_executive_assistant_id",
                table: "users",
                column: "executive_assistant_id");

            migrationBuilder.CreateIndex(
                name: "ix_users_home_office_id",
                table: "users",
                column: "home_office_id");

            migrationBuilder.AddForeignKey(
                name: "fk_users_offices_home_office_id",
                table: "users",
                column: "home_office_id",
                principalTable: "offices",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "fk_users_users_executive_assistant_id",
                table: "users",
                column: "executive_assistant_id",
                principalTable: "users",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_users_offices_home_office_id",
                table: "users");

            migrationBuilder.DropForeignKey(
                name: "fk_users_users_executive_assistant_id",
                table: "users");

            migrationBuilder.DropIndex(
                name: "ix_users_executive_assistant_id",
                table: "users");

            migrationBuilder.DropIndex(
                name: "ix_users_home_office_id",
                table: "users");

            migrationBuilder.DropColumn(
                name: "executive_assistant_id",
                table: "users");

            migrationBuilder.DropColumn(
                name: "home_office_id",
                table: "users");

            migrationBuilder.DropColumn(
                name: "standard_delegate_ids",
                table: "users");
        }
    }
}

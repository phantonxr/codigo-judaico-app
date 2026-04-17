using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CodigoJudaico.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddAccountCreatedEmailTracking : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "AccountCreatedEmailSentAt",
                table: "app_users",
                type: "timestamp with time zone",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AccountCreatedEmailSentAt",
                table: "app_users");
        }
    }
}

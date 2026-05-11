using System;
using CodigoJudaico.Api.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CodigoJudaico.Api.Data.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20260511000000_AddCheckoutRecoveryEmailTracking")]
    public partial class AddCheckoutRecoveryEmailTracking : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "PersuasiveEmailResendId",
                table: "checkout_recoveries",
                type: "character varying(128)",
                maxLength: 128,
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "PersuasiveEmailOpenedAt",
                table: "checkout_recoveries",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DiscountEmailResendId",
                table: "checkout_recoveries",
                type: "character varying(128)",
                maxLength: 128,
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "DiscountEmailOpenedAt",
                table: "checkout_recoveries",
                type: "timestamp with time zone",
                nullable: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "PersuasiveEmailResendId", table: "checkout_recoveries");
            migrationBuilder.DropColumn(name: "PersuasiveEmailOpenedAt", table: "checkout_recoveries");
            migrationBuilder.DropColumn(name: "DiscountEmailResendId", table: "checkout_recoveries");
            migrationBuilder.DropColumn(name: "DiscountEmailOpenedAt", table: "checkout_recoveries");
        }
    }
}

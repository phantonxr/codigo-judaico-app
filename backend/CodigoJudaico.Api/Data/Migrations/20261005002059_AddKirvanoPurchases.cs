using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CodigoJudaico.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddKirvanoPurchases : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "KirvanoAccessEnabled",
                table: "app_users",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateOnly>(
                name: "KirvanoAccessExpiresAt",
                table: "app_users",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "KirvanoPlanName",
                table: "app_users",
                type: "character varying(120)",
                maxLength: 120,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "KirvanoPlanStatus",
                table: "app_users",
                type: "character varying(40)",
                maxLength: 40,
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateTable(
                name: "kirvano_sales",
                columns: table => new
                {
                    SaleId = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    CheckoutId = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: true),
                    Status = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    AccessPlan = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    AccessExpiresAt = table.Column<DateOnly>(type: "date", nullable: true),
                    ApprovedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    LastEventAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    EmailSentAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_kirvano_sales", x => x.SaleId);
                    table.ForeignKey(
                        name: "FK_kirvano_sales_app_users_UserId",
                        column: x => x.UserId,
                        principalTable: "app_users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "kirvano_sale_books",
                columns: table => new
                {
                    SaleId = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    BookId = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_kirvano_sale_books", x => new { x.SaleId, x.BookId });
                    table.ForeignKey(
                        name: "FK_kirvano_sale_books_kirvano_sales_SaleId",
                        column: x => x.SaleId,
                        principalTable: "kirvano_sales",
                        principalColumn: "SaleId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_kirvano_sales_UserId",
                table: "kirvano_sales",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "kirvano_sale_books");

            migrationBuilder.DropTable(
                name: "kirvano_sales");

            migrationBuilder.DropColumn(
                name: "KirvanoAccessEnabled",
                table: "app_users");

            migrationBuilder.DropColumn(
                name: "KirvanoAccessExpiresAt",
                table: "app_users");

            migrationBuilder.DropColumn(
                name: "KirvanoPlanName",
                table: "app_users");

            migrationBuilder.DropColumn(
                name: "KirvanoPlanStatus",
                table: "app_users");
        }
    }
}

using CodigoJudaico.Api.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CodigoJudaico.Api.Data.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20260426230000_AddUtmParameters")]
    public partial class AddUtmParameters : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "UtmSource",
                table: "app_users",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "UtmMedium",
                table: "app_users",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "UtmCampaign",
                table: "app_users",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "UtmTerm",
                table: "app_users",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "UtmContent",
                table: "app_users",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "UtmSource", table: "app_users");
            migrationBuilder.DropColumn(name: "UtmMedium", table: "app_users");
            migrationBuilder.DropColumn(name: "UtmCampaign", table: "app_users");
            migrationBuilder.DropColumn(name: "UtmTerm", table: "app_users");
            migrationBuilder.DropColumn(name: "UtmContent", table: "app_users");
        }
    }
}

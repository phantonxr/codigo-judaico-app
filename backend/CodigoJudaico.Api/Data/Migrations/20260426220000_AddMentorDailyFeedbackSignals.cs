using CodigoJudaico.Api.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CodigoJudaico.Api.Data.Migrations
{
    /// <inheritdoc />
    [DbContext(typeof(AppDbContext))]
    [Migration("20260426220000_AddMentorDailyFeedbackSignals")]
    public partial class AddMentorDailyFeedbackSignals : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "DetectedEmotion",
                table: "mentor_daily_feedbacks",
                type: "character varying(80)",
                maxLength: 80,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "TriggerType",
                table: "mentor_daily_feedbacks",
                type: "character varying(120)",
                maxLength: 120,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "ObservedPattern",
                table: "mentor_daily_feedbacks",
                type: "character varying(160)",
                maxLength: 160,
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DetectedEmotion",
                table: "mentor_daily_feedbacks");

            migrationBuilder.DropColumn(
                name: "TriggerType",
                table: "mentor_daily_feedbacks");

            migrationBuilder.DropColumn(
                name: "ObservedPattern",
                table: "mentor_daily_feedbacks");
        }
    }
}

using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CodigoJudaico.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddMentorAndSubscriptionTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "mentor_daily_feedbacks",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Phase = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    DayNumber = table.Column<int>(type: "integer", nullable: false),
                    DetectedTrigger = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    EmotionalPattern = table.Column<string>(type: "character varying(700)", maxLength: 700, nullable: false),
                    FinancialRisk = table.Column<string>(type: "character varying(700)", maxLength: 700, nullable: false),
                    JewishWisdom = table.Column<string>(type: "text", nullable: false),
                    PracticalAction = table.Column<string>(type: "text", nullable: false),
                    FeedbackText = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_mentor_daily_feedbacks", x => x.Id);
                    table.ForeignKey(
                        name: "FK_mentor_daily_feedbacks_app_users_UserId",
                        column: x => x.UserId,
                        principalTable: "app_users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "mentor_final_reports",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    ReportText = table.Column<string>(type: "text", nullable: false),
                    TopTriggersJson = table.Column<string>(type: "jsonb", nullable: false),
                    EmotionalPattern = table.Column<string>(type: "text", nullable: false),
                    FinancialRiskPattern = table.Column<string>(type: "text", nullable: false),
                    NextStepRecommendation = table.Column<string>(type: "text", nullable: false),
                    OfferShown = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_mentor_final_reports", x => x.Id);
                    table.ForeignKey(
                        name: "FK_mentor_final_reports_app_users_UserId",
                        column: x => x.UserId,
                        principalTable: "app_users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "mentor_usage",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Date = table.Column<DateOnly>(type: "date", nullable: false),
                    InteractionsCount = table.Column<int>(type: "integer", nullable: false),
                    PlanType = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_mentor_usage", x => x.Id);
                    table.ForeignKey(
                        name: "FK_mentor_usage_app_users_UserId",
                        column: x => x.UserId,
                        principalTable: "app_users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "password_reset_tokens",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    TokenHash = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    ExpiresAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UsedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_password_reset_tokens", x => x.Id);
                    table.ForeignKey(
                        name: "FK_password_reset_tokens_app_users_UserId",
                        column: x => x.UserId,
                        principalTable: "app_users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "subscriptions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    PlanName = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    PlanType = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false),
                    Status = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    Price = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    CheckoutUrl = table.Column<string>(type: "character varying(800)", maxLength: 800, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_subscriptions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_subscriptions_app_users_UserId",
                        column: x => x.UserId,
                        principalTable: "app_users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_mentor_daily_feedbacks_UserId_Phase_DayNumber",
                table: "mentor_daily_feedbacks",
                columns: new[] { "UserId", "Phase", "DayNumber" });

            migrationBuilder.CreateIndex(
                name: "IX_mentor_final_reports_UserId_CreatedAt",
                table: "mentor_final_reports",
                columns: new[] { "UserId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_mentor_usage_UserId_Date",
                table: "mentor_usage",
                columns: new[] { "UserId", "Date" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_password_reset_tokens_TokenHash",
                table: "password_reset_tokens",
                column: "TokenHash",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_password_reset_tokens_UserId_ExpiresAt",
                table: "password_reset_tokens",
                columns: new[] { "UserId", "ExpiresAt" });

            migrationBuilder.CreateIndex(
                name: "IX_subscriptions_UserId_PlanType_Status",
                table: "subscriptions",
                columns: new[] { "UserId", "PlanType", "Status" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "mentor_daily_feedbacks");

            migrationBuilder.DropTable(
                name: "mentor_final_reports");

            migrationBuilder.DropTable(
                name: "mentor_usage");

            migrationBuilder.DropTable(
                name: "password_reset_tokens");

            migrationBuilder.DropTable(
                name: "subscriptions");
        }
    }
}

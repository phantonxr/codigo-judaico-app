using System;
using CodigoJudaico.Api.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CodigoJudaico.Api.Data.Migrations
{
    /// <inheritdoc />
    [DbContext(typeof(AppDbContext))]
    [Migration("20260510010000_AddCheckoutRecoveries")]
    public partial class AddCheckoutRecoveries : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "checkout_recoveries",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Email = table.Column<string>(type: "character varying(320)", maxLength: 320, nullable: false),
                    PlanId = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    PlanName = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    OriginalStripeCheckoutSessionId = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    LastStripeCheckoutSessionId = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    Status = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    NextEmailStep = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    CheckoutCreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    NextSendAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    LastSentAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    PersuasiveEmailSentAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    DiscountEmailSentAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    SentCount = table.Column<int>(type: "integer", nullable: false),
                    RecoveryTokenHash = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    RecoveryTokenExpiresAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    UnsubscribeTokenHash = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    UnsubscribeTokenExpiresAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    DiscountCode = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    StripePromotionCodeId = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    DiscountExpiresAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    CompletedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    StoppedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    StopReason = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    ReplyReceivedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    ReplyFrom = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    ReplySubject = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    UnsubscribedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_checkout_recoveries", x => x.Id);
                    table.ForeignKey(
                        name: "FK_checkout_recoveries_app_users_UserId",
                        column: x => x.UserId,
                        principalTable: "app_users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_checkout_recoveries_Email",
                table: "checkout_recoveries",
                column: "Email");

            migrationBuilder.CreateIndex(
                name: "IX_checkout_recoveries_LastStripeCheckoutSessionId",
                table: "checkout_recoveries",
                column: "LastStripeCheckoutSessionId");

            migrationBuilder.CreateIndex(
                name: "IX_checkout_recoveries_NextSendAt",
                table: "checkout_recoveries",
                column: "NextSendAt");

            migrationBuilder.CreateIndex(
                name: "IX_checkout_recoveries_RecoveryTokenHash",
                table: "checkout_recoveries",
                column: "RecoveryTokenHash",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_checkout_recoveries_Status",
                table: "checkout_recoveries",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_checkout_recoveries_UnsubscribeTokenHash",
                table: "checkout_recoveries",
                column: "UnsubscribeTokenHash",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_checkout_recoveries_UserId",
                table: "checkout_recoveries",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "checkout_recoveries");
        }
    }
}

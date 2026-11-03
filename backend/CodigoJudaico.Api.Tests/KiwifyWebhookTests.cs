using System.Globalization;
using System.Net;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using CodigoJudaico.Api.Contracts;
using CodigoJudaico.Api.Data;
using CodigoJudaico.Api.Endpoints;
using CodigoJudaico.Api.Models;
using CodigoJudaico.Api.Services;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

namespace CodigoJudaico.Api.Tests;

public sealed class KiwifyWebhookTests
{
    private const string Token = "kiwify-secret";
    private static readonly TimeZoneInfo Brasilia = TimeZoneInfo.FindSystemTimeZoneById("America/Sao_Paulo");

    [Fact]
    public void Signature_MatchesOfficialTestVector()
    {
        // Test vector from https://docs.kiwify.com.br/api-reference/webhooks/receiving
        var body = Encoding.UTF8.GetBytes("{\"order_id\":\"9b1c2d3e-0000-4000-8000-000000000001\",\"order_status\":\"paid\",\"webhook_event_type\":\"order_approved\"}");
        var settings = new KiwifyOptions { WebhookToken = "kiwify-token-de-teste" };
        Assert.True(KiwifyEndpoints.IsValidSignature(body, "bf18f352a4f981b91dfa3f6d8742a81080ab8c86", settings));
        Assert.False(KiwifyEndpoints.IsValidSignature(body, "bf18f352a4f981b91dfa3f6d8742a81080ab8c87", settings));
        Assert.False(KiwifyEndpoints.IsValidSignature(body, "", settings));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("wrong-token")]
    public async Task InvalidSignature_IsRejectedWithoutStoringPurchases(string? signingToken)
    {
        await using var fixture = await Fixture.CreateAsync();
        var response = await fixture.PostAsync(Order("order-1", "product-full"), signingToken, sign: signingToken is not null);
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.Empty(await fixture.Db.KirvanoSales.ToListAsync());
        Assert.Empty(await fixture.Db.Users.ToListAsync());
    }

    [Fact]
    public async Task PreviousToken_IsAcceptedDuringRotation()
    {
        await using var fixture = await Fixture.CreateAsync();
        fixture.Options.PreviousWebhookToken = "old-secret";
        Assert.Equal(HttpStatusCode.OK, (await fixture.PostAsync(Order("order-1", "product-full"), "old-secret")).StatusCode);
        Assert.True(AppAccessEvaluator.HasPremiumAccess(await fixture.UserAsync()));
    }

    [Fact]
    public async Task Lifetime_GrantsPremiumAndSendsPasswordSetupEmail()
    {
        await using var fixture = await Fixture.CreateAsync(emailEnabled: true);
        Assert.Equal(HttpStatusCode.OK, (await fixture.PostAsync(Order("order-1", "product-full"))).StatusCode);
        var user = await fixture.UserAsync();
        Assert.Equal("aluno@example.com", user.Email);
        Assert.Equal("Aluno Kiwify", user.Name);
        Assert.True(AppAccessEvaluator.HasPremiumAccess(user));
        Assert.Null(user.KirvanoAccessExpiresAt);
        Assert.Equal("Acesso Vitalicio", user.ToDto().Plan);
        Assert.Equal("kiwify:order:order-1", (await fixture.Db.KirvanoSales.SingleAsync()).SaleId);
        var mail = Assert.Single(fixture.EmailHandler.DeliveredBodies);
        Assert.Contains("pela Kiwify", mail);
        Assert.Contains("/reset-password?token=", mail);
        Assert.Contains("/dashboard", mail);
    }

    [Fact]
    public async Task FirstAccess_Counts21DaysFromBrasiliaApprovalDate_AndDuplicateDoesNotExtend()
    {
        await using var fixture = await Fixture.CreateAsync();
        var payload = Order("order-21", "product-21");
        var approved = DateTime.UtcNow.AddDays(-2);
        payload.ApprovedDate = LocalDate(approved);
        await fixture.PostAsync(payload);
        var expected = DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeToUtc(
            DateTime.ParseExact(payload.ApprovedDate, "yyyy-MM-dd HH:mm", CultureInfo.InvariantCulture), Brasilia)).AddDays(21);
        Assert.Equal(expected, (await fixture.UserAsync()).KirvanoAccessExpiresAt);
        payload.ApprovedDate = LocalDate(DateTime.UtcNow);
        Assert.Equal(HttpStatusCode.OK, (await fixture.PostAsync(payload)).StatusCode);
        Assert.Equal(expected, (await fixture.UserAsync()).KirvanoAccessExpiresAt);
        Assert.Single(await fixture.Db.KirvanoSales.ToListAsync());
    }

    [Fact]
    public async Task LocalDateNearMidnight_UsesBrasiliaTimeZone()
    {
        await using var fixture = await Fixture.CreateAsync();
        var payload = Order("late", "product-21");
        payload.ApprovedDate = "2026-10-05 23:30";
        await fixture.PostAsync(payload);
        Assert.Equal(new DateOnly(2026, 10, 27), (await fixture.UserAsync()).KirvanoAccessExpiresAt);
    }

    [Fact]
    public async Task BookProduct_GrantsBooksAndBonusesWithoutPremium()
    {
        await using var fixture = await Fixture.CreateAsync();
        await fixture.PostAsync(Order("order-book", "product-book"));
        var user = await fixture.UserAsync();
        Assert.False(AppAccessEvaluator.HasPremiumAccess(user));
        var books = await BookEntitlements.PurchasedBookIds(fixture.Db, user.Id).ToListAsync();
        Assert.Equal(3, books.Count);
        Assert.Contains("metodo-judaico-riqueza", books);
    }

    [Fact]
    public async Task Monthly_RenewalsKeepOneSaleAndAdvanceTheAccessPeriod()
    {
        await using var fixture = await Fixture.CreateAsync();
        var now = DateTime.UtcNow;
        await fixture.PostAsync(Subscription("order-1", "order_approved", "paid", now, accessUntil: now.AddMonths(1)));
        Assert.Equal(DateOnly.FromDateTime(now.AddMonths(1)), (await fixture.UserAsync()).KirvanoAccessExpiresAt);

        // Each renewal is a new order of the same subscription; Kiwify sends order_approved and subscription_renewed.
        var renewedAt = now.AddMonths(1).AddMinutes(-5);
        await fixture.PostAsync(Subscription("order-2", "order_approved", "paid", renewedAt, accessUntil: now.AddMonths(2)));
        await fixture.PostAsync(Subscription("order-2", "subscription_renewed", "paid", renewedAt, accessUntil: now.AddMonths(2)));

        var user = await fixture.UserAsync();
        Assert.True(AppAccessEvaluator.HasPremiumAccess(user));
        Assert.Equal(DateOnly.FromDateTime(now.AddMonths(2)), user.KirvanoAccessExpiresAt);
        Assert.Equal("Premium Mensal", user.ToDto().Plan);
        var sale = await fixture.Db.KirvanoSales.SingleAsync();
        Assert.Equal("kiwify:sub:sub-1", sale.SaleId);
    }

    [Fact]
    public async Task Monthly_WithoutSubscriptionDates_CoversOneMonthFromApproval()
    {
        await using var fixture = await Fixture.CreateAsync();
        var payload = Subscription("order-1", "order_approved", "paid", DateTime.UtcNow, accessUntil: null);
        payload.Subscription!.NextPayment = null;
        await fixture.PostAsync(payload);
        var expiry = (await fixture.UserAsync()).KirvanoAccessExpiresAt;
        Assert.NotNull(expiry);
        Assert.InRange(expiry!.Value.DayNumber - DateOnly.FromDateTime(DateTime.UtcNow).DayNumber, 27, 32);
    }

    [Fact]
    public async Task Monthly_LateRenewalAndCancellation_KeepThePaidPeriod()
    {
        await using var fixture = await Fixture.CreateAsync();
        var now = DateTime.UtcNow;
        await fixture.PostAsync(Subscription("order-1", "order_approved", "paid", now, accessUntil: now.AddMonths(1)));
        Assert.Equal("ignored", await fixture.ResultAsync(Subscription("order-2", "subscription_late", "refused", now.AddMinutes(1), accessUntil: now.AddMonths(1))));
        var canceled = Subscription("order-1", "subscription_canceled", "paid", now, accessUntil: now.AddMonths(1));
        canceled.UpdatedAt = LocalDate(now.AddMinutes(2));
        await fixture.PostAsync(canceled);
        var user = await fixture.UserAsync();
        Assert.True(AppAccessEvaluator.HasPremiumAccess(user));
        Assert.Equal("Cancelamento agendado", user.ToDto().PlanStatus);
    }

    [Fact]
    public async Task SubscriptionRefund_RemovesAccess_AndCannotBeReactivated()
    {
        await using var fixture = await Fixture.CreateAsync();
        var now = DateTime.UtcNow;
        var approval = Subscription("order-1", "order_approved", "paid", now, accessUntil: now.AddMonths(1));
        await fixture.PostAsync(approval);
        // Kiwify sends order_refunded and also subscription_canceled with order_status refunded.
        await fixture.PostAsync(Subscription("order-1", "subscription_canceled", "refunded", now, accessUntil: now));
        Assert.False(AppAccessEvaluator.HasPremiumAccess(await fixture.UserAsync()));
        await fixture.PostAsync(Subscription("order-1", "order_refunded", "refunded", now, accessUntil: now));
        await fixture.PostAsync(approval);
        Assert.False(AppAccessEvaluator.HasPremiumAccess(await fixture.UserAsync()));
        Assert.Equal("REFUNDED", (await fixture.Db.KirvanoSales.SingleAsync()).Status);
    }

    [Theory]
    [InlineData("order_refunded", "refunded")]
    [InlineData("chargeback", "chargedback")]
    public async Task Reversal_RemovesOnlyThatOrdersRights(string eventType, string status)
    {
        await using var fixture = await Fixture.CreateAsync();
        await fixture.PostAsync(Order("full", "product-full"));
        await fixture.PostAsync(Order("short", "product-21"));
        await fixture.PostAsync(Order("book", "product-book"));
        await fixture.PostAsync(Order("short", "product-21", eventType, status));
        var user = await fixture.UserAsync();
        Assert.True(AppAccessEvaluator.HasPremiumAccess(user));
        Assert.Null(user.KirvanoAccessExpiresAt);
        await fixture.PostAsync(Order("book", "product-book", eventType, status));
        Assert.Empty(await BookEntitlements.PurchasedBookIds(fixture.Db, user.Id).ToListAsync());
        await fixture.PostAsync(Order("full", "product-full", eventType, status));
        Assert.False(AppAccessEvaluator.HasPremiumAccess(await fixture.UserAsync()));
    }

    [Theory]
    [InlineData("pix_created", "waiting_payment")]
    [InlineData("billet_created", "waiting_payment")]
    [InlineData("order_rejected", "refused")]
    public async Task PendingOrRefusedPayments_NeverGrantAccess(string eventType, string status)
    {
        await using var fixture = await Fixture.CreateAsync();
        Assert.Equal("ignored", await fixture.ResultAsync(Order("pending", "product-full", eventType, status)));
        Assert.Empty(await fixture.Db.Users.ToListAsync());
    }

    [Fact]
    public async Task ApprovalWithoutPaidStatus_IsRejected()
    {
        await using var fixture = await Fixture.CreateAsync();
        Assert.Equal(HttpStatusCode.BadRequest, (await fixture.PostAsync(Order("weird", "product-full", "order_approved", "waiting_payment"))).StatusCode);
        Assert.Empty(await fixture.Db.Users.ToListAsync());
    }

    [Fact]
    public async Task UnknownProduct_IsIgnored()
    {
        await using var fixture = await Fixture.CreateAsync();
        Assert.Equal("ignored", await fixture.ResultAsync(Order("other", "another-product")));
        Assert.Equal("ignored", await fixture.ResultAsync(Order("other", "another-product", "order_refunded", "refunded")));
        Assert.Empty(await fixture.Db.Users.ToListAsync());
        Assert.Empty(await fixture.Db.KirvanoSales.ToListAsync());
    }

    [Fact]
    public async Task PlanSpecificBinding_WinsOverTheProductWideOne()
    {
        await using var fixture = await Fixture.CreateAsync();
        fixture.Options.Products.Add(new() { ProductId = "product-club", AccessPlan = "vitalicio" });
        fixture.Options.Products.Add(new() { ProductId = "product-club", PlanId = "plan-monthly", AccessPlan = "mensal" });
        var now = DateTime.UtcNow;
        var payload = Subscription("order-1", "order_approved", "paid", now, accessUntil: now.AddMonths(1));
        payload.Product!.ProductId = "product-club";
        payload.Subscription!.Plan!.Id = "plan-monthly";
        await fixture.PostAsync(payload);
        Assert.Equal("Premium Mensal", (await fixture.UserAsync()).ToDto().Plan);
    }

    [Fact]
    public async Task MonthlyProductPaidOnce_IsRejectedInsteadOfGrantingAccess()
    {
        await using var fixture = await Fixture.CreateAsync();
        Assert.Equal(HttpStatusCode.BadRequest, (await fixture.PostAsync(Order("one-time", "product-monthly"))).StatusCode);
        Assert.Empty(await fixture.Db.Users.ToListAsync());
    }

    private static string LocalDate(DateTime utc) =>
        TimeZoneInfo.ConvertTimeFromUtc(DateTime.SpecifyKind(utc, DateTimeKind.Utc), Brasilia).ToString("yyyy-MM-dd HH:mm", CultureInfo.InvariantCulture);

    private static KiwifyWebhookPayload Order(string orderId, string productId,
        string eventType = "order_approved", string status = "paid") => new()
    {
        OrderId = orderId, OrderStatus = status, WebhookEventType = eventType,
        CreatedAt = LocalDate(DateTime.UtcNow), UpdatedAt = LocalDate(DateTime.UtcNow),
        ApprovedDate = status == "paid" ? LocalDate(DateTime.UtcNow) : null,
        Product = new KiwifyProduct { ProductId = productId, ProductName = "Produto" },
        Customer = new KiwifyCustomer { Email = " Aluno@Example.com ", FullName = "Aluno Kiwify", FirstName = "Aluno" },
    };

    private static KiwifyWebhookPayload Subscription(string orderId, string eventType, string status,
        DateTime approvedUtc, DateTime? accessUntil)
    {
        var payload = Order(orderId, "product-monthly", eventType, status);
        payload.ApprovedDate = status == "paid" ? LocalDate(approvedUtc) : null;
        payload.UpdatedAt = LocalDate(approvedUtc);
        payload.SubscriptionId = "sub-1";
        payload.Subscription = new KiwifySubscription
        {
            Id = "sub-1", Status = status == "paid" ? "active" : "waiting_payment",
            NextPayment = accessUntil?.ToString("yyyy-MM-ddTHH:mm:ss.fffZ", CultureInfo.InvariantCulture),
            CustomerAccess = accessUntil is null ? null : new KiwifyCustomerAccess
            {
                HasAccess = status == "paid",
                AccessUntil = accessUntil.Value.ToString("yyyy-MM-ddTHH:mm:ss.fffZ", CultureInfo.InvariantCulture)
            },
            Plan = new KiwifyPlan { Id = "plan-1", Name = "Mensal", Frequency = "monthly" },
        };
        return payload;
    }

    private sealed class EmailHandler : HttpMessageHandler
    {
        public List<string> DeliveredBodies { get; } = [];
        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            DeliveredBodies.Add(await request.Content!.ReadAsStringAsync(cancellationToken));
            return new(HttpStatusCode.OK) { Content = new StringContent("{\"id\":\"email-id\"}") };
        }
    }

    private sealed class Fixture(WebApplication app, SqliteConnection connection, AppDbContext db, EmailHandler emailHandler) : IAsyncDisposable
    {
        public AppDbContext Db { get; } = db;
        public EmailHandler EmailHandler { get; } = emailHandler;
        public HttpClient Client { get; } = app.GetTestClient();
        public KiwifyOptions Options { get; } = app.Services.GetRequiredService<IOptions<KiwifyOptions>>().Value;

        public static async Task<Fixture> CreateAsync(bool emailEnabled = false)
        {
            var connection = new SqliteConnection("Data Source=:memory:");
            await connection.OpenAsync();
            var builder = WebApplication.CreateBuilder();
            builder.WebHost.UseTestServer();
            builder.Services.AddDbContext<AppDbContext>(options => options.UseSqlite(connection)
                .ReplaceService<IModelCustomizer, KirvanoWebhookTests.SqliteTestModelCustomizer>());
            builder.Services.AddAuthentication(AppSessionAuthenticationHandler.SchemeName)
                .AddScheme<AuthenticationSchemeOptions, AppSessionAuthenticationHandler>(AppSessionAuthenticationHandler.SchemeName, _ => { });
            builder.Services.AddAuthorization();
            builder.Services.Configure<KiwifyOptions>(options =>
            {
                options.Enabled = true;
                options.WebhookToken = Token;
                options.FrontendBaseUrl = "https://app.example.com";
                options.Products = [
                    new() { ProductId = "product-21", AccessPlan = "primeiro-acesso" },
                    new() { ProductId = "product-full", AccessPlan = "vitalicio" },
                    new() { ProductId = "product-monthly", AccessPlan = "mensal" },
                    new() { ProductId = "product-book", BookIds = ["metodo-judaico-riqueza"] }
                ];
            });
            builder.Services.Configure<ResendOptions>(options => { options.Enabled = emailEnabled; options.ApiKey = "test"; options.From = "test@example.com"; });
            builder.Services.Configure<CheckoutRecoveryOptions>(_ => { });
            builder.Services.Configure<StripeBillingOptions>(_ => { });
            var handler = new EmailHandler();
            builder.Services.AddHttpClient("Resend", client => client.BaseAddress = new Uri("https://api.resend.com/"))
                .ConfigurePrimaryHttpMessageHandler(() => handler);
            builder.Services.AddSingleton<PasswordHashService>();
            builder.Services.AddSingleton<SessionTokenService>();
            builder.Services.AddScoped<AccessEmailService>();
            builder.Services.AddScoped<ExternalSaleProcessor>();
            builder.Services.AddScoped<KiwifyWebhookProcessor>();
            var app = builder.Build();
            app.UseAuthentication();
            app.UseAuthorization();
            app.MapKiwifyEndpoints();
            await app.StartAsync();
            var db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>().UseSqlite(connection)
                .ReplaceService<IModelCustomizer, KirvanoWebhookTests.SqliteTestModelCustomizer>().Options);
            await db.Database.EnsureCreatedAsync();
            return new Fixture(app, connection, db, handler);
        }

        /// <summary>Posts the payload signed like Kiwify does: ?signature=HMAC-SHA1(raw body, token).</summary>
        public Task<HttpResponseMessage> PostAsync(KiwifyWebhookPayload payload, string? signingToken = Token, bool sign = true)
        {
            var body = JsonSerializer.SerializeToUtf8Bytes(payload);
            var url = "/api/payments/webhooks/kiwify";
            if (sign)
                url += "?signature=" + Convert.ToHexStringLower(HMACSHA1.HashData(Encoding.UTF8.GetBytes(signingToken!), body));
            var content = new ByteArrayContent(body);
            content.Headers.ContentType = new("application/json");
            return Client.PostAsync(url, content);
        }

        public async Task<string> ResultAsync(KiwifyWebhookPayload payload)
        {
            var response = await PostAsync(payload);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
            return json.RootElement.GetProperty("result").GetString()!;
        }

        public async Task<AppUser> UserAsync()
        {
            Db.ChangeTracker.Clear();
            return await Db.Users.SingleAsync();
        }

        public async ValueTask DisposeAsync()
        {
            Client.Dispose();
            await Db.DisposeAsync();
            await app.DisposeAsync();
            await connection.DisposeAsync();
        }
    }
}

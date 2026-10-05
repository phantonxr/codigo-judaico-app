using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Net.Http.Headers;
using CodigoJudaico.Api.Contracts;
using CodigoJudaico.Api.Data;
using CodigoJudaico.Api.Endpoints;
using CodigoJudaico.Api.Models;
using CodigoJudaico.Api.Services;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace CodigoJudaico.Api.Tests;

public sealed class KirvanoWebhookTests
{
    [Fact]
    public async Task BookBuyer_CanSetPasswordLoginAndDownload_RefundBlocksDownload()
    {
        await using var fixture = await Fixture.CreateAsync(emailEnabled: true);
        await fixture.PostAsync(Sale("books", "offer-book"));
        using var mail = JsonDocument.Parse(Assert.Single(fixture.EmailHandler.DeliveredBodies));
        var text = mail.RootElement.GetProperty("text").GetString()!;
        var setupUrl = text.Split('\n').Single(x => x.Contains("/reset-password?token="));
        var token = new Uri(setupUrl.Trim()).Query["?token=".Length..];
        var reset = await fixture.Client.PostAsJsonAsync("/api/auth/reset-password", new { token, newPassword = "safe-password-123" });
        Assert.Equal(HttpStatusCode.OK, reset.StatusCode);
        var user = await fixture.UserAsync();
        // An unrelated pending app checkout must not prevent a paying book buyer from signing in.
        user.PlanStatus = "Checkout pendente";
        await fixture.Db.SaveChangesAsync();
        var login = await fixture.Client.PostAsJsonAsync("/api/auth/login", new { email = user.Email, password = "safe-password-123" });
        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
        using var session = JsonDocument.Parse(await login.Content.ReadAsStringAsync());
        fixture.Client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", session.RootElement.GetProperty("token").GetString());
        Assert.Equal(HttpStatusCode.OK, (await fixture.Client.GetAsync("/api/books")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await fixture.Client.GetAsync("/api/books/metodo-judaico-riqueza/download")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await fixture.Client.GetAsync("/test/premium")).StatusCode);
        await fixture.PostAsync(Sale("books", "offer-book", "SALE_REFUNDED", "REFUNDED"));
        Assert.Equal(HttpStatusCode.Forbidden, (await fixture.Client.GetAsync("/api/books/metodo-judaico-riqueza/download")).StatusCode);
    }

    [Fact]
    public async Task PremiumBuyer_AdminCountsAndFiltersIncludeKirvanoAccess()
    {
        await using var fixture = await Fixture.CreateAsync();
        await fixture.PostAsync(Sale("full", "offer-full"));
        var user = await fixture.UserAsync();
        Assert.True(AppAccessEvaluator.HasPremiumAccess(user));
        Assert.Equal(1, await fixture.Db.Users.Where(AppAccessEvaluator.ActiveAccessPredicate(DateOnly.FromDateTime(DateTime.UtcNow))).CountAsync());
    }

    [Fact]
    public async Task FirstAccess_Grants21DaysFromPaymentAndDoesNotExtendOnDuplicate()
    {
        await using var fixture = await Fixture.CreateAsync();
        var payload = Sale("sale-21", "offer-21");
        Assert.Equal(HttpStatusCode.OK, (await fixture.PostAsync(payload)).StatusCode);
        var first = await fixture.UserAsync();
        Assert.True(AppAccessEvaluator.HasPremiumAccess(first));
        Assert.Equal(DateOnly.FromDateTime(DateTime.UtcNow).AddDays(21), first.KirvanoAccessExpiresAt);
        var passwordHash = first.PasswordHash;
        Assert.Equal(HttpStatusCode.OK, (await fixture.PostAsync(payload)).StatusCode);
        var duplicate = await fixture.UserAsync();
        Assert.Equal(first.KirvanoAccessExpiresAt, duplicate.KirvanoAccessExpiresAt);
        Assert.Equal(passwordHash, duplicate.PasswordHash);
        Assert.Single(await fixture.Db.KirvanoSales.ToListAsync());
        Assert.False(duplicate.AccessEnabled); // Stripe entitlement stays independent.
        Assert.Equal("Primeiro Acesso", duplicate.ToDto().Plan);
    }

    [Fact]
    public async Task Lifetime_IsNotShortenedByAnotherPurchaseOrItsRefund()
    {
        await using var fixture = await Fixture.CreateAsync();
        await fixture.PostAsync(Sale("full", "offer-full"));
        await fixture.PostAsync(Sale("short", "offer-21"));
        await fixture.PostAsync(Sale("short", "offer-21", "SALE_REFUNDED", "REFUNDED"));
        var user = await fixture.UserAsync();
        Assert.True(AppAccessEvaluator.HasPremiumAccess(user));
        Assert.Null(user.KirvanoAccessExpiresAt);
        Assert.Equal("Acesso Vitalicio", user.ToDto().Plan);
    }

    [Fact]
    public async Task BookOnly_GrantsPurchasedBooksAndBonusesWithoutPremium()
    {
        await using var fixture = await Fixture.CreateAsync();
        await fixture.PostAsync(Sale("books", "offer-book"));
        var user = await fixture.UserAsync();
        Assert.False(AppAccessEvaluator.HasPremiumAccess(user));
        Assert.False(string.IsNullOrEmpty(user.PasswordHash));
        var books = await BookEntitlements.PurchasedBookIds(fixture.Db, user.Id).ToListAsync();
        Assert.Equal(3, books.Count);
        Assert.Contains("metodo-judaico-riqueza", books);
        Assert.Contains("7-gatilhos-dinheiro-desaparecer", books);
        Assert.Contains("7-gatilhos-dinheiro-escapar", books);
    }

    [Fact]
    public async Task OrderBump_GrantsAccessAndSeparateBookInOneSale()
    {
        await using var fixture = await Fixture.CreateAsync();
        var payload = Sale("combo", "offer-21");
        payload.Products.Add(new KirvanoProduct { Id = "product", OfferId = "offer-book", IsOrderBump = true });
        await fixture.PostAsync(payload);
        var user = await fixture.UserAsync();
        Assert.True(AppAccessEvaluator.HasPremiumAccess(user));
        Assert.Equal(3, await BookEntitlements.PurchasedBookIds(fixture.Db, user.Id).CountAsync());
    }

    [Theory]
    [InlineData("SALE_REFUNDED", "REFUNDED")]
    [InlineData("SALE_CHARGEBACK", "CHARGEBACK")]
    public async Task Reversal_RemovesOnlyThatSalesBooksAndAccess(string eventName, string status)
    {
        await using var fixture = await Fixture.CreateAsync();
        await fixture.PostAsync(Sale("books-1", "offer-book"));
        await fixture.PostAsync(Sale("books-2", "offer-book"));
        await fixture.PostAsync(Sale("access", "offer-21"));
        await fixture.PostAsync(Sale("books-1", "offer-book", eventName, status));
        var user = await fixture.UserAsync();
        Assert.Equal(3, await BookEntitlements.PurchasedBookIds(fixture.Db, user.Id).CountAsync());
        Assert.True(AppAccessEvaluator.HasPremiumAccess(user));
        await fixture.PostAsync(Sale("books-2", "offer-book", eventName, status));
        Assert.Empty(await BookEntitlements.PurchasedBookIds(fixture.Db, user.Id).ToListAsync());
        await fixture.PostAsync(Sale("access", "offer-21", eventName, status));
        Assert.False(AppAccessEvaluator.HasPremiumAccess(await fixture.UserAsync()));
    }

    [Fact]
    public async Task RefundBeforeApproval_DoesNotCreateUserOrGrantLateApproval()
    {
        await using var fixture = await Fixture.CreateAsync();
        await fixture.PostAsync(Sale("reversed", "offer-21", "SALE_REFUNDED", "REFUNDED"));
        await fixture.PostAsync(Sale("reversed", "offer-21"));
        Assert.Empty(await fixture.Db.Users.ToListAsync());
        Assert.Equal("REFUNDED", (await fixture.Db.KirvanoSales.SingleAsync()).Status);
    }

    [Fact]
    public async Task Refund_DoesNotRemoveStripeAccessOrStripeBooks()
    {
        await using var fixture = await Fixture.CreateAsync();
        var user = new AppUser { Id = Guid.NewGuid(), Email = "aluno@example.com", Name = "Aluno",
            AccessEnabled = true, PlanName = "Premium Mensal", PlanStatus = "Ativo",
            NextChargeDate = DateOnly.FromDateTime(DateTime.UtcNow).AddMonths(1),
            PasswordHash = "existing-hash", CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow };
        fixture.Db.Users.Add(user);
        fixture.Db.UserBookPurchases.Add(new UserBookPurchase { Id = Guid.NewGuid(), UserId = user.Id,
            BookId = "metodo-judaico-riqueza", StripeSessionId = "cs_stripe", PurchasedAt = DateTimeOffset.UtcNow });
        await fixture.Db.SaveChangesAsync();
        await fixture.PostAsync(Sale("combo", "offer-full"));
        await fixture.PostAsync(Sale("combo", "offer-full", "SALE_REFUNDED", "REFUNDED"));
        var result = await fixture.UserAsync();
        Assert.True(AppAccessEvaluator.HasPremiumAccess(result));
        Assert.Equal("Premium Mensal", result.ToDto().Plan);
        Assert.Contains("metodo-judaico-riqueza", await BookEntitlements.PurchasedBookIds(fixture.Db, user.Id).ToListAsync());
        Assert.Equal("existing-hash", result.PasswordHash);
    }

    [Fact]
    public async Task Monthly_RenewsSameSaleWithoutAllowingStaleExpiryToOverrideRenewal()
    {
        await using var fixture = await Fixture.CreateAsync();
        var now = DateTimeOffset.UtcNow;
        var payload = Sale("monthly", "offer-monthly");
        payload.Type = "RECURRING";
        payload.Plan = new KirvanoPlan { ChargeFrequency = "MONTHLY", NextChargeDate = now.AddMonths(1).ToString("O") };
        await fixture.PostAsync(payload);
        payload.Event = "SUBSCRIPTION_RENEWED";
        payload.CreatedAt = now.AddDays(1).ToString("O");
        payload.Plan.NextChargeDate = now.AddMonths(2).ToString("O");
        await fixture.PostAsync(payload);
        payload.Event = "SUBSCRIPTION_EXPIRED";
        payload.Status = "PENDING";
        payload.CreatedAt = now.ToString("O");
        await fixture.PostAsync(payload);
        var user = await fixture.UserAsync();
        Assert.True(AppAccessEvaluator.HasPremiumAccess(user));
        Assert.Equal(DateOnly.FromDateTime(now.AddMonths(2).UtcDateTime), user.KirvanoAccessExpiresAt);
        Assert.Single(await fixture.Db.KirvanoSales.ToListAsync());
    }

    [Fact]
    public async Task MonthlyCancellation_KeepsPaidPeriodAndBooks_ExpiryRemovesOnlyPremium()
    {
        await using var fixture = await Fixture.CreateAsync();
        var payload = Sale("monthly", "offer-monthly");
        payload.Type = "RECURRING";
        payload.Plan = new KirvanoPlan { ChargeFrequency = "MONTHLY", NextChargeDate = DateTimeOffset.UtcNow.AddMonths(1).ToString("O") };
        payload.Products.Add(new KirvanoProduct { Id = "product", OfferId = "offer-book", IsOrderBump = true });
        await fixture.PostAsync(payload);
        payload.Event = "SUBSCRIPTION_CANCELED";
        payload.Status = "CANCELED";
        await fixture.PostAsync(payload);
        Assert.True(AppAccessEvaluator.HasPremiumAccess(await fixture.UserAsync()));
        payload.Event = "SUBSCRIPTION_EXPIRED";
        payload.Status = "PENDING";
        payload.CreatedAt = DateTimeOffset.UtcNow.AddSeconds(1).ToString("O");
        await fixture.PostAsync(payload);
        var user = await fixture.UserAsync();
        Assert.False(AppAccessEvaluator.HasPremiumAccess(user));
        Assert.Equal(3, await BookEntitlements.PurchasedBookIds(fixture.Db, user.Id).CountAsync());
    }

    [Fact]
    public async Task MonthlyWithoutNextChargeDate_IsRejectedInsteadOfGrantingLifetime()
    {
        await using var fixture = await Fixture.CreateAsync();
        var payload = Sale("monthly", "offer-monthly");
        payload.Type = "RECURRING";
        Assert.Equal(HttpStatusCode.BadRequest, (await fixture.PostAsync(payload)).StatusCode);
        Assert.Empty(await fixture.Db.Users.ToListAsync());
    }

    [Theory]
    [InlineData("PIX_GENERATED", "PENDING")]
    [InlineData("SALE_REFUSED", "REFUSED")]
    [InlineData("ABANDONED_CART", "ABANDONED_CART")]
    public async Task PendingAndUnknownEvents_NeverGrantAccess(string eventName, string status)
    {
        await using var fixture = await Fixture.CreateAsync();
        Assert.Equal(HttpStatusCode.OK, (await fixture.PostAsync(Sale("pending", "offer-21", eventName, status))).StatusCode);
        Assert.Empty(await fixture.Db.Users.ToListAsync());
    }

    [Fact]
    public async Task UnknownOfferOrWrongProduct_DoesNotGrantAccess()
    {
        await using var fixture = await Fixture.CreateAsync();
        await fixture.PostAsync(Sale("unknown", "unknown-offer"));
        var payload = Sale("wrong-product", "offer-full");
        payload.Products[0].Id = "another-product";
        await fixture.PostAsync(payload);
        Assert.Empty(await fixture.Db.Users.ToListAsync());
    }

    [Theory]
    [InlineData(null)]
    [InlineData("wrong-token")]
    public async Task InvalidToken_IsRejectedWithoutStoringPurchases(string? token)
    {
        await using var fixture = await Fixture.CreateAsync();
        Assert.Equal(HttpStatusCode.Unauthorized, (await fixture.PostAsync(Sale("fake", "offer-full"), token)).StatusCode);
        Assert.Empty(await fixture.Db.KirvanoSales.ToListAsync());
    }

    [Fact]
    public async Task MalformedJson_IsRejected()
    {
        await using var fixture = await Fixture.CreateAsync();
        var response = await fixture.Client.PostAsync("/api/payments/webhooks/kirvano?token=test-secret",
            new StringContent("{broken", Encoding.UTF8, "application/json"));
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task FailedEmail_PreservesPurchaseAndRetryDeliversPasswordSetupOnce()
    {
        await using var fixture = await Fixture.CreateAsync(emailEnabled: true);
        fixture.EmailHandler.Fail = true;
        var payload = Sale("notify", "offer-book");
        Assert.Equal(HttpStatusCode.ServiceUnavailable, (await fixture.PostAsync(payload)).StatusCode);
        var user = await fixture.UserAsync();
        Assert.Equal(3, await BookEntitlements.PurchasedBookIds(fixture.Db, user.Id).CountAsync());
        fixture.EmailHandler.Fail = false;
        Assert.Equal(HttpStatusCode.OK, (await fixture.PostAsync(payload)).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await fixture.PostAsync(payload)).StatusCode);
        Assert.Single(fixture.EmailHandler.DeliveredBodies);
        Assert.Contains("/reset-password?token=", fixture.EmailHandler.DeliveredBodies[0]);
        Assert.Contains("/livros", fixture.EmailHandler.DeliveredBodies[0]);
        Assert.NotNull((await fixture.Db.KirvanoSales.SingleAsync()).EmailSentAt);
    }

    [Fact]
    public async Task DelayedRefund_IsTerminalEvenAfterNewerCancellation()
    {
        await using var fixture = await Fixture.CreateAsync();
        var payload = Sale("monthly", "offer-monthly");
        payload.Type = "RECURRING";
        payload.Plan = new KirvanoPlan { ChargeFrequency = "MONTHLY", NextChargeDate = DateTimeOffset.UtcNow.AddMonths(1).ToString("O") };
        payload.Products.Add(new KirvanoProduct { Id = "product", OfferId = "offer-book" });
        await fixture.PostAsync(payload);
        var refundAt = payload.CreatedAt;
        payload.Event = "SUBSCRIPTION_CANCELED";
        payload.Status = "CANCELED";
        payload.CreatedAt = DateTimeOffset.UtcNow.AddHours(1).ToString("O");
        await fixture.PostAsync(payload);
        payload.Event = "SALE_REFUNDED";
        payload.Status = "REFUNDED";
        payload.CreatedAt = refundAt;
        await fixture.PostAsync(payload);
        var user = await fixture.UserAsync();
        Assert.False(AppAccessEvaluator.HasPremiumAccess(user));
        Assert.Empty(await BookEntitlements.PurchasedBookIds(fixture.Db, user.Id).ToListAsync());
    }

    [Fact]
    public async Task StaleApprovalRetry_StillDeliversPendingEmailAfterCancellation()
    {
        await using var fixture = await Fixture.CreateAsync(emailEnabled: true);
        var payload = Sale("monthly", "offer-monthly");
        payload.Type = "RECURRING";
        payload.Plan = new KirvanoPlan { ChargeFrequency = "MONTHLY", NextChargeDate = DateTimeOffset.UtcNow.AddMonths(1).ToString("O") };
        fixture.EmailHandler.Fail = true;
        Assert.Equal(HttpStatusCode.ServiceUnavailable, (await fixture.PostAsync(payload)).StatusCode);
        var approvedAt = payload.CreatedAt;
        payload.Event = "SUBSCRIPTION_CANCELED";
        payload.Status = "CANCELED";
        payload.CreatedAt = DateTimeOffset.UtcNow.AddHours(1).ToString("O");
        await fixture.PostAsync(payload);
        payload.Event = "SALE_APPROVED";
        payload.Status = "APPROVED";
        payload.CreatedAt = approvedAt;
        fixture.EmailHandler.Fail = false;
        Assert.Equal(HttpStatusCode.OK, (await fixture.PostAsync(payload)).StatusCode);
        Assert.Single(fixture.EmailHandler.DeliveredBodies);
        Assert.Equal("CANCELED", (await fixture.Db.KirvanoSales.AsNoTracking().SingleAsync()).Status);
    }

    [Fact]
    public async Task Renewal_DoesNotAddBooksFromLaterConfigurationChanges()
    {
        await using var fixture = await Fixture.CreateAsync();
        var payload = Sale("monthly", "offer-monthly");
        payload.Type = "RECURRING";
        payload.Plan = new KirvanoPlan { ChargeFrequency = "MONTHLY", NextChargeDate = DateTimeOffset.UtcNow.AddMonths(1).ToString("O") };
        await fixture.PostAsync(payload);
        fixture.Options.Offers.Single(x => x.OfferId == "offer-monthly").BookIds = ["identidade-nome-dinheiro"];
        payload.Event = "SUBSCRIPTION_RENEWED";
        payload.CreatedAt = DateTimeOffset.UtcNow.AddDays(1).ToString("O");
        payload.Plan.NextChargeDate = DateTimeOffset.UtcNow.AddMonths(2).ToString("O");
        await fixture.PostAsync(payload);
        var user = await fixture.UserAsync();
        Assert.Empty(await BookEntitlements.PurchasedBookIds(fixture.Db, user.Id).ToListAsync());
    }

    [Fact]
    public async Task ExistingSale_CannotBeChangedFromBookPurchaseToMonthlyAccess()
    {
        await using var fixture = await Fixture.CreateAsync();
        await fixture.PostAsync(Sale("books", "offer-book"));
        var payload = Sale("books", "offer-monthly");
        payload.Type = "RECURRING";
        payload.Plan = new KirvanoPlan { ChargeFrequency = "MONTHLY", NextChargeDate = DateTimeOffset.UtcNow.AddMonths(1).ToString("O") };
        Assert.Equal(HttpStatusCode.BadRequest, (await fixture.PostAsync(payload)).StatusCode);
        Assert.False(AppAccessEvaluator.HasPremiumAccess(await fixture.UserAsync()));
    }

    [Fact]
    public async Task OldOneTimePayment_DoesNotRestart21DaysWhenDeliveredLate()
    {
        await using var fixture = await Fixture.CreateAsync();
        var payload = Sale("old", "offer-21");
        payload.CreatedAt = DateTimeOffset.UtcNow.AddDays(-30).ToString("O");
        await fixture.PostAsync(payload);
        var user = await fixture.UserAsync();
        Assert.False(AppAccessEvaluator.HasPremiumAccess(user));
        Assert.Equal("Expirado", user.ToDto().PlanStatus);
    }

    [Fact]
    public async Task SameSaleForAnotherBuyer_IsRejected()
    {
        await using var fixture = await Fixture.CreateAsync();
        await fixture.PostAsync(Sale("same", "offer-21"));
        var payload = Sale("same", "offer-21");
        payload.Customer!.Email = "another@example.com";
        Assert.Equal(HttpStatusCode.BadRequest, (await fixture.PostAsync(payload)).StatusCode);
        Assert.Single(await fixture.Db.Users.ToListAsync());
    }

    [Fact]
    public async Task AccountDeletion_ClearsKirvanoRightsAndPreventsLaterEventsFromRestoringThem()
    {
        await using var fixture = await Fixture.CreateAsync();
        await fixture.PostAsync(Sale("full", "offer-full"));
        await fixture.PostAsync(Sale("books", "offer-book"));
        var user = await fixture.UserAsync();
        var tokens = new SessionTokenService();
        var rawToken = tokens.GenerateToken();
        fixture.Db.AppSessions.Add(new AppSession { Id = Guid.NewGuid(), UserId = user.Id, TokenHash = tokens.HashToken(rawToken),
            CreatedAt = DateTimeOffset.UtcNow, ExpiresAt = DateTimeOffset.UtcNow.AddDays(1) });
        await fixture.Db.SaveChangesAsync();
        fixture.Client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", rawToken);
        var deleted = await fixture.Client.PostAsJsonAsync($"/api/users/{user.Id}/privacy/account-deletion", new { email = user.Email });
        Assert.Equal(HttpStatusCode.NoContent, deleted.StatusCode);
        var anonymized = await fixture.UserAsync();
        Assert.False(AppAccessEvaluator.HasPremiumAccess(anonymized));
        Assert.Empty(await BookEntitlements.PurchasedBookIds(fixture.Db, user.Id).ToListAsync());
        await fixture.PostAsync(Sale("full", "offer-full", "SALE_REFUNDED", "REFUNDED"));
        await fixture.PostAsync(Sale("books", "offer-book"));
        Assert.False(AppAccessEvaluator.HasPremiumAccess(await fixture.UserAsync()));
        Assert.Equal(0, await fixture.Db.Users.Where(AppAccessEvaluator.ActiveAccessPredicate(DateOnly.FromDateTime(DateTime.UtcNow))).CountAsync());
        Assert.Equal(2, await fixture.Db.KirvanoSales.CountAsync());
    }

    [Fact]
    public async Task LocalKirvanoTimestamp_UsesConfiguredTimeZone()
    {
        await using var fixture = await Fixture.CreateAsync();
        var payload = Sale("local-date", "offer-21");
        payload.CreatedAt = "2026-10-05 23:30:00";
        await fixture.PostAsync(payload);
        Assert.Equal(new DateOnly(2026, 10, 27), (await fixture.UserAsync()).KirvanoAccessExpiresAt);
    }

    private static KirvanoWebhookPayload Sale(string saleId, string offerId, string eventName = "SALE_APPROVED", string status = "APPROVED") => new()
    {
        Event = eventName, Status = status, SaleId = saleId, CheckoutId = "checkout", Type = "ONE_TIME",
        CreatedAt = DateTimeOffset.UtcNow.ToString("O"),
        Customer = new KirvanoCustomer { Email = " Aluno@Example.com ", Name = "Aluno" },
        Products = [new KirvanoProduct { Id = "product", OfferId = offerId }]
    };

    private sealed class EmailHandler : HttpMessageHandler
    {
        public bool Fail { get; set; }
        public List<string> DeliveredBodies { get; } = [];
        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            if (Fail) return new(HttpStatusCode.ServiceUnavailable);
            DeliveredBodies.Add(await request.Content!.ReadAsStringAsync(cancellationToken));
            return new(HttpStatusCode.OK) { Content = new StringContent("{\"id\":\"email-id\"}") };
        }
    }

    private sealed class Fixture(WebApplication app, SqliteConnection connection, AppDbContext db, EmailHandler emailHandler) : IAsyncDisposable
    {
        public AppDbContext Db { get; } = db;
        public EmailHandler EmailHandler { get; } = emailHandler;
        public HttpClient Client { get; } = app.GetTestClient();
        public KirvanoOptions Options { get; } = app.Services.GetRequiredService<IOptions<KirvanoOptions>>().Value;
        public string PdfDirectory { get; } = Path.Combine(Path.GetTempPath(), "kirvano-tests-" + Guid.NewGuid());
        public static async Task<Fixture> CreateAsync(bool emailEnabled = false)
        {
            var connection = new SqliteConnection("Data Source=:memory:");
            await connection.OpenAsync();
            var builder = WebApplication.CreateBuilder();
            builder.WebHost.UseTestServer();
            builder.Services.AddDbContext<AppDbContext>(options => options.UseSqlite(connection).ReplaceService<IModelCustomizer, SqliteTestModelCustomizer>());
            builder.Services.AddAuthentication(AppSessionAuthenticationHandler.SchemeName)
                .AddScheme<AuthenticationSchemeOptions, AppSessionAuthenticationHandler>(AppSessionAuthenticationHandler.SchemeName, _ => { });
            builder.Services.AddAuthorization();
            builder.Services.Configure<KirvanoOptions>(options =>
            {
                options.Enabled = true;
                options.WebhookToken = "test-secret";
                options.FrontendBaseUrl = "https://app.example.com";
                options.Offers = [
                    new() { ProductId = "product", OfferId = "offer-21", AccessPlan = "primeiro-acesso" },
                    new() { ProductId = "product", OfferId = "offer-full", AccessPlan = "vitalicio" },
                    new() { ProductId = "product", OfferId = "offer-monthly", AccessPlan = "mensal" },
                    new() { ProductId = "product", OfferId = "offer-book", BookIds = ["metodo-judaico-riqueza"] }
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
            builder.Services.AddScoped<KirvanoWebhookProcessor>();
            builder.Services.AddScoped<StripeBillingService>();
            builder.Services.AddScoped<StripeWebhookProcessor>();
            builder.Services.AddScoped<UtmfyService>();
            builder.Services.AddScoped<MetaConversionsService>();
            builder.Services.AddScoped<EvolutionApiService>();
            builder.Services.AddScoped<CheckoutRecoveryService>();
            builder.Services.AddScoped<RequirePremiumAccessEndpointFilter>();
            var app = builder.Build();
            app.UseAuthentication();
            app.UseAuthorization();
            app.MapKirvanoEndpoints();
            app.MapBookEndpoints();
            app.MapSessionEndpoints();
            app.MapUserStateEndpoints();
            app.MapGet("/test/premium", () => "premium").RequireAuthorization().AddEndpointFilter<RequirePremiumAccessEndpointFilter>();
            await app.StartAsync();
            var db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>().UseSqlite(connection).ReplaceService<IModelCustomizer, SqliteTestModelCustomizer>().Options);
            await db.Database.EnsureCreatedAsync();
            var fixture = new Fixture(app, connection, db, handler);
            Directory.CreateDirectory(fixture.PdfDirectory);
            await File.WriteAllTextAsync(Path.Combine(fixture.PdfDirectory, "metodo-judaico-riqueza.pdf"), "%PDF-1.4 test");
            app.Services.GetRequiredService<IOptions<StripeBillingOptions>>().Value.BooksPdfPath = fixture.PdfDirectory;
            return fixture;
        }
        public Task<HttpResponseMessage> PostAsync(KirvanoWebhookPayload payload, string? token = "test-secret") =>
            Client.PostAsJsonAsync("/api/payments/webhooks/kirvano" + (token is null ? "" : "?token=" + token), payload);
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
            Directory.Delete(PdfDirectory, recursive: true);
        }
    }

    public sealed class SqliteTestModelCustomizer(ModelCustomizerDependencies dependencies) : ModelCustomizer(dependencies)
    {
        public override void Customize(Microsoft.EntityFrameworkCore.ModelBuilder modelBuilder, DbContext context)
        {
            base.Customize(modelBuilder, context);
            // SQLite lacks native DateTimeOffset sorting; represent instants as UTC ticks in this test database.
            foreach (var entity in modelBuilder.Model.GetEntityTypes())
                foreach (var property in entity.GetProperties())
                    if (property.ClrType == typeof(DateTimeOffset) || property.ClrType == typeof(DateTimeOffset?))
                        property.SetValueConverter(new ValueConverter<DateTimeOffset, long>(value => value.UtcTicks, value => new DateTimeOffset(value, TimeSpan.Zero)));
        }
    }
}

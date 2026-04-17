using CodigoJudaico.Api.Data;
using CodigoJudaico.Api.Endpoints;
using CodigoJudaico.Api.Services;
using Microsoft.AspNetCore.Authentication;
using Microsoft.EntityFrameworkCore;
using System.Net.Http.Headers;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();
builder.Services.AddProblemDetails();
builder.Services.AddHealthChecks();
builder.Services.AddAuthentication(AppSessionAuthenticationHandler.SchemeName)
    .AddScheme<AuthenticationSchemeOptions, AppSessionAuthenticationHandler>(
        AppSessionAuthenticationHandler.SchemeName,
        _ => { });
builder.Services.AddAuthorization();

builder.Services.AddDbContext<AppDbContext>(options =>
{
    options.UseNpgsql(builder.Configuration.GetConnectionString("Postgres"));
});
builder.Services.Configure<StripeBillingOptions>(
    builder.Configuration.GetSection(StripeBillingOptions.SectionName));
builder.Services.Configure<ResendOptions>(
    builder.Configuration.GetSection(ResendOptions.SectionName));
builder.Services.AddHttpClient("Resend", (serviceProvider, client) =>
{
    var resendOptions = serviceProvider.GetRequiredService<
        Microsoft.Extensions.Options.IOptions<ResendOptions>>().Value;

    client.BaseAddress = new Uri("https://api.resend.com/");
    client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

    if (!string.IsNullOrWhiteSpace(resendOptions.ApiKey))
    {
        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", resendOptions.ApiKey);
    }
});

var allowedOrigins = ResolveAllowedOrigins(builder.Configuration);

builder.Services.AddCors(options =>
{
    options.AddPolicy("frontend", policy =>
    {
        policy
            .WithOrigins(allowedOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

builder.Services.AddScoped<CatalogSeedLoader>();
builder.Services.AddScoped<AppDbInitializer>();
builder.Services.AddSingleton<MentorFallbackService>();
builder.Services.AddSingleton<SessionTokenService>();
builder.Services.AddSingleton<PasswordHashService>();
builder.Services.AddScoped<StripeBillingService>();
builder.Services.AddScoped<AccessEmailService>();
builder.Services.AddScoped<StripeWebhookProcessor>();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseExceptionHandler();
app.UseCors("frontend");
app.UseAuthentication();
app.UseAuthorization();

app.MapHealthChecks("/api/health");
app.MapCatalogEndpoints();
app.MapSessionEndpoints();
app.MapPaymentEndpoints();
app.MapUserStateEndpoints();
app.MapMentorEndpoints();

await using (var scope = app.Services.CreateAsyncScope())
{
    var initializer = scope.ServiceProvider.GetRequiredService<AppDbInitializer>();
    await initializer.InitializeAsync();
}

app.Run();

static string[] ResolveAllowedOrigins(IConfiguration configuration)
{
    const string AllowedOriginsKey = "Cors:AllowedOrigins";
    const string OriginsAliasKey = "Cors:Origins";

    var resolvedOrigins = new List<string>();

    AddOrigins(resolvedOrigins, configuration.GetSection(AllowedOriginsKey).Get<string[]>());
    AddOrigins(resolvedOrigins, configuration.GetSection(OriginsAliasKey).Get<string[]>());
    AddOrigins(resolvedOrigins, configuration[AllowedOriginsKey]);
    AddOrigins(resolvedOrigins, configuration[OriginsAliasKey]);

    return resolvedOrigins.Count > 0
        ? [.. resolvedOrigins.Distinct(StringComparer.OrdinalIgnoreCase)]
        : ["http://localhost:5173", "http://127.0.0.1:5173"];
}

static void AddOrigins(List<string> resolvedOrigins, IEnumerable<string>? configuredOrigins)
{
    if (configuredOrigins is null)
    {
        return;
    }

    foreach (var configuredOrigin in configuredOrigins)
    {
        AddOrigins(resolvedOrigins, configuredOrigin);
    }
}

static void AddOrigins(List<string> resolvedOrigins, string? configuredOrigins)
{
    if (string.IsNullOrWhiteSpace(configuredOrigins))
    {
        return;
    }

    var entries = configuredOrigins.Split(
        [',', ';', '\n', '\r'],
        StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

    foreach (var entry in entries)
    {
        var normalizedOrigin = entry.Trim().TrimEnd('/');

        if (Uri.TryCreate(normalizedOrigin, UriKind.Absolute, out var originUri) &&
            (originUri.Scheme == Uri.UriSchemeHttp || originUri.Scheme == Uri.UriSchemeHttps))
        {
            resolvedOrigins.Add(normalizedOrigin);
        }
    }
}

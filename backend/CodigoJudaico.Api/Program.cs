using CodigoJudaico.Api.Data;
using CodigoJudaico.Api.Endpoints;
using CodigoJudaico.Api.Services;
using Microsoft.AspNetCore.Authentication;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
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
builder.Services.Configure<OpenAIOptions>(
    builder.Configuration.GetSection(OpenAIOptions.SectionName));
builder.Services.AddHttpClient<MentorOpenAiClient>((sp, client) =>
{
    var opts = sp.GetRequiredService<
        Microsoft.Extensions.Options.IOptions<OpenAIOptions>>().Value;
    var baseUrl = string.IsNullOrWhiteSpace(opts.BaseUrl)
        ? "https://api.openai.com/"
        : opts.BaseUrl.TrimEnd('/') + "/";
    client.BaseAddress = new Uri(baseUrl);
    client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
    client.Timeout = TimeSpan.FromSeconds(60);
});
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

var resendOptions = app.Services.GetRequiredService<IOptions<ResendOptions>>().Value;

if (resendOptions.Enabled &&
    (string.IsNullOrWhiteSpace(resendOptions.ApiKey) || string.IsNullOrWhiteSpace(resendOptions.From)))
{
    app.Logger.LogWarning(
        "Resend esta habilitado, mas ApiKey/From nao foram configurados. O acesso sera liberado normalmente, porem os e-mails nao serao enviados ate corrigir a configuracao.");
}

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

    AddConfiguredOrigins(resolvedOrigins, configuration.GetSection(AllowedOriginsKey).Get<string[]>());
    AddConfiguredOrigins(resolvedOrigins, configuration.GetSection(OriginsAliasKey).Get<string[]>());
    AddConfiguredOrigin(resolvedOrigins, configuration[AllowedOriginsKey]);
    AddConfiguredOrigin(resolvedOrigins, configuration[OriginsAliasKey]);

    return resolvedOrigins.Count > 0
        ? [.. resolvedOrigins.Distinct(StringComparer.OrdinalIgnoreCase)]
        : ["http://localhost:5173", "http://127.0.0.1:5173"];
}

static void AddConfiguredOrigins(List<string> resolvedOrigins, IEnumerable<string>? configuredOrigins)
{
    if (configuredOrigins is null)
    {
        return;
    }

    foreach (var configuredOrigin in configuredOrigins)
    {
        AddConfiguredOrigin(resolvedOrigins, configuredOrigin);
    }
}

static void AddConfiguredOrigin(List<string> resolvedOrigins, string? configuredOrigins)
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

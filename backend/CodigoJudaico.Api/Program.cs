using CodigoJudaico.Api.Data;
using CodigoJudaico.Api.Endpoints;
using CodigoJudaico.Api.Services;
using Microsoft.AspNetCore.Authentication;
using Microsoft.EntityFrameworkCore;

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
builder.Services.Configure<EmailOptions>(
    builder.Configuration.GetSection(EmailOptions.SectionName));

var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ??
    ["http://localhost:5173", "http://127.0.0.1:5173"];

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

using System.Security.Claims;
using System.Text.Encodings.Web;
using CodigoJudaico.Api.Data;
using Microsoft.AspNetCore.Authentication;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace CodigoJudaico.Api.Services;

public sealed class AppSessionAuthenticationHandler(
    IOptionsMonitor<AuthenticationSchemeOptions> options,
    ILoggerFactory logger,
    UrlEncoder encoder,
    AppDbContext dbContext,
    SessionTokenService sessionTokenService)
    : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    public const string SchemeName = "Bearer";
    public const string SessionIdClaimType = "app_session_id";

    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var authorizationHeader = Request.Headers.Authorization.ToString();

        if (string.IsNullOrWhiteSpace(authorizationHeader) ||
            !authorizationHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
        {
            return AuthenticateResult.NoResult();
        }

        var token = authorizationHeader["Bearer ".Length..].Trim();

        if (string.IsNullOrWhiteSpace(token))
        {
            return AuthenticateResult.Fail("Token de acesso ausente.");
        }

        var tokenHash = sessionTokenService.HashToken(token);
        var now = DateTimeOffset.UtcNow;

        var session = await dbContext.AppSessions
            .Include(x => x.User)
            .SingleOrDefaultAsync(
                x => x.TokenHash == tokenHash &&
                     x.RevokedAt == null &&
                     x.ExpiresAt > now,
                Context.RequestAborted);

        if (session is null || !session.User.AccessEnabled)
        {
            return AuthenticateResult.Fail("Sessao invalida ou expirada.");
        }

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, session.UserId.ToString()),
            new(ClaimTypes.Email, session.User.Email),
            new(ClaimTypes.Name, session.User.Name),
            new(SessionIdClaimType, session.Id.ToString()),
        };

        var identity = new ClaimsIdentity(claims, SchemeName);
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, SchemeName);
        return AuthenticateResult.Success(ticket);
    }
}

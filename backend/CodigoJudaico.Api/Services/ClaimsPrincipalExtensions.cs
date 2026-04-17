using System.Security.Claims;

namespace CodigoJudaico.Api.Services;

public static class ClaimsPrincipalExtensions
{
    public static Guid GetRequiredUserId(this ClaimsPrincipal user)
    {
        if (Guid.TryParse(user.FindFirstValue(ClaimTypes.NameIdentifier), out var userId))
        {
            return userId;
        }

        throw new InvalidOperationException("Usuario autenticado sem identificador.");
    }

    public static Guid GetRequiredSessionId(this ClaimsPrincipal user)
    {
        if (Guid.TryParse(user.FindFirstValue(AppSessionAuthenticationHandler.SessionIdClaimType), out var sessionId))
        {
            return sessionId;
        }

        throw new InvalidOperationException("Sessao autenticada sem identificador.");
    }
}

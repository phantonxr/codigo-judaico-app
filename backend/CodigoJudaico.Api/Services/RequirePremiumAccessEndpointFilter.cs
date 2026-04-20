using CodigoJudaico.Api.Contracts;
using CodigoJudaico.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace CodigoJudaico.Api.Services;

public sealed class RequirePremiumAccessEndpointFilter(AppDbContext dbContext) : IEndpointFilter
{
    public async ValueTask<object?> InvokeAsync(
        EndpointFilterInvocationContext context,
        EndpointFilterDelegate next)
    {
        var principal = context.HttpContext.User;
        var userId = principal.GetRequiredUserId();
        var user = await dbContext.Users.SingleOrDefaultAsync(
            x => x.Id == userId,
            context.HttpContext.RequestAborted);

        if (AppAccessEvaluator.HasPremiumAccess(user))
        {
            return await next(context);
        }

        if (user is null)
        {
            return Results.Unauthorized();
        }

        return Results.Json(
            new LoginBlockedResponse(
                "subscription_required",
                "Sua assinatura venceu ou precisa ser reativada. Escolha um plano para continuar sua jornada.",
                user.Email,
                AppAccessEvaluator.ResolvePlanId(user.PlanName),
                user.PlanName,
                user.PlanStatus),
            statusCode: StatusCodes.Status403Forbidden);
    }
}

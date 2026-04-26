using CodigoJudaico.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace CodigoJudaico.Api.Services;

public sealed class RequireMasterUserEndpointFilter(AppDbContext dbContext) : IEndpointFilter
{
    public async ValueTask<object?> InvokeAsync(
        EndpointFilterInvocationContext context,
        EndpointFilterDelegate next)
    {
        var principal = context.HttpContext.User;
        Guid userId;

        try
        {
            userId = principal.GetRequiredUserId();
        }
        catch (InvalidOperationException)
        {
            return Results.Unauthorized();
        }

        var isMasterUser = await dbContext.Users
            .AsNoTracking()
            .AnyAsync(
                x => x.Id == userId && x.IsMasterUser,
                context.HttpContext.RequestAborted);

        if (!isMasterUser)
        {
            return Results.Forbid();
        }

        return await next(context);
    }
}

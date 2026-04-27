using CodigoJudaico.Api.Contracts;
using CodigoJudaico.Api.Data;
using CodigoJudaico.Api.Models;
using CodigoJudaico.Api.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using System.Security.Claims;

namespace CodigoJudaico.Api.Endpoints;

public static class BookEndpoints
{
    public static IEndpointRouteBuilder MapBookEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/books").WithTags("Books");

        group.MapGet("/catalog", (IOptions<StripeBillingOptions> options) =>
        {
            var bookPriceIds = options.Value.BookPriceIds;
            var books = BookCatalog.All.Select(b =>
            {
                var isPurchasable = bookPriceIds.TryGetValue(b.Id, out var priceId) && !string.IsNullOrWhiteSpace(priceId);
                return new BookCatalogDto(
                    b.Id,
                    b.Title,
                    b.Description,
                    b.PriceLabel,
                    $"/books/{b.CoverImageFileName}",
                    isPurchasable);
            });

            return Results.Ok(books);
        })
        .WithName("GetBookCatalog");

        group.MapGet("", async (
            ClaimsPrincipal userPrincipal,
            AppDbContext dbContext,
            IOptions<StripeBillingOptions> options,
            CancellationToken cancellationToken) =>
        {
            var userId = userPrincipal.GetRequiredUserId();
            var bookPriceIds = options.Value.BookPriceIds;

            var purchasedBookIds = await dbContext.UserBookPurchases
                .Where(x => x.UserId == userId)
                .Select(x => x.BookId)
                .ToHashSetAsync(cancellationToken);

            var books = BookCatalog.All.Select(b =>
            {
                var isPurchasable = bookPriceIds.TryGetValue(b.Id, out var priceId) && !string.IsNullOrWhiteSpace(priceId);
                return new BookLibraryDto(
                    b.Id,
                    b.Title,
                    b.Description,
                    b.PriceLabel,
                    $"/books/{b.CoverImageFileName}",
                    purchasedBookIds.Contains(b.Id),
                    isPurchasable);
            });

            return Results.Ok(books);
        })
        .RequireAuthorization()
        .WithName("GetMyBooks");

        group.MapPost("/checkout-sessions", async (
            BookCheckoutRequest request,
            ClaimsPrincipal userPrincipal,
            AppDbContext dbContext,
            StripeBillingService stripeBillingService,
            ILoggerFactory loggerFactory,
            CancellationToken cancellationToken) =>
        {
            var logger = loggerFactory.CreateLogger("BookEndpoints");
            var userId = userPrincipal.GetRequiredUserId();
            var user = await dbContext.Users.SingleOrDefaultAsync(x => x.Id == userId, cancellationToken);

            if (user is null)
            {
                return Results.Unauthorized();
            }

            if (request.BookIds is null || request.BookIds.Count == 0)
            {
                return Results.ValidationProblem(new Dictionary<string, string[]>
                {
                    ["bookIds"] = ["Selecione ao menos um livro."]
                });
            }

            var books = stripeBillingService.ResolveBookLineItems(request.BookIds);

            if (books.Count == 0)
            {
                return Results.Problem(
                    title: "Livros nao disponiveis para compra.",
                    detail: "Os livros selecionados ainda nao tem preco configurado no Stripe.",
                    statusCode: StatusCodes.Status503ServiceUnavailable);
            }

            try
            {
                var response = await stripeBillingService.CreateBookOnlyCheckoutSessionAsync(
                    user.Email,
                    user.Name,
                    books,
                    cancellationToken);

                return Results.Ok(response);
            }
            catch (InvalidOperationException ex)
            {
                logger.LogError(ex, "Falha de configuracao ao criar checkout de livros para {Email}.", user.Email);
                return Results.Problem(
                    title: "Checkout de livros indisponivel.",
                    detail: ex.Message,
                    statusCode: StatusCodes.Status503ServiceUnavailable);
            }
            catch (Stripe.StripeException ex)
            {
                logger.LogError(ex, "Falha ao criar checkout de livros para {Email}.", user.Email);
                return Results.Problem(
                    title: "Nao consegui abrir o checkout.",
                    detail: "O Stripe nao aceitou a criacao desta sessao agora. Tente novamente em instantes.",
                    statusCode: StatusCodes.Status502BadGateway);
            }
        })
        .RequireAuthorization()
        .WithName("CreateBookCheckoutSession");

        group.MapGet("/{bookId}/download", async (
            string bookId,
            ClaimsPrincipal userPrincipal,
            AppDbContext dbContext,
            IOptions<StripeBillingOptions> options,
            IWebHostEnvironment env,
            CancellationToken cancellationToken) =>
        {
            var userId = userPrincipal.GetRequiredUserId();
            var normalizedId = (bookId ?? string.Empty).Trim().ToLowerInvariant();
            var book = BookCatalog.FindById(normalizedId);

            if (book is null)
            {
                return Results.NotFound();
            }

            var hasPurchased = await dbContext.UserBookPurchases
                .AnyAsync(x => x.UserId == userId && x.BookId == normalizedId, cancellationToken);

            if (!hasPurchased)
            {
                return Results.Forbid();
            }

            var pdfBasePath = options.Value.BooksPdfPath.TrimEnd('/');
            var pdfPath = Path.IsPathRooted(pdfBasePath)
                ? Path.Combine(pdfBasePath, book.PdfFileName)
                : Path.Combine(env.ContentRootPath, pdfBasePath, book.PdfFileName);

            if (!File.Exists(pdfPath))
            {
                return Results.Problem(
                    title: "Arquivo nao encontrado.",
                    detail: "O PDF deste livro ainda nao foi carregado no servidor.",
                    statusCode: StatusCodes.Status503ServiceUnavailable);
            }

            var stream = File.OpenRead(pdfPath);
            return Results.File(stream, "application/pdf", book.PdfFileName);
        })
        .RequireAuthorization()
        .WithName("DownloadBook");

        return app;
    }
}

using CodigoJudaico.Api.Contracts;
using CodigoJudaico.Api.Data;
using CodigoJudaico.Api.Models;
using CodigoJudaico.Api.Services;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace CodigoJudaico.Api.Endpoints;

public static class LegalEndpoints
{
    private const string TermsType = "terms";
    private const string PrivacyType = "privacy";
    private const string DisclaimerType = "disclaimer";
    private const string EnglishLanguage = "en";
    private static readonly string[] RequiredTypes = [TermsType, PrivacyType, DisclaimerType];
    private static readonly HashSet<string> ValidTypes = new(RequiredTypes, StringComparer.OrdinalIgnoreCase);

    public static IEndpointRouteBuilder MapLegalEndpoints(this IEndpointRouteBuilder app)
    {
        var publicGroup = app.MapGroup("/api/legal").WithTags("Legal");

        publicGroup.MapGet("/active", async (
            string? language,
            AppDbContext dbContext,
            CancellationToken cancellationToken) =>
        {
            var requestedLanguage = NormalizeLanguage(language);
            var documents = await LoadActiveDocumentsAsync(dbContext, requestedLanguage, cancellationToken);

            if (documents.Count != RequiredTypes.Length)
            {
                return Results.Problem(
                    title: "Legal documents unavailable.",
                    detail: "Active legal documents are not fully configured yet.",
                    statusCode: StatusCodes.Status503ServiceUnavailable);
            }

            return Results.Ok(BuildActiveDocumentsResponse(requestedLanguage, documents));
        })
        .WithName("GetActiveLegalDocuments");

        publicGroup.MapGet("/status", async (
            string? language,
            ClaimsPrincipal principal,
            AppDbContext dbContext,
            CancellationToken cancellationToken) =>
        {
            var requestedLanguage = NormalizeLanguage(language);
            var userId = principal.GetRequiredUserId();
            var documents = await LoadActiveDocumentsAsync(dbContext, requestedLanguage, cancellationToken);

            if (documents.Count != RequiredTypes.Length)
            {
                return Results.Problem(
                    title: "Legal documents unavailable.",
                    detail: "Active legal documents are not fully configured yet.",
                    statusCode: StatusCodes.Status503ServiceUnavailable);
            }

            var activeVersions = BuildVersionSet(documents);
            var acceptance = await LoadLatestAcceptanceAsync(dbContext, userId, cancellationToken);
            var requiresAcceptance = acceptance is null || !AcceptanceMatches(acceptance, activeVersions);

            return Results.Ok(new LegalAcceptanceStatusResponse(
                requiresAcceptance,
                requestedLanguage,
                ResolveDisplayedLanguage(documents),
                activeVersions,
                acceptance?.ToDto(),
                documents.Select(x => x.ToDto()).ToList()));
        })
        .RequireAuthorization()
        .WithName("GetLegalAcceptanceStatus");

        publicGroup.MapPost("/acceptance", async (
            LegalAcceptanceRequest request,
            ClaimsPrincipal principal,
            AppDbContext dbContext,
            CancellationToken cancellationToken) =>
        {
            var requestedLanguage = NormalizeLanguage(request.Language);
            var userId = principal.GetRequiredUserId();
            var documents = await LoadActiveDocumentsAsync(dbContext, requestedLanguage, cancellationToken);

            if (documents.Count != RequiredTypes.Length)
            {
                return Results.Problem(
                    title: "Legal documents unavailable.",
                    detail: "Active legal documents are not fully configured yet.",
                    statusCode: StatusCodes.Status503ServiceUnavailable);
            }

            var activeVersions = BuildVersionSet(documents);
            if (!RequestMatches(request, activeVersions))
            {
                return Results.ValidationProblem(new Dictionary<string, string[]>
                {
                    ["legalAcceptance"] = ["Review and accept the latest active legal documents before continuing."]
                });
            }

            var acceptance = AddAcceptance(dbContext, userId, request, requestedLanguage);
            await dbContext.SaveChangesAsync(cancellationToken);

            return Results.Ok(acceptance.ToDto());
        })
        .RequireAuthorization()
        .WithName("AcceptLegalDocuments");

        var adminGroup = app.MapGroup("/api/admin/legal")
            .WithTags("Admin Legal")
            .RequireAuthorization()
            .AddEndpointFilter<RequireMasterUserEndpointFilter>();

        adminGroup.MapGet("/documents", async (
            string? type,
            string? language,
            AppDbContext dbContext,
            CancellationToken cancellationToken) =>
        {
            var query = dbContext.LegalDocuments.AsNoTracking();
            var cleanedType = ApiMappers.Clean(type).ToLowerInvariant();
            var cleanedLanguage = ApiMappers.Clean(language);

            if (!string.IsNullOrWhiteSpace(cleanedType))
            {
                query = query.Where(x => x.Type == cleanedType);
            }

            if (!string.IsNullOrWhiteSpace(cleanedLanguage))
            {
                query = query.Where(x => x.Language == NormalizeLanguage(cleanedLanguage));
            }

            var documents = await query
                .OrderBy(x => x.Type)
                .ThenBy(x => x.Language)
                .ThenByDescending(x => x.UpdatedAt)
                .Select(x => x.ToDto())
                .ToListAsync(cancellationToken);

            return Results.Ok(documents);
        })
        .WithName("ListAdminLegalDocuments");

        adminGroup.MapPost("/documents", async (
            LegalDocumentSaveRequest request,
            ClaimsPrincipal principal,
            AppDbContext dbContext,
            CancellationToken cancellationToken) =>
        {
            var validation = ValidateDocumentRequest(request);
            if (validation.Count > 0)
            {
                return Results.ValidationProblem(validation);
            }

            var type = ApiMappers.Clean(request.Type).ToLowerInvariant();
            var language = NormalizeLanguage(request.Language);
            var version = ApiMappers.Clean(request.Version);
            var exists = await dbContext.LegalDocuments.AnyAsync(
                x => x.Type == type && x.Language == language && x.Version == version,
                cancellationToken);

            if (exists)
            {
                return Results.ValidationProblem(new Dictionary<string, string[]>
                {
                    ["version"] = ["This version already exists for the selected document and language."]
                });
            }

            var now = DateTimeOffset.UtcNow;
            if (request.IsActive)
            {
                await DeactivateSameTypeAndLanguageAsync(dbContext, type, language, now, cancellationToken);
            }

            var document = new LegalDocument
            {
                Id = Guid.NewGuid(),
                Type = type,
                Language = language,
                Version = version,
                Title = ApiMappers.Clean(request.Title),
                Content = ApiMappers.Clean(request.Content),
                IsActive = request.IsActive,
                CreatedAt = now,
                UpdatedAt = now,
                CreatedBy = principal.GetRequiredUserId(),
            };

            dbContext.LegalDocuments.Add(document);
            await dbContext.SaveChangesAsync(cancellationToken);

            return Results.Ok(document.ToDto());
        })
        .WithName("CreateAdminLegalDocumentVersion");

        adminGroup.MapPut("/documents/{id:guid}/status", async (
            Guid id,
            LegalDocumentStatusRequest request,
            AppDbContext dbContext,
            CancellationToken cancellationToken) =>
        {
            var document = await dbContext.LegalDocuments
                .SingleOrDefaultAsync(x => x.Id == id, cancellationToken);

            if (document is null)
            {
                return Results.NotFound();
            }

            var now = DateTimeOffset.UtcNow;
            if (request.IsActive)
            {
                await DeactivateSameTypeAndLanguageAsync(
                    dbContext,
                    document.Type,
                    document.Language,
                    now,
                    cancellationToken,
                    exceptId: document.Id);
            }

            document.IsActive = request.IsActive;
            document.UpdatedAt = now;
            await dbContext.SaveChangesAsync(cancellationToken);

            return Results.Ok(document.ToDto());
        })
        .WithName("UpdateAdminLegalDocumentStatus");

        return app;
    }

    public static async Task<bool> TryRecordCheckoutAcceptanceAsync(
        AppDbContext dbContext,
        Guid userId,
        LegalAcceptanceRequest? request,
        CancellationToken cancellationToken)
    {
        if (request is null)
        {
            return false;
        }

        var requestedLanguage = NormalizeLanguage(request.Language);
        var documents = await LoadActiveDocumentsAsync(dbContext, requestedLanguage, cancellationToken);

        if (documents.Count != RequiredTypes.Length || !RequestMatches(request, BuildVersionSet(documents)))
        {
            return false;
        }

        AddAcceptance(dbContext, userId, request, requestedLanguage);
        return true;
    }

    public static async Task<bool> IsCurrentLegalAcceptanceAsync(
        AppDbContext dbContext,
        LegalAcceptanceRequest? request,
        CancellationToken cancellationToken)
    {
        if (request is null)
        {
            return false;
        }

        var requestedLanguage = NormalizeLanguage(request.Language);
        var documents = await LoadActiveDocumentsAsync(dbContext, requestedLanguage, cancellationToken);
        return documents.Count == RequiredTypes.Length && RequestMatches(request, BuildVersionSet(documents));
    }

    private static async Task<List<LegalDocument>> LoadActiveDocumentsAsync(
        AppDbContext dbContext,
        string requestedLanguage,
        CancellationToken cancellationToken)
    {
        var documents = new List<LegalDocument>();

        foreach (var type in RequiredTypes)
        {
            var localized = await dbContext.LegalDocuments
                .AsNoTracking()
                .Where(x => x.Type == type && x.Language == requestedLanguage && x.IsActive)
                .OrderByDescending(x => x.UpdatedAt)
                .FirstOrDefaultAsync(cancellationToken);

            if (localized is null && requestedLanguage != EnglishLanguage)
            {
                localized = await dbContext.LegalDocuments
                    .AsNoTracking()
                    .Where(x => x.Type == type && x.Language == EnglishLanguage && x.IsActive)
                    .OrderByDescending(x => x.UpdatedAt)
                    .FirstOrDefaultAsync(cancellationToken);
            }

            if (localized is not null)
            {
                documents.Add(localized);
            }
        }

        return documents;
    }

    private static ActiveLegalDocumentsResponse BuildActiveDocumentsResponse(
        string requestedLanguage,
        IReadOnlyList<LegalDocument> documents) =>
        new(
            requestedLanguage,
            ResolveDisplayedLanguage(documents),
            BuildVersionSet(documents),
            documents.Select(x => x.ToDto()).ToList());

    private static LegalVersionSetDto BuildVersionSet(IReadOnlyList<LegalDocument> documents)
    {
        string VersionFor(string type) =>
            documents.FirstOrDefault(x => x.Type == type)?.Version ?? string.Empty;

        return new LegalVersionSetDto(
            VersionFor(TermsType),
            VersionFor(PrivacyType),
            VersionFor(DisclaimerType));
    }

    private static bool AcceptanceMatches(UserLegalAcceptance acceptance, LegalVersionSetDto activeVersions) =>
        string.Equals(acceptance.TermsVersion, activeVersions.TermsVersion, StringComparison.OrdinalIgnoreCase)
        && string.Equals(acceptance.PrivacyVersion, activeVersions.PrivacyVersion, StringComparison.OrdinalIgnoreCase)
        && string.Equals(acceptance.DisclaimerVersion, activeVersions.DisclaimerVersion, StringComparison.OrdinalIgnoreCase);

    private static bool RequestMatches(LegalAcceptanceRequest request, LegalVersionSetDto activeVersions) =>
        string.Equals(ApiMappers.Clean(request.TermsVersion), activeVersions.TermsVersion, StringComparison.OrdinalIgnoreCase)
        && string.Equals(ApiMappers.Clean(request.PrivacyVersion), activeVersions.PrivacyVersion, StringComparison.OrdinalIgnoreCase)
        && string.Equals(ApiMappers.Clean(request.DisclaimerVersion), activeVersions.DisclaimerVersion, StringComparison.OrdinalIgnoreCase);

    private static UserLegalAcceptance AddAcceptance(
        AppDbContext dbContext,
        Guid userId,
        LegalAcceptanceRequest request,
        string language)
    {
        var acceptance = new UserLegalAcceptance
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            TermsVersion = ApiMappers.Clean(request.TermsVersion),
            PrivacyVersion = ApiMappers.Clean(request.PrivacyVersion),
            DisclaimerVersion = ApiMappers.Clean(request.DisclaimerVersion),
            Language = language,
            AcceptedAt = DateTimeOffset.UtcNow,
        };

        dbContext.UserLegalAcceptances.Add(acceptance);
        return acceptance;
    }

    private static async Task<UserLegalAcceptance?> LoadLatestAcceptanceAsync(
        AppDbContext dbContext,
        Guid userId,
        CancellationToken cancellationToken) =>
        await dbContext.UserLegalAcceptances
            .AsNoTracking()
            .Where(x => x.UserId == userId)
            .OrderByDescending(x => x.AcceptedAt)
            .FirstOrDefaultAsync(cancellationToken);

    private static async Task DeactivateSameTypeAndLanguageAsync(
        AppDbContext dbContext,
        string type,
        string language,
        DateTimeOffset now,
        CancellationToken cancellationToken,
        Guid? exceptId = null)
    {
        var activeDocuments = await dbContext.LegalDocuments
            .Where(x => x.Type == type && x.Language == language && x.IsActive && x.Id != exceptId)
            .ToListAsync(cancellationToken);

        foreach (var document in activeDocuments)
        {
            document.IsActive = false;
            document.UpdatedAt = now;
        }
    }

    private static Dictionary<string, string[]> ValidateDocumentRequest(LegalDocumentSaveRequest request)
    {
        var errors = new Dictionary<string, string[]>();
        var type = ApiMappers.Clean(request.Type).ToLowerInvariant();

        if (!ValidTypes.Contains(type))
        {
            errors["type"] = ["Type must be terms, privacy, or disclaimer."];
        }

        if (string.IsNullOrWhiteSpace(ApiMappers.Clean(request.Version)))
        {
            errors["version"] = ["Version is required."];
        }

        if (string.IsNullOrWhiteSpace(ApiMappers.Clean(request.Title)))
        {
            errors["title"] = ["Title is required."];
        }

        if (string.IsNullOrWhiteSpace(ApiMappers.Clean(request.Content)))
        {
            errors["content"] = ["Content is required."];
        }

        return errors;
    }

    private static string ResolveDisplayedLanguage(IReadOnlyList<LegalDocument> documents)
    {
        var languages = documents.Select(x => x.Language).Distinct(StringComparer.OrdinalIgnoreCase).ToList();
        return languages.Count == 1 ? languages[0] : "mixed";
    }

    private static string NormalizeLanguage(string? language)
    {
        var cleaned = ApiMappers.Clean(language).ToLowerInvariant();
        return cleaned switch
        {
            "pt" or "pt-br" or "pt_br" => "pt-BR",
            "en" or "en-us" or "en_us" => EnglishLanguage,
            _ => EnglishLanguage,
        };
    }
}

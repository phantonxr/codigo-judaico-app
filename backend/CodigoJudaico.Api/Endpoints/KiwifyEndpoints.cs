using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using CodigoJudaico.Api.Contracts;
using CodigoJudaico.Api.Services;
using Microsoft.Extensions.Options;

namespace CodigoJudaico.Api.Endpoints;

public static class KiwifyEndpoints
{
    private const int MaxBodyBytes = 256 * 1024;

    public static IEndpointRouteBuilder MapKiwifyEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapPost("/api/payments/webhooks/kiwify", async (
            HttpRequest request, IOptions<KiwifyOptions> options,
            KiwifyWebhookProcessor processor, ILoggerFactory loggerFactory,
            CancellationToken cancellationToken) =>
        {
            var settings = options.Value;
            if (!settings.Enabled || !settings.IsValid())
                return Results.StatusCode(StatusCodes.Status503ServiceUnavailable);
            if (request.ContentLength > MaxBodyBytes)
                return Results.StatusCode(StatusCodes.Status413PayloadTooLarge);

            var logger = loggerFactory.CreateLogger("KiwifyWebhook");
            try
            {
                // The signature covers the raw bytes, so read them before any JSON parsing.
                // The read is bounded even when the sender uses chunked transfer encoding.
                using var body = new MemoryStream();
                var buffer = new byte[8192];
                int count;
                while ((count = await request.Body.ReadAsync(buffer, cancellationToken)) > 0)
                {
                    if (body.Length + count > MaxBodyBytes)
                        return Results.StatusCode(StatusCodes.Status413PayloadTooLarge);
                    await body.WriteAsync(buffer.AsMemory(0, count), cancellationToken);
                }
                var bytes = body.ToArray();
                if (!IsValidSignature(bytes, request.Query["signature"].ToString(), settings))
                    return Results.Unauthorized();

                var payload = JsonSerializer.Deserialize<KiwifyWebhookPayload>(bytes);
                if (payload is null) return Results.BadRequest(new { error = "Payload ausente." });
                var result = await processor.ProcessAsync(payload, cancellationToken);
                return Results.Ok(new { result });
            }
            catch (JsonException)
            {
                return Results.BadRequest(new { error = "JSON invalido." });
            }
            catch (ArgumentException ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
            catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested) { throw; }
            catch (Exception ex)
            {
                // Never log the payload or the password setup link.
                logger.LogError(ex, "Falha ao processar webhook Kiwify.");
                return Results.StatusCode(StatusCodes.Status503ServiceUnavailable);
            }
        }).AllowAnonymous().WithTags("Payments").WithName("KiwifyWebhook");
        return app;
    }

    /// <summary>
    /// Kiwify signs each delivery with ?signature= HMAC-SHA1(raw body, webhook token), in lowercase hex.
    /// The previous token is accepted during a rotation.
    /// </summary>
    public static bool IsValidSignature(byte[] body, string? signature, KiwifyOptions settings)
    {
        if (string.IsNullOrEmpty(signature) || signature.Length != 40) return false;
        var supplied = Encoding.ASCII.GetBytes(signature.ToLowerInvariant());
        return Matches(settings.WebhookToken)
            | (settings.PreviousWebhookToken.Length > 0 && Matches(settings.PreviousWebhookToken));

        bool Matches(string token)
        {
            var expected = Encoding.ASCII.GetBytes(
                Convert.ToHexStringLower(HMACSHA1.HashData(Encoding.UTF8.GetBytes(token), body)));
            return CryptographicOperations.FixedTimeEquals(expected, supplied);
        }
    }
}

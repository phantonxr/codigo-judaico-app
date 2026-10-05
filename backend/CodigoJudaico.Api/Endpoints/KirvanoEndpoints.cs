using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using CodigoJudaico.Api.Contracts;
using CodigoJudaico.Api.Services;
using Microsoft.Extensions.Options;

namespace CodigoJudaico.Api.Endpoints;

public static class KirvanoEndpoints
{
    public static IEndpointRouteBuilder MapKirvanoEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapPost("/api/payments/webhooks/kirvano", async (
            HttpRequest request, IOptions<KirvanoOptions> options,
            KirvanoWebhookProcessor processor, ILoggerFactory loggerFactory,
            CancellationToken cancellationToken) =>
        {
            var settings = options.Value;
            if (!settings.Enabled || !settings.IsValid())
                return Results.StatusCode(StatusCodes.Status503ServiceUnavailable);

            // A token in the URL works independently of the provider's undocumented token transport.
            var token = request.Query["token"].ToString();
            if (string.IsNullOrEmpty(token)) token = request.Headers["security-token"].ToString();
            var expected = SHA256.HashData(Encoding.UTF8.GetBytes(settings.WebhookToken));
            var supplied = SHA256.HashData(Encoding.UTF8.GetBytes(token));
            if (string.IsNullOrEmpty(token) || !CryptographicOperations.FixedTimeEquals(expected, supplied))
                return Results.Unauthorized();

            if (request.ContentLength > 256 * 1024)
                return Results.StatusCode(StatusCodes.Status413PayloadTooLarge);

            var logger = loggerFactory.CreateLogger("KirvanoWebhook");
            try
            {
                // Read a bounded body even when the sender uses chunked transfer encoding.
                using var body = new MemoryStream();
                var buffer = new byte[8192];
                int count;
                while ((count = await request.Body.ReadAsync(buffer, cancellationToken)) > 0)
                {
                    if (body.Length + count > 256 * 1024)
                        return Results.StatusCode(StatusCodes.Status413PayloadTooLarge);
                    await body.WriteAsync(buffer.AsMemory(0, count), cancellationToken);
                }
                body.Position = 0;
                var payload = await JsonSerializer.DeserializeAsync<KirvanoWebhookPayload>(body, cancellationToken: cancellationToken);
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
                // Never log the payload, URL token, or password setup link.
                logger.LogError(ex, "Falha ao processar webhook Kirvano.");
                return Results.StatusCode(StatusCodes.Status503ServiceUnavailable);
            }
        }).AllowAnonymous().WithTags("Payments").WithName("KirvanoWebhook");
        return app;
    }
}

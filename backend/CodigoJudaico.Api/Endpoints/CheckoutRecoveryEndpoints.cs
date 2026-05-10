using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using CodigoJudaico.Api.Models;
using CodigoJudaico.Api.Services;
using Microsoft.Extensions.Options;

namespace CodigoJudaico.Api.Endpoints;

public static class CheckoutRecoveryEndpoints
{
    public static IEndpointRouteBuilder MapCheckoutRecoveryEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/checkout-recoveries")
            .WithTags("Checkout Recoveries");

        group.MapGet("/{token}/checkout", async (
            string token,
            CheckoutRecoveryService checkoutRecoveryService,
            CancellationToken cancellationToken) =>
        {
            var result = await checkoutRecoveryService.RedeemAsync(token, cancellationToken);
            return Results.Redirect(result.RedirectUrl);
        })
        .WithName("RedeemCheckoutRecovery");

        group.MapGet("/unsubscribe/{token}", async (
            string token,
            CheckoutRecoveryService checkoutRecoveryService,
            CancellationToken cancellationToken) =>
        {
            await checkoutRecoveryService.UnsubscribeAsync(token, cancellationToken);
            return Results.Content(BuildUnsubscribeResponse(), "text/html; charset=utf-8");
        })
        .WithName("UnsubscribeCheckoutRecovery");

        group.MapPost("/unsubscribe/{token}", async (
            string token,
            CheckoutRecoveryService checkoutRecoveryService,
            CancellationToken cancellationToken) =>
        {
            await checkoutRecoveryService.UnsubscribeAsync(token, cancellationToken);
            return Results.NoContent();
        })
        .WithName("OneClickUnsubscribeCheckoutRecovery");

        app.MapPost("/api/email/webhooks/resend", async (
            HttpRequest request,
            CheckoutRecoveryService checkoutRecoveryService,
            IOptions<ResendOptions> resendOptions,
            ILoggerFactory loggerFactory,
            CancellationToken cancellationToken) =>
        {
            var logger = loggerFactory.CreateLogger("ResendInboundWebhook");
            using var reader = new StreamReader(request.Body);
            var payload = await reader.ReadToEndAsync(cancellationToken);

            if (!VerifyResendWebhook(request, payload, resendOptions.Value))
            {
                logger.LogWarning("Webhook inbound Resend rejeitado por assinatura invalida.");
                return Results.Unauthorized();
            }

            using var document = JsonDocument.Parse(payload);
            var root = document.RootElement;
            var type = ReadString(root, "type");
            var data = root.TryGetProperty("data", out var dataElement)
                ? dataElement
                : root;

            if (string.Equals(type, "email.bounced", StringComparison.OrdinalIgnoreCase)
                || string.Equals(type, "email.complained", StringComparison.OrdinalIgnoreCase))
            {
                var reason = string.Equals(type, "email.bounced", StringComparison.OrdinalIgnoreCase)
                    ? CheckoutRecoveryStopReason.Bounced
                    : CheckoutRecoveryStopReason.Complained;
                var recipients = ReadStringArray(data, "to");
                if (recipients.Count == 0)
                {
                    var recipient = ReadString(data, "email");
                    if (string.IsNullOrWhiteSpace(recipient))
                    {
                        recipient = ReadString(data, "recipient");
                    }

                    if (!string.IsNullOrWhiteSpace(recipient))
                    {
                        recipients = [recipient];
                    }
                }

                var stoppedForRecipients = 0;

                foreach (var recipient in recipients)
                {
                    stoppedForRecipients += await checkoutRecoveryService.StopForRecipientEmailAsync(
                        recipient,
                        reason,
                        cancellationToken);
                }

                logger.LogInformation("Webhook Resend {Type} processado. Recoveries paradas: {Count}.", type, stoppedForRecipients);
                return Results.Ok();
            }

            if (!string.Equals(type, "email.received", StringComparison.OrdinalIgnoreCase))
            {
                return Results.Ok();
            }

            var from = ReadString(data, "from");
            var subject = ReadString(data, "subject");
            var to = ReadStringArray(data, "to");
            var stoppedForReply = await checkoutRecoveryService.StopForInboundReplyAsync(
                from,
                to,
                subject,
                cancellationToken);

            logger.LogInformation("Webhook inbound Resend processado. Recoveries paradas: {Count}.", stoppedForReply);
            return Results.Ok();
        })
        .WithName("ResendInboundWebhook");

        return app;
    }

    private static string BuildUnsubscribeResponse() =>
        """
<!doctype html>
<html lang="pt-BR">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Lembretes pausados</title>
<body style="font-family:Arial,sans-serif;background:#111;color:#f5f5f5;padding:32px">
  <main style="max-width:560px;margin:auto">
    <h1>Lembretes pausados</h1>
    <p>Voce nao recebera novos e-mails desta sequencia de checkout.</p>
  </main>
</body>
</html>
""";

    private static string ReadString(JsonElement element, string propertyName)
    {
        if (!element.TryGetProperty(propertyName, out var property))
        {
            return string.Empty;
        }

        return property.ValueKind == JsonValueKind.String
            ? property.GetString() ?? string.Empty
            : property.ToString();
    }

    private static IReadOnlyList<string> ReadStringArray(JsonElement element, string propertyName)
    {
        if (!element.TryGetProperty(propertyName, out var property))
        {
            return [];
        }

        if (property.ValueKind == JsonValueKind.String)
        {
            return [property.GetString() ?? string.Empty];
        }

        if (property.ValueKind != JsonValueKind.Array)
        {
            return [];
        }

        var result = new List<string>();
        foreach (var item in property.EnumerateArray())
        {
            if (item.ValueKind == JsonValueKind.String)
            {
                result.Add(item.GetString() ?? string.Empty);
            }
        }

        return result;
    }

    private static bool VerifyResendWebhook(HttpRequest request, string payload, ResendOptions options)
    {
        if (options.InboundWebhookDisableVerification)
        {
            return true;
        }

        var secret = options.InboundWebhookSecret;
        if (string.IsNullOrWhiteSpace(secret))
        {
            return false;
        }

        var querySecret = request.Query["secret"].ToString();
        if (!string.IsNullOrWhiteSpace(querySecret)
            && CryptographicOperations.FixedTimeEquals(
                Encoding.UTF8.GetBytes(querySecret),
                Encoding.UTF8.GetBytes(secret)))
        {
            return true;
        }

        var svixId = request.Headers["svix-id"].ToString();
        var svixTimestamp = request.Headers["svix-timestamp"].ToString();
        var svixSignature = request.Headers["svix-signature"].ToString();

        if (string.IsNullOrWhiteSpace(svixId)
            || string.IsNullOrWhiteSpace(svixTimestamp)
            || string.IsNullOrWhiteSpace(svixSignature))
        {
            return false;
        }

        var signedPayload = $"{svixId}.{svixTimestamp}.{payload}";
        var expected = ComputeSvixSignature(secret, signedPayload);
        var candidates = svixSignature
            .Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(x => x.StartsWith("v1,", StringComparison.OrdinalIgnoreCase) ? x[3..] : x);

        foreach (var candidate in candidates)
        {
            if (FixedTimeEqualsBase64(candidate, expected))
            {
                return true;
            }
        }

        return false;
    }

    private static byte[] ComputeSvixSignature(string secret, string signedPayload)
    {
        var normalized = secret.StartsWith("whsec_", StringComparison.OrdinalIgnoreCase)
            ? secret[6..]
            : secret;
        byte[] key;

        try
        {
            key = Convert.FromBase64String(normalized);
        }
        catch (FormatException)
        {
            key = Encoding.UTF8.GetBytes(normalized);
        }

        using var hmac = new HMACSHA256(key);
        return hmac.ComputeHash(Encoding.UTF8.GetBytes(signedPayload));
    }

    private static bool FixedTimeEqualsBase64(string candidate, byte[] expected)
    {
        try
        {
            var actual = Convert.FromBase64String(candidate);
            return actual.Length == expected.Length
                && CryptographicOperations.FixedTimeEquals(actual, expected);
        }
        catch (FormatException)
        {
            return false;
        }
    }
}

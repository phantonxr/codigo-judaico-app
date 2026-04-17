using System.Net;
using System.Net.Http.Json;
using CodigoJudaico.Api.Models;
using Microsoft.Extensions.Options;

namespace CodigoJudaico.Api.Services;

public sealed class AccessEmailService(
    IHttpClientFactory httpClientFactory,
    IOptions<ResendOptions> resendOptions,
    IOptions<StripeBillingOptions> stripeOptions,
    ILogger<AccessEmailService> logger)
{
    private readonly ResendOptions _resendOptions = resendOptions.Value;
    private readonly StripeBillingOptions _stripeOptions = stripeOptions.Value;

    public async Task SendAccessGrantedEmailAsync(
        AppUser user,
        string? plainPassword,
        CancellationToken cancellationToken)
    {
        if (!_resendOptions.Enabled)
        {
            logger.LogInformation("Envio de e-mail desabilitado; credenciais geradas para {Email}.", user.Email);
            return;
        }

        EnsureConfigured();

        var loginUrl = $"{_stripeOptions.FrontendBaseUrl.TrimEnd('/')}/login";
        var displayName = string.IsNullOrWhiteSpace(user.Name) ? "Aluno" : user.Name;

        var usingTemporaryPassword = !string.IsNullOrWhiteSpace(plainPassword);
        var passwordPlainTextBlock = usingTemporaryPassword
            ? $"Senha temporaria: {plainPassword}"
            : "Senha: use a senha criada no checkout.";
        var passwordHtmlBlock = usingTemporaryPassword
            ? $"<strong>Senha temporaria:</strong> {WebUtility.HtmlEncode(plainPassword)}<br />"
            : "<strong>Senha:</strong> use a senha criada no checkout.<br />";

        var subject = "Seu acesso ao Metodo Judaico foi liberado";
        var plainTextBody = $"""
Shalom, {displayName}.

Seu pagamento foi confirmado e seu acesso ja esta liberado.

E-mail: {user.Email}
{passwordPlainTextBlock}
Plano: {user.PlanName}

Entre por aqui:
{loginUrl}

Se nao encontrar este e-mail depois, confira sua caixa de spam.
""";

        var htmlBody = $"""
<p>Shalom, {WebUtility.HtmlEncode(displayName)}.</p>
<p>Seu pagamento foi confirmado e seu acesso ja esta liberado.</p>
<p><strong>E-mail:</strong> {WebUtility.HtmlEncode(user.Email)}<br />
{passwordHtmlBlock}<strong>Plano:</strong> {WebUtility.HtmlEncode(user.PlanName)}</p>
<p><a href="{WebUtility.HtmlEncode(loginUrl)}">Clique aqui para entrar no sistema</a>.</p>
<p>Se nao encontrar este e-mail depois, confira sua caixa de spam.</p>
""";

        var client = httpClientFactory.CreateClient("Resend");
        logger.LogInformation("Enviando e-mail via Resend para {Email}.", user.Email);
        using var response = await client.PostAsJsonAsync(
            "emails",
            new ResendSendEmailRequest(
                _resendOptions.From,
                [user.Email],
                subject,
                htmlBody,
                plainTextBody),
            cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            var errorBody = await response.Content.ReadAsStringAsync(cancellationToken);
            logger.LogError(
                "Falha ao enviar e-mail via Resend para {Email}. Status: {StatusCode}. Resposta: {ResponseBody}",
                user.Email,
                (int)response.StatusCode,
                errorBody);
            throw new InvalidOperationException("Falha ao enviar e-mail via Resend.");
        }

        var resendResponse =
            await response.Content.ReadFromJsonAsync<ResendSendEmailResponse>(cancellationToken: cancellationToken);

        logger.LogInformation(
            "E-mail via Resend enviado para {Email}. MessageId: {ResendMessageId}",
            user.Email,
            resendResponse?.Id ?? "desconhecido");
    }

    private void EnsureConfigured()
    {
        if (string.IsNullOrWhiteSpace(_resendOptions.ApiKey))
        {
            throw new InvalidOperationException("Resend:ApiKey nao configurado.");
        }

        if (string.IsNullOrWhiteSpace(_resendOptions.From))
        {
            throw new InvalidOperationException("Resend:From nao configurado.");
        }
    }

    private sealed record ResendSendEmailRequest(
        string From,
        string[] To,
        string Subject,
        string Html,
        string Text);

    private sealed record ResendSendEmailResponse(string? Id);
}

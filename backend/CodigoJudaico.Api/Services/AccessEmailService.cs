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

    public async Task SendAccountCreatedEmailAsync(
        AppUser user,
        CancellationToken cancellationToken)
    {
        if (!_resendOptions.Enabled)
        {
            logger.LogInformation("Envio de e-mail desabilitado; notificacao de conta criada nao enviada para {Email}.", user.Email);
            return;
        }

        EnsureConfigured();

        var displayName = string.IsNullOrWhiteSpace(user.Name) ? "Aluno" : user.Name;
        var planName = string.IsNullOrWhiteSpace(user.PlanName) ? "seu plano selecionado" : user.PlanName;
        var subject = "Sua conta no Metodo Judaico foi criada";
        var plainTextBody = $"""
Shalom, {displayName}.

Sua conta foi criada com sucesso.

E-mail: {user.Email}
Plano escolhido: {planName}

Agora falta apenas concluir o pagamento para liberar o acesso.
Assim que o Stripe confirmar, voce recebera outro e-mail informando que a assinatura foi ativada.
""";

        var htmlBody = $"""
<p>Shalom, {WebUtility.HtmlEncode(displayName)}.</p>
<p>Sua conta foi criada com sucesso.</p>
<p><strong>E-mail:</strong> {WebUtility.HtmlEncode(user.Email)}<br />
<strong>Plano escolhido:</strong> {WebUtility.HtmlEncode(planName)}</p>
<p>Agora falta apenas concluir o pagamento para liberar o acesso.</p>
<p>Assim que o Stripe confirmar, voce recebera outro e-mail informando que a assinatura foi ativada.</p>
""";

        await SendEmailAsync(user.Email, subject, htmlBody, plainTextBody, "conta criada", cancellationToken);
    }

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

        var subject = "Pagamento recebido: seu acesso ao Metodo Judaico foi liberado";
        var plainTextBody = $"""
Shalom, {displayName}.

Recebemos seu pagamento e seu acesso ja esta liberado.

E-mail: {user.Email}
{passwordPlainTextBlock}
Plano: {user.PlanName}

Entre por aqui:
{loginUrl}

Se nao encontrar este e-mail depois, confira sua caixa de spam.
""";

        var htmlBody = $"""
<p>Shalom, {WebUtility.HtmlEncode(displayName)}.</p>
<p>Recebemos seu pagamento e seu acesso ja esta liberado.</p>
<p><strong>E-mail:</strong> {WebUtility.HtmlEncode(user.Email)}<br />
{passwordHtmlBlock}<strong>Plano:</strong> {WebUtility.HtmlEncode(user.PlanName)}</p>
<p><a href="{WebUtility.HtmlEncode(loginUrl)}">Clique aqui para entrar no sistema</a>.</p>
<p>Se nao encontrar este e-mail depois, confira sua caixa de spam.</p>
""";

        await SendEmailAsync(user.Email, subject, htmlBody, plainTextBody, "acesso liberado", cancellationToken);
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

    private async Task SendEmailAsync(
        string recipientEmail,
        string subject,
        string htmlBody,
        string plainTextBody,
        string emailType,
        CancellationToken cancellationToken)
    {
        var client = httpClientFactory.CreateClient("Resend");
        logger.LogInformation("Enviando e-mail via Resend ({EmailType}) para {Email}.", emailType, recipientEmail);
        using var response = await client.PostAsJsonAsync(
            "emails",
            new ResendSendEmailRequest(
                _resendOptions.From,
                [recipientEmail],
                subject,
                htmlBody,
                plainTextBody),
            cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            var errorBody = await response.Content.ReadAsStringAsync(cancellationToken);
            logger.LogError(
                "Falha ao enviar e-mail via Resend ({EmailType}) para {Email}. Status: {StatusCode}. Resposta: {ResponseBody}",
                emailType,
                recipientEmail,
                (int)response.StatusCode,
                errorBody);
            throw new InvalidOperationException("Falha ao enviar e-mail via Resend.");
        }

        var resendResponse =
            await response.Content.ReadFromJsonAsync<ResendSendEmailResponse>(cancellationToken: cancellationToken);

        logger.LogInformation(
            "E-mail via Resend enviado ({EmailType}) para {Email}. MessageId: {ResendMessageId}",
            emailType,
            recipientEmail,
            resendResponse?.Id ?? "desconhecido");
    }

    private sealed record ResendSendEmailRequest(
        string From,
        string[] To,
        string Subject,
        string Html,
        string Text);

    private sealed record ResendSendEmailResponse(string? Id);
}

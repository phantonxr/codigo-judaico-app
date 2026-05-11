using System.Net;
using System.Net.Http.Json;
using System.Net.Mail;
using System.Text.Json.Serialization;
using CodigoJudaico.Api.Models;
using Microsoft.Extensions.Options;

namespace CodigoJudaico.Api.Services;

public sealed class AccessEmailService(
    IHttpClientFactory httpClientFactory,
    IOptions<ResendOptions> resendOptions,
    IOptions<CheckoutRecoveryOptions> checkoutRecoveryOptions,
    IOptions<StripeBillingOptions> stripeOptions,
    ILogger<AccessEmailService> logger)
{
    private readonly ResendOptions _resendOptions = resendOptions.Value;
    private readonly CheckoutRecoveryOptions _checkoutRecoveryOptions = checkoutRecoveryOptions.Value;
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

    public async Task SendPasswordResetEmailAsync(
        AppUser user,
        string resetToken,
        CancellationToken cancellationToken)
    {
        var displayName = string.IsNullOrWhiteSpace(user.Name) ? "Aluno" : user.Name;
        var frontendUrl = ResolveFrontendBaseUrl();
        var resetUrl = $"{frontendUrl.TrimEnd('/')}/reset-password?token={WebUtility.UrlEncode(resetToken)}";
        var subject = "Redefinicao de senha — Codigo Judaico da Prosperidade";
        var plainTextBody = $"""
Recebemos uma solicitacao para redefinir sua senha.

Clique no link abaixo para criar uma nova senha:
{resetUrl}

Se voce nao solicitou isso, ignore este e-mail.
""";

        var htmlBody = $"""
<p>Recebemos uma solicitacao para redefinir sua senha.</p>
<p><a href="{WebUtility.HtmlEncode(resetUrl)}">Clique no link para criar uma nova senha</a>.</p>
<p>Se voce nao solicitou isso, ignore este e-mail.</p>
""";

        if (IsSmtpConfigured())
        {
            await SendEmailViaSmtpAsync(user.Email, subject, htmlBody, plainTextBody, cancellationToken);
            return;
        }

        if (!_resendOptions.Enabled)
        {
            logger.LogInformation("Envio de e-mail desabilitado; recuperacao de senha nao enviada para {Email}.", user.Email);
            return;
        }

        EnsureConfigured();
        await SendEmailAsync(user.Email, subject, htmlBody, plainTextBody, "recuperacao de senha", cancellationToken);
    }

    public async Task<string?> SendCheckoutRecoveryPersuasiveEmailAsync(
        CheckoutRecovery recovery,
        string recoveryUrl,
        string unsubscribeUrl,
        string? replyTo,
        CancellationToken cancellationToken)
    {
        if (!_resendOptions.Enabled)
        {
            logger.LogInformation("Envio de e-mail desabilitado; recuperacao de checkout nao enviada para {Email}.", recovery.Email);
            return null;
        }

        EnsureConfigured();

        var displayName = string.IsNullOrWhiteSpace(recovery.User?.Name) ? "Aluno" : recovery.User.Name;
        var planName = string.IsNullOrWhiteSpace(recovery.PlanName) ? "o acesso ao Codigo Judaico" : recovery.PlanName;
        var subject = "Seu acesso ficou pendente";
        var footerText = BuildCommercialFooterText(unsubscribeUrl);
        var footerHtml = BuildCommercialFooterHtml(unsubscribeUrl);
        var plainTextBody = $"""
Shalom, {displayName}.

Vi que voce iniciou o checkout para {planName}, mas o pagamento ficou pendente.

Se a decisao ficou para depois, este e o link para continuar com seguranca:
{recoveryUrl}

O metodo dos 21 dias foi desenhado para comecar simples: uma acao por dia, leitura guiada e acompanhamento para identificar o gatilho que faz o dinheiro escapar.

Se tiver alguma duvida, responda este e-mail. Ao responder, a sequencia de lembretes para automaticamente.

{footerText}
""";

        var htmlBody = $"""
<p>Shalom, {WebUtility.HtmlEncode(displayName)}.</p>
<p>Vi que voce iniciou o checkout para <strong>{WebUtility.HtmlEncode(planName)}</strong>, mas o pagamento ficou pendente.</p>
<p>Se a decisao ficou para depois, este e o link para continuar com seguranca:</p>
<p><a href="{WebUtility.HtmlEncode(recoveryUrl)}">Continuar meu acesso</a></p>
<p>O metodo dos 21 dias foi desenhado para comecar simples: uma acao por dia, leitura guiada e acompanhamento para identificar o gatilho que faz o dinheiro escapar.</p>
<p>Se tiver alguma duvida, responda este e-mail. Ao responder, a sequencia de lembretes para automaticamente.</p>
{footerHtml}
""";

        return await SendEmailAsync(
            recovery.Email,
            subject,
            htmlBody,
            plainTextBody,
            "recuperacao checkout 24h",
            cancellationToken,
            replyTo,
            BuildUnsubscribeHeaders(unsubscribeUrl),
            openTracking: true);
    }

    public async Task<string?> SendCheckoutRecoveryDiscountEmailAsync(
        CheckoutRecovery recovery,
        string recoveryUrl,
        string unsubscribeUrl,
        string? replyTo,
        CancellationToken cancellationToken)
    {
        if (!_resendOptions.Enabled)
        {
            logger.LogInformation("Envio de e-mail desabilitado; cupom de recuperacao nao enviado para {Email}.", recovery.Email);
            return null;
        }

        EnsureConfigured();

        var displayName = string.IsNullOrWhiteSpace(recovery.User?.Name) ? "Aluno" : recovery.User.Name;
        var discountLabel = string.IsNullOrWhiteSpace(_checkoutRecoveryOptions.DiscountLabel)
            ? "uma condicao especial"
            : _checkoutRecoveryOptions.DiscountLabel;
        var discountCode = string.IsNullOrWhiteSpace(recovery.DiscountCode)
            ? "aplicado automaticamente no link"
            : recovery.DiscountCode;
        var expiration = recovery.DiscountExpiresAt?.ToLocalTime().ToString("g") ?? "em breve";
        var subject = "Separei uma condicao para voce concluir hoje";
        var footerText = BuildCommercialFooterText(unsubscribeUrl);
        var footerHtml = BuildCommercialFooterHtml(unsubscribeUrl);
        var plainTextBody = $"""
Shalom, {displayName}.

Seu checkout ainda esta pendente, entao separei {discountLabel} para voce concluir o acesso.

Cupom: {discountCode}
Valido ate: {expiration}

Use este link para continuar:
{recoveryUrl}

Se voce ja decidiu que nao e o momento, tudo bem. Responda este e-mail ou use o link abaixo para parar estes lembretes.

{footerText}
""";

        var htmlBody = $"""
<p>Shalom, {WebUtility.HtmlEncode(displayName)}.</p>
<p>Seu checkout ainda esta pendente, entao separei <strong>{WebUtility.HtmlEncode(discountLabel)}</strong> para voce concluir o acesso.</p>
<p><strong>Cupom:</strong> {WebUtility.HtmlEncode(discountCode)}<br />
<strong>Valido ate:</strong> {WebUtility.HtmlEncode(expiration)}</p>
<p><a href="{WebUtility.HtmlEncode(recoveryUrl)}">Concluir com a condicao especial</a></p>
<p>Se voce ja decidiu que nao e o momento, tudo bem. Responda este e-mail ou use o link abaixo para parar estes lembretes.</p>
{footerHtml}
""";

        return await SendEmailAsync(
            recovery.Email,
            subject,
            htmlBody,
            plainTextBody,
            "recuperacao checkout 48h cupom",
            cancellationToken,
            replyTo,
            BuildUnsubscribeHeaders(unsubscribeUrl),
            openTracking: true);
    }

    private string ResolveFrontendBaseUrl()
    {
        var fromEnv = Environment.GetEnvironmentVariable("FRONTEND_URL");
        if (!string.IsNullOrWhiteSpace(fromEnv))
            return fromEnv.Trim();

        return _stripeOptions.FrontendBaseUrl;
    }

    private static bool IsSmtpConfigured()
    {
        return !string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("SMTP_HOST"))
            && !string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("SMTP_FROM"));
    }

    private async Task SendEmailViaSmtpAsync(
        string recipientEmail,
        string subject,
        string htmlBody,
        string plainTextBody,
        CancellationToken cancellationToken)
    {
        var host = (Environment.GetEnvironmentVariable("SMTP_HOST") ?? string.Empty).Trim();
        var portRaw = (Environment.GetEnvironmentVariable("SMTP_PORT") ?? string.Empty).Trim();
        var user = (Environment.GetEnvironmentVariable("SMTP_USER") ?? string.Empty).Trim();
        var password = Environment.GetEnvironmentVariable("SMTP_PASSWORD") ?? string.Empty;
        var from = (Environment.GetEnvironmentVariable("SMTP_FROM") ?? string.Empty).Trim();

        if (string.IsNullOrWhiteSpace(host) || string.IsNullOrWhiteSpace(from))
        {
            throw new InvalidOperationException("SMTP nao configurado corretamente (SMTP_HOST/SMTP_FROM).");
        }

        var port = 587;
        if (int.TryParse(portRaw, out var parsedPort) && parsedPort > 0)
            port = parsedPort;

        using var message = new MailMessage();
        message.From = new MailAddress(from);
        message.To.Add(new MailAddress(recipientEmail));
        message.Subject = subject;
        message.Body = htmlBody;
        message.IsBodyHtml = true;

        if (!string.IsNullOrWhiteSpace(plainTextBody))
        {
            message.AlternateViews.Add(AlternateView.CreateAlternateViewFromString(plainTextBody, null, "text/plain"));
            message.AlternateViews.Add(AlternateView.CreateAlternateViewFromString(htmlBody, null, "text/html"));
        }

        using var client = new SmtpClient(host, port)
        {
            EnableSsl = true,
        };

        if (!string.IsNullOrWhiteSpace(user))
        {
            client.Credentials = new NetworkCredential(user, password);
        }

        logger.LogInformation("Enviando e-mail via SMTP para {Email}.", recipientEmail);

        // SmtpClient doesn't support CancellationToken; best-effort.
        await client.SendMailAsync(message);
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

    private async Task<string?> SendEmailAsync(
        string recipientEmail,
        string subject,
        string htmlBody,
        string plainTextBody,
        string emailType,
        CancellationToken cancellationToken,
        string? replyTo = null,
        Dictionary<string, string>? headers = null,
        bool openTracking = false)
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
                plainTextBody,
                string.IsNullOrWhiteSpace(replyTo) ? null : replyTo,
                headers,
                openTracking),
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

        return resendResponse?.Id;
    }

    private Dictionary<string, string> BuildUnsubscribeHeaders(string unsubscribeUrl) =>
        new()
        {
            ["List-Unsubscribe"] = $"<{unsubscribeUrl}>",
            ["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click",
        };

    private string BuildCommercialFooterText(string unsubscribeUrl)
    {
        var postalAddress = string.IsNullOrWhiteSpace(_checkoutRecoveryOptions.PublicPostalAddress)
            ? "Endereco postal nao configurado."
            : _checkoutRecoveryOptions.PublicPostalAddress;

        return $"""
Para parar estes lembretes, acesse:
{unsubscribeUrl}

{_checkoutRecoveryOptions.CompanyName}
{postalAddress}
""";
    }

    private string BuildCommercialFooterHtml(string unsubscribeUrl)
    {
        var postalAddress = string.IsNullOrWhiteSpace(_checkoutRecoveryOptions.PublicPostalAddress)
            ? "Endereco postal nao configurado."
            : _checkoutRecoveryOptions.PublicPostalAddress;

        return $"""
<hr />
<p style="font-size:12px;color:#666">
  <a href="{WebUtility.HtmlEncode(unsubscribeUrl)}">Parar estes lembretes</a><br />
  {WebUtility.HtmlEncode(_checkoutRecoveryOptions.CompanyName)}<br />
  {WebUtility.HtmlEncode(postalAddress)}
</p>
""";
    }

    private sealed record ResendSendEmailRequest(
        string From,
        string[] To,
        string Subject,
        string Html,
        string Text,
        [property: JsonPropertyName("reply_to")]
        [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        string? ReplyTo = null,
        [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        Dictionary<string, string>? Headers = null,
        [property: JsonPropertyName("open_tracking")]
        bool OpenTracking = false);

    private sealed record ResendSendEmailResponse(string? Id);
}

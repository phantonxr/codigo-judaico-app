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
        var subject = "Sua conta no Método Judaico foi criada";
        var plainTextBody = $"""
Shalom, {displayName}.

Sua conta foi criada com sucesso.

E-mail: {user.Email}
Plano escolhido: {planName}

Agora falta apenas concluir o pagamento para liberar o acesso.
Assim que o Stripe confirmar, você receberá outro e-mail informando que a assinatura foi ativada.
""";

        var htmlBody = $"""
<p>Shalom, {WebUtility.HtmlEncode(displayName)}.</p>
<p>Sua conta foi criada com sucesso.</p>
<p><strong>E-mail:</strong> {WebUtility.HtmlEncode(user.Email)}<br />
<strong>Plano escolhido:</strong> {WebUtility.HtmlEncode(planName)}</p>
<p>Agora falta apenas concluir o pagamento para liberar o acesso.</p>
<p>Assim que o Stripe confirmar, você receberá outro e-mail informando que a assinatura foi ativada.</p>
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

        var subject = "Pagamento recebido: seu acesso ao Método Judaico foi liberado";
        var plainTextBody = $"""
Shalom, {displayName}.

Recebemos seu pagamento e seu acesso já está liberado.

E-mail: {user.Email}
{passwordPlainTextBlock}
Plano: {user.PlanName}

Entre por aqui:
{loginUrl}

Se não encontrar este e-mail, confira sua caixa de spam.
""";

        var htmlBody = $"""
<p>Shalom, {WebUtility.HtmlEncode(displayName)}.</p>
<p>Recebemos seu pagamento e seu acesso já está liberado.</p>
<p><strong>E-mail:</strong> {WebUtility.HtmlEncode(user.Email)}<br />
{passwordHtmlBlock}<strong>Plano:</strong> {WebUtility.HtmlEncode(user.PlanName)}</p>
<p><a href="{WebUtility.HtmlEncode(loginUrl)}">Clique aqui para entrar no sistema</a>.</p>
<p>Se não encontrar este e-mail, confira sua caixa de spam.</p>
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
        var subject = "Redefinição de senha — Código Judaico da Prosperidade";
        var plainTextBody = $"""
Recebemos uma solicitação para redefinir sua senha.

Clique no link abaixo para criar uma nova senha:
{resetUrl}

Se você não solicitou isso, ignore este e-mail.
""";

        var htmlBody = $"""
<p>Recebemos uma solicitação para redefinir sua senha.</p>
<p><a href="{WebUtility.HtmlEncode(resetUrl)}">Clique no link para criar uma nova senha</a>.</p>
<p>Se você não solicitou isso, ignore este e-mail.</p>
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
        var planName = string.IsNullOrWhiteSpace(recovery.PlanName) ? "o acesso ao Código Judaico" : recovery.PlanName;
        var subject = "Você sabe o que faz seu dinheiro escapar?";
        var footerText = BuildCommercialFooterText(unsubscribeUrl);
        var footerHtml = BuildCommercialFooterHtml(unsubscribeUrl);
        var plainTextBody = $"""
Shalom, {displayName}.

Você iniciou o checkout para {planName}, mas o pagamento ficou pendente.

Pode ter sido um impulso de frear. Ansiedade. Comparação. Medo de errar.

Esses são os gatilhos invisíveis que o Método Judaico foi criado para identificar — e quebrar — nos primeiros 21 dias.

O que espera por você:
- Uma ação por dia, simples e direta
- Diagnóstico do seu perfil financeiro (impulso, status ou escassez)
- Leitura guiada com princípios do Talmude
- Rabino Mentor para acompanhar cada etapa

Mais de 1.200 pessoas já iniciaram essa jornada.

Continue por aqui:
{recoveryUrl}

Qualquer dúvida, responda este e-mail. Ao responder, a sequência de lembretes para automaticamente.

{footerText}
""";

        var htmlBody = $"""
<div style="font-family: Georgia, 'Times New Roman', serif; max-width: 580px; margin: 0 auto; color: #1a1a1a; line-height: 1.7;">

  <p style="font-size: 16px;">Shalom, <strong>{WebUtility.HtmlEncode(displayName)}</strong>.</p>

  <p style="font-size: 16px;">
    Você iniciou o checkout para <strong>{WebUtility.HtmlEncode(planName)}</strong>, mas o pagamento ficou pendente.
  </p>

  <p style="font-size: 16px;">
    Pode ter sido um impulso de frear. Ansiedade. Comparação. Medo de errar.
  </p>

  <p style="font-size: 16px;">
    Esses são os <strong>gatilhos invisíveis</strong> que o Método Judaico foi criado para identificar — e quebrar — nos primeiros 21 dias:
  </p>

  <ul style="font-size: 15px; padding-left: 20px; color: #333;">
    <li style="margin-bottom: 6px;">Uma ação por dia, simples e direta</li>
    <li style="margin-bottom: 6px;">Diagnóstico do seu perfil financeiro (impulso, status ou escassez)</li>
    <li style="margin-bottom: 6px;">Leitura guiada com princípios do Talmude</li>
    <li style="margin-bottom: 6px;">Rabino Mentor para acompanhar cada etapa</li>
  </ul>

  <p style="font-size: 14px; color: #666; font-style: italic; border-left: 3px solid #c9a84c; padding-left: 14px; margin: 24px 0;">
    Mais de 1.200 pessoas já iniciaram essa jornada.
  </p>

  <p style="text-align: center; margin: 32px 0;">
    <a href="{WebUtility.HtmlEncode(recoveryUrl)}"
       style="display: inline-block; background-color: #1a3a2a; color: #c9a84c; padding: 14px 32px; text-decoration: none; font-size: 16px; font-weight: bold; border-radius: 4px; letter-spacing: 0.5px;">
      Continuar meu acesso
    </a>
  </p>

  <p style="font-size: 15px; color: #555;">
    Qualquer dúvida, responda este e-mail. Ao responder, a sequência de lembretes para automaticamente.
  </p>

</div>
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
            openTracking: true,
            clickTracking: true);
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
            ? "uma condição especial"
            : _checkoutRecoveryOptions.DiscountLabel;
        var discountCode = string.IsNullOrWhiteSpace(recovery.DiscountCode)
            ? "aplicado automaticamente no link"
            : recovery.DiscountCode;
        var expiration = recovery.DiscountExpiresAt?.ToLocalTime().ToString("g") ?? "em breve";
        var subject = "Condição especial separada — expira em breve";
        var footerText = BuildCommercialFooterText(unsubscribeUrl);
        var footerHtml = BuildCommercialFooterHtml(unsubscribeUrl);
        var plainTextBody = $"""
Shalom, {displayName}.

Seu checkout ainda está pendente. Por isso separei {discountLabel} para você concluir hoje.

Cupom: {discountCode}
Válido até: {expiration}

Cada dia sem identificar seus gatilhos financeiros é um dia em que eles continuam no comando.

O Método Judaico dos 21 dias muda isso: diagnóstico do seu perfil, uma ação por dia e o Rabino Mentor para que você pare de perder dinheiro sem saber por quê.

"Quem governa seus impulsos é mais forte do que quem conquista cidades." — Talmude

Use este link com a condição especial aplicada:
{recoveryUrl}

Se você já decidiu que não é o momento, tudo bem. Responda este e-mail ou use o link abaixo para parar estes lembretes.

{footerText}
""";

        var htmlBody = $"""
<div style="font-family: Georgia, 'Times New Roman', serif; max-width: 580px; margin: 0 auto; color: #1a1a1a; line-height: 1.7;">

  <p style="font-size: 16px;">Shalom, <strong>{WebUtility.HtmlEncode(displayName)}</strong>.</p>

  <p style="font-size: 16px;">
    Seu checkout ainda está pendente. Por isso separei <strong>{WebUtility.HtmlEncode(discountLabel)}</strong> para você concluir hoje.
  </p>

  <div style="background: #f9f6ef; border: 1px solid #c9a84c; border-radius: 6px; padding: 18px 22px; margin: 24px 0;">
    <p style="margin: 0 0 4px; font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 1px;">Cupom de desconto</p>
    <p style="margin: 0 0 10px; font-size: 24px; font-weight: bold; letter-spacing: 3px; color: #1a3a2a;">{WebUtility.HtmlEncode(discountCode)}</p>
    <p style="margin: 0; font-size: 13px; color: #888;">Válido até: <strong>{WebUtility.HtmlEncode(expiration)}</strong></p>
  </div>

  <p style="font-size: 16px;">
    Cada dia sem identificar seus gatilhos financeiros é um dia em que eles continuam no comando.
  </p>

  <p style="font-size: 16px;">
    O Método Judaico dos 21 dias muda isso: diagnóstico do seu perfil, uma ação por dia e o Rabino Mentor para que você pare de perder dinheiro sem saber por quê.
  </p>

  <blockquote style="font-style: italic; color: #555; border-left: 3px solid #c9a84c; padding: 8px 0 8px 16px; margin: 24px 0; font-size: 15px;">
    "Quem governa seus impulsos é mais forte do que quem conquista cidades."<br />
    <span style="font-size: 13px; color: #888;">— Talmude</span>
  </blockquote>

  <p style="text-align: center; margin: 32px 0;">
    <a href="{WebUtility.HtmlEncode(recoveryUrl)}"
       style="display: inline-block; background-color: #1a3a2a; color: #c9a84c; padding: 14px 32px; text-decoration: none; font-size: 16px; font-weight: bold; border-radius: 4px; letter-spacing: 0.5px;">
      Concluir com condição especial
    </a>
  </p>

  <p style="font-size: 15px; color: #555;">
    Se você já decidiu que não é o momento, tudo bem. Responda este e-mail ou use o link abaixo para parar estes lembretes.
  </p>

</div>
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
            openTracking: true,
            clickTracking: true);
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
        bool openTracking = false,
        bool clickTracking = false)
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
                openTracking,
                clickTracking),
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
            ? "Endereço postal não configurado."
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
            ? "Endereço postal não configurado."
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
        bool OpenTracking = false,
        [property: JsonPropertyName("click_tracking")]
        bool ClickTracking = false);

    private sealed record ResendSendEmailResponse(string? Id);
}

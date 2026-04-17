using System.Net;
using System.Net.Mail;
using CodigoJudaico.Api.Models;
using Microsoft.Extensions.Options;

namespace CodigoJudaico.Api.Services;

public sealed class AccessEmailService(
    IOptions<EmailOptions> emailOptions,
    IOptions<StripeBillingOptions> stripeOptions,
    ILogger<AccessEmailService> logger)
{
    private readonly EmailOptions _emailOptions = emailOptions.Value;
    private readonly StripeBillingOptions _stripeOptions = stripeOptions.Value;

    public async Task SendAccessGrantedEmailAsync(
        AppUser user,
        string plainPassword,
        CancellationToken cancellationToken)
    {
        if (!_emailOptions.Enabled)
        {
            logger.LogInformation("Envio de e-mail desabilitado; credenciais geradas para {Email}.", user.Email);
            return;
        }

        EnsureConfigured();

        var loginUrl = $"{_stripeOptions.FrontendBaseUrl.TrimEnd('/')}/login";
        var displayName = string.IsNullOrWhiteSpace(user.Name) ? "Aluno" : user.Name;

        var subject = "Seu acesso ao Metodo Judaico foi liberado";
        var plainTextBody = $"""
Shalom, {displayName}.

Seu pagamento foi confirmado e seu acesso ja esta liberado.

E-mail: {user.Email}
Senha temporaria: {plainPassword}
Plano: {user.PlanName}

Entre por aqui:
{loginUrl}

Se nao encontrar este e-mail depois, confira sua caixa de spam.
""";

        var htmlBody = $"""
<p>Shalom, {WebUtility.HtmlEncode(displayName)}.</p>
<p>Seu pagamento foi confirmado e seu acesso ja esta liberado.</p>
<p><strong>E-mail:</strong> {WebUtility.HtmlEncode(user.Email)}<br />
<strong>Senha temporaria:</strong> {WebUtility.HtmlEncode(plainPassword)}<br />
<strong>Plano:</strong> {WebUtility.HtmlEncode(user.PlanName)}</p>
<p><a href="{WebUtility.HtmlEncode(loginUrl)}">Clique aqui para entrar no sistema</a>.</p>
<p>Se nao encontrar este e-mail depois, confira sua caixa de spam.</p>
""";

        using var message = new MailMessage
        {
            From = new MailAddress(_emailOptions.FromEmail, _emailOptions.FromName),
            Subject = subject,
            Body = plainTextBody,
            IsBodyHtml = false,
        };

        message.To.Add(user.Email);
        message.AlternateViews.Add(
            AlternateView.CreateAlternateViewFromString(htmlBody, null, "text/html"));

        using var smtp = new SmtpClient(_emailOptions.Host, _emailOptions.Port)
        {
            EnableSsl = _emailOptions.EnableSsl,
        };

        if (!string.IsNullOrWhiteSpace(_emailOptions.Username))
        {
            smtp.Credentials = new NetworkCredential(_emailOptions.Username, _emailOptions.Password);
        }

        await smtp.SendMailAsync(message, cancellationToken);
    }

    private void EnsureConfigured()
    {
        if (string.IsNullOrWhiteSpace(_emailOptions.Host))
        {
            throw new InvalidOperationException("Email:Host nao configurado.");
        }

        if (string.IsNullOrWhiteSpace(_emailOptions.FromEmail))
        {
            throw new InvalidOperationException("Email:FromEmail nao configurado.");
        }
    }
}

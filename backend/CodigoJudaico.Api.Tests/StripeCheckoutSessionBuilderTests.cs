using CodigoJudaico.Api.Services;

namespace CodigoJudaico.Api.Tests;

public sealed class StripeCheckoutSessionBuilderTests
{
    [Fact]
    public void BuildMetadata_ThrowsClearErrorWhenPaymentCoreFieldIsMissing()
    {
        var plan = new StripePlanDefinition("mensal", "Premium Mensal", "price_123", string.Empty);
        var paymentCoreMetadata = new PaymentCoreCheckoutMetadata(
            AppId: "codigo-judaico",
            AppName: "Codigo Judaico",
            TenantId: string.Empty,
            SellerId: "seller-1",
            SellerName: "Codigo Judaico",
            OrderId: "codigo-judaico-order-1");

        var exception = Assert.Throws<InvalidOperationException>(() =>
            StripeCheckoutSessionBuilder.BuildMetadata(
                "codigo-judaico",
                "acct_ca",
                "brl",
                "aluno@exemplo.com",
                "Aluno",
                plan,
                paymentCoreMetadata));

        Assert.Contains("tenant_id", exception.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void BuildOneTimePaymentSessionOptions_WithConnectSplit_KeepsMetadataAndConnectFields()
    {
        var metadata = BuildMetadata();
        var plan = new StripePlanDefinition("vitalicio", "Acesso Vitalicio", "price_123", string.Empty, IsOneTimePayment: true);

        var options = StripeCheckoutSessionBuilder.BuildOneTimePaymentSessionOptions(
            "aluno@exemplo.com",
            "https://app.exemplo.com",
            metadata,
            plan,
            feeAmount: 497,
            connectedAccountId: "acct_ca",
            routing: new StripeConnectRouting("ca", UseConnectSplit: true));

        Assert.Equal("payment", options.Mode);
        Assert.Equal("https://app.exemplo.com/checkout/sucesso?session_id={CHECKOUT_SESSION_ID}", options.SuccessUrl);
        Assert.Equal("https://app.exemplo.com/checkout/cancelado", options.CancelUrl);
        Assert.Single(options.LineItems);
        Assert.Same(metadata, options.Metadata);
        Assert.NotNull(options.PaymentIntentData);
        Assert.Same(metadata, options.PaymentIntentData.Metadata);
        Assert.Equal(497, options.PaymentIntentData.ApplicationFeeAmount);
        Assert.Equal("acct_ca", options.PaymentIntentData.TransferData?.Destination);
    }

    [Fact]
    public void BuildOneTimePaymentSessionOptions_ForBrazilConnectedAccount_RemovesConnectFields()
    {
        var metadata = BuildMetadata();
        var plan = new StripePlanDefinition("primeiro-acesso", "Primeiro Acesso", "price_123", string.Empty, IsOneTimePayment: true);

        var options = StripeCheckoutSessionBuilder.BuildOneTimePaymentSessionOptions(
            "aluno@exemplo.com",
            "https://app.exemplo.com",
            metadata,
            plan,
            feeAmount: 29,
            connectedAccountId: "acct_br",
            routing: new StripeConnectRouting("br", UseConnectSplit: false));

        Assert.Equal("payment", options.Mode);
        Assert.NotNull(options.PaymentIntentData);
        Assert.Same(metadata, options.PaymentIntentData.Metadata);
        Assert.Null(options.PaymentIntentData.ApplicationFeeAmount);
        Assert.Null(options.PaymentIntentData.TransferData);
    }

    [Fact]
    public void BuildSubscriptionSessionOptions_ForBrazilConnectedAccount_RemovesConnectFieldsButKeepsMetadata()
    {
        var metadata = BuildMetadata();
        var plan = new StripePlanDefinition("mensal", "Premium Mensal", "price_123", string.Empty);

        var options = StripeCheckoutSessionBuilder.BuildSubscriptionSessionOptions(
            "aluno@exemplo.com",
            "https://app.exemplo.com",
            metadata,
            plan,
            platformRetentionPercent: 2m,
            connectedAccountId: "acct_br",
            routing: new StripeConnectRouting("br", UseConnectSplit: false));

        Assert.Equal("subscription", options.Mode);
        Assert.Equal("https://app.exemplo.com/checkout/sucesso?session_id={CHECKOUT_SESSION_ID}", options.SuccessUrl);
        Assert.Equal("https://app.exemplo.com/checkout/cancelado", options.CancelUrl);
        Assert.Single(options.LineItems);
        Assert.Same(metadata, options.Metadata);
        Assert.NotNull(options.SubscriptionData);
        Assert.Same(metadata, options.SubscriptionData.Metadata);
        Assert.Null(options.SubscriptionData.ApplicationFeePercent);
        Assert.Null(options.SubscriptionData.TransferData);
    }

    private static Dictionary<string, string> BuildMetadata()
    {
        var plan = new StripePlanDefinition("mensal", "Premium Mensal", "price_123", string.Empty);
        var paymentCoreMetadata = new PaymentCoreCheckoutMetadata(
            AppId: "codigo-judaico",
            AppName: "Codigo Judaico",
            TenantId: "tenant-1",
            SellerId: "seller-1",
            SellerName: "Codigo Judaico",
            OrderId: "codigo-judaico-order-1");

        return StripeCheckoutSessionBuilder.BuildMetadata(
            "codigo-judaico",
            "acct_ca",
            "brl",
            "aluno@exemplo.com",
            "Aluno",
            plan,
            paymentCoreMetadata);
    }
}

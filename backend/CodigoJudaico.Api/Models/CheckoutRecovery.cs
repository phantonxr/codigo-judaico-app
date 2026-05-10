namespace CodigoJudaico.Api.Models;

public sealed class CheckoutRecovery
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Email { get; set; } = string.Empty;
    public string PlanId { get; set; } = string.Empty;
    public string PlanName { get; set; } = string.Empty;
    public string OriginalStripeCheckoutSessionId { get; set; } = string.Empty;
    public string LastStripeCheckoutSessionId { get; set; } = string.Empty;
    public string Status { get; set; } = CheckoutRecoveryStatus.Pending;
    public string NextEmailStep { get; set; } = CheckoutRecoveryStep.Persuasive24h;
    public DateTimeOffset CheckoutCreatedAt { get; set; }
    public DateTimeOffset NextSendAt { get; set; }
    public DateTimeOffset? LastSentAt { get; set; }
    public DateTimeOffset? PersuasiveEmailSentAt { get; set; }
    public DateTimeOffset? DiscountEmailSentAt { get; set; }
    public int SentCount { get; set; }
    public string RecoveryTokenHash { get; set; } = string.Empty;
    public DateTimeOffset? RecoveryTokenExpiresAt { get; set; }
    public string UnsubscribeTokenHash { get; set; } = string.Empty;
    public DateTimeOffset? UnsubscribeTokenExpiresAt { get; set; }
    public string DiscountCode { get; set; } = string.Empty;
    public string StripePromotionCodeId { get; set; } = string.Empty;
    public DateTimeOffset? DiscountExpiresAt { get; set; }
    public DateTimeOffset? CompletedAt { get; set; }
    public DateTimeOffset? StoppedAt { get; set; }
    public string StopReason { get; set; } = string.Empty;
    public DateTimeOffset? ReplyReceivedAt { get; set; }
    public string ReplyFrom { get; set; } = string.Empty;
    public string ReplySubject { get; set; } = string.Empty;
    public DateTimeOffset? UnsubscribedAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public AppUser User { get; set; } = null!;
}

public static class CheckoutRecoveryStatus
{
    public const string Pending = "pending";
    public const string Completed = "completed";
    public const string Stopped = "stopped";
    public const string SequenceCompleted = "sequence_completed";
}

public static class CheckoutRecoveryStep
{
    public const string Persuasive24h = "persuasive_24h";
    public const string Discount48h = "discount_48h";
    public const string Done = "done";
}

public static class CheckoutRecoveryStopReason
{
    public const string Purchased = "purchased";
    public const string Replied = "replied";
    public const string Unsubscribed = "unsubscribed";
    public const string Bounced = "bounced";
    public const string Complained = "complained";
    public const string NoLongerPending = "no_longer_pending";
}

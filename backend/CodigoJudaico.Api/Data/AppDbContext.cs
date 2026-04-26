using CodigoJudaico.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace CodigoJudaico.Api.Data;

public sealed class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<AppUser> Users => Set<AppUser>();
    public DbSet<AppSession> AppSessions => Set<AppSession>();
    public DbSet<UserDiagnosis> UserDiagnoses => Set<UserDiagnosis>();
    public DbSet<UserJourneyState> UserJourneyStates => Set<UserJourneyState>();
    public DbSet<UserLessonProgress> UserLessonProgressEntries => Set<UserLessonProgress>();
    public DbSet<MentorChatMessage> MentorChatMessages => Set<MentorChatMessage>();
    public DbSet<MentorDailyFeedback> MentorDailyFeedbacks => Set<MentorDailyFeedback>();
    public DbSet<MentorFinalReport> MentorFinalReports => Set<MentorFinalReport>();
    public DbSet<MentorUsage> MentorUsages => Set<MentorUsage>();
    public DbSet<UserSubscription> Subscriptions => Set<UserSubscription>();
    public DbSet<PasswordResetToken> PasswordResetTokens => Set<PasswordResetToken>();
    public DbSet<Lesson> Lessons => Set<Lesson>();
    public DbSet<Plan> Plans => Set<Plan>();
    public DbSet<Offer> Offers => Set<Offer>();
    public DbSet<WisdomSnippet> WisdomSnippets => Set<WisdomSnippet>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<AppUser>(entity =>
        {
            entity.ToTable("app_users");
            entity.HasKey(x => x.Id);
            entity.HasIndex(x => x.Email).IsUnique();
            entity.Property(x => x.Email).HasMaxLength(320);
            entity.Property(x => x.Name).HasMaxLength(120);
            entity.Property(x => x.PasswordHash).HasMaxLength(400);
            entity.Property(x => x.PasswordResetTokenHash).HasMaxLength(128);
            entity.Property(x => x.PlanName).HasMaxLength(120);
            entity.Property(x => x.PlanStatus).HasMaxLength(40);
            entity.Property(x => x.StripeCustomerId).HasMaxLength(120);
            entity.Property(x => x.StripeSubscriptionId).HasMaxLength(120);
            entity.Property(x => x.LastStripeCheckoutSessionId).HasMaxLength(120);
            entity.Property(x => x.UtmSource).HasMaxLength(100);
            entity.Property(x => x.UtmMedium).HasMaxLength(100);
            entity.Property(x => x.UtmCampaign).HasMaxLength(200);
            entity.Property(x => x.UtmTerm).HasMaxLength(200);
            entity.Property(x => x.UtmContent).HasMaxLength(200);
        });

        modelBuilder.Entity<AppSession>(entity =>
        {
            entity.ToTable("app_sessions");
            entity.HasKey(x => x.Id);
            entity.HasIndex(x => x.TokenHash).IsUnique();
            entity.HasIndex(x => new { x.UserId, x.ExpiresAt });
            entity.Property(x => x.TokenHash).HasMaxLength(128);
            entity.HasOne(x => x.User)
                .WithMany(x => x.Sessions)
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<UserDiagnosis>(entity =>
        {
            entity.ToTable("user_diagnoses");
            entity.HasKey(x => x.UserId);
            entity.Property(x => x.TrackId).HasMaxLength(40);
            entity.Property(x => x.TrackLabel).HasMaxLength(120);
            entity.Property(x => x.ScoresJson).HasColumnType("jsonb");
            entity.HasOne(x => x.User)
                .WithOne(x => x.Diagnosis)
                .HasForeignKey<UserDiagnosis>(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<UserJourneyState>(entity =>
        {
            entity.ToTable("user_journey_states");
            entity.HasKey(x => x.UserId);
            entity.Property(x => x.AssignedTrack).HasMaxLength(40);
            entity.Property(x => x.ProgressJson).HasColumnType("jsonb");
            entity.Property(x => x.CalendarJson).HasColumnType("jsonb");
            entity.HasOne(x => x.User)
                .WithOne(x => x.JourneyState)
                .HasForeignKey<UserJourneyState>(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<UserLessonProgress>(entity =>
        {
            entity.ToTable("user_lesson_progress");
            entity.HasKey(x => new { x.UserId, x.LessonId });
            entity.Property(x => x.LessonId).HasMaxLength(120);
            entity.HasOne(x => x.User)
                .WithMany(x => x.LessonProgressEntries)
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<MentorChatMessage>(entity =>
        {
            entity.ToTable("mentor_chat_messages");
            entity.HasKey(x => x.Id);
            entity.HasIndex(x => new { x.UserId, x.CreatedAt });
            entity.Property(x => x.Role).HasMaxLength(20);
            entity.Property(x => x.Content).HasColumnType("text");
            entity.HasOne(x => x.User)
                .WithMany(x => x.MentorMessages)
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<MentorDailyFeedback>(entity =>
        {
            entity.ToTable("mentor_daily_feedbacks");
            entity.HasKey(x => x.Id);
            entity.HasIndex(x => new { x.UserId, x.Phase, x.DayNumber });
            entity.Property(x => x.Phase).HasMaxLength(80);
            entity.Property(x => x.DetectedEmotion).HasMaxLength(80);
            entity.Property(x => x.TriggerType).HasMaxLength(120);
            entity.Property(x => x.ObservedPattern).HasMaxLength(160);
            entity.Property(x => x.DetectedTrigger).HasMaxLength(500);
            entity.Property(x => x.EmotionalPattern).HasMaxLength(700);
            entity.Property(x => x.FinancialRisk).HasMaxLength(700);
            entity.Property(x => x.JewishWisdom).HasColumnType("text");
            entity.Property(x => x.PracticalAction).HasColumnType("text");
            entity.Property(x => x.FeedbackText).HasColumnType("text");
            entity.HasOne(x => x.User)
                .WithMany()
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<MentorFinalReport>(entity =>
        {
            entity.ToTable("mentor_final_reports");
            entity.HasKey(x => x.Id);
            entity.HasIndex(x => new { x.UserId, x.CreatedAt });
            entity.Property(x => x.ReportText).HasColumnType("text");
            entity.Property(x => x.TopTriggersJson).HasColumnType("jsonb");
            entity.Property(x => x.EmotionalPattern).HasColumnType("text");
            entity.Property(x => x.FinancialRiskPattern).HasColumnType("text");
            entity.Property(x => x.NextStepRecommendation).HasColumnType("text");
            entity.HasOne(x => x.User)
                .WithMany()
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<MentorUsage>(entity =>
        {
            entity.ToTable("mentor_usage");
            entity.HasKey(x => x.Id);
            entity.HasIndex(x => new { x.UserId, x.Date }).IsUnique();
            entity.Property(x => x.PlanType).HasMaxLength(60);
            entity.HasOne(x => x.User)
                .WithMany()
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<UserSubscription>(entity =>
        {
            entity.ToTable("subscriptions");
            entity.HasKey(x => x.Id);
            entity.HasIndex(x => new { x.UserId, x.PlanType, x.Status });
            entity.Property(x => x.PlanName).HasMaxLength(160);
            entity.Property(x => x.PlanType).HasMaxLength(60);
            entity.Property(x => x.Status).HasMaxLength(40);
            entity.Property(x => x.Price).HasMaxLength(80);
            entity.Property(x => x.CheckoutUrl).HasMaxLength(800);
            entity.HasOne(x => x.User)
                .WithMany()
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<PasswordResetToken>(entity =>
        {
            entity.ToTable("password_reset_tokens");
            entity.HasKey(x => x.Id);
            entity.HasIndex(x => x.TokenHash).IsUnique();
            entity.HasIndex(x => new { x.UserId, x.ExpiresAt });
            entity.Property(x => x.TokenHash).HasMaxLength(128);
            entity.HasOne(x => x.User)
                .WithMany()
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Lesson>(entity =>
        {
            entity.ToTable("lessons");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasMaxLength(120);
            entity.Property(x => x.Title).HasMaxLength(200);
            entity.Property(x => x.Category).HasMaxLength(120);
            entity.Property(x => x.Duration).HasMaxLength(50);
            entity.Property(x => x.VideoUrl).HasMaxLength(500);
        });

        modelBuilder.Entity<Plan>(entity =>
        {
            entity.ToTable("plans");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasMaxLength(120);
            entity.Property(x => x.Name).HasMaxLength(120);
            entity.Property(x => x.Price).HasMaxLength(80);
            entity.Property(x => x.Period).HasMaxLength(120);
            entity.Property(x => x.FeaturesJson).HasColumnType("jsonb");
        });

        modelBuilder.Entity<Offer>(entity =>
        {
            entity.ToTable("offers");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasMaxLength(120);
            entity.Property(x => x.Title).HasMaxLength(160);
            entity.Property(x => x.Price).HasMaxLength(80);
            entity.Property(x => x.CtaLabel).HasMaxLength(120);
            entity.Property(x => x.CtaHref).HasMaxLength(500);
        });

        modelBuilder.Entity<WisdomSnippet>(entity =>
        {
            entity.ToTable("wisdom_snippets");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasMaxLength(120);
            entity.Property(x => x.Source).HasMaxLength(160);
        });
    }
}

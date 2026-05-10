using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;

namespace CodigoJudaico.Api.Services;

public sealed class CheckoutRecoveryBackgroundService(
    IServiceScopeFactory scopeFactory,
    IOptions<CheckoutRecoveryOptions> options,
    ILogger<CheckoutRecoveryBackgroundService> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            var recoveryOptions = options.Value;
            var interval = TimeSpan.FromMinutes(Math.Clamp(recoveryOptions.ScanIntervalMinutes, 1, 60));

            try
            {
                if (recoveryOptions.Enabled)
                {
                    await using var scope = scopeFactory.CreateAsyncScope();
                    var service = scope.ServiceProvider.GetRequiredService<CheckoutRecoveryService>();
                    await service.ProcessDueRecoveriesAsync(stoppingToken);
                }
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                return;
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Falha no job de recuperacao de checkout.");
            }

            await Task.Delay(interval, stoppingToken);
        }
    }
}

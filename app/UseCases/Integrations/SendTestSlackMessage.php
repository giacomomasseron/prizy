<?php

declare(strict_types=1);

namespace App\UseCases\Integrations;

use App\Jobs\SendSlackMessage;
use App\Models\User;
use App\Repositories\SlackIntegrationRepository;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;
use Illuminate\Validation\ValidationException;

/**
 * @method static void run(User $actor)
 */
final class SendTestSlackMessage extends BaseUseCase implements UseCaseInterface
{
    private readonly SlackIntegrationRepository $repo;

    public function handle(mixed ...$arguments): mixed
    {
        $this->repo = app(SlackIntegrationRepository::class);

        $this->execute(...$arguments);

        return null;
    }

    private function execute(User $actor): void
    {
        $integration = $this->repo->forWorkspace();

        if ($integration === null || $integration->webhook_url === null) {
            throw ValidationException::withMessages(['webhook_url' => 'Configure a Slack webhook URL first.']);
        }

        SendSlackMessage::dispatch($integration->webhook_url, ':wave: Prizy test message');
    }
}

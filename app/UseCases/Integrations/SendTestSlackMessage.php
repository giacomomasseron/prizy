<?php

declare(strict_types=1);

namespace App\UseCases\Integrations;

use App\Jobs\SendSlackMessage;
use App\Models\User;
use App\Repositories\SlackIntegrationRepository;
use Illuminate\Validation\ValidationException;

final class SendTestSlackMessage
{
    public function __construct(private readonly SlackIntegrationRepository $repo) {}

    public function handle(User $actor): void
    {
        $integration = $this->repo->forWorkspace();

        if ($integration === null || $integration->webhook_url === null) {
            throw ValidationException::withMessages(['webhook_url' => 'Configure a Slack webhook URL first.']);
        }

        SendSlackMessage::dispatch($integration->webhook_url, ':wave: Prizy test message');
    }
}

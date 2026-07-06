<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\UpdateSlackIntegrationRequest;
use App\UseCases\Integrations\ConfigureSlackIntegration;
use App\UseCases\Integrations\DisconnectSlackIntegration;
use App\UseCases\Integrations\GetSlackIntegration;
use App\UseCases\Integrations\SendTestSlackMessage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

final class SlackIntegrationController extends Controller
{
    public function __construct(
        private readonly GetSlackIntegration $getSlack,
        private readonly ConfigureSlackIntegration $configureSlack,
        private readonly SendTestSlackMessage $sendTest,
        private readonly DisconnectSlackIntegration $disconnectSlack,
    ) {}

    public function show(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->present($this->getSlack->handle($request->user()))]);
    }

    public function update(UpdateSlackIntegrationRequest $request): JsonResponse
    {
        $integration = $this->configureSlack->handle(
            $request->user(),
            $request->input('webhook_url'),
            $request->validated('events'),
            (bool) $request->validated('is_active'),
        );

        return response()->json(['data' => $this->present($integration)]);
    }

    public function test(Request $request): JsonResponse
    {
        $this->sendTest->handle($request->user());

        // 202 with a JSON body (the apiClient only treats 204 as empty; a bare 202 would break `res.json()`).
        return response()->json(['data' => ['status' => 'queued']], 202);
    }

    public function destroy(Request $request): Response
    {
        $this->disconnectSlack->handle($request->user());

        return response()->noContent();
    }

    /** @param mixed $integration */
    private function present($integration): array
    {
        if ($integration === null) {
            return ['configured' => false, 'is_active' => false, 'events' => [], 'url_preview' => null];
        }

        $url = $integration->webhook_url;

        return [
            'configured'  => $url !== null,
            'is_active'   => (bool) $integration->is_active,
            'events'      => $integration->events,
            'url_preview' => $url === null ? null : '…' . mb_substr((string) $url, -6),
        ];
    }
}

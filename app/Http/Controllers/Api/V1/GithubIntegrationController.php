<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\UpdateGithubIntegrationRequest;
use App\UseCases\Integrations\ConfigureGithubIntegration;
use App\UseCases\Integrations\GetGithubIntegration;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class GithubIntegrationController extends Controller
{
    public function __construct(
        private readonly GetGithubIntegration $getGithub,
        private readonly ConfigureGithubIntegration $configureGithub,
    ) {}

    public function show(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->present($this->getGithub->handle($request->user()), $request->getSchemeAndHttpHost())]);
    }

    public function update(UpdateGithubIntegrationRequest $request): JsonResponse
    {
        $integration = $this->configureGithub->handle(
            $request->user(),
            $request->input('webhook_secret'),
            (bool) $request->validated('move_to_done_on_merge'),
            (bool) $request->validated('is_active'),
        );

        return response()->json(['data' => $this->present($integration, $request->getSchemeAndHttpHost())]);
    }

    /** @param mixed $integration */
    private function present($integration, string $baseUrl): array
    {
        if ($integration === null) {
            return ['configured' => false, 'is_active' => false, 'move_to_done_on_merge' => true, 'webhook_url' => null, 'secret_set' => false];
        }

        return [
            'configured'            => true,
            'is_active'             => (bool) $integration->is_active,
            'move_to_done_on_merge' => (bool) $integration->move_to_done_on_merge,
            'webhook_url'           => $baseUrl . '/integrations/github/webhook/' . $integration->webhook_token,
            'secret_set'            => $integration->webhook_secret !== null,
        ];
    }
}

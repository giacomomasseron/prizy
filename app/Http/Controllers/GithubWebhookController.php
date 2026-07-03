<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Support\Integrations\GithubWebhookHandler;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

final class GithubWebhookController extends Controller
{
    public function __construct(private readonly GithubWebhookHandler $handler) {}

    public function handle(Request $request, string $token): Response
    {
        $result = $this->handler->handle(
            $token,
            $request->getContent(),                       // RAW body (HMAC is over exact bytes)
            $request->header('X-Hub-Signature-256'),
            $request->header('X-GitHub-Event'),
        );

        return match ($result) {
            'not_found'         => response('', 404),
            'invalid_signature' => response('', 401),
            default             => response()->noContent(), // 204 for ok + ignored
        };
    }
}

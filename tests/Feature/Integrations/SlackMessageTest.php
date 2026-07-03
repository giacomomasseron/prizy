<?php

declare(strict_types=1);

use App\Jobs\SendSlackMessage;
use App\Support\Integrations\SlackMessageText;
use Illuminate\Support\Facades\Http;

it('builds a deep link from the workspace slug and issue id', function (): void {
    $url = SlackMessageText::url('acme', 'issue-123');
    expect($url)->toContain('acme.')->toContain('/issues/issue-123');
});

it('builds per-event mrkdwn text containing the title, change, and link', function (): void {
    $u = 'http://acme.localhost/issues/i1';
    expect(SlackMessageText::build('created', 'Fix login', $u))->toContain('Fix login')->toContain($u)
        ->and(SlackMessageText::build('status_changed', 'Fix login', $u, 'done'))->toContain('done')->toContain($u)
        ->and(SlackMessageText::build('assigned', 'Fix login', $u))->toContain('Fix login')
        ->and(SlackMessageText::build('commented', 'Fix login', $u))->toContain('Fix login');
});

it('posts the text to the webhook url as JSON', function (): void {
    Http::fake();
    (new SendSlackMessage('https://hooks.slack.com/services/X', 'hello'))->handle();
    Http::assertSent(fn ($request) => $request->url() === 'https://hooks.slack.com/services/X' && $request['text'] === 'hello');
});

it('throws on a non-2xx Slack response so the queue retries', function (): void {
    Http::fake(['https://hooks.slack.com/*' => Http::response('bad', 500)]);
    expect(fn () => (new SendSlackMessage('https://hooks.slack.com/services/X', 'hi'))->handle())
        ->toThrow(Illuminate\Http\Client\RequestException::class);
});

it('does not log the webhook url when delivery fails', function (): void {
    Illuminate\Support\Facades\Log::spy();
    $url = 'https://hooks.slack.com/services/T0/B0/supersecrettoken';
    // A connection-level Guzzle exception whose message embeds the full URL (the leak vector).
    $e = new Illuminate\Http\Client\ConnectionException('cURL error 6: Could not resolve host for ' . $url);

    (new SendSlackMessage($url, 'hi'))->failed($e);

    Illuminate\Support\Facades\Log::shouldHaveReceived('warning')->withArgs(function ($message, $context = []) use ($url) {
        // the URL/secret must not appear anywhere in the logged message or context
        return ! str_contains(json_encode([$message, $context]), 'supersecrettoken');
    });
});

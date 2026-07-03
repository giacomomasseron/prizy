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

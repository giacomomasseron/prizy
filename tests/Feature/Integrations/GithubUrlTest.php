<?php

declare(strict_types=1);

use App\Support\Integrations\GithubUrl;

it('parses a github PR url into repo + number', function (): void {
    expect(GithubUrl::parse('https://github.com/acme/app/pull/42'))->toBe(['repo' => 'acme/app', 'number' => 42])
        ->and(GithubUrl::parse('https://github.com/acme/app/pull/42/files'))->toBe(['repo' => 'acme/app', 'number' => 42]);
});

it('rejects non-PR / non-github urls', function (): void {
    expect(GithubUrl::parse('https://github.com/acme/app/issues/42'))->toBeNull()
        ->and(GithubUrl::parse('https://gitlab.com/acme/app/pull/42'))->toBeNull()
        ->and(GithubUrl::parse('not a url'))->toBeNull();
});

<?php

declare(strict_types=1);

use App\Rules\WorkspaceSlug;

// Over HTTP TrimStrings strips a trailing newline before validation, so this
// pins the rule on its own, for any caller that skips that middleware. (A
// Feature test: the rule reads config to reserve the sign-up host's label.)

function workspaceSlugRuleMessage(mixed $value): ?string
{
    $message = null;
    (new WorkspaceSlug())->validate('slug', $value, function (string $failure) use (&$message): void {
        $message = $failure;
    });

    return $message;
}

it('accepts a plain slug', function (): void {
    expect(workspaceSlugRuleMessage('acme'))->toBeNull();
});

it('refuses a slug with a trailing newline', function (): void {
    expect(workspaceSlugRuleMessage("acme\n"))->toContain('lowercase letters');
});

it('refuses a value that is not a string', function (mixed $value): void {
    expect(workspaceSlugRuleMessage($value))->toContain('lowercase letters');
})->with([[['acme']], [123], [null]]);

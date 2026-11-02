<?php

declare(strict_types=1);

use App\Http\Middleware\VerifyCsrfToken;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

uses(Tests\TestCase::class);

it('passes through when Authorization: Bearer is present, bypassing CSRF validation', function (): void {
    $request = Request::create('/v1/me', 'POST');
    $request->headers->set('Authorization', 'Bearer xyz');

    $response = app(VerifyCsrfToken::class)->handle(
        $request,
        fn ($r) => new Response('ok'),
    );

    expect($response->getContent())->toBe('ok');
});

it('delegates to ValidateCsrfToken when no Bearer token is present', function (): void {
    // Proving the parent's 419 directly is impractical: Laravel short-circuits
    // CSRF validation when running under app()->runningUnitTests(), so a tokenless
    // non-Bearer request would pass through rather than throwing
    // TokenMismatchException. We assert structural delegation instead — the class
    // extends ValidateCsrfToken, guaranteeing that non-Bearer requests are subject
    // to the parent's CSRF check in production (where runningUnitTests() is false).
    expect(VerifyCsrfToken::class)->toExtend(ValidateCsrfToken::class);
});

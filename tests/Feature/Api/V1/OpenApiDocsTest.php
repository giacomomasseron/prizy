<?php

declare(strict_types=1);

use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('serves a valid OpenAPI 3.1 document at /docs/api.json', function (): void {
    // Scramble builds the document by statically analysing every app source, so this
    // test's cost tracks the size of the codebase, not request performance (~4 s here,
    // traced or not). A loose ceiling instead of the global 3 s budget: it still catches
    // a runaway, without turning every new controller into a performance failure.
    $this->threshold(15000);

    $res = $this->getJson('/docs/api.json');

    $res->assertStatus(200);
    expect($res->json('openapi'))->toStartWith('3.1');
    expect($res->json('paths'))->toBeArray()->not->toBeEmpty();
});

it('serves the docs UI at /docs/api', function (): void {
    $this->get('/docs/api')->assertStatus(200);
});

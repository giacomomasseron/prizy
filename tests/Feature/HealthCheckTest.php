<?php

declare(strict_types=1);

use function Pest\Laravel\getJson;

it('responds to the landlord health check', function (): void {
    getJson('/health')
        ->assertOk()
        ->assertJson(['status' => 'ok']);
});

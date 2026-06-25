<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

uses(\Illuminate\Foundation\Testing\RefreshDatabase::class);

it('creates the workspace-layer tables', function (): void {
    foreach ([
        'workspaces', 'users', 'oauth_identities', 'personal_access_tokens',
        'teams', 'team_members', 'webhooks', 'webhook_subscriptions', 'webhook_deliveries',
    ] as $table) {
        expect(Schema::hasTable($table))->toBeTrue("missing table {$table}");
    }
});

it('enforces the unique workspace+email constraint on users', function (): void {
    $ws = DB::table('workspaces')->insertGetId([
        'id' => \Illuminate\Support\Str::uuid(), 'name' => 'Acme', 'slug' => 'acme',
        'created_at' => now(), 'updated_at' => now(),
    ], 'id');

    $row = fn () => [
        'id' => \Illuminate\Support\Str::uuid(), 'workspace_id' => $ws,
        'name' => 'A', 'email' => 'a@example.com', 'created_at' => now(), 'updated_at' => now(),
    ];

    DB::table('users')->insert($row());
    expect(fn () => DB::table('users')->insert($row()))
        ->toThrow(\Illuminate\Database\QueryException::class);
});

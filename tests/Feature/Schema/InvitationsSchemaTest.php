<?php

declare(strict_types=1);

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('creates the invitations table with a pending-unique index and RLS', function (): void {
    expect(Schema::hasTable('invitations'))->toBeTrue();
    foreach (['workspace_id','email','admin_level','is_developer','is_agent','token_hash','invited_by','expires_at','accepted_at'] as $col) {
        expect(Schema::hasColumn('invitations', $col))->toBeTrue("missing column {$col}");
    }
    $indexes = collect(DB::select("SELECT indexname FROM pg_indexes WHERE tablename = 'invitations'"))->pluck('indexname');
    expect($indexes)->toContain('idx_invitations_pending');
    $rls = collect(DB::select("SELECT relname FROM pg_class WHERE relrowsecurity = true"))->pluck('relname');
    expect($rls)->toContain('invitations');
});

<?php

declare(strict_types=1);

use App\Services\KbPalette;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * HC-4 introduces an allowlist for kb_categories.color (the value is echoed
 * into a style attribute). Pre-HC-4 rows hold CSS var() tokens; map them to
 * the matching palette hex and collapse anything else to slate.
 */
return new class extends Migration
{
    private const MAP = [
        'var(--sup)' => '#3aa76d', 'var(--accent)' => '#6d69f2', 'var(--blue)' => '#5b8def', 'var(--purple)' => '#b06ae0',
        'var(--amber)' => '#e0a13a', 'var(--red)' => '#eb5757', 'var(--green)' => '#4bab66',
    ];

    public function up(): void
    {
        foreach (self::MAP as $token => $hex) {
            DB::table('kb_categories')->where('color', $token)->update(['color' => $hex]);
        }
        DB::table('kb_categories')->whereNotIn('color', KbPalette::COLORS)->update(['color' => '#8b8b95']);
    }

    public function down(): void
    {
        // Data-only normalisation; nothing to restore.
    }
};

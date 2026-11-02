<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tickets', function (Blueprint $table): void {
            $table->timestampTz('first_reply_due_at')->nullable()->after('resolved_at');
            $table->index('first_reply_due_at');
        });
    }

    public function down(): void
    {
        Schema::table('tickets', function (Blueprint $table): void {
            $table->dropIndex(['first_reply_due_at']);
            $table->dropColumn('first_reply_due_at');
        });
    }
};

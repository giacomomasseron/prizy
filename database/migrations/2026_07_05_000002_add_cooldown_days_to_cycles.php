<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('cycles', function (Blueprint $table): void {
            $table->integer('cooldown_days')->default(0)->after('ends_at');
        });
    }

    public function down(): void
    {
        Schema::table('cycles', function (Blueprint $table): void {
            $table->dropColumn('cooldown_days');
        });
    }
};

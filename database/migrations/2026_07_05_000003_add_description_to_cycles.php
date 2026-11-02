<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('cycles', function (Blueprint $table): void {
            $table->text('description')->nullable()->after('cooldown_days');
        });
    }

    public function down(): void
    {
        Schema::table('cycles', function (Blueprint $table): void {
            $table->dropColumn('description');
        });
    }
};

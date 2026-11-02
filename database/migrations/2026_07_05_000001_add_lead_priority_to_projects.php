<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('projects', function (Blueprint $table): void {
            $table->uuid('lead_id')->nullable()->index()->after('team_id');
            $table->foreign('lead_id')->references('id')->on('users')->nullOnDelete();
            $table->string('priority', 16)->default('no_priority')->after('status');
        });
    }

    public function down(): void
    {
        Schema::table('projects', function (Blueprint $table): void {
            $table->dropForeign(['lead_id']);
            $table->dropIndex(['lead_id']);
            $table->dropColumn(['lead_id', 'priority']);
        });
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('document_tag', function (Blueprint $table) {
            $table->id('id_document_tag');
            $table->unsignedBigInteger('id_document');
            $table->unsignedBigInteger('id_tag');

            $table->timestamps();

            $table->foreign('id_document')
                ->references('id_document')
                ->on('document')
                ->onDelete('cascade')
                ->onUpdate('cascade');

            $table->foreign('id_tag')
                ->references('id_tag')
                ->on('tag')
                ->onDelete('cascade')
                ->onUpdate('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('document_tag');
    }
};

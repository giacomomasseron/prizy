<?php

declare(strict_types=1);

use App\Models\KbArticle;
use App\Models\KbSection;
use App\Models\Workspace;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\InteractsWithTenant;

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

afterEach(fn () => Workspace::forgetCurrent());

it('creates a section in an own category, appended last', function (): void {
    [$token, $ws] = kbAuthWorld();
    $cat = kbAuthCategory($ws);
    kbAuthSection($cat, ['slug' => 'existing', 'position' => 0]);

    $res = $this->withToken($token)->postJson('/v1/kb/sections', ['category_id' => $cat->id, 'name' => 'Troubleshooting', 'slug' => 'troubleshooting'])->assertStatus(201);
    expect($res->json('data.position'))->toBe(1);
    expect($res->json('data.category_id'))->toBe($cat->id);
});

it('rejects a foreign category_id (422) and duplicate slugs within the category only', function (): void {
    [$token, $ws] = kbAuthWorld();
    $cat = kbAuthCategory($ws);
    $cat2 = kbAuthCategory($ws, ['slug' => 'second', 'name' => 'Second']);
    kbAuthSection($cat, ['slug' => 'basics']);
    $other = Workspace::factory()->create();
    $other->makeCurrent();
    $foreignCat = kbAuthCategory($other, ['slug' => 'foreign']);
    $ws->makeCurrent();

    $this->withToken($token)->postJson('/v1/kb/sections', ['category_id' => $foreignCat->id, 'name' => 'X', 'slug' => 'x'])->assertStatus(422)->assertJsonValidationErrors('category_id');
    $this->withToken($token)->postJson('/v1/kb/sections', ['category_id' => $cat->id, 'name' => 'Basics', 'slug' => 'basics'])
        ->assertStatus(422)->assertJsonPath('errors.slug.0', 'Already used by another section.');
    $this->withToken($token)->postJson('/v1/kb/sections', ['category_id' => $cat2->id, 'name' => 'Basics', 'slug' => 'basics'])->assertStatus(201);
});

it('updates, moves within its category, 404s foreign sections, and cascades delete', function (): void {
    [$token, $ws, $user] = kbAuthWorld();
    $cat = kbAuthCategory($ws);
    $s1 = kbAuthSection($cat, ['slug' => 's1', 'position' => 0]);
    $s2 = kbAuthSection($cat, ['slug' => 's2', 'position' => 1]);
    $otherCat = kbAuthCategory($ws, ['slug' => 'other', 'name' => 'Other']);
    $s3 = kbAuthSection($otherCat, ['slug' => 's3', 'position' => 0]);
    kbAuthArticle($s2, $user);

    $this->withToken($token)->patchJson("/v1/kb/sections/{$s1->id}", ['name' => 'Renamed', 'slug' => 's1'])->assertStatus(200);
    $this->withToken($token)->postJson("/v1/kb/sections/{$s2->id}/move", ['direction' => 'up'])->assertStatus(200);
    expect([$s2->refresh()->position, $s1->refresh()->position, $s3->refresh()->position])->toBe([0, 1, 0]);

    $other = Workspace::factory()->create();
    $other->makeCurrent();
    $foreignSec = kbAuthSection(kbAuthCategory($other, ['slug' => 'f']), ['slug' => 'fs']);
    $ws->makeCurrent();
    $this->withToken($token)->patchJson("/v1/kb/sections/{$foreignSec->id}", ['name' => 'X', 'slug' => 'x'])->assertStatus(404);

    $this->withToken($token)->deleteJson("/v1/kb/sections/{$s2->id}")->assertStatus(204);
    expect(KbSection::query()->whereKey($s2->id)->exists())->toBeFalse();
    expect(KbArticle::query()->withTrashed()->where('section_id', $s2->id)->exists())->toBeFalse();
});

it('bulk-archives under a section', function (): void {
    [$token, $ws, $user] = kbAuthWorld();
    $sec = kbAuthSection(kbAuthCategory($ws));
    kbAuthArticle($sec, $user, ['slug' => 'p1']);
    $res = $this->withToken($token)->postJson("/v1/kb/sections/{$sec->id}/archive-articles")->assertStatus(200);
    expect($res->json('data.archived'))->toBe(1);
});

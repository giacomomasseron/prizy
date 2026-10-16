<?php

declare(strict_types=1);

use App\Models\KbArticle;
use App\Models\KbCategory;
use App\Models\KbSection;
use App\Models\User;
use App\Models\Workspace;
use App\Repositories\HelpdeskSavedReportRepository;
use App\Repositories\HelpdeskSavedViewRepository;
use App\Repositories\ScheduleRepository;
use App\Repositories\SlaPolicyRepository;
use App\UseCases\Tokens\CreatePersonalAccessToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Str;
use Tests\Concerns\InteractsWithTenant;

/*
 * roles.md: a viewer is read-only in every module, the agent capability
 * included. The support module's settings and knowledge-base writes used to
 * ask only HelpdeskAccess::gate() (is_agent + switch on), which let a viewer
 * who is an agent author articles, rewrite SLA policies and so on. They now ask
 * gateWrite(). These tests pin it at the HTTP boundary, one request per route:
 *
 *  - a viewer who is an agent gets 403 and not one row changes;
 *  - an agent MEMBER sending the very same request succeeds AND changes rows —
 *    the control proving the payload is valid (FormRequest validation runs
 *    before the use case's gate, so a bad payload would read 422, not 403) and
 *    that the request is a real write, so "nothing changed" above can fail;
 *  - the reads stay open to that viewer;
 *  - the route lists below are exactly the router's, so a new write route
 *    under these prefixes cannot ship without a row here.
 */

uses(RefreshDatabase::class);
uses(InteractsWithTenant::class);

afterEach(fn () => Workspace::forgetCurrent());

/**
 * A fresh helpdesk-enabled workspace holding one of everything these routes act
 * on, and a bearer token for a verified AGENT at the given admin level. Two
 * categories, sections and articles so every move has a neighbour to swap with.
 *
 * @return array<string, string>
 */
function viewerRoWorld(string $adminLevel): array
{
    $ws = Workspace::factory()->create(['helpdesk_enabled' => true]);
    test()->actingInWorkspace($ws);
    $user = User::factory()->for($ws, 'workspace')->create([
        'is_agent' => true, 'admin_level' => $adminLevel, 'email_verified_at' => now(),
    ]);
    $token = app(CreatePersonalAccessToken::class)->handle($user, 't', null)['token'];

    $catA = KbCategory::forceCreate([
        'id' => (string) Str::uuid(), 'workspace_id' => $ws->id, 'name' => 'Getting started', 'slug' => 'getting-started',
        'icon' => '◇', 'color' => '#3aa76d', 'description' => 'Set up.', 'position' => 0,
    ]);
    $catB = KbCategory::forceCreate([
        'id' => (string) Str::uuid(), 'workspace_id' => $ws->id, 'name' => 'Billing', 'slug' => 'billing',
        'icon' => '◫', 'color' => '#5b8def', 'description' => 'Plans and invoices.', 'position' => 1,
    ]);
    $sec1 = KbSection::forceCreate(['id' => (string) Str::uuid(), 'category_id' => $catA->id, 'name' => 'Basics', 'slug' => 'basics', 'position' => 0]);
    $sec2 = KbSection::forceCreate(['id' => (string) Str::uuid(), 'category_id' => $catA->id, 'name' => 'Advanced', 'slug' => 'advanced', 'position' => 1]);
    $artX = KbArticle::forceCreate([
        'id' => (string) Str::uuid(), 'section_id' => $sec1->id, 'author_id' => $user->id,
        'title' => 'Inviting your team', 'slug' => 'inviting-your-team', 'body' => 'Open Settings, then Members.',
        'status' => 'published', 'position' => 0, 'published_at' => now()->subDay(),
    ]);
    $artY = KbArticle::forceCreate([
        'id' => (string) Str::uuid(), 'section_id' => $sec1->id, 'author_id' => $user->id,
        'title' => 'Single sign-on', 'slug' => 'single-sign-on', 'body' => 'Coming soon.',
        'status' => 'draft', 'position' => 1, 'published_at' => null,
    ]);

    // Two versions with explicit, distinct created_at: Postgres freezes now()
    // for the test's transaction, so default-stamped rows would tie. v2 mirrors
    // the article (the newest version is current); v1 is the past one a restore
    // can bring back — with a non-empty body, since the article is published.
    $v1 = (string) Str::uuid();
    DB::table('kb_article_versions')->insert([
        ['id' => $v1, 'article_id' => $artX->id, 'author_id' => $user->id, 'title' => 'Inviting people', 'body' => 'Go to Settings.', 'created_at' => now()->subDays(2)],
        ['id' => (string) Str::uuid(), 'article_id' => $artX->id, 'author_id' => $user->id, 'title' => $artX->title, 'body' => $artX->body, 'created_at' => now()->subDay()],
    ]);
    // A French draft with content: publishable, since the English article is published.
    DB::table('kb_article_translations')->insert([
        'id' => (string) Str::uuid(), 'article_id' => $artX->id, 'locale' => 'fr',
        'title' => 'Inviter votre équipe', 'body' => 'Ouvrez Réglages, puis Membres.', 'status' => 'draft',
        'created_at' => now(), 'updated_at' => now(),
    ]);

    // The repositories fill workspace_id from the current workspace.
    $schedule = app(ScheduleRepository::class)->create(
        ['name' => 'Standard', 'timezone' => 'UTC'],
        [['day_of_week' => 1, 'opens_at' => '09:00:00', 'closes_at' => '17:00:00']],
    );
    $policy = app(SlaPolicyRepository::class)->create([
        'name' => 'Standard', 'first_reply_minutes' => 60, 'next_reply_minutes' => 120,
        'resolution_minutes' => 480, 'schedule_id' => $schedule->id,
    ]);
    $view = app(HelpdeskSavedViewRepository::class)->create([
        'name' => 'Open tickets', 'created_by' => $user->id, 'definition' => ['filter' => ['status' => 'open'], 'sort' => 'updated_at'],
    ]);
    $report = app(HelpdeskSavedReportRepository::class)->create([
        'name' => 'Monthly overview', 'created_by' => $user->id, 'definition' => ['section' => 'overview', 'range' => '30d'],
    ]);

    return [
        'token' => $token,
        'catA' => $catA->id, 'catB' => $catB->id,
        'sec1' => $sec1->id, 'sec2' => $sec2->id,
        'artX' => $artX->id, 'artY' => $artY->id, 'v1' => $v1,
        'schedule' => $schedule->id, 'policy' => $policy->id,
        'view' => $view->id, 'report' => $report->id,
    ];
}

/** @return array<string, string> every table these routes can write, serialised row by row */
function viewerRoSnapshot(): array
{
    $tables = [
        'kb_categories', 'kb_sections', 'kb_articles', 'kb_article_versions', 'kb_article_translations',
        'sla_policies', 'business_hour_schedules', 'business_hour_intervals',
        'helpdesk_saved_views', 'helpdesk_saved_reports',
    ];

    $out = [];
    foreach ($tables as $table) {
        $out[$table] = json_encode(DB::table($table)->orderBy('id')->get()->all(), JSON_THROW_ON_ERROR);
    }

    return $out;
}

/**
 * Pairs each "METHOD uri" (exactly as the router names it) with itself and its
 * builder, so the test receives both: the label IS the route that gets hit.
 *
 * @param  array<string, Closure>  $builders
 * @return array<string, array{0: string, 1: Closure}>
 */
function viewerRoDataset(array $builders): array
{
    $rows = [];
    foreach ($builders as $route => $build) {
        $rows[$route] = [$route, $build];
    }

    return $rows;
}

/**
 * Every write route under the support settings and knowledge-base prefixes.
 * Each builder takes the world and returns [route parameters, a VALID payload].
 * The two archive-articles routes share ArchiveKbArticlesUnder; together the 29
 * rows reach all 28 write use cases switched to HelpdeskAccess::gateWrite().
 *
 * @return array<string, array{0: string, 1: Closure}>
 */
function viewerRoWrites(): array
{
    return viewerRoDataset([
        // Knowledge base — categories
        'POST v1/kb/categories' => fn (array $w): array => [[], [
            'name' => 'Accounts & SSO', 'slug' => 'accounts-sso', 'icon' => '⚿', 'color' => '#5b8def', 'description' => 'Sign-in and SSO.',
        ]],
        'PATCH v1/kb/categories/{id}' => fn (array $w): array => [['id' => $w['catA']], [
            'name' => 'First steps', 'slug' => 'getting-started', 'icon' => '◇', 'color' => '#3aa76d', 'description' => 'Set up.',
        ]],
        'DELETE v1/kb/categories/{id}' => fn (array $w): array => [['id' => $w['catB']], []],
        'POST v1/kb/categories/{id}/move' => fn (array $w): array => [['id' => $w['catB']], ['direction' => 'up']],
        'POST v1/kb/categories/{id}/archive-articles' => fn (array $w): array => [['id' => $w['catA']], []],

        // Knowledge base — sections
        'POST v1/kb/sections' => fn (array $w): array => [[], ['category_id' => $w['catA'], 'name' => 'Troubleshooting', 'slug' => 'troubleshooting']],
        'PATCH v1/kb/sections/{id}' => fn (array $w): array => [['id' => $w['sec1']], ['name' => 'The basics', 'slug' => 'basics']],
        'DELETE v1/kb/sections/{id}' => fn (array $w): array => [['id' => $w['sec2']], []],
        'POST v1/kb/sections/{id}/move' => fn (array $w): array => [['id' => $w['sec2']], ['direction' => 'up']],
        'POST v1/kb/sections/{id}/archive-articles' => fn (array $w): array => [['id' => $w['sec1']], []],

        // Knowledge base — articles, versions, translations
        'POST v1/kb/articles' => fn (array $w): array => [[], [
            'section_id' => $w['sec1'], 'title' => 'Exporting to CSV', 'slug' => 'exporting-to-csv', 'body' => "## Steps\n\n1. Open export",
        ]],
        'PATCH v1/kb/articles/{id}' => fn (array $w): array => [['id' => $w['artX']], ['title' => 'Inviting your whole team']],
        'DELETE v1/kb/articles/{id}' => fn (array $w): array => [['id' => $w['artY']], []],
        'POST v1/kb/articles/{id}/move' => fn (array $w): array => [['id' => $w['artY']], ['direction' => 'up']],
        'POST v1/kb/articles/{id}/status' => fn (array $w): array => [['id' => $w['artX']], ['status' => 'archived']],
        'POST v1/kb/articles/{id}/versions/{versionId}/restore' => fn (array $w): array => [['id' => $w['artX'], 'versionId' => $w['v1']], []],
        'PUT v1/kb/articles/{id}/translations/{locale}' => fn (array $w): array => [['id' => $w['artX'], 'locale' => 'de'], [
            'title' => 'Ihr Team einladen', 'body' => 'Öffnen Sie die Einstellungen.',
        ]],
        'POST v1/kb/articles/{id}/translations/{locale}/status' => fn (array $w): array => [['id' => $w['artX'], 'locale' => 'fr'], ['status' => 'published']],
        'DELETE v1/kb/articles/{id}/translations/{locale}' => fn (array $w): array => [['id' => $w['artX'], 'locale' => 'fr'], []],

        // SLA policies
        'POST v1/sla-policies' => fn (array $w): array => [[], [
            'name' => 'Enterprise', 'first_reply_minutes' => 30, 'next_reply_minutes' => 60, 'resolution_minutes' => 240, 'schedule_id' => $w['schedule'],
        ]],
        'PATCH v1/sla-policies/{id}' => fn (array $w): array => [['id' => $w['policy']], [
            'name' => 'Standard (24/7)', 'first_reply_minutes' => 60, 'next_reply_minutes' => null, 'resolution_minutes' => 480, 'schedule_id' => null,
        ]],
        'DELETE v1/sla-policies/{id}' => fn (array $w): array => [['id' => $w['policy']], []],

        // Business hours
        'POST v1/business-hours' => fn (array $w): array => [[], [
            'name' => 'Weekend cover', 'timezone' => 'UTC',
            'intervals' => [['day_of_week' => 6, 'opens_at' => '10:00', 'closes_at' => '14:00']],
        ]],
        'PATCH v1/business-hours/{id}' => fn (array $w): array => [['id' => $w['schedule']], [
            'name' => 'Standard (summer)', 'timezone' => 'UTC',
            'intervals' => [['day_of_week' => 5, 'opens_at' => '10:00', 'closes_at' => '14:00']],
        ]],
        'DELETE v1/business-hours/{id}' => fn (array $w): array => [['id' => $w['schedule']], []],

        // Saved desk views and saved reports
        'POST v1/ticket-views' => fn (array $w): array => [[], [
            'name' => 'Email backlog', 'definition' => ['filter' => ['channel' => 'email', 'status' => 'new,open'], 'sort' => 'created_at'],
        ]],
        'DELETE v1/ticket-views/{ticketView}' => fn (array $w): array => [['ticketView' => $w['view']], []],
        'POST v1/report-views' => fn (array $w): array => [[], ['name' => 'Weekly agents', 'definition' => ['section' => 'agents', 'range' => '7d']]],
        'DELETE v1/report-views/{reportView}' => fn (array $w): array => [['reportView' => $w['report']], []],
    ]);
}

/**
 * Every read under the same prefixes — including POST v1/kb/preview, which
 * renders the posted markdown and stores nothing.
 *
 * @return array<string, array{0: string, 1: Closure}>
 */
function viewerRoReads(): array
{
    return viewerRoDataset([
        'GET v1/kb/library' => fn (array $w): array => [[], []],
        'GET v1/kb/articles/{id}' => fn (array $w): array => [['id' => $w['artX']], []],
        'GET v1/kb/articles/{id}/versions' => fn (array $w): array => [['id' => $w['artX']], []],
        'GET v1/kb/articles/{id}/versions/{versionId}' => fn (array $w): array => [['id' => $w['artX'], 'versionId' => $w['v1']], []],
        'GET v1/kb/articles/{id}/translations' => fn (array $w): array => [['id' => $w['artX']], []],
        'GET v1/kb/articles/{id}/translations/{locale}' => fn (array $w): array => [['id' => $w['artX'], 'locale' => 'fr'], []],
        'POST v1/kb/preview' => fn (array $w): array => [[], ['body' => "# Inviting your team\n\nOpen **Settings**."]],
        'GET v1/sla-policies' => fn (array $w): array => [[], []],
        'GET v1/sla-policies/{id}' => fn (array $w): array => [['id' => $w['policy']], []],
        'GET v1/business-hours' => fn (array $w): array => [[], []],
        'GET v1/business-hours/{id}' => fn (array $w): array => [['id' => $w['schedule']], []],
        'GET v1/ticket-views' => fn (array $w): array => [[], []],
        'GET v1/report-views' => fn (array $w): array => [[], []],
    ]);
}

/**
 * Turns a "METHOD uri-template" label plus its builder into a concrete request.
 *
 * @param  array<string, string>  $world
 * @return array{0: string, 1: string, 2: array<string, mixed>} method, uri, payload
 */
function viewerRoRequest(string $route, Closure $build, array $world): array
{
    [$method, $template] = explode(' ', $route, 2);
    [$params, $payload] = $build($world);

    $uri = (string) preg_replace_callback(
        '/\{(\w+)\}/',
        fn (array $m): string => $params[$m[1]] ?? throw new LogicException($route.': no value for '.$m[1]),
        $template,
    );

    return [$method, '/'.$uri, $payload];
}

it('turns a viewer who is an agent away from a support write (403) and changes nothing', function (string $route, Closure $build): void {
    $world = viewerRoWorld('viewer');
    [$method, $uri, $payload] = viewerRoRequest($route, $build, $world);
    $before = viewerRoSnapshot();

    $this->withToken($world['token'])->json($method, $uri, $payload)->assertStatus(403);

    expect(viewerRoSnapshot())->toBe($before);
})->with(viewerRoWrites());

// Control for the test above: the same request, the same world, only the admin
// level differs. It must succeed and must actually change rows — otherwise the
// 403 could be a validation or routing artefact and "nothing changed" vacuous.
it('lets an agent member make the very same write, which lands', function (string $route, Closure $build): void {
    $world = viewerRoWorld('member');
    [$method, $uri, $payload] = viewerRoRequest($route, $build, $world);
    $before = viewerRoSnapshot();

    $this->withToken($world['token'])->json($method, $uri, $payload)->assertSuccessful();

    expect(viewerRoSnapshot())->not->toBe($before);
})->with(viewerRoWrites());

it('still lets a viewer who is an agent read, storing nothing', function (string $route, Closure $build): void {
    $world = viewerRoWorld('viewer');
    [$method, $uri, $payload] = viewerRoRequest($route, $build, $world);
    $before = viewerRoSnapshot();

    $res = $this->withToken($world['token'])->json($method, $uri, $payload)->assertStatus(200);

    expect($res->json('data'))->not->toBeEmpty();
    expect(viewerRoSnapshot())->toBe($before);
})->with(viewerRoReads());

// The two lists above must be the router's own: a new route under these
// prefixes fails here until someone decides whether a viewer may call it.
it('covers every route under the support settings and knowledge-base prefixes', function (): void {
    $surface = [];
    foreach (Route::getRoutes()->getRoutes() as $route) {
        if (preg_match('#^v1/(kb|sla-policies|business-hours|ticket-views|report-views)(/|$)#', $route->uri()) !== 1) {
            continue;
        }
        foreach ($route->methods() as $method) {
            if ($method !== 'HEAD') {
                $surface[] = $method.' '.$route->uri();
            }
        }
    }

    $covered = array_merge(array_keys(viewerRoWrites()), array_keys(viewerRoReads()));
    sort($surface);
    sort($covered);

    expect($covered)->toBe($surface);
    expect(viewerRoWrites())->toHaveCount(29);
});

<?php

declare(strict_types=1);

use App\Http\Controllers\Api\MeController;
use App\Http\Controllers\Api\TokenController;
use App\Http\Controllers\Api\V1;
use App\Http\Middleware\EnsureTrackerEnabled;
use Illuminate\Routing\Route as RoutingRoute;
use Illuminate\Support\Facades\Route;

/*
 * The tracker switch is a middleware on the routes (EnsureTrackerEnabled), not a
 * gate in each use case: the tracker's policies hand an owner everything, so the
 * switch has to sit in front of them. What keeps it whole is that every tracker
 * route sits behind it. Each /v1 action is filed below as the tracker's or not,
 * and one nobody has filed fails here until someone decides which it is.
 */

/** @return array<string, bool> A controller, or one action of it ("Class@method"), => whether it is the tracker's */
function trackerRoutesFiling(): array
{
    return [
        // The tracker, and what only exists for it.
        V1\CycleController::class                 => true,
        V1\GithubIntegrationController::class     => true,
        V1\IssueActivityController::class         => true,
        V1\IssueBlockerController::class          => true,
        V1\IssueCommentController::class          => true,
        V1\IssueCommentReactionController::class  => true,
        V1\IssueController::class                 => true,
        V1\IssueGithubLinkController::class       => true,
        V1\IssueLabelController::class            => true,
        V1\IssueLookupController::class           => true,
        V1\IssueStarController::class             => true,
        V1\IssueTicketLinkController::class       => true,
        V1\LabelController::class                 => true,
        V1\MilestoneController::class             => true,
        V1\NotificationController::class          => true,
        V1\PlanController::class                  => true,
        V1\ProjectController::class               => true,
        V1\ProjectMessageController::class        => true,
        V1\ReleaseController::class               => true,
        V1\RoadmapController::class               => true,
        V1\SavedViewController::class             => true,
        V1\SearchController::class                => true,
        V1\SlackIntegrationController::class      => true,
        V1\TeamController::class                  => true,
        V1\TeamMemberController::class            => true,
        V1\TodoController::class                  => true,
        V1\ReportingController::class.'@trackerOverview' => true,
        V1\ReportingController::class.'@cycles'          => true,

        // The support side, and what both modules share.
        MeController::class                       => false,
        TokenController::class                    => false,
        V1\BusinessHourScheduleController::class  => false,
        V1\ContactController::class               => false,
        V1\ExportController::class                => false,
        V1\HelpdeskSavedReportController::class   => false,
        V1\HelpdeskSavedViewController::class     => false,
        V1\KbArticleController::class             => false,
        V1\KbCategoryController::class            => false,
        V1\KbLibraryController::class             => false,
        V1\KbSectionController::class             => false,
        V1\KbTranslationController::class         => false,
        V1\KbVersionController::class             => false,
        V1\MemberController::class                => false,
        V1\SlaPolicyController::class             => false,
        V1\TicketController::class                => false,
        V1\TicketMessageController::class         => false,
        V1\WorkspaceController::class             => false,
        V1\WorkspaceMemberController::class       => false,
        V1\ReportingController::class.'@overview' => false,
        V1\ReportingController::class.'@agents'   => false,
        V1\ReportingController::class.'@sla'      => false,
    ];
}

/** @return array<string, array{route: RoutingRoute, tracker: bool|null}> Every /v1 route by "METHOD uri", with how it is filed */
function trackerRoutesV1(): array
{
    $filing = trackerRoutesFiling();
    $routes = [];
    foreach (Route::getRoutes()->getRoutes() as $route) {
        if (! str_starts_with($route->uri(), 'v1/')) {
            continue;
        }
        $tracker = $filing[$route->getActionName()] ?? $filing[(string) $route->getControllerClass()] ?? null;
        $routes[implode('|', array_diff($route->methods(), ['HEAD'])).' '.$route->uri()] = ['route' => $route, 'tracker' => $tracker];
    }

    return $routes;
}

/** Does the route carry the switch, in any form? */
function trackerRoutesGuard(RoutingRoute $route): ?string
{
    foreach ($route->gatherMiddleware() as $middleware) {
        if (is_string($middleware) && str_starts_with($middleware, EnsureTrackerEnabled::class)) {
            return $middleware;
        }
    }

    return null;
}

it('files every /v1 route as the tracker\'s or not', function (): void {
    $unfiled = array_keys(array_filter(trackerRoutesV1(), fn (array $r): bool => $r['tracker'] === null));

    expect($unfiled)->toBe([]);
});

it('puts every tracker route behind the switch, answering 403', function (): void {
    $tracker = array_filter(trackerRoutesV1(), fn (array $r): bool => $r['tracker'] === true);
    $open = array_keys(array_filter($tracker, fn (array $r): bool => trackerRoutesGuard($r['route']) !== EnsureTrackerEnabled::class.':403'));

    // Not vacuous: the tracker is most of the API.
    expect(count($tracker))->toBeGreaterThan(80)
        ->and($open)->toBe([]);
});

it('leaves every other route outside it', function (): void {
    $other = array_filter(trackerRoutesV1(), fn (array $r): bool => $r['tracker'] === false);
    $closed = array_keys(array_filter($other, fn (array $r): bool => trackerRoutesGuard($r['route']) !== null));

    expect(count($other))->toBeGreaterThan(40)
        ->and($closed)->toBe([]);
});

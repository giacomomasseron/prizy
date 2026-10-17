<?php

declare(strict_types=1);

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Rules\WorkspaceSlug;
use App\UseCases\Auth\CheckWorkspaceSlug;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class SlugCheckController extends Controller
{
    public function __construct(
        private readonly CheckWorkspaceSlug $checkWorkspaceSlug,
    ) {}

    /**
     * Whether ?slug= can be a new workspace's address, as the person types
     * it. It tells no more than sign-up itself does when a slug is taken.
     */
    public function __invoke(Request $request): JsonResponse
    {
        $slug = $request->query('slug');
        $problem = WorkspaceSlug::problem($slug);

        if ($problem === null && is_string($slug) && $this->checkWorkspaceSlug->isTaken($slug)) {
            $problem = 'taken';
        }

        return response()->json([
            'available' => $problem === null,
            'reason'    => $problem,
            'message'   => $problem === null || $problem === 'taken' ? null : WorkspaceSlug::MESSAGES[$problem],
        ]);
    }
}

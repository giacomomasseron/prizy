<?php
declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\UseCases\Teams\AddTeamMember;
use App\UseCases\Teams\FindTeam;
use App\UseCases\Teams\ListTeamMembers;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

final class TeamMemberController extends Controller
{
    public function __construct(
        private readonly FindTeam $findTeam,
        private readonly ListTeamMembers $listTeamMembers,
        private readonly AddTeamMember $addTeamMember,
    ) {}

    public function index(Request $request, string $team): JsonResponse
    {
        $model = $this->findTeam->handle($team);
        Gate::authorize('update', $model);

        return response()->json(['data' => $this->listTeamMembers->handle($model)]);
    }

    public function store(Request $request, string $team): JsonResponse
    {
        $model = $this->findTeam->handle($team);
        Gate::authorize('update', $model);
        $data = $request->validate([
            'user_id' => ['required', 'string'],
            'role'    => ['sometimes', Rule::in(['lead', 'member'])],
        ]);

        return response()->json(['data' => $this->addTeamMember->handle($request->user(), $model, $data)], 201);
    }
}

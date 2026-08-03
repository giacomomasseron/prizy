<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\UseCases\Members\ListMembers;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class MemberController extends Controller
{
    public function __construct(private readonly ListMembers $listMembers) {}

    public function index(Request $request): JsonResponse
    {
        $members = $this->listMembers->handle($request->user());

        return response()->json([
            'data' => $members->map(fn ($u) => ['id' => $u->id, 'name' => $u->name, 'is_agent' => $u->is_agent])->values(),
        ]);
    }
}

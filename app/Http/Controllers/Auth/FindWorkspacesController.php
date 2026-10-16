<?php

declare(strict_types=1);

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\UseCases\Auth\SendWorkspaceLinks;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class FindWorkspacesController extends Controller
{
    public function __construct(
        private readonly SendWorkspaceLinks $sendWorkspaceLinks,
    ) {}

    /**
     * Email the address the login link of every workspace it belongs to.
     * Always the same 202, so the answer never says whether it has any.
     */
    public function __invoke(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'string', 'email', 'max:255'],
        ]);

        $this->sendWorkspaceLinks->handle($data['email']);

        return response()->json(
            ['message' => "If that address belongs to any workspace, we've emailed you the links."],
            202
        );
    }
}

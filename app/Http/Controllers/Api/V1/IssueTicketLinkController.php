<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\UseCases\Issues\FindIssue;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

final class IssueTicketLinkController extends Controller
{
    public function __construct(
        private readonly FindIssue $findIssue,
    ) {}

    public function store(Request $request, string $issue): never
    {
        $model = $this->findIssue->handle($issue);
        Gate::authorize('update', $model);

        abort(501, 'Linking issues to tickets is not yet implemented.');
    }
}

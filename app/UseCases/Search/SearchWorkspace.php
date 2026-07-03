<?php

declare(strict_types=1);

namespace App\UseCases\Search;

use App\Models\User;
use App\Repositories\ProjectRepository;
use App\Repositories\SearchRepository;
use App\Repositories\TeamRepository;
use Illuminate\Database\Eloquent\Collection;

final class SearchWorkspace
{
    public function __construct(
        private readonly SearchRepository $search,
        private readonly ProjectRepository $projects,
        private readonly TeamRepository $teams,
    ) {}

    /** @return array{issues: Collection, projects: Collection, teams: Collection} */
    public function handle(User $actor, string $q): array
    {
        $q = trim($q);
        if ($q === '') {
            return ['issues' => new Collection(), 'projects' => new Collection(), 'teams' => new Collection()];
        }

        return [
            'issues'   => $this->search->searchIssuesCapped($actor->workspace_id, $q, 8),
            'projects' => $this->projects->searchByName($q, 5),
            'teams'    => $this->teams->searchByName($q, 5),
        ];
    }
}

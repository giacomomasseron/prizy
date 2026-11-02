<?php

declare(strict_types=1);

namespace App\UseCases\Search;

use App\Models\User;
use App\Repositories\ProjectRepository;
use App\Repositories\SearchRepository;
use App\Repositories\TeamRepository;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;
use Illuminate\Database\Eloquent\Collection;

/**
 * @method static array run(User $actor, string $q)
 */
final class SearchWorkspace extends BaseUseCase implements UseCaseInterface
{
    private readonly SearchRepository $search;

    private readonly ProjectRepository $projects;

    private readonly TeamRepository $teams;

    public function handle(mixed ...$arguments): mixed
    {
        $this->search = app(SearchRepository::class);
        $this->projects = app(ProjectRepository::class);
        $this->teams = app(TeamRepository::class);

        return $this->execute(...$arguments);
    }

    /** @return array{issues: Collection, projects: Collection, teams: Collection} */
    private function execute(User $actor, string $q): array
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

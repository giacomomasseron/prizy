<?php

declare(strict_types=1);

namespace App\UseCases\Teams;

use App\Models\User;
use App\Repositories\TeamRepository;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;
use Illuminate\Validation\ValidationException;

/**
 * @method void run(User $actor, array $data)
 */
final class DeleteTeam extends BaseUseCase implements UseCaseInterface
{
    public function __construct(private readonly TeamRepository $teams) {}

    public function handle(mixed ...$arguments): mixed
    {
        $this->execute(...$arguments);

        return null;
    }

    /** @param array<string, mixed> $data */
    private function execute(User $actor, array $data): void
    {
        $team = $this->teams->findInWorkspace((string) $data['team_id']);
        if ($team === null) {
            throw ValidationException::withMessages(['team_id' => ['The selected team is invalid.']]);
        }
        if ($this->teams->hasIssues($team->id)) {
            throw ValidationException::withMessages(['team_id' => ['Cannot delete a team that still has issues.']]);
        }
        $this->teams->delete($team);
    }
}

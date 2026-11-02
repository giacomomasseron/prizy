<?php

declare(strict_types=1);

namespace App\UseCases\Teams;

use App\Models\Team;
use App\Models\User;
use App\Repositories\TeamRepository;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;
use Illuminate\Validation\ValidationException;

/**
 * @method static Team run(User $actor, array $data)
 */
final class UpdateTeam extends BaseUseCase implements UseCaseInterface
{
    private readonly TeamRepository $teams;

    public function handle(mixed ...$arguments): mixed
    {
        $this->teams = app(TeamRepository::class);

        return $this->execute(...$arguments);
    }

    /** @param array<string, mixed> $data */
    private function execute(User $actor, array $data): Team
    {
        $team = $this->teams->findInWorkspace((string) $data['team_id']);
        if ($team === null) {
            throw ValidationException::withMessages(['team_id' => ['The selected team is invalid.']]);
        }

        return $this->teams->update($team, array_intersect_key($data, array_flip(['name', 'identifier', 'color'])));
    }
}

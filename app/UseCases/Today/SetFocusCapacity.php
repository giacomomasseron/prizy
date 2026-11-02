<?php

declare(strict_types=1);

namespace App\UseCases\Today;

use App\Models\User;
use App\Repositories\UserRepository;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;

/**
 * The actor's daily focus capacity on Today (the Today v2 design), in minutes: 3 to 9 hours, validated upstream.
 *
 * @method int run(User $actor, int $minutes)
 */
final class SetFocusCapacity extends BaseUseCase implements UseCaseInterface
{
    public function __construct(private readonly UserRepository $users) {}

    public function handle(mixed ...$arguments): mixed
    {
        return $this->execute(...$arguments);
    }

    private function execute(User $actor, int $minutes): int
    {
        return (int) $this->users->setDailyFocusMinutes($actor, $minutes)->daily_focus_minutes;
    }
}

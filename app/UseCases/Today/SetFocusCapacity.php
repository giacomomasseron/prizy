<?php

declare(strict_types=1);

namespace App\UseCases\Today;

use App\Models\User;
use App\Repositories\UserRepository;

/** The actor's daily focus capacity on Today (the Today v2 design), in minutes: 3 to 9 hours, validated upstream. */
final class SetFocusCapacity
{
    public function __construct(private readonly UserRepository $users) {}

    public function handle(User $actor, int $minutes): int
    {
        return (int) $this->users->setDailyFocusMinutes($actor, $minutes)->daily_focus_minutes;
    }
}

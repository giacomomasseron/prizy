<?php

declare(strict_types=1);

namespace App\UseCases\Todos;

use App\Models\User;
use App\Repositories\UserTodoRepository;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;

/**
 * Clear: delete every done to-do of the actor (PRD §3.2.10). The open ones and other users' lists are untouched.
 *
 * @method void run(User $actor)
 */
final class ClearCompletedTodos extends BaseUseCase implements UseCaseInterface
{
    public function __construct(private readonly UserTodoRepository $todos) {}

    public function handle(mixed ...$arguments): mixed
    {
        $this->execute(...$arguments);

        return null;
    }

    private function execute(User $actor): void
    {
        $this->todos->deleteDone($actor->id);
    }
}

<?php

declare(strict_types=1);

namespace App\UseCases\Todos;

use App\Models\User;
use App\Models\UserTodo;
use App\Repositories\UserTodoRepository;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;
use Illuminate\Support\Collection;

/**
 * The actor's own to-dos (PRD §3.2.10): the open ones in their order, then the done ones, newest first.
 *
 * @method static Collection run(User $actor)
 */
final class ListTodos extends BaseUseCase implements UseCaseInterface
{
    private readonly UserTodoRepository $todos;

    public function handle(mixed ...$arguments): mixed
    {
        $this->todos = app(UserTodoRepository::class);

        return $this->execute(...$arguments);
    }

    /** @return Collection<int, UserTodo> */
    private function execute(User $actor): Collection
    {
        return $this->todos->listForUser($actor->id);
    }
}

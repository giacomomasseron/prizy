<?php

declare(strict_types=1);

namespace App\UseCases\Todos;

use App\Models\User;
use App\Models\UserTodo;
use App\Repositories\UserTodoRepository;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;
use Illuminate\Database\Eloquent\ModelNotFoundException;

/**
 * Delete one of the actor's to-dos straight away (PRD §3.2.10). Another user's to-do → 404.
 *
 * @method void run(User $actor, string $id)
 */
final class DeleteTodo extends BaseUseCase implements UseCaseInterface
{
    public function __construct(private readonly UserTodoRepository $todos) {}

    public function handle(mixed ...$arguments): mixed
    {
        $this->execute(...$arguments);

        return null;
    }

    private function execute(User $actor, string $id): void
    {
        $todo = $this->todos->findForUser($id, $actor->id);
        if ($todo === null) {
            throw (new ModelNotFoundException())->setModel(UserTodo::class, [$id]);
        }

        $this->todos->delete($todo);
    }
}

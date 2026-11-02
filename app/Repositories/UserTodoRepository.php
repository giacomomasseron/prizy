<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\UserTodo;
use Illuminate\Support\Collection;

/** Personal to-dos (PRD §3.2.10). Every query filters by the user: nobody reads another user's list. */
final class UserTodoRepository
{
    /** Two open to-dos closer than this are renumbered 1, 2, 3… (repeated halving runs out of precision). */
    public const MIN_GAP = 1e-6;

    /** @return Collection<int, UserTodo> the open to-dos by position, then the done ones, newest first */
    public function listForUser(string $userId): Collection
    {
        $open = UserTodo::query()->with('issue')
            ->where('user_id', $userId)->whereNull('completed_at')
            ->orderBy('position')->orderBy('id')
            ->get();
        $done = UserTodo::query()->with('issue')
            ->where('user_id', $userId)->whereNotNull('completed_at')
            ->orderByDesc('completed_at')->orderBy('id')
            ->get();

        return collect([...$open, ...$done]);
    }

    /** Null for another user's to-do, so the caller answers 404 and never reveals that the id exists. */
    public function findForUser(string $id, string $userId): ?UserTodo
    {
        return UserTodo::query()->with('issue')->where('user_id', $userId)->find($id);
    }

    /** The position that puts a new to-do above every open one. */
    public function topPosition(string $userId): float
    {
        $min = UserTodo::query()->where('user_id', $userId)->whereNull('completed_at')->min('position');

        return $min === null ? 0.0 : (float) $min - 1;
    }

    public function create(string $userId, string $body, ?string $issueId, float $position): UserTodo
    {
        $todo = UserTodo::query()->create([
            'user_id' => $userId,
            'body' => $body,
            'issue_id' => $issueId,
            'position' => $position,
        ]);

        return $todo->load('issue');
    }

    public function save(UserTodo $todo): UserTodo
    {
        $todo->save();

        return $todo->load('issue');
    }

    public function delete(UserTodo $todo): void
    {
        $todo->delete();
    }

    public function deleteDone(string $userId): void
    {
        UserTodo::query()->where('user_id', $userId)->whereNotNull('completed_at')->delete();
    }

    /** True when two of the user's open to-dos sit closer than MIN_GAP. */
    public function openPositionsCrowded(string $userId): bool
    {
        $positions = UserTodo::query()->where('user_id', $userId)->whereNull('completed_at')
            ->orderBy('position')->pluck('position')->map(fn (mixed $p): float => (float) $p)->all();
        for ($i = 1; $i < count($positions); $i++) {
            if ($positions[$i] - $positions[$i - 1] < self::MIN_GAP) {
                return true;
            }
        }

        return false;
    }

    /** Renumber the user's open to-dos 1, 2, 3… in their current order. */
    public function renumberOpen(string $userId): void
    {
        $ids = UserTodo::query()->where('user_id', $userId)->whereNull('completed_at')
            ->orderBy('position')->orderBy('id')->pluck('id');
        foreach ($ids as $i => $id) {
            UserTodo::query()->whereKey($id)->update(['position' => $i + 1]);
        }
    }
}

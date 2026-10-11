<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\ProjectMessage;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Pagination\CursorPaginator;

/** Project chat messages (PRD §3.2.11). Soft-deleted messages never come back from here. */
final class ProjectMessageRepository
{
    /** Newest first (the chat loads the latest page, then older ones); the client shows them oldest at the top. */
    public function paginateForProject(string $projectId, int $limit): CursorPaginator
    {
        return ProjectMessage::query()->with('issues')
            ->where('project_id', $projectId)
            ->orderByDesc('created_at')->orderByDesc('id')
            ->cursorPaginate(perPage: $limit, cursorName: 'after')
            ->withQueryString();
    }

    /**
     * Live messages by id with their project's name, for notification subjects — one query. A deleted message, or one
     * whose project was deleted, is left out.
     *
     * @param  list<string>  $ids
     * @return Collection<string, ProjectMessage> keyed by id
     */
    public function findManyWithProject(array $ids): Collection
    {
        if ($ids === []) {
            return new Collection;
        }

        return ProjectMessage::query()->with('project:id,name')->whereIn('id', $ids)->get()
            ->filter(fn (ProjectMessage $message): bool => $message->project !== null)
            ->keyBy('id');
    }

    /** Null for a deleted message or one from another project. */
    public function findInProject(string $id, string $projectId): ?ProjectMessage
    {
        return ProjectMessage::query()->with('issues')->where('project_id', $projectId)->find($id);
    }

    /** @param list<string> $issueIds */
    public function create(string $projectId, string $userId, string $body, array $issueIds): ProjectMessage
    {
        $message = ProjectMessage::query()->create(['project_id' => $projectId, 'user_id' => $userId, 'body' => $body]);
        $message->issues()->sync($issueIds);

        return $message->load('issues');
    }

    /** @param list<string>|null $issueIds the message's links after the edit (they replace the old ones); null keeps them */
    public function edit(ProjectMessage $message, string $body, ?array $issueIds): ProjectMessage
    {
        $message->body = $body;
        $message->edited_at = now();
        $message->save();
        if ($issueIds !== null) {
            $message->issues()->sync($issueIds);
        }

        return $message->load('issues');
    }

    public function delete(ProjectMessage $message): void
    {
        $message->delete();
    }
}

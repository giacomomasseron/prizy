<?php

declare(strict_types=1);

namespace App\UseCases\Issues;

use App\Models\Issue;
use App\Models\User;
use App\Repositories\IssueRepository;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * A card dropped on the board: the issue takes a place in a column's manual order, right before another issue
 * (`before_id`) or at the end (`before_id` null). When `status` names another column, it also moves there, as an
 * ordinary status change (logged, notified, broadcast). A new place alone is not an edit: nothing is logged and
 * `updated_at` stays.
 *
 * @method Issue run(User $actor, array $data)
 */
final class MoveIssue extends BaseUseCase implements UseCaseInterface
{
    private const STATUSES = ['backlog', 'todo', 'in_progress', 'in_review', 'done', 'cancelled'];

    public function __construct(
        private readonly IssueRepository $issues,
        private readonly TransitionIssueStatus $transitionIssueStatus,
    ) {}

    public function handle(mixed ...$arguments): mixed
    {
        return $this->execute(...$arguments);
    }

    /** @param array<string, mixed> $data */
    private function execute(User $actor, array $data): Issue
    {
        $issue = $this->issues->findInWorkspace((string) $data['issue_id']);

        if ($issue === null) {
            throw ValidationException::withMessages(['issue_id' => ['The selected issue is invalid.']]);
        }

        $status = (string) ($data['status'] ?? $issue->status);

        if (! in_array($status, self::STATUSES, true)) {
            throw ValidationException::withMessages(['status' => ['The selected status is invalid.']]);
        }

        $before = $this->issueToPlaceBefore($issue, $status, $data['before_id'] ?? null);

        DB::transaction(function () use ($issue, $status, $before): void {
            if ($before !== null) {
                $this->issues->placeBefore($issue, $before);
            } else {
                $this->issues->placeLast($issue, $status);
            }
        });

        if ($status !== $issue->status) {
            $this->transitionIssueStatus->run($actor, ['issue_id' => $issue->id, 'status' => $status]);
        }

        return $issue->refresh();
    }

    private function issueToPlaceBefore(Issue $issue, string $status, mixed $beforeId): ?Issue
    {
        if ($beforeId === null) {
            return null;
        }

        if ((string) $beforeId === $issue->id) {
            throw ValidationException::withMessages(['before_id' => ['An issue cannot be placed before itself.']]);
        }

        $before = $this->issues->findInWorkspace((string) $beforeId);

        if ($before === null) {
            throw ValidationException::withMessages(['before_id' => ['The selected issue is invalid.']]);
        }

        if ($before->status !== $status) {
            throw ValidationException::withMessages(['before_id' => ['That issue is not in the column the issue is moved to.']]);
        }

        return $before;
    }
}

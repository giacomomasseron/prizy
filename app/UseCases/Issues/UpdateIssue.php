<?php

declare(strict_types=1);

namespace App\UseCases\Issues;

use App\Events\IssueUpdated;
use App\Models\Issue;
use App\Models\User;
use App\Repositories\IssueActivityRepository;
use App\Repositories\IssueRepository;
use App\UseCases\Issues\Concerns\ValidatesWorkspaceReferences;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

final class UpdateIssue
{
    use ValidatesWorkspaceReferences;

    /** field => activity type */
    private const TRACKED = [
        'title'           => 'title_changed',
        'description'     => 'description_changed',
        'priority'        => 'priority_changed',
        'estimate'        => 'estimate_changed',
        'due_date'        => 'due_date_changed',
        'project_id'      => 'project_changed',
        'cycle_id'        => 'cycle_changed',
        'parent_issue_id' => 'parent_changed',
    ];

    public function __construct(
        private readonly IssueRepository $issues,
        private readonly IssueActivityRepository $activities,
    ) {}

    /** @param array<string, mixed> $data */
    public function handle(User $actor, array $data): Issue
    {
        $issue = $this->issues->findInWorkspace((string) $data['issue_id']);

        if ($issue === null) {
            throw ValidationException::withMessages(['issue_id' => ['The selected issue is invalid.']]);
        }

        if (array_key_exists('parent_issue_id', $data)) {
            if ($data['parent_issue_id'] === $issue->id) {
                throw ValidationException::withMessages(['parent_issue_id' => ['An issue cannot block or parent itself.']]);
            }
            $this->assertIssueInWorkspace($data['parent_issue_id'], 'parent_issue_id');
        }
        $this->assertProjectInWorkspace($data['project_id'] ?? null);
        $this->assertCycleInWorkspace($data['cycle_id'] ?? null);

        $changes = [];
        foreach (self::TRACKED as $field => $type) {
            if (! array_key_exists($field, $data)) {
                continue;
            }
            $old = $this->normalize($issue->{$field});
            $new = $this->normalize($data[$field]);
            if ($old === $new) {
                continue;
            }
            $changes[$field] = ['type' => $type, 'from' => $old, 'to' => $new, 'raw' => $data[$field]];
        }

        if ($changes === []) {
            return $issue;
        }

        DB::transaction(function () use ($issue, $actor, $changes): void {
            $this->issues->update($issue, array_map(static fn (array $c): mixed => $c['raw'], $changes));

            foreach ($changes as $change) {
                $this->activities->log($issue->id, $actor->id, $change['type'], $change['from'], $change['to']);
            }
        });

        event(new IssueUpdated($issue));

        return $issue;
    }

    private function normalize(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }
        if ($value instanceof Carbon) {
            return $value->toDateString();
        }

        return (string) $value;
    }
}

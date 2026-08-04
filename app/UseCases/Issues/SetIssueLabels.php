<?php

declare(strict_types=1);

namespace App\UseCases\Issues;

use App\Models\Label;
use App\Models\User;
use App\Repositories\IssueActivityRepository;
use App\Repositories\IssueLabelRepository;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

final class SetIssueLabels
{
    public function __construct(
        private readonly IssueLabelRepository $issueLabels,
        private readonly IssueActivityRepository $activities,
    ) {}

    /** @param array<string, mixed> $data */
    public function handle(User $actor, array $data): void
    {
        $issueId = (string) $data['issue_id'];
        $labelIds = array_values(array_unique(array_map('strval', (array) ($data['label_ids'] ?? []))));

        // workspace-scoping: Label is TenantAware so this query is automatically scoped
        $labels = Label::whereIn('id', $labelIds)->get(['id', 'group', 'name']);
        if ($labels->count() !== count($labelIds)) {
            throw ValidationException::withMessages(['label_ids' => ['One or more labels are invalid.']]);
        }

        foreach ($labels->whereNotNull('group')->groupBy('group') as $group => $groupLabels) {
            if ($groupLabels->count() > 1) {
                throw ValidationException::withMessages([
                    'label_ids' => ["Only one label from the '{$group}' group can be applied to an issue."],
                ]);
            }
        }

        $before = $this->issueLabels->labelsForIssue($issueId);
        $beforeIds = $before->pluck('id')->map('strval')->all();
        $added = array_values(array_diff($labelIds, $beforeIds));
        $removed = array_values(array_diff($beforeIds, $labelIds));
        $newById = $labels->keyBy('id');
        $beforeById = $before->keyBy('id');

        DB::transaction(function () use ($issueId, $labelIds, $actor, $added, $removed, $newById, $beforeById): void {
            $this->issueLabels->syncForIssue($issueId, $labelIds);
            foreach ($added as $id) {
                $this->activities->log($issueId, $actor->id, 'label_added', null, $newById->get($id)?->name);
            }
            foreach ($removed as $id) {
                $this->activities->log($issueId, $actor->id, 'label_removed', null, $beforeById->get($id)?->name);
            }
        });
    }
}

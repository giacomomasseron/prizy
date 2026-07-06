<?php

declare(strict_types=1);

namespace App\UseCases\Issues;

use App\Models\Label;
use App\Models\User;
use App\Repositories\IssueLabelRepository;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

final class SetIssueLabels
{
    public function __construct(private readonly IssueLabelRepository $issueLabels) {}

    /** @param array<string, mixed> $data */
    public function handle(User $actor, array $data): void
    {
        $labelIds = array_values(array_unique(array_map('strval', (array) ($data['label_ids'] ?? []))));

        // workspace-scoping: Label is TenantAware so this query is automatically scoped
        $labels = Label::whereIn('id', $labelIds)->get(['id', 'group']);
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

        DB::transaction(fn () => $this->issueLabels->syncForIssue((string) $data['issue_id'], $labelIds));
    }
}

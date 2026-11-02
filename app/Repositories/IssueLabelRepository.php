<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\IssueLabel;
use App\Models\Label;
use Illuminate\Support\Collection;

final class IssueLabelRepository
{
    /** @param list<string> $labelIds */
    public function syncForIssue(string $issueId, array $labelIds): void
    {
        IssueLabel::where('issue_id', $issueId)->delete();
        foreach (array_unique($labelIds) as $labelId) {
            IssueLabel::create(['issue_id' => $issueId, 'label_id' => $labelId]);
        }
    }

    /** @return Collection<int, Label> */
    public function labelsForIssue(string $issueId): Collection
    {
        $ids = IssueLabel::where('issue_id', $issueId)->pluck('label_id');

        return Label::whereIn('id', $ids)->orderBy('name')->get();
    }
}

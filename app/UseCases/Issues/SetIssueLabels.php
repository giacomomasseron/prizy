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
        /** @var list<string> $labelIds */
        $labelIds = array_values(array_unique(array_map('strval', (array) ($data['label_ids'] ?? []))));

        // Every id must be a label in the current workspace (Label is TenantAware).
        $found = Label::whereIn('id', $labelIds)->pluck('id')->all();
        if (count($found) !== count($labelIds)) {
            throw ValidationException::withMessages(['label_ids' => ['One or more labels are invalid.']]);
        }

        DB::transaction(fn () => $this->issueLabels->syncForIssue((string) $data['issue_id'], $labelIds));
    }
}

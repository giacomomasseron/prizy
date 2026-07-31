<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\HelpdeskSavedReport;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Str;

final class HelpdeskSavedReportRepository
{
    /** @return Collection<int, HelpdeskSavedReport> */
    public function forWorkspace(): Collection
    {
        return HelpdeskSavedReport::query()->orderBy('name')->orderBy('id')->get();
    }

    /** @param array<string, mixed> $attrs */
    public function create(array $attrs): HelpdeskSavedReport
    {
        $attrs['id'] ??= (string) Str::uuid();
        $report = HelpdeskSavedReport::create($attrs);
        $report->refresh();

        return $report;
    }

    public function findInWorkspace(string $id): ?HelpdeskSavedReport
    {
        return HelpdeskSavedReport::find($id); // WorkspaceScope → cross-workspace id yields null
    }

    public function delete(HelpdeskSavedReport $report): void
    {
        $report->delete();
    }
}

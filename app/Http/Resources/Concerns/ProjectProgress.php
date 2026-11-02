<?php

declare(strict_types=1);

namespace App\Http\Resources\Concerns;

trait ProjectProgress
{
    /** @return array{id:string,name:string}|null */
    private function leadData(): ?array
    {
        return $this->lead ? ['id' => $this->lead->id, 'name' => $this->lead->name] : null;
    }

    private function issueCount(): int
    {
        return (int) ($this->issues_count ?? $this->issues()->count());
    }

    private function progressPercent(): int
    {
        $total = $this->issueCount();
        if ($total === 0) {
            return 0;
        }
        $done = (int) ($this->done_count ?? $this->issues()->where('status', 'done')->count());

        return (int) round($done / $total * 100);
    }
}

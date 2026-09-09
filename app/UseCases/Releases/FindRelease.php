<?php

declare(strict_types=1);

namespace App\UseCases\Releases;

use App\Models\Release;
use App\Repositories\ReleaseRepository;
use Illuminate\Database\Eloquent\ModelNotFoundException;

final class FindRelease
{
    public function __construct(private readonly ReleaseRepository $releases) {}

    public function handle(string $id, bool $withDetail = false): Release
    {
        $release = $this->releases->find($id);
        if ($release === null) {
            throw (new ModelNotFoundException)->setModel(Release::class, [$id]);
        }

        if ($withDetail) {
            $release->load([
                'issues' => fn ($q) => $q->orderBy('status')->orderBy('sort_order'),
                'issues.assignee',
            ]);
            $release->setAttribute(
                'rollup',
                $this->releases->rollups($release->workspace_id, [$release->id])[$release->id] ?? ReleaseRepository::emptyRollup(),
            );
        }

        return $release;
    }
}

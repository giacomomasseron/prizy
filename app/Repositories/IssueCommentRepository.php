<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\IssueComment;
use Illuminate\Support\Str;

final class IssueCommentRepository
{
    /** @param array<string, mixed> $attributes */
    public function create(array $attributes): IssueComment
    {
        if (! isset($attributes['id'])) {
            $attributes['id'] = (string) Str::uuid();
        }

        return IssueComment::create($attributes);
    }
}

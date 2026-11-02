<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Connection;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Table;

/**
 * @property string $id
 * @property string $workspace_id
 * @property string $issue_id
 * @property string $repo
 * @property int $number
 * @property string $url
 * @property string|null $title
 * @property string $state
 * @property string $source
 * @property string $created_by
 */
#[Table(name: 'issue_github_links', key: 'id', keyType: 'string', incrementing: false, timestamps: true)]
#[Connection('pgsql')]
#[Fillable(['id', 'issue_id', 'repo', 'number', 'url', 'title', 'state', 'source', 'created_by'])]
final class IssueGithubLink extends TenantAwareEntity
{
    /** @var array<string, mixed> */
    protected $attributes = [
        'state' => 'open',
        'source' => 'manual',
    ];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'id'           => 'string',
            'workspace_id' => 'string',
            'issue_id'     => 'string',
            'repo'         => 'string',
            'number'       => 'integer',
            'url'          => 'string',
            'title'        => 'string',
            'state'        => 'string',
            'source'       => 'string',
            'created_by'   => 'string',
            'created_at'   => 'datetime',
            'updated_at'   => 'datetime',
        ];
    }
}

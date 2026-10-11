<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Connection;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Table;
use Illuminate\Database\Eloquent\Model;

/**
 * An issue linked from a project chat message (PRD §3.2.11). Keyed by (message_id, issue_id); scoped through the
 * message. Rows are only read and written through query builders.
 *
 * @property string $message_id
 * @property string $issue_id
 */
#[Table(name: 'project_message_issues', key: 'message_id', keyType: 'string', incrementing: false, timestamps: false)]
#[Connection('pgsql')]
#[Fillable(['message_id', 'issue_id'])]
final class ProjectMessageIssue extends Model
{
}

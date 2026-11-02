<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class StoreIssueRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // route can:create handles authorization
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'team_id' => ['required', 'string'],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'priority' => ['sometimes', Rule::in(['no_priority', 'urgent', 'high', 'medium', 'low'])],
            'estimate' => ['nullable', 'integer', 'min:0'],
            'due_date' => ['nullable', 'date'],
            'project_id' => ['nullable', 'string'],
            'release_id' => ['sometimes', 'nullable', 'uuid'],
            'cycle_id' => ['nullable', 'string'],
            'parent_issue_id' => ['nullable', 'string'],
            'assignee_id' => ['nullable', 'string'],
            'status' => ['sometimes', Rule::in(['backlog', 'todo', 'in_progress', 'in_review', 'done', 'cancelled'])],
        ];
    }
}

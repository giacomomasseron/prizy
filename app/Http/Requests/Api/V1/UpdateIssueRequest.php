<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class UpdateIssueRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // controller Gate::authorize('update', $issue) handles authorization
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'title'           => ['sometimes', 'string', 'max:255'],
            'description'     => ['sometimes', 'nullable', 'string'],
            'priority'        => ['sometimes', Rule::in(['no_priority', 'urgent', 'high', 'medium', 'low'])],
            'estimate'        => ['sometimes', 'nullable', 'integer', 'min:0'],
            'due_date'        => ['sometimes', 'nullable', 'date'],
            'project_id'      => ['sometimes', 'nullable', 'string'],
            'cycle_id'        => ['sometimes', 'nullable', 'string'],
            'parent_issue_id' => ['sometimes', 'nullable', 'string'],
        ];
    }
}

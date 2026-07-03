<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class SearchIssuesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // session/token auth on the route; reads are workspace-wide
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'q'             => ['sometimes', 'string'],
            'page'          => ['sometimes', 'integer', 'min:1'],
            'filter'        => ['sometimes', 'array'],
            'filter.status' => ['sometimes', Rule::in(['backlog', 'todo', 'in_progress', 'in_review', 'done', 'cancelled'])],
            'filter.team_id' => ['sometimes', 'uuid'],
        ];
    }
}

<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class MoveIssueRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            // The column the card was dropped in; left out when it stays in its own.
            'status' => ['sometimes', Rule::in(['backlog', 'todo', 'in_progress', 'in_review', 'done', 'cancelled'])],
            // The card it was dropped on, or null for the end of the column. Always sent, so a place is never guessed.
            'before_id' => ['present', 'nullable', 'uuid'],
        ];
    }
}

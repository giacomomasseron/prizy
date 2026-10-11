<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;

/** A project chat message, posted or edited (PRD §3.2.11). */
final class ProjectMessageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // the controller authorizes against the project
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            // Strings arrive trimmed, and a blank one as null (the global middleware), so blank text fails `required`.
            'body' => ['required', 'string', 'max:4000'],
            'issue_ids' => ['sometimes', 'array', 'max:20'],
            'issue_ids.*' => ['uuid', 'distinct'],
        ];
    }

    /** @return list<string> */
    public function issueIds(): array
    {
        return array_values(array_map('strval', (array) $this->validated('issue_ids', [])));
    }
}

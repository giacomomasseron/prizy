<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;

final class AddTodoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // the route's tracker gate handles authorization
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            // Strings arrive trimmed, and a blank one as null (the global middleware), so blank text fails `required`.
            'text' => ['required', 'string', 'max:500'],
            'issue_id' => ['sometimes', 'nullable', 'uuid'],
        ];
    }
}

<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class UpdateProjectRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'name'        => ['sometimes', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string'],
            'icon'        => ['sometimes', 'nullable', 'string', 'max:64'],
            'color'       => ['sometimes', 'string', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'status'      => ['sometimes', Rule::in(['planning', 'in_progress', 'paused', 'completed', 'cancelled'])],
            'team_id'     => ['sometimes', 'nullable', 'string'],
            'start_date'  => ['sometimes', 'nullable', 'date'],
            'target_date' => ['sometimes', 'nullable', 'date', 'after_or_equal:start_date'],
        ];
    }
}

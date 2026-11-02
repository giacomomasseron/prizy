<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class StoreProjectRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'name'        => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'icon'        => ['nullable', 'string', 'max:64'],
            'color'       => ['sometimes', 'string', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'status'      => ['sometimes', Rule::in(['planning', 'in_progress', 'paused', 'completed', 'cancelled'])],
            'lead_id'     => ['nullable', 'string'],
            'priority'    => ['sometimes', Rule::in(['no_priority', 'urgent', 'high', 'medium', 'low'])],
            'team_id'     => ['nullable', 'string'],
            'start_date'  => ['nullable', 'date'],
            'target_date' => ['nullable', 'date', 'after_or_equal:start_date'],
        ];
    }
}

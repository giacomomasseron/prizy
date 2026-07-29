<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;

final class SlaPolicyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // capability gate is is_agent in the use case
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'first_reply_minutes' => ['required', 'integer', 'min:1'],
            'next_reply_minutes' => ['nullable', 'integer', 'min:1'],
            'resolution_minutes' => ['required', 'integer', 'min:1'],
            'schedule_id' => ['nullable', 'uuid', 'exists:business_hour_schedules,id'],
        ];
    }
}

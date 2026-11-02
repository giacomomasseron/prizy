<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;

final class UpdateCycleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'name'          => ['sometimes', 'string', 'max:255'],
            'starts_at'     => ['sometimes', 'date'],
            'ends_at'       => ['sometimes', 'date', 'after:starts_at'],
            'cooldown_days' => ['sometimes', 'integer', 'min:0'],
            'description'   => ['sometimes', 'nullable', 'string'],
        ];
    }
}

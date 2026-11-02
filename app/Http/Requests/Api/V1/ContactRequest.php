<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;

final class ContactRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // capability gate lives in the use case (an agent, not a viewer)
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:contacts,email'],
            'phone' => ['nullable', 'string', 'max:32'],
        ];
    }
}

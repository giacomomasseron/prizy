<?php

declare(strict_types=1);

namespace App\Http\Requests\Portal;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class SubmitPortalRequestRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // route is auth:contact-gated; own-by-construction in the use case
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'subject' => ['required', 'string', 'max:255'],
            'priority' => ['required', Rule::in(['low', 'normal', 'high', 'urgent'])],
            'body' => ['required', 'string'],
        ];
    }
}

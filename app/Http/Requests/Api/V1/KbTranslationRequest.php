<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;

final class KbTranslationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // capability gate lives in the use case (an agent, not a viewer)
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            // An empty body is a legitimate draft; only publishing demands content.
            'body' => ['present', 'string', 'max:200000'],
        ];
    }
}

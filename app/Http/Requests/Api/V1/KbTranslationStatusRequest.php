<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class KbTranslationStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // capability gate lives in the use case (an agent, not a viewer)
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return ['status' => ['required', Rule::in(['draft', 'published', 'archived'])]];
    }
}

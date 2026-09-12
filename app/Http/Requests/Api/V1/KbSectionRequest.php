<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use App\Services\KbSlug;
use Illuminate\Foundation\Http\FormRequest;

final class KbSectionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // capability gate is is_agent in the use case
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'category_id' => [$this->isMethod('POST') ? 'required' : 'prohibited', 'uuid'],
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['required', 'string', 'max:80', 'regex:'.KbSlug::PATTERN],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'slug.regex' => 'Use lowercase letters, numbers and single hyphens.',
        ];
    }
}

<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use App\Services\KbPalette;
use App\Services\KbSlug;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class KbCategoryRequest extends FormRequest
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
            'slug' => ['required', 'string', 'max:80', 'regex:'.KbSlug::PATTERN, Rule::notIn(KbSlug::RESERVED)],
            'icon' => ['required', 'string', Rule::in(KbPalette::ICONS)],
            'color' => ['required', 'string', Rule::in(KbPalette::COLORS)],
            'description' => ['nullable', 'string', 'max:500'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'slug.not_in' => 'search, articles, requests, new and login are reserved.',
            'slug.regex' => 'Use lowercase letters, numbers and single hyphens.',
        ];
    }

    /** @return array{name:string,slug:string,icon:string,color:string,description:?string} */
    public function categoryData(): array
    {
        $v = $this->validated();

        return ['name' => $v['name'], 'slug' => $v['slug'], 'icon' => $v['icon'], 'color' => $v['color'], 'description' => $v['description'] ?? null];
    }
}

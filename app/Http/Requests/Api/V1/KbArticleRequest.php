<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use App\Services\KbSlug;
use Illuminate\Foundation\Http\FormRequest;

final class KbArticleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // capability gate is is_agent in the use case
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $post = $this->isMethod('POST');

        // PATCH is partial: a field absent from the body is left alone, but a
        // field that IS sent must carry a real value — hence sometimes+filled
        // rather than required. `body` is exempt from `filled`: an empty string
        // is a legitimate draft (only publishing demands content).
        return [
            'section_id' => [$post ? 'required' : 'sometimes', 'filled', 'uuid'],
            'title' => [$post ? 'required' : 'sometimes', 'filled', 'string', 'max:255'],
            'slug' => [$post ? 'required' : 'sometimes', 'filled', 'string', 'max:80', 'regex:'.KbSlug::PATTERN],
            'body' => [$post ? 'present' : 'sometimes', 'nullable', 'string', 'max:200000'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'slug.regex' => 'Use lowercase letters, numbers and single hyphens.',
        ];
    }

    /** @return array<string, mixed> */
    public function articleData(): array
    {
        $v = $this->validated();
        if (array_key_exists('body', $v)) {
            $v['body'] = (string) ($v['body'] ?? '');
        }

        return $v;
    }
}

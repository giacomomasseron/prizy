<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

final class HelpdeskSavedViewRequest extends FormRequest
{
    private const FILTER_KEYS = ['status', 'channel', 'assignee_id', 'tag_id'];

    private const SORTS = ['updated_at', 'created_at', 'priority', 'sla_due'];

    public function authorize(): bool
    {
        return true; // capability gate is is_agent in the use case
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'definition' => ['required', 'array'],
            'definition.filter' => ['sometimes', 'array'],
            'definition.filter.*' => ['sometimes', 'string'],
            'definition.sort' => ['sometimes', 'nullable', 'string', Rule::in(self::SORTS)],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            /** @var array<string, mixed> $definition */
            $definition = (array) $this->input('definition', []);

            $filter = $definition['filter'] ?? [];
            if (is_array($filter)) {
                foreach (array_keys($filter) as $key) {
                    if (! in_array($key, self::FILTER_KEYS, true)) {
                        $validator->errors()->add('definition.filter', "Unknown filter [{$key}].");
                    }
                }
            }
        });
    }
}

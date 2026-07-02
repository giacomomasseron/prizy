<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

final class StoreSavedViewRequest extends FormRequest
{
    private const FILTER_KEYS = ['status', 'priority', 'assignee_id', 'project_id', 'cycle_id', 'team_id', 'parent_issue_id', 'archived', 'label_id'];

    private const SORT_COLUMNS = ['created_at', 'updated_at', 'priority', 'due_date', 'sort_order', 'status', 'title'];

    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'name'                 => ['required', 'string', 'max:255'],
            'definition'           => ['required', 'array'],
            'definition.filter'    => ['sometimes', 'array'],
            'definition.filter.*'  => ['string'],
            'definition.sort'      => ['sometimes', 'nullable', 'string'],
            'definition.view_type' => ['required', Rule::in(['list', 'board'])],
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

            $sort = $definition['sort'] ?? '';
            if (is_string($sort) && $sort !== '') {
                foreach (explode(',', $sort) as $field) {
                    $column = ltrim(trim($field), '-');
                    if ($column !== '' && ! in_array($column, self::SORT_COLUMNS, true)) {
                        $validator->errors()->add('definition.sort', "Cannot sort by [{$column}].");
                    }
                }
            }
        });
    }
}

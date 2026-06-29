<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

final class ListIssuesRequest extends FormRequest
{
    private const FILTERS = ['status', 'priority', 'assignee_id', 'project_id', 'cycle_id', 'team_id', 'parent_issue_id', 'archived'];

    private const SORTS = ['created_at', 'updated_at', 'priority', 'due_date', 'sort_order', 'status', 'title'];

    public function authorize(): bool
    {
        return true; // route can:viewAny handles authorization
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'filter' => ['sometimes', Rule::array(self::FILTERS)],
            'sort'   => ['sometimes', 'string'],
            'limit'  => ['sometimes', 'integer', 'min:1', 'max:100'],
            'fields' => ['sometimes', 'array'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $sort = $this->query('sort');
            if (! is_string($sort) || $sort === '') {
                return;
            }
            foreach (explode(',', $sort) as $field) {
                $column = ltrim(trim($field), '-');
                if ($column !== '' && ! in_array($column, self::SORTS, true)) {
                    $validator->errors()->add('sort', "Cannot sort by [{$column}].");
                }
            }
        });
    }

    /** @return array<string, string> */
    public function filters(): array
    {
        /** @var array<string, string> $filter */
        $filter = $this->validated('filter', []);

        return $filter;
    }

    /** @return list<array{column:string,dir:string}> */
    public function sorts(): array
    {
        $sort = $this->validated('sort');
        if (! is_string($sort) || $sort === '') {
            return [['column' => 'sort_order', 'dir' => 'asc']];
        }

        $sorts = [];
        foreach (explode(',', $sort) as $field) {
            $field = trim($field);
            if ($field === '') {
                continue;
            }
            $desc = str_starts_with($field, '-');
            $sorts[] = ['column' => ltrim($field, '-'), 'dir' => $desc ? 'desc' : 'asc'];
        }

        return $sorts;
    }

    public function limit(): int
    {
        return (int) $this->validated('limit', 25);
    }
}

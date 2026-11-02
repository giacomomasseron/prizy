<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class ListTicketsRequest extends FormRequest
{
    private const FILTERS = ['status', 'channel', 'assignee_id', 'tag_id'];

    public function authorize(): bool
    {
        return true; // capability gate lives in the use case (is_agent)
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'filter' => ['sometimes', Rule::array(self::FILTERS)],
            'filter.*' => ['sometimes', 'string'],
            'sort' => ['sometimes', Rule::in(['updated_at', 'created_at', 'priority', 'sla_due'])],
            'limit' => ['sometimes', 'integer', 'between:1,50'],
        ];
    }

    /** @return array<string, string> */
    public function filters(): array
    {
        /** @var array<string, string> $filter */
        $filter = $this->validated('filter', []);

        return $filter;
    }

    public function sort(): string
    {
        $sort = $this->validated('sort');

        return is_string($sort) ? $sort : 'updated_at';
    }

    public function limit(): int
    {
        $limit = $this->validated('limit');

        return is_numeric($limit) ? (int) $limit : 25;
    }
}

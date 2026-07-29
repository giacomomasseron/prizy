<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class ScheduleRequest extends FormRequest
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
            'timezone' => ['required', 'string', Rule::in(timezone_identifiers_list())],
            'intervals' => ['present', 'array'],
            'intervals.*.day_of_week' => ['required', 'integer', 'between:0,6'],
            'intervals.*.opens_at' => ['required', 'date_format:H:i'],
            'intervals.*.closes_at' => ['required', 'date_format:H:i', 'after:intervals.*.opens_at'],
        ];
    }

    /** Normalize HH:MM → HH:MM:SS for storage. @return array<string,mixed> */
    public function scheduleData(): array
    {
        $v = $this->validated();
        $v['intervals'] = array_map(fn (array $iv) => [
            'day_of_week' => (int) $iv['day_of_week'],
            'opens_at' => $iv['opens_at'].':00',
            'closes_at' => $iv['closes_at'].':00',
        ], $v['intervals']);

        return $v;
    }
}

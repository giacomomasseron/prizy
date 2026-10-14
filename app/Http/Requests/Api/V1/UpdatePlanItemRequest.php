<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use App\Services\PlanTime;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

final class UpdatePlanItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // the route's tracker gate handles authorization
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'minutes' => ['sometimes', 'integer', 'between:'.PlanTime::MIN.','.PlanTime::MAX],
            // A finite number: JSON's 1e999 decodes to INF, which Postgres stores but json_encode cannot answer.
            'position' => ['sometimes', 'numeric', static function (string $attribute, mixed $value, \Closure $fail): void {
                if (is_numeric($value) && ! is_finite((float) $value)) {
                    $fail('The position must be a finite number.');
                }
            }],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            if (! $this->hasAny(['minutes', 'position'])) {
                $validator->errors()->add('item', 'Nothing to change: send minutes or position.');
            }
        });
    }

    /** @return array{minutes?: int, position?: float} */
    public function changes(): array
    {
        $changes = [];
        if ($this->has('minutes')) {
            $changes['minutes'] = (int) $this->validated('minutes');
        }
        if ($this->has('position')) {
            $changes['position'] = (float) $this->validated('position');
        }

        return $changes;
    }
}

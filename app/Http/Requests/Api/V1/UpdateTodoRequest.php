<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

final class UpdateTodoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // the route's tracker gate handles authorization
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'text' => ['sometimes', 'required', 'string', 'max:500'],
            'done' => ['sometimes', 'boolean'],
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
            if (! $this->hasAny(['text', 'done', 'position'])) {
                $validator->errors()->add('todo', 'Nothing to change: send text, done or position.');
            }
        });
    }

    /** @return array{text?: string, done?: bool, position?: float} */
    public function changes(): array
    {
        $changes = [];
        if ($this->has('text')) {
            $changes['text'] = (string) $this->validated('text');
        }
        if ($this->has('done')) {
            $changes['done'] = $this->boolean('done');
        }
        if ($this->has('position')) {
            $changes['position'] = (float) $this->validated('position');
        }

        return $changes;
    }
}

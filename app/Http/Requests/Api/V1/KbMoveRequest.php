<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class KbMoveRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // capability gate lives in the use case (an agent, not a viewer)
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'direction' => ['required', Rule::in(['up', 'down'])],
        ];
    }
}

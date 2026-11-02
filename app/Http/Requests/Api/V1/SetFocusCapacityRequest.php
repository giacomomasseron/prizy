<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;

final class SetFocusCapacityRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // the route's tracker gate handles authorization
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        // 3 to 9 hours, in whole hours.
        return ['minutes' => ['required', 'integer', 'between:180,540', 'multiple_of:60']];
    }
}

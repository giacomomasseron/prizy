<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;

final class CycleReportRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // capability gate lives in the use case (developer-or-owner)
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'team_id' => ['required', 'uuid'],
            'cycle_id' => ['sometimes', 'uuid'],
        ];
    }
}

<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class SlaReportRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // capability gate lives in the use case (is_agent)
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'range' => ['sometimes', Rule::in(['7d', '30d', '90d'])],
        ];
    }

    public function range(): string
    {
        $range = $this->validated('range');

        return is_string($range) ? $range : '7d';
    }
}

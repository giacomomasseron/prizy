<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class HelpdeskSavedReportRequest extends FormRequest
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
            'definition' => ['required', 'array'],
            'definition.section' => ['required', Rule::in(['overview', 'agents', 'sla'])],
            'definition.range' => ['required', Rule::in(['7d', '30d', '90d'])],
        ];
    }
}

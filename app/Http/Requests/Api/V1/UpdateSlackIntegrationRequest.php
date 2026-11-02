<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class UpdateSlackIntegrationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // route can:update handles authorization
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'webhook_url' => ['nullable', 'string', 'starts_with:https://hooks.slack.com/'],
            'events'      => ['required', 'array'],
            'events.*'    => [Rule::in(['created', 'status_changed', 'assigned', 'commented'])],
            'is_active'   => ['required', 'boolean'],
        ];
    }
}

<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;

final class UpdateGithubIntegrationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // route can:update handles authorization
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'webhook_secret'        => ['nullable', 'string'],
            'move_to_done_on_merge' => ['required', 'boolean'],
            'is_active'             => ['required', 'boolean'],
        ];
    }
}

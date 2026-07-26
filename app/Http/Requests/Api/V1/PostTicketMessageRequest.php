<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;

final class PostTicketMessageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // capability gate lives in the use case (is_agent), not here
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'body' => ['required', 'string', 'max:20000'],
            'internal' => ['sometimes', 'boolean'],
        ];
    }
}

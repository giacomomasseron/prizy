<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class PatchTicketRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // capability gate lives in the use case (is_agent), not here
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'status' => ['required', Rule::in(['new', 'open', 'pending', 'on_hold', 'solved', 'closed'])],
        ];
    }
}

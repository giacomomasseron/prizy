<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;

final class AssignTicketRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // capability gate lives in the use case (agent, not a viewer), not here
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            // present is required, but the value may be null (unassign)
            'assignee_id' => ['present', 'nullable', 'uuid'],
        ];
    }
}

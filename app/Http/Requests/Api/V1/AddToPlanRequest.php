<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use App\Services\PlanTime;
use Illuminate\Foundation\Http\FormRequest;

final class AddToPlanRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // the route's tracker gate handles authorization
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'issue_id' => ['required', 'uuid'],
            'minutes' => ['sometimes', 'integer', 'between:'.PlanTime::MIN.','.PlanTime::MAX],
        ];
    }

    public function minutes(): ?int
    {
        return $this->has('minutes') ? (int) $this->validated('minutes') : null;
    }
}

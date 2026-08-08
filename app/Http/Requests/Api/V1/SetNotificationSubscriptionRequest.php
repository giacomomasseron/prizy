<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use App\Repositories\NotificationSubscriptionRepository;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class SetNotificationSubscriptionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'scope_type' => ['required', Rule::in(NotificationSubscriptionRepository::SCOPE_TYPES)],
            'scope_id' => ['required', 'uuid'],
            'level' => ['required', Rule::in(NotificationSubscriptionRepository::LEVELS)],
        ];
    }
}

<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use App\Repositories\NotificationPreferenceRepository;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class UpdateNotificationPreferencesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'email_digest_frequency' => ['sometimes', Rule::in(['off', 'daily', 'weekly'])],
            'preferences' => ['sometimes', 'array'],
            'preferences.*.event_type' => ['required', Rule::in(NotificationPreferenceRepository::EVENT_TYPES)],
            'preferences.*.channel' => ['required', Rule::in(NotificationPreferenceRepository::CHANNELS)],
            'preferences.*.enabled' => ['required', 'boolean'],
        ];
    }
}

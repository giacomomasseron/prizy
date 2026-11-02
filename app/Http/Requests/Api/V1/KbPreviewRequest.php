<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;

final class KbPreviewRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // capability gate lives in the use case (an agent; reading is open to viewers)
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'body' => ['present', 'nullable', 'string', 'max:200000'],
        ];
    }
}

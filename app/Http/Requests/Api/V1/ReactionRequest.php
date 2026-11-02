<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class ReactionRequest extends FormRequest
{
    public const EMOJIS = ['👀', '🎯', '🙏', '💯', '✅'];

    public function authorize(): bool
    {
        return true; // authz via Gate in the controller
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return ['emoji' => ['required', 'string', Rule::in(self::EMOJIS)]];
    }
}

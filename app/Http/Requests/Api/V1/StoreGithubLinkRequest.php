<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;

final class StoreGithubLinkRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // controller authorizes 'update' on the issue
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return ['url' => ['required', 'string', 'max:2048']];
    }
}

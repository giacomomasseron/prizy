<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use App\Models\Workspace;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class UpdateLabelRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $workspaceId = Workspace::current()?->id;
        $labelId = (string) $this->route('label');

        return [
            'name'  => ['sometimes', 'string', 'max:64', Rule::unique('labels', 'name')->where('workspace_id', $workspaceId)->ignore($labelId)],
            'color' => ['sometimes', 'string', 'regex:/^#[0-9a-fA-F]{6}$/'],
        ];
    }
}

<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use App\Models\Workspace;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class UpdateTeamRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $workspaceId = Workspace::current()?->id;
        $teamId = (string) $this->route('team');

        return [
            'name'       => ['sometimes', 'string', 'max:255'],
            'identifier' => ['sometimes', 'string', 'max:8', 'regex:/^[A-Z0-9]+$/', Rule::unique('teams', 'identifier')->where('workspace_id', $workspaceId)->ignore($teamId)->whereNull('deleted_at')],
            'color'      => ['sometimes', 'string', 'regex:/^#[0-9a-fA-F]{6}$/'],
        ];
    }
}

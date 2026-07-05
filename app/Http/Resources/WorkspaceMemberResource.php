<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\Invitation;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Wraps either a User (active) or an Invitation (invited) into the workspace member shape.
 *
 * @property-read User|Invitation $resource
 */
final class WorkspaceMemberResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        if ($this->resource instanceof Invitation) {
            return [
                'id'           => 'inv:' . $this->resource->id,
                'name'         => explode('@', $this->resource->email)[0],
                'email'        => $this->resource->email,
                'admin_level'  => $this->resource->admin_level,
                'is_developer' => $this->resource->is_developer,
                'is_agent'     => $this->resource->is_agent,
                'status'       => 'invited',
                'teams'        => [],
            ];
        }

        /** @var User $user */
        $user = $this->resource;

        return [
            'id'           => $user->id,
            'name'         => $user->name,
            'email'        => $user->email,
            'admin_level'  => $user->admin_level,
            'is_developer' => $user->is_developer,
            'is_agent'     => $user->is_agent,
            'status'       => 'active',
            'teams'        => $user->teamMembers->map(fn ($tm) => [
                'id'         => $tm->team->id,
                'identifier' => $tm->team->identifier,
                'color'      => $tm->team->color,
                'name'       => $tm->team->name,
            ])->values(),
        ];
    }
}

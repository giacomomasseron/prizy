<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class GithubLinkResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id'     => $this->id,
            'repo'   => $this->repo,
            'number' => $this->number,
            'url'    => $this->url,
            'title'  => $this->title,
            'state'  => $this->state,
        ];
    }
}

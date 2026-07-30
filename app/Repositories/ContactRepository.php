<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\Contact;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Str;

final class ContactRepository
{
    /** @return Collection<int, Contact> */
    public function forWorkspace(string $workspaceId): Collection
    {
        return Contact::query()
            ->where('workspace_id', $workspaceId)
            ->with('contactMetadata')
            ->orderBy('name')
            ->get();
    }

    public function find(string $id): ?Contact
    {
        return Contact::query()->find($id); // WorkspaceScope → cross-workspace id yields null
    }

    /** @param array<string,mixed> $attrs */
    public function create(array $attrs): Contact
    {
        $attrs['id'] ??= (string) Str::uuid();
        $contact = Contact::create($attrs);
        $contact->load('contactMetadata'); // so ContactResource's ->contactMetadata is a (empty) collection, no lazy-load

        return $contact;
    }
}

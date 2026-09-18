<?php

declare(strict_types=1);

namespace App\UseCases\Contacts;

use App\Models\Contact;
use App\Models\User;
use App\Repositories\ContactRepository;
use App\Services\HelpdeskAccess;
use Illuminate\Database\Eloquent\Collection;

final class ListContacts
{
    public function __construct(private readonly ContactRepository $contacts) {}

    /** @return Collection<int, Contact> */
    public function handle(User $actor): Collection
    {
        HelpdeskAccess::gate($actor);

        return $this->contacts->forWorkspace($actor->workspace_id);
    }
}

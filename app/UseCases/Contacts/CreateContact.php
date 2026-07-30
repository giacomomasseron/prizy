<?php

declare(strict_types=1);

namespace App\UseCases\Contacts;

use App\Models\Contact;
use App\Models\User;
use App\Repositories\ContactRepository;

final class CreateContact
{
    public function __construct(private readonly ContactRepository $contacts) {}

    /** @param array<string,mixed> $data */
    public function handle(User $actor, array $data): Contact
    {
        abort_unless($actor->is_agent, 403);

        return $this->contacts->create([
            'name' => $data['name'],
            'email' => $data['email'],
            'phone' => $data['phone'] ?? null,
        ]);
    }
}

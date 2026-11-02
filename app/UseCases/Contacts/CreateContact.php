<?php

declare(strict_types=1);

namespace App\UseCases\Contacts;

use App\Models\Contact;
use App\Models\User;
use App\Repositories\ContactRepository;
use App\Services\HelpdeskAccess;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;

/**
 * @method Contact run(User $actor, array $data)
 */
final class CreateContact extends BaseUseCase implements UseCaseInterface
{
    public function __construct(private readonly ContactRepository $contacts) {}

    public function handle(mixed ...$arguments): mixed
    {
        return $this->execute(...$arguments);
    }

    /** @param array<string,mixed> $data */
    private function execute(User $actor, array $data): Contact
    {
        HelpdeskAccess::gateWrite($actor);

        return $this->contacts->create([
            'name' => $data['name'],
            'email' => $data['email'],
            'phone' => $data['phone'] ?? null,
        ]);
    }
}

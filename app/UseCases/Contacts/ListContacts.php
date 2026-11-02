<?php

declare(strict_types=1);

namespace App\UseCases\Contacts;

use App\Models\Contact;
use App\Models\User;
use App\Repositories\ContactRepository;
use App\Services\HelpdeskAccess;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;
use Illuminate\Database\Eloquent\Collection;

/**
 * @method static Collection run(User $actor)
 */
final class ListContacts extends BaseUseCase implements UseCaseInterface
{
    private readonly ContactRepository $contacts;

    public function handle(mixed ...$arguments): mixed
    {
        $this->contacts = app(ContactRepository::class);

        return $this->execute(...$arguments);
    }

    /** @return Collection<int, Contact> */
    private function execute(User $actor): Collection
    {
        HelpdeskAccess::gate($actor);

        return $this->contacts->forWorkspace($actor->workspace_id);
    }
}

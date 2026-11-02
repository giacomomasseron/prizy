<?php

declare(strict_types=1);

namespace App\UseCases\Portal;

use App\Models\Contact;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;
use Illuminate\Support\Facades\Cache;

/**
 * Redeems a portal magic link: nonce must still be cached (single use — pull
 * deletes it) and must match the contact id in the (already signature-checked)
 * URL. Returns the contact to log in, or null (expired/mismatched/foreign).
 *
 * @method ?Contact run(string $nonce, string $contactId)
 */
final class ConsumePortalLoginLink extends BaseUseCase implements UseCaseInterface
{
    public function handle(mixed ...$arguments): mixed
    {
        return $this->execute(...$arguments);
    }

    private function execute(string $nonce, string $contactId): ?Contact
    {
        $cached = Cache::pull("portal-magic:{$nonce}");
        if ($cached === null || $cached !== $contactId) {
            return null;
        }

        return Contact::query()->find($contactId); // workspace-scoped: foreign host → null
    }
}

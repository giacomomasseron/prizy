<?php

declare(strict_types=1);

namespace App\UseCases\Portal;

use App\Models\Contact;
use Illuminate\Support\Facades\Cache;

/**
 * Redeems a portal magic link: nonce must still be cached (single use — pull
 * deletes it) and must match the contact id in the (already signature-checked)
 * URL. Returns the contact to log in, or null (expired/mismatched/foreign).
 */
final class ConsumePortalLoginLink
{
    public function handle(string $nonce, string $contactId): ?Contact
    {
        $cached = Cache::pull("portal-magic:{$nonce}");
        if ($cached === null || $cached !== $contactId) {
            return null;
        }

        return Contact::query()->find($contactId); // workspace-scoped: foreign host → null
    }
}

<?php

declare(strict_types=1);

namespace App\UseCases\Portal;

use App\Models\Contact;
use App\Notifications\PortalLoginLink;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;

/**
 * Emails a signed, single-use 15-minute portal sign-in link. Silent when the
 * email doesn't match a contact in the current workspace (anti-enumeration —
 * the RequestMagicLink precedent). Cache::pull in ConsumePortalLoginLink
 * enforces single use.
 *
 * @method static void run(string $email)
 */
final class RequestPortalLoginLink extends BaseUseCase implements UseCaseInterface
{
    public function handle(mixed ...$arguments): mixed
    {
        $this->execute(...$arguments);

        return null;
    }

    private function execute(string $email): void
    {
        $contact = Contact::query()->where('email', $email)->first(); // WorkspaceScope applies
        if ($contact === null) {
            return;
        }

        $nonce = Str::random(40);
        Cache::put("portal-magic:{$nonce}", $contact->id, now()->addMinutes(15));

        $url = URL::temporarySignedRoute('help.login.consume', now()->addMinutes(15), [
            'nonce' => $nonce, 'contact' => $contact->id,
        ]);

        Notification::route('mail', $contact->email)->notify(new PortalLoginLink($url));
    }
}

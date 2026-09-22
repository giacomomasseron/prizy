<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\UseCases\Tls\AuthorizeTlsHost;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/**
 * Caddy's on-demand TLS gate. 200 means "issue a certificate"; anything else
 * means refuse. Unauthenticated by necessity — Caddy has no credentials — and
 * reachable only on the unpublished :2020 listener, so it discloses nothing
 * that visiting the hostname would not.
 */
final class CaddyAskController extends Controller
{
    public function __construct(private readonly AuthorizeTlsHost $authorizeTlsHost) {}

    public function __invoke(Request $request): Response
    {
        $domain = $request->query('domain');

        // Not a cast: `?domain[]=a` yields an array, and casting it to string
        // raises an error that would surface as a 500.
        abort_unless(is_string($domain) && $this->authorizeTlsHost->handle($domain), 404);

        // Caddy itself accepts any 2xx (modules/caddytls/ondemand.go rejects
        // only status < 200 or > 299); the explicit 200 here is to satisfy
        // this endpoint's own tests, which assert exactly 200, not a protocol
        // requirement — noContent()'s default of 204 would work fine with Caddy.
        return response()->noContent(200);
    }
}

<?php

declare(strict_types=1);

use Laravel\Reverb\Application;
use Laravel\Reverb\Contracts\Connection;
use Laravel\Reverb\Contracts\WebSocketConnection;
use Laravel\Reverb\Protocols\Pusher\Contracts\ChannelManager;
use Laravel\Reverb\Protocols\Pusher\EventHandler;
use Laravel\Reverb\Protocols\Pusher\Exceptions\InvalidOrigin;
use Laravel\Reverb\Protocols\Pusher\Server;

// The socket server takes connections only from pages on the base domain and
// the workspaces under it, not from any website: REVERB_ALLOWED_ORIGINS, or
// APP_BASE_DOMAIN and *.APP_BASE_DOMAIN when that is unset.

/** config/reverb.php's allowed_origins, loaded afresh under $env. */
function reverbOriginsConfigured(array $env): array
{
    $saved = [];
    foreach ($env as $key => $value) {
        $saved[$key] = array_key_exists($key, $_SERVER) ? [$_SERVER[$key]] : [];
        $_SERVER[$key] = $value;
    }

    try {
        return (require config_path('reverb.php'))['apps']['apps'][0]['allowed_origins'];
    } finally {
        foreach ($saved as $key => $was) {
            if ($was === []) {
                unset($_SERVER[$key]);
            } else {
                $_SERVER[$key] = $was[0];
            }
        }
    }
}

/** Whether Reverb's own origin check lets a page at $origin connect. */
function reverbOriginsAccepts(array $allowedOrigins, string $origin): bool
{
    $app = new Application('prizy', 'key', 'secret', 60, 30, $allowedOrigins, 10_000);
    $connection = new class(Mockery::mock(WebSocketConnection::class), $app, $origin) extends Connection {
        public function identifier(): string
        {
            return '1';
        }

        public function id(): string
        {
            return '1.1';
        }

        public function send(string $message): void {}

        public function control(string $type = 'ping'): void {}

        public function terminate(): void {}
    };
    $server = new Server(Mockery::mock(ChannelManager::class), Mockery::mock(EventHandler::class));

    try {
        (new ReflectionMethod(Server::class, 'verifyOrigin'))->invoke($server, $connection);

        return true;
    } catch (InvalidOrigin) {
        return false;
    }
}

/** KEY=value pairs of an env example file, commented-out keys left out. */
function reverbOriginsEnvFile(string $file): array
{
    $values = [];
    foreach (file(base_path($file), FILE_IGNORE_NEW_LINES) as $line) {
        if (preg_match('/^([A-Z0-9_]+)=(.*)$/', $line, $m) === 1) {
            $values[$m[1]] = $m[2];
        }
    }

    return $values;
}

it('accepts the base domain and its workspaces when no list is set', function (string $list): void {
    expect(reverbOriginsConfigured(['APP_BASE_DOMAIN' => 'prizy.test', 'REVERB_ALLOWED_ORIGINS' => $list]))
        ->toBe(['prizy.test', '*.prizy.test']);
})->with([
    'empty' => '',
    'blank' => '  ',
]);

it('uses the list given, trimmed and lower-cased', function (): void {
    expect(reverbOriginsConfigured(['APP_BASE_DOMAIN' => 'prizy.test', 'REVERB_ALLOWED_ORIGINS' => ' prizy.test, *.Prizy.test ,support.acme.co,']))
        ->toBe(['prizy.test', '*.prizy.test', 'support.acme.co']);
});

it('accepts no site at all with neither a list nor a base domain', function (): void {
    expect(reverbOriginsConfigured(['APP_BASE_DOMAIN' => '', 'REVERB_ALLOWED_ORIGINS' => '']))->toBe([]);
});

it('ships env examples that keep other websites out', function (string $file, array $expected): void {
    $env = reverbOriginsEnvFile($file);

    expect(reverbOriginsConfigured([
        'APP_BASE_DOMAIN'        => $env['APP_BASE_DOMAIN'] ?? '',
        'REVERB_ALLOWED_ORIGINS' => $env['REVERB_ALLOWED_ORIGINS'] ?? '',
    ]))->toBe($expected);
})->with([
    'development' => ['.env.example', ['localhost', '*.localhost']],
    'production'  => ['.env.production.example', ['example.com', '*.example.com']],
]);

it('lets pages on a workspace, the sign-up host or the base domain connect', function (string $origin): void {
    $allowed = reverbOriginsConfigured(['APP_BASE_DOMAIN' => 'prizy.test', 'REVERB_ALLOWED_ORIGINS' => '']);

    expect(reverbOriginsAccepts($allowed, $origin))->toBeTrue();
})->with([
    'a workspace'            => 'https://acme.prizy.test',
    'the sign-up host'       => 'https://signup.prizy.test',
    'the base domain'        => 'https://prizy.test',
    'a dev server with port' => 'http://smoke.prizy.test:8001',
]);

it('refuses pages on any other website', function (string $origin): void {
    $allowed = reverbOriginsConfigured(['APP_BASE_DOMAIN' => 'prizy.test', 'REVERB_ALLOWED_ORIGINS' => '']);

    expect(reverbOriginsAccepts($allowed, $origin))->toBeFalse();
})->with([
    'an unrelated site'                  => 'https://evil.test',
    'a host containing the base domain'  => 'https://prizy.test.evil.test',
    'a host ending in the base name'     => 'https://evilprizy.test',
]);

it('lets any website connect when the list is *', function (): void {
    $allowed = reverbOriginsConfigured(['APP_BASE_DOMAIN' => 'prizy.test', 'REVERB_ALLOWED_ORIGINS' => '*']);

    expect(reverbOriginsAccepts($allowed, 'https://evil.test'))->toBeTrue();
});

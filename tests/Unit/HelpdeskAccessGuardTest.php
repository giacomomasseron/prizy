<?php

declare(strict_types=1);

/**
 * Support access is two conditions — the is_agent capability AND the workspace
 * module switch — and User::canWorkHelpdesk() is where both live. Code that
 * decides access by reading the capability itself honours one and ignores the
 * other, which is how TicketPolicy came to gate a switched-off module open.
 *
 * So: no layer that makes decisions may read `->is_agent` at all. Reading it as
 * DATA (serialising a member row, copying an invitation's flags) is legitimate
 * and is listed below — an allowlist that a future author has to edit, and
 * therefore justify, rather than a pattern they can accidentally slip past.
 */
it('routes every capability decision through canWorkHelpdesk', function (): void {
    $root = realpath(__DIR__.'/../../app');

    $deciders = ['UseCases', 'Policies', 'Http/Controllers', 'Http/Middleware', 'Services', 'Repositories', 'Console'];

    // Reads that are data, not decisions.
    $allowed = [
        'UseCases/Members/AcceptInvite.php',        // copies the invitation's flags onto the new user
        'Http/Controllers/Api/V1/MemberController.php', // serialises the flag into the member list
        'Services/WorkspaceExportBuilder.php',      // serialises the flag into the owner's export
    ];

    $offenders = [];
    foreach ($deciders as $dir) {
        $path = $root.'/'.$dir;
        if (! is_dir($path)) {
            continue;
        }
        foreach (new RecursiveIteratorIterator(new RecursiveDirectoryIterator($path)) as $file) {
            if ($file->getExtension() !== 'php') {
                continue;
            }
            $relative = str_replace($root.'/', '', $file->getPathname());
            if (in_array($relative, $allowed, true)) {
                continue;
            }
            // Any receiver, including the null-safe operator: `$actor->is_agent`,
            // `$u?->is_agent`, `$request->user()->is_agent`.
            if (preg_match('/\??->\s*is_agent\b/', (string) file_get_contents($file->getPathname())) === 1) {
                $offenders[] = $relative;
            }
        }
    }

    expect($offenders)->toBe([]);
});

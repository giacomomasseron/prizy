<?php

declare(strict_types=1);

/**
 * The support module is gated on two conditions (is_agent AND the workspace
 * switch), and HelpdeskAccess is the only place that knows that. Code that
 * decides access by reading the actor's capability itself would honour the
 * capability and silently ignore the switch.
 *
 * The rule is about access DECISIONS, so it covers the layers that make them
 * — use cases, policies, controllers — and the two variable names that carry
 * the acting user by convention there: `$actor` and `$user`. Serialising
 * somebody's capability (a Resource rendering is_agent, or AcceptInvite
 * copying an invitation's flags) is data, not a decision, and stays legal.
 */
it('routes every actor capability decision through HelpdeskAccess', function (): void {
    $root = realpath(__DIR__.'/../../app');
    $deciders = ['UseCases', 'Policies', 'Http/Controllers'];
    $offenders = [];

    foreach ($deciders as $dir) {
        $files = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($root.'/'.$dir));

        foreach ($files as $file) {
            if ($file->getExtension() !== 'php') {
                continue;
            }
            $source = file_get_contents($file->getPathname());
            if (preg_match('/\$(actor|user)->is_agent/', $source) === 1) {
                $offenders[] = str_replace($root.'/', '', $file->getPathname());
            }
        }
    }

    expect($offenders)->toBe([]);
});

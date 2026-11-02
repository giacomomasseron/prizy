<?php

declare(strict_types=1);

use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;

/**
 * php-clean-architecture's rule for a use case: the class extends BaseUseCase
 * and implements UseCaseInterface, written out in its own declaration.
 *
 * Dependencies come in through the constructor, built by Laravel's container,
 * and whoever runs a use case gets it injected and calls ->run(...) on it.
 * A static UseCase::run(...) on a use case with constructor dependencies
 * throws UseCaseNotStaticallyRunnableException at runtime, not here, unless
 * this guard catches it first.
 *
 * Loading every class also makes PHP check each handle() against the
 * interface's `handle(mixed ...$arguments): mixed`, which a typed handle()
 * fails with a fatal error.
 */

/** @return array<string, string> class name => path relative to app/ */
function useCaseShapeClassesIn(string $dir): array
{
    $root = (string) realpath(__DIR__.'/../../app');
    $classes = [];

    foreach (new RecursiveIteratorIterator(new RecursiveDirectoryIterator("{$root}/{$dir}")) as $file) {
        if ($file->getExtension() !== 'php') {
            continue;
        }
        $relative = str_replace($root.'/', '', $file->getPathname());
        $classes['App\\'.str_replace(['/', '.php'], ['\\', ''], $relative)] = $relative;
    }
    ksort($classes);

    return $classes;
}

function useCaseShapeSource(string $path): string
{
    return (string) file_get_contents((string) realpath(__DIR__.'/../../app').'/'.$path);
}

it('declares every use case as extending BaseUseCase and implementing UseCaseInterface', function (): void {
    $offenders = [];

    foreach (useCaseShapeClassesIn('UseCases') as $class => $path) {
        if (trait_exists($class)) {
            continue;
        }
        $declared = preg_match(
            '/^(?:final\s+|readonly\s+)*class\s+\w+\s+extends\s+BaseUseCase\s+implements\s+[^{]*\bUseCaseInterface\b/m',
            useCaseShapeSource($path),
        ) === 1;
        $reflection = new ReflectionClass($class);

        if (! $declared
            || $reflection->getParentClass() === false
            || $reflection->getParentClass()->getName() !== BaseUseCase::class
            || ! $reflection->implementsInterface(UseCaseInterface::class)) {
            $offenders[] = $path;
        }
    }

    expect($offenders)->toBe([]);
});

it('never lets a use case fetch a dependency from the container', function (): void {
    $offenders = [];

    foreach (useCaseShapeClassesIn('UseCases') as $path) {
        $found = preg_match_all(
            '/(?<![\w$>:])(?:app|resolve)\s*\(|\bApp::make(?:With)?\s*\(|\bContainer::getInstance\s*\(/',
            useCaseShapeSource($path),
        );

        if ($found > 0) {
            $offenders[] = "{$path} ({$found})";
        }
    }

    expect($offenders)->toBe([]);
});

it('never lets a use case keep state between runs', function (): void {
    // An injected use case is one instance for every run() on it (a controller
    // holds it for the whole request), so a property written while running
    // would still be there for the next run.
    $offenders = [];

    foreach (useCaseShapeClassesIn('UseCases') as $path) {
        $found = preg_match_all(
            '/\$this->\w+(?:\[[^\]]*\])*\s*(?:\.|\+|-|\*|\/|\?\?)?=(?![=>])/',
            useCaseShapeSource($path),
        );

        if ($found > 0) {
            $offenders[] = "{$path} ({$found})";
        }
    }

    expect($offenders)->toBe([]);
});

it('runs every use case through an injected instance, never statically', function (): void {
    $names = array_map(
        fn (string $class): string => substr($class, (int) strrpos($class, '\\') + 1),
        array_keys(useCaseShapeClassesIn('UseCases')),
    );
    $pattern = '/\b(?:'.implode('|', $names).'|self|static)::(?:run|actingAs)\s*\(/';
    $offenders = [];

    foreach (useCaseShapeClassesIn('') as $path) {
        $found = preg_match_all($pattern, useCaseShapeSource($path));

        if ($found > 0) {
            $offenders[] = "{$path} ({$found})";
        }
    }

    expect($offenders)->toBe([]);
});

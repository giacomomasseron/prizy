<?php

declare(strict_types=1);

use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;

/**
 * php-clean-architecture's rule for a use case: the class extends BaseUseCase
 * and implements UseCaseInterface, written out in its own declaration, and is
 * run with UseCase::run(...). BaseUseCase's constructor is final and private,
 * so Laravel cannot build a use case either: anything that still asks for one
 * as a constructor or action parameter breaks at runtime, not here, unless
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

it('declares every use case as extending BaseUseCase and implementing UseCaseInterface', function (): void {
    $root = (string) realpath(__DIR__.'/../../app');
    $offenders = [];

    foreach (useCaseShapeClassesIn('UseCases') as $class => $path) {
        if (trait_exists($class)) {
            continue;
        }
        $source = (string) file_get_contents("{$root}/{$path}");
        $declared = preg_match(
            '/^(?:final\s+|readonly\s+)*class\s+\w+\s+extends\s+BaseUseCase\s+implements\s+[^{]*\bUseCaseInterface\b/m',
            $source,
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

it('never asks Laravel to build a use case', function (): void {
    $offenders = [];

    foreach (useCaseShapeClassesIn('') as $class => $path) {
        if (! class_exists($class)) {
            continue;
        }
        foreach ((new ReflectionClass($class))->getMethods(ReflectionMethod::IS_PUBLIC) as $method) {
            if ($method->getDeclaringClass()->getName() !== $class) {
                continue;
            }
            foreach ($method->getParameters() as $parameter) {
                $type = $parameter->getType();
                $names = $type instanceof ReflectionUnionType || $type instanceof ReflectionIntersectionType
                    ? array_map(fn (ReflectionNamedType $t): string => $t->getName(), $type->getTypes())
                    : ($type instanceof ReflectionNamedType ? [$type->getName()] : []);

                foreach ($names as $name) {
                    if (is_subclass_of($name, BaseUseCase::class) || in_array($name, useCaseShapeLegacyUseCases(), true)) {
                        $offenders[] = "{$path}: {$method->getName()}(\${$parameter->getName()})";
                    }
                }
            }
        }
    }

    expect($offenders)->toBe([]);
});

/**
 * Every class in app/UseCases, whatever it extends: before the conversion a
 * use case extends nothing, so is_subclass_of alone would find no offenders.
 *
 * @return list<string>
 */
function useCaseShapeLegacyUseCases(): array
{
    static $classes = null;

    return $classes ??= array_values(array_filter(
        array_keys(useCaseShapeClassesIn('UseCases')),
        fn (string $class): bool => class_exists($class),
    ));
}

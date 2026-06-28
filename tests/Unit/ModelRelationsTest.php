<?php

declare(strict_types=1);

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\Relation;

uses(Tests\TestCase::class);

/**
 * Discover all concrete Eloquent Model subclasses in app/Models/.
 *
 * @return list<class-string<Model>>
 */
function discoverModelClasses(): array
{
    // Use __DIR__ so this runs before the Laravel app container is available.
    $modelsDir = dirname(__DIR__, 2) . '/app/Models';
    $classes   = [];

    foreach (new DirectoryIterator($modelsDir) as $file) {
        if ($file->isDot() || $file->isDir() || $file->getExtension() !== 'php') {
            continue;
        }

        $class = 'App\\Models\\' . $file->getBasename('.php');

        if (! class_exists($class)) {
            continue;
        }

        $ref = new ReflectionClass($class);

        // Skip abstract classes (TenantAwareEntity) and non-Model classes
        if ($ref->isAbstract() || ! $ref->isSubclassOf(Model::class)) {
            continue;
        }

        $classes[] = $class;
    }

    sort($classes);

    return $classes;
}

/**
 * Return all public, zero-required-parameter methods DECLARED directly on
 * the given class (not inherited from parents, but including trait methods
 * compiled directly into the class) whose return type is an Eloquent Relation
 * subclass.
 *
 * @param  class-string<Model>  $class
 * @return list<ReflectionMethod>
 */
function relationMethodsOf(string $class): array
{
    $ref     = new ReflectionClass($class);
    $methods = [];

    foreach ($ref->getMethods(ReflectionMethod::IS_PUBLIC) as $method) {
        // Only methods introduced by THIS class or its traits (not parent classes).
        $declaringClass = $method->getDeclaringClass()->getName();
        if (
            $declaringClass !== $class
            && ! in_array($declaringClass, array_keys($ref->getTraits()), true)
            && ! in_array($declaringClass, traitNamesRecursive($ref), true)
        ) {
            continue;
        }

        // Must accept zero required parameters.
        if ($method->getNumberOfRequiredParameters() > 0) {
            continue;
        }

        // Return type must be a named Eloquent Relation subtype.
        $returnType = $method->getReturnType();
        if (! $returnType instanceof ReflectionNamedType) {
            continue;
        }

        $typeName = $returnType->getName();
        if (! class_exists($typeName) && ! interface_exists($typeName)) {
            continue;
        }

        if (
            $typeName !== Relation::class
            && ! (new ReflectionClass($typeName))->isSubclassOf(Relation::class)
        ) {
            continue;
        }

        $methods[] = $method;
    }

    return $methods;
}

/**
 * Recursively collect trait names used by the class and its traits.
 *
 * @return list<string>
 */
function traitNamesRecursive(ReflectionClass $ref): array
{
    $names = array_keys($ref->getTraits());

    foreach ($ref->getTraits() as $trait) {
        $names = array_merge($names, traitNamesRecursive($trait));
    }

    return array_unique($names);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

$modelClasses = discoverModelClasses();

it('discovers at least 10 concrete model classes', function () use ($modelClasses): void {
    expect(count($modelClasses))->toBeGreaterThan(10);
});

foreach ($modelClasses as $modelClass) {
    $shortName = class_basename($modelClass);

    // -----------------------------------------------------------------------
    // getCasts() exercises the model's casts() method
    // -----------------------------------------------------------------------
    it("$shortName::getCasts() returns a non-empty array of cast definitions", function () use ($modelClass): void {
        $model = new $modelClass();
        $casts = $model->getCasts();

        expect($casts)->toBeArray();
        // Every Model always has at least the primary-key cast
        expect($casts)->not->toBeEmpty();
    });

    // -----------------------------------------------------------------------
    // Each relation method builds the correct Relation object without DB hit
    // -----------------------------------------------------------------------
    $relationMethods = relationMethodsOf($modelClass);

    foreach ($relationMethods as $method) {
        $methodName = $method->getName();

        it("$shortName::$methodName() returns an Eloquent Relation pointing at a concrete Model", function () use ($modelClass, $methodName): void {
            $model    = new $modelClass();
            $relation = $model->$methodName();

            expect($relation)->toBeInstanceOf(Relation::class);

            $related = $relation->getRelated();
            expect($related)->toBeInstanceOf(Model::class);
        });
    }
}

<?php

declare(strict_types=1);

namespace App\Http\Resources\Concerns;

use Illuminate\Http\Request;

trait SparseFieldset
{
    /**
     * Limit $attributes to the comma-separated fields[$type] query param.
     * `id` is always retained. No param ⇒ return all attributes unchanged.
     *
     * @param  array<string, mixed>  $attributes
     * @return array<string, mixed>
     */
    protected function sparse(Request $request, string $type, array $attributes): array
    {
        $fields = $request->query('fields');

        if (! is_array($fields) || ! isset($fields[$type]) || ! is_string($fields[$type])) {
            return $attributes;
        }

        $allowed = array_filter(array_map('trim', explode(',', $fields[$type])));
        $allowed[] = 'id';

        return array_intersect_key($attributes, array_flip($allowed));
    }
}

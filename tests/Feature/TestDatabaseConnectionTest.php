<?php

declare(strict_types=1);

use Illuminate\Support\Facades\DB;

it('runs the test suite against the postgres prizy_test database', function (): void {
    expect(DB::connection()->getDriverName())->toBe('pgsql');
    expect(DB::connection()->getDatabaseName())->toBe('prizy_test');
});

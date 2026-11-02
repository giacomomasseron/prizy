<?php

declare(strict_types=1);

use App\Models\Issue;

it('is PRZ- and the first 6 characters of the id, in capitals (PRD §3.2.1)', function (): void {
    expect(Issue::referenceFor('3f9a1c2b-0d4e-4f00-8a00-000000000001'))->toBe('PRZ-3F9A1C');
    expect(Issue::referenceFor('00ab99ff-0000-4000-8000-000000000000'))->toBe('PRZ-00AB99');
});

<?php

declare(strict_types=1);

uses(Tests\TestCase::class)->in('Feature');

// filo threshold enforcement (active only under FILO_ENABLED=1, i.e. CI):
// any Feature test slower than phpunit.xml's threshold fails, naming the
// slowest function. Unit tests are excluded (pure, no app boot, sub-ms).
uses(Filo\Testing\EnforcesThreshold::class)->in('Feature');

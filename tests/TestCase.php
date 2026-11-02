<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    protected bool $dropTypes = true;

    protected bool $dropViews = true;

    /**
     * Reset tenant state after every test so a mid-test failure (which skips a
     * test's own forgetCurrent()) cannot leak the WorkspaceScope static / GUC
     * into the next test in the same process.
     */
    protected function tearDown(): void
    {
        if (\App\Models\Workspace::checkCurrent()) {
            \App\Models\Workspace::forgetCurrent();
        }

        parent::tearDown();
    }
}

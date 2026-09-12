<?php

declare(strict_types=1);

namespace App\Services;

/**
 * Allowlists for agent-authored category presentation. `color` is echoed
 * into a style attribute on the public help center, so it is never free
 * input — only these 8 swatches (the design system palette) are accepted.
 */
final class KbPalette
{
    /** @var list<string> */
    public const COLORS = ['#3aa76d', '#6d69f2', '#5b8def', '#b06ae0', '#e0a13a', '#eb5757', '#4bab66', '#8b8b95'];

    /** @var list<string> */
    public const ICONS = ['◇', '◷', '◫', '⚿', '⌗', '{ }', '☺', '◔', '▤', '✦', '☂', '⎈'];
}

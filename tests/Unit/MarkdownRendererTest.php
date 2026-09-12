<?php

declare(strict_types=1);

use App\Services\MarkdownRenderer;

it('escapes raw html and neutralises unsafe links', function (): void {
    $html = (new MarkdownRenderer)->render("# Hi\n\n<script>alert(1)</script>\n\n<img src=x onerror=alert(1)>\n\n[x](javascript:alert(1))\n\n**bold** `code`");
    expect($html)->toContain('<h1>Hi</h1>')
        ->toContain('&lt;script&gt;')
        ->toContain('&lt;img src=x onerror=alert(1)&gt;')
        ->not->toContain('<script>')
        ->not->toContain('href="javascript:')
        ->toContain('<strong>bold</strong>')
        ->toContain('<code>code</code>');
});

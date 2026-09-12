<?php

declare(strict_types=1);

use App\Services\KbDiffer;

function kbDiffSigns(array $diff): string
{
    return implode('', array_map(fn (array $l): string => $l['sign'], $diff['lines']));
}

it('reports no changes for identical input', function (): void {
    $d = (new KbDiffer)->diff('T', "a\nb", 'T', "a\nb");
    expect($d['title'])->toBeNull();
    expect($d['added'])->toBe(0);
    expect($d['removed'])->toBe(0);
    expect(kbDiffSigns($d))->toBe('  ');
});

it('marks a pure addition', function (): void {
    $d = (new KbDiffer)->diff('T', "a\nb", 'T', "a\nnew\nb");
    expect($d['added'])->toBe(1);
    expect($d['removed'])->toBe(0);
    expect(kbDiffSigns($d))->toBe(' + ');
    expect($d['lines'][1])->toBe(['sign' => '+', 'text' => 'new']);
});

it('marks a pure deletion', function (): void {
    $d = (new KbDiffer)->diff('T', "a\ngone\nb", 'T', "a\nb");
    expect($d['added'])->toBe(0);
    expect($d['removed'])->toBe(1);
    expect(kbDiffSigns($d))->toBe(' - ');
    expect($d['lines'][1])->toBe(['sign' => '-', 'text' => 'gone']);
});

it('reports a changed title separately from the body', function (): void {
    $d = (new KbDiffer)->diff('Old', 'same', 'New', 'same');
    expect($d['title'])->toBe(['from' => 'Old', 'to' => 'New']);
    expect($d['added'])->toBe(0);
    expect($d['removed'])->toBe(0);
});

it('handles empty bodies on either side and both', function (): void {
    $differ = new KbDiffer;
    expect($differ->diff('T', '', 'T', "a\nb")['added'])->toBe(2);
    expect($differ->diff('T', "a\nb", 'T', '')['removed'])->toBe(2);
    $both = $differ->diff('T', '', 'T', '');
    expect($both['added'])->toBe(0);
    expect($both['removed'])->toBe(0);
});

it('treats a replaced line as one removal plus one addition', function (): void {
    $d = (new KbDiffer)->diff('T', "a\nold\nc", 'T', "a\nnew\nc");
    expect($d['added'])->toBe(1);
    expect($d['removed'])->toBe(1);
    expect(count($d['lines']))->toBe(4);
});

it('handles a single very long line and a body with no trailing newline', function (): void {
    $long = str_repeat('x', 5000);
    $d = (new KbDiffer)->diff('T', $long, 'T', $long.'y');
    expect($d['added'])->toBe(1);
    expect($d['removed'])->toBe(1);
});

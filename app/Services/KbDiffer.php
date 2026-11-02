<?php

declare(strict_types=1);

namespace App\Services;

/**
 * Line-level diff between two KB article versions. Hand-rolled on purpose:
 * this project ships eight production dependencies, all framework or
 * infrastructure, and sebastian/diff is dev-only (transitive via PHPUnit), so
 * it is not available to application code.
 *
 * Direction is always PAST → PRESENT: '+' is a line that exists now but not in
 * the older version, '-' one that existed then and no longer does.
 */
final class KbDiffer
{
    /**
     * @return array{title: array{from: string, to: string}|null, lines: list<array{sign: string, text: string}>, added: int, removed: int}
     */
    public function diff(string $fromTitle, string $fromBody, string $toTitle, string $toBody): array
    {
        $lines = $this->diffLines(explode("\n", $fromBody), explode("\n", $toBody));

        return [
            'title' => $fromTitle === $toTitle ? null : ['from' => $fromTitle, 'to' => $toTitle],
            'lines' => $lines,
            'added' => count(array_filter($lines, fn (array $l): bool => $l['sign'] === '+')),
            'removed' => count(array_filter($lines, fn (array $l): bool => $l['sign'] === '-')),
        ];
    }

    /**
     * Classic longest-common-subsequence table walk. Article bodies run to
     * hundreds of lines at most, so the O(n·m) table is cheap and keeps the
     * implementation obvious enough to audit.
     *
     * @param  list<string>  $from
     * @param  list<string>  $to
     * @return list<array{sign: string, text: string}>
     */
    private function diffLines(array $from, array $to): array
    {
        $n = count($from);
        $m = count($to);
        $lcs = array_fill(0, $n + 1, array_fill(0, $m + 1, 0));
        for ($i = $n - 1; $i >= 0; $i--) {
            for ($j = $m - 1; $j >= 0; $j--) {
                $lcs[$i][$j] = $from[$i] === $to[$j]
                    ? $lcs[$i + 1][$j + 1] + 1
                    : max($lcs[$i + 1][$j], $lcs[$i][$j + 1]);
            }
        }

        $out = [];
        $i = $j = 0;
        while ($i < $n && $j < $m) {
            if ($from[$i] === $to[$j]) {
                $out[] = ['sign' => ' ', 'text' => $from[$i]];
                $i++;
                $j++;
            } elseif ($lcs[$i + 1][$j] >= $lcs[$i][$j + 1]) {
                $out[] = ['sign' => '-', 'text' => $from[$i]];
                $i++;
            } else {
                $out[] = ['sign' => '+', 'text' => $to[$j]];
                $j++;
            }
        }
        while ($i < $n) {
            $out[] = ['sign' => '-', 'text' => $from[$i++]];
        }
        while ($j < $m) {
            $out[] = ['sign' => '+', 'text' => $to[$j++]];
        }

        return $out;
    }
}

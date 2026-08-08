<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Issue;
use App\Models\IssueComment;
use App\Models\User;
use Illuminate\Support\Collection;

/**
 * Resolves WHO should be notified about issue activity: the issue's stakeholders
 * (assignee + prior commenters) and anyone `@`-mentioned in a comment body.
 *
 * Pure: performs read-only queries only, never writes. Callers are responsible
 * for persisting the resulting notifications (see NotificationRepository).
 */
final class NotificationRecipients
{
    /**
     * Distinct user-ids with a stake in $issue: its assignee (if set) plus
     * everyone who has previously commented on it, minus $excludeUserId.
     *
     * @return list<string>
     */
    public function participants(Issue $issue, string $excludeUserId): array
    {
        $ids = [];

        if ($issue->assignee_id !== null) {
            $ids[] = (string) $issue->assignee_id;
        }

        $commenterIds = IssueComment::query()
            ->where('issue_id', $issue->id)
            ->distinct()
            ->pluck('user_id')
            ->map(static fn (mixed $id): string => (string) $id)
            ->all();

        $ids = array_unique(array_merge($ids, $commenterIds));

        return array_values(array_filter(
            $ids,
            static fn (string $id): bool => $id !== $excludeUserId,
        ));
    }

    /**
     * User-ids of $members `@`-mentioned in $body, minus $excludeUserId.
     *
     * Plain-text, case-insensitive matching: for each member we look for
     * "@First Last", else "@First", else "@email". Longer / more specific
     * patterns are matched first and "claim" their span of $body so a shorter
     * pattern belonging to a DIFFERENT member (e.g. a first name that is a
     * prefix of another member's full name) can't also spuriously match the
     * same mention text. Matches are deduped per member.
     *
     * @param  Collection<int, User>  $members
     * @return list<string>
     */
    public function mentioned(string $body, Collection $members, string $excludeUserId): array
    {
        /** @var list<array{id: string, pattern: string}> $candidates */
        $candidates = [];

        foreach ($members as $member) {
            $id = (string) $member->id;

            if ($id === $excludeUserId) {
                continue;
            }

            $name = trim((string) $member->name);
            $first = trim(explode(' ', $name)[0] ?? '');
            $email = trim((string) $member->email);

            foreach (array_unique(array_filter([$name, $first, $email], static fn (string $p): bool => $p !== '')) as $pattern) {
                $candidates[] = ['id' => $id, 'pattern' => $pattern];
            }
        }

        usort($candidates, static fn (array $a, array $b): int => strlen($b['pattern']) <=> strlen($a['pattern']));

        $matched = [];
        $remaining = $body;

        foreach ($candidates as $candidate) {
            if (in_array($candidate['id'], $matched, true)) {
                continue;
            }

            $needle = '@'.$candidate['pattern'];
            $pos = stripos($remaining, $needle);

            if ($pos === false) {
                continue;
            }

            $matched[] = $candidate['id'];

            // Mask the matched span so a shorter, overlapping pattern belonging
            // to a different member can't also fire against the same text.
            $remaining = substr_replace($remaining, str_repeat("\0", strlen($needle)), $pos, strlen($needle));
        }

        return array_values($matched);
    }
}

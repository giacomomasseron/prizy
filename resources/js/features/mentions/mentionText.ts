import { avatarFor } from '../../lib/avatarFor';

/** An open mention (P7-B, the Project v2 design): the `@` sits at `start`, and the query runs from it to the caret at `end`. */
export interface MentionQuery {
    start: number;
    end: number;
    q: string;
}

/** A workspace member the picker can offer. */
export interface MentionMember {
    id: string;
    name: string;
}

/**
 * The mention the caret is in, if any: an `@` at the start of the text or after whitespace, then no space and no
 * other `@` up to the caret. `a@b` (an e-mail address, a word) never opens the picker.
 */
export function detectMention(text: string, caret: number): MentionQuery | null {
    const m = text.slice(0, caret).match(/(^|\s)@([^\s@]*)$/);
    if (!m) return null;
    return { start: caret - m[2].length - 1, end: caret, q: m[2] };
}

/**
 * Replace the mention with `insert` and one space, dropping one space that already followed it; the caret goes
 * after the inserted space.
 */
export function applyPick(text: string, mention: MentionQuery, insert: string): { text: string; caret: number } {
    const after = text.slice(mention.end).replace(/^\s/, '');
    return { text: text.slice(0, mention.start) + insert + ' ' + after, caret: mention.start + insert.length + 1 };
}

/** The members a query offers: not yourself, alphabetical, matched by a name that contains it or initials that start with it. */
export function matchMembers(members: MentionMember[], q: string, selfId: string | undefined, limit = 5): MentionMember[] {
    const needle = q.toLowerCase();
    return members
        .filter((m) => m.id !== selfId)
        .filter((m) => needle === '' || m.name.toLowerCase().includes(needle) || avatarFor(m).initials.toLowerCase().startsWith(needle))
        .sort((a, b) => a.name.localeCompare(b.name))
        .slice(0, limit);
}

/** The short handle a person row shows: `@` and the lower-case first name. */
export function mentionHandle(name: string): string {
    return '@' + (name.trim().split(/\s+/)[0] ?? '').toLowerCase();
}

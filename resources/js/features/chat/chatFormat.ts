import type { IssueLookupItem, ProjectMessage } from '../../lib/types';

const DAY_MS = 86_400_000;

function startOfDay(d: Date): number {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/**
 * A day separator's label (the Project v2 design): Today, Yesterday, the weekday within the last 7 days, then the
 * date — with the year when it isn't this year.
 */
export function dayLabel(iso: string, now: Date = new Date()): string {
    const d = new Date(iso);
    // Rounded: a day across a daylight-saving change is 23 or 25 hours.
    const days = Math.round((startOfDay(now) - startOfDay(d)) / DAY_MS);
    if (days <= 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return d.toLocaleDateString('en-US', { weekday: 'long' });
    return d.toLocaleDateString('en-US', d.getFullYear() === now.getFullYear()
        ? { month: 'short', day: 'numeric' }
        : { month: 'short', day: 'numeric', year: 'numeric' });
}

/** A message's time, as in the design: 3:40 PM. */
export function timeLabel(iso: string): string {
    return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export interface ChatRow {
    message: ProjectMessage;
    /** The day separator's label when the message starts a day, else null. */
    day: string | null;
    /** The message starts an author run: its avatar, name and time show. */
    head: boolean;
}

/** Messages (oldest first) as the chat lays them out: a separator per day, and author runs within a day. */
export function chatRows(messages: ProjectMessage[], now: Date = new Date()): ChatRow[] {
    return messages.map((message, i) => {
        const prev = messages[i - 1];
        const newDay = !prev || startOfDay(new Date(prev.created_at)) !== startOfDay(new Date(message.created_at));
        return { message, day: newDay ? dayLabel(message.created_at, now) : null, head: newDay || prev.user_id !== message.user_id };
    });
}

/** The picked issues whose reference is still in the text, each once: the ones a message links. */
export function linkedIssues(text: string, picked: IssueLookupItem[]): IssueLookupItem[] {
    const linked: IssueLookupItem[] = [];
    for (const issue of picked) {
        if (text.includes(issue.identifier) && !linked.some((i) => i.id === issue.id)) linked.push(issue);
    }
    return linked;
}

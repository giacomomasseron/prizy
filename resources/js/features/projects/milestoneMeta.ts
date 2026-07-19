export const MS_TAG: Record<'done' | 'active' | 'upcoming', { label: string; color: string; bg: string }> = {
    done:     { label: 'Done',        color: 'var(--accent)', bg: 'var(--accent2)' },
    active:   { label: 'In progress', color: 'var(--amber)',  bg: 'rgba(224,161,58,.14)' },
    upcoming: { label: 'Upcoming',    color: 'var(--fg3)',    bg: 'var(--bg2)' },
};
export const MS_ICON: Record<'done' | 'active' | 'upcoming', 'done' | 'in_progress' | 'todo'> = { done: 'done', active: 'in_progress', upcoming: 'todo' };

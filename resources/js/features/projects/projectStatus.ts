import type { ProjectStatus } from '../../lib/types';

export const PROJECT_STATUS: Record<ProjectStatus, { label: string; color: string }> = {
    planning:    { label: 'Planning',    color: 'var(--fg3)' },
    in_progress: { label: 'In Progress', color: 'var(--blue)' },
    paused:      { label: 'Paused',      color: 'var(--amber)' },
    completed:   { label: 'Completed',   color: 'var(--green)' },
    cancelled:   { label: 'Cancelled',   color: 'var(--red)' },
};

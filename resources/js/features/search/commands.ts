export interface Command {
    id: string;
    label: string;
    keywords: string;
    run: (nav: (to: string) => void) => void;
    /** Leads into the tracker: not offered in a workspace that has switched it off. */
    tracker?: boolean;
}

export const COMMANDS: Command[] = [
    { id: 'create-issue', label: 'Create issue', keywords: 'new add issue', run: (nav) => nav('/issues'), tracker: true },
    { id: 'goto-board', label: 'Go to Board', keywords: 'board kanban', run: (nav) => nav('/board'), tracker: true },
    { id: 'goto-roadmap', label: 'Go to Roadmap', keywords: 'roadmap timeline', run: (nav) => nav('/roadmap'), tracker: true },
    { id: 'goto-notifications', label: 'Go to Notifications', keywords: 'notifications inbox', run: (nav) => nav('/notifications'), tracker: true },
    { id: 'goto-settings', label: 'Go to Settings', keywords: 'settings preferences', run: (nav) => nav('/settings') },
    { id: 'goto-teams', label: 'Go to Teams', keywords: 'teams', run: (nav) => nav('/teams'), tracker: true },
    { id: 'goto-projects', label: 'Go to Projects', keywords: 'projects', run: (nav) => nav('/projects'), tracker: true },
    { id: 'goto-labels', label: 'Go to Labels', keywords: 'labels', run: (nav) => nav('/settings/labels'), tracker: true },
];

/** `tracker`: whether the workspace runs the tracker; without it only the commands that lead elsewhere are offered. */
export function filterCommands(q: string, tracker = true): Command[] {
    const term = q.trim().toLowerCase();
    const offered = tracker ? COMMANDS : COMMANDS.filter((c) => !c.tracker);
    if (term === '') return offered;
    return offered.filter((c) => (c.label + ' ' + c.keywords).toLowerCase().includes(term));
}

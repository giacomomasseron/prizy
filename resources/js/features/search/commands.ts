export interface Command {
    id: string;
    label: string;
    keywords: string;
    run: (nav: (to: string) => void) => void;
}

export const COMMANDS: Command[] = [
    { id: 'create-issue', label: 'Create issue', keywords: 'new add issue', run: (nav) => nav('/') },
    { id: 'goto-board', label: 'Go to Board', keywords: 'board kanban', run: (nav) => nav('/board') },
    { id: 'goto-roadmap', label: 'Go to Roadmap', keywords: 'roadmap timeline', run: (nav) => nav('/roadmap') },
    { id: 'goto-notifications', label: 'Go to Notifications', keywords: 'notifications inbox', run: (nav) => nav('/notifications') },
    { id: 'goto-settings', label: 'Go to Settings', keywords: 'settings preferences', run: (nav) => nav('/settings') },
    { id: 'goto-teams', label: 'Go to Teams', keywords: 'teams', run: (nav) => nav('/teams') },
    { id: 'goto-projects', label: 'Go to Projects', keywords: 'projects', run: (nav) => nav('/projects') },
    { id: 'goto-labels', label: 'Go to Labels', keywords: 'labels', run: (nav) => nav('/settings/labels') },
];

export function filterCommands(q: string): Command[] {
    const term = q.trim().toLowerCase();
    if (term === '') return COMMANDS;
    return COMMANDS.filter((c) => (c.label + ' ' + c.keywords).toLowerCase().includes(term));
}

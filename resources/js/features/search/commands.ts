/** What a command may do: go somewhere, open the new-issue composer, or flip the theme. */
export interface CommandContext {
    nav: (to: string) => void;
    createIssue: () => void;
    toggleTheme: () => void;
    /** Where the caller's cycles are: their first team's, or the team list when they are in none. */
    cyclesPath: string;
}

export interface Command {
    id: string;
    label: string;
    keywords: string;
    /** The glyph in the row's leading column. */
    icon: string;
    /** The key that does the same from anywhere, shown at the end of the row. */
    hint?: string;
    run: (ctx: CommandContext) => void;
    /** Leads into the tracker: not offered in a workspace that has switched it off. */
    tracker?: boolean;
    /** Needs the support desk: not offered in a workspace without one. */
    helpdesk?: boolean;
    /** Creates something: not offered to someone who can only read. */
    write?: boolean;
}

/** The Workspace mockup's actions, in its order; then the pages the app has beyond it. */
export const COMMANDS: Command[] = [
    { id: 'goto-issues', label: 'Go to Issues', keywords: 'issues list', icon: '□', run: (c) => c.nav('/issues'), tracker: true },
    { id: 'goto-cycles', label: 'Go to Cycles', keywords: 'cycles sprint', icon: '○', run: (c) => c.nav(c.cyclesPath), tracker: true },
    { id: 'goto-projects', label: 'Go to Projects', keywords: 'projects', icon: '■', run: (c) => c.nav('/projects'), tracker: true },
    { id: 'goto-roadmap', label: 'Go to Roadmap', keywords: 'roadmap timeline', icon: '≣', run: (c) => c.nav('/roadmap'), tracker: true },
    { id: 'view-escalations', label: 'View escalations from Support', keywords: 'escalated tickets support', icon: '↩', run: (c) => c.nav('/issues?escalated=true'), tracker: true, helpdesk: true },
    { id: 'advanced-search', label: 'Advanced search', keywords: 'find filters', icon: '⌕', run: (c) => c.nav('/search'), tracker: true },
    { id: 'new-project', label: 'New project', keywords: 'create add project', icon: '▦', run: (c) => c.nav('/create'), tracker: true, write: true },
    { id: 'new-cycle', label: 'New cycle', keywords: 'create add cycle sprint', icon: '○', run: (c) => c.nav('/create?tab=cycle'), tracker: true, write: true },
    { id: 'goto-settings', label: 'Open workspace settings', keywords: 'settings preferences', icon: '⚙', run: (c) => c.nav('/settings') },
    { id: 'create-issue', label: 'Create new issue', keywords: 'new add issue', icon: '+', hint: 'C', run: (c) => c.createIssue(), tracker: true, write: true },
    { id: 'toggle-theme', label: 'Toggle theme', keywords: 'dark light mode appearance', icon: '☾', run: (c) => c.toggleTheme() },
    { id: 'goto-board', label: 'Go to Board', keywords: 'board kanban', icon: '▥', run: (c) => c.nav('/board'), tracker: true },
    { id: 'goto-notifications', label: 'Go to Notifications', keywords: 'notifications inbox', icon: '◔', run: (c) => c.nav('/notifications'), tracker: true },
    { id: 'goto-teams', label: 'Go to Teams', keywords: 'teams', icon: '◉', run: (c) => c.nav('/teams'), tracker: true },
    { id: 'goto-labels', label: 'Go to Labels', keywords: 'labels tags', icon: '◈', run: (c) => c.nav('/settings/labels'), tracker: true },
];

/** What the caller's workspace and role allow: see the flags on Command. */
export interface CommandAccess {
    tracker: boolean;
    helpdesk: boolean;
    write: boolean;
}

export function filterCommands(q: string, access: CommandAccess): Command[] {
    const term = q.trim().toLowerCase();
    const offered = COMMANDS.filter((c) => (!c.tracker || access.tracker) && (!c.helpdesk || access.helpdesk) && (!c.write || access.write));
    if (term === '') return offered;
    return offered.filter((c) => (c.label + ' ' + c.keywords).toLowerCase().includes(term));
}

import { describe, expect, it, vi } from 'vitest';
import { COMMANDS, filterCommands, type CommandContext } from './commands';

function ctx(over: Partial<CommandContext> = {}): CommandContext {
    return { nav: vi.fn(), createIssue: vi.fn(), toggleTheme: vi.fn(), cyclesPath: '/teams/t1/cycles', ...over };
}
const run = (id: string, c: CommandContext) => COMMANDS.find((cmd) => cmd.id === id)!.run(c);
const everything = { tracker: true, helpdesk: true, write: true };

describe('COMMANDS', () => {
    it('lists the mockup\'s actions in its order, then the app\'s own', () => {
        expect(COMMANDS.map((c) => c.label)).toEqual([
            'Go to Issues', 'Go to Cycles', 'Go to Projects', 'Go to Roadmap', 'View escalations from Support', 'Advanced search',
            'New project', 'New cycle', 'Open workspace settings', 'Create new issue', 'Toggle theme',
            'Go to Board', 'Go to Notifications', 'Go to Teams', 'Go to Labels',
        ]);
    });

    it('gives every action an icon', () => {
        expect(COMMANDS.filter((c) => !c.icon).map((c) => c.id)).toEqual([]);
    });

    it('shows the C shortcut on Create new issue, and no hint on any other action', () => {
        expect(COMMANDS.filter((c) => c.hint).map((c) => [c.id, c.hint])).toEqual([['create-issue', 'C']]);
    });

    it.each([
        ['goto-issues', '/issues'],
        ['goto-projects', '/projects'],
        ['goto-roadmap', '/roadmap'],
        ['view-escalations', '/issues?escalated=true'],
        ['advanced-search', '/search'],
        ['new-project', '/create'],
        ['new-cycle', '/create?tab=cycle'],
        ['goto-settings', '/settings'],
        ['goto-board', '/board'],
        ['goto-notifications', '/notifications'],
        ['goto-teams', '/teams'],
        ['goto-labels', '/settings/labels'],
    ])('%s goes to %s', (id, path) => {
        const c = ctx();
        run(id, c);
        expect(c.nav).toHaveBeenCalledExactlyOnceWith(path);
    });

    it('Go to Cycles goes where the caller\'s cycles are', () => {
        const c = ctx({ cyclesPath: '/teams/t7/cycles' });
        run('goto-cycles', c);
        expect(c.nav).toHaveBeenCalledExactlyOnceWith('/teams/t7/cycles');
    });

    it('Create new issue opens the composer and goes nowhere', () => {
        const c = ctx();
        run('create-issue', c);
        expect(c.createIssue).toHaveBeenCalledTimes(1);
        expect(c.nav).not.toHaveBeenCalled();
    });

    it('Toggle theme toggles the theme and goes nowhere', () => {
        const c = ctx();
        run('toggle-theme', c);
        expect(c.toggleTheme).toHaveBeenCalledTimes(1);
        expect(c.nav).not.toHaveBeenCalled();
    });
});

describe('filterCommands', () => {
    it('offers everything to someone who can do everything', () => {
        expect(filterCommands('', everything)).toEqual(COMMANDS);
    });

    it('offers only what leads elsewhere than the tracker where the workspace has switched it off', () => {
        expect(filterCommands('', { ...everything, tracker: false }).map((c) => c.id)).toEqual(['goto-settings', 'toggle-theme']);
        expect(filterCommands('issue', { ...everything, tracker: false })).toEqual([]);
    });

    it('leaves out the escalations where the workspace has no support desk', () => {
        const ids = filterCommands('', { ...everything, helpdesk: false }).map((c) => c.id);
        expect(ids).not.toContain('view-escalations');
        expect(ids).toHaveLength(COMMANDS.length - 1);
    });

    it('leaves out what creates something for someone who can only read', () => {
        const ids = filterCommands('', { ...everything, write: false }).map((c) => c.id);
        expect(COMMANDS.map((c) => c.id).filter((id) => !ids.includes(id))).toEqual(['new-project', 'new-cycle', 'create-issue']);
    });

    it('matches the label and the keywords, in any case', () => {
        expect(filterCommands('ESCAL', everything).map((c) => c.id)).toEqual(['view-escalations']);
        expect(filterCommands('kanban', everything).map((c) => c.id)).toEqual(['goto-board']);
        expect(filterCommands('dark', everything).map((c) => c.id)).toEqual(['toggle-theme']);
        expect(filterCommands('zzz', everything)).toEqual([]);
    });
});

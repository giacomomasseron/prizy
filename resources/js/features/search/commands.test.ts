import { describe, expect, it, vi } from 'vitest';
import { COMMANDS, filterCommands } from './commands';

describe('COMMANDS', () => {
    it('Create issue opens the issue list, not the home page', () => {
        const nav = vi.fn();
        COMMANDS.find((c) => c.id === 'create-issue')!.run(nav);
        expect(nav).toHaveBeenCalledWith('/issues');
    });

    it('offers only what leads elsewhere than the tracker where the workspace has switched it off', () => {
        expect(filterCommands('', false).map((c) => c.id)).toEqual(['goto-settings']);
        expect(filterCommands('issue', false)).toEqual([]);
        expect(filterCommands('issue').map((c) => c.id)).toContain('create-issue');
    });
});

import { describe, expect, it, vi } from 'vitest';
import { COMMANDS } from './commands';

describe('COMMANDS', () => {
    it('Create issue opens the issue list, not the home page', () => {
        const nav = vi.fn();
        COMMANDS.find((c) => c.id === 'create-issue')!.run(nav);
        expect(nav).toHaveBeenCalledWith('/issues');
    });
});

import { describe, expect, it } from 'vitest';
import { buildChangelog } from './changelog';

describe('buildChangelog', () => {
    it('includes only done issues, formatted as "- title (#REF)"', () => {
        const md = buildChangelog('v1.0', [
            { ref: 'ABC123', title: 'Fix login bug', status: 'done' },
            { ref: 'DEF456', title: 'Add dark mode', status: 'in_progress' },
            { ref: 'GHI789', title: 'Improve perf', status: 'done' },
        ]);
        expect(md).toBe('## v1.0\n- Fix login bug (#ABC123)\n- Improve perf (#GHI789)');
    });

    it('renders a heading-only changelog for an empty issue list', () => {
        expect(buildChangelog('Empty Release', [])).toBe('## Empty Release');
    });

    it('renders a heading-only changelog when no issues are done', () => {
        expect(buildChangelog('No done', [{ ref: 'A1', title: 'WIP', status: 'in_progress' }])).toBe('## No done');
    });

    it('preserves the ref exactly as given (no case transformation)', () => {
        expect(buildChangelog('v2', [{ ref: 'abc123', title: 'Case check', status: 'done' }])).toBe('## v2\n- Case check (#abc123)');
    });
});

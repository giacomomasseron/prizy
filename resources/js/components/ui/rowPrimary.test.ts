import { describe, expect, it } from 'vitest';
import { ROW_FOCUS_CLASSES, ROW_PRIMARY_CLASSES, rowPrimary } from './rowPrimary';

describe('rowPrimary (V2-G3b)', () => {
    it('the primary control looks like the text it replaces', () => {
        expect(rowPrimary).toMatchObject({ background: 'none', border: 'none', padding: 0, color: 'inherit', textAlign: 'left', cursor: 'inherit', fontFamily: 'inherit', fontSize: 'inherit' });
        expect(rowPrimary).not.toHaveProperty('font');
    });
    it('the row draws an inset ink ring while its primary control has keyboard focus; the control draws none', () => {
        expect(ROW_FOCUS_CLASSES).toBe('has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-fg has-[:focus-visible]:-outline-offset-2');
        expect(ROW_PRIMARY_CLASSES).toBe('focus-visible:outline-none');
    });
});

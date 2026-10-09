import { describe, expect, it, vi } from 'vitest';
import { ROW_FOCUS_CLASSES, ROW_PRIMARY_CLASSES, onRowLinkClick, rowPrimary } from './rowPrimary';

describe('rowPrimary (V2-G3b)', () => {
    it('the primary control looks like the text it replaces', () => {
        expect(rowPrimary).toMatchObject({ background: 'none', border: 'none', padding: 0, color: 'inherit', textAlign: 'left', cursor: 'inherit', fontFamily: 'inherit', fontSize: 'inherit' });
        expect(rowPrimary).not.toHaveProperty('font');
    });
    it('the row draws an inset ink ring while its primary control has keyboard focus; the control draws none', () => {
        expect(ROW_FOCUS_CLASSES).toBe('has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-fg has-[:focus-visible]:-outline-offset-2');
        expect(ROW_PRIMARY_CLASSES).toBe('focus-visible:outline-none');
    });

    it('G3b: a plain click on a row link is handed to the row; a modified click is kept from it', () => {
        const ev = (over: object) => ({ button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, preventDefault: vi.fn(), stopPropagation: vi.fn(), ...over }) as never;
        const plain = ev({});
        onRowLinkClick(plain);
        expect((plain as { preventDefault: () => void }).preventDefault).toHaveBeenCalled();
        expect((plain as { stopPropagation: () => void }).stopPropagation).not.toHaveBeenCalled();
        const newTab = ev({ metaKey: true });
        onRowLinkClick(newTab);
        expect((newTab as { preventDefault: () => void }).preventDefault).not.toHaveBeenCalled();
        expect((newTab as { stopPropagation: () => void }).stopPropagation).toHaveBeenCalled();
    });
});

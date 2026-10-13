import { describe, expect, it, vi } from 'vitest';
import { ROW_ACTIONS_CLASSES, ROW_FOCUS_CLASSES, ROW_PRIMARY_CLASSES, onRowLinkClick, rowPrimary } from './rowPrimary';

describe('rowPrimary (V2-G3b)', () => {
    it('the primary control looks like the text it replaces', () => {
        expect(rowPrimary).toMatchObject({ background: 'none', border: 'none', padding: 0, color: 'inherit', textAlign: 'left', cursor: 'inherit', fontFamily: 'inherit', fontSize: 'inherit' });
        expect(rowPrimary).not.toHaveProperty('font');
    });
    it('the row draws an inset ink ring while its primary control has keyboard focus; the control draws none', () => {
        expect(ROW_FOCUS_CLASSES).toBe('has-[.row-primary:focus-visible]:outline-2 has-[.row-primary:focus-visible]:outline-fg has-[.row-primary:focus-visible]:-outline-offset-2');
        expect(ROW_PRIMARY_CLASSES).toBe('row-primary focus-visible:outline-none');
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

    it('G3c: one ring per focused control — the row ring follows only the .row-primary control', () => {
        expect(ROW_PRIMARY_CLASSES.split(' ')).toContain('row-primary');
        expect(ROW_FOCUS_CLASSES.split(' ')).toEqual(['has-[.row-primary:focus-visible]:outline-2', 'has-[.row-primary:focus-visible]:outline-fg', 'has-[.row-primary:focus-visible]:-outline-offset-2']);
        expect(ROW_FOCUS_CLASSES).not.toContain('has-[:focus-visible]');
    });

    it('row actions show on hover or focus, and always on a screen that cannot hover (touch)', () => {
        expect(ROW_ACTIONS_CLASSES).toBe('opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100');
    });
});

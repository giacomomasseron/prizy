import { describe, expect, it } from 'vitest';
import * as s from './kbStyles';

describe('kbStyles', () => {
    it('top bar, labels and page title follow the mockup', () => {
        expect(s.headerBar).toEqual({ minHeight: 64, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 14, padding: '8px 18px 8px 22px', borderBottom: '1px solid var(--border)', boxSizing: 'border-box' });
        expect(s.headerTitle).toMatchObject({ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, textOverflow: 'ellipsis', whiteSpace: 'nowrap' });
        expect(s.headerSub).toMatchObject({ fontSize: 11.5, color: 'var(--fg3)', textOverflow: 'ellipsis' });
        expect(s.kbLabel).toEqual({ fontSize: 12.5, fontWeight: 700, color: 'var(--fg3)' });
        expect(s.pageTitle).toEqual({ margin: '2px 0 0', fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 800, letterSpacing: '-.035em', lineHeight: 1.1, color: 'var(--fg)' });
        expect(s.crumbStyle).toEqual({ fontSize: 11.5, color: 'var(--fg3)' });
        expect(s.leadStyle).toEqual({ margin: '8px 0 0', fontSize: 14.5, lineHeight: 1.5, color: 'var(--fg2)' });
    });

    it('cards use the card radius, and the danger card tints with color-mix', () => {
        expect(s.kbCard).toEqual({ border: 'var(--line) solid var(--border)', borderRadius: 'var(--radius-card)', background: 'var(--panel)', padding: '16px 17px' });
        expect(s.dangerCard).toEqual({
            border: 'var(--line) solid color-mix(in srgb, var(--red) 35%, transparent)', borderRadius: 'var(--radius-card)',
            background: 'color-mix(in srgb, var(--red) 6%, var(--panel))', padding: '15px 17px',
        });
    });

    it('status pills merge the pill base with a token tone', () => {
        expect(s.statusPill('published')).toEqual({ ...s.pillBase, color: 'var(--sup)', background: 'var(--sup2)', borderColor: 'transparent' });
        expect(s.statusPill('draft')).toEqual({ ...s.pillBase, color: 'var(--fg2)', background: 'var(--hover)', borderColor: 'transparent' });
        expect(s.statusPill('archived')).toEqual({ ...s.pillBase, color: 'var(--fg3)', background: 'transparent', borderColor: 'var(--border2)' });
        expect(s.pillBase).toMatchObject({ borderRadius: 'var(--radius-pill)', borderWidth: 'var(--line)', borderStyle: 'solid', fontSize: 11.5, fontWeight: 700 });
        expect(s.notTranslatedPill).toMatchObject({ borderStyle: 'dashed', borderColor: 'var(--border2)', color: 'var(--fg3)' });
        expect(s.sourceTag).toEqual({ fontSize: 12, fontWeight: 700, color: 'var(--fg3)', whiteSpace: 'nowrap' });
        expect(s.currentBadge).toMatchObject({ color: 'var(--sup)', background: 'var(--sup2)', borderRadius: 'var(--radius-pill)' });
        expect(s.staleDot).toEqual({ width: 7, height: 7, borderRadius: '50%', background: 'var(--amber)', flexShrink: 0 });
    });

    it('rows keep their resting background in classes so the hover can show', () => {
        expect(s.listRow).not.toHaveProperty('background');
        expect(s.pickRow).not.toHaveProperty('background');
        expect(s.listRow).toMatchObject({ borderRadius: 'var(--radius-row)', padding: '7px 8px' });
        expect(s.pickRow).toMatchObject({ display: 'block', borderRadius: 'var(--radius-row)', padding: '9px 10px' });
        expect(s.LIST_ROW_CLASSES).toBe('bg-transparent hover:bg-hover');
        expect(s.pickRowClasses(true)).toBe('bg-sup2');
        expect(s.pickRowClasses(false)).toBe('bg-transparent hover:bg-hover');
    });

    it('drawer chrome, diff tints and the slug field shell', () => {
        expect(s.drawerHeader).toMatchObject({ padding: '18px 22px 14px', borderBottom: '1px solid var(--border)' });
        expect(s.drawerSub).toMatchObject({ fontSize: 12.5, color: 'var(--fg3)', textOverflow: 'ellipsis' });
        expect(s.drawerList).toEqual({ width: 260, flexShrink: 0, borderRight: '1px solid var(--border)', background: 'var(--bg2)', overflowY: 'auto', padding: 8 });
        expect(s.drawerFooter).toEqual({ flexShrink: 0, borderTop: '1px solid var(--border)', background: 'var(--bg2)', padding: '12px 22px' });
        expect(s.footNote).toEqual({ fontSize: 11.5, color: 'var(--fg3)', lineHeight: 1.5 });
        expect(s.DIFF_TINT).toEqual({ add: 'color-mix(in srgb, var(--green) 12%, transparent)', del: 'color-mix(in srgb, var(--red) 10%, transparent)' });
        expect(s.diffBox).toEqual({ border: 'var(--line) solid var(--border)', borderRadius: 'var(--radius-row)', overflow: 'hidden', background: 'var(--panel)' });
        expect(s.fieldShell).toMatchObject({ height: 38, borderRadius: 'var(--radius-pill)', background: 'var(--panel)' });
        expect(s.FIELD_SHELL_CLASSES).toBe('border-[1.5px] border-solid border-border2 focus-within:border-fg');
    });
});

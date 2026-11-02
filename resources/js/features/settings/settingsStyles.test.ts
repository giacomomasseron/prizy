import { describe, expect, it } from 'vitest';
import * as s from './settingsStyles';

describe('settingsStyles', () => {
    it('page frame, title and lead follow the mockup', () => {
        expect(s.pageFrame).toEqual({ maxWidth: 1000, width: '100%', margin: '0 auto', padding: '28px 30px 80px', boxSizing: 'border-box' });
        expect(s.titleRow).toEqual({ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 6 });
        expect(s.pageTitle).toEqual({ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 36, letterSpacing: '-.035em', lineHeight: 1.05, color: 'var(--fg)' });
        expect(s.pageLead).toEqual({ margin: '10px 0 0', fontSize: 15, lineHeight: 1.55, color: 'var(--fg2)', maxWidth: 600 });
    });

    it('stat cards use the display numerals and truncate long values', () => {
        expect(s.statGrid).toEqual({ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, margin: '22px 0 20px' });
        expect(s.statCard).toEqual({ border: 'var(--line) solid var(--border)', borderRadius: 'var(--radius-card)', padding: '13px 15px', minWidth: 0 });
        expect(s.statLabel).toEqual({ fontSize: 12.5, fontWeight: 700, color: 'var(--fg3)' });
        expect(s.statValue).toEqual({
            fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 800, letterSpacing: '-.03em', lineHeight: 1.1,
            marginTop: 4, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        });
    });

    it('list cards scroll instead of clipping; row rules and hovers live in classes', () => {
        expect(s.cardFrame).toEqual({ border: 'var(--line) solid var(--border)', borderRadius: 'var(--radius-card)' });
        expect(s.listCard).toEqual({ border: 'var(--line) solid var(--border)', borderRadius: 'var(--radius-card)', overflowX: 'auto' });
        expect(s.tableHead).toEqual({ fontSize: 12.5, fontWeight: 700, color: 'var(--fg3)', padding: '11px 18px', borderBottom: '1px solid var(--border)' });
        expect(s.ROW_SEP_CLASSES).toBe('border-b border-border last:border-b-0');
        expect(s.ROW_CLASSES).toBe('border-b border-border last:border-b-0 hover:bg-hover');
        expect(s.groupLabel).toEqual({ fontSize: 12.5, fontWeight: 700, color: 'var(--fg3)' });
    });

    it('pill buttons carry no inline colour so their hovers work', () => {
        expect(s.pillBtn).toEqual({
            display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 13px', borderRadius: 'var(--radius-pill)',
            borderWidth: 'var(--line)', borderStyle: 'solid', fontSize: 13, fontWeight: 700, lineHeight: 1,
            fontFamily: 'inherit', cursor: 'pointer', whiteSpace: 'nowrap',
        });
        expect(s.PILL_CLASSES).toBe('border-border2 bg-transparent text-fg hover:border-fg');
        expect(s.DANGER_PILL_CLASSES).toBe('border-border2 bg-transparent text-fg2 enabled:hover:border-red enabled:hover:text-red-ink disabled:opacity-50');
    });

    it('form controls and dialog frame', () => {
        expect(s.fieldLabel).toEqual({ display: 'block', fontSize: 12.5, fontWeight: 700, color: 'var(--fg2)', marginBottom: 7 });
        expect(s.selectStyle).toEqual({ background: 'var(--panel)', borderRadius: 'var(--radius-pill)', color: 'var(--fg)', fontSize: 14, padding: '8px 14px', fontFamily: 'inherit', outline: 'none', cursor: 'pointer' });
        expect(s.timeInputStyle).toEqual({ background: 'var(--panel)', borderRadius: 'var(--radius-pill)', color: 'var(--fg)', fontSize: 13, padding: '5px 10px', fontFamily: 'var(--font-mono)', outline: 'none' });
        expect(s.checkboxStyle).toEqual({ accentColor: 'var(--fg)', width: 15, height: 15, cursor: 'pointer' });
        expect(s.modalHeader).toEqual({ padding: '18px 22px 14px', borderBottom: '1px solid var(--border)' });
        expect(s.modalTitle).toEqual({ margin: 0, fontFamily: 'var(--font-display)', fontSize: 21, fontWeight: 800, letterSpacing: '-.02em', color: 'var(--fg)' });
        expect(s.modalSub).toEqual({ margin: '3px 0 0', fontSize: 12.5, color: 'var(--fg2)' });
        expect(s.modalBody).toEqual({ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 18 });
        expect(s.modalFooter).toEqual({ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 10, padding: '14px 22px', borderTop: '1px solid var(--border)' });
        expect(s.alertBox).toEqual({ borderRadius: 'var(--radius-row)', padding: '10px 14px', fontSize: 13 });
    });

    it('swatches ring only when selected and round more from 24px up', () => {
        expect(s.swatchStyle('#5b8def', true, 26)).toEqual({
            width: 26, height: 26, borderRadius: 7, border: 'none', padding: 0, cursor: 'pointer',
            background: '#5b8def', boxShadow: '0 0 0 2px var(--panel), 0 0 0 3.5px var(--fg)', flexShrink: 0,
        });
        expect(s.swatchStyle('#5b8def', false, 16)).toMatchObject({ width: 16, height: 16, borderRadius: 5, boxShadow: 'none' });
        expect(s.swatchStyle('#5b8def', false, 24).borderRadius).toBe(7);
        expect(s.swatchStyle('#5b8def', false, 22).borderRadius).toBe(5);
    });
});

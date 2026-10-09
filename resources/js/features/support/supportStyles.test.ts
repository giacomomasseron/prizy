import { describe, expect, it } from 'vitest';
import { navRow } from '../../components/sidebarStyles';
import * as s from './supportStyles';

describe('supportStyles', () => {
    it('tints with color-mix (no fixed colours)', () => {
        expect(s.tint('var(--red)')).toBe('color-mix(in srgb, var(--red) 15%, transparent)');
        expect(s.tint('var(--note)', 40)).toBe('color-mix(in srgb, var(--note) 40%, transparent)');
    });

    it('sidebar frame, display title and compact v2 nav rows', () => {
        expect(s.sideFrame).toMatchObject({ width: 216, background: 'var(--bg2)', overflowY: 'auto' });
        expect(s.sideTitle).toMatchObject({ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800 });
        expect(s.sideSub).toEqual({ padding: '2px 16px 8px', fontSize: 12, color: 'var(--fg3)' });
        expect(s.sideSection).toMatchObject({ fontSize: 12.5, fontWeight: 700, color: 'var(--fg3)', padding: '12px 16px 6px' });
        expect(s.sideSection).not.toHaveProperty('textTransform');
        expect(s.sideRow(true)).toEqual({ ...navRow(true), padding: '7px 10px', fontSize: 13.5 });
        expect(s.sideRow(false)).not.toHaveProperty('background');
    });

    it('pane header and title, cards and labels', () => {
        expect(s.paneHeader).toMatchObject({ height: 60, borderBottom: '1px solid var(--border)', padding: '10px 20px' });
        expect(s.paneHeader).not.toHaveProperty('minHeight'); // fixed, so the list and conversation headers align
        expect(s.paneTitle).toMatchObject({ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, textOverflow: 'ellipsis' });
        expect(s.paneSub).toEqual({ fontSize: 12, color: 'var(--fg3)' });
        expect(s.deskCard).toEqual({ border: 'var(--line) solid var(--border)', borderRadius: 'var(--radius-card)', background: 'var(--panel)' });
        expect(s.cardSub).toEqual({ fontSize: 12.5, color: 'var(--fg3)', marginTop: 2 });
        expect(s.smallLabel).toEqual({ fontSize: 12.5, fontWeight: 700, color: 'var(--fg3)' });
    });

    it('tags and pills are sentence-case pills on token tints', () => {
        expect(s.statusTag('var(--amber)')).toEqual({ fontSize: 11.5, fontWeight: 700, padding: '2px 9px', borderRadius: 'var(--radius-pill)', color: 'var(--amber-ink)', background: 'color-mix(in srgb, var(--amber) 15%, transparent)', whiteSpace: 'nowrap' });
        expect(s.accentTag).toMatchObject({ color: 'var(--accent-ink)', background: 'var(--accent2)', borderRadius: 'var(--radius-pill)' });
        expect(s.smallPill).toMatchObject({ borderRadius: 'var(--radius-pill)', borderWidth: 'var(--line)', borderStyle: 'solid' });
        expect(s.smallPill).not.toHaveProperty('borderColor');
        expect(s.SMALL_PILL_CLASSES).toBe('border-border2 bg-panel text-fg2 hover:border-fg');
        expect(s.bar).toEqual({ height: 8, borderRadius: 'var(--radius-pill)', background: 'var(--border)', overflow: 'hidden' });
    });

    it('G3a: a status tag writes its text in the ink partner and keeps the base colour for the tint', () => {
        expect(s.statusTag('var(--green)')).toMatchObject({ color: 'var(--green-ink)', background: 'color-mix(in srgb, var(--green) 15%, transparent)' });
        expect(s.statusTag('var(--fg3)').color).toBe('var(--fg2)');
    });
});

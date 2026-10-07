import { describe, expect, it } from 'vitest';
import { DELETE_X_CLASSES, cardStyle, deleteXStyle, emptyState, filterLabel, pageCount, pageTitle, tagPill, titleRow } from './projectStyles';

describe('projectStyles', () => {
    it('page title is the 34px display heading', () => {
        expect(pageTitle).toMatchObject({ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 34, letterSpacing: '-.035em', lineHeight: 1 });
        expect(titleRow).toMatchObject({ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 18 });
        expect(pageCount).toMatchObject({ fontSize: 15, fontWeight: 700, color: 'var(--fg3)' });
    });
    it('cards, empty states, filter labels and tags use the v2 tokens', () => {
        expect(cardStyle).toEqual({ border: 'var(--line) solid var(--border)', borderRadius: 20, background: 'var(--panel)' });
        expect(emptyState).toMatchObject({ padding: 48, border: 'var(--line) dashed var(--border2)', borderRadius: 'var(--radius-card)', fontSize: 15, fontWeight: 600, color: 'var(--fg3)' });
        expect(filterLabel).toMatchObject({ fontSize: 13, fontWeight: 700, color: 'var(--fg3)', width: 72 });
        expect(tagPill).toMatchObject({ fontSize: 12, fontWeight: 700, padding: '3px 11px', borderRadius: 'var(--radius-pill)' });
    });
    it('delete × keeps its colour in classes so the red hover works', () => {
        expect(DELETE_X_CLASSES).toBe('text-fg3 hover:text-red');
        expect(deleteXStyle).not.toHaveProperty('color');
    });
});

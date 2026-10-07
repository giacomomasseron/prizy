import { describe, expect, it } from 'vitest';
import {
    EDITOR_TRIGGER_CLASSES, HI_PILL_CLASSES, POP_ITEM_CLASSES, TOOL_PILL_CLASSES,
    caretStyle, chipClasses, chipStyle, editorTriggerStyle, editorValueStyle,
    popItemStyle, popoverStyle, sectionTitle, toolPillStyle,
} from './issueStyles';

describe('issueStyles', () => {
    it('section titles use the display font at the requested size', () => {
        expect(sectionTitle(20)).toMatchObject({ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20, letterSpacing: '-.02em', color: 'var(--fg)' });
        expect(sectionTitle(16)).toMatchObject({ fontSize: 16, letterSpacing: '-.01em' });
        expect(sectionTitle(17).fontSize).toBe(17);
    });
    it('hover-able styles keep colours out of the inline style (inline would beat hover classes)', () => {
        for (const s of [toolPillStyle, chipStyle, popItemStyle, editorTriggerStyle]) {
            expect(s).not.toHaveProperty('background');
            expect(s).not.toHaveProperty('borderColor');
        }
        for (const s of [toolPillStyle, chipStyle]) {
            expect(s).not.toHaveProperty('border');
            expect(s).not.toHaveProperty('color');
            expect(s).toMatchObject({ borderWidth: 'var(--line)', borderStyle: 'solid', borderRadius: 'var(--radius-pill)' });
        }
    });
    it('carries the colours and hovers as classes', () => {
        expect(TOOL_PILL_CLASSES).toBe('border-border bg-panel text-fg2 hover:border-fg');
        expect(HI_PILL_CLASSES).toBe('border-fg bg-hi text-on-hi');
        expect(chipClasses(true)).toBe('border-fg bg-fg text-bg [--prio-bar:var(--bg)]');
        expect(chipClasses(false)).toBe('border-border bg-panel text-fg2 hover:border-fg');
        expect(POP_ITEM_CLASSES).toBe('bg-transparent hover:bg-hover focus-visible:bg-accent2');
        expect(EDITOR_TRIGGER_CLASSES).toBe('bg-transparent hover:bg-hover');
    });
    it('popover is the v2 ink-bordered card; editor triggers fill their row', () => {
        expect(popoverStyle).toMatchObject({ border: 'var(--line) solid var(--fg)', borderRadius: 'var(--radius-pop)', boxShadow: 'var(--pop-shadow)', zIndex: 30 });
        expect(editorTriggerStyle).toMatchObject({ width: '100%', cursor: 'pointer', fontSize: 14, fontWeight: 600 });
        expect(editorValueStyle).toMatchObject({ width: '100%', cursor: 'default' });
        expect(caretStyle.marginLeft).toBe('auto');
    });
});

import type { CSSProperties } from 'react';

// Colours that change on hover live in classes (an inline background would beat `hover:`).
const ASSIGN_TO_ME_CLASSES = 'border-border2 bg-panel text-fg2 hover:border-fg hover:bg-hi hover:text-on-hi';
const baseStyle: CSSProperties = {
    flexShrink: 0, marginRight: 6, padding: '3px 11px', borderWidth: 'var(--line)', borderStyle: 'solid',
    borderRadius: 'var(--radius-pill)', fontSize: 12, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', whiteSpace: 'nowrap',
};

export interface AssignToMeButtonProps {
    onAssign(): void;
    /** Merged over the button's spacing (e.g. to sit at the mockup's distance from a padded row's edge). */
    style?: CSSProperties;
}

/**
 * The quick action beside an issue's Assignee row (Prizy v2 drawer, Issue v2 page). Render it only when the issue is
 * not yours: it goes away once you are assigned, so a click first moves focus to the row's menu button.
 */
export function AssignToMeButton({ onAssign, style }: AssignToMeButtonProps) {
    return (
        <button
            type="button"
            title="Assign to me"
            onClick={(e) => {
                e.currentTarget.parentElement?.querySelector<HTMLElement>('[aria-haspopup="menu"]')?.focus();
                onAssign();
            }}
            className={ASSIGN_TO_ME_CLASSES}
            style={{ ...baseStyle, ...style }}
        >
            Assign to me
        </button>
    );
}

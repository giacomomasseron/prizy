import type { CSSProperties } from 'react';
import { Button } from '../../components/ui/Button';
import type { Issue } from '../../lib/types';
import { useToggleStar } from './hooks';

type Starrable = Pick<Issue, 'id' | 'starred'>;

/**
 * The ☆/★ toggle on list rows and board cards (PRD §3.2.9). A 24×24 toggle button named "Star" whose pressed state
 * says whether the caller starred the issue. Colours and hover live in classes (an inline style beats a class). It
 * keeps its click and pointerdown to itself: the row and the card open the issue on click, and the board drags on
 * pointerdown.
 */
export function StarToggle({ issue, style }: { issue: Starrable; style?: CSSProperties }) {
    const toggle = useToggleStar();
    const starred = issue.starred === true;

    return (
        <button
            type="button"
            aria-label="Star"
            aria-pressed={starred}
            title={starred ? 'Unstar' : 'Star — pin to top'}
            aria-disabled={toggle.isPending || undefined}
            className="bg-transparent text-fg3 hover:bg-hover aria-pressed:text-accent"
            style={{
                width: 24, height: 24, flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                padding: 0, borderWidth: 0, borderRadius: 6, fontSize: 15, lineHeight: 1, cursor: 'pointer', fontFamily: 'inherit',
                ...style,
            }}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
                e.stopPropagation();
                // aria-disabled, not disabled, while the request runs: a disabled button drops keyboard focus.
                if (toggle.isPending) return;
                toggle.mutate({ id: issue.id, starred: !starred });
            }}
        >
            <span aria-hidden="true">{starred ? '★' : '☆'}</span>
        </button>
    );
}

/** The "☆ Star" / "★ Starred" button in the drawer and full-page issue headers (PRD §3.2.9). */
export function StarButton({ issue, style }: { issue: Starrable; style?: CSSProperties }) {
    const toggle = useToggleStar();
    const starred = issue.starred === true;

    return (
        <Button
            variant="secondary"
            size="sm"
            aria-pressed={starred}
            aria-disabled={toggle.isPending || undefined}
            style={style}
            onClick={() => {
                if (!toggle.isPending) toggle.mutate({ id: issue.id, starred: !starred });
            }}
        >
            <span aria-hidden="true" className={starred ? 'text-accent' : undefined}>{starred ? '★' : '☆'}</span>
            {starred ? 'Starred' : 'Star'}
        </Button>
    );
}

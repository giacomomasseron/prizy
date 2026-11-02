import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';

export interface PeekTextFieldProps {
    /** The saved text. */
    value: string;
    /** Called with the edited text when it differs from the saved text; call `failed` if the save does not go through. */
    onSave(next: string, failed: () => void): void;
    label: string;
    placeholder: string;
    /** A title: Enter saves instead of breaking the line, pasted line breaks become spaces, and an emptied field goes back. */
    singleLine?: boolean;
    className: string;
    style: CSSProperties;
}

/**
 * An inline text field in the issue drawer (Prizy v2): it looks like text until you hover or focus it, and saves when
 * you leave it. Escape undoes an edit and keeps the drawer open; with nothing to undo, Escape closes the drawer.
 */
export function PeekTextField({ value, onSave, label, placeholder, singleLine = false, className, style }: PeekTextFieldProps) {
    const [draft, setDraft] = useState(value);
    const ref = useRef<HTMLTextAreaElement>(null);
    const editing = useRef(false);
    // The text the server has, or the last text sent: Enter then leaving the field saves once.
    const saved = useRef(value);
    const latest = useRef(value);

    // A save, or someone else's edit, shows here unless you have changed the text yourself: leaving the field then
    // saves nothing, so it never puts back the text it was showing.
    useEffect(() => {
        const before = saved.current;
        latest.current = value;
        saved.current = value;
        setDraft((d) => (!editing.current || d === before ? value : d));
    }, [value]);

    // Grow with the text: `field-sizing: content` where the browser has it, the measured height where it does not.
    useLayoutEffect(() => {
        const el = ref.current;
        if (!el || (typeof CSS !== 'undefined' && CSS.supports?.('field-sizing', 'content'))) return;
        el.style.height = 'auto';
        if (el.scrollHeight > 0) el.style.height = `${el.scrollHeight + el.offsetHeight - el.clientHeight}px`;
    }, [draft]);

    function commit() {
        const next = singleLine ? draft.replace(/\s*\n\s*/g, ' ').trim() : draft;
        if (singleLine && next === '') { setDraft(saved.current); return; }
        if (next !== draft) setDraft(next);
        if (next === saved.current) return;
        saved.current = next;
        onSave(next, () => { saved.current = latest.current; });
    }

    return (
        <textarea
            ref={ref}
            value={draft}
            rows={singleLine ? 1 : undefined}
            aria-label={label}
            placeholder={placeholder}
            onChange={(e) => setDraft(e.target.value)}
            onFocus={() => { editing.current = true; }}
            onBlur={() => { editing.current = false; commit(); }}
            onKeyDown={(e) => {
                // An input method's Enter confirms a word, not the title.
                if (singleLine && e.key === 'Enter' && !e.nativeEvent.isComposing) { e.preventDefault(); commit(); }
                // Undo first; the drawer listens for Escape on the document, so stopping here keeps it open.
                else if (e.key === 'Escape' && draft !== saved.current) { e.stopPropagation(); setDraft(saved.current); }
            }}
            className={className}
            style={{ fieldSizing: 'content', resize: 'none', outline: 'none', ...style }}
        />
    );
}

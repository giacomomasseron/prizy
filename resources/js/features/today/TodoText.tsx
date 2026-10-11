import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import type { Todo } from '../../lib/types';

export type TodoPart = { kind: 'text' | 'ref' | 'name'; text: string };

function escapeRegExp(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Split a to-do's text into plain text, the linked issue's reference, and `@Full Name` mentions of members (longest
 * name first). Any other `PRZ-` text stays plain: only the issue picked with the picker is a link (PRD §3.2.1).
 */
export function todoParts(text: string, identifier: string | null, names: string[]): TodoPart[] {
    const tokens = [
        ...(identifier ? [identifier] : []),
        ...[...names].filter((n) => n.trim() !== '').sort((a, b) => b.length - a.length).map((n) => `@${n}`),
    ];
    if (tokens.length === 0) return [{ kind: 'text', text }];
    const re = new RegExp(`(${tokens.map(escapeRegExp).join('|')})`);
    return text.split(re).filter((p) => p !== '').map((p): TodoPart => {
        if (identifier && p === identifier) return { kind: 'ref', text: p };
        if (p.startsWith('@') && names.includes(p.slice(1))) return { kind: 'name', text: p };
        return { kind: 'text', text: p };
    });
}

const PILL = { fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--on-hi)', background: 'var(--sticky-field)', borderRadius: 'var(--radius-pill)', padding: '1px 8px', textDecoration: 'none' } as const;

/**
 * A to-do's text on the note: the linked issue's reference is a pill that opens it (after the text if the text no
 * longer holds it), and member mentions are bold — the highlighter would vanish on the yellow note.
 */
export function TodoText({ todo, names }: { todo: Todo; names: string[] }) {
    const issue = todo.issue;
    const parts = todoParts(todo.text, issue?.identifier ?? null, names);
    const pill = (key: string) => issue && (
        <Link key={key} to={`/issues/${issue.id}`} title={issue.title} className="hover:underline" style={PILL}>{issue.identifier}</Link>
    );
    return (
        <>
            <span style={{ fontSize: 14.5, fontWeight: 500 }}>
                {parts.map((p, i) => (
                    p.kind === 'ref' ? pill(`ref-${i}`)
                        : p.kind === 'name' ? <strong key={i} style={{ fontWeight: 700 }}>{p.text}</strong>
                            : <Fragment key={i}>{p.text}</Fragment>
                ))}
            </span>
            {issue && !parts.some((p) => p.kind === 'ref') && <>{' '}{pill('trailing')}</>}
        </>
    );
}

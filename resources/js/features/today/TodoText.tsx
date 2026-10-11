import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import type { Todo } from '../../lib/types';
import { textParts } from '../mentions/mentionText';

const PILL = { fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--on-hi)', background: 'var(--sticky-field)', borderRadius: 'var(--radius-pill)', padding: '1px 8px', textDecoration: 'none' } as const;

/**
 * A to-do's text on the note: the linked issue's reference is a pill that opens it (after the text if the text no
 * longer holds it), and member mentions are bold — the highlighter would vanish on the yellow note.
 */
export function TodoText({ todo, names }: { todo: Todo; names: string[] }) {
    const issue = todo.issue;
    const parts = textParts(todo.text, issue ? [issue.identifier] : [], names);
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

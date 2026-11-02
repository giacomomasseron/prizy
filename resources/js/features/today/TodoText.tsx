import { Link } from 'react-router-dom';
import type { Todo } from '../../lib/types';

/** The pill's resting and hover backgrounds are classes: an inline background would beat the hover. */
const PILL = { fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--on-hi)', borderRadius: 'var(--radius-pill)', padding: '1px 8px', textDecoration: 'none' } as const;

/**
 * A to-do's text on the note (the Today v2 design): the text as typed, then the linked issue's reference as a pill
 * that opens the issue.
 */
export function TodoText({ todo }: { todo: Todo }) {
    const issue = todo.issue;
    return (
        <>
            <span style={{ fontSize: 14.5, fontWeight: 500 }}>{todo.text}</span>
            {issue && (
                <>
                    {' '}
                    <Link to={`/issues/${issue.id}`} title={issue.title} className="bg-sticky-field hover:bg-sticky-pop" style={PILL}>{issue.identifier}</Link>
                </>
            )}
        </>
    );
}

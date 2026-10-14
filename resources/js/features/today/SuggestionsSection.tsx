import { useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { QueryState, type QueryLike } from '../../components/ui/QueryState';
import type { PlanSuggestion } from '../../lib/types';
import { useAddToPlan } from './planHooks';
import { formatMinutes } from './planText';

const FAILED = 'That change didn’t save. Try again.';

/**
 * Could also fit today (the Today v2 design): the open issues assigned to you or starred and not yet planned, ranked
 * and explained by the server. + Add puts one on the end of the plan at once.
 */
export function SuggestionsSection({ query, suggestions }: { query: QueryLike; suggestions: PlanSuggestion[] | undefined }) {
    const [error, setError] = useState('');
    const add = useAddToPlan(() => setError(FAILED));
    const headingId = useId();
    const headingRef = useRef<HTMLHeadingElement>(null);
    const list = suggestions ?? [];

    function addToPlan(suggestion: PlanSuggestion) {
        setError('');
        add.mutate(suggestion);
        // The row leaves the list, and its + Add held the focus: hand it to the heading, not to the page.
        headingRef.current?.focus();
    }

    return (
        <section aria-labelledby={headingId}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
                <h2 id={headingId} ref={headingRef} tabIndex={-1} style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 26, letterSpacing: '-.025em' }}>Could also fit today</h2>
                <span data-testid="suggestion-count" style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg3)' }}>{list.length}</span>
                <span style={{ marginLeft: 'auto', fontSize: 13.5, color: 'var(--fg3)' }}>Ranked by urgency, cycle, and who’s waiting.</span>
            </div>
            {error && <p role="alert" style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 600, color: 'var(--red-ink)' }}>{error}</p>}
            <QueryState query={query} what="suggestions">
                <div style={{ border: 'var(--line) solid var(--border)', borderRadius: 20, overflow: 'hidden', background: 'var(--panel)' }}>
                    {list.length === 0 ? (
                        <p style={{ margin: 0, padding: 24, textAlign: 'center', color: 'var(--fg3)', fontSize: 15 }}>Everything assigned to you is planned.</p>
                    ) : (
                        <ul aria-label="Could also fit today" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                            {list.map((s, i) => (
                                <li
                                    key={s.issue.id}
                                    data-testid="suggestion-row"
                                    style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 18px', borderTop: i === 0 ? 'none' : 'var(--line) solid var(--border)' }}
                                >
                                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                                        <Link to={`/issues/${s.issue.id}`} className="text-fg hover:text-accent" style={{ fontSize: 15, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {s.issue.title}
                                        </Link>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13.5, color: 'var(--fg3)', minWidth: 0 }}>
                                            {s.issue.project && (
                                                <>
                                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700, color: 'var(--fg2)', flexShrink: 0 }}>
                                                        <span aria-hidden="true" style={{ width: 9, height: 9, borderRadius: 3, background: s.issue.project.color, flexShrink: 0 }} />
                                                        {s.issue.project.name}
                                                    </span>
                                                    <span aria-hidden="true">·</span>
                                                </>
                                            )}
                                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.reason}</span>
                                        </span>
                                    </div>
                                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg3)', width: 52, textAlign: 'right', flexShrink: 0 }}>{formatMinutes(s.minutes)}</span>
                                    <button
                                        type="button"
                                        aria-label={`Add to today: ${s.issue.title}`}
                                        title="Add to today"
                                        onClick={() => addToPlan(s)}
                                        className="border-border2 bg-panel text-fg hover:border-fg"
                                        style={{ padding: '6px 13px', borderRadius: 'var(--radius-pill)', borderWidth: 'var(--line)', borderStyle: 'solid', fontSize: 13, fontWeight: 700, cursor: 'pointer', flexShrink: 0, fontFamily: 'inherit' }}
                                    >
                                        + Add
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </QueryState>
        </section>
    );
}

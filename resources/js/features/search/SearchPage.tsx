import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIssueSearch, type AdvancedSearchFilters } from './hooks';
import { SearchFilterBuilder } from './SearchFilterBuilder';
import { StatusIcon } from '../../components/ui/StatusIcon';
import { PriorityIcon } from '../../components/ui/PriorityIcon';
import { Avatar } from '../../components/ui/Avatar';
import { avatarFor } from '../../lib/avatarFor';
import { LabelChip } from '../../components/ui/LabelChip';
import { Menu } from '../../components/ui/Menu';
import type { MenuItem } from '../../components/ui/Menu';
import type { Issue } from '../../lib/types';

const SORTS: { value: string; label: string }[] = [
    { value: 'updated', label: 'Last updated' },
    { value: 'priority', label: 'Priority' },
    { value: 'status', label: 'Status' },
];

// XSS-safe highlight: split on the query, render text spans (never dangerouslySetInnerHTML).
function highlight(title: string, q: string): React.ReactNode {
    const query = q.trim();
    if (!query) return title;
    const i = title.toLowerCase().indexOf(query.toLowerCase());
    if (i < 0) return title;
    return (
        <>
            {title.slice(0, i)}
            <span
                data-testid="hl"
                style={{
                    background: 'var(--accent2)',
                    color: 'var(--accent)',
                    borderRadius: 3,
                    padding: '0 2px',
                }}
            >
                {title.slice(i, i + query.length)}
            </span>
            {title.slice(i + query.length)}
        </>
    );
}

export default function SearchPage() {
    const navigate = useNavigate();
    const [text, setText] = useState('');
    const [debounced, setDebounced] = useState('');
    const [filters, setFilters] = useState<AdvancedSearchFilters>({});
    const [sort, setSort] = useState('updated');

    // Debounce text → debounced (250ms), mirroring CommandPalette.tsx
    useEffect(() => {
        const t = setTimeout(() => setDebounced(text), 250);
        return () => clearTimeout(t);
    }, [text]);

    const search = useIssueSearch({ q: debounced, sort, page: 1, ...filters });
    const rows = search.data?.items ?? [];

    const sortLabel = SORTS.find((s) => s.value === sort)?.label ?? 'Last updated';

    const sortMenuItems: MenuItem[] = SORTS.map((s) => ({
        key: s.value,
        label: s.label,
        onActivate: () => setSort(s.value),
    }));

    return (
        <div style={{ maxWidth: 1080, margin: '0 auto', padding: '26px 30px 80px' }}>
            {/* Query input */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    background: 'var(--panel)',
                    border: '1px solid var(--border)',
                    borderRadius: 10,
                    padding: '8px 14px',
                }}
            >
                <span style={{ fontSize: 17, color: 'var(--fg3)', flexShrink: 0 }}>⌕</span>
                <input
                    aria-label="Search issues"
                    autoFocus
                    placeholder="Search issues…"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    style={{
                        flex: 1,
                        border: 'none',
                        background: 'transparent',
                        outline: 'none',
                        fontSize: 14,
                        color: 'var(--fg)',
                        fontFamily: 'inherit',
                    }}
                />
            </div>

            <SearchFilterBuilder filters={filters} onChange={setFilters} />

            {/* Results header: count + sort */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    margin: '20px 0 10px',
                }}
            >
                <span style={{ fontSize: 12.5, fontWeight: 600 }}>{rows.length} results</span>
                <span style={{ fontSize: 12, color: 'var(--fg3)' }}>· sorted by</span>
                <Menu
                    trigger={
                        <button
                            type="button"
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                border: '1px solid var(--border)',
                                borderRadius: 7,
                                padding: '3px 9px',
                                fontSize: 12,
                                background: 'none',
                                cursor: 'pointer',
                                fontFamily: 'inherit',
                                color: 'var(--fg)',
                            }}
                        >
                            {sortLabel}
                            <span style={{ fontSize: 9 }}>▾</span>
                        </button>
                    }
                    items={sortMenuItems}
                />
                {/* Task 6: Save this view */}
            </div>

            {/* Results list */}
            <div
                style={{
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    overflow: 'hidden',
                }}
            >
                {rows.map((it: Issue) => (
                    <div
                        key={it.id}
                        data-testid="search-row"
                        onClick={() => navigate(`/issues/${it.id}`)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 11,
                            padding: '10px 16px',
                            borderBottom: '1px solid var(--border)',
                            cursor: 'pointer',
                            background: 'var(--panel)',
                        }}
                    >
                        <PriorityIcon priority={it.priority} />
                        <StatusIcon status={it.status} size={14} />
                        <span
                            style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize: 11.5,
                                color: 'var(--fg3)',
                                width: 56,
                                flexShrink: 0,
                            }}
                        >
                            {it.identifier ?? it.id.slice(0, 6).toUpperCase()}
                        </span>
                        <span
                            style={{
                                flex: 1,
                                minWidth: 0,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                fontSize: 13,
                            }}
                        >
                            {highlight(it.title, debounced)}
                        </span>
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                flexShrink: 0,
                            }}
                        >
                            {(it.labels ?? []).map((l) => (
                                <LabelChip key={l.id} name={l.name} color={l.color} />
                            ))}
                            <Avatar {...avatarFor(it.assignee ?? null)} size={20} />
                        </div>
                    </div>
                ))}

                {rows.length === 0 && !search.isLoading && (
                    <div style={{ padding: '56px 20px', textAlign: 'center' }}>
                        <div style={{ fontSize: 26, color: 'var(--fg3)', marginBottom: 10 }}>⌕</div>
                        <div style={{ fontSize: 14, fontWeight: 500 }}>No issues match your search</div>
                        <div style={{ fontSize: 12.5, color: 'var(--fg3)', marginTop: 5 }}>
                            Try removing a filter or broadening your query.
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

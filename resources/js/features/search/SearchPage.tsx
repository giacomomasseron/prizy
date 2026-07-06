import { useEffect, useRef, useState } from 'react';
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
import type { Issue, SavedView } from '../../lib/types';
import { useSavedViews, useCreateSavedView } from '../views/hooks';
import { ApiError } from '../../lib/apiClient';

const SORTS: { value: string; label: string }[] = [
    { value: 'updated', label: 'Last updated' },
    { value: 'priority', label: 'Priority' },
    { value: 'status', label: 'Status' },
];

function pagerBtn(disabled: boolean): React.CSSProperties {
    return {
        border: '1px solid var(--border)',
        borderRadius: 7,
        padding: '5px 14px',
        fontSize: 12.5,
        fontFamily: 'inherit',
        background: 'var(--panel)',
        color: 'var(--fg)',
        opacity: disabled ? 0.4 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
    };
}

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
    const [page, setPage] = useState(1);

    // Save this view state
    const [saveOpen, setSaveOpen] = useState(false);
    const [saveName, setSaveName] = useState('');
    const [saveError, setSaveError] = useState('');
    const [saveSuccess, setSaveSuccess] = useState(false);
    const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const createSavedView = useCreateSavedView();
    const savedViews = useSavedViews();

    // Debounce text → debounced (250ms), mirroring CommandPalette.tsx
    useEffect(() => {
        const t = setTimeout(() => setDebounced(text), 250);
        return () => clearTimeout(t);
    }, [text]);

    // Cleanup toast timer on unmount
    useEffect(() => {
        return () => {
            if (successTimerRef.current) clearTimeout(successTimerRef.current);
        };
    }, []);

    // Reset to page 1 whenever the query, sort, or any filter changes
    useEffect(() => {
        setPage(1);
    }, [debounced, sort, filters]);

    const search = useIssueSearch({ q: debounced, sort, page, ...filters });
    const rows = search.data?.items ?? [];
    const currentPage = search.data?.currentPage ?? 1;
    const lastPage = search.data?.lastPage ?? 1;

    const sortLabel = SORTS.find((s) => s.value === sort)?.label ?? 'Last updated';

    const sortMenuItems: MenuItem[] = SORTS.map((s) => ({
        key: s.value,
        label: s.label,
        onActivate: () => setSort(s.value),
    }));

    function handleSave() {
        setSaveError('');
        createSavedView.mutate(
            {
                name: saveName,
                definition: { filter: filters as Record<string, string>, sort, view_type: 'list' },
            },
            {
                onSuccess: () => {
                    setSaveSuccess(true);
                    setSaveOpen(false);
                    setSaveName('');
                    if (successTimerRef.current) clearTimeout(successTimerRef.current);
                    successTimerRef.current = setTimeout(() => setSaveSuccess(false), 2500);
                },
                onError: (e) => setSaveError((e as ApiError).message),
            },
        );
    }

    function loadSavedView(view: SavedView) {
        setFilters(view.definition.filter as AdvancedSearchFilters);
        setSort(view.definition.sort ?? 'updated');
    }

    const savedViewItems = savedViews.data?.items ?? [];

    return (
        <div style={{ maxWidth: 1080, margin: '0 auto', padding: '26px 30px 80px', display: 'flex', gap: 24 }}>
            {/* Saved views sidebar */}
            <aside style={{ width: 200, flexShrink: 0 }}>
                <div
                    style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: 'var(--fg3)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        marginBottom: 8,
                    }}
                >
                    Saved views
                </div>
                {savedViews.isLoading ? null : savedViewItems.length === 0 ? (
                    <div style={{ fontSize: 12.5, color: 'var(--fg3)' }}>No saved views</div>
                ) : (
                    savedViewItems.map((view) => (
                        <button
                            key={view.id}
                            type="button"
                            onClick={() => loadSavedView(view)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                width: '100%',
                                padding: '6px 8px',
                                background: 'none',
                                border: 'none',
                                borderRadius: 6,
                                cursor: 'pointer',
                                textAlign: 'left',
                                fontSize: 13,
                                color: 'var(--fg)',
                                fontFamily: 'inherit',
                            }}
                        >
                            <span
                                style={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: '50%',
                                    background: 'var(--accent)',
                                    flexShrink: 0,
                                    display: 'inline-block',
                                }}
                            />
                            {view.name}
                        </button>
                    ))
                )}
            </aside>

            {/* Main search area */}
            <div style={{ flex: 1, minWidth: 0 }}>
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

                {/* Results header: count + sort + save */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        margin: '20px 0 10px',
                    }}
                >
                    <span style={{ fontSize: 12.5, fontWeight: 600 }}>Page {currentPage} of {lastPage}</span>
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

                    {/* Save this view — toast, inline form, or trigger button */}
                    {saveSuccess ? (
                        <span style={{ fontSize: 12, color: 'var(--accent)', marginLeft: 4 }}>
                            View saved
                        </span>
                    ) : saveOpen ? (
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                handleSave();
                            }}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginLeft: 4 }}
                        >
                            <input
                                autoFocus
                                placeholder="View name…"
                                value={saveName}
                                onChange={(e) => setSaveName(e.target.value)}
                                style={{
                                    border: '1px solid var(--border)',
                                    borderRadius: 6,
                                    padding: '3px 8px',
                                    fontSize: 12,
                                    background: 'var(--panel)',
                                    color: 'var(--fg)',
                                    fontFamily: 'inherit',
                                    outline: 'none',
                                    width: 140,
                                }}
                            />
                            {saveError && (
                                <span style={{ fontSize: 12, color: 'var(--red)' }}>{saveError}</span>
                            )}
                            <button
                                type="submit"
                                disabled={!saveName.trim() || createSavedView.isPending}
                                style={{
                                    border: '1px solid var(--border)',
                                    borderRadius: 6,
                                    padding: '3px 9px',
                                    fontSize: 12,
                                    background: 'var(--accent)',
                                    color: '#fff',
                                    cursor: 'pointer',
                                    fontFamily: 'inherit',
                                }}
                            >
                                Save
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setSaveOpen(false);
                                    setSaveName('');
                                    setSaveError('');
                                }}
                                style={{
                                    border: '1px solid var(--border)',
                                    borderRadius: 6,
                                    padding: '3px 9px',
                                    fontSize: 12,
                                    background: 'none',
                                    cursor: 'pointer',
                                    fontFamily: 'inherit',
                                    color: 'var(--fg)',
                                }}
                            >
                                Cancel
                            </button>
                        </form>
                    ) : (
                        <button
                            type="button"
                            aria-label="Save this view"
                            onClick={() => setSaveOpen(true)}
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
                                color: 'var(--fg3)',
                                marginLeft: 4,
                            }}
                        >
                            ☆ Save this view
                        </button>
                    )}
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

                {/* Prev / Next pager */}
                <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'center' }}>
                    <button
                        type="button"
                        data-testid="search-prev"
                        disabled={currentPage <= 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        style={pagerBtn(currentPage <= 1)}
                    >
                        Previous
                    </button>
                    <button
                        type="button"
                        data-testid="search-next"
                        disabled={currentPage >= lastPage}
                        onClick={() => setPage((p) => p + 1)}
                        style={pagerBtn(currentPage >= lastPage)}
                    >
                        Next
                    </button>
                </div>
            </div>
        </div>
    );
}

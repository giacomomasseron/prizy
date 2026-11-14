import { useEffect, useRef, useState } from 'react';
import { QueryState } from '../../components/ui/QueryState';
import { Link, useNavigate } from 'react-router-dom';
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
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { ROW_FOCUS_CLASSES, ROW_PRIMARY_CLASSES, onRowLinkClick, rowPrimary } from '../../components/ui/rowPrimary';
import { NAV_ROW_HOVER, navRow, sectionLabel } from '../../components/sidebarStyles';
import { TOOL_PILL_CLASSES, sectionTitle, toolPillStyle } from '../issues/issueStyles';
import { issueRef } from '../issues/issueMeta';
import { useProjects } from '../projects/hooks';
import { shortAgo } from '../../lib/timeAgo';

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
            {/* The yellow highlighter, as on titles. */}
            <span data-testid="hl" style={{ background: 'var(--hi)', color: 'var(--on-hi)', borderRadius: 4, padding: '0 2px' }}>
                {title.slice(i, i + query.length)}
            </span>
            {title.slice(i + query.length)}
        </>
    );
}

/** A row's project: its colour square and name. Nothing for an issue in no project. */
function ProjectPill({ project }: { project?: { name: string; color: string } | null }) {
    if (!project) return null;
    return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 600, color: 'var(--fg2)' }}>
            <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: 3, background: project.color }} />
            {project.name}
        </span>
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
    const total = search.data?.total ?? 0;
    // The same list the filter builder reads: a row's project is drawn from it (the search rows carry only the id).
    const projects = useProjects().data?.items ?? [];

    /** "Clear all" and "Clear all filters": the query and every filter. */
    function clearAll() {
        setText('');
        setFilters({});
    }

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
    const smallPill = { ...toolPillStyle, padding: '5px 12px', fontSize: 12.5 };

    return (
        <>
            <nav aria-label="Breadcrumb" style={{ height: 64, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10, padding: '0 24px 0 calc(16px + var(--nav-inset, 0px))' }}>
                <Link to="/issues" className="text-fg2 hover:bg-hover" style={{ fontSize: 14, fontWeight: 600, padding: '5px 10px', borderRadius: 'var(--radius-pill)', textDecoration: 'none' }}>Issues</Link>
                <span aria-hidden="true" style={{ color: 'var(--border2)', fontWeight: 700 }}>/</span>
                <span aria-current="page" style={{ fontSize: 14, fontWeight: 700 }}>Advanced search</span>
            </nav>
            <div style={{ display: 'flex', gap: 24, padding: '18px 26px 80px', maxWidth: 1132, boxSizing: 'border-box' }}>
                {/* Saved views sidebar */}
                <aside aria-label="Saved views" style={{ width: 200, flexShrink: 0 }}>
                    <div style={{ ...sectionLabel, display: 'block', padding: '0 12px', marginBottom: 6 }}>Saved views</div>
                    <QueryState query={savedViews} what="saved views">
                        {savedViewItems.length === 0 ? (
                            <div style={{ fontSize: 13, color: 'var(--fg3)', padding: '0 12px' }}>No saved views</div>
                        ) : (
                            savedViewItems.map((view) => (
                                <button
                                    key={view.id}
                                    type="button"
                                    onClick={() => loadSavedView(view)}
                                    style={{ ...navRow(false), fontSize: 13.5 }}
                                    className={NAV_ROW_HOVER}
                                >
                                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0, display: 'inline-block' }} />
                                    {view.name}
                                </button>
                            ))
                        )}
                    </QueryState>
                </aside>

                {/* Main search area */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <h1 style={{ margin: '0 0 20px', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 40, letterSpacing: '-.035em', lineHeight: 1.05 }}>
                        <span className="hl">Find anything</span>
                    </h1>

                    {/* Query field: the big ink pill with the hard shadow. */}
                    <div
                        className="border-fg"
                        style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--panel)', borderRadius: 'var(--radius-pill)', borderWidth: 2, borderStyle: 'solid', padding: '15px 20px', boxShadow: 'var(--pop-shadow)', marginBottom: 18 }}
                    >
                        <span aria-hidden="true" style={{ fontSize: 19, color: 'var(--fg2)', flexShrink: 0 }}>⌕</span>
                        <input
                            aria-label="Search issues"
                            autoFocus
                            placeholder="Search issues…"
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            style={{ flex: 1, minWidth: 0, border: 'none', background: 'transparent', outline: 'none', fontSize: 16.5, fontWeight: 500, color: 'var(--fg)', fontFamily: 'inherit' }}
                        />
                    </div>

                    <SearchFilterBuilder filters={filters} onChange={setFilters} hasQuery={text !== ''} onClearAll={clearAll} />

                    {/* Results header: count + sort + save */}
                    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10, margin: '24px 0 12px' }}>
                        {/* No count until the first answer: "0 results" would be untrue while it loads. */}
                        {search.data && <span data-testid="search-count" style={sectionTitle(20)}>{total} {total === 1 ? 'result' : 'results'}</span>}
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg3)' }}>sorted by</span>
                        <Menu
                            trigger={
                                <button type="button" style={smallPill} className={TOOL_PILL_CLASSES}>
                                    {sortLabel}
                                    <span aria-hidden="true" style={{ fontSize: 10, color: 'var(--fg3)' }}>▾</span>
                                </button>
                            }
                            items={sortMenuItems}
                        />

                        {/* Save this view — toast, inline form, or trigger button */}
                        {saveSuccess ? (
                            <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--fg2)', marginLeft: 'auto' }}>
                                View saved
                            </span>
                        ) : saveOpen ? (
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    handleSave();
                                }}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}
                            >
                                <Input
                                    autoFocus
                                    aria-label="View name"
                                    placeholder="View name…"
                                    value={saveName}
                                    onChange={(e) => setSaveName(e.target.value)}
                                    style={{ width: 170, padding: '5px 12px', fontSize: 12.5 }}
                                />
                                {saveError && (
                                    <span style={{ fontSize: 12.5, color: 'var(--red-ink)' }}>{saveError}</span>
                                )}
                                <Button type="submit" size="sm" disabled={!saveName.trim() || createSavedView.isPending}>
                                    Save
                                </Button>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => {
                                        setSaveOpen(false);
                                        setSaveName('');
                                        setSaveError('');
                                    }}
                                >
                                    Cancel
                                </Button>
                            </form>
                        ) : (
                            <Button aria-label="Save this view" onClick={() => setSaveOpen(true)} style={{ marginLeft: 'auto' }}>
                                ☆ Save this view
                            </Button>
                        )}
                    </div>

                    {/* Results list */}
                    <QueryState query={search} what="results">
                        <div style={{ border: 'var(--line) solid var(--border)', borderRadius: 'var(--radius-card)', background: 'var(--panel)', overflow: 'hidden' }}>
                            {rows.map((it: Issue) => (
                                // Separator + hover are classes (an inline background would beat hover:).
                                <div
                                    key={it.id}
                                    data-testid="search-row"
                                    onClick={() => navigate(`/issues/${it.id}`)}
                                    className={`border-b border-border last:border-b-0 hover:bg-hover ${ROW_FOCUS_CLASSES}`}
                                    style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 18px', cursor: 'pointer' }}
                                >
                                    <PriorityIcon priority={it.priority} />
                                    <StatusIcon status={it.status} size={14} />
                                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--fg3)', width: 76, flexShrink: 0 }}>
                                        {issueRef(it)}
                                    </span>
                                    {/* The row's primary control (V2-G3b): a link, so it opens in a new tab too. */}
                                    <Link to={`/issues/${it.id}`} onClick={onRowLinkClick} className={ROW_PRIMARY_CLASSES} style={{ ...rowPrimary, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 14.5, fontWeight: 600 }}>
                                        {highlight(it.title, debounced)}
                                    </Link>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                                        {(it.labels ?? []).map((l) => (
                                            <LabelChip key={l.id} name={l.name} color={l.color} />
                                        ))}
                                        <ProjectPill project={it.project ?? projects.find((p) => p.id === it.project_id)} />
                                        <span data-testid="search-updated" style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--fg3)', width: 38, textAlign: 'right' }}>{shortAgo(it.updated_at)}</span>
                                        <Avatar {...avatarFor(it.assignee ?? null)} size={24} />
                                    </div>
                                </div>
                            ))}

                            {rows.length === 0 && (
                                <div style={{ padding: '60px 20px', textAlign: 'center' }}>
                                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, letterSpacing: '-.02em' }}>
                                        Nothing matches <span className="hl" style={{ padding: '0 3px', margin: 0 }}>yet</span>
                                    </div>
                                    <div style={{ fontSize: 14, color: 'var(--fg2)', marginTop: 6 }}>
                                        Try removing a filter or broadening your query.
                                    </div>
                                    <Button variant="secondary" onClick={clearAll} style={{ marginTop: 16 }}>Clear all filters</Button>
                                </div>
                            )}
                        </div>

                        {/* Prev / Next pager */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16, justifyContent: 'center' }}>
                            <Button
                                variant="secondary"
                                size="sm"
                                data-testid="search-prev"
                                disabled={currentPage <= 1}
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                            >
                                Previous
                            </Button>
                            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg3)' }}>Page {currentPage} of {lastPage}</span>
                            <Button
                                variant="secondary"
                                size="sm"
                                data-testid="search-next"
                                disabled={currentPage >= lastPage}
                                onClick={() => setPage((p) => p + 1)}
                            >
                                Next
                            </Button>
                        </div>
                    </QueryState>
                </div>
            </div>
        </>
    );
}

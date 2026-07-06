import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMe } from '../../auth/useAuth';
import { ApiError } from '../../lib/apiClient';
import type { SavedView } from '../../lib/types';
import { useLabels } from '../labels/hooks';
import { useProjects } from '../projects/hooks';
import { useTeams } from '../teams/hooks';
import type { IssueFilters } from '../issues/hooks';
import { BUILTIN_VIEWS, FILTER_FIELDS, type FilterKey, PRESET_PILLS, SORT_OPTIONS, filtersToParams, paramsToFilters } from './filters';
import { useCreateSavedView, useDeleteSavedView, useSavedViews } from './hooks';
import { Button } from '../../components/ui/Button';
import { useConfirm } from '../../components/ui/ConfirmProvider';

function useFieldOptions() {
    const teams = useTeams();
    const projects = useProjects();
    const labels = useLabels();
    return (key: FilterKey): Array<{ value: string; label: string }> => {
        const field = FILTER_FIELDS.find((f) => f.key === key)!;
        if (field.kind === 'enum') return (field.options ?? []).map((o) => ({ value: o, label: o }));
        if (field.kind === 'team') return (teams.data?.items ?? []).map((t) => ({ value: t.id, label: t.name }));
        if (field.kind === 'project') return (projects.data?.items ?? []).map((p) => ({ value: p.id, label: p.name }));
        return (labels.data?.items ?? []).map((l) => ({ value: l.id, label: l.name }));
    };
}

// Shared style for toolbar action buttons (Views, + Filter)
const toolBtnStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '4px 10px',
    borderRadius: 8,
    border: '1px solid var(--border)',
    background: 'transparent',
    color: 'var(--fg3)',
    fontSize: 12,
    cursor: 'pointer',
    fontFamily: 'inherit',
};

// Shared popover / dropdown panel style
const popoverStyle: React.CSSProperties = {
    position: 'absolute',
    zIndex: 10,
    marginTop: 4,
    borderRadius: 8,
    border: '1px solid var(--border)',
    background: 'var(--panel)',
    boxShadow: '0 4px 16px rgba(0,0,0,.22)',
};

// Shared style for items inside a popover
const menuItemStyle: React.CSSProperties = {
    display: 'block',
    width: '100%',
    padding: '6px 12px',
    textAlign: 'left',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: 13,
    fontFamily: 'inherit',
    color: 'var(--fg)',
};

export function FilterBar({ viewType }: { viewType: 'list' | 'board' }) {
    const [searchParams, setSearchParams] = useSearchParams();
    const filters = paramsToFilters(searchParams);
    const optionsFor = useFieldOptions();
    const [addOpen, setAddOpen] = useState(false);
    const [openPill, setOpenPill] = useState<FilterKey | null>(null);

    const navigate = useNavigate();
    const me = useMe();
    const confirm = useConfirm();
    const savedViews = useSavedViews();
    const createView = useCreateSavedView();
    const deleteView = useDeleteSavedView();
    const [viewsOpen, setViewsOpen] = useState(false);
    const [error, setError] = useState('');
    const canDevelop = !!me.data?.is_developer && me.data?.admin_level !== 'viewer';

    function applyFilters(next: IssueFilters) {
        setSearchParams(filtersToParams(next));
    }

    function applySavedView(view: SavedView) {
        const next = { ...view.definition.filter, sort: view.definition.sort } as IssueFilters;
        setViewsOpen(false);
        const search = filtersToParams(next).toString();
        if (view.definition.view_type !== viewType) {
            navigate({ pathname: view.definition.view_type === 'board' ? '/board' : '/', search });
        } else {
            setSearchParams(filtersToParams(next));
        }
    }

    async function saveView() {
        setError('');
        const name = window.prompt('View name');
        if (!name) return;
        const { sort, ...filterOnly } = filters;
        try {
            await createView.mutateAsync({ name, definition: { filter: filterOnly as Record<string, string>, sort: sort ?? '', view_type: viewType } });
        } catch (err) {
            setError(err instanceof ApiError ? err.detail : 'Failed to save view.');
        }
    }

    function canManage(createdBy: string): boolean {
        return me.data?.id === createdBy || ['owner', 'admin'].includes(me.data?.admin_level ?? '');
    }

    function setFilter(key: string, csv: string | null) {
        const next = { ...filters } as IssueFilters;
        if (csv) (next as Record<string, string>)[key] = csv;
        else delete (next as Record<string, string>)[key];
        setSearchParams(filtersToParams(next));
    }

    function toggleValue(key: FilterKey, value: string) {
        const current = (filters as Record<string, string>)[key];
        const values = current ? current.split(',') : [];
        const next = values.includes(value) ? values.filter((v) => v !== value) : [...values, value];
        setFilter(key, next.length ? next.join(',') : null);
    }

    const activeKeys = Object.keys(filters).filter((k) => k !== 'sort');
    const editableActive = activeKeys.filter((k) => FILTER_FIELDS.some((f) => f.key === k)) as FilterKey[];
    const presetActive = activeKeys.filter((k) => k in PRESET_PILLS);

    // Include openPill even if it has no value yet (pending pill: popover is open but nothing selected).
    const editableShown: FilterKey[] = openPill && !editableActive.includes(openPill)
        ? [...editableActive, openPill]
        : editableActive;

    const available = FILTER_FIELDS.filter((f) => !editableShown.includes(f.key));

    return (
        <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 8,
            padding: '6px 22px',
            borderBottom: '1px solid var(--border)',
            background: 'var(--bg)',
        }}>
            {/* Views dropdown */}
            <div style={{ position: 'relative' }}>
                <button
                    type="button"
                    aria-label="Views"
                    onClick={() => setViewsOpen((o) => !o)}
                    style={toolBtnStyle}
                >
                    Views ▾
                </button>
                {viewsOpen && (
                    <div role="menu" style={{ ...popoverStyle, width: 224 }}>
                        {BUILTIN_VIEWS.map((v) => (
                            <button
                                key={v.key}
                                type="button"
                                role="menuitem"
                                onClick={() => { applyFilters(v.build ? v.build(me.data?.id ?? '') : (v.filters ?? {})); setViewsOpen(false); }}
                                style={menuItemStyle}
                                className="hover:bg-hover"
                            >
                                {v.label}
                            </button>
                        ))}
                        <div style={{ margin: '4px 0', borderTop: '1px solid var(--border)' }} />
                        {savedViews.data?.items.map((view) => (
                            <div
                                key={view.id}
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 6px 2px 12px' }}
                                className="hover:bg-hover"
                            >
                                <button
                                    type="button"
                                    role="menuitem"
                                    onClick={() => applySavedView(view)}
                                    style={{ ...menuItemStyle, padding: '4px 0', flex: 1 }}
                                >
                                    {view.name}
                                </button>
                                {canManage(view.created_by) && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        aria-label={`Delete view ${view.name}`}
                                        onClick={async () => { if (await confirm({ title: `Delete view ${view.name}?`, danger: true })) deleteView.mutate(view.id); }}
                                        style={{ color: 'var(--red)', padding: '2px 6px', minWidth: 0 }}
                                    >
                                        ×
                                    </Button>
                                )}
                            </div>
                        ))}
                        {(savedViews.data?.items.length ?? 0) === 0 && (
                            <p style={{ padding: '6px 12px', color: 'var(--fg3)', fontSize: 13, margin: 0 }}>No saved views</p>
                        )}
                    </div>
                )}
            </div>

            {/* + Filter dropdown */}
            <div style={{ position: 'relative' }}>
                <button type="button" onClick={() => setAddOpen((o) => !o)} style={toolBtnStyle}>+ Filter</button>
                {addOpen && (
                    <div role="menu" style={{ ...popoverStyle, width: 160 }}>
                        {available.map((f) => (
                            <button
                                key={f.key}
                                type="button"
                                role="menuitem"
                                onClick={() => { setOpenPill(f.key); setAddOpen(false); }}
                                style={menuItemStyle}
                                className="hover:bg-hover"
                            >
                                {f.label}
                            </button>
                        ))}
                        {available.length === 0 && (
                            <p style={{ padding: '6px 12px', color: 'var(--fg3)', fontSize: 13, margin: 0 }}>All added</p>
                        )}
                    </div>
                )}
            </div>

            {/* Active (editable) filter pills */}
            {editableShown.map((key) => {
                const field = FILTER_FIELDS.find((f) => f.key === key)!;
                const csv = (filters as Record<string, string>)[key] ?? '';
                const selected = csv ? csv.split(',') : [];
                const opts = optionsFor(key);
                return (
                    <div key={key} style={{ position: 'relative' }}>
                        <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '3px 6px 3px 9px',
                            borderRadius: 7,
                            background: 'var(--accent2)',
                            color: 'var(--accent)',
                            fontSize: 11.5,
                            fontWeight: 600,
                            border: 'none',
                        }}>
                            <button
                                type="button"
                                onClick={() => setOpenPill((p) => (p === key ? null : key))}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 'inherit', fontSize: 'inherit', fontFamily: 'inherit', padding: 0 }}
                            >
                                {field.label}{selected.length ? `: ${selected.map((v) => opts.find((o) => o.value === v)?.label ?? v).join(', ')}` : ''}
                            </button>
                            <button
                                type="button"
                                aria-label={`Remove ${field.label} filter`}
                                onClick={() => { setFilter(key, null); setOpenPill(null); }}
                                style={{ color: 'var(--accent)', fontSize: 12, background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1 }}
                            >
                                ×
                            </button>
                        </span>
                        {openPill === key && (
                            <div style={{
                                position: 'absolute',
                                zIndex: 10,
                                marginTop: 4,
                                maxHeight: 224,
                                width: 192,
                                overflow: 'auto',
                                borderRadius: 8,
                                border: '1px solid var(--border)',
                                background: 'var(--panel)',
                                padding: 8,
                                boxShadow: '0 4px 16px rgba(0,0,0,.22)',
                            }}>
                                {opts.map((o) => (
                                    <label key={o.value} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '2px 0', fontSize: 13, color: 'var(--fg)', cursor: 'pointer' }}>
                                        <input type="checkbox" aria-label={o.label} checked={selected.includes(o.value)} onChange={() => toggleValue(key, o.value)} />
                                        {o.label}
                                    </label>
                                ))}
                                {opts.length === 0 && <p style={{ color: 'var(--fg3)', fontSize: 13, margin: 0 }}>No options</p>}
                            </div>
                        )}
                    </div>
                );
            })}

            {/* Preset (built-in) active pills — e.g. My Issues, Active Cycle */}
            {presetActive.map((key) => (
                <span key={key} style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '3px 6px 3px 9px',
                    borderRadius: 7,
                    background: 'var(--hover)',
                    color: 'var(--fg2)',
                    fontSize: 11.5,
                    fontWeight: 500,
                }}>
                    {PRESET_PILLS[key]((filters as Record<string, string>)[key])}
                    <button
                        type="button"
                        aria-label={`Remove ${key === 'assignee_id' ? 'Assigned to me' : key === 'cycle_id' ? 'Active cycle' : key} filter`}
                        onClick={() => setFilter(key, null)}
                        style={{ color: 'var(--fg2)', fontSize: 12, background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1 }}
                    >
                        ×
                    </button>
                </span>
            ))}

            {/* Sort — keeps native select for behavior preservation */}
            <label style={{ marginLeft: 'auto', ...toolBtnStyle }}>
                Sort
                <select
                    aria-label="Sort issues"
                    value={filters.sort ?? ''}
                    onChange={(e) => setFilter('sort', e.target.value || null)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--fg3)', fontSize: 12, cursor: 'pointer', outline: 'none', fontFamily: 'inherit' }}
                >
                    <option value="">Default</option>
                    {SORT_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
            </label>

            {/* Save view */}
            {canDevelop && (
                <Button variant="ghost" size="sm" onClick={saveView} disabled={createView.isPending}>
                    Save view
                </Button>
            )}

            {error && <span style={{ color: 'var(--red)', fontSize: 12 }}>{error}</span>}
        </div>
    );
}

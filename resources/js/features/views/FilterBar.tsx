import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMe } from '../../auth/useAuth';
import { canDevelop as canDevelopFor } from '../../auth/capabilities';
import { ApiError } from '../../lib/apiClient';
import type { SavedView } from '../../lib/types';
import { useLabels } from '../labels/hooks';
import { useProjects } from '../projects/hooks';
import { useTeams } from '../teams/hooks';
import type { IssueFilters } from '../issues/hooks';
import { HI_PILL_CLASSES, POP_ITEM_CLASSES, TOOL_PILL_CLASSES, popItemStyle, popoverStyle, toolPillStyle } from '../issues/issueStyles';
import { BUILTIN_VIEWS, FILTER_FIELDS, type FilterKey, PRESET_PILLS, SORT_OPTIONS, filtersToParams, paramsToFilters } from './filters';
import { useCreateSavedView, useDeleteSavedView, useSavedViews } from './hooks';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
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

// Active filter / preset pill: border width + style inline; colours come from HI_PILL_CLASSES.
const hiPillStyle: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 6px 4px 12px',
    borderRadius: 'var(--radius-pill)', borderWidth: 'var(--line)', borderStyle: 'solid',
    fontSize: 13.5, fontWeight: 600,
};

// The × inside a pill: transparent on the yellow fill; hover raises opacity (class).
const pillRemoveStyle: React.CSSProperties = {
    width: 20, height: 20, borderRadius: '50%', border: 'none', background: 'none', color: 'inherit',
    cursor: 'pointer', padding: 0, fontSize: 14, lineHeight: 1, fontFamily: 'inherit',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
};

const popNote: React.CSSProperties = { padding: '8px 10px', color: 'var(--fg3)', fontSize: 13, margin: 0 };

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
    const [savingView, setSavingView] = useState(false);
    const [newViewName, setNewViewName] = useState('');
    const canDevelop = canDevelopFor(me.data);

    function applyFilters(next: IssueFilters) {
        setSearchParams(filtersToParams(next), { replace: true });
    }

    function applySavedView(view: SavedView) {
        const next = { ...view.definition.filter, sort: view.definition.sort } as IssueFilters;
        setViewsOpen(false);
        const search = filtersToParams(next).toString();
        if (view.definition.view_type !== viewType) {
            navigate({ pathname: view.definition.view_type === 'board' ? '/board' : '/', search });
        } else {
            setSearchParams(filtersToParams(next), { replace: true });
        }
    }

    async function submitView() {
        setError('');
        const name = newViewName.trim();
        if (!name) return;
        const { sort, ...filterOnly } = filters;
        try {
            await createView.mutateAsync({ name, definition: { filter: filterOnly as Record<string, string>, sort: sort ?? '', view_type: viewType } });
            setSavingView(false); setNewViewName('');
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
        setSearchParams(filtersToParams(next), { replace: true });
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
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, padding: '4px 26px 18px' }}>
            {/* Views dropdown */}
            <div style={{ position: 'relative' }}>
                <button
                    type="button"
                    aria-label="Views"
                    onClick={() => setViewsOpen((o) => !o)}
                    className={TOOL_PILL_CLASSES}
                    style={toolPillStyle}
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
                                className={POP_ITEM_CLASSES}
                                style={popItemStyle}
                            >
                                {v.label}
                            </button>
                        ))}
                        <div style={{ margin: '4px 6px', borderTop: '1px solid var(--border)' }} />
                        {savedViews.data?.items.map((view) => (
                            <div
                                key={view.id}
                                className="hover:bg-hover"
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: 'var(--radius-row)', paddingRight: 4 }}
                            >
                                <button
                                    type="button"
                                    role="menuitem"
                                    onClick={() => applySavedView(view)}
                                    className="bg-transparent focus-visible:bg-accent2"
                                    style={{ ...popItemStyle, flex: 1 }}
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
                        {(savedViews.data?.items.length ?? 0) === 0 && <p style={popNote}>No saved views</p>}
                    </div>
                )}
            </div>

            {/* + Filter dropdown */}
            <div style={{ position: 'relative' }}>
                <button type="button" onClick={() => setAddOpen((o) => !o)} className={TOOL_PILL_CLASSES} style={toolPillStyle}>+ Filter</button>
                {addOpen && (
                    <div role="menu" style={{ ...popoverStyle, width: 170 }}>
                        {available.map((f) => (
                            <button
                                key={f.key}
                                type="button"
                                role="menuitem"
                                onClick={() => { setOpenPill(f.key); setAddOpen(false); }}
                                className={POP_ITEM_CLASSES}
                                style={popItemStyle}
                            >
                                {f.label}
                            </button>
                        ))}
                        {available.length === 0 && <p style={popNote}>All added</p>}
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
                        <span className={HI_PILL_CLASSES} style={hiPillStyle}>
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
                                className="opacity-70 hover:opacity-100"
                                style={pillRemoveStyle}
                            >
                                ×
                            </button>
                        </span>
                        {openPill === key && (
                            <div style={{ ...popoverStyle, width: 192, maxHeight: 224, overflow: 'auto', padding: 8 }}>
                                {opts.map((o) => (
                                    <label key={o.value} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 2px', fontSize: 13.5, color: 'var(--fg)', cursor: 'pointer' }}>
                                        <input type="checkbox" aria-label={o.label} checked={selected.includes(o.value)} onChange={() => toggleValue(key, o.value)} />
                                        {o.label}
                                    </label>
                                ))}
                                {opts.length === 0 && <p style={{ ...popNote, padding: '4px 2px' }}>No options</p>}
                            </div>
                        )}
                    </div>
                );
            })}

            {/* Preset (built-in) active pills — e.g. My Issues, Active Cycle */}
            {presetActive.map((key) => (
                <span key={key} className={HI_PILL_CLASSES} style={hiPillStyle}>
                    {PRESET_PILLS[key]((filters as Record<string, string>)[key])}
                    <button
                        type="button"
                        aria-label={`Remove ${key === 'assignee_id' ? 'Assigned to me' : key === 'cycle_id' ? 'Active cycle' : key} filter`}
                        onClick={() => setFilter(key, null)}
                        className="opacity-70 hover:opacity-100"
                        style={pillRemoveStyle}
                    >
                        ×
                    </button>
                </span>
            ))}

            {/* Sort — keeps native select for behavior preservation */}
            <label className={`${TOOL_PILL_CLASSES} focus-within:border-fg`} style={{ ...toolPillStyle, marginLeft: 'auto', cursor: 'default' }}>
                Sort
                <select
                    aria-label="Sort issues"
                    value={filters.sort ?? ''}
                    onChange={(e) => setFilter('sort', e.target.value || null)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--fg)', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', outline: 'none', fontFamily: 'inherit' }}
                >
                    <option value="">Default</option>
                    {SORT_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
            </label>

            {/* Save view */}
            {canDevelop && (
                savingView ? (
                    <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                        <Input
                            autoFocus
                            aria-label="View name"
                            value={newViewName}
                            onChange={(e) => setNewViewName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') submitView();
                                if (e.key === 'Escape') { setSavingView(false); setNewViewName(''); }
                            }}
                            placeholder="View name"
                            style={{ width: 180, padding: '6px 13px', fontSize: 13.5 }}
                        />
                        <Button variant="primary" size="sm" onClick={submitView} disabled={createView.isPending || !newViewName.trim()}>Save</Button>
                        <Button variant="ghost" size="sm" onClick={() => { setSavingView(false); setNewViewName(''); }}>Cancel</Button>
                    </span>
                ) : (
                    <Button variant="secondary" size="sm" onClick={() => setSavingView(true)}>Save view</Button>
                )
            )}

            {error && <span style={{ color: 'var(--red)', fontSize: 13 }}>{error}</span>}
        </div>
    );
}

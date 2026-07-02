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

export function FilterBar({ viewType }: { viewType: 'list' | 'board' }) {
    const [searchParams, setSearchParams] = useSearchParams();
    const filters = paramsToFilters(searchParams);
    const optionsFor = useFieldOptions();
    const [addOpen, setAddOpen] = useState(false);
    const [openPill, setOpenPill] = useState<FilterKey | null>(null);

    const navigate = useNavigate();
    const me = useMe();
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
        <div className="flex flex-wrap items-center gap-2 border-b bg-white px-6 py-2 text-sm">
            <div className="relative">
                <button type="button" aria-label="Views" onClick={() => setViewsOpen((o) => !o)} className="rounded border px-2 py-1 text-gray-600 hover:bg-gray-50">Views ▾</button>
                {viewsOpen && (
                    <div role="menu" className="absolute z-10 mt-1 w-56 rounded border bg-white shadow">
                        {BUILTIN_VIEWS.map((v) => (
                            <button key={v.key} type="button" role="menuitem" onClick={() => { applyFilters(v.build ? v.build(me.data?.id ?? '') : (v.filters ?? {})); setViewsOpen(false); }}
                                className="block w-full px-3 py-1 text-left hover:bg-gray-50">{v.label}</button>
                        ))}
                        <div className="my-1 border-t" />
                        {savedViews.data?.items.map((view) => (
                            <div key={view.id} className="flex items-center justify-between px-3 py-1 hover:bg-gray-50">
                                <button type="button" role="menuitem" onClick={() => applySavedView(view)} className="text-left">{view.name}</button>
                                {canManage(view.created_by) && (
                                    <button type="button" aria-label={`Delete view ${view.name}`} onClick={() => { if (window.confirm(`Delete view ${view.name}?`)) deleteView.mutate(view.id); }} className="text-red-600">×</button>
                                )}
                            </div>
                        ))}
                        {(savedViews.data?.items.length ?? 0) === 0 && <p className="px-3 py-1 text-gray-400">No saved views</p>}
                    </div>
                )}
            </div>
            <div className="relative">
                <button type="button" onClick={() => setAddOpen((o) => !o)} className="rounded border px-2 py-1 text-gray-600 hover:bg-gray-50">+ Filter</button>
                {addOpen && (
                    <div role="menu" className="absolute z-10 mt-1 w-40 rounded border bg-white shadow">
                        {available.map((f) => (
                            <button key={f.key} type="button" role="menuitem" onClick={() => { setOpenPill(f.key); setAddOpen(false); }}
                                className="block w-full px-3 py-1 text-left hover:bg-gray-50">{f.label}</button>
                        ))}
                        {available.length === 0 && <p className="px-3 py-1 text-gray-400">All added</p>}
                    </div>
                )}
            </div>

            {editableShown.map((key) => {
                const field = FILTER_FIELDS.find((f) => f.key === key)!;
                const csv = (filters as Record<string, string>)[key] ?? '';
                const selected = csv ? csv.split(',') : [];
                const opts = optionsFor(key);
                return (
                    <div key={key} className="relative">
                        <span className="inline-flex items-center gap-1 rounded bg-indigo-50 px-2 py-1 text-indigo-700">
                            <button type="button" onClick={() => setOpenPill((p) => (p === key ? null : key))}>
                                {field.label}{selected.length ? `: ${selected.map((v) => opts.find((o) => o.value === v)?.label ?? v).join(', ')}` : ''}
                            </button>
                            <button type="button" aria-label={`Remove ${field.label} filter`} onClick={() => { setFilter(key, null); setOpenPill(null); }}>×</button>
                        </span>
                        {openPill === key && (
                            <div className="absolute z-10 mt-1 max-h-56 w-48 overflow-auto rounded border bg-white p-2 shadow">
                                {opts.map((o) => (
                                    <label key={o.value} className="flex items-center gap-2 py-0.5">
                                        <input type="checkbox" aria-label={o.label} checked={selected.includes(o.value)} onChange={() => toggleValue(key, o.value)} />
                                        {o.label}
                                    </label>
                                ))}
                                {opts.length === 0 && <p className="text-gray-400">No options</p>}
                            </div>
                        )}
                    </div>
                );
            })}

            {presetActive.map((key) => (
                <span key={key} className="inline-flex items-center gap-1 rounded bg-gray-100 px-2 py-1 text-gray-700">
                    {PRESET_PILLS[key]((filters as Record<string, string>)[key])}
                    <button type="button" aria-label={`Remove ${key === 'assignee_id' ? 'Assigned to me' : key === 'cycle_id' ? 'Active cycle' : key} filter`} onClick={() => setFilter(key, null)}>×</button>
                </span>
            ))}

            <label className="ml-auto flex items-center gap-1 text-gray-500">
                Sort
                <select aria-label="Sort issues" value={filters.sort ?? ''} onChange={(e) => setFilter('sort', e.target.value || null)} className="rounded border px-1 py-0.5">
                    <option value="">Default</option>
                    {SORT_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
            </label>
            {canDevelop && (
                <button type="button" onClick={saveView} disabled={createView.isPending} className="rounded bg-indigo-600 px-2 py-1 text-white disabled:opacity-50">Save view</button>
            )}
            {error && <span className="text-red-600">{error}</span>}
        </div>
    );
}

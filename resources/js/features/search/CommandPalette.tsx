import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSearch } from './hooks';
import { filterCommands } from './commands';

interface Row {
    key: string;
    label: string;
    onActivate: () => void;
    hint?: string;
}

export default function CommandPalette() {
    const [open, setOpen] = useState(false);
    const [q, setQ] = useState('');
    const [debounced, setDebounced] = useState('');
    const [active, setActive] = useState(0);
    const navigate = useNavigate();
    const inputRef = useRef<HTMLInputElement>(null);

    // Global Cmd/Ctrl+K toggle.
    useEffect(() => {
        function onKey(e: KeyboardEvent) {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                setOpen((o) => !o);
            }
        }
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    // Debounce the query (200ms).
    useEffect(() => {
        const t = setTimeout(() => setDebounced(q), 200);
        return () => clearTimeout(t);
    }, [q]);

    // Focus the input when opened; reset when closed.
    useEffect(() => {
        if (open) {
            inputRef.current?.focus();
        } else {
            setQ('');
            setDebounced('');
            setActive(0);
        }
    }, [open]);

    const search = useSearch(debounced);

    function go(to: string) {
        setOpen(false);
        navigate(to);
    }

    const rows: Row[] = useMemo(() => {
        const out: Row[] = [];
        for (const c of filterCommands(q)) {
            out.push({ key: `cmd:${c.id}`, label: c.label, hint: 'Action', onActivate: () => { setOpen(false); c.run(navigate); } });
        }
        const data = search.data;
        for (const i of data?.issues ?? []) {
            out.push({ key: `issue:${i.id}`, label: i.title, hint: 'Issue', onActivate: () => go(`/issues/${i.id}`) });
        }
        for (const p of data?.projects ?? []) {
            out.push({ key: `project:${p.id}`, label: p.name, hint: 'Project', onActivate: () => go(`/projects/${p.id}`) });
        }
        for (const t of data?.teams ?? []) {
            out.push({ key: `team:${t.id}`, label: t.name, hint: 'Team', onActivate: () => go(`/teams/${t.id}`) });
        }
        if (q.trim() !== '') {
            out.push({ key: 'see-all', label: `See all results for "${q.trim()}"`, hint: '', onActivate: () => go(`/search?q=${encodeURIComponent(q.trim())}`) });
        }
        return out;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [q, search.data]);

    useEffect(() => setActive(0), [rows.length]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 pt-24" onClick={() => setOpen(false)}>
            <div role="dialog" aria-modal="true" aria-label="Command palette" className="w-full max-w-xl rounded-lg bg-panel shadow-xl" onClick={(e) => e.stopPropagation()}>
                <input
                    ref={inputRef}
                    type="text"
                    aria-label="Search"
                    placeholder="Search issues, jump to a page, or run a command…"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, rows.length - 1)); }
                        else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
                        else if (e.key === 'Enter') { e.preventDefault(); rows[active]?.onActivate(); }
                        else if (e.key === 'Escape') { setOpen(false); }
                    }}
                    className="w-full rounded-t-lg border-b border-border bg-panel px-4 py-3 text-fg outline-none"
                />
                <ul className="max-h-80 overflow-auto py-1">
                    {rows.map((r, idx) => (
                        <li key={r.key}>
                            <button
                                type="button"
                                onMouseEnter={() => setActive(idx)}
                                onClick={r.onActivate}
                                className={`flex w-full items-center justify-between px-4 py-2 text-left text-sm ${idx === active ? 'bg-hover' : ''}`}
                            >
                                <span>{r.label}</span>
                                {r.hint && <span className="text-xs text-fg3">{r.hint}</span>}
                            </button>
                        </li>
                    ))}
                    {rows.length === 0 && <li className="px-4 py-3 text-sm text-fg3">No results.</li>}
                </ul>
            </div>
        </div>
    );
}

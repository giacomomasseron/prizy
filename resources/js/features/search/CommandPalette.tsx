import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSearch } from './hooks';
import { filterCommands } from './commands';
import { StatusIcon } from '../../components/ui/StatusIcon';
import { Kbd } from '../../components/ui/Kbd';

interface Row {
    key: string;
    label: string;
    leading?: React.ReactNode;
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
            out.push({
                key: `issue:${i.id}`,
                label: i.title,
                leading: (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                        <StatusIcon status={i.status} size={12} />
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--fg3)', width: 48 }}>
                            {i.identifier ?? i.id.slice(0, 6).toUpperCase()}
                        </span>
                    </span>
                ),
                hint: 'Issue',
                onActivate: () => go(`/issues/${i.id}`),
            });
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

    // v2 (prizy-v2.html palette): the Modal primitive's frame — ink border, offset shadow, token backdrop.
    return (
        <div
            onClick={() => setOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'var(--backdrop)', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: '12vh', animation: 'prizy-fade .12s ease' }}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-label="Command palette"
                onClick={(e) => e.stopPropagation()}
                style={{ width: 580, maxWidth: '92vw', background: 'var(--panel)', border: 'var(--line) solid var(--fg)', borderRadius: 'var(--radius-modal)', boxShadow: '5px 5px 0 var(--fg)', overflow: 'hidden', animation: 'prizy-pop .16s cubic-bezier(.2,.8,.2,1)' }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
                    <span aria-hidden="true" style={{ fontSize: 16, color: 'var(--fg3)' }}>⌕</span>
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
                        style={{ flex: 1, minWidth: 0, border: 'none', background: 'none', outline: 'none', color: 'var(--fg)', fontSize: 15, fontFamily: 'inherit' }}
                    />
                    <span style={{ color: 'var(--fg3)', flexShrink: 0 }}><Kbd>esc</Kbd></span>
                </div>
                <ul style={{ listStyle: 'none', margin: 0, maxHeight: 340, overflowY: 'auto', padding: 6 }}>
                    {rows.map((r, idx) => (
                        <li key={r.key}>
                            {/* The highlight follows the keyboard selection; onMouseEnter keeps the two in sync. */}
                            <button
                                type="button"
                                onMouseEnter={() => setActive(idx)}
                                onClick={r.onActivate}
                                className={idx === active ? 'bg-hover' : 'bg-transparent'}
                                style={{ display: 'flex', alignItems: 'center', gap: 11, width: '100%', padding: '9px 11px', border: 'none', borderRadius: 'var(--radius-row)', textAlign: 'left', color: 'var(--fg)', fontSize: 13.5, fontFamily: 'inherit', cursor: 'pointer' }}
                            >
                                {r.leading && r.leading}
                                <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.label}</span>
                                {r.hint && <span style={{ fontSize: 11.5, color: 'var(--fg3)', flexShrink: 0 }}>{r.hint}</span>}
                            </button>
                        </li>
                    ))}
                    {rows.length === 0 && <li style={{ padding: 22, textAlign: 'center', color: 'var(--fg3)', fontSize: 13 }}>No results.</li>}
                </ul>
                <div style={{ borderTop: '1px solid var(--border)' }}>
                    <button
                        type="button"
                        onClick={() => go(q.trim() ? `/search?q=${encodeURIComponent(q.trim())}` : '/search')}
                        className="bg-transparent text-fg2 hover:bg-hover hover:text-fg"
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '11px 16px', border: 'none', fontSize: 13, fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left' }}
                    >
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>⌕ Advanced search</span>
                        <span style={{ fontSize: 11.5, color: 'var(--fg3)' }}>filters, sort &amp; save</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

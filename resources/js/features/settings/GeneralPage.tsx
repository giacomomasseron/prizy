import { useState, type CSSProperties, type ReactNode } from 'react';
import { ApiError } from '../../lib/apiClient';
import { downloadBlob } from '../../lib/downloadBlob';
import { useMe } from '../../auth/useAuth';
import { Button } from '../../components/ui/Button';
import { QueryState } from '../../components/ui/QueryState';
import { DeleteWorkspaceCard } from './DeleteWorkspaceCard';
import { pageLead, pageTitle } from './settingsStyles';
import type { DigestFrequency } from './hooks';
import { useUpdateModules, useUpdateNotificationPreferences, useWorkspace, type ModuleSwitches } from './hooks';

// The Settings v2 design's General page: one card per setting, each a row of icon tile, title and note, and control.
const frame: CSSProperties = { maxWidth: 760, width: '100%', margin: '0 auto', padding: '36px 36px 72px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 18 };
const card: CSSProperties = { border: 'var(--line) solid var(--border)', background: 'var(--panel)', borderRadius: 22, padding: '22px 24px' };
const row: CSSProperties = { display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' };
const tile: CSSProperties = { width: 42, height: 42, flexShrink: 0, borderRadius: 14, background: 'var(--bg2)', border: 'var(--line) solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 };
const cardTitle: CSSProperties = { margin: 0, fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 800, letterSpacing: '-.02em', color: 'var(--fg)' };
const cardNote: CSSProperties = { margin: '2px 0 0', fontSize: 14, color: 'var(--fg2)' };
const errorText: CSSProperties = { margin: '10px 0 0', fontSize: 13, color: 'var(--red-ink)' };
const moduleName: CSSProperties = { margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--fg)' };
const digestTrack: CSSProperties = { display: 'flex', gap: 4, padding: 4, borderRadius: 'var(--radius-pill)', background: 'var(--bg2)', border: 'var(--line) solid var(--border)' };
const FOCUS_CLASSES = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg';

const DIGEST_OPTIONS: [DigestFrequency, string][] = [['off', 'Off'], ['daily', 'Daily'], ['weekly', 'Weekly']];
// The digest is each member's own; the scheduler sends it at 08:00 UTC, Mondays for the weekly one.
const DIGEST_NOTES: Record<DigestFrequency, string> = {
    off: 'Email digest is off — you only get direct notifications.',
    daily: 'A summary of activity lands in your inbox every day at 8:00 UTC.',
    weekly: 'A summary of the week arrives in your inbox every Monday at 8:00 UTC.',
};

type ExportState = { step: 'idle' } | { step: 'working' } | { step: 'ready'; filename: string; blob: Blob };

function SettingCard({ icon, title, note, control, children }: { icon: string; title: string; note: ReactNode; control?: ReactNode; children?: ReactNode }) {
    return (
        <section style={card}>
            <div style={row}>
                <span aria-hidden="true" style={tile}>{icon}</span>
                <div style={{ flex: 1, minWidth: 220 }}>
                    <h2 style={cardTitle}>{title}</h2>
                    <p style={cardNote}>{note}</p>
                </div>
                {control}
            </div>
            {children}
        </section>
    );
}

/**
 * One module in the Modules card: its on/off switch, and what switching it off closes. `locked` keeps the last module
 * that is on from being switched off — the server refuses it too.
 */
function ModuleSwitch({ name, what, on, busy, locked, onToggle, children }: {
    name: string; what: string; on: boolean; busy: boolean; locked: boolean; onToggle: () => void; children: ReactNode;
}) {
    return (
        <div style={{ marginTop: 18, paddingTop: 18, borderTop: 'var(--line) solid var(--border)' }}>
            <div style={row}>
                <div style={{ flex: 1, minWidth: 220 }}>
                    <h3 style={moduleName}>{name}</h3>
                    <p style={cardNote}>{what}</p>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, borderRadius: 'var(--radius-pill)', padding: '3px 11px', color: on ? 'var(--green-ink)' : 'var(--fg3)', background: on ? 'color-mix(in srgb, var(--green) 13%, transparent)' : 'var(--bg2)' }}>
                    {on ? 'On' : 'Off'}
                </span>
                <button
                    type="button"
                    role="switch"
                    aria-checked={on}
                    aria-label={`${name} module`}
                    disabled={busy || locked}
                    title={locked ? 'Keep at least one module on' : undefined}
                    onClick={onToggle}
                    className={FOCUS_CLASSES}
                    style={{ width: 48, height: 28, flexShrink: 0, borderRadius: 'var(--radius-pill)', border: 'var(--line) solid var(--fg)', background: on ? 'var(--accent)' : 'var(--bg2)', position: 'relative', cursor: busy ? 'progress' : locked ? 'not-allowed' : 'pointer', opacity: locked ? 0.55 : 1, padding: 0, transition: 'background .18s' }}
                >
                    <span aria-hidden="true" style={{ position: 'absolute', top: 2, left: on ? 22 : 2, width: 21, height: 21, borderRadius: '50%', background: '#fff', border: 'var(--line) solid var(--fg)', boxSizing: 'border-box', transition: 'left .18s' }} />
                </button>
            </div>
            <p
                style={{
                    margin: '14px 0 0', padding: '14px 16px', borderRadius: 16, fontSize: 14, lineHeight: 1.6, textWrap: 'pretty', color: 'var(--fg2)',
                    background: on ? 'var(--bg2)' : 'light-dark(#fbecc9, color-mix(in srgb, var(--amber) 16%, var(--panel)))',
                    border: `var(--line) solid ${on ? 'var(--border)' : 'color-mix(in srgb, var(--amber) 40%, transparent)'}`,
                }}
            >
                {children}
            </p>
        </div>
    );
}

export default function GeneralPage() {
    const me = useMe();
    const workspace = useWorkspace();
    const update = useUpdateNotificationPreferences();
    const updateModules = useUpdateModules();
    const [moduleError, setModuleError] = useState('');
    const [error, setError] = useState('');
    // The last choice made here, shown at once and kept while `me` catches up; dropped again if saving fails.
    const [digestChoice, setDigestChoice] = useState<DigestFrequency | null>(null);
    const [exportState, setExportState] = useState<ExportState>({ step: 'idle' });
    const [exportError, setExportError] = useState('');

    const digest = digestChoice ?? me.data?.email_digest_frequency ?? 'off';
    const helpdeskOn = me.data?.workspace?.helpdesk_enabled ?? false;
    // Absent counts as on, as everywhere (trackerEnabled).
    const trackerOn = me.data?.workspace?.tracker_enabled !== false;
    const level = me.data?.admin_level;

    async function change(value: DigestFrequency) {
        if (value === digest) return;
        setError('');
        setDigestChoice(value);
        try {
            await update.mutateAsync(value);
        } catch (err) {
            setDigestChoice(null);
            setError(err instanceof ApiError ? err.detail : 'Failed to save.');
        }
    }

    async function switchModule(change: ModuleSwitches) {
        setModuleError('');
        try {
            await updateModules.mutateAsync(change);
        } catch (err) {
            setModuleError(err instanceof ApiError ? err.detail : 'Failed to save.');
        }
    }

    // Two steps, as drawn: the first click prepares the archive, the second saves it.
    async function runExport() {
        if (exportState.step === 'working') return;
        if (exportState.step === 'ready') {
            downloadBlob(exportState.filename, exportState.blob);
            setExportState({ step: 'idle' });
            return;
        }
        setExportState({ step: 'working' });
        setExportError('');
        try {
            const res = await fetch('/v1/workspace-export', {
                credentials: 'same-origin',
                headers: { Accept: 'application/json' },
            });
            if (!res.ok) throw new Error(String(res.status));
            const blob = await res.blob();
            const disposition = res.headers.get('Content-Disposition') ?? '';
            const match = /filename=([^;]+)/.exec(disposition);
            const filename = match ? match[1].trim().replace(/^"|"$/g, '') : 'prizy-export.zip';
            setExportState({ step: 'ready', filename, blob });
        } catch {
            setExportState({ step: 'idle' });
            setExportError('Export failed. Try again.');
        }
    }

    if (me.isLoading) return <p className="p-6">Loading…</p>;

    const ready = exportState.step === 'ready';
    const working = exportState.step === 'working';

    return (
        <div style={frame}>
            <div style={{ marginBottom: 8 }}>
                <h1 style={pageTitle}><span className="hl">General</span></h1>
                <p style={{ ...pageLead, maxWidth: 560 }}>
                    Workspace-wide preferences. Changes apply to everyone in{' '}
                    {workspace.data ? <b style={{ color: 'var(--fg)', fontWeight: 700 }}>{workspace.data.name}</b> : 'this workspace'}
                    {trackerOn ? ', except your email digest, which is just yours.' : '.'}
                </p>
            </div>
            <QueryState query={me} what="workspace settings">
                {/* The digest gathers notifications, which are all about the tracker: none without it. */}
                {trackerOn && <SettingCard
                    icon="✉"
                    title="Notifications"
                    note={DIGEST_NOTES[digest]}
                    control={
                        <div role="group" aria-label="Email digest frequency" style={digestTrack}>
                            {DIGEST_OPTIONS.map(([value, label]) => (
                                <button
                                    key={value}
                                    type="button"
                                    aria-pressed={digest === value}
                                    onClick={() => change(value)}
                                    className={FOCUS_CLASSES}
                                    style={{ border: 'none', padding: '7px 16px', borderRadius: 'var(--radius-pill)', fontSize: 14, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', transition: 'background .15s, box-shadow .15s', background: digest === value ? 'var(--fg)' : 'transparent', color: digest === value ? 'var(--bg)' : 'var(--fg2)' }}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    }
                >
                    {error && <p style={errorText}>{error}</p>}
                </SettingCard>}
                {(level === 'owner' || level === 'admin') && (
                    <SettingCard icon="⇄" title="Modules" note="What this workspace runs. At least one stays on.">
                        <ModuleSwitch
                            name="Issue tracker"
                            what="Issues, projects, cycles, the roadmap and releases"
                            on={trackerOn}
                            busy={updateModules.isPending}
                            locked={trackerOn && !helpdeskOn}
                            onToggle={() => switchModule({ tracker_enabled: !trackerOn })}
                        >
                            Switching this off closes issues, projects, cycles, the roadmap, releases and analytics for everyone in
                            this workspace, with notifications, search and the Slack and GitHub integrations. Nothing is deleted —
                            switch it back on and every issue, project and cycle is where you left it.
                        </ModuleSwitch>
                        <ModuleSwitch
                            name="Support"
                            what="Help desk, knowledge base and customer portal"
                            on={helpdeskOn}
                            busy={updateModules.isPending}
                            locked={helpdeskOn && !trackerOn}
                            onToggle={() => switchModule({ helpdesk_enabled: !helpdeskOn })}
                        >
                            Switching this off closes the help centre, the customer portal, the agent desk and knowledge-base authoring for
                            everyone in this workspace. Nothing is deleted — switch it back on and every ticket, contact and article is where
                            you left it.
                        </ModuleSwitch>
                        {moduleError && <p style={errorText}>{moduleError}</p>}
                    </SettingCard>
                )}
                {level === 'owner' && (
                    <SettingCard
                        icon="↓"
                        title="Data export"
                        note={ready ? 'Your archive is ready — issues, tickets, articles and members as JSON.' : 'Everything your team has put into Prizy — yours to take, any time.'}
                        control={
                            <Button
                                variant={ready ? 'primary' : 'secondary'}
                                onClick={runExport}
                                aria-disabled={working}
                                style={{ padding: '9px 18px', flexShrink: 0, ...(working ? { opacity: 0.6, cursor: 'progress' } : {}) }}
                            >
                                {working ? 'Preparing…' : ready ? `Download ${exportState.filename}` : 'Download export'}
                            </Button>
                        }
                    >
                        {exportError && <p style={errorText}>{exportError}</p>}
                    </SettingCard>
                )}
                {level === 'owner' && <DeleteWorkspaceCard />}
            </QueryState>
        </div>
    );
}

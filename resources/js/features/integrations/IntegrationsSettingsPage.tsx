import { useState, type CSSProperties } from 'react';
import { ApiError } from '../../lib/apiClient';
import { INTEGRATIONS, type IntegrationDef } from './catalog';
import { slackMeta, githubMeta } from './meta';
import { SlackConfigDrawer } from './SlackConfigDrawer';
import { GithubConfigDrawer } from './GithubConfigDrawer';
import { useSlackIntegration, useGithubIntegration, useDisconnectSlack, useDisconnectGithub } from './hooks';
import { useConfirm } from '../../components/ui/ConfirmProvider';

const glyphStyle = (color: string): CSSProperties => ({ width: 40, height: 40, borderRadius: 10, background: color, color: color === '#e6e6e6' ? '#111' : '#fff', fontSize: 14, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, letterSpacing: '.02em' });
const cardBase: CSSProperties = { border: '1px solid var(--border)', borderRadius: 13, padding: 16 };
const sectionLabel: CSSProperties = { fontSize: 12.5, fontWeight: 600, color: 'var(--fg)' };
const grid: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12 };

export default function IntegrationsSettingsPage() {
    const slack = useSlackIntegration();
    const github = useGithubIntegration();
    const disconnectSlack = useDisconnectSlack();
    const disconnectGithub = useDisconnectGithub();
    const confirm = useConfirm();
    const [openDrawer, setOpenDrawer] = useState<'slack' | 'github' | null>(null);
    const [error, setError] = useState('');

    if (slack.isLoading || github.isLoading) {
        return (
            <div style={{ maxWidth: 1000, margin: '0 auto', padding: '28px 30px 80px', width: '100%' }}>
                <p style={{ color: 'var(--fg3)', fontSize: 13 }}>Loading…</p>
            </div>
        );
    }

    if (slack.isError || github.isError) {
        return (
            <div style={{ maxWidth: 1000, margin: '0 auto', padding: '28px 30px 80px', width: '100%' }}>
                <p role="alert" style={{ color: 'var(--red)', fontSize: 13 }}>Couldn't load integration status. Please retry.</p>
            </div>
        );
    }

    const connectedIds = new Set<string>();
    if (slack.data?.configured && slack.data?.is_active) connectedIds.add('slack');
    if (github.data?.configured && github.data?.is_active) connectedIds.add('github');

    function metaFor(id: string): string {
        if (id === 'slack') return slackMeta(slack.data?.events ?? []);
        if (id === 'github') return githubMeta(!!github.data?.move_to_done_on_merge);
        return '';
    }
    async function disconnect(id: 'slack' | 'github') {
        setError('');
        const name = id === 'slack' ? 'Slack' : 'GitHub';
        if (!(await confirm({ title: `Disconnect ${name}?`, message: 'This removes the stored configuration.', danger: true }))) return;
        const m = id === 'slack' ? disconnectSlack : disconnectGithub;
        m.mutate(undefined, { onError: (e: unknown) => setError(e instanceof ApiError ? e.detail : 'Failed to disconnect.') });
    }

    const real = INTEGRATIONS.filter((d) => d.real);
    const connected = real.filter((d) => connectedIds.has(d.id));
    const availableReal = real.filter((d) => !connectedIds.has(d.id));
    const comingSoon = INTEGRATIONS.filter((d) => !d.real);

    const iconEl = (d: IntegrationDef) => <span style={glyphStyle(d.color)}>{d.glyph}</span>;

    return (
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '28px 30px 80px', width: '100%' }}>
            <h1 style={{ margin: 0, fontSize: 21, fontWeight: 600, letterSpacing: '-.02em' }}>Integrations</h1>
            <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--fg2)', maxWidth: 600 }}>Connect Prizy to the tools your team already uses. Connected integrations sync across both the Issue Tracker and Support modules.</p>

            {error && <p role="alert" style={{ margin: '12px 0 0', fontSize: 13, color: 'var(--red)' }}>{error}</p>}

            {connected.length > 0 && (
                <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '22px 0 12px' }}>
                        <span style={sectionLabel}>Connected</span>
                        <span style={{ fontSize: 12, color: 'var(--fg3)', fontFamily: 'var(--font-mono)' }}>{connected.length}</span>
                    </div>
                    <div style={grid}>
                        {connected.map((d) => (
                            <div key={d.id} style={{ ...cardBase, background: 'var(--panel)' }} data-testid={`card-${d.id}`}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                                    {iconEl(d)}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <span style={{ fontSize: 13.5, fontWeight: 600 }}>{d.name}</span>
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10.5, fontWeight: 600, color: 'var(--green)', background: 'rgba(75,171,102,.14)', borderRadius: 20, padding: '1px 8px' }}>
                                                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)' }} />Connected
                                            </span>
                                        </div>
                                        <div style={{ fontSize: 12, color: 'var(--fg2)', marginTop: 3, lineHeight: 1.5 }}>{d.description}</div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14 }}>
                                    <span style={{ fontSize: 11.5, color: 'var(--fg3)' }}>{metaFor(d.id)}</span>
                                    <button type="button" data-testid={`manage-${d.id}`} onClick={() => setOpenDrawer(d.id as 'slack' | 'github')}
                                        style={{ marginLeft: 'auto', border: '1px solid var(--border)', background: 'transparent', color: 'var(--fg2)', padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>Manage</button>
                                    <button type="button" data-testid={`disconnect-${d.id}`} onClick={() => disconnect(d.id as 'slack' | 'github')}
                                        style={{ border: '1px solid var(--border)', background: 'transparent', color: 'var(--fg2)', padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>Disconnect</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '26px 0 12px' }}>
                <span style={sectionLabel}>Available</span>
            </div>
            <div style={grid}>
                {availableReal.map((d) => (
                    <div key={d.id} style={cardBase} data-testid={`card-${d.id}`}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                            {iconEl(d)}
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ fontSize: 13.5, fontWeight: 600 }}>{d.name}</span>
                                    <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.03em', textTransform: 'uppercase', color: 'var(--fg3)', border: '1px solid var(--border2)', borderRadius: 5, padding: '1px 6px' }}>{d.category}</span>
                                </div>
                                <div style={{ fontSize: 12, color: 'var(--fg2)', marginTop: 3, lineHeight: 1.5 }}>{d.description}</div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', marginTop: 14 }}>
                            <button type="button" data-testid={`connect-${d.id}`} onClick={() => setOpenDrawer(d.id as 'slack' | 'github')}
                                style={{ marginLeft: 'auto', border: 'none', background: 'var(--accent)', color: '#fff', padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Connect</button>
                        </div>
                    </div>
                ))}
                {comingSoon.map((d) => (
                    <div key={d.id} style={{ ...cardBase, opacity: 0.55 }} data-testid={`card-${d.id}`}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                            {iconEl(d)}
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ fontSize: 13.5, fontWeight: 600 }}>{d.name}</span>
                                    <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.03em', textTransform: 'uppercase', color: 'var(--fg3)', border: '1px solid var(--border2)', borderRadius: 5, padding: '1px 6px' }}>{d.category}</span>
                                </div>
                                <div style={{ fontSize: 12, color: 'var(--fg2)', marginTop: 3, lineHeight: 1.5 }}>{d.description}</div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', marginTop: 14 }}>
                            <span data-testid={`soon-${d.id}`} style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', color: 'var(--fg3)', border: '1px solid var(--border2)', borderRadius: 6, padding: '5px 10px' }}>Soon</span>
                        </div>
                    </div>
                ))}
            </div>

            <SlackConfigDrawer open={openDrawer === 'slack'} onClose={() => setOpenDrawer(null)} />
            <GithubConfigDrawer open={openDrawer === 'github'} onClose={() => setOpenDrawer(null)} />
        </div>
    );
}

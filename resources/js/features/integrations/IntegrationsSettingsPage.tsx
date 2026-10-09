import { useState, type CSSProperties, type ReactNode } from 'react';
import { ApiError } from '../../lib/apiClient';
import { Button } from '../../components/ui/Button';
import { tagBadge } from '../../components/sidebarStyles';
import { INTEGRATIONS, type IntegrationDef } from './catalog';
import { slackMeta, githubMeta } from './meta';
import { SlackConfigDrawer } from './SlackConfigDrawer';
import { GithubConfigDrawer } from './GithubConfigDrawer';
import { useSlackIntegration, useGithubIntegration, useDisconnectSlack, useDisconnectGithub } from './hooks';
import { useConfirm } from '../../components/ui/ConfirmProvider';
import { DANGER_PILL_CLASSES, cardFrame, pageFrame, pageLead, pageTitle, pillBtn } from '../settings/settingsStyles';

const glyphStyle = (color: string): CSSProperties => ({ width: 40, height: 40, borderRadius: 10, background: color, color: color === '#e6e6e6' ? '#111' : '#fff', fontSize: 14, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, letterSpacing: '.02em' });
const cardBase: CSSProperties = { ...cardFrame, padding: 16 };
const sectionLabel: CSSProperties = { fontSize: 12.5, fontWeight: 600, color: 'var(--fg)' };
const grid: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 };
const connectedBadge: CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10.5, fontWeight: 600, color: 'var(--green-ink)', background: 'var(--sup2)', borderRadius: 20, padding: '1px 8px' };

function CardHead({ d, tag }: { d: IntegrationDef; tag: ReactNode }) {
    return (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <span style={glyphStyle(d.color)}>{d.glyph}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13.5, fontWeight: 600 }}>{d.name}</span>
                    {tag}
                </div>
                <div style={{ fontSize: 12, color: 'var(--fg2)', marginTop: 3, lineHeight: 1.5 }}>{d.description}</div>
            </div>
        </div>
    );
}

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
            <div style={pageFrame}>
                <p style={{ color: 'var(--fg3)', fontSize: 13 }}>Loading…</p>
            </div>
        );
    }

    if (slack.isError || github.isError) {
        return (
            <div style={pageFrame}>
                <p role="alert" style={{ color: 'var(--red-ink)', fontSize: 13 }}>Couldn't load integration status. Please retry.</p>
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

    return (
        <div style={pageFrame}>
            <h1 style={pageTitle}><span className="hl">Integrations</span></h1>
            <p style={pageLead}>Connect Prizy to the tools your team already uses. Connected integrations sync across both the Issue Tracker and Support modules.</p>

            {error && <p role="alert" style={{ margin: '12px 0 0', fontSize: 13, color: 'var(--red-ink)' }}>{error}</p>}

            {connected.length > 0 && (
                <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '22px 0 12px' }}>
                        <span style={sectionLabel}>Connected</span>
                        <span style={{ fontSize: 12, color: 'var(--fg3)', fontFamily: 'var(--font-mono)' }}>{connected.length}</span>
                    </div>
                    <div style={grid}>
                        {connected.map((d) => (
                            <div key={d.id} style={{ ...cardBase, background: 'var(--panel)' }} data-testid={`card-${d.id}`}>
                                <CardHead
                                    d={d}
                                    tag={(
                                        <span style={connectedBadge}>
                                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)' }} />Connected
                                        </span>
                                    )}
                                />
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14 }}>
                                    <span style={{ fontSize: 11.5, color: 'var(--fg3)' }}>{metaFor(d.id)}</span>
                                    <Button variant="secondary" size="sm" data-testid={`manage-${d.id}`} onClick={() => setOpenDrawer(d.id as 'slack' | 'github')} style={{ marginLeft: 'auto' }}>
                                        Manage
                                    </Button>
                                    <button type="button" data-testid={`disconnect-${d.id}`} onClick={() => disconnect(d.id as 'slack' | 'github')}
                                        className={DANGER_PILL_CLASSES} style={pillBtn}>Disconnect</button>
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
                        <CardHead d={d} tag={<span style={tagBadge}>{d.category}</span>} />
                        <div style={{ display: 'flex', marginTop: 14 }}>
                            <Button size="sm" data-testid={`connect-${d.id}`} onClick={() => setOpenDrawer(d.id as 'slack' | 'github')} style={{ marginLeft: 'auto' }}>
                                Connect
                            </Button>
                        </div>
                    </div>
                ))}
                {comingSoon.map((d) => (
                    <div key={d.id} style={{ ...cardBase, opacity: 0.55 }} data-testid={`card-${d.id}`}>
                        <CardHead d={d} tag={<span style={tagBadge}>{d.category}</span>} />
                        <div style={{ display: 'flex', marginTop: 14 }}>
                            <span data-testid={`soon-${d.id}`} style={{ ...tagBadge, marginLeft: 'auto', padding: '3px 10px' }}>Soon</span>
                        </div>
                    </div>
                ))}
            </div>

            <SlackConfigDrawer open={openDrawer === 'slack'} onClose={() => setOpenDrawer(null)} />
            <GithubConfigDrawer open={openDrawer === 'github'} onClose={() => setOpenDrawer(null)} />
        </div>
    );
}

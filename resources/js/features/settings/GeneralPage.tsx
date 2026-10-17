import { useState, type CSSProperties } from 'react';
import { ApiError } from '../../lib/apiClient';
import { downloadBlob } from '../../lib/downloadBlob';
import { useMe } from '../../auth/useAuth';
import { Button } from '../../components/ui/Button';
import { QueryState } from '../../components/ui/QueryState';
import { FIELD_CLASSES } from '../../components/ui/Input';
import { Switch } from '../../components/ui/Switch';
import { sectionTitle } from '../issues/issueStyles';
import { DeleteWorkspaceCard } from './DeleteWorkspaceCard';
import { pageFrame, pageTitle, selectStyle, titleRow } from './settingsStyles';
import type { DigestFrequency } from './hooks';
import { useUpdateHelpdeskEnabled, useUpdateNotificationPreferences } from './hooks';

const card: CSSProperties = { border: 'var(--line) solid var(--border)', borderRadius: 'var(--radius-card)', background: 'var(--panel)', padding: '20px 22px' };
const cardHeading: CSSProperties = { ...sectionTitle(17), margin: '0 0 12px' };
const bodyText: CSSProperties = { fontSize: 13.5, lineHeight: 1.6, color: 'var(--fg2)' };
const errorText: CSSProperties = { margin: '10px 0 0', fontSize: 13, color: 'var(--red-ink)' };

export default function GeneralPage() {
    const me = useMe();
    const update = useUpdateNotificationPreferences();
    const updateHelpdesk = useUpdateHelpdeskEnabled();
    const [moduleError, setModuleError] = useState('');
    const [error, setError] = useState('');
    const [saved, setSaved] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [exportError, setExportError] = useState('');

    async function change(value: DigestFrequency) {
        setError('');
        setSaved(false);
        try {
            await update.mutateAsync(value);
            setSaved(true);
        } catch (err) {
            setError(err instanceof ApiError ? err.detail : 'Failed to save.');
        }
    }

    async function switchHelpdesk(enabled: boolean) {
        setModuleError('');
        try {
            await updateHelpdesk.mutateAsync(enabled);
        } catch (err) {
            setModuleError(err instanceof ApiError ? err.detail : 'Failed to save.');
        }
    }

    async function downloadExport() {
        setExporting(true);
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
            downloadBlob(filename, blob);
        } catch {
            setExportError('Export failed. Try again.');
        } finally {
            setExporting(false);
        }
    }

    if (me.isLoading) return <p className="p-6">Loading…</p>;

    return (
        <div style={{ ...pageFrame, maxWidth: 720 }}>
            <div style={{ ...titleRow, marginBottom: 22 }}>
                <h1 style={pageTitle}><span className="hl">General</span></h1>
            </div>
            <QueryState query={me} what="workspace settings">
                <section style={card}>
                    <h2 style={cardHeading}>Notifications</h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, fontWeight: 600 }}>
                            Email digest
                            <select
                                aria-label="Email digest frequency"
                                value={me.data?.email_digest_frequency ?? 'off'}
                                onChange={(e) => change(e.target.value as DigestFrequency)}
                                className={FIELD_CLASSES}
                                style={selectStyle}
                            >
                                <option value="off">Off</option>
                                <option value="daily">Daily</option>
                                <option value="weekly">Weekly</option>
                            </select>
                        </label>
                        {saved && <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--green-ink)' }}>Saved</span>}
                    </div>
                    {error && <p style={errorText}>{error}</p>}
                </section>
                {(me.data?.admin_level === 'owner' || me.data?.admin_level === 'admin') && (
                    <section style={{ ...card, marginTop: 16 }}>
                        <h2 style={cardHeading}>Modules</h2>
                        <Switch
                            checked={me.data?.workspace?.helpdesk_enabled ?? false}
                            disabled={updateHelpdesk.isPending}
                            onChange={switchHelpdesk}
                            label="Support — help desk, knowledge base and customer portal"
                        />
                        <p style={{ ...bodyText, margin: '10px 0 0' }}>
                            Switching this off closes the help centre, the customer portal, the agent desk and
                            knowledge-base authoring for everyone in this workspace. Nothing is deleted — switch it
                            back on and every ticket, contact and article is where you left it.
                        </p>
                        {moduleError && <p style={errorText}>{moduleError}</p>}
                    </section>
                )}
                {me.data?.admin_level === 'owner' && (
                    <section style={{ ...card, marginTop: 16 }}>
                        <h2 style={cardHeading}>Data export</h2>
                        <p style={{ ...bodyText, margin: '0 0 14px' }}>Everything your team has put into Prizy — yours to take, any time.</p>
                        <Button variant="secondary" size="sm" onClick={downloadExport} disabled={exporting}>
                            {exporting ? 'Preparing export…' : 'Download export'}
                        </Button>
                        {exportError && <p style={errorText}>{exportError}</p>}
                    </section>
                )}
                {me.data?.admin_level === 'owner' && <DeleteWorkspaceCard />}
            </QueryState>
        </div>
    );
}

import { useEffect, useState, type CSSProperties } from 'react';
import { ApiError } from '../../lib/apiClient';
import { Drawer } from '../../components/ui/Drawer';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { checkboxStyle, fieldLabel, modalTitle } from '../settings/settingsStyles';
import { useGithubIntegration, useSaveGithubIntegration } from './hooks';
import { ink } from '../../lib/ink';

const checkRow: CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, marginTop: 12, cursor: 'pointer' };
/** Status message ("Saved", errors): the colour is a status token, so the text takes its ink partner (4.5:1). */
const msgStyle = (color: string): CSSProperties => ({ fontSize: 13, fontWeight: 600, color: ink(color) });

export function GithubConfigDrawer({ open, onClose }: { open: boolean; onClose(): void }) {
    const github = useGithubIntegration();
    const saveGithub = useSaveGithubIntegration();
    const [ghSecret, setGhSecret] = useState('');
    const [moveOnMerge, setMoveOnMerge] = useState(true);
    const [ghActive, setGhActive] = useState(true);
    const [ghMsg, setGhMsg] = useState('');
    const [ghError, setGhError] = useState('');

    useEffect(() => {
        if (github.data) { setMoveOnMerge(github.data.move_to_done_on_merge); setGhActive(github.data.is_active); }
    }, [github.data]);

    async function onSaveGithub() {
        setGhMsg(''); setGhError('');
        try { await saveGithub.mutateAsync({ ...(ghSecret ? { webhook_secret: ghSecret } : {}), move_to_done_on_merge: moveOnMerge, is_active: ghActive }); setGhMsg('Saved'); setGhSecret(''); }
        catch (err) { setGhError(err instanceof ApiError ? err.detail : 'Failed to save.'); }
    }

    return (
        <Drawer open={open} onClose={onClose} side="right" width={480}>
            <div style={{ padding: '22px 24px' }}>
                <h2 style={{ ...modalTitle, marginBottom: 18 }}>Configure GitHub</h2>
                {github.data?.configured && github.data.webhook_url && (
                    <label style={{ display: 'block', marginBottom: 14 }}>
                        <span style={fieldLabel}>Webhook URL (add this to your repo's webhook settings)</span>
                        <Input readOnly aria-label="GitHub webhook URL" value={github.data.webhook_url} style={{ color: 'var(--fg2)' }} />
                    </label>
                )}
                <label style={{ display: 'block' }}>
                    <span style={fieldLabel}>Webhook secret</span>
                    <Input aria-label="GitHub webhook secret" type="password" value={ghSecret} onChange={(e) => setGhSecret(e.target.value)}
                        placeholder={github.data?.secret_set ? 'Secret set — leave blank to keep' : 'Set the same secret as in GitHub'} />
                </label>
                <label style={checkRow}>
                    <input type="checkbox" aria-label="Move linked issue to Done on PR merge" checked={moveOnMerge} onChange={(e) => setMoveOnMerge(e.target.checked)} style={checkboxStyle} /> Move linked issue to Done on PR merge
                </label>
                <label style={{ ...checkRow, marginTop: 8 }}>
                    <input type="checkbox" aria-label="GitHub active" checked={ghActive} onChange={(e) => setGhActive(e.target.checked)} style={checkboxStyle} /> Active
                </label>
                <p style={{ marginTop: 12, fontSize: 12, color: 'var(--fg3)' }}>Disconnecting removes the stored config; reconnecting generates a new webhook URL to re-paste in GitHub.</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 20 }}>
                    <Button size="sm" onClick={onSaveGithub}>Save GitHub</Button>
                    {ghMsg && <span style={msgStyle('var(--green)')}>{ghMsg}</span>}
                    {ghError && <span style={msgStyle('var(--red)')}>{ghError}</span>}
                </div>
            </div>
        </Drawer>
    );
}

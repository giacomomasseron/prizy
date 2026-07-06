import { useEffect, useState } from 'react';
import { ApiError } from '../../lib/apiClient';
import { Drawer } from '../../components/ui/Drawer';
import { useGithubIntegration, useSaveGithubIntegration } from './hooks';

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
            <div style={{ padding: 24 }}>
                <h2 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600 }}>Configure GitHub</h2>
                {github.data?.configured && github.data.webhook_url && (
                    <label className="block text-sm">
                        Webhook URL (add this to your repo's webhook settings)
                        <input readOnly aria-label="GitHub webhook URL" value={github.data.webhook_url} className="mt-1 w-full rounded border border-border bg-bg px-2 py-1 text-fg2" />
                    </label>
                )}
                <label className="mt-3 block text-sm">
                    Webhook secret
                    <input aria-label="GitHub webhook secret" type="password" value={ghSecret} onChange={(e) => setGhSecret(e.target.value)}
                        placeholder={github.data?.secret_set ? 'Secret set — leave blank to keep' : 'Set the same secret as in GitHub'}
                        className="mt-1 w-full rounded border border-border px-2 py-1" />
                </label>
                <label className="mt-3 flex items-center gap-2 text-sm">
                    <input type="checkbox" aria-label="Move linked issue to Done on PR merge" checked={moveOnMerge} onChange={(e) => setMoveOnMerge(e.target.checked)} /> Move linked issue to Done on PR merge
                </label>
                <label className="mt-2 flex items-center gap-2 text-sm">
                    <input type="checkbox" aria-label="GitHub active" checked={ghActive} onChange={(e) => setGhActive(e.target.checked)} /> Active
                </label>
                <p style={{ marginTop: 12, fontSize: 12, color: 'var(--fg3)' }}>Disconnecting removes the stored config; reconnecting generates a new webhook URL to re-paste in GitHub.</p>
                <div className="mt-4 flex items-center gap-2">
                    <button type="button" onClick={onSaveGithub} className="rounded bg-accent px-3 py-1 text-sm text-white">Save GitHub</button>
                    {ghMsg && <span className="text-sm text-green">{ghMsg}</span>}
                    {ghError && <span className="text-sm text-red">{ghError}</span>}
                </div>
            </div>
        </Drawer>
    );
}

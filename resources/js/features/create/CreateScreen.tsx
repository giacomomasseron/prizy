import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { Button } from '../../components/ui/Button';
import type { Cycle, Project } from '../../lib/types';
import ProjectForm from './ProjectForm';
import CycleForm from './CycleForm';

type Tab = 'project' | 'cycle';
type SuccessInfo = { tab: Tab; name: string; teamId?: string } | null;

const TAB_OPTIONS = [
    { label: 'New project', value: 'project' as Tab },
    { label: 'New cycle',   value: 'cycle'   as Tab },
];

export default function CreateScreen() {
    const [params, setParams] = useSearchParams();
    const navigate = useNavigate();

    const tab: Tab = params.get('tab') === 'cycle' ? 'cycle' : 'project';
    const defaultTeamId = params.get('team') ?? '';

    const [success, setSuccess] = useState<SuccessInfo>(null);

    function handleTabChange(next: Tab) {
        setParams(
            (prev) => { prev.set('tab', next); return prev; },
            { replace: true },
        );
        setSuccess(null);
    }

    function handleProjectSuccess(p: Project) {
        setSuccess({ tab: 'project', name: p.name });
    }

    function handleCycleSuccess(c: Cycle, teamId: string) {
        setSuccess({ tab: 'cycle', name: c.name, teamId });
    }

    function handleCreateAnother() {
        setSuccess(null);
    }

    return (
        <div
            style={{
                maxWidth: 660,
                margin: '48px auto',
                padding: '0 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: 24,
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 2 }}>
                <SegmentedControl
                    options={TAB_OPTIONS}
                    value={tab}
                    onChange={handleTabChange}
                />
            </div>

            {success ? (
                <SuccessCard
                    name={success.name}
                    tab={success.tab}
                    teamId={success.teamId}
                    onCreateAnother={handleCreateAnother}
                />
            ) : tab === 'project' ? (
                <ProjectForm
                    onSuccess={handleProjectSuccess}
                    onCancel={() => navigate(-1)}
                />
            ) : (
                <CycleForm
                    defaultTeamId={defaultTeamId}
                    onSuccess={handleCycleSuccess}
                    onCancel={() => navigate(-1)}
                />
            )}
        </div>
    );
}

interface SuccessCardProps {
    name: string;
    tab: Tab;
    teamId?: string;
    onCreateAnother(): void;
}

function SuccessCard({ name, tab, teamId, onCreateAnother }: SuccessCardProps) {
    const navigate = useNavigate();
    const dest = tab === 'project' ? '/projects' : teamId ? `/teams/${teamId}` : '/teams';

    return (
        <div
            style={{
                background: 'var(--panel)',
                border: '1px solid var(--border)',
                borderRadius: 14,
                padding: '40px 32px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 16,
            }}
        >
            <div
                style={{
                    width: 52,
                    height: 52,
                    borderRadius: '50%',
                    background: 'var(--accent)',
                    color: '#fff',
                    fontSize: 26,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                }}
            >
                ✓
            </div>

            <div>
                <div
                    style={{
                        fontSize: 17,
                        fontWeight: 600,
                        color: 'var(--fg)',
                    }}
                >
                    {name} created
                </div>
                <div
                    style={{
                        fontSize: 13,
                        color: 'var(--fg2)',
                        marginTop: 6,
                    }}
                >
                    {tab === 'project'
                        ? 'Project created successfully.'
                        : 'Cycle created successfully.'}
                </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                <Button variant="secondary" size="md" onClick={onCreateAnother}>
                    Create another
                </Button>
                <Button variant="primary" size="md" onClick={() => navigate(dest)}>
                    Go to workspace
                </Button>
            </div>
        </div>
    );
}

import type { JSX } from 'react';
import { useNavigate } from 'react-router-dom';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { Kbd } from '../../components/ui/Kbd';

export interface IssuesHeaderProps {
    view: 'list' | 'board';
}

const VIEW_OPTIONS = [
    { label: 'List', value: 'list' as const },
    { label: 'Board', value: 'board' as const },
];

export function IssuesHeader({ view }: IssuesHeaderProps): JSX.Element {
    const navigate = useNavigate();

    function handleNav(value: 'list' | 'board') {
        if (value === 'list') navigate('/', { replace: true });
        else navigate('/board', { replace: true });
    }

    function handleSearch() {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }));
    }

    return (
        <div
            style={{
                height: 49,
                borderBottom: '1px solid var(--border)',
                padding: '0 16px 0 22px',
                gap: 12,
                display: 'flex',
                alignItems: 'center',
                flexShrink: 0,
            }}
        >
            <div
                style={{
                    fontWeight: 600,
                    fontSize: 14,
                    letterSpacing: '-.01em',
                    color: 'var(--fg)',
                }}
            >
                Issues
            </div>

            <SegmentedControl options={VIEW_OPTIONS} value={view} onChange={handleNav} />

            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                    type="button"
                    onClick={handleSearch}
                    style={{
                        border: '1px solid var(--border)',
                        borderRadius: 8,
                        padding: '5px 8px 5px 10px',
                        background: 'transparent',
                        color: 'var(--fg3)',
                        fontSize: 12,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        fontFamily: 'inherit',
                    }}
                >
                    <span style={{ fontSize: 13 }}>⌕</span>
                    Search
                    <Kbd>⌘K</Kbd>
                </button>
            </div>
        </div>
    );
}

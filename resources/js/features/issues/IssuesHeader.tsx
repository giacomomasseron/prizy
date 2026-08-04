import { useState, type CSSProperties, type JSX } from 'react';
import { useNavigate } from 'react-router-dom';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { Kbd } from '../../components/ui/Kbd';
import { useFontScale } from '../../lib/fontScale';

export interface IssuesHeaderProps {
    view: 'list' | 'board';
}

const VIEW_OPTIONS = [
    { label: 'List', value: 'list' as const },
    { label: 'Board', value: 'board' as const },
];

// A−/⟲/A+ button styling, mirroring the mockup's fontBtnCss (enabled/disabled states).
function fontBtnStyle(enabled: boolean, size: number): CSSProperties {
    return {
        border: 'none',
        background: 'transparent',
        color: enabled ? 'var(--fg2)' : 'var(--fg3)',
        width: 26,
        height: 24,
        borderRadius: 6,
        cursor: enabled ? 'pointer' : 'default',
        fontSize: size,
        lineHeight: 1,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: enabled ? 1 : 0.4,
        padding: 0,
        fontFamily: 'inherit',
        fontWeight: 600,
    };
}

export function IssuesHeader({ view }: IssuesHeaderProps): JSX.Element {
    const navigate = useNavigate();
    const { scale, step, reset, canDecrease, canIncrease, canReset } = useFontScale();
    const [searchHover, setSearchHover] = useState(false);

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
                {/* Text-size control — zooms the main content region (persisted) */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        padding: 2,
                        border: '1px solid var(--border)',
                        borderRadius: 8,
                        background: 'var(--bg2)',
                    }}
                >
                    <button
                        type="button"
                        onClick={() => step(-1)}
                        disabled={!canDecrease}
                        title="Decrease text size"
                        aria-label="Decrease text size"
                        style={fontBtnStyle(canDecrease, 12)}
                    >
                        A−
                    </button>
                    <button
                        type="button"
                        onClick={reset}
                        disabled={!canReset}
                        title={canReset ? `Reset text size (now ${Math.round(scale * 100)}%)` : 'Text size 100%'}
                        aria-label="Reset text size"
                        style={fontBtnStyle(canReset, 12.5)}
                    >
                        ⟲
                    </button>
                    <button
                        type="button"
                        onClick={() => step(1)}
                        disabled={!canIncrease}
                        title="Increase text size"
                        aria-label="Increase text size"
                        style={fontBtnStyle(canIncrease, 13.5)}
                    >
                        A+
                    </button>
                </div>

                <button
                    type="button"
                    onClick={handleSearch}
                    onMouseEnter={() => setSearchHover(true)}
                    onMouseLeave={() => setSearchHover(false)}
                    style={{
                        border: '1px solid',
                        borderColor: searchHover ? 'var(--border2)' : 'var(--border)',
                        borderRadius: 8,
                        padding: '5px 8px 5px 10px',
                        background: 'transparent',
                        color: 'var(--fg2)',
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

import type { CSSProperties, JSX } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/PageHeader';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { Kbd } from '../../components/ui/Kbd';
import { UserMenu } from '../../components/UserMenu';
import { NotificationBell } from '../notifications/NotificationBell';
import { useFontScale } from '../../lib/fontScale';
import { useTheme } from '../../lib/theme';

export interface IssuesHeaderProps {
    view: 'list' | 'board';
}

const VIEW_OPTIONS = [
    { label: 'List', value: 'list' as const },
    { label: 'Board', value: 'board' as const },
];

// A−/⟲/A+ buttons (mockup fontBtnCss). No inline background: hover is the FONT_BTN_CLASSES class.
function fontBtnStyle(enabled: boolean, size: number): CSSProperties {
    return {
        border: 'none',
        color: enabled ? 'var(--fg2)' : 'var(--fg3)',
        width: 26,
        height: 24,
        borderRadius: 'var(--radius-pill)',
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
const FONT_BTN_CLASSES = 'bg-transparent enabled:hover:bg-hover';

// 34px round toolbar button: border width/style inline, colours in classes so hover works.
const roundBtn: CSSProperties = {
    width: 34, height: 34, borderRadius: '50%', borderWidth: 'var(--line)', borderStyle: 'solid',
    cursor: 'pointer', fontSize: 14, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, fontFamily: 'inherit', padding: 0,
};

export function IssuesHeader({ view }: IssuesHeaderProps): JSX.Element {
    const navigate = useNavigate();
    const { scale, step, reset, canDecrease, canIncrease, canReset } = useFontScale();
    const { theme, toggle: toggleTheme } = useTheme();

    function handleNav(value: 'list' | 'board') {
        if (value === 'list') navigate('/', { replace: true });
        else navigate('/board', { replace: true });
    }

    function handleSearch() {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }));
    }

    return (
        <PageHeader
            title="Issues"
            actions={
                <>
                    {/* Notifications bell + dropdown */}
                    <NotificationBell />

                    {/* Text-size control — zooms the main content region (persisted) */}
                    <div
                        style={{
                            display: 'flex', alignItems: 'center', gap: 2, padding: 3,
                            border: 'var(--line) solid var(--border)', borderRadius: 'var(--radius-pill)',
                            background: 'var(--panel)',
                        }}
                    >
                        <button
                            type="button"
                            onClick={() => step(-1)}
                            disabled={!canDecrease}
                            title="Decrease text size"
                            aria-label="Decrease text size"
                            className={FONT_BTN_CLASSES}
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
                            className={FONT_BTN_CLASSES}
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
                            className={FONT_BTN_CLASSES}
                            style={fontBtnStyle(canIncrease, 13.5)}
                        >
                            A+
                        </button>
                    </div>

                    <button
                        type="button"
                        onClick={handleSearch}
                        className="border-border bg-panel text-fg2 hover:border-fg"
                        style={{
                            display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px 7px 14px',
                            borderRadius: 'var(--radius-pill)', borderWidth: 'var(--line)', borderStyle: 'solid',
                            fontSize: 13.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                        }}
                    >
                        <span style={{ fontSize: 13 }}>⌕</span>
                        Search
                        <Kbd>⌘K</Kbd>
                    </button>

                    <button
                        type="button"
                        onClick={toggleTheme}
                        title="Toggle theme"
                        aria-label="Toggle theme"
                        className="border-border bg-panel text-fg2 hover:border-border2"
                        style={roundBtn}
                    >
                        {theme === 'dark' ? '☾' : '☀'}
                    </button>

                    {/* User avatar → account menu */}
                    <UserMenu variant="compact" />
                </>
            }
        >
            <div style={{ marginLeft: 4 }}>
                <SegmentedControl options={VIEW_OPTIONS} value={view} onChange={handleNav} />
            </div>
        </PageHeader>
    );
}

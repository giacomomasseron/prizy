import { useTheme } from '../../lib/theme';

export function ThemeToggle() {
    const { theme, toggle } = useTheme();
    return (
        <button
            type="button"
            title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            onClick={toggle}
            style={{
                border: 'none',
                background: 'none',
                color: 'var(--fg2)',
                width: 28,
                height: 28,
                borderRadius: 7,
                cursor: 'pointer',
                fontSize: 14,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
            }}
            className="hover:bg-hover"
        >
            {theme === 'dark' ? '☾' : '☀'}
        </button>
    );
}

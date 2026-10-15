import { useTheme } from '../../lib/theme';
import { IconButton } from './IconButton';

export interface ThemeToggleProps {
    /** `outlined`: a round button with a border on the panel (Today v2's left bar). */
    variant?: 'plain' | 'outlined';
}

export function ThemeToggle({ variant = 'plain' }: ThemeToggleProps) {
    const { theme, toggle } = useTheme();
    const title = theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';
    const glyph = theme === 'dark' ? '☾' : '☀';
    if (variant === 'outlined') {
        return (
            <button
                type="button"
                title={title}
                aria-label={title}
                onClick={toggle}
                className="border-border2 bg-panel text-fg2 hover:border-fg hover:text-fg"
                style={{ width: 32, height: 32, borderRadius: '50%', borderWidth: 'var(--line)', borderStyle: 'solid', cursor: 'pointer', fontSize: 14, flexShrink: 0, padding: 0, fontFamily: 'inherit' }}
            >
                {glyph}
            </button>
        );
    }
    return (
        <IconButton title={title} onClick={toggle}>
            {glyph}
        </IconButton>
    );
}

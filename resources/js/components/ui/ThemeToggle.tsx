import { useTheme } from '../../lib/theme';
import { IconButton } from './IconButton';

export function ThemeToggle() {
    const { theme, toggle } = useTheme();
    return (
        <IconButton
            title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            onClick={toggle}
        >
            {theme === 'dark' ? '☾' : '☀'}
        </IconButton>
    );
}

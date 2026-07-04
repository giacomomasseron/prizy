import { useState } from 'react';

export type Theme = 'dark' | 'light';

const STORAGE_KEY = 'prizy-theme';

function readStored(): Theme {
    try {
        const v = localStorage.getItem(STORAGE_KEY);
        return v === 'light' ? 'light' : 'dark';
    } catch {
        return 'dark';
    }
}

function applyTheme(t: Theme): void {
    document.documentElement.dataset.theme = t;
    try {
        localStorage.setItem(STORAGE_KEY, t);
    } catch {
        /* storage unavailable — ignore */
    }
}

export function useTheme() {
    const [theme, setThemeState] = useState<Theme>(readStored);

    function setTheme(t: Theme) {
        setThemeState(t);
        applyTheme(t);
    }

    function toggle() {
        setTheme(theme === 'dark' ? 'light' : 'dark');
    }

    return { theme, toggle, setTheme };
}

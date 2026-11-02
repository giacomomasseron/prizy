import { ThemeToggle } from '../../components/ui/ThemeToggle';
import { headerBar, headerSub, headerTitle } from './kbStyles';

/** The v2 top bar of every KB page. The title is a div, never a heading: the library's h1 is its scope title. */
export function KbHeader({ title, subtitle }: { title: string; subtitle: string }) {
    return (
        <header style={headerBar}>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div data-testid="kb-header-title" style={headerTitle}>{title}</div>
                <div style={headerSub}>{subtitle}</div>
            </div>
            <a
                href="/help"
                target="_blank"
                rel="noreferrer"
                className="text-fg hover:text-accent"
                style={{ fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap', textDecoration: 'none' }}
            >
                Customer help center ↗
            </a>
            <ThemeToggle />
        </header>
    );
}

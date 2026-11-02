import type { ReactNode } from 'react';

export interface PageHeaderProps {
    title: string;
    /** Rendered right after the title (filter chips, a view switch…). */
    children?: ReactNode;
    /** Right-aligned controls. */
    actions?: ReactNode;
}

/** v2 page header: 72px bar, Bricolage display title with the yellow highlighter. */
export function PageHeader({ title, children, actions }: PageHeaderProps) {
    return (
        <header style={{ height: 72, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 14, padding: '0 24px 0 calc(24px + var(--nav-inset, 0px))' }}>
            <h1 style={{ margin: 0, whiteSpace: 'nowrap', flexShrink: 0, fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 30, letterSpacing: '-.035em', lineHeight: 1 }}>
                <span className="hl">{title}</span>
            </h1>
            {children}
            {actions && <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>{actions}</div>}
        </header>
    );
}

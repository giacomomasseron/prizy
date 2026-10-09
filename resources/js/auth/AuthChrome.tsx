import type { ReactNode } from 'react';
import { BrandMark } from '../components/ui/BrandMark';

/** The ink brand lockup at the top of the auth pages. */
export function AuthBrand() {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, alignSelf: 'flex-start' }}>
            <BrandMark size={32} />
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, letterSpacing: '-.03em' }}>Prizy</span>
        </div>
    );
}

const FOOTER_LINK_CLASSES = 'text-fg3 underline decoration-border2 underline-offset-[3px] hover:text-accent';

/** © / Privacy / Terms row at the bottom of the auth pages. */
export function AuthFooter() {
    return (
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', color: 'var(--fg3)', fontSize: 13, fontWeight: 600, flexShrink: 0 }}>
            <span>© 2026 Prizy</span>
            <a href="https://prizy.dev/privacy" target="_blank" rel="noopener noreferrer" className={FOOTER_LINK_CLASSES}>Privacy</a>
            <a href="https://prizy.dev/terms" target="_blank" rel="noopener noreferrer" className={FOOTER_LINK_CLASSES}>Terms</a>
        </div>
    );
}

/** The content of an auth page column (place it inside an element styled with `authColumn`). */
export function AuthColumn({ children }: { children: ReactNode }) {
    return (
        <>
            <AuthBrand />
            <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 0' }}>
                <div className="login-fade" style={{ width: '100%', maxWidth: 400 }}>{children}</div>
            </main>
            <AuthFooter />
        </>
    );
}

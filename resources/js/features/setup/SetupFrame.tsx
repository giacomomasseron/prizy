import type { FormEvent, ReactNode } from 'react';
import { BrandMark } from '../../components/ui/BrandMark';
import { Button } from '../../components/ui/Button';

export type SetupStep = 1 | 2 | 3;

/** The docs page on setting up a workspace (the rail's "Setup guide"). */
export const SETUP_GUIDE_URL = 'https://docs.prizy.dev/workspace';

const STEPS: { n: SetupStep; label: string; sub: string }[] = [
    { n: 1, label: 'Create workspace', sub: 'Name, URL and what it runs' },
    { n: 2, label: 'Invite your team', sub: 'Email the first people in' },
    { n: 3, label: 'Ready to work', sub: 'Open the workspace' },
];

export interface SetupFooter {
    /** Shown only when given; the space stays, so the rest of the bar never moves. */
    onBack?: () => void;
    note?: string;
    skip?: { label: string; onClick: () => void };
    /** Without onClick it submits the frame's form (step 1). */
    primary?: { label: string; onClick?: () => void; disabled?: boolean };
}

export interface SetupFrameProps {
    step: SetupStep;
    /** Steps already finished; the rail ticks them. */
    done: SetupStep[];
    /** A finished step the rail may go back to (only on the page that owns it). */
    onStep?: (n: SetupStep) => void;
    canGoTo?: (n: SetupStep) => boolean;
    /** Where "Finish later" goes; hidden without one (there is nothing to finish before the workspace exists). */
    finishLater?: { label: string; onClick: () => void };
    /** The rail's foot: help and account links. */
    railLinks: ReactNode;
    footer: SetupFooter;
    /** Given, the content and footer are one form, so Enter in a field submits it. */
    onSubmit?: (e: FormEvent) => void;
    children: ReactNode;
}

/** The Setup v2 frame: the step rail, the "Step N of 3" header, the centred column and the footer bar. */
export function SetupFrame({ step, done, onStep, canGoTo, finishLater, railLinks, footer, onSubmit, children }: SetupFrameProps) {
    const body = (
        <>
            <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
                <div className="setup-column" style={{ maxWidth: 640, margin: '0 auto', padding: '48px 32px' }}>
                    <div key={step} className="setup-rise">{children}</div>
                </div>
            </div>
            <footer style={{ flexShrink: 0, borderTop: 'var(--line) solid var(--border)', background: 'var(--bg2)', padding: '14px 28px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                <Button
                    variant="secondary"
                    onClick={footer.onBack}
                    style={{ background: 'var(--panel)', padding: '9px 18px', flexShrink: 0, visibility: footer.onBack ? 'visible' : 'hidden' }}
                >
                    ← Back
                </Button>
                {footer.note && <span style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--fg3)', minWidth: 0 }}>{footer.note}</span>}
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                    {footer.skip && (
                        <Button variant="ghost" onClick={footer.skip.onClick} style={{ color: 'var(--fg2)', padding: '9px 12px' }}>
                            {footer.skip.label}
                        </Button>
                    )}
                    {footer.primary && (
                        <Button
                            type={footer.primary.onClick ? 'button' : 'submit'}
                            onClick={footer.primary.onClick}
                            disabled={footer.primary.disabled}
                            style={{ padding: '11px 22px', fontSize: 15, ...(footer.primary.disabled ? { opacity: 0.4 } : {}) }}
                        >
                            {footer.primary.label}
                        </Button>
                    )}
                </div>
            </footer>
        </>
    );

    return (
        <div style={{ display: 'flex', height: '100vh', width: '100%', overflow: 'hidden', color: 'var(--fg)', background: 'var(--bg)', fontSize: 15, lineHeight: 1.5 }}>
            <aside className="setup-aside" aria-label="Setup steps" style={{ width: 300, flexShrink: 0, background: 'var(--bg2)', borderRight: 'var(--line) solid var(--border)', display: 'flex', flexDirection: 'column', padding: '28px 24px 22px', overflow: 'auto', boxSizing: 'border-box' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 40 }}>
                    <BrandMark size={32} />
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, letterSpacing: '-.03em' }}>Prizy</span>
                    <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 700, color: 'var(--fg2)', background: 'var(--panel)', border: 'var(--line) solid var(--border)', borderRadius: 'var(--radius-pill)', padding: '2px 10px' }}>setup</span>
                </div>

                <h2 style={{ margin: '0 0 14px', fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 800, letterSpacing: '-.02em' }}>Get Prizy running</h2>
                <ol style={{ display: 'flex', flexDirection: 'column', gap: 6, listStyle: 'none', margin: 0, padding: 0 }}>
                    {STEPS.map((s) => {
                        const active = s.n === step;
                        const finished = done.includes(s.n);
                        const clickable = !active && finished && !!onStep && (canGoTo?.(s.n) ?? false);
                        return (
                            <li key={s.n}>
                                <button
                                    type="button"
                                    onClick={clickable ? () => onStep?.(s.n) : undefined}
                                    aria-disabled={clickable ? undefined : true}
                                    aria-current={active ? 'step' : undefined}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '11px 12px', borderRadius: 16,
                                        border: `var(--line) solid ${active ? 'var(--fg)' : 'transparent'}`,
                                        background: active ? 'var(--panel)' : 'transparent',
                                        boxShadow: active ? '3px 3px 0 var(--fg)' : 'none',
                                        cursor: clickable ? 'pointer' : 'default', textAlign: 'left', color: 'var(--fg)', fontFamily: 'inherit',
                                    }}
                                >
                                    <span
                                        aria-hidden="true"
                                        style={{
                                            width: 28, height: 28, flexShrink: 0, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: 13, fontWeight: 800, fontFamily: 'var(--font-display)', boxSizing: 'border-box',
                                            ...(finished
                                                ? { background: 'var(--sup)', color: 'var(--on-sup)' }
                                                : active
                                                    ? { background: 'var(--fg)', color: 'var(--bg)' }
                                                    : { border: 'var(--line) solid var(--border2)', color: 'var(--fg3)', background: 'var(--panel)' }),
                                        }}
                                    >
                                        {finished ? '✓' : s.n}
                                    </span>
                                    <span style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
                                        <span style={{ fontSize: 15, fontWeight: 700, color: active || finished ? 'var(--fg)' : 'var(--fg2)' }}>
                                            {s.label}
                                            {finished && <span className="sr-only"> (done)</span>}
                                        </span>
                                        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg3)' }}>{s.sub}</span>
                                    </span>
                                </button>
                            </li>
                        );
                    })}
                </ol>

                <div style={{ marginTop: 'auto', paddingTop: 24, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13.5, fontWeight: 600 }}>
                    {railLinks}
                </div>
            </aside>

            <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                <header style={{ height: 60, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12, padding: '0 24px 0 32px', borderBottom: 'var(--line) solid var(--border)' }}>
                    <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--fg2)', background: 'var(--panel)', border: 'var(--line) solid var(--border)', borderRadius: 'var(--radius-pill)', padding: '4px 12px' }}>
                        Step {step} of 3
                    </span>
                    {finishLater && (
                        <button
                            type="button"
                            onClick={finishLater.onClick}
                            className="bg-transparent text-fg2 hover:bg-hover hover:text-fg"
                            style={{ marginLeft: 'auto', fontSize: 14, fontWeight: 700, padding: '7px 14px', borderRadius: 'var(--radius-pill)', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                        >
                            {finishLater.label}
                        </button>
                    )}
                </header>
                {onSubmit ? (
                    <form onSubmit={onSubmit} noValidate style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>{body}</form>
                ) : (
                    body
                )}
            </main>
        </div>
    );
}

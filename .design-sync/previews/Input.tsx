import { Input } from '@prizy/ui';

export const Default = () => (
    <div style={{ width: 320 }}>
        <Input aria-label="Team name" placeholder="Engineering" />
    </div>
);

export const WithLabel = () => (
    <div style={{ width: 320 }}>
        <label htmlFor="team-identifier" style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: 'var(--fg2)', marginBottom: 7 }}>Identifier</label>
        <Input id="team-identifier" defaultValue="ENG" maxLength={8} />
    </div>
);

export const WithError = () => (
    <div style={{ width: 320 }}>
        <label htmlFor="invite-email" style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: 'var(--fg2)', marginBottom: 7 }}>Email</label>
        <Input id="invite-email" type="email" defaultValue="maya@northwind" aria-invalid />
        <p role="alert" style={{ margin: '6px 0 0', fontSize: 12.5, color: 'var(--red-ink)' }}>Enter a valid email address.</p>
    </div>
);

export const Disabled = () => (
    <div style={{ width: 320 }}>
        <Input aria-label="Workspace URL" defaultValue="northwind.prizy.dev" disabled style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }} />
    </div>
);

export function ComingSoon({ label }: { label: string }) {
    return (
        <div style={{ border: '1px solid var(--border)', borderRadius: 12, background: 'var(--panel)', padding: '48px 18px', textAlign: 'center', color: 'var(--fg3)', fontSize: 13 }}>
            {label} — this report is coming soon.
        </div>
    );
}

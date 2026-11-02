export const LEVELS = {
    owner:  { color: 'var(--amber)',  label: 'Owner',  desc: 'Full control, billing & workspace deletion.' },
    admin:  { color: 'var(--accent)', label: 'Admin',  desc: 'Configure members, integrations & settings.' },
    member: { color: 'var(--fg2)',    label: 'Member', desc: 'Standard access, defined by capabilities.' },
    viewer: { color: 'var(--blue)',   label: 'Viewer', desc: 'Read-only across enabled modules.' },
} as const;

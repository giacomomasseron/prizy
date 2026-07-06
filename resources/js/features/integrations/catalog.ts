export interface IntegrationDef {
    id: string;
    name: string;
    category: string;
    glyph: string;
    color: string;
    description: string;
    real: boolean;
}

export const INTEGRATIONS: IntegrationDef[] = [
    { id: 'github', name: 'GitHub', category: 'Dev', glyph: 'GH', color: '#e6e6e6', description: 'Link PRs to issues and auto-close on merge. Two-way sync of status.', real: true },
    { id: 'slack', name: 'Slack', category: 'Chat', glyph: 'SL', color: '#e0894a', description: 'Post issue and ticket updates to channels; create issues from messages.', real: true },
    { id: 'zendesk', name: 'Zendesk', category: 'Support', glyph: 'ZD', color: '#3a9a68', description: 'Escalate tickets into engineering issues with full customer context.', real: false },
    { id: 'figma', name: 'Figma', category: 'Design', glyph: 'FG', color: '#e05a8f', description: 'Embed live design frames directly in issue descriptions.', real: false },
    { id: 'sentry', name: 'Sentry', category: 'Monitoring', glyph: 'SN', color: '#b06ae0', description: 'Turn crash reports into pre-filled bug issues automatically.', real: false },
    { id: 'jira', name: 'Jira', category: 'Dev', glyph: 'JR', color: '#5b8def', description: 'One-time import of projects, issues, and comment history.', real: false },
    { id: 'discord', name: 'Discord', category: 'Chat', glyph: 'DC', color: '#6d69f2', description: 'Community support: create tickets from Discord threads.', real: false },
    { id: 'pagerduty', name: 'PagerDuty', category: 'On-call', glyph: 'PD', color: '#3aa8a0', description: 'Trigger incidents from urgent issues and sync resolution.', real: false },
];

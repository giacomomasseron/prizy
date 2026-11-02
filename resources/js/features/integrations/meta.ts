export function slackMeta(events: string[]): string {
    return events.length > 0 ? `${events.length} event${events.length === 1 ? '' : 's'}` : 'No events';
}

export function githubMeta(moveToDone: boolean): string {
    return moveToDone ? 'Auto-close on merge' : 'Webhook active';
}

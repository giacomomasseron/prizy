export function notificationText(type: string): string {
    switch (type) {
        case 'issue_assigned':
            return 'You were assigned an issue';
        case 'issue_unblocked':
            return "An issue you're assigned was unblocked";
        case 'issue_mentioned':
            return 'mentioned you';
        case 'issue_commented':
            return 'commented';
        case 'issue_status_changed':
            return 'changed status';
        default:
            return 'New notification';
    }
}

export type NotificationCategory = 'mention' | 'assign' | 'comment' | 'status' | 'other';

export function notificationMeta(type: string): { icon: string; category: NotificationCategory } {
    switch (type) {
        case 'issue_mentioned':
            return { icon: '@', category: 'mention' };
        case 'issue_assigned':
            return { icon: '→', category: 'assign' };
        case 'issue_commented':
            return { icon: '❝', category: 'comment' };
        case 'issue_status_changed':
            return { icon: '◑', category: 'status' };
        case 'issue_unblocked':
            return { icon: '◔', category: 'other' };
        default:
            return { icon: '•', category: 'other' };
    }
}

export function subjectPath(subjectType: string, subjectId: string): string | null {
    return subjectType === 'issue' ? `/issues/${subjectId}` : null;
}

export function reasonFor(type: string): string {
    switch (type) {
        case 'issue_assigned':
            return "You're the assignee.";
        case 'issue_mentioned':
            return 'You were mentioned.';
        case 'issue_commented':
            return "You're a participant on this issue.";
        case 'issue_status_changed':
            return 'You follow this issue.';
        case 'issue_unblocked':
            return "An issue you're assigned was unblocked.";
        default:
            return 'You have a notification.';
    }
}

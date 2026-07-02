export function notificationText(type: string): string {
    switch (type) {
        case 'issue_assigned':
            return 'You were assigned an issue';
        case 'issue_unblocked':
            return "An issue you're assigned was unblocked";
        default:
            return 'New notification';
    }
}

export function subjectPath(subjectType: string, subjectId: string): string | null {
    return subjectType === 'issue' ? `/issues/${subjectId}` : null;
}

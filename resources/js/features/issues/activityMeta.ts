export function humanizeActivityType(type: string): string {
    switch (type) {
        case 'status_changed':      return 'changed status';
        case 'priority_changed':    return 'changed priority';
        case 'assigned':            return 'assigned';
        case 'title_changed':       return 'changed title';
        case 'description_changed': return 'changed description';
        case 'estimate_changed':    return 'changed the estimate';
        case 'due_date_changed':    return 'changed the due date';
        case 'parent_changed':      return 'changed the parent';
        case 'label_added':         return 'added a label';
        case 'label_removed':       return 'removed a label';
        case 'project_changed':     return 'changed project';
        case 'cycle_changed':       return 'changed cycle';
        case 'release_changed':     return 'changed the release';
        case 'created':             return 'created this issue';
        case 'archived':            return 'archived this issue';
        case 'blocker_added':       return 'added a blocker';
        case 'blocker_removed':     return 'removed a blocker';
        case 'blocker_resolved':    return 'resolved a blocker';
        default:                    return type;
    }
}

// to_value is redundant/uninteresting in the feed for these (created's to_value is the issue title).
const NO_DETAIL = new Set(['created', 'archived']);

export function activityDetail(type: string, toValue: string | null | undefined): string {
    return !NO_DETAIL.has(type) && toValue ? ` → ${toValue}` : '';
}

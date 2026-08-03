export function humanizeActivityType(type: string): string {
    switch (type) {
        case 'status_changed':      return 'changed status';
        case 'priority_changed':    return 'changed priority';
        case 'assigned':            return 'assigned';
        case 'title_changed':       return 'changed title';
        case 'description_changed': return 'changed description';
        case 'label_added':         return 'added a label';
        case 'label_removed':       return 'removed a label';
        case 'project_changed':     return 'changed project';
        case 'cycle_changed':       return 'changed cycle';
        default:                    return type;
    }
}

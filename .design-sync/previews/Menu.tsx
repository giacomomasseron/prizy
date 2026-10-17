import { useEffect, useRef, type ReactNode } from 'react';
import { Button, IconButton, Menu, PriorityIcon } from '@prizy/ui';

/** Clicks the trigger once mounted, so the card shows the menu open. */
function OpenOnMount({ children, height = 300 }: { children: ReactNode; height?: number }) {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        ref.current?.querySelector('button')?.click();
    }, []);
    return <div ref={ref} style={{ minHeight: height, minWidth: 260 }}>{children}</div>;
}

const dot = (color: string) => <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block' }} />;
const noop = () => {};

export function TicketStatus() {
    return (
        <OpenOnMount height={330}>
            <Menu
                trigger={<Button variant="secondary" size="sm">{dot('var(--blue)')} Open <span aria-hidden="true" style={{ color: 'var(--fg3)' }}>▾</span></Button>}
                items={[
                    { key: 'new', label: 'New', icon: dot('var(--amber)'), onActivate: noop },
                    { key: 'open', label: 'Open', icon: dot('var(--blue)'), onActivate: noop },
                    { key: 'pending', label: 'Pending', icon: dot('var(--teal)'), onActivate: noop },
                    { key: 'on_hold', label: 'On hold', icon: dot('var(--fg3)'), onActivate: noop },
                    { key: 'solved', label: 'Solved', icon: dot('var(--green)'), onActivate: noop },
                    { key: 'closed', label: 'Closed', icon: dot('var(--border2)'), onActivate: noop },
                ]}
            />
        </OpenOnMount>
    );
}

export function PrioritySelection() {
    return (
        <OpenOnMount height={300}>
            <Menu
                selection="single"
                trigger={<Button variant="secondary" size="sm"><PriorityIcon priority="high" decorative /> High</Button>}
                items={[
                    { key: 'urgent', label: 'Urgent', icon: <PriorityIcon priority="urgent" decorative />, onActivate: noop },
                    { key: 'high', label: 'High', icon: <PriorityIcon priority="high" decorative />, onActivate: noop, checked: true },
                    { key: 'medium', label: 'Medium', icon: <PriorityIcon priority="medium" decorative />, onActivate: noop },
                    { key: 'low', label: 'Low', icon: <PriorityIcon priority="low" decorative />, onActivate: noop },
                    { key: 'no_priority', label: 'No priority', icon: <PriorityIcon priority="no_priority" decorative />, onActivate: noop },
                ]}
            />
        </OpenOnMount>
    );
}

export function RowActions() {
    return (
        <OpenOnMount height={220}>
            <Menu
                trigger={<IconButton title="More actions">⋯</IconButton>}
                items={[
                    { key: 'edit', label: 'Edit label', onActivate: noop },
                    { key: 'merge', label: 'Merge into…', subtitle: 'Moves its issues to another label', onActivate: noop },
                    { key: 'archive', label: 'Archive', onActivate: noop, disabled: true },
                    { key: 'delete', label: 'Delete label', onActivate: noop, danger: true },
                ]}
            />
        </OpenOnMount>
    );
}

export function SearchableAssignee() {
    return (
        <OpenOnMount height={330}>
            <Menu
                searchable
                searchPlaceholder="Assign to…"
                trigger={<Button variant="secondary" size="sm">Assignee ▾</Button>}
                items={[
                    { key: 'maya', label: 'Maya Chen', subtitle: 'maya@northwind.com', onActivate: noop },
                    { key: 'devin', label: 'Devin Ortiz', subtitle: 'devin@northwind.com', onActivate: noop },
                    { key: 'grace', label: 'Grace Okonkwo', subtitle: 'grace@northwind.com', onActivate: noop },
                    { key: 'none', label: 'Unassigned', onActivate: noop },
                ]}
            />
        </OpenOnMount>
    );
}

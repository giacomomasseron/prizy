import type { IssuePriority } from '../../lib/types';

export interface PriorityIconProps {
    priority: IssuePriority;
}

const BAR_FILL: Record<Exclude<IssuePriority, 'urgent'>, number> = {
    no_priority: 0,
    low: 1,
    medium: 2,
    high: 3,
};

export function PriorityIcon({ priority }: PriorityIconProps) {
    if (priority === 'urgent') {
        return (
            <span
                style={{
                    width: 16,
                    height: 16,
                    borderRadius: 5,
                    background: 'var(--red)',
                    color: 'var(--on-accent)',
                    fontSize: 11,
                    fontWeight: 800,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                }}
                aria-label="urgent"
            >
                !
            </span>
        );
    }

    const fill = BAR_FILL[priority];
    return (
        <span
            style={{ display: 'inline-flex', alignItems: 'flex-end', gap: 2, height: 12, width: 16, justifyContent: 'center', flexShrink: 0 }}
            aria-label={priority}
        >
            {[0, 1, 2].map((i) => (
                <span
                    key={i}
                    style={{
                        width: 3,
                        borderRadius: 1,
                        height: 4 + i * 3,
                        background: i < fill ? 'var(--prio-bar, var(--fg))' : 'var(--border2)',
                    }}
                />
            ))}
        </span>
    );
}

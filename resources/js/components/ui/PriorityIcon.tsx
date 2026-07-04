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
                    width: 14,
                    height: 14,
                    borderRadius: 3,
                    background: 'var(--amber)',
                    color: '#161616',
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
            style={{ display: 'inline-flex', alignItems: 'flex-end', gap: 2, height: 11, flexShrink: 0 }}
            aria-label={priority}
        >
            {[0, 1, 2].map((i) => (
                <span
                    key={i}
                    style={{
                        width: 3,
                        borderRadius: 1,
                        height: 4 + i * 3,
                        background: i < fill ? 'var(--fg2)' : 'var(--border2)',
                    }}
                />
            ))}
        </span>
    );
}

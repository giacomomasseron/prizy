export interface SegmentedOption<T extends string = string> {
    label: string;
    value: T;
}

export interface SegmentedControlProps<T extends string = string> {
    options: SegmentedOption<T>[];
    value: T;
    onChange(value: T): void;
}

export function SegmentedControl<T extends string = string>({
    options,
    value,
    onChange,
}: SegmentedControlProps<T>) {
    return (
        <div
            style={{
                display: 'inline-flex',
                background: 'var(--bg2)',
                border: 'var(--line) solid var(--border)',
                borderRadius: 'var(--radius-pill)',
                padding: 3,
                gap: 2,
            }}
        >
            {options.map((opt) => {
                const active = opt.value === value;
                return (
                    <button
                        key={opt.value}
                        type="button"
                        aria-pressed={active}
                        onClick={() => onChange(opt.value)}
                        style={{
                            padding: '6px 14px',
                            borderRadius: 'var(--radius-pill)',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: 13,
                            fontFamily: 'inherit',
                            fontWeight: 700,
                            background: active ? 'var(--panel)' : 'transparent',
                            color: active ? 'var(--fg)' : 'var(--fg2)',
                            // The selected segment's ring is 3:1 against the track (WCAG 1.4.11), in both themes.
                            boxShadow: active ? '0 0 0 1.5px var(--field)' : 'none',
                            transition: 'background .1s, color .1s',
                        }}
                    >
                        {opt.label}
                    </button>
                );
            })}
        </div>
    );
}

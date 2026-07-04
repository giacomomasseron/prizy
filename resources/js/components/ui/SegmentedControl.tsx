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
                border: '1px solid var(--border)',
                borderRadius: 10,
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
                        onClick={() => onChange(opt.value)}
                        style={{
                            padding: '4px 13px',
                            borderRadius: 6,
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: 12,
                            fontFamily: 'inherit',
                            fontWeight: 500,
                            background: active ? 'var(--panel)' : 'transparent',
                            color: active ? 'var(--fg)' : 'var(--fg2)',
                            boxShadow: active ? '0 1px 2px rgba(0,0,0,.18)' : 'none',
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

import { Textarea } from '@prizy/ui';

export const Empty = () => (
    <div style={{ width: 380 }}>
        <Textarea rows={4} aria-label="Description" placeholder="Describe the problem, what you expected, and the steps to reproduce it…" />
    </div>
);

export const Filled = () => (
    <div style={{ width: 380 }}>
        <label htmlFor="reply" style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: 'var(--fg2)', marginBottom: 7 }}>Public reply</label>
        <Textarea
            id="reply"
            rows={4}
            defaultValue={'Hi Grace, thanks for the report.\n\nEngineering has reproduced the export timeout and a fix is in review. I will update this ticket as soon as it ships.'}
        />
    </div>
);

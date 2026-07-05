// Stub — replaced by Task 5
import type { Cycle } from '../../lib/types';

interface CycleFormProps {
    defaultTeamId?: string;
    onSuccess(cycle: Cycle, teamId: string): void;
    onCancel(): void;
}

export default function CycleForm({ onSuccess, onCancel, defaultTeamId }: CycleFormProps) {
    return (
        <div>
            <p>CycleForm (stub)</p>
            <button type="button" onClick={onCancel}>Cancel</button>
        </div>
    );
}

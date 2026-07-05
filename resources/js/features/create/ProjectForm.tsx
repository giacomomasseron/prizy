// Stub — replaced by Task 4
import type { Project } from '../../lib/types';

interface ProjectFormProps {
    onSuccess(project: Project): void;
    onCancel(): void;
}

export default function ProjectForm({ onSuccess, onCancel }: ProjectFormProps) {
    return (
        <div>
            <p>ProjectForm (stub)</p>
            <button type="button" onClick={onCancel}>Cancel</button>
        </div>
    );
}

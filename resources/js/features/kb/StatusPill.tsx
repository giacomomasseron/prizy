import { statusPill } from './kbStyles';
import type { KbStatus } from './types';

const LABEL: Record<KbStatus, string> = { draft: 'Draft', published: 'Published', archived: 'Archived' };

export function StatusPill({ status }: { status: KbStatus }) {
    return <span style={statusPill(status)}>{LABEL[status]}</span>;
}

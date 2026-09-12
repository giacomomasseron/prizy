import type { KbStatus } from './types';
const STYLE: Record<KbStatus, React.CSSProperties> = {
    draft: { color: '#8b8b95', background: 'rgba(255,255,255,.06)' },
    published: { color: '#3aa76d', background: 'rgba(58,167,109,.15)' },
    archived: { color: '#8b8b95', background: 'transparent', border: '1px solid var(--border2)' },
};
const LABEL: Record<KbStatus, string> = { draft: 'Draft', published: 'Published', archived: 'Archived' };
export function StatusPill({ status }: { status: KbStatus }) {
    return <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600, ...STYLE[status] }}>{LABEL[status]}</span>;
}

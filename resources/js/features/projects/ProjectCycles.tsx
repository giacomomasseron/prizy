import { sectionTitle } from '../issues/issueStyles';
import { pageTitle, titleRow } from './projectStyles';

export default function ProjectCycles() {
    return (
        <>
            <div style={titleRow}>
                <h1 style={pageTitle}><span className="hl">Cycles</span></h1>
            </div>
            <div style={{ padding: '30px 0', display: 'flex', justifyContent: 'center' }}>
                <div style={{ maxWidth: 460, textAlign: 'center', border: 'var(--line) dashed var(--border2)', borderRadius: 20, padding: '40px 28px', background: 'var(--panel)' }}>
                    <div aria-hidden="true" style={{ width: 40, height: 40, borderRadius: '50%', border: '2px solid var(--border2)', margin: '0 auto 14px' }} />
                    <h2 style={sectionTitle(17)}>Project cycles are coming soon</h2>
                    <p style={{ margin: '8px 0 0', fontSize: 14, color: 'var(--fg2)', lineHeight: 1.6 }}>Cycles are currently organized by team.</p>
                </div>
            </div>
        </>
    );
}

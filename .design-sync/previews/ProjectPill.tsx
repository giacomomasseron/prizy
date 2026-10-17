import { ProjectPill } from '@prizy/ui';

export const Projects = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <ProjectPill name="Mobile app" color="#3f74d6" />
        <ProjectPill name="Help center" color="#3a8f4d" />
        <ProjectPill name="Billing v2" color="#d9623a" />
        <ProjectPill name="Onboarding" color="#9b5bd6" />
    </div>
);

export const InIssueMeta = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 13, color: 'var(--fg3)' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5 }}>PRZ-238</span>
        <ProjectPill name="Billing v2" color="#d9623a" />
        <span>Updated 2h ago</span>
    </div>
);

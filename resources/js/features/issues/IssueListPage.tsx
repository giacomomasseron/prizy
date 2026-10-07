import { useSearchParams } from 'react-router-dom';
import { useIssues, groupByStatus, LIST_GROUP_ORDER } from './hooks';
import { useIssueDrawers } from './useIssueDrawers';
import { useProjects } from '../projects/hooks';
import { FilterBar } from '../views/FilterBar';
import { paramsToFilters } from '../views/filters';
import { IssuesHeader } from './IssuesHeader';
import { IssueRow } from './IssueRow';
import { STATUS_LABELS } from './issueMeta';
import { StatusIcon } from '../../components/ui/StatusIcon';
import { IconButton } from '../../components/ui/IconButton';

export default function IssueListPage() {
    const [searchParams] = useSearchParams();
    const filters = paramsToFilters(searchParams);
    const { data, isLoading, isError } = useIssues(filters);
    const projects = useProjects();
    const { openCreate, openPeek } = useIssueDrawers();

    const issues = data?.items ?? [];
    const grouped = groupByStatus(issues);
    const projectList = projects.data?.items ?? [];
    // `sort` orders the list; it doesn't narrow it, so it doesn't count as a filter.
    const filtered = Object.keys(filters).some((k) => k !== 'sort');
    const empty = !isLoading && !isError && issues.length === 0;

    return (
        <>
            <IssuesHeader view="list" />
            <FilterBar viewType="list" />

            {isLoading && <p style={{ margin: 0, padding: '8px 26px', color: 'var(--fg3)', fontSize: 14 }}>Loading…</p>}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: '0 26px 40px' }}>
                {LIST_GROUP_ORDER.filter((status) => grouped[status].length > 0).map((status) => (
                    <section key={status}>
                        {/* Sticky group header */}
                        <div
                            style={{
                                position: 'sticky', top: 0, zIndex: 2, display: 'flex', alignItems: 'center',
                                gap: 10, padding: '6px 4px 10px', background: 'var(--bg)',
                            }}
                        >
                            <StatusIcon status={status} size={16} />
                            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20, letterSpacing: '-.02em', color: 'var(--fg)' }}>
                                {STATUS_LABELS[status]}
                            </span>
                            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg3)' }}>
                                {grouped[status].length}
                            </span>
                            <IconButton
                                title={`Create ${STATUS_LABELS[status]} issue`}
                                onClick={() => openCreate({ status })}
                                style={{ marginLeft: 'auto', fontSize: 18, color: 'var(--fg3)' }}
                            >
                                +
                            </IconButton>
                        </div>

                        {/* Issue rows */}
                        <div style={{ background: 'var(--panel)', border: 'var(--line) solid var(--border)', borderRadius: 'var(--radius-card)', overflow: 'hidden' }}>
                            {grouped[status].map((issue) => (
                                <IssueRow key={issue.id} issue={issue} onPeek={openPeek} projects={projectList} />
                            ))}
                        </div>
                    </section>
                ))}

                {empty && (
                    <div style={{ padding: 52, textAlign: 'center', color: 'var(--fg3)', fontSize: 15 }}>
                        {filtered ? 'No issues match these filters.' : 'No issues yet.'}
                    </div>
                )}
            </div>
        </>
    );
}

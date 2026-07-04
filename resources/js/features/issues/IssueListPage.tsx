import { useSearchParams } from 'react-router-dom';
import { useIssues, groupByStatus, LIST_GROUP_ORDER } from './hooks';
import { useIssueDrawers } from './useIssueDrawers';
import { useProjects } from '../projects/hooks';
import { FilterBar } from '../views/FilterBar';
import { paramsToFilters } from '../views/filters';
import { IssuesHeader } from './IssuesHeader';
import { IssueRow } from './IssueRow';
import { StatusIcon } from '../../components/ui/StatusIcon';
import type { IssueStatus } from '../../lib/types';

const STATUS_LABELS: Record<IssueStatus, string> = {
    in_progress: 'In Progress',
    in_review:   'In Review',
    todo:        'Todo',
    backlog:     'Backlog',
    done:        'Done',
    cancelled:   'Cancelled',
};

export default function IssueListPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const { data, isLoading } = useIssues(paramsToFilters(searchParams));
    const projects = useProjects();
    const { openCreate } = useIssueDrawers();

    const issues = data?.items ?? [];
    const grouped = groupByStatus(issues);
    const projectList = projects.data?.items ?? [];

    function onPeek(id: string) {
        setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            next.set('peek', id);
            return next;
        });
    }

    return (
        <>
            <IssuesHeader view="list" />
            <FilterBar viewType="list" />

            {isLoading && <p style={{ padding: '24px 22px', color: 'var(--fg3)', fontSize: 13 }}>Loading…</p>}

            <div>
                {LIST_GROUP_ORDER.filter((status) => grouped[status].length > 0).map((status) => (
                    <section key={status}>
                        {/* Sticky group header */}
                        <div
                            style={{
                                position: 'sticky',
                                top: 0,
                                zIndex: 2,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 9,
                                padding: '7px 22px',
                                background: 'var(--bg2)',
                                borderBottom: '1px solid var(--border)',
                            }}
                        >
                            <StatusIcon status={status} size={14} />
                            <span style={{ fontWeight: 600, fontSize: 12.5, color: 'var(--fg)' }}>
                                {STATUS_LABELS[status]}
                            </span>
                            <span style={{ fontSize: 12, color: 'var(--fg3)', fontFamily: 'var(--font-mono)' }}>
                                {grouped[status].length}
                            </span>
                            <button
                                style={{
                                    marginLeft: 'auto',
                                    border: 'none',
                                    background: 'none',
                                    color: 'var(--fg3)',
                                    cursor: 'pointer',
                                    fontSize: 16,
                                    width: 22,
                                    height: 22,
                                    borderRadius: 5,
                                    lineHeight: 1,
                                }}
                                className="hover:bg-hover"
                                onClick={() => openCreate({ status })}
                                aria-label={`Create ${STATUS_LABELS[status]} issue`}
                            >
                                +
                            </button>
                        </div>

                        {/* Issue rows */}
                        {grouped[status].map((issue) => (
                            <IssueRow
                                key={issue.id}
                                issue={issue}
                                onPeek={onPeek}
                                projects={projectList}
                            />
                        ))}
                    </section>
                ))}
            </div>
        </>
    );
}

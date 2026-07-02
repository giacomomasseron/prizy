import { DndContext, useDraggable, useDroppable, type DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { Link, useSearchParams } from 'react-router-dom';
import type { Issue, IssueStatus } from '../../lib/types';
import { STATUSES, groupByStatus, useIssues, useTransitionStatus } from './hooks';
import { FilterBar } from '../views/FilterBar';
import { paramsToFilters } from '../views/filters';

function Card({ issue }: { issue: Issue }) {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: issue.id });
    const style = transform ? { transform: `translate(${transform.x}px, ${transform.y}px)` } : undefined;
    return (
        <div ref={setNodeRef} style={style} {...listeners} {...attributes}
            data-testid={`card-${issue.id}`}
            className="cursor-grab rounded border bg-white p-2 text-sm shadow-sm">
            <Link to={`/issues/${issue.id}`} className="font-medium">{issue.title}</Link>
        </div>
    );
}

function Column({ status, issues }: { status: IssueStatus; issues: Issue[] }) {
    const { setNodeRef, isOver } = useDroppable({ id: status });
    return (
        <div ref={setNodeRef} data-testid={`col-${status}`}
            className={`flex w-56 shrink-0 flex-col gap-2 rounded bg-gray-100 p-2 ${isOver ? 'ring-2 ring-indigo-400' : ''}`}>
            <h2 className="text-xs font-semibold uppercase text-gray-500">{status.replace('_', ' ')}</h2>
            {issues.map((issue) => <Card key={issue.id} issue={issue} />)}
        </div>
    );
}

export default function BoardPage() {
    const [searchParams] = useSearchParams();
    const { data } = useIssues(paramsToFilters(searchParams));
    const transition = useTransitionStatus();
    const sensors = useSensors(useSensor(PointerSensor));
    const grouped = groupByStatus(data?.items ?? []);

    function onDragEnd(e: DragEndEvent) {
        const id = String(e.active.id);
        const target = e.over ? (String(e.over.id) as IssueStatus) : null;
        const current = data?.items.find((i) => i.id === id);
        if (target && current && current.status !== target) {
            transition.mutate({ id, status: target });
        }
    }

    return (
        <div className="p-6">
            <div className="mb-4 flex items-center justify-between">
                <h1 className="text-xl font-semibold">Board</h1>
                <Link to="/" className="text-sm text-indigo-600">← List</Link>
            </div>
            <FilterBar viewType="board" />
            <DndContext sensors={sensors} onDragEnd={onDragEnd}>
                <div className="flex gap-3 overflow-x-auto">
                    {STATUSES.map((status) => <Column key={status} status={status} issues={grouped[status]} />)}
                </div>
            </DndContext>
        </div>
    );
}

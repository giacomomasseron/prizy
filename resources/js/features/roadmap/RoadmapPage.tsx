import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useRoadmap } from './hooks';
import { barGeometry, computeWindow, isScheduled, markerLeft } from './layout';

export default function RoadmapPage() {
    const roadmap = useRoadmap();
    const projects = useMemo(() => roadmap.data ?? [], [roadmap.data]);
    const window = useMemo(() => computeWindow(projects, new Date()), [projects]);

    if (roadmap.isLoading) return <p className="p-6">Loading…</p>;

    const scheduled = projects.filter(isScheduled);
    const unscheduled = projects.filter((p) => !isScheduled(p));

    return (
        <div className="overflow-x-auto p-6">
            <h1 className="mb-4 text-xl font-semibold">Roadmap</h1>
            {projects.length === 0 && <p className="text-gray-500">No projects yet.</p>}

            {scheduled.length > 0 && (
                <div className="min-w-[720px]">
                    <div className="flex border-b pb-1">
                        <div className="w-48 shrink-0" />
                        <div className="flex flex-1">
                            {window.months.map((m) => (
                                <div key={m.key} className="flex-1 border-l pl-1 text-xs text-gray-500">{m.label}</div>
                            ))}
                        </div>
                    </div>
                    {scheduled.map((p) => {
                        const g = barGeometry(window, p.start_date as string, p.target_date as string);
                        return (
                            <div key={p.id} className="flex items-center py-1">
                                <div className="w-48 shrink-0 truncate pr-2">
                                    <Link to={`/projects/${p.id}`} className="text-sm hover:underline">{p.name}</Link>
                                </div>
                                <div className="relative h-6 flex-1">
                                    <div
                                        data-testid={`bar-${p.id}`}
                                        className="absolute top-1 h-4 rounded"
                                        style={{ left: `${g.leftPct}%`, width: `${g.widthPct}%`, backgroundColor: p.color }}
                                        title={`${p.name} · ${p.start_date} → ${p.target_date} · ${p.status}`}
                                    />
                                    {p.milestones.map((m) => (
                                        <span
                                            key={m.id}
                                            data-testid={`ms-${m.id}`}
                                            className="absolute top-0 -translate-x-1/2 text-xs text-indigo-700"
                                            style={{ left: `${markerLeft(window, m.target_date)}%` }}
                                            title={`${m.name} · ${m.target_date}`}
                                        >◆</span>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {unscheduled.length > 0 && (
                <div className="mt-6">
                    <h2 className="mb-1 text-sm font-semibold text-gray-500">Unscheduled</h2>
                    <ul className="flex flex-wrap gap-3 text-sm">
                        {unscheduled.map((p) => (
                            <li key={p.id}><Link to={`/projects/${p.id}`} className="text-indigo-600 hover:underline">{p.name}</Link></li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}

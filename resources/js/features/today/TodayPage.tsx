import { canDevelop } from '../../auth/capabilities';
import { useMe } from '../../auth/useAuth';
import { firstName, greetingFor, todayLabel } from './greeting';
import { PlanSection } from './PlanSection';
import { usePlan } from './planHooks';
import { TodoCard } from './TodoCard';

/**
 * Today (P7-B, the Today v2 design): the tracker user's home. The date, a greeting on the highlighter, the day plan
 * and the personal to-dos.
 */
export default function TodayPage() {
    const me = useMe();
    const plan = usePlan();
    const now = new Date();
    const name = firstName(me.data?.name ?? '');

    return (
        <div style={{ maxWidth: 1140, margin: '0 auto', padding: '40px clamp(16px, 4vw, 44px) 70px' }}>
            <header style={{ marginBottom: 32 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg3)' }}>{todayLabel(now)}</div>
                <h1 style={{ margin: '6px 0 0', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(34px, 6vw, 52px)', letterSpacing: '-.035em', lineHeight: 1.02 }}>
                    {greetingFor(now.getHours())}{name ? `, ${name}` : ''}. Here’s <span className="hl">your day.</span>
                </h1>
            </header>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
                <PlanSection query={plan} plan={plan.data} canDone={canDevelop(me.data)} />
                <TodoCard />
            </div>
        </div>
    );
}

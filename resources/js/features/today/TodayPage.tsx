import { canDevelop } from '../../auth/capabilities';
import { useMe } from '../../auth/useAuth';
import { FocusTimeCard } from './FocusTimeCard';
import { firstName, greetingFor, todayLabel } from './greeting';
import { PlanSection } from './PlanSection';
import { usePlan, usePlanSuggestions } from './planHooks';
import { headline } from './planText';
import { TodoCard } from './TodoCard';

/**
 * Today (P7-B, the Today v2 design): the tracker user's home. The date, a greeting on the highlighter, the day plan
 * and the personal to-dos.
 */
export default function TodayPage() {
    const me = useMe();
    const plan = usePlan();
    const suggestions = usePlanSuggestions();
    const now = new Date();
    const name = firstName(me.data?.name ?? '');
    const line = plan.data ? headline(plan.data.items, suggestions.data?.length ?? null) : null;

    return (
        <div style={{ maxWidth: 1140, margin: '0 auto', padding: '40px clamp(16px, 4vw, 44px) 70px' }}>
            <header style={{ display: 'flex', alignItems: 'flex-end', gap: 32, flexWrap: 'wrap', marginBottom: 40 }}>
                <div style={{ flex: '1 1 420px', minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg3)' }}>{todayLabel(now)}</div>
                    <h1 style={{ margin: '6px 0 0', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(34px, 6vw, 52px)', letterSpacing: '-.035em', lineHeight: 1.02 }}>
                        {greetingFor(now.getHours())}{name ? `, ${name}` : ''}. Here’s <span className="hl">your day.</span>
                    </h1>
                    {line && (
                        <p data-testid="today-headline" style={{ margin: '16px 0 0', fontSize: 18, color: 'var(--fg2)', maxWidth: '56ch' }}>
                            <strong style={{ color: 'var(--fg)', fontWeight: 700 }}>{line.lead}</strong> {line.rest}
                        </p>
                    )}
                </div>
                {plan.data && <FocusTimeCard plan={plan.data} />}
            </header>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
                <PlanSection query={plan} plan={plan.data} canDone={canDevelop(me.data)} />
                <TodoCard />
            </div>
        </div>
    );
}

import { useRef, useState } from 'react';

import { Action, Problem } from '@/components/feature-ui';
import { addPlanToCalendar, calendarActionTitle } from '@/features/plan-calendar';
import type { CatchupPlan } from '@/features/plans';

export function PlanCalendarAction({ plan }: { plan: CatchupPlan }) {
  const opening = useRef(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');

  async function add() {
    if (opening.current || plan.status !== 'confirmed') return;
    if (new Date(plan.starts_at).getTime() <= Date.now()) {
      setProblem('This catch-up has already started.');
      return;
    }

    opening.current = true;
    setBusy(true);
    setProblem('');
    try {
      await addPlanToCalendar(plan);
    } catch {
      setProblem('Could not open your calendar. You can still view the plan here.');
    } finally {
      opening.current = false;
      setBusy(false);
    }
  }

  return (
    <>
      <Action title={calendarActionTitle} disabled={busy} onPress={add} />
      {problem ? <Problem message={problem} /> : null}
    </>
  );
}

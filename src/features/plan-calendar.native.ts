import type { CatchupPlan } from '@/features/plans';

export const calendarActionTitle = 'Add to calendar';

export async function addPlanToCalendar(plan: CatchupPlan) {
  const { createEventInCalendarAsync } = await import('expo-calendar/legacy');
  const startDate = new Date(plan.starts_at);
  await createEventInCalendarAsync({
    title: 'Tether catch-up',
    startDate,
    endDate: new Date(startDate.getTime() + plan.duration_minutes * 60_000),
    location: plan.place,
    notes: plan.note,
  });
}

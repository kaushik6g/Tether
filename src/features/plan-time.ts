const formatter = new Intl.DateTimeFormat(undefined, {
  weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
});

export function localPlanFields(date: Date) {
  const pad = (value: number) => String(value).padStart(2, '0');
  return {
    day: [date.getFullYear(), pad(date.getMonth() + 1), pad(date.getDate())].join('-'),
    time: [pad(date.getHours()), pad(date.getMinutes())].join(':'),
  };
}

export function parseLocalPlanTime(day: string, time: string): Date | null {
  const date = day.trim();
  const clock = time.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(clock)) return null;
  const local = new Date(date + 'T' + clock + ':00');
  if (!Number.isFinite(local.getTime())) return null;
  const roundTrip = localPlanFields(local);
  return roundTrip.day === date && roundTrip.time === clock ? local : null;
}

export function formatPlanTime(starts: string) {
  return formatter.format(new Date(starts));
}

export function localTimeZone() {
  return formatter.resolvedOptions().timeZone;
}

import type { CatchupPlan } from '@/features/plans';

export const calendarActionTitle = 'Download calendar file';

function calendarDate(input: Date) {
  return input.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function calendarText(text: string) {
  return text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/\\/g, '\\\\').replace(/\r\n|\r|\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

function fold(line: string) {
  const encoder = new TextEncoder();
  let result = '';
  let width = 0;
  for (const character of line) {
    const bytes = encoder.encode(character).length;
    if (width + bytes > 75) {
      result += '\r\n ';
      width = 1;
    }
    result += character;
    width += bytes;
  }
  return result;
}

export async function addPlanToCalendar(plan: CatchupPlan) {
  const start = new Date(plan.starts_at);
  const end = new Date(start.getTime() + plan.duration_minutes * 60_000);
  const content = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Tether//Catch-up plans//EN', 'BEGIN:VEVENT',
    'UID:' + plan.id + '@tether', 'DTSTAMP:' + calendarDate(new Date()),
    'DTSTART:' + calendarDate(start), 'DTEND:' + calendarDate(end),
    'SUMMARY:Tether catch-up', 'LOCATION:' + calendarText(plan.place), 'DESCRIPTION:' + calendarText(plan.note),
    'END:VEVENT', 'END:VCALENDAR', '',
  ].map(fold).join('\r\n');

  const url = URL.createObjectURL(new Blob([content], { type: 'text/calendar;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'tether-catch-up.ics';
  document.body.appendChild(link);
  try {
    link.click();
  } finally {
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

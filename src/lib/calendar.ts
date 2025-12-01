type CalendarEvent = {
  id: string;
  title: string;
  location?: string;
  start: Date;
  end: Date;
  allDay: boolean;
};

function formatDateKey(date: Date) {
  return date.toISOString().split('T')[0];
}

function getMonthBoundaries(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);
  return { timeMin: start.toISOString(), timeMax: end.toISOString() };
}

async function fetchCalendarEvents(calendarId: string, timeMin: string, timeMax: string) {
  const apiKey = import.meta.env.PUBLIC_DRIVE_API_KEY;
  if (!apiKey) throw new Error('Kein API Key');
  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
    calendarId,
  )}/events?key=${apiKey}&timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Calendar Fetch fehlgeschlagen');
  const data = await res.json();
  return (data.items || []).map((item: any) => {
    const start = item.start.date || item.start.dateTime;
    const end = item.end.date || item.end.dateTime;
    return {
      id: item.id,
      title: item.summary,
      location: item.location,
      start: new Date(start),
      end: new Date(end),
      allDay: Boolean(item.start.date),
    } as CalendarEvent;
  });
}

function buildSampleEvents(referenceDate: Date): CalendarEvent[] {
  const first = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 5, 9, 0);
  return [
    {
      id: 'demo-1',
      title: 'Team Lunch Catering',
      start: first,
      end: new Date(first.getTime() + 2 * 60 * 60 * 1000),
      location: 'Berlin',
      allDay: false,
    },
    {
      id: 'demo-2',
      title: 'Sommerfest',
      start: new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 14),
      end: new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 14),
      allDay: true,
    },
    {
      id: 'demo-3',
      title: 'Messe Tag 1',
      start: new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 22, 8),
      end: new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 22, 18),
      location: 'Hamburg Messe',
      allDay: false,
    },
  ];
}

function renderCalendarGrid(gridEl: HTMLElement, events: CalendarEvent[], referenceDate: Date) {
  gridEl.innerHTML = '';
  const firstDay = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
  const startWeekday = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0).getDate();

  for (let i = 0; i < startWeekday; i++) {
    const placeholder = document.createElement('div');
    gridEl.append(placeholder);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), day);
    const dateKey = formatDateKey(date);
    const dayEvents = events.filter((e) => formatDateKey(e.start) === dateKey);

    const cell = document.createElement('div');
    cell.className = 'calendar__day';

    const number = document.createElement('div');
    number.className = 'calendar__day-number';
    number.textContent = String(day);
    cell.append(number);

    if (dayEvents.length) {
      const badges = document.createElement('div');
      badges.className = 'calendar__day-badges';
      dayEvents.slice(0, 3).forEach((event) => {
        const badge = document.createElement('span');
        badge.className = 'calendar__badge';
        badge.textContent = event.title;
        badges.append(badge);
      });
      if (dayEvents.length > 3) {
        const more = document.createElement('span');
        more.className = 'calendar__badge calendar__badge--muted';
        more.textContent = `+${dayEvents.length - 3}`;
        badges.append(more);
      }
      cell.append(badges);
    }

    gridEl.append(cell);
  }
}

function renderEventList(listEl: HTMLElement, events: CalendarEvent[], badgeEl: HTMLElement) {
  listEl.innerHTML = '';
  badgeEl.textContent = `${events.length} Termine`;
  events
    .slice()
    .sort((a, b) => a.start.getTime() - b.start.getTime())
    .forEach((event) => {
      const item = document.createElement('li');
      item.className = 'calendar__event';
      const title = document.createElement('strong');
      title.textContent = event.title;
      const meta = document.createElement('div');
      meta.textContent = `${event.start.toLocaleDateString('de-DE', {
        weekday: 'short',
        day: '2-digit',
        month: 'long',
      })} · ${event.allDay ? 'Ganztägig' : `${event.start.toLocaleTimeString('de-DE', {
        hour: '2-digit',
        minute: '2-digit',
      })} – ${event.end.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`}`;
      if (event.location) {
        meta.textContent += ` · ${event.location}`;
      }
      item.append(title, meta);
      listEl.append(item);
    });
}

export function initAvailabilityCalendar() {
  const calendar = document.querySelector<HTMLElement>('.calendar');
  const gridEl = document.getElementById('calendar-grid');
  const monthEl = document.getElementById('calendar-month');
  const statusEl = document.getElementById('calendar-status');
  const badgeEl = document.getElementById('event-badge');
  const listEl = document.getElementById('calendar-events');
  const prev = document.getElementById('calendar-prev');
  const next = document.getElementById('calendar-next');
  if (!calendar || !gridEl || !monthEl || !statusEl || !badgeEl || !listEl || !prev || !next) return;

  let referenceDate = new Date();
  let events: CalendarEvent[] = [];

  async function load() {
    statusEl.textContent = 'Kalender wird geladen …';
    const { timeMin, timeMax } = getMonthBoundaries(referenceDate);
    try {
      const calendarId = calendar.dataset.calendarId || 'demo';
      events = await fetchCalendarEvents(calendarId, timeMin, timeMax);
      statusEl.textContent = `Live aus Google Calendar (${calendarId})`;
    } catch (error) {
      console.warn('Kalender Fehler, zeige Demo', error);
      events = buildSampleEvents(referenceDate);
      statusEl.textContent = 'Demo-Termine angezeigt';
    }
    monthEl.textContent = referenceDate.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
    renderCalendarGrid(gridEl, events, referenceDate);
    renderEventList(listEl, events, badgeEl);
  }

  prev.addEventListener('click', () => {
    referenceDate = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - 1, 1);
    load();
  });

  next.addEventListener('click', () => {
    referenceDate = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 1);
    load();
  });

  load();
}

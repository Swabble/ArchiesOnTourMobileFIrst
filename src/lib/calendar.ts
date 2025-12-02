type CalendarView = 'day' | 'week' | 'month' | 'agenda';

const monthFormatter = new Intl.DateTimeFormat('de-DE', { month: 'long', year: 'numeric' });
const dayFormatter = new Intl.DateTimeFormat('de-DE', {
  weekday: 'long',
  day: '2-digit',
  month: 'long',
  year: 'numeric'
});

function formatDateKey(date: Date) {
  return date.toISOString().split('T')[0];
}

function renderGrid(events: any[], grid: HTMLElement, reference: Date) {
  grid.innerHTML = '';
  const firstDay = new Date(reference.getFullYear(), reference.getMonth(), 1);
  const offset = (firstDay.getDay() + 6) % 7;
  for (let i = 0; i < offset; i++) {
    grid.appendChild(document.createElement('div'));
  }
  const days = new Date(reference.getFullYear(), reference.getMonth() + 1, 0).getDate();
  for (let day = 1; day <= days; day++) {
    const cell = document.createElement('div');
    cell.className = 'card calendar__day';
    const date = new Date(reference.getFullYear(), reference.getMonth(), day);
    const key = formatDateKey(date);
    const matches = events.filter((evt) => formatDateKey(new Date(evt.start)) === key);
    cell.innerHTML = `<div class="calendar__day-number">${day}</div>`;
    matches.slice(0, 3).forEach((evt) => {
      const badge = document.createElement('div');
      badge.className = 'price-pill';
      badge.textContent = evt.title;
      cell.appendChild(badge);
    });
    if (matches.length > 3) {
      const more = document.createElement('div');
      more.className = 'calendar__badge calendar__badge--muted';
      more.textContent = `+${matches.length - 3}`;
      cell.appendChild(more);
    }
    grid.appendChild(cell);
  }
}

function renderList(events: any[], list: HTMLElement) {
  list.innerHTML = '';
  const sorted = [...events].sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
  );
  sorted.forEach((evt) => {
    const item = document.createElement('article');
    item.className = 'card calendar__event';
    const start = new Date(evt.start);
    const end = new Date(evt.end);
    item.innerHTML = `
      <p class="price-pill">${start.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: 'long' })}</p>
      <h4>${evt.title}</h4>
      <p>${start.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} – ${end.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</p>
      <p>${evt.location ?? ''}</p>
    `;
    list.appendChild(item);
  });
}

function getDateRange(reference: Date, view: CalendarView) {
  const start = new Date(reference);
  const end = new Date(reference);

  if (view === 'month') {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    end.setMonth(reference.getMonth() + 1, 0);
    end.setHours(23, 59, 59, 999);
  } else if (view === 'week') {
    const day = reference.getDay();
    const diff = (day + 6) % 7; // Monday as first day
    start.setDate(reference.getDate() - diff);
    start.setHours(0, 0, 0, 0);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
  } else if (view === 'agenda') {
    start.setHours(0, 0, 0, 0);
    end.setDate(start.getDate() + 30);
    end.setHours(23, 59, 59, 999);
  } else {
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  }

  return { start, end };
}

function formatLabel(reference: Date, view: CalendarView) {
  if (view === 'day') {
    return dayFormatter.format(reference);
  }
  if (view === 'week') {
    const { start, end } = getDateRange(reference, view);
    return `${start.toLocaleDateString('de-DE')} – ${end.toLocaleDateString('de-DE')}`;
  }
  if (view === 'agenda') {
    const { start, end } = getDateRange(reference, view);
    return `Agenda: ${start.toLocaleDateString('de-DE')} – ${end.toLocaleDateString('de-DE')}`;
  }
  return monthFormatter.format(reference);
}

async function fetchEvents(reference: Date, view: CalendarView) {
  const apiKey = import.meta.env.PUBLIC_DRIVE_API_KEY;
  const calendarId = import.meta.env.PUBLIC_CALENDAR_ID;
  const { start, end } = getDateRange(reference, view);
  if (!apiKey || !calendarId) {
    throw new Error('Calendar configuration fehlt');
  }
  const timeMin = start.toISOString();
  const timeMax = end.toISOString();
  const url = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?key=${apiKey}&timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Calendar fetch failed');
  const data = await res.json();
  return (data.items || []).map((item: any) => ({
    id: item.id,
    title: item.summary,
    location: item.location,
    start: item.start?.date ? new Date(item.start.date) : new Date(item.start.dateTime),
    end: item.end?.date ? new Date(item.end.date) : new Date(item.end.dateTime)
  }));
}

function init() {
  const grid = document.getElementById('calendar-grid');
  const list = document.getElementById('calendar-events');
  const status = document.getElementById('calendar-status');
  const monthLabel = document.getElementById('calendar-month');
  const weekdays = document.getElementById('calendar-weekdays');
  const viewButtons = document.querySelectorAll<HTMLButtonElement>('[data-calendar-view]');
  if (!grid || !list || !status || !monthLabel || !weekdays || viewButtons.length === 0) return;
  let reference = new Date();
  let view: CalendarView = 'month';

  async function load() {
    status.textContent = 'Kalender wird geladen …';
    status.style.display = 'inline-flex';
    monthLabel.textContent = formatLabel(reference, view);
    try {
      const events = await fetchEvents(reference, view);
      if (view === 'month') {
        weekdays.style.display = 'grid';
        grid.style.display = 'grid';
        renderGrid(events, grid, reference);
      } else {
        weekdays.style.display = 'none';
        grid.style.display = 'none';
        grid.innerHTML = '';
      }
      renderList(events, list);
      status.textContent = '';
      status.style.display = 'none';
    } catch (err) {
      console.warn('Calendar Fehler', err);
      grid.style.display = view === 'month' ? 'grid' : 'none';
      weekdays.style.display = view === 'month' ? 'grid' : 'none';
      grid.innerHTML = '';
      list.innerHTML = '';
      status.textContent = 'Kalender konnte nicht geladen werden. Bitte API-Konfiguration prüfen.';
      status.style.display = 'inline-flex';
    }
  }

  function setView(next: CalendarView) {
    view = next;
    viewButtons.forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.calendarView === view);
    });
    load();
  }

  function shiftReference(direction: number) {
    if (view === 'month') {
      reference = new Date(reference.getFullYear(), reference.getMonth() + direction, 1);
    } else if (view === 'week') {
      reference = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate() + direction * 7);
    } else if (view === 'agenda') {
      reference = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate() + direction * 30);
    } else {
      reference = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate() + direction);
    }
    load();
  }

  document.getElementById('calendar-prev')?.addEventListener('click', () => shiftReference(-1));
  document.getElementById('calendar-next')?.addEventListener('click', () => shiftReference(1));

  viewButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const nextView = btn.dataset.calendarView as CalendarView | undefined;
      if (nextView) {
        setView(nextView);
      }
    });
  });

  load();
}

if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', init);
}

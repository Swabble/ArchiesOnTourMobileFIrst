type CalendarView = 'day' | 'week' | 'month' | 'agenda';

const monthFormatter = new Intl.DateTimeFormat('de-DE', { month: 'long', year: 'numeric' });
const dayFormatter = new Intl.DateTimeFormat('de-DE', {
  weekday: 'long',
  day: '2-digit',
  month: 'long',
  year: 'numeric'
});

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizeDate(dateInput: { date?: string; dateTime?: string }) {
  if (dateInput?.date) {
    return new Date(`${dateInput.date}T00:00:00`);
  }
  if (dateInput?.dateTime) {
    return new Date(dateInput.dateTime);
  }
  return new Date();
}

function renderGrid(
  events: any[],
  grid: HTMLElement,
  reference: Date,
  onDayHover: (dateKey?: string) => void
) {
  grid.innerHTML = '';
  const firstDay = new Date(reference.getFullYear(), reference.getMonth(), 1);
  const offset = (firstDay.getDay() + 6) % 7;
  for (let i = 0; i < offset; i++) {
    grid.appendChild(document.createElement('div'));
  }
  const days = new Date(reference.getFullYear(), reference.getMonth() + 1, 0).getDate();
  for (let day = 1; day <= days; day++) {
    const cell = document.createElement('div');
    cell.className = 'calendar__day';
    const date = new Date(reference.getFullYear(), reference.getMonth(), day);
    const key = formatDateKey(date);
    const matches = events.filter((evt) => formatDateKey(new Date(evt.start)) === key);
    cell.dataset.dateKey = key;
    cell.innerHTML = `
      <div class="calendar__day-number">${day}</div>
      <div class="calendar__markers" aria-hidden="true"></div>
    `;
    const markerContainer = cell.querySelector('.calendar__markers');
    matches.slice(0, 4).forEach((evt) => {
      const marker = document.createElement('span');
      marker.className = 'calendar__marker';
      marker.title = evt.title;
      markerContainer?.appendChild(marker);
    });
    if (matches.length > 4) {
      const more = document.createElement('span');
      more.className = 'calendar__marker calendar__marker--count';
      more.textContent = `+${matches.length - 4}`;
      markerContainer?.appendChild(more);
    }
    cell.addEventListener('mouseenter', () => onDayHover(matches.length ? key : undefined));
    cell.addEventListener('mouseleave', () => onDayHover(undefined));
    grid.appendChild(cell);
  }
}

function renderList(events: any[], list: HTMLElement, onEventHover: (dateKey?: string) => void) {
  list.innerHTML = '';
  const sorted = [...events].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  sorted.forEach((evt) => {
    const item = document.createElement('article');
    item.className = 'card calendar__event';

    const eventDateKey = formatDateKey(new Date(evt.start));
    item.dataset.dateKey = eventDateKey;

    const start = new Date(evt.start);
    const end = new Date(evt.end);
    const weekdayLabel = start.toLocaleDateString('de-DE', { weekday: 'short' });
    const dayNumber = start.toLocaleDateString('de-DE', { day: '2-digit' });
    const monthLabel = start.toLocaleDateString('de-DE', { month: 'short' });
    const timeRange = `${start.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} – ${end.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`;

    item.innerHTML = `
      <div class="event-date">
        <span class="weekday">${weekdayLabel}</span>
        <span class="day-number">${dayNumber}</span>
        <span class="month">${monthLabel}</span>
      </div>
      <div class="event-content">
        <div class="event-header">
          <h4 class="event-title">${evt.title}</h4>
          <span class="pill-muted">Termin</span>
        </div>
        <div class="event-meta">
          <span class="meta-chip">🕑 ${timeRange}</span>
          ${evt.location ? `<span class="meta-chip">📍 ${evt.location}</span>` : ''}
        </div>
      </div>
    `;

    // Add hover listeners to events
    item.addEventListener('mouseenter', () => onEventHover(eventDateKey));
    item.addEventListener('mouseleave', () => onEventHover(undefined));

    list.appendChild(item);
  });
}

function highlightEvents(list: HTMLElement, highlightDateKey?: string) {
  const hasHighlight = Boolean(highlightDateKey);
  list.querySelectorAll<HTMLElement>('.calendar__event').forEach((item) => {
    const matches = hasHighlight && item.dataset.dateKey === highlightDateKey;
    item.classList.toggle('calendar__event--active', matches);
  });
}

function highlightDay(grid: HTMLElement, highlightDateKey?: string) {
  const hasHighlight = Boolean(highlightDateKey);
  grid.querySelectorAll<HTMLElement>('.calendar__day').forEach((cell) => {
    const matches = hasHighlight && cell.dataset.dateKey === highlightDateKey;
    cell.classList.toggle('calendar__day--active', matches);
  });
}

function getDateRange(reference: Date) {
  const start = new Date(reference);
  const end = new Date(reference);

  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  end.setMonth(reference.getMonth() + 1, 0);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

function formatLabel(reference: Date) {
  return monthFormatter.format(reference);
}

async function fetchEvents(reference: Date) {
  const apiKey = import.meta.env.PUBLIC_DRIVE_API_KEY;
  const calendarId = import.meta.env.PUBLIC_CALENDAR_ID;
  const { start, end } = getDateRange(reference);
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
    start: normalizeDate(item.start),
    end: normalizeDate(item.end)
  }));
}

function init() {
  const grid = document.getElementById('calendar-grid');
  const list = document.getElementById('calendar-events');
  const status = document.getElementById('calendar-status');
  const monthLabel = document.getElementById('calendar-month');
  const weekdays = document.getElementById('calendar-weekdays');
  if (!grid || !list || !status || !monthLabel || !weekdays) return;
  let reference = new Date();
  let currentEvents: any[] = [];

  function handleHover(dateKey?: string) {
    highlightEvents(list, dateKey);
    highlightDay(grid, dateKey);
  }

  async function load() {
    status.textContent = 'Kalender wird geladen …';
    status.style.display = 'inline-flex';
    monthLabel.textContent = formatLabel(reference);
    try {
      const events = await fetchEvents(reference);
      currentEvents = events;
      weekdays.style.display = 'grid';
      grid.style.display = 'grid';
      renderGrid(events, grid, reference, handleHover);
      renderList(events, list, handleHover);
      highlightEvents(list);
      highlightDay(grid);
      status.textContent = '';
      status.style.display = 'none';
    } catch (err) {
      console.warn('Calendar Fehler', err);
      grid.style.display = 'grid';
      weekdays.style.display = 'grid';
      grid.innerHTML = '';
      list.innerHTML = '';
      status.textContent = 'Kalender konnte nicht geladen werden. Bitte API-Konfiguration prüfen.';
      status.style.display = 'inline-flex';
    }
  }

  function shiftReference(direction: number) {
    reference = new Date(reference.getFullYear(), reference.getMonth() + direction, 1);
    load();
  }

  document.getElementById('calendar-prev')?.addEventListener('click', () => shiftReference(-1));
  document.getElementById('calendar-next')?.addEventListener('click', () => shiftReference(1));

  load();
}

if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', init);
}

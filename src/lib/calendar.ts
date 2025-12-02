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
    cell.addEventListener('mouseenter', () => onDayHover(matches.length ? key : undefined));
    cell.addEventListener('mouseleave', () => onDayHover(undefined));
    grid.appendChild(cell);
  }
}

function renderList(events: any[], list: HTMLElement, filterDateKey?: string) {
  list.innerHTML = '';
  const sorted = [...events].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  const filteredCandidates = filterDateKey
    ? sorted.filter((evt) => formatDateKey(new Date(evt.start)) === filterDateKey)
    : sorted;
  const filtered = filterDateKey && filteredCandidates.length > 0 ? filteredCandidates : sorted;
  filtered.forEach((evt) => {
    const item = document.createElement('article');
    item.className = 'card calendar__event';
    if (filterDateKey) {
      item.classList.add('calendar__event--active');
    }
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
    renderList(currentEvents, list, dateKey);
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
      renderList(events, list);
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

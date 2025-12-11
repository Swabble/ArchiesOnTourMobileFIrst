const monthFormatter = new Intl.DateTimeFormat('de-DE', { month: 'long', year: 'numeric' });

function formatTimeRange(start: Date, end: Date) {
  return `${start.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} – ${end.toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit'
  })}`;
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

function renderMonthGrid(grid: HTMLElement, reference: Date) {
  grid.innerHTML = '';
  grid.setAttribute('aria-label', `Kalenderübersicht für ${formatLabel(reference)}`);

  const firstDay = new Date(reference.getFullYear(), reference.getMonth(), 1);
  const offset = (firstDay.getDay() + 6) % 7;
  const totalDays = new Date(reference.getFullYear(), reference.getMonth() + 1, 0).getDate();

  for (let i = 0; i < offset; i++) {
    const spacer = document.createElement('div');
    spacer.className = 'month-grid__spacer';
    spacer.setAttribute('aria-hidden', 'true');
    grid.appendChild(spacer);
  }

  for (let day = 1; day <= totalDays; day++) {
    const cell = document.createElement('div');
    cell.className = 'month-grid__day';
    cell.textContent = String(day);
    cell.setAttribute('aria-label', `${day}. ${formatLabel(reference)}`);
    grid.appendChild(cell);
  }
}

function renderMonthEvents(events: any[], list: HTMLElement, reference: Date) {
  list.innerHTML = '';
  list.setAttribute('aria-label', `Terminliste für ${formatLabel(reference)}`);

  if (!events.length) {
    const empty = document.createElement('p');
    empty.className = 'calendar__empty';
    empty.textContent = 'Keine Termine in diesem Monat.';
    list.appendChild(empty);
    return;
  }

  const sorted = [...events].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  sorted.forEach((evt) => {
    const item = document.createElement('article');
    item.className = 'month-event';

    const start = new Date(evt.start);
    const end = new Date(evt.end);
    const weekdayLabel = start.toLocaleDateString('de-DE', { weekday: 'short' });
    const dayLabel = start.toLocaleDateString('de-DE', { day: '2-digit' });
    const monthLabel = start.toLocaleDateString('de-DE', { month: 'short' });
    const timeRange = formatTimeRange(start, end);

    item.innerHTML = `
      <div class="event-date">
        <span class="weekday">${weekdayLabel}</span>
        <span class="day-number">${dayLabel}</span>
        <span class="weekday">${monthLabel}</span>
      </div>
      <div class="event-content">
        <div class="event-header">
          <h4 class="month-event__title">${evt.title}</h4>
        </div>
        <div class="month-event__meta">
          <span class="meta-chip">🕑 ${timeRange}</span>
          ${evt.location ? `<span class="meta-chip">📍 ${evt.location}</span>` : ''}
        </div>
      </div>
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

function isWithinRange(date: Date, start: Date, end: Date) {
  return date.getTime() >= start.getTime() && date.getTime() <= end.getTime();
}

let cachedStaticEvents: any[] | null = null;

function normalizeEventDates(evt: any) {
  const normalize = (value: any) => {
    if (value instanceof Date) return value;
    if (typeof value === 'string') return normalizeDate({ dateTime: value });
    return normalizeDate(value || {});
  };

  return {
    ...evt,
    start: normalize(evt.start),
    end: normalize(evt.end)
  };
}

async function loadStaticEvents() {
  if (cachedStaticEvents) return cachedStaticEvents;
  try {
    const response = await fetch('/data/calendar.json');
    if (!response.ok) return null;
    const payload = await response.json();
    const events = Array.isArray(payload?.events) ? payload.events : Array.isArray(payload) ? payload : [];
    cachedStaticEvents = events.map((evt: any) => normalizeEventDates(evt));
    return cachedStaticEvents;
  } catch (error) {
    return null;
  }
}

async function fetchEvents(reference: Date) {
  const { start, end } = getDateRange(reference);
  const staticEvents = await loadStaticEvents();
  if (staticEvents?.length) {
    return staticEvents.filter((evt) => isWithinRange(new Date(evt.start), start, end));
  }

  const apiKey = import.meta.env.PUBLIC_DRIVE_API_KEY;
  const calendarId = import.meta.env.PUBLIC_CALENDAR_ID;
  if (!apiKey || !calendarId) {
    throw new Error('Calendar configuration fehlt');
  }
  const timeMin = start.toISOString();
  const timeMax = end.toISOString();
  const url = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?key=${apiKey}&timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Calendar fetch failed');
  const data = await res.json();
  return (data.items || [])
    .map((item: any) => ({
      id: item.id,
      title: item.summary,
      location: item.location,
      start: normalizeDate(item.start),
      end: normalizeDate(item.end)
    }))
    .filter((item: any) => isWithinRange(new Date(item.start), start, end));
}

function init() {
  const grid = document.getElementById('calendar-month-grid');
  const monthList = document.getElementById('calendar-month-events');
  const status = document.getElementById('calendar-status');
  const monthLabel = document.getElementById('calendar-month');
  const prevButton = document.getElementById('calendar-prev');
  const nextButton = document.getElementById('calendar-next');
  if (!grid || !monthList || !status || !monthLabel || !prevButton || !nextButton) return;
  let reference = new Date();

  function updateNavigationLabels() {
    const prevMonth = new Date(reference.getFullYear(), reference.getMonth() - 1, 1);
    const nextMonth = new Date(reference.getFullYear(), reference.getMonth() + 1, 1);
    prevButton.setAttribute('aria-label', `Vorheriger Monat: ${formatLabel(prevMonth)}`);
    nextButton.setAttribute('aria-label', `Nächster Monat: ${formatLabel(nextMonth)}`);
  }

  async function load() {
    status.textContent = 'Kalender wird geladen …';
    status.style.display = 'inline-flex';
    monthLabel.textContent = formatLabel(reference);
    updateNavigationLabels();
    try {
      const events = await fetchEvents(reference);
      renderMonthGrid(grid, reference);
      renderMonthEvents(events, monthList, reference);
      status.textContent = '';
      status.style.display = 'none';
    } catch (err) {
      console.warn('Calendar Fehler', err);
      grid.innerHTML = '';
      monthList.innerHTML = '';
      monthList.setAttribute('aria-label', `Terminliste für ${formatLabel(reference)}`);
      status.textContent = 'Kalender konnte nicht geladen werden. Bitte API-Konfiguration prüfen.';
      status.style.display = 'inline-flex';
    }
  }

  function shiftReference(direction: number) {
    reference = new Date(reference.getFullYear(), reference.getMonth() + direction, 1);
    load();
  }

  prevButton.addEventListener('click', () => shiftReference(-1));
  nextButton.addEventListener('click', () => shiftReference(1));

  load();
}

if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', init);
}

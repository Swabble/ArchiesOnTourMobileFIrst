const monthFormatter = new Intl.DateTimeFormat('de-DE', { month: 'long', year: 'numeric' });

function formatDateKey(date: Date) {
  return date.toISOString().split('T')[0];
}

function sampleEvents(reference: Date) {
  const base = new Date(reference.getFullYear(), reference.getMonth(), 5);
  return [
    { id: '1', title: 'Sommerfest', start: base, end: new Date(base.getFullYear(), base.getMonth(), base.getDate(), 18), location: 'Köln' },
    { id: '2', title: 'Messecatering', start: new Date(base.getFullYear(), base.getMonth(), base.getDate() + 8), end: new Date(base.getFullYear(), base.getMonth(), base.getDate() + 8, 20), location: 'Düsseldorf' }
  ];
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
  events.forEach((evt) => {
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

async function fetchEvents(reference: Date) {
  const apiKey = import.meta.env.PUBLIC_DRIVE_API_KEY;
  const calendarId = import.meta.env.PUBLIC_CALENDAR_ID;
  if (!apiKey || !calendarId) return sampleEvents(reference);
  const timeMin = new Date(reference.getFullYear(), reference.getMonth(), 1).toISOString();
  const timeMax = new Date(reference.getFullYear(), reference.getMonth() + 1, 0, 23, 59, 59).toISOString();
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
  if (!grid || !list || !status || !monthLabel) return;
  let reference = new Date();

  async function load() {
    status.textContent = 'Kalender wird geladen …';
    monthLabel.textContent = monthFormatter.format(reference);
    try {
      const events = await fetchEvents(reference);
      renderGrid(events, grid, reference);
      renderList(events, list);
      status.textContent = 'Live oder Demo-Kalender';
    } catch (err) {
      console.warn('Calendar fallback', err);
      const events = sampleEvents(reference);
      renderGrid(events, grid, reference);
      renderList(events, list);
      status.textContent = 'Beispieltermine angezeigt';
    }
  }

  document.getElementById('calendar-prev')?.addEventListener('click', () => {
    reference = new Date(reference.getFullYear(), reference.getMonth() - 1, 1);
    load();
  });
  document.getElementById('calendar-next')?.addEventListener('click', () => {
    reference = new Date(reference.getFullYear(), reference.getMonth() + 1, 1);
    load();
  });

  load();
}

if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', init);
}

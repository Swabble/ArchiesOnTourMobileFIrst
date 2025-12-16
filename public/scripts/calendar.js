const monthFormatter = new Intl.DateTimeFormat('de-DE', { month: 'long', year: 'numeric' });
const dayFormatter = new Intl.DateTimeFormat('de-DE', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric'
});
function resolvePublicPath(relativePath) {
    const trimmed = relativePath.replace(/^\/+/, '');
    try {
        return new URL(trimmed, window.location.href).toString();
    }
    catch (error) {
        console.warn('Konnte Pfad nicht relativ zum aktuellen Dokument auflösen, fallback auf Basis-URL', error);
    }
    return `/${trimmed}`;
}
function formatTimeRange(start, end) {
    return `${start.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} – ${end.toLocaleTimeString('de-DE', {
        hour: '2-digit',
        minute: '2-digit'
    })}`;
}
function formatDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}
function normalizeDate(dateInput) {
    if (dateInput === null || dateInput === void 0 ? void 0 : dateInput.date) {
        return new Date(`${dateInput.date}T00:00:00`);
    }
    if (dateInput === null || dateInput === void 0 ? void 0 : dateInput.dateTime) {
        return new Date(dateInput.dateTime);
    }
    return new Date();
}
function renderGrid(events, grid, reference, onDayHover) {
    grid.innerHTML = '';
    const firstDay = new Date(reference.getFullYear(), reference.getMonth(), 1);
    const offset = (firstDay.getDay() + 6) % 7;
    for (let i = 0; i < offset; i++) {
        grid.appendChild(document.createElement('div'));
    }
    const days = new Date(reference.getFullYear(), reference.getMonth() + 1, 0).getDate();
    for (let day = 1; day <= days; day++) {
        const cell = document.createElement('div');
        const date = new Date(reference.getFullYear(), reference.getMonth(), day);
        const key = formatDateKey(date);
        const matches = events.filter((evt) => formatDateKey(new Date(evt.start)) === key);
        cell.className = `card calendar__day ${matches.length ? 'calendar__day--busy' : 'calendar__day--free'}`;
        cell.dataset.dateKey = key;
        const hasEvents = matches.length > 0;
        cell.innerHTML = `
      <div class="calendar__day-header">
        <div class="calendar__day-number">${day}</div>
        <span
          class="calendar__day-status ${hasEvents ? 'calendar__day-status--busy' : 'calendar__day-status--free'}"
          aria-label="${hasEvents ? 'Belegt' : 'Frei'}"
        ></span>
      </div>
      <div class="calendar__chips" aria-hidden="true"></div>
      <div class="calendar__event-bar ${hasEvents ? 'calendar__event-bar--busy' : ''}" aria-hidden="true"></div>
    `;
        cell.setAttribute('aria-label', `${day}. ${monthFormatter.format(reference)} – ${hasEvents ? 'Termine vorhanden' : 'keine Termine'}`);
        const chipContainer = cell.querySelector('.calendar__chips');
        matches.slice(0, 3).forEach((evt) => {
            const chip = document.createElement('span');
            chip.className = 'calendar__chip';
            chip.textContent = evt.title;
            chipContainer === null || chipContainer === void 0 ? void 0 : chipContainer.appendChild(chip);
        });
        if (matches.length > 3) {
            const more = document.createElement('span');
            more.className = 'calendar__chip calendar__chip--count';
            more.textContent = `+${matches.length - 3} weitere`;
            chipContainer === null || chipContainer === void 0 ? void 0 : chipContainer.appendChild(more);
        }
        cell.addEventListener('mouseenter', () => onDayHover(matches.length ? key : undefined));
        cell.addEventListener('mouseleave', () => onDayHover(undefined));
        grid.appendChild(cell);
    }
}
function renderMonthEvents(events, list, onEventHover) {
    list.innerHTML = '';
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
        const eventDateKey = formatDateKey(new Date(evt.start));
        item.dataset.dateKey = eventDateKey;
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
        item.addEventListener('mouseenter', () => onEventHover(eventDateKey));
        item.addEventListener('mouseleave', () => onEventHover(undefined));
        list.appendChild(item);
    });
}
function highlightMonthEvents(list, highlightDateKey) {
    const hasHighlight = Boolean(highlightDateKey);
    list.querySelectorAll('.month-event').forEach((item) => {
        const matches = hasHighlight && item.dataset.dateKey === highlightDateKey;
        item.classList.toggle('month-event--active', matches);
    });
}
function highlightDay(grid, highlightDateKey) {
    const hasHighlight = Boolean(highlightDateKey);
    grid.querySelectorAll('.calendar__day').forEach((cell) => {
        const matches = hasHighlight && cell.dataset.dateKey === highlightDateKey;
        cell.classList.toggle('calendar__day--active', matches);
    });
}
function getDateRange(reference) {
    const start = new Date(reference);
    const end = new Date(reference);
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    end.setMonth(reference.getMonth() + 1, 0);
    end.setHours(23, 59, 59, 999);
    return { start, end };
}
function formatLabel(reference) {
    return monthFormatter.format(reference);
}
let cachedStaticEvents = null;
function normalizeEventDates(evt) {
    const normalize = (value) => {
        if (value instanceof Date)
            return value;
        if (typeof value === 'string')
            return normalizeDate({ dateTime: value });
        return normalizeDate(value || {});
    };
    return {
        ...evt,
        start: normalize(evt.start),
        end: normalize(evt.end)
    };
}
async function loadStaticEvents() {
    if (cachedStaticEvents)
        return cachedStaticEvents;
    try {
        const response = await fetch(resolvePublicPath('data/calendar.json'));
        if (!response.ok)
            return null;
        const payload = await response.json();
        const events = Array.isArray(payload === null || payload === void 0 ? void 0 : payload.events) ? payload.events : Array.isArray(payload) ? payload : [];
        cachedStaticEvents = events.map((evt) => normalizeEventDates(evt));
        return cachedStaticEvents;
    }
    catch (error) {
        return null;
    }
}
async function fetchEvents(reference) {
    const staticEvents = await loadStaticEvents();
    // Return static events or empty array if not available
    // No client-side API fallback - all data must be fetched at build time
    if (!staticEvents) {
        console.warn('Keine Kalender-Daten verfügbar. Build-Prozess muss ausgeführt werden.');
        return [];
    }
    return staticEvents;
}
function init() {
    var _a, _b;
    const grid = document.getElementById('calendar-month-grid');
    const monthList = document.getElementById('calendar-month-events');
    const status = document.getElementById('calendar-status');
    const monthLabel = document.getElementById('calendar-month');
    if (!grid || !monthList || !status || !monthLabel)
        return;
    let reference = new Date();
    let activeDateKey;
    function handleHover(dateKey) {
        activeDateKey = dateKey;
        highlightMonthEvents(monthList, dateKey);
        highlightDay(grid, dateKey);
    }
    async function load() {
        status.textContent = 'Kalender wird geladen …';
        status.style.display = 'inline-flex';
        monthLabel.textContent = formatLabel(reference);
        try {
            const events = await fetchEvents(reference);
            renderGrid(events, grid, reference, handleHover);
            renderMonthEvents(events, monthList, handleHover);
            handleHover(undefined);
            status.textContent = '';
            status.style.display = 'none';
        }
        catch (err) {
            console.warn('Calendar Fehler', err);
            grid.innerHTML = '';
            status.textContent = 'Kalender konnte nicht geladen werden. Bitte API-Konfiguration prüfen.';
            status.style.display = 'inline-flex';
        }
    }
    function shiftReference(direction) {
        reference = new Date(reference.getFullYear(), reference.getMonth() + direction, 1);
        load();
    }
    (_a = document.getElementById('calendar-prev')) === null || _a === void 0 ? void 0 : _a.addEventListener('click', () => shiftReference(-1));
    (_b = document.getElementById('calendar-next')) === null || _b === void 0 ? void 0 : _b.addEventListener('click', () => shiftReference(1));
    load();
}
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', init);
}

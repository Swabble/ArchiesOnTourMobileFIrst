const HEADER_MAP = {
    produkt: 'title',
    titel: 'title',
    name: 'title',
    'preis in €': 'price',
    preis: 'price',
    beschreibung: 'description',
    'einheit / größe': 'unit',
    einheit: 'unit',
    größe: 'unit',
    hinweise: 'notes',
    kategorie: 'category',
    überkategorie: 'superCategory',
    anzahl: 'quantity'
};
export const FALLBACK_ITEMS = [
    {
        title: 'Signature Burger',
        description: 'Rindfleisch-Patty, Cheddar, karamellisierte Zwiebeln, Haus-Sauce',
        price: '11.90',
        unit: 'pro Stück',
        category: 'Burger'
    },
    {
        title: 'Veggie Bowl',
        description: 'Geröstetes Gemüse, Quinoa, Kräuter-Dip',
        price: '10.50',
        unit: 'pro Portion',
        category: 'Bowls'
    },
    {
        title: 'Hauslimonade',
        description: 'Zitrone-Ingwer, wenig Zucker',
        price: '3.90',
        unit: '0,33l',
        category: 'Getränke'
    }
];
const LOG_PREFIX = '[menu-parse]';
function log(logger, level, message, details) {
    var _a;
    const fn = (_a = logger[level]) !== null && _a !== void 0 ? _a : console[level];
    if (typeof fn !== 'function')
        return;
    fn(LOG_PREFIX, message, details !== null && details !== void 0 ? details : '');
}
function normalizeValue(value) {
    if (value === null || value === undefined)
        return '';
    if (typeof value === 'string')
        return value;
    if (typeof value === 'number' || typeof value === 'boolean')
        return String(value);
    return '';
}
export function mapRowToItem(row, logger = console) {
    const item = {};
    Object.entries(row).forEach(([rawKey, value]) => {
        var _a;
        const normalizedKey = rawKey.toString().trim().toLowerCase();
        const key = (_a = HEADER_MAP[normalizedKey]) !== null && _a !== void 0 ? _a : normalizedKey;
        const normalizedValue = normalizeValue(value);
        if (key)
            item[key] = normalizedValue.trim();
    });
    if (!item.title && !item.category) {
        log(logger, 'debug', 'Skipping row without title/category', row);
    }
    return item;
}
export function parseMatrix(headers, rows, logger = console) {
    log(logger, 'info', 'Parsing matrix', { headers, rowCount: rows.length });
    return rows
        .map((columns) => {
        const record = {};
        headers.forEach((header, idx) => {
            var _a;
            record[header] = (_a = columns[idx]) !== null && _a !== void 0 ? _a : '';
        });
        return record;
    })
        .map((record) => mapRowToItem(record, logger))
        .filter((item) => item.title || item.category);
}
export function parseCsv(text, logger = console) {
    const trimmed = text.trim();
    if (!trimmed)
        return [];
    const lines = trimmed.split(/\r?\n/).filter(Boolean);
    const delimiter = lines[0].includes('\t') ? '\t' : lines[0].includes(';') ? ';' : ',';
    log(logger, 'info', 'Detected CSV delimiter', { delimiter });
    const headers = lines[0].split(delimiter).map((h) => h.trim());
    const rows = lines.slice(1).map((line) => line.split(delimiter));
    return parseMatrix(headers, rows, logger);
}
export function parseJsonPayload(text, logger = console) {
    try {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) {
            log(logger, 'info', 'Parsing JSON array payload', { length: parsed.length });
            return parsed.map((entry) => mapRowToItem(entry, logger));
        }
        if (Array.isArray(parsed === null || parsed === void 0 ? void 0 : parsed.values)) {
            const [headerRow, ...dataRows] = parsed.values;
            if (!headerRow)
                return [];
            log(logger, 'info', 'Parsing JSON matrix payload', { rowCount: dataRows.length });
            return parseMatrix(headerRow, dataRows, logger);
        }
    }
    catch (err) {
        log(logger, 'warn', 'Menu JSON parse failed', { error: err.message });
    }
    return [];
}
export function parseMenuPayload(text, contentType, logger = console) {
    var _a;
    const normalizedType = (_a = contentType === null || contentType === void 0 ? void 0 : contentType.toLowerCase()) !== null && _a !== void 0 ? _a : '';
    const items = normalizedType.includes('application/json')
        ? parseJsonPayload(text, logger)
        : parseCsv(text, logger);
    log(logger, 'info', 'Parsed menu result', { itemCount: items.length });
    return items;
}

import type { MenuData, MenuItem } from './menuTypes';
import { storage } from './storage';

const CACHE_KEY = 'archie_menu_v1';
const CATEGORY_ORDER = [
  'Burger',
  'Getränke',
  'Snack',
  'Beilage',
  'Dessert',
  'Topping',
  'Sauce',
  'Sonstiges',
];

const FALLBACK_MENU: MenuItem[] = [
  {
    title: 'Smash Burger',
    price: '12.50',
    description: 'Rind, Cheddar, hausgemachte Sauce, Brioche Bun',
    unit: 'pro Stück',
    category: 'Burger',
  },
  {
    title: 'Veggie Burger',
    price: '11.00',
    description: 'Geröstetes Gemüse, Halloumi, Zitronen-Mayo',
    unit: 'pro Stück',
    category: 'Burger',
  },
  {
    title: 'Pommes Rustikal',
    price: '4.50',
    description: 'Mit Rosmarinsalz',
    category: 'Beilage',
  },
  {
    title: 'Hauslimo',
    price: '3.90',
    description: 'Zitrone-Minze oder Rhabarber',
    category: 'Getränke',
  },
  {
    title: 'Coleslaw',
    price: '3.50',
    description: 'Frischer Krautsalat',
    category: 'Beilage',
    superCategory: 'Add-on',
  },
];

const columnMap: Record<string, keyof MenuItem> = {
  titel: 'title',
  name: 'title',
  produkt: 'title',
  preis: 'price',
  'preis in €': 'price',
  'preis pro einheit': 'price',
  beschreibung: 'description',
  notes: 'description',
  einheit: 'unit',
  'einheit / größe': 'unit',
  hinweis: 'notes',
  hinweise: 'notes',
  kategorie: 'category',
  category: 'category',
  überkategorie: 'superCategory',
  ueberkategorie: 'superCategory',
  anzahl: 'quantity',
  quantity: 'quantity',
  menge: 'quantity',
};

function normalizeRow(row: Record<string, string>): MenuItem | null {
  const item: Partial<MenuItem> = {};
  Object.entries(row).forEach(([key, value]) => {
    const normalizedKey = key.trim().toLowerCase();
    const target = columnMap[normalizedKey];
    if (!target) return;
    item[target] = value?.trim();
  });
  if (!item.title || !item.category) return null;
  item.price = formatPrice(item.price ?? '0');
  return item as MenuItem;
}

export function normalizeMenuRows(rows: Record<string, string>[]): MenuItem[] {
  return rows
    .map(normalizeRow)
    .filter(Boolean)
    .map((item) => ({ ...item!, title: item!.title.trim() }));
}

export function formatPrice(price: string | number): string {
  const numeric = Number(String(price).replace(/[^0-9,.-]/g, '').replace(',', '.')) || 0;
  return `${numeric.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €`;
}

async function fetchCsv(url: string, signal: AbortSignal): Promise<string> {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error('CSV Fetch fehlgeschlagen');
  return response.text();
}

function parseCsv(text: string): Record<string, string>[] {
  const [headerLine, ...rows] = text.split(/\r?\n/).filter(Boolean);
  const headers = headerLine.split(',').map((h) => h.trim());
  return rows.map((line) => {
    const values = line.split(',');
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      obj[h] = values[idx] ?? '';
    });
    return obj;
  });
}

async function loadRemoteMenu(): Promise<MenuItem[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const sheetUrl = import.meta.env.PUBLIC_MENU_SHEET_URL;
    if (!sheetUrl) throw new Error('Keine Sheet URL gesetzt');
    const text = await fetchCsv(sheetUrl, controller.signal);
    const rows = parseCsv(text);
    const normalized = normalizeMenuRows(rows);
    if (!normalized.length) throw new Error('Keine Menüeinträge gefunden');
    return normalized;
  } finally {
    clearTimeout(timeout);
  }
}

function groupByCategory(items: MenuItem[]) {
  const groups = new Map<string, MenuItem[]>();
  items.forEach((item) => {
    const list = groups.get(item.category) ?? [];
    list.push(item);
    groups.set(item.category, list);
  });
  return groups;
}

function renderMenu(container: HTMLElement, items: MenuItem[]) {
  container.innerHTML = '';
  const groups = groupByCategory(items);
  const sortedCategories = Array.from(groups.keys()).sort(
    (a, b) => CATEGORY_ORDER.indexOf(a) - CATEGORY_ORDER.indexOf(b),
  );

  sortedCategories.forEach((category) => {
    const section = document.createElement('section');
    section.className = 'menu-category-section';

    const header = document.createElement('div');
    header.className = 'menu-category-header';
    const title = document.createElement('h3');
    title.className = 'menu-category-title';
    title.textContent = category;
    const count = document.createElement('span');
    count.className = 'menu-category-count';
    count.textContent = `${groups.get(category)?.length ?? 0} Artikel`;
    header.append(title, count);
    section.append(header);

    const grid = document.createElement('div');
    grid.className = 'menu-grid';

    groups.get(category)?.forEach((item) => {
      const card = document.createElement('article');
      card.className = `menu-card ${item.superCategory ? 'menu-card--addon' : ''}`;

      const headerRow = document.createElement('div');
      headerRow.className = 'menu-card__header';
      const itemTitle = document.createElement('h4');
      itemTitle.className = 'menu-card__title';
      itemTitle.textContent = item.title;
      const price = document.createElement('span');
      price.className = 'menu-card__price';
      price.textContent = item.price;
      headerRow.append(itemTitle, price);

      const desc = document.createElement('p');
      desc.textContent = item.description ?? '';

      const meta = document.createElement('div');
      meta.className = 'menu-card__meta';
      if (item.unit) {
        const unit = document.createElement('span');
        unit.className = 'menu-card__badge';
        unit.textContent = item.unit;
        meta.append(unit);
      }
      if (item.notes) {
        const badge = document.createElement('span');
        badge.className = 'menu-card__badge';
        badge.textContent = item.notes;
        meta.append(badge);
      }
      if (item.quantity) {
        const qty = document.createElement('span');
        qty.className = 'menu-card__badge';
        qty.textContent = item.quantity;
        meta.append(qty);
      }

      card.append(headerRow);
      if (item.description) card.append(desc);
      if (meta.children.length) card.append(meta);
      grid.append(card);
    });

    section.append(grid);
    container.append(section);
  });
}

export async function fetchMenuItems(): Promise<MenuItem[]> {
  const cached = storage.get<MenuData>(CACHE_KEY);
  if (cached?.items?.length) {
    // schedule background refresh
    void loadRemoteMenu()
      .then((fresh) => storage.set(CACHE_KEY, { items: fresh, updatedAt: Date.now() }))
      .catch(() => undefined);
    return cached.items;
  }

  try {
    const items = await loadRemoteMenu();
    storage.set(CACHE_KEY, { items, updatedAt: Date.now() });
    return items;
  } catch (error) {
    console.warn('Remote Menü fehlgeschlagen, fallback', error);
    storage.set(CACHE_KEY, { items: FALLBACK_MENU, updatedAt: Date.now() });
    return FALLBACK_MENU;
  }
}

export async function initMenuSection() {
  const loadingEl = document.getElementById('menu-loading');
  const errorEl = document.getElementById('menu-error');
  const container = document.getElementById('menu-categories-container');
  if (!container) return;
  try {
    const items = await fetchMenuItems();
    renderMenu(container, items);
  } catch {
    errorEl?.classList.remove('is-hidden');
  } finally {
    loadingEl?.classList.add('is-hidden');
  }
}

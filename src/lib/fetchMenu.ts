import type { MenuItem } from './menuTypes';

const FALLBACK_ITEMS: MenuItem[] = [
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

function formatPrice(price: string | number) {
  const numeric = Number(String(price).replace(/[^0-9,.-]/g, '').replace(',', '.'));
  if (Number.isNaN(numeric)) return 'auf Anfrage';
  return `${numeric.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €`;
}

function render(items: MenuItem[]) {
  const container = document.getElementById('menu-categories-container');
  const loading = document.getElementById('menu-loading');
  const error = document.getElementById('menu-error');
  if (!container || !loading || !error) return;

  loading.classList.add('is-hidden');
  container.innerHTML = '';
  items.forEach((item) => {
    const card = document.createElement('article');
    card.className = 'menu-card reveal';
    card.innerHTML = `
      <div class="menu-card__header">
        <h3>${item.title}</h3>
        <span class="price-pill">${formatPrice(item.price)}</span>
      </div>
      <p>${item.description ?? ''}</p>
      ${item.unit ? `<p class="price-pill" aria-label="Einheit">${item.unit}</p>` : ''}
    `;
    container.appendChild(card);
  });
}

async function fetchRemoteMenu(): Promise<MenuItem[]> {
  const url = import.meta.env.PUBLIC_MENU_SHEET_URL;
  if (!url) return FALLBACK_ITEMS;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  const res = await fetch(url, { signal: controller.signal });
  clearTimeout(timeout);
  if (!res.ok) throw new Error('Menu fetch failed');
  const data = await res.json();
  if (Array.isArray(data)) return data as MenuItem[];
  return FALLBACK_ITEMS;
}

async function init() {
  const loading = document.getElementById('menu-loading');
  const error = document.getElementById('menu-error');
  loading?.classList.remove('is-hidden');
  try {
    const items = await fetchRemoteMenu();
    render(items.length ? items : FALLBACK_ITEMS);
  } catch (err) {
    console.warn('Menu fallback', err);
    error?.classList.remove('is-hidden');
    render(FALLBACK_ITEMS);
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', init);
}

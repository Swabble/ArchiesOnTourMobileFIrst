import { preventZoom } from './zoomGuard';

type Prefill = {
  company?: string;
  contact?: string;
  email?: string;
  date?: string;
  location?: string;
  attendees?: string;
  eventType?: string;
};

type ErrorMap = Record<string, string>;

function setError(field: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, message: string) {
  const errorEl = document.querySelector<HTMLElement>(`.error[data-error-for="${field.name}"]`);
  if (message) {
    field.classList.add('has-error');
    if (errorEl) errorEl.textContent = message;
  } else {
    field.classList.remove('has-error');
    if (errorEl) errorEl.textContent = '';
  }
}

function validateEmail(email: string) {
  return /.+@.+\..+/.test(email);
}

export function initInquiryForm(openContractModal: (prefill: Prefill) => void) {
  const form = document.getElementById('inquiry-form') as HTMLFormElement | null;
  const success = document.getElementById('inquiry-success');
  if (!form || !success) return;

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = new FormData(form);
    let valid = true;
    const errors: ErrorMap = {};

    ['company', 'contact', 'phone', 'date', 'location', 'eventType'].forEach((name) => {
      const value = (data.get(name) as string) || '';
      if (!value.trim()) errors[name] = 'Pflichtfeld';
    });

    const email = (data.get('email') as string) || '';
    if (!validateEmail(email)) errors.email = 'Bitte gültige E-Mail angeben';

    const attendees = Number(data.get('attendees') || 0);
    if (!attendees || attendees < 10) errors.attendees = 'Mindestens 10 Personen';

    const fields = form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
      'input, textarea, select',
    );
    fields.forEach((field) => setError(field, errors[field.name] ?? ''));

    valid = Object.keys(errors).length === 0;

    if (!valid) return;

    success.classList.remove('is-hidden');
    const prefill: Prefill = {
      company: data.get('company') as string,
      contact: data.get('contact') as string,
      email,
      date: data.get('date') as string,
      location: data.get('location') as string,
      attendees: String(attendees),
      eventType: data.get('eventType') as string,
    };
    openContractModal(prefill);
  });
}

export function initContractModal() {
  const overlay = document.getElementById('contract-modal-overlay');
  const form = document.getElementById('contract-form') as HTMLFormElement | null;
  const closeBtn = overlay?.querySelector('[data-close-modal]') as HTMLButtonElement | null;
  const closeIcon = overlay?.querySelector('.contract-modal__close');
  const success = document.getElementById('contract-success');

  function close() {
    overlay?.classList.remove('open');
    overlay?.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('no-scroll');
  }

  function open(prefill: Prefill) {
    if (!overlay) return;
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('no-scroll');
    preventZoom();

    (document.getElementById('contract-company') as HTMLInputElement | null)!.value =
      prefill.company || '';
    (document.getElementById('contract-contact') as HTMLInputElement | null)!.value =
      prefill.contact || '';
    (document.getElementById('contract-date') as HTMLInputElement | null)!.value =
      prefill.date || '';
    (document.getElementById('contract-location') as HTMLInputElement | null)!.value =
      prefill.location || '';
    (document.getElementById('contract-guests') as HTMLInputElement | null)!.value =
      prefill.attendees || '';
    (document.getElementById('contract-type') as HTMLInputElement | null)!.value =
      prefill.eventType || '';
  }

  overlay?.addEventListener('click', (event) => {
    if (event.target === overlay) close();
  });
  closeBtn?.addEventListener('click', close);
  closeIcon?.addEventListener('click', close);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') close();
  });

  form?.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!form) return;
    const data = new FormData(form);
    const errors: ErrorMap = {};

    ['company', 'contact', 'date', 'location', 'guests', 'eventType'].forEach((name) => {
      const value = (data.get(name) as string) || '';
      if (!value.trim()) errors[name] = 'Pflichtfeld';
    });

    if (!data.get('power')) errors.power = 'Bitte wählen';
    if (!data.get('agreeTerms')) errors.agreeTerms = 'Bitte bestätigen';

    form
      .querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('input, textarea, select')
      .forEach((field) => setError(field, errors[field.name] ?? ''));

    if (Object.keys(errors).length === 0) {
      success?.classList.remove('is-hidden');
    }
  });

  return { openModal: open, closeModal: close };
}

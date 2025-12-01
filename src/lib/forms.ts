function showError(id: string, message: string) {
  const el = document.getElementById(`${id}-error`);
  if (el) el.textContent = message;
}

function clearErrors(form: HTMLFormElement) {
  form.querySelectorAll('.error').forEach((el) => (el.textContent = ''));
}

function validateEmail(email: string) {
  return /.+@.+\..+/.test(email);
}

function openContractModal(prefill: Record<string, string>) {
  const modal = document.getElementById('contract-modal');
  if (!modal) return;
  modal.classList.add('active');
  modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('no-scroll');
  (document.getElementById('contract-name') as HTMLInputElement | null)!.value = prefill.contact ?? '';
  (document.getElementById('contract-email') as HTMLInputElement | null)!.value = prefill.email ?? '';
  (document.getElementById('contract-date') as HTMLInputElement | null)!.value = prefill.date ?? '';
}

function closeContractModal() {
  const modal = document.getElementById('contract-modal');
  if (!modal) return;
  modal.classList.remove('active');
  modal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('no-scroll');
}

function initInquiry() {
  const form = document.getElementById('inquiry-form') as HTMLFormElement | null;
  if (!form) return;
  const success = document.getElementById('inquiry-success');
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    clearErrors(form);
    const data = new FormData(form);
    let hasError = false;
    ['company', 'contact', 'email', 'phone', 'date', 'city', 'people', 'event'].forEach((field) => {
      const value = String(data.get(field) ?? '').trim();
      if (!value) {
        showError(field, 'Pflichtfeld');
        hasError = true;
      }
      if (field === 'email' && value && !validateEmail(value)) {
        showError(field, 'Bitte gültige E-Mail eingeben');
        hasError = true;
      }
      if (field === 'people' && Number(value) < 10) {
        showError(field, 'Mindestens 10 Personen');
        hasError = true;
      }
    });
    if (hasError) return;
    success?.classList.remove('is-hidden');
    openContractModal({
      contact: String(data.get('contact') ?? ''),
      email: String(data.get('email') ?? ''),
      date: String(data.get('date') ?? '')
    });
  });
}

function initContract() {
  const modal = document.getElementById('contract-modal');
  const closeBtn = document.getElementById('contract-close');
  const form = document.getElementById('contract-form') as HTMLFormElement | null;
  const success = document.getElementById('contract-success');

  closeBtn?.addEventListener('click', closeContractModal);
  modal?.addEventListener('click', (event) => {
    if (event.target === modal) closeContractModal();
  });

  form?.addEventListener('submit', (event) => {
    event.preventDefault();
    clearErrors(form);
    const data = new FormData(form);
    let hasError = false;
    ['contract-name', 'contract-email', 'contract-date'].forEach((field) => {
      const value = String(data.get(field) ?? '').trim();
      if (!value) {
        showError(field, 'Pflichtfeld');
        hasError = true;
      }
    });
    if (!data.get('power')) {
      const error = document.getElementById('power-error');
      if (error) error.textContent = 'Bitte Stromversorgung wählen';
      hasError = true;
    }
    if (hasError) return;
    success?.classList.remove('is-hidden');
  });
}

if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    initInquiry();
    initContract();
  });
}

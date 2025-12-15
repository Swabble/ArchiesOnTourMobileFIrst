function showError(id, message) {
    const el = document.getElementById(`${id}-error`);
    if (el)
        el.textContent = message;
}
function clearErrors(form) {
    form.querySelectorAll('.error').forEach((el) => (el.textContent = ''));
}
function validateEmail(email) {
    return /.+@.+\..+/.test(email);
}
function openContractModal(prefill) {
    var _a, _b, _c;
    const modal = document.getElementById('contract-modal');
    if (!modal)
        return;
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('no-scroll');
    document.getElementById('contract-name').value = (_a = prefill.contact) !== null && _a !== void 0 ? _a : '';
    document.getElementById('contract-email').value = (_b = prefill.email) !== null && _b !== void 0 ? _b : '';
    document.getElementById('contract-date').value = (_c = prefill.date) !== null && _c !== void 0 ? _c : '';
}
function closeContractModal() {
    const modal = document.getElementById('contract-modal');
    if (!modal)
        return;
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('no-scroll');
}
function initInquiry() {
    const form = document.getElementById('inquiry-form');
    if (!form)
        return;
    const success = document.getElementById('inquiry-success');
    form.addEventListener('submit', (event) => {
        var _a, _b, _c;
        event.preventDefault();
        clearErrors(form);
        const data = new FormData(form);
        let hasError = false;
        ['company', 'contact', 'email', 'phone', 'date', 'city', 'people', 'event'].forEach((field) => {
            var _a;
            const value = String((_a = data.get(field)) !== null && _a !== void 0 ? _a : '').trim();
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
        if (hasError)
            return;
        success === null || success === void 0 ? void 0 : success.classList.remove('is-hidden');
        openContractModal({
            contact: String((_a = data.get('contact')) !== null && _a !== void 0 ? _a : ''),
            email: String((_b = data.get('email')) !== null && _b !== void 0 ? _b : ''),
            date: String((_c = data.get('date')) !== null && _c !== void 0 ? _c : '')
        });
    });
}
function initContract() {
    const modal = document.getElementById('contract-modal');
    const closeBtn = document.getElementById('contract-close');
    const form = document.getElementById('contract-form');
    const success = document.getElementById('contract-success');
    closeBtn === null || closeBtn === void 0 ? void 0 : closeBtn.addEventListener('click', closeContractModal);
    modal === null || modal === void 0 ? void 0 : modal.addEventListener('click', (event) => {
        if (event.target === modal)
            closeContractModal();
    });
    form === null || form === void 0 ? void 0 : form.addEventListener('submit', (event) => {
        event.preventDefault();
        clearErrors(form);
        const data = new FormData(form);
        let hasError = false;
        ['contract-name', 'contract-email', 'contract-date'].forEach((field) => {
            var _a;
            const value = String((_a = data.get(field)) !== null && _a !== void 0 ? _a : '').trim();
            if (!value) {
                showError(field, 'Pflichtfeld');
                hasError = true;
            }
        });
        if (!data.get('power')) {
            const error = document.getElementById('power-error');
            if (error)
                error.textContent = 'Bitte Stromversorgung wählen';
            hasError = true;
        }
        if (hasError)
            return;
        success === null || success === void 0 ? void 0 : success.classList.remove('is-hidden');
    });
}
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
        initInquiry();
        initContract();
    });
}

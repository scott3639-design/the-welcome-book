const styleInput = document.querySelector('#style');
const choices = document.querySelectorAll('[data-style]');
function reflectStyle() {
  choices.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.style === styleInput.value)));
}
choices.forEach(button => button.addEventListener('click', () => {
  styleInput.value = button.dataset.style;
  reflectStyle();
  document.querySelector('#enquiry').scrollIntoView({behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'});
}));
styleInput.addEventListener('change', reflectStyle);
const form = document.querySelector('#enquiry-form');
const status = document.querySelector('#form-status');
const submit = form.querySelector('[type="submit"]');
let sending = false;
function showStatus(message) {
  status.hidden = false;
  status.textContent = message;
  status.focus({preventScroll: true});
  status.scrollIntoView({block: 'nearest'});
}
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (sending) return;
  for (const key of ['name', 'message']) {
    const field = form.elements.namedItem(key);
    field.setCustomValidity(field.value.trim() ? '' : 'Please complete this field.');
  }
  if (!form.reportValidity()) return;
  if (form.dataset.delivery !== 'production') {
    showStatus('This is a private preview. Your enquiry has not been sent or saved — email delivery will be connected before launch.');
    return;
  }
  sending = true;
  submit.disabled = true;
  form.setAttribute('aria-busy', 'true');
  status.hidden = false;
  status.textContent = 'Sending your enquiry…';
  try {
    const response = await fetch('/api/enquiry', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      credentials: 'same-origin',
      body: JSON.stringify(Object.fromEntries(new FormData(form))),
      signal: AbortSignal.timeout(15000)
    });
    const result = await response.json();
    if (!response.ok || result.ok !== true) throw new Error('Not accepted');
    form.reset();
    reflectStyle();
    showStatus("Thank you. Your enquiry has been sent. I'll be in touch as soon as I can.");
  } catch {
    showStatus("Sorry — your enquiry couldn't be sent. Please try again in a moment.");
  } finally {
    sending = false;
    submit.disabled = false;
    form.removeAttribute('aria-busy');
  }
});
for (const key of ['name', 'message']) {
  form.elements.namedItem(key).addEventListener('input', event => event.target.setCustomValidity(''));
}

// const FORMSPREE_ID = 'YOUR_FORM_ID' form fromspree website


const FORMSPREE_ID = 'myknyopy';

// DOM 
const banner = document.getElementById('emailBanner');
const closeBannerBtn = document.getElementById('closeBanner');
const openModalBtn = document.getElementById('openEmailModal');
const backdrop = document.getElementById('modalBackdrop');
const closeModalBtn = document.getElementById('closeModal');
const closeSuccess = document.getElementById('closeSuccess');
const submitBtn = document.getElementById('modalSubmit');
const submitLabel = document.getElementById('submitLabel');
const submitSpinner = document.getElementById('submitSpinner');
const emailInput = document.getElementById('modalEmail');
const nameInput = document.getElementById('modalName');
const modalDefault = document.getElementById('modalDefault');
const modalSuccess = document.getElementById('modalSuccess');
const modalError = document.getElementById('modalError');

//  Banner dismiss 
closeBannerBtn.addEventListener('click', () => {
  banner.classList.add('hidden');
  sessionStorage.setItem('b64studio_banner_dismissed', '1');
});

// Hide banner if dismissed this session
if (sessionStorage.getItem('b64studio_banner_dismissed')) {
  banner.classList.add('hidden');
}

//  Modal open/close ─
function openModal() {
  backdrop.classList.add('open');
  emailInput.focus();
}

function closeModal() {
  backdrop.classList.remove('open');
}

openModalBtn.addEventListener('click', openModal);
closeModalBtn.addEventListener('click', closeModal);
closeSuccess.addEventListener('click', () => { closeModal(); resetModal(); });

backdrop.addEventListener('click', e => {
  if (e.target === backdrop) closeModal();
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
});

//  Form submission ──
submitBtn.addEventListener('click', async () => {
  const email = emailInput.value.trim();
  const name = nameInput.value.trim();

  // Validate
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showError('Please enter a valid email address.');
    emailInput.focus();
    return;
  }

  if (FORMSPREE_ID === 'YOUR_FORM_ID') {
    showError('⚙️ Setup needed: open js/email-capture.js and replace YOUR_FORM_ID with your Formspree ID.');
    return;
  }

  setLoading(true);
  hideError();

  try {
    const res = await fetch(`https://formspree.io/f/${FORMSPREE_ID}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ email, name: name || 'Not provided', _subject: 'New contact — B64 Studio' }),
    });

    const data = await res.json();

    if (res.ok) {
      showSuccess();
      banner.classList.add('hidden');
    } else {
      const msg = data?.errors?.[0]?.message || 'Submission failed. Please try again.';
      showError(msg);
    }
  } catch {
    showError('Network error. Please check your connection and try again.');
  } finally {
    setLoading(false);
  }
});

// Allow Enter key to submit
emailInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') submitBtn.click();
});

//  Helpers ─
function setLoading(on) {
  submitBtn.disabled = on;
  submitLabel.style.display = on ? 'none' : 'inline';
  submitSpinner.style.display = on ? 'block' : 'none';
}

function showSuccess() {
  modalDefault.style.display = 'none';
  modalSuccess.style.display = 'block';
}

function resetModal() {
  modalDefault.style.display = 'block';
  modalSuccess.style.display = 'none';
  hideError();
  emailInput.value = '';
  nameInput.value = '';
}

function showError(msg) {
  modalError.textContent = msg;
  modalError.style.display = 'block';
}

function hideError() {
  modalError.style.display = 'none';
}

import { formatBytes } from './decoder.js';

//  DOM ─
const encodeDropZone = document.getElementById('encodeDropZone');
const encodeFileBtn = document.getElementById('encodeFileBtn');
const encodeFileInput = document.getElementById('encodeFileInput');
const encodeOptions = document.getElementById('encodeOptions');
const encodeFileInfo = document.getElementById('encodeFileInfo');
const encodeFormatTabs = document.getElementById('encodeFormatTabs');
const encodeOutput = document.getElementById('encodeOutput');
const encodeOutputStats = document.getElementById('encodeOutputStats');
const encodeCopyBtn = document.getElementById('encodeCopyBtn');
const encodeSaveBtn = document.getElementById('encodeSaveBtn');
const encodeResetBtn = document.getElementById('encodeResetBtn');

// Right panel refs
const encodeResultPanel = document.getElementById('encodeResultPanel');
const erpPreview = document.getElementById('erpPreview');
const erpFilename = document.getElementById('erpFilename');
const erpStats = document.getElementById('erpStats');
const emptyState = document.getElementById('emptyState');
const loadingState = document.getElementById('loadingState');
const loadingLabel = document.getElementById('loadingLabel');
const previewToolbar = document.getElementById('previewToolbar');
const mediaTypeBadge = document.getElementById('mediaTypeBadge');
const previewFilename = document.getElementById('previewFilename');
const downloadBtn = document.getElementById('downloadBtn');
const copyUrlBtn = document.getElementById('copyUrlBtn');
const statSize = document.getElementById('statSize');
const statType = document.getElementById('statType');
const statResolution = document.getElementById('statResolution');

//  State
let rawBase64 = '';   // pure base64 string, no prefix
let fileMime = '';
let fileName = '';
let fileSize = 0;
let objectURL = null;
let activeFmt = 'raw';

//  Drop / File input 
encodeFileBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  encodeFileInput.click();
});

encodeDropZone.addEventListener('click', () => encodeFileInput.click());

encodeDropZone.addEventListener('dragover', e => {
  e.preventDefault();
  encodeDropZone.classList.add('drag-over');
});
encodeDropZone.addEventListener('dragleave', () => encodeDropZone.classList.remove('drag-over'));
encodeDropZone.addEventListener('drop', e => {
  e.preventDefault();
  encodeDropZone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) encodeFile(file);
});

encodeFileInput.addEventListener('change', e => {
  const file = e.target.files[0];
  if (file) encodeFile(file);
  encodeFileInput.value = '';
});

//  Core encode 
function encodeFile(file) {
  fileName = file.name;
  fileMime = file.type || guessMime(file.name);
  fileSize = file.size;

  showEncodeLoading();

  const reader = new FileReader();
  reader.onload = (e) => {
    // e.target.result is data:<mime>;base64,<data>
    const dataUri = e.target.result;
    const commaIdx = dataUri.indexOf(',');
    rawBase64 = dataUri.slice(commaIdx + 1);

    // Create object URL for preview
    if (objectURL) URL.revokeObjectURL(objectURL);
    objectURL = URL.createObjectURL(file);

    buildOutput();
    showEncodeUI(file);
    updateRightPanel(file);
  };
  reader.onerror = () => {
    showToast('Failed to read file.', 'error');
    hideEncodeLoading();
  };
  reader.readAsDataURL(file);
}

//  Output formats 
function getFormattedOutput(fmt) {
  switch (fmt) {
    case 'raw':
      return rawBase64;
    case 'datauri':
      return `data:${fileMime};base64,${rawBase64}`;
    case 'json':
      // Escape for JSON string — base64 is safe but add surrounding quotes
      return `"data:${fileMime};base64,${rawBase64}"`;
    case 'css':
      return `url("data:${fileMime};base64,${rawBase64}")`;
    default:
      return rawBase64;
  }
}

function buildOutput() {
  const output = getFormattedOutput(activeFmt);
  const MAX_DISPLAY = 4000;
  const isClipped = output.length > MAX_DISPLAY;

  // Textarea shows truncated view only — copy always gets full string
  encodeOutput.value = isClipped
    ? output.slice(0, MAX_DISPLAY)
    : output;

  // Show/hide clipped note and update char count
  const clippedNote = document.getElementById('encodeClippedNote');
  const charCount = document.getElementById('encodeCharCount');
  const copyLabel = document.getElementById('copyBtnLabel');

  if (clippedNote) clippedNote.style.display = isClipped ? 'inline' : 'none';

  const totalChars = output.length;
  const friendly = totalChars >= 1_000_000
    ? (totalChars / 1_000_000).toFixed(2) + 'M chars'
    : totalChars >= 1_000
      ? (totalChars / 1_000).toFixed(1) + 'K chars'
      : totalChars + ' chars';

  if (charCount) charCount.textContent = friendly;
  if (copyLabel) copyLabel.textContent = `Copy${isClipped ? ' full' : ''} string · ${friendly}`;

  const b64Len = rawBase64.length;
  const overhead = (((output.length / fileSize) - 1) * 100).toFixed(0);

  encodeOutputStats.innerHTML =
    `<span>${formatBytes(fileSize)} original</span>` +
    `<span>→</span>` +
    `<span>${formatBase64Length(b64Len)} b64 chars</span>` +
    `<span>+${overhead > 0 ? overhead : 33}% overhead</span>`;
}

function formatBase64Length(len) {
  if (len >= 1_000_000) return (len / 1_000_000).toFixed(1) + 'M';
  if (len >= 1_000) return (len / 1_000).toFixed(1) + 'K';
  return String(len);
}

//  Format tab switching 
encodeFormatTabs.addEventListener('click', e => {
  const btn = e.target.closest('.encode-fmt-btn');
  if (!btn || !rawBase64) return;
  activeFmt = btn.dataset.fmt;
  encodeFormatTabs.querySelectorAll('.encode-fmt-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  buildOutput();
});

//  Copy 
encodeCopyBtn.addEventListener('click', async () => {
  if (!rawBase64) return;
  const full = getFormattedOutput(activeFmt);
  try {
    await navigator.clipboard.writeText(full);
    const copyLabel = document.getElementById('copyBtnLabel');
    const origLabel = copyLabel.textContent;
    encodeCopyBtn.style.background = 'var(--green)';
    copyLabel.textContent = `✓ Copied ${full.length.toLocaleString()} chars!`;
    setTimeout(() => {
      encodeCopyBtn.style.background = '';
      buildOutput(); // restores label
    }, 2000);
  } catch {
    showToast('Clipboard access denied — try the .txt download instead', 'error');
  }
});

//  Save as .txt 
encodeSaveBtn.addEventListener('click', () => {
  if (!rawBase64) return;
  const full = getFormattedOutput(activeFmt);
  const blob = new Blob([full], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName.replace(/\.[^.]+$/, '') + '_base64.txt';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  showToast('Saved as .txt', 'success');
});

//  Reset
encodeResetBtn.addEventListener('click', resetEncode);

function resetEncode() {
  rawBase64 = '';
  fileMime = '';
  fileName = '';
  fileSize = 0;
  if (objectURL) { URL.revokeObjectURL(objectURL); objectURL = null; }
  encodeOptions.style.display = 'none';
  encodeDropZone.style.display = 'flex';
  encodeOutput.value = '';

  // Restore decode right panel
  encodeResultPanel.style.display = 'none';
  emptyState.style.display = 'flex';
  previewToolbar.style.opacity = '1';
  downloadBtn.style.display = 'none';
  copyUrlBtn.style.display = 'none';
  mediaTypeBadge.textContent = 'PREVIEW';
  mediaTypeBadge.className = 'media-type-badge';
  previewFilename.textContent = '—';
  statSize.textContent = '—';
  statType.textContent = '—';
  statResolution.textContent = '—';
}

//  UI helpers ──
function showEncodeUI(file) {
  hideEncodeLoading();
  encodeDropZone.style.display = 'none';
  encodeOptions.style.display = 'flex';

  const ext = fileName.split('.').pop().toUpperCase();
  encodeFileInfo.innerHTML =
    `<span class="encode-file-chip">
      <span class="encode-file-ext">${ext}</span>
      <span class="encode-file-name">${fileName}</span>
      <span class="encode-file-size">${formatBytes(fileSize)}</span>
    </span>`;
}

function showEncodeLoading() {
  emptyState.style.display = 'none';
  loadingState.style.display = 'flex';
  loadingLabel.textContent = 'Encoding file…';
  previewToolbar.style.opacity = '0.4';
}

function hideEncodeLoading() {
  loadingState.style.display = 'none';
  previewToolbar.style.opacity = '1';
}

//  Right panel update 
function updateRightPanel(file) {
  // Hide decode previews
  ['previewImage', 'previewVideo', 'previewAudio', 'previewPDF', 'previewText'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });

  emptyState.style.display = 'none';
  encodeResultPanel.style.display = 'flex';

  // Build preview element
  erpPreview.innerHTML = '';
  const category = fileMime.split('/')[0];

  if (category === 'image') {
    const img = document.createElement('img');
    img.src = objectURL;
    img.className = 'erp-media-img';
    erpPreview.appendChild(img);
  } else if (category === 'video') {
    const vid = document.createElement('video');
    vid.src = objectURL;
    vid.controls = true;
    vid.className = 'erp-media-vid';
    erpPreview.appendChild(vid);
  } else if (category === 'audio') {
    const wrap = document.createElement('div');
    wrap.className = 'erp-audio-wrap';
    wrap.innerHTML = `<div style="font-size:48px;margin-bottom:12px">🎵</div>
      <div style="font-family:var(--display);font-weight:700;font-size:16px;margin-bottom:16px">${fileName}</div>`;
    const aud = document.createElement('audio');
    aud.src = objectURL;
    aud.controls = true;
    aud.style.width = '100%';
    wrap.appendChild(aud);
    erpPreview.appendChild(wrap);
  } else if (fileMime === 'application/pdf') {
    const iframe = document.createElement('iframe');
    iframe.src = objectURL;
    iframe.className = 'erp-pdf';
    erpPreview.appendChild(iframe);
  } else {
    const box = document.createElement('div');
    box.className = 'erp-generic';
    box.innerHTML = `<div style="font-size:48px">💾</div>
      <div style="font-family:var(--display);font-weight:700;margin-top:12px">${fileName}</div>`;
    erpPreview.appendChild(box);
  }

  erpFilename.textContent = fileName;
  erpStats.textContent = `${formatBytes(fileSize)} · ${fileMime || 'unknown type'}`;

  // Update toolbar
  const label = fileMime.split('/')[1]?.split('+')[0]?.toUpperCase() || 'FILE';
  mediaTypeBadge.textContent = label;
  mediaTypeBadge.className = 'media-type-badge ' + category;
  previewFilename.textContent = fileName;

  // Download original
  downloadBtn.href = objectURL;
  downloadBtn.download = fileName;
  downloadBtn.style.display = 'inline-flex';
  copyUrlBtn.style.display = 'none';

  // Stats bar
  statSize.textContent = formatBytes(fileSize);
  statType.textContent = fileMime || '—';

  // Dimensions for images
  if (category === 'image') {
    const tmp = new Image();
    tmp.onload = () => { statResolution.textContent = `${tmp.naturalWidth}×${tmp.naturalHeight}`; };
    tmp.src = objectURL;
  } else {
    statResolution.textContent = '—';
  }
}

//  MIME guesser for files without type 
function guessMime(name) {
  const ext = name.split('.').pop().toLowerCase();
  const map = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif',
    webp: 'image/webp', bmp: 'image/bmp', svg: 'image/svg+xml', ico: 'image/x-icon',
    mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime', avi: 'video/x-msvideo',
    mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg', flac: 'audio/flac', m4a: 'audio/mp4',
    pdf: 'application/pdf', txt: 'text/plain', json: 'application/json',
  };
  return map[ext] || 'application/octet-stream';
}

//  Toast helper (mirrors app.js) ─
function showToast(msg, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const icon = { success: '✓', error: '✕', info: 'ℹ' }[type] || '';
  toast.innerHTML = `<span>${icon}</span><span>${msg}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

//  Sync: reset encode right-panel when switching away 
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (btn.dataset.tab !== 'tabEncode' && rawBase64) {
      // Only reset the right panel view, keep encode state in left panel
      encodeResultPanel.style.display = 'none';
    }
  });
});

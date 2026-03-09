import { decodeBase64, formatBytes, looksLikeBase64 } from './decoder.js';
import { renderTree } from './json-tree.js';


let currentObjectURL = null;
let history = [];
let parsedJSON = null;
let activeHistoryIdx = -1;

// ─── DOM Refs ────────────────────────────────────────────
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const pathInput = document.getElementById('pathInput');
const decodeBtn = document.getElementById('decodeBtn');
const rawTextarea = document.getElementById('rawTextarea');
const decodeRawBtn = document.getElementById('decodeRawBtn');
const treeWrap = document.getElementById('treeWrap');
const previewStage = document.getElementById('previewStage');
const emptyState = document.getElementById('emptyState');
const loadingState = document.getElementById('loadingState');
const loadingLabel = document.getElementById('loadingLabel');
const mediaTypeBadge = document.getElementById('mediaTypeBadge');
const previewToolbar = document.getElementById('previewToolbar');
const previewFilename = document.getElementById('previewFilename');
const downloadBtn = document.getElementById('downloadBtn');
const copyUrlBtn = document.getElementById('copyUrlBtn');
const statSize = document.getElementById('statSize');
const statType = document.getElementById('statType');
const statResolution = document.getElementById('statResolution');
const historyList = document.getElementById('historyList');
const tabBtns = document.querySelectorAll('.tab-btn');
const tabPanels = document.querySelectorAll('.tab-panel');

const previewImage = document.getElementById('previewImage');
const previewVideo = document.getElementById('previewVideo');
const previewAudio = document.getElementById('previewAudio');
const audioPlayer = document.getElementById('audioPlayer');
const previewPDF = document.getElementById('previewPDF');
const previewText = document.getElementById('previewText');

// Tabs
tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    tabBtns.forEach(b => b.classList.remove('active'));
    tabPanels.forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab).classList.add('active');
  });
});

// Drop Zone 
dropZone.addEventListener('click', () => fileInput.click());

dropZone.addEventListener('dragover', e => {
  e.preventDefault();
  dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));

dropZone.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) readFile(file);
});

fileInput.addEventListener('change', e => {
  const file = e.target.files[0];
  if (file) readFile(file);
  fileInput.value = '';
});

function readFile(file) {
  const reader = new FileReader();
  reader.onload = e => handleInput(e.target.result);
  reader.readAsText(file);
}

// Paste
window.addEventListener('paste', e => {
  const text = e.clipboardData.getData('text');
  if (text) handleInput(text);
});

// Input Handler
function handleInput(raw) {
  const trimmed = raw.trim();


  try {
    parsedJSON = JSON.parse(trimmed);
    renderTree(parsedJSON, treeWrap, (path, value) => {
      pathInput.value = path;
      triggerDecode(value);
    });

    // Switch to JSON tab
    activateTab('tabJSON');
    showToast('JSON parsed — click a ▶ decode button or type a path', 'info');
    return;
  } catch {
    // Not JSON
  }

  // Handling raw base64
  if (looksLikeBase64(trimmed)) {
    rawTextarea.value = trimmed;
    activateTab('tabRaw');
    triggerDecode(trimmed);
    return;
  }

  showToast('Could not parse input as JSON or Base64', 'error');
}

function activateTab(tabId) {
  tabBtns.forEach(b => b.classList.remove('active'));
  tabPanels.forEach(p => p.classList.remove('active'));
  document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
  document.getElementById(tabId).classList.add('active');
}

// Manual path decode
decodeBtn.addEventListener('click', () => {
  if (!parsedJSON) { showToast('No JSON loaded yet', 'error'); return; }
  const path = pathInput.value.trim();
  if (!path) { showToast('Enter a JSON path', 'error'); return; }

  const value = getByPath(parsedJSON, path);
  if (value === undefined) { showToast(`Path not found: ${path}`, 'error'); return; }
  if (typeof value !== 'string') { showToast('Value at path is not a string', 'error'); return; }

  triggerDecode(value);
});

pathInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') decodeBtn.click();
});

// Raw decode 
decodeRawBtn.addEventListener('click', () => {
  const raw = rawTextarea.value.trim();
  if (!raw) { showToast('Paste a Base64 string above', 'error'); return; }
  triggerDecode(raw);
});

// Core Decode 
async function triggerDecode(base64str) {
  showLoading('Decoding…');

  // Revoke previous URL
  if (currentObjectURL) {
    URL.revokeObjectURL(currentObjectURL);
    currentObjectURL = null;
  }

  hideAllPreviews();

  try {
    const result = await decodeBase64(base64str);
    currentObjectURL = result.url;

    displayResult(result);
    addToHistory(result);
    updateStats(result);
    showToast(`Decoded ${result.label} · ${formatBytes(result.sizeBytes)}`, 'success');
  } catch (err) {
    hideLoading();
    showEmptyState();
    showToast(err.message, 'error');
  }
}

// Display Result 
function displayResult(result) {
  hideLoading();
  emptyState.style.display = 'none';

  mediaTypeBadge.textContent = result.label;
  mediaTypeBadge.className = 'media-type-badge ' + result.category;
  previewFilename.textContent = `decoded.${result.ext}`;

  downloadBtn.href = result.url;
  downloadBtn.download = `decoded.${result.ext}`;
  downloadBtn.style.display = 'inline-flex';
  copyUrlBtn.style.display = 'inline-flex';

  const { category, url, mime } = result;

  if (category === 'image') {
    previewImage.src = url;
    previewImage.style.display = 'block';
    previewImage.onload = () => {
      statResolution.textContent = `${previewImage.naturalWidth}×${previewImage.naturalHeight}`;
    };
  } else if (category === 'video') {
    previewVideo.src = url;
    previewVideo.style.display = 'block';
    previewVideo.play().catch(() => { });
    previewVideo.onloadedmetadata = () => {
      statResolution.textContent = `${previewVideo.videoWidth}×${previewVideo.videoHeight}`;
    };
  } else if (category === 'audio') {
    previewAudio.style.display = 'block';
    audioPlayer.src = url;
    audioPlayer.play().catch(() => { });
    statResolution.textContent = '—';
  } else if (category === 'pdf') {
    previewPDF.src = url;
    previewPDF.style.display = 'block';
    statResolution.textContent = '—';
  } else {
    // Text / binary — show as text
    result.blob.text().then(text => {
      previewText.textContent = text.slice(0, 20000);
      previewText.style.display = 'block';
    });
    statResolution.textContent = '—';
  }
}

// Stats 
function updateStats(result) {
  statSize.textContent = formatBytes(result.sizeBytes);
  statType.textContent = result.mime;
  statResolution.textContent = '…';
}

// History
function addToHistory(result) {
  const entry = {
    ...result,
    time: new Date(),
    id: Date.now(),
  };
  history.unshift(entry);
  if (history.length > 20) history.pop();
  renderHistory();
}

function renderHistory() {
  if (history.length === 0) {
    historyList.innerHTML = '<div class="history-empty">No items yet.<br>Decode something to see it here.</div>';
    return;
  }

  historyList.innerHTML = '';
  history.forEach((entry, i) => {
    const item = document.createElement('div');
    item.className = 'history-item' + (i === activeHistoryIdx ? ' active' : '');

    const thumb = document.createElement('div');
    thumb.className = 'history-thumb';

    const icon = categoryIcon(entry.category);
    if (entry.category === 'image') {
      const img = document.createElement('img');
      img.src = entry.url;
      thumb.appendChild(img);
    } else {
      thumb.textContent = icon;
    }

    const meta = document.createElement('div');
    meta.className = 'history-meta';

    const name = document.createElement('div');
    name.className = 'history-name';
    name.textContent = `decoded.${entry.ext}`;

    const sub = document.createElement('div');
    sub.className = 'history-sub';
    sub.textContent = `${entry.label} · ${formatBytes(entry.sizeBytes)}`;

    meta.appendChild(name);
    meta.appendChild(sub);
    item.appendChild(thumb);
    item.appendChild(meta);

    item.addEventListener('click', () => {
      activeHistoryIdx = i;
      renderHistory();
      displayResult(entry);
      updateStats(entry);
    });

    historyList.appendChild(item);
  });
}

// Copy URL
copyUrlBtn.addEventListener('click', async () => {
  if (!currentObjectURL) return;
  try {
    await navigator.clipboard.writeText(currentObjectURL);
    showToast('Blob URL copied to clipboard', 'success');
  } catch {
    showToast('Could not copy to clipboard', 'error');
  }
});

// Helpers
function getByPath(obj, path) {
  const parts = path.replace(/\[(\w+)\]/g, '.$1').split('.');
  return parts.reduce((acc, k) => (acc != null ? acc[k] : undefined), obj);
}

function hideAllPreviews() {
  previewImage.style.display = 'none';
  previewVideo.style.display = 'none';
  previewAudio.style.display = 'none';
  previewPDF.style.display = 'none';
  previewText.style.display = 'none';
  previewImage.src = '';
  previewVideo.src = '';
  audioPlayer.src = '';
  previewPDF.src = '';
}

function showLoading(msg = 'Processing…') {
  emptyState.style.display = 'none';
  loadingState.style.display = 'flex';
  loadingLabel.textContent = msg;
  previewToolbar.style.opacity = '0.4';
}

function hideLoading() {
  loadingState.style.display = 'none';
  previewToolbar.style.opacity = '1';
}

function showEmptyState() {
  emptyState.style.display = 'flex';
}

function categoryIcon(cat) {
  return { image: '🖼', video: '🎬', audio: '🎵', pdf: '📄', text: '📝', binary: '💾' }[cat] || '📦';
}

// ─── Toast ────────────────────────────────────────────────
function showToast(msg, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const icon = { success: '✓', error: '✕', info: 'ℹ' }[type] || '';
  toast.innerHTML = `<span>${icon}</span><span>${msg}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// Init 
renderHistory();

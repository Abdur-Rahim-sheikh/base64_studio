/**
 * json-tree.js — Interactive JSON tree with base64 node detection
 */

import { looksLikeBase64 } from './decoder.js';

/**
 * Render a JSON value into an element with interactive nodes.
 * onSelectPath(path, value) is called when a b64 chip is clicked.
 */
export function renderTree(data, container, onSelectPath) {
  container.innerHTML = '';
  const root = buildNode(data, '', onSelectPath, 0);
  container.appendChild(root);
}

function buildNode(value, path, onSelect, depth) {
  const wrap = document.createElement('div');
  wrap.className = 'tree-node';

  if (Array.isArray(value)) {
    wrap.appendChild(buildArray(value, path, onSelect, depth));
  } else if (value !== null && typeof value === 'object') {
    wrap.appendChild(buildObject(value, path, onSelect, depth));
  } else {
    wrap.appendChild(buildLeaf(value, path, onSelect));
  }

  return wrap;
}

function buildObject(obj, path, onSelect, depth) {
  const frag = document.createDocumentFragment();
  const keys = Object.keys(obj);

  const toggleRow = document.createElement('span');
  toggleRow.className = 'node-toggle open';

  const caret = document.createElement('i');
  caret.className = 'caret';
  caret.textContent = '▶';

  const label = document.createElement('span');
  label.textContent = `{ ${keys.length} }`;
  label.style.color = 'var(--muted)';
  label.style.fontSize = '11px';

  toggleRow.appendChild(caret);
  toggleRow.appendChild(document.createTextNode(' '));
  toggleRow.appendChild(label);
  frag.appendChild(toggleRow);

  const children = document.createElement('div');
  children.className = 'node-children';

  for (const k of keys) {
    const childPath = path ? `${path}.${k}` : k;
    const row = document.createElement('div');
    row.style.marginBottom = '2px';

    const keySpan = document.createElement('span');
    keySpan.className = 'key';
    keySpan.textContent = k;

    row.appendChild(keySpan);
    row.appendChild(document.createTextNode(': '));
    row.appendChild(buildValueInline(obj[k], childPath, onSelect, depth + 1));
    children.appendChild(row);
  }

  toggleRow.onclick = () => {
    toggleRow.classList.toggle('open');
    children.classList.toggle('collapsed');
  };

  frag.appendChild(children);

  const wrapper = document.createElement('span');
  wrapper.appendChild(frag);
  return wrapper;
}

function buildArray(arr, path, onSelect, depth) {
  const frag = document.createDocumentFragment();

  const toggleRow = document.createElement('span');
  toggleRow.className = 'node-toggle open';

  const caret = document.createElement('i');
  caret.className = 'caret';
  caret.textContent = '▶';

  const label = document.createElement('span');
  label.textContent = `[ ${arr.length} ]`;
  label.style.color = 'var(--muted)';
  label.style.fontSize = '11px';

  toggleRow.appendChild(caret);
  toggleRow.appendChild(document.createTextNode(' '));
  toggleRow.appendChild(label);
  frag.appendChild(toggleRow);

  const children = document.createElement('div');
  children.className = 'node-children';

  arr.forEach((item, i) => {
    const childPath = `${path}[${i}]`;
    const row = document.createElement('div');
    row.style.marginBottom = '2px';

    const idxSpan = document.createElement('span');
    idxSpan.className = 'arr-idx';
    idxSpan.textContent = `[${i}]`;

    row.appendChild(idxSpan);
    row.appendChild(document.createTextNode(': '));
    row.appendChild(buildValueInline(item, childPath, onSelect, depth + 1));
    children.appendChild(row);
  });

  toggleRow.onclick = () => {
    toggleRow.classList.toggle('open');
    children.classList.toggle('collapsed');
  };

  frag.appendChild(children);

  const wrapper = document.createElement('span');
  wrapper.appendChild(frag);
  return wrapper;
}

function buildValueInline(value, path, onSelect, depth) {
  const span = document.createElement('span');

  if (Array.isArray(value)) {
    if (depth > 4) {
      span.style.color = 'var(--muted)';
      span.textContent = `[Array(${value.length})]`;
    } else {
      span.appendChild(buildArray(value, path, onSelect, depth));
    }
  } else if (value !== null && typeof value === 'object') {
    if (depth > 4) {
      span.style.color = 'var(--muted)';
      span.textContent = `{Object}`;
    } else {
      span.appendChild(buildObject(value, path, onSelect, depth));
    }
  } else {
    span.appendChild(buildLeaf(value, path, onSelect));
  }

  return span;
}

function buildLeaf(value, path, onSelect) {
  const span = document.createElement('span');

  if (typeof value === 'string') {
    if (looksLikeBase64(value)) {
      // Truncate display
      const preview = value.slice(0, 24).replace(/\s/g, '') + '…';
      span.className = 'val-b64';
      span.textContent = `"${preview}"`;

      const chip = document.createElement('span');
      chip.className = 'b64-chip';
      chip.dataset.path = path;
      chip.innerHTML = `▶ decode`;
      chip.title = `Decode base64 at path: ${path}`;

      chip.onclick = (e) => {
        e.stopPropagation();
        // Deselect others
        document.querySelectorAll('.b64-chip.selected').forEach(c => c.classList.remove('selected'));
        chip.classList.add('selected');
        onSelect(path, value);
      };

      span.appendChild(chip);
    } else {
      // Normal string — truncate long ones
      const MAX = 60;
      const display = value.length > MAX ? value.slice(0, MAX) + '…' : value;
      span.className = 'val-str-short';
      span.textContent = `"${display}"`;
    }
  } else if (typeof value === 'number') {
    span.className = 'val-num';
    span.textContent = value;
  } else if (typeof value === 'boolean') {
    span.className = 'val-bool';
    span.textContent = value;
  } else if (value === null) {
    span.className = 'val-null';
    span.textContent = 'null';
  } else {
    span.style.color = 'var(--muted)';
    span.textContent = String(value);
  }

  return span;
}

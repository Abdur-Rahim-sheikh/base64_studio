/**
 * decoder.js — Base64 media detection & decoding
 */

const SIGNATURES = [
  { prefix: '/9j/', mime: 'image/jpeg', ext: 'jpg', label: 'JPEG' },
  { prefix: 'iVBOR', mime: 'image/png', ext: 'png', label: 'PNG' },
  { prefix: 'R0lGO', mime: 'image/gif', ext: 'gif', label: 'GIF' },
  { prefix: 'UklGR', mime: 'image/webp', ext: 'webp', label: 'WebP' },
  { prefix: 'Qk0', mime: 'image/bmp', ext: 'bmp', label: 'BMP' },
  { prefix: 'JVBERi', mime: 'application/pdf', ext: 'pdf', label: 'PDF' },
  { prefix: 'AAAAF', mime: 'video/mp4', ext: 'mp4', label: 'MP4' },
  { prefix: 'AAAAI', mime: 'video/mp4', ext: 'mp4', label: 'MP4' },
  { prefix: 'AAAAB', mime: 'video/mp4', ext: 'mp4', label: 'MP4' },
  { prefix: 'GkXfo', mime: 'video/webm', ext: 'webm', label: 'WebM' },
  { prefix: 'AAAA', mime: 'video/mp4', ext: 'mp4', label: 'MP4' },
  { prefix: '//uQ', mime: 'audio/mpeg', ext: 'mp3', label: 'MP3' },
  { prefix: '//sw', mime: 'audio/mpeg', ext: 'mp3', label: 'MP3' },
  { prefix: 'SUQz', mime: 'audio/mpeg', ext: 'mp3', label: 'MP3' }, // ID3
  { prefix: 'T2dn', mime: 'audio/ogg', ext: 'ogg', label: 'OGG' }, // OggS
  { prefix: 'UklGR', mime: 'audio/wav', ext: 'wav', label: 'WAV' }, // RIFF (overlaps webp — checked by context)
  { prefix: 'AAAA', mime: 'video/mp4', ext: 'mp4', label: 'MP4' },
];


export function stripBase64(raw) {
  let declaredMime = null;
  let clean = raw.trim();

  // Handle data URI: data:image/png;base64,<data>
  const dataUriMatch = clean.match(/^data:([^;]+);base64,(.+)$/s);
  if (dataUriMatch) {
    declaredMime = dataUriMatch[1];
    clean = dataUriMatch[2];
  }

  clean = clean.replace(/\s/g, '');

  return { clean, declaredMime };
}


export function detectMime(clean, declaredMime) {
  for (const sig of SIGNATURES) {
    if (clean.startsWith(sig.prefix)) {
      return { mime: sig.mime, ext: sig.ext, label: sig.label };
    }
  }

  if (declaredMime) {
    const ext = declaredMime.split('/')[1]?.split('+')[0] || 'bin';
    return { mime: declaredMime, ext, label: ext.toUpperCase() };
  }

  return { mime: 'application/octet-stream', ext: 'bin', label: 'BINARY' };
}


export function getCategory(mime) {
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  if (mime === 'application/pdf') return 'pdf';
  if (mime.startsWith('text/')) return 'text';
  return 'binary';
}


export async function decodeBase64(raw) {
  const { clean, declaredMime } = stripBase64(raw);

  if (!clean || clean.length < 4) {
    throw new Error('Input appears to be empty or too short to be valid base64.');
  }

  const { mime, ext, label } = detectMime(clean, declaredMime);
  const category = getCategory(mime);

  // Using fetch + data URI for efficient conversion (avoids atob memory spikes)
  const response = await fetch(`data:${mime};base64,${clean}`);
  if (!response.ok) throw new Error('Failed to decode base64 data.');

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);

  return { url, blob, mime, ext, label, category, sizeBytes: blob.size };
}


export function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}


export function looksLikeBase64(str) {
  if (!str || typeof str !== 'string') return false;
  const s = str.trim();
  if (s.startsWith('data:') && s.includes(';base64,')) return true;
  // Must be long and contain only base64 chars
  if (s.length < 40) return false;
  return /^[A-Za-z0-9+/=]+$/.test(s.replace(/\s/g, ''));
}

export const channels = {
  general: { name: 'general', description: 'Everyone in Celestial, all in one place.' },
  help: { name: 'help-desk', description: 'Ask questions, share answers and help others build.' },
  showcase: { name: 'showcase', description: 'Show the things you are working on.' }
};
export const navigation = [
  { id: 'arcade', label: 'Arcade', detail: 'PLAYSPACE' },
  { id: 'browser', label: 'Browser', detail: 'EXPLORE THE WEB' },
  { id: 'chat', label: 'Chat', detail: 'COMMUNITY LIVE' },
  { id: 'ai', label: 'AI', detail: 'YOUR COPILOT' }
];
export async function api(path, options = {}) {
  const response = await fetch(path, { credentials: 'same-origin', ...options,
    headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers }
  });
  const kind = response.headers.get('content-type') || '';
  const data = kind.includes('application/json') ? await response.json() : {};
  if (!response.ok) throw new Error(data.error || 'Request failed');
  return data;
}
export const safeUrl = text => {
  let address = String(text || '').trim();
  if (!address) return null;
  if (!/^[a-z][a-z\d+.-]*:/i.test(address)) {
    if (address.includes(' ') || !address.includes('.')) return 'https://www.google.com/search?q=' + encodeURIComponent(address);
    address = 'https://' + address;
  }
  try { const parsed = new URL(address); return ['https:', 'http:'].includes(parsed.protocol) ? parsed.href : null; }
  catch { return null; }
};
export const readLocal = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem('celestial.v8.' + key)) ?? fallback; }
  catch { return fallback; }
};
export const saveLocal = (key, value) => { try { localStorage.setItem('celestial.v8.' + key, JSON.stringify(value)); } catch {} };

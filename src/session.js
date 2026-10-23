import { login, signup, logout, getUser, handleAuthCallback, requestPasswordRecovery, updateUser, acceptInvite, getSettings, refreshSession, onAuthChange } from '@netlify/identity';

const byId = id => document.getElementById(id);
let mode = 'login', inviteToken = null;
const authError = byId('err');
function setMode(next) {
  mode = next;
  const passwordOnly = next === 'reset' || next === 'invite';
  byId('user').closest('.fld').hidden = passwordOnly;
  byId('user').required = !passwordOnly;
  byId('pass').closest('.fld').hidden = next === 'recover';
  byId('pass').required = next !== 'recover';
  byId('pass').autocomplete = next === 'login' ? 'current-password' : 'new-password';
  byId('authLabel').textContent = ({login:'Sign In',signup:'Create account',recover:'Send reset link',reset:'Set new password',invite:'Accept invitation'})[next];
  byId('authSwitch').textContent = next === 'login' ? 'Create account' : 'Back to sign in';
  byId('authSwitch').hidden = passwordOnly;
  byId('authRecover').hidden = next !== 'login';
  authError.textContent = '';
}
byId('authSwitch').addEventListener('click', () => setMode(mode === 'login' ? 'signup' : 'login'));
byId('authRecover').addEventListener('click', () => setMode('recover'));
byId('loginForm').addEventListener('submit', async e => {
  e.preventDefault();
  if (!e.target.reportValidity()) return;
  const button = byId('authSubmit');
  button.disabled = true;
  authError.textContent = 'Please wait…';
  try {
    const email = byId('user').value.trim();
    const password = byId('pass').value;
    if (mode === 'recover') {
      await requestPasswordRecovery(email);
      authError.textContent = 'If an account exists for that email, check your inbox for a reset link.';
      return;
    }
    if (mode === 'signup') {
      const user = await signup(email, password);
      if (!user.emailVerified) {
        byId('pass').value = '';
        setMode('login');
        authError.textContent = 'Check your email to confirm your account, then sign in.';
        return;
      }
    } else if (mode === 'reset') await updateUser({ password });
    else if (mode === 'invite') await acceptInvite(inviteToken, password);
    else await login(email, password);
    location.replace('/');
  } catch (error) {
    authError.textContent = error.status === 401 ? 'Unable to sign in. Check your email and password.' : error.status === 403 ? 'Account registration is closed. Contact the site owner for an invitation.' : 'Unable to complete this request. Check your details and connection, then try again.';
  } finally { button.disabled = false; }
});

export let currentUser = null;
try {
  const callback = await handleAuthCallback();
  if (callback?.type === 'recovery') setMode('reset');
  else if (callback?.type === 'invite') { inviteToken = callback.token; setMode('invite'); }
  else currentUser = await getUser();
} catch { authError.textContent = 'This account link is invalid or expired. Request a new link and try again.'; }
if (!currentUser && mode === 'login') {
  getSettings().then(settings => { byId('authSwitch').hidden = settings.disableSignup; }).catch(() => {});
}

const cache = new Map(), versions = new Map(), pending = new Map();
let loadingFailed = false, saving = false, retryTimer = null, conflicted = false;
const panel = byId('syncPanel'), status = byId('syncText'), retry = byId('syncRetry');
function feedback(message, failed = false) {
  panel.hidden = false;
  status.textContent = message;
  retry.hidden = !failed;
}
if (currentUser) {
  try {
    await refreshSession();
    const res = await fetch('/api/state', { credentials: 'same-origin', cache: 'no-store' });
    if (!res.ok) throw new Error();
    const rows = await res.json();
    for (const row of rows) { cache.set(row.key, row.value); versions.set(row.key, row.version); }
  } catch {
    loadingFailed = true;
    currentUser = null;
    authError.textContent = 'Your saved content could not be loaded. Reload to retry; your existing content has not been changed.';
    byId('authSubmit').hidden = true;
    byId('authSwitch').hidden = true;
    byId('authRecover').hidden = true;
    feedback('Could not load your account. Reload to try again.', true);
    retry.textContent = 'Reload';
  }
}
export const cloudStore = {
  get(key) { return cache.get(key) ?? null; },
  set(key, value) {
    if (!currentUser || loadingFailed) return false;
    cache.set(key, value);
    pending.set(key, value);
    if (conflicted) {
      feedback('Changed on another device. Copy your unsaved changes before reloading.');
      return true;
    }
    feedback('Saving changes… Keep this page open until saved.');
    void flush();
    return true;
  }
};
async function flush() {
  if (saving || conflicted || !pending.size) return;
  saving = true;
  clearTimeout(retryTimer);
  try {
    await refreshSession();
    while (pending.size) {
      const [key, value] = pending.entries().next().value;
      const res = await fetch('/api/state', { method: 'PUT', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key, value, version: versions.get(key) || 0 }) });
      if (!res.ok) {
        if (res.status === 409) { conflicted = true; throw new Error('Changed on another device. Copy your unsaved changes before reloading.'); }
        if (res.status === 400) throw new Error('Some content is too large or invalid. Shorten it and retry. Your changes are not saved.');
        if (res.status === 401) throw new Error('Your session expired. Copy your unsaved changes, then sign in again.');
        throw new Error('Changes are not saved. Keep this page open and retry when connected.');
      }
      const result = await res.json();
      versions.set(key, result.version);
      if (pending.get(key) === value) pending.delete(key);
    }
    feedback('All changes saved to your account.');
    setTimeout(() => { if (!pending.size) panel.hidden = true; }, 3500);
  } catch (error) {
    feedback(error.message || 'Could not save your changes. Keep this page open and retry.', !conflicted);
    if (!conflicted) retryTimer = setTimeout(() => void flush(), 15000);
  } finally { saving = false; }
}
retry.addEventListener('click', () => loadingFailed ? location.reload() : void flush());
window.addEventListener('online', () => void flush());
window.addEventListener('beforeunload', event => {
  if (pending.size) { event.preventDefault(); event.returnValue = ''; }
});
onAuthChange((event) => {
  if (event === 'logout' && currentUser) {
    currentUser = null;
    if (pending.size) feedback('Signed out in another tab. Copy your unsaved changes before reloading.');
    else location.replace('/');
    document.getElementById('app').hidden = true;
    document.getElementById('welcome').hidden = true;
    document.getElementById('login').hidden = false;
  }
});
export async function signOut() {
  if (conflicted) { feedback('Copy your unsaved changes before reloading and signing out.'); return; }
  if (pending.size) { feedback('Save your changes before signing out.', true); await flush(); if (pending.size) return; }
  try { await logout(); location.replace('/'); }
  catch { feedback('Sign out could not be completed. Please retry.'); }
}
export async function uploadImage(file, max, type) {
  if (!currentUser) throw new Error('Sign in first.');
  if (!/^image\//.test(file.type) || file.size > 20000000) throw new Error('Choose an image under 20 MB.');
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise(resolve => canvas.toBlob(resolve, type === 'png' ? 'image/png' : 'image/jpeg', .82));
  if (!blob) throw new Error('Image conversion failed.');
  await refreshSession();
  const res = await fetch('/api/media', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': blob.type }, body: blob });
  if (!res.ok) throw new Error('Upload failed.');
  return (await res.json()).url;
}

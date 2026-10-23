import { test, expect } from '@playwright/test';

async function identity(page, signedIn = true, callback = null) {
  await page.route('**/node_modules/.vite/deps/@netlify_identity.js*', route => route.fulfill({ contentType: 'application/javascript', body: `
    export const getUser = async () => (${JSON.stringify(signedIn ? { id: 'test-user', name: 'Test Reader', email: 'reader@example.test' } : null)});
    export const handleAuthCallback = async () => (${JSON.stringify(callback)});
    export const refreshSession = async () => null;
    export const onAuthChange = () => () => {};
    export const getSettings = async () => ({disableSignup:false});
    export const login = async () => {};
    export const signup = async () => ({emailVerified:false});
    export const logout = async () => {};
    export const requestPasswordRecovery = async () => {};
    export const updateUser = async () => {};
    export const acceptInvite = async () => {};
  ` }));
}
async function state(page, options = {}) {
  const rows = new Map();
  await page.route('**/api/state', async route => {
    if (route.request().method() === 'GET') return route.fulfill({ json: [...rows.values()], status: options.loadFails ? 503 : 200 });
    if (options.saveFails?.()) return route.fulfill({ status: 503, json: { error: 'Unavailable' } });
    if (options.conflict) return route.fulfill({ status: 409, json: { error: 'Conflict' } });
    const body = route.request().postDataJSON();
    const version = body.version + 1;
    rows.set(body.key, { key: body.key, value: body.value, version });
    return route.fulfill({ json: { version } });
  });
  return rows;
}
async function openApp(page) {
  await page.goto('/');
  await expect(page.locator('#welcome')).toBeVisible();
  await page.locator('#wGo').click();
  await expect(page.locator('#app')).toBeVisible();
}

test('real signed-out page initializes and account controls work on mobile', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('**/.netlify/identity/settings', route => route.fulfill({ json: { disable_signup: false, external: {} } }));
  await page.goto('/');
  await expect(page.locator('#login')).toBeVisible();
  await expect(page.locator('#lHi')).not.toBeEmpty();
  await page.locator('#authSwitch').click();
  await expect(page.locator('#authLabel')).toHaveText('Create account');
  await page.locator('#authSwitch').click();
  await page.locator('#authRecover').click();
  await expect(page.locator('#authLabel')).toHaveText('Send reset link');
  await expect(page.locator('#pass')).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  expect(errors).toEqual([]);
});

test('private profile and events save and reload with server state', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await identity(page);
  const rows = await state(page);
  await openApp(page);
  await page.locator('#editBtn').click();
  await page.locator('#f0').fill('Updated Reader');
  await page.locator('#f1').fill('');
  await page.locator('#f3').fill('');
  await page.locator('#saveBtn').click();
  await expect(page.locator('#syncText')).toHaveText('All changes saved to your account.');
  expect(JSON.parse(rows.get('lumin.v4').value).name).toBe('Updated Reader');
  await page.locator('.menu [data-v="events"]').click();
  await page.locator('#evTitle').fill('Reading meetup');
  await page.locator('#evDate').fill('2026-12-05');
  await page.locator('#evForm button[type="submit"]').click();
  await expect(page.locator('#evList')).toContainText('Reading meetup');
  await expect(page.locator('#syncText')).toHaveText('All changes saved to your account.');
  await page.reload();
  await page.locator('#wGo').click();
  await page.locator('.menu [data-v="events"]').click();
  await expect(page.locator('#evList')).toContainText('Reading meetup');
  expect(errors).toEqual([]);
});

test('failed saves retain content, display a warning and retry successfully', async ({ page }) => {
  await identity(page);
  let failed = true;
  const rows = await state(page, { saveFails: () => failed });
  await openApp(page);
  await page.locator('#editBtn').click();
  await page.locator('#f0').fill('Unsaved Reader');
  await page.locator('#saveBtn').click();
  await expect(page.locator('#syncText')).toContainText('not saved');
  await expect(page.locator('#details')).toContainText('Unsaved Reader');
  expect(rows.size).toBe(0);
  failed = false;
  await page.locator('#syncRetry').click();
  await expect(page.locator('#syncText')).toContainText('All changes saved');
  expect(JSON.parse(rows.get('lumin.v4').value).name).toBe('Unsaved Reader');
});

test('failed loads block editing instead of replacing saved content with defaults', async ({ page }) => {
  await identity(page);
  await state(page, { loadFails: true });
  await page.goto('/');
  await expect(page.locator('#err')).toContainText('could not be loaded');
  await expect(page.locator('#app')).toBeHidden();
  await expect(page.locator('#authSubmit')).toBeHidden();
  await expect(page.locator('#syncRetry')).toHaveText('Reload');
});

test('concurrent edit conflict prevents overwriting content', async ({ page }) => {
  await identity(page);
  await state(page, { conflict: true });
  await openApp(page);
  await page.locator('#editBtn').click();
  await page.locator('#f0').fill('Conflicting Reader');
  await page.locator('#saveBtn').click();
  await expect(page.locator('#syncText')).toContainText('Changed on another device');
  await expect(page.locator('#syncRetry')).toBeHidden();
});

test('chat uses the website endpoint and retains failed questions for retry', async ({ page }) => {
  await identity(page);
  await state(page);
  let failed = false;
  await page.route('**/api/chat', route => route.fulfill({ status: failed ? 503 : 200, json: failed ? { error: 'Try again shortly.' } : { text: '126' } }));
  await openApp(page);
  await page.locator('.menu [data-v="chat"]').click();
  await page.locator('#chIn').fill('What is 15% of 840?');
  await page.locator('#chSend').click();
  await expect(page.locator('#chMsgs')).toContainText('126');
  failed = true;
  await page.locator('#chIn').fill('Try a second question');
  await page.locator('#chSend').click();
  await expect(page.locator('#chMsgs')).toContainText('Try again shortly.');
  await expect(page.locator('#chIn')).toHaveValue('Try a second question');
});

test('recovery callbacks stay on the password form', async ({ page }) => {
  await identity(page, false, { type: 'recovery', user: { id: 'test-user' } });
  await page.goto('/');
  await expect(page.locator('#authLabel')).toHaveText('Set new password');
  await expect(page.locator('#user')).toBeHidden();
  await expect(page.locator('#app')).toBeHidden();
});

test('image uploads store a private URL and failed uploads do not hang the gallery', async ({ page }) => {
  await identity(page);
  const rows = await state(page);
  let failUpload = true;
  const imageUrl = '/api/media?id=550e8400-e29b-41d4-a716-446655440000.png';
  await page.route('**/api/media', route => route.fulfill({ status: failUpload ? 503 : 200, json: failUpload ? { error: 'Unavailable' } : { url: imageUrl } }));
  await openApp(page);
  await page.locator('.menu [data-v="gallery"]').click();
  const bytes = await page.evaluate(async () => {
    const c = document.createElement('canvas'); c.width = 8; c.height = 8;
    c.getContext('2d').fillRect(0,0,8,8);
    return Array.from(new Uint8Array(await (await new Promise(resolve => c.toBlob(resolve))).arrayBuffer()));
  });
  const file = { name: 'photo.png', mimeType: 'image/png', buffer: Buffer.from(bytes) };
  await page.locator('#gFile').setInputFiles(file);
  await expect(page.locator('#toast')).toContainText('could not be uploaded');
  failUpload = false;
  await page.locator('#gFile').setInputFiles(file);
  await expect(page.locator('#gCount')).toHaveText('1 photo');
  await expect(page.locator('#syncText')).toContainText('All changes saved');
  expect(JSON.parse(rows.get('lumin.v4').value).gallery[0].img).toBe(imageUrl);
});

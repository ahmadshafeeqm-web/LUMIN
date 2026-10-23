import { getUser } from '@netlify/identity';
import { and, eq } from 'drizzle-orm';
import { database } from '../../db/index.js';
import { records } from '../../db/schema.js';
import { validRecord, validWriteOrigin } from '../../lib/validation.js';

export default async (req: Request) => {
  const user = await getUser();
  if (!user) return Response.json({ error: 'Please sign in again.' }, { status: 401 });
  const headers = { 'Cache-Control': 'no-store' };
  try {
    const db = database();
    if (req.method === 'GET') {
      const rows = await db.select().from(records).where(eq(records.userId, user.id));
      if (rows.some(r => !validRecord(r.key, r.value))) return Response.json({ error: 'Saved content needs repair. No changes were made.' }, { status: 422, headers });
      return Response.json(rows.map(r => ({ key: r.key, value: r.value, version: r.version })), { headers });
    }
    if (req.method !== 'PUT') return new Response(null, { status: 405 });
    if (!validWriteOrigin(req)) return new Response(null, { status: 403 });
    const raw = await req.text();
    if (raw.length > 2100000) return new Response(null, { status: 413 });
    const { key, value, version } = JSON.parse(raw);
    if (!validRecord(key, value) || !Number.isInteger(version) || version < 0) return Response.json({ error: 'Invalid saved content.' }, { status: 400 });
    const changed = version === 0
      ? await db.insert(records).values({ userId: user.id, key, value, version: 1 }).onConflictDoNothing().returning()
      : await db.update(records).set({ value, version: version + 1, updatedAt: new Date() }).where(and(eq(records.userId, user.id), eq(records.key, key), eq(records.version, version))).returning();
    if (!changed.length) return Response.json({ error: 'This content changed in another tab or device. Copy your unsaved changes, then reload.' }, { status: 409 });
    return Response.json({ version: changed[0].version }, { headers });
  } catch {
    return Response.json({ error: 'Could not save or load your content. Please retry.' }, { status: 503, headers });
  }
};
export const config = { path: '/api/state' };

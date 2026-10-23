import { getUser } from '@netlify/identity';
import { getStore } from '@netlify/blobs';
import { validWriteOrigin } from '../../lib/validation.js';

export default async (req: Request) => {
  const user = await getUser();
  if (!user) return new Response(null, { status: 401 });
  try {
    const store = getStore('private-images');
    if (req.method === 'GET') {
      const id = new URL(req.url).searchParams.get('id') || '';
      if (!/^[a-f0-9-]+\.(png|jpg)$/.test(id)) return new Response(null, { status: 400 });
      const bytes = await store.get(`${user.id}/${id}`, { type: 'arrayBuffer' });
      if (!bytes) return new Response(null, { status: 404 });
      return new Response(bytes, { headers: { 'Content-Type': id.endsWith('.png') ? 'image/png' : 'image/jpeg', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } });
    }
    if (req.method !== 'POST') return new Response(null, { status: 405 });
    if (!validWriteOrigin(req)) return new Response(null, { status: 403 });
    const bytes = await req.arrayBuffer();
    if (bytes.byteLength > 3000000) return new Response(null, { status: 413 });
    const b = new Uint8Array(bytes);
    const png = b[0] === 137 && b[1] === 80 && b[2] === 78 && b[3] === 71;
    const jpg = b[0] === 255 && b[1] === 216 && b[2] === 255;
    if (!png && !jpg) return new Response(null, { status: 415 });
    const id = `${crypto.randomUUID()}.${png ? 'png' : 'jpg'}`;
    await store.set(`${user.id}/${id}`, bytes);
    return Response.json({ url: `/api/media?id=${id}` }, { headers: { 'Cache-Control': 'no-store' } });
  } catch { return Response.json({ error: 'Image upload failed. Please retry.' }, { status: 503 }); }
};
export const config = { path: '/api/media' };

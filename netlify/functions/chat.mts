import { getUser } from '@netlify/identity';
import OpenAI from 'openai';
import { z } from 'zod';
import { validWriteOrigin } from '../../lib/validation.js';
export default async (req: Request) => {
  if (req.method !== 'POST') return new Response(null, { status: 405 });
  if (!await getUser()) return new Response(null, { status: 401 });
  if (!validWriteOrigin(req)) return new Response(null, { status: 403 });
  try {
    const raw = await req.text();
    if (raw.length > 60000) return new Response(null, { status: 413 });
    const messages = z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().min(1).max(12000) })).min(1).max(12).parse(JSON.parse(raw).messages);
    const completion = await new OpenAI().chat.completions.create({
      model: 'gpt-4.1-mini', max_tokens: 1200,
      messages: [{ role: 'system', content: 'You are the Lumin assistant. Answer clearly and concisely in the user language. You cannot browse the web or verify current sports, news, or prices. Be explicit about uncertainty. Any football snapshot supplied by the user is historical, unverified reference data, not live facts.' }, ...messages],
    }, { signal: req.signal });
    return Response.json({ text: completion.choices[0]?.message.content || 'Please try rephrasing your question.' }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    if (e instanceof z.ZodError || e instanceof SyntaxError) return Response.json({ error: 'Please send a shorter question.' }, { status: 400 });
    return Response.json({ error: 'The assistant is unavailable right now. Please try again shortly.' }, { status: 503 });
  }
};
export const config = { path: '/api/chat', rateLimit: { windowLimit: 12, windowSize: 60, aggregateBy: ['ip', 'domain'] } };

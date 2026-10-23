import { z } from 'zod';
const text = z.string().max(20000);
const short = z.string().max(300);
const id = z.union([z.number().finite(), short]);
const image = z.string().max(200).refine(v => v === '' || /^\/api\/media\?id=[a-f0-9-]+\.(png|jpg)$/.test(v));
export const profileSchema = z.object({
  avatar: image, name: short, tagline: short,
  fields: z.array(z.tuple([short, short])).min(1).max(30), about: text,
  events: z.array(z.object({ id, title: short, date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), place: short })).max(1000),
  memories: z.array(z.object({ id, title: short, date: short, text, img: image })).max(1000),
  gallery: z.array(z.object({ id, title: short, kind: short.optional(), img: image.optional() })).max(1000),
});
const score = z.object({ n: short }).catchall(z.union([short, z.number().finite()]));
const schemas: Record<string, z.ZodType> = {
  'lumin.v4': profileSchema,
  'lumin.chat': z.array(z.object({ role: z.enum(['user', 'assistant']), content: text })).max(30),
  'lumin.create': z.array(z.object({ id: z.number(), type: short, words: z.array(short).max(3), text, score: z.number().min(0).max(100) })).max(1000),
  'lumin.chal': z.object({ pts: z.number(), streak: z.number(), best: z.number(), last: short, done: z.record(short, z.object({ type: short, pts: z.number() })), c: z.object({ words: z.number(), puzzle: z.number(), explain: z.number(), creative: z.number() }), badges: z.array(short) }),
  'lumin.lb.v1': z.object({ xox: z.record(short, z.number()), puz: z.array(score).max(60), sud: z.array(score).max(60), quiz: z.array(score).max(60) }),
  'lumin.crests': z.record(short, image),
};
export function validRecord(key: string, value: unknown): boolean {
  if (typeof value !== 'string' || value.length > 2000000) return false;
  if (key === 'lumin.logo') return image.safeParse(value).success;
  if (key === 'lumin.player') return value.length <= 300;
  if (/^lumin\.puzbest[34]$/.test(key)) return /^\d{1,8}$/.test(value);
  const schema = schemas[key];
  if (!schema) return false;
  try { return schema.safeParse(JSON.parse(value)).success; } catch { return false; }
}
export function validWriteOrigin(req: Request): boolean {
  const origin = req.headers.get('origin');
  return !!origin && origin === new URL(req.url).origin;
}

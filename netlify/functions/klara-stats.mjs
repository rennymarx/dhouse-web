// Klára — čtení počítadla kroků.
// GET /.netlify/functions/klara-stats?key=<KLARA_STATS_KEY>&od=RRRR-MM-DD&do=RRRR-MM-DD
// → JSON [{den, utm_source, utm_content, krok, pocet}], seřazeno podle dne, zdroje, obsahu a kroku.
// Klíč je proměnná prostředí KLARA_STATS_KEY v Netlify; dokud není nastavená, vrací 503.
import { getStore } from '@netlify/blobs';
import { createHash, timingSafeEqual } from 'node:crypto';
import { STORE, denPraha, unseg } from '../lib/klara.mjs';

const DATUM = /^\d{4}-\d{2}-\d{2}$/;
const MAX_DNU = 366;

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
});
const sha = s => createHash('sha256').update(String(s)).digest();

function dny(od, ddo) {
  const out = [];
  for (let d = new Date(od + 'T12:00:00Z'); d <= new Date(ddo + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + 1)) {
    out.push(d.toISOString().slice(0, 10));
    if (out.length > MAX_DNU) return null;
  }
  return out;
}

export default async (req) => {
  // mezery a konce řádků okolo (při vkládání do Netlify) se ignorují
  const secret = ((globalThis.Netlify?.env?.get('KLARA_STATS_KEY')) || process.env.KLARA_STATS_KEY || '').trim();
  if (!secret) return json({ chyba: 'KLARA_STATS_KEY neni nastaven' }, 503);
  const url = new URL(req.url);
  if (!timingSafeEqual(sha((url.searchParams.get('key') || '').trim()), sha(secret))) return json({ chyba: 'neplatny klic' }, 401);

  const dnes = denPraha();
  const od = url.searchParams.get('od') || dnes;
  const ddo = url.searchParams.get('do') || od;
  if (!DATUM.test(od) || !DATUM.test(ddo) || od > ddo) return json({ chyba: 'od/do musi byt RRRR-MM-DD a od <= do' }, 400);
  const seznam = dny(od, ddo);
  if (!seznam) return json({ chyba: `nejvic ${MAX_DNU} dni` }, 400);

  const store = getStore(STORE);
  const soucty = new Map();
  for (const den of seznam) {
    for await (const page of store.list({ prefix: `${den}/`, paginate: true })) {
      for (const { key } of page.blobs) {
        const [d, src, content, krok] = key.split('/');
        const k = [d, src, content, krok].join('/');
        soucty.set(k, (soucty.get(k) || 0) + 1);
      }
    }
  }
  const rows = [...soucty.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([k, pocet]) => {
    const [den, src, content, krok] = k.split('/');
    return { den, utm_source: unseg(src), utm_content: unseg(content), krok, pocet };
  });
  return json(rows);
};

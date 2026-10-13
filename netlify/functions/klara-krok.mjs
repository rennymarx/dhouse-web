// Klára — počítadlo kroků testu (dhouse.cz/klara).
// Přijme navigator.sendBeacon s {krok, utm_source, utm_content} (nebo pole takových objektů – připraveno na dávkování)
// a uloží jeden prázdný záznam do Netlify Blobs pod klíčem den/zdroj/obsah/krok/náhodné-ID.
// Žádná osobní data: neukládá se IP, e-mail, ID testu ani nic z prohlížeče, jen který krok a z jaké reklamy.
// Čtení součtů: klara-stats.mjs.
import { getStore } from '@netlify/blobs';
import { STORE, denPraha, seg } from '../lib/klara.mjs';

const KROK = /^Klara[A-Za-z0-9_]{1,40}$/;
const MAX_ITEMS = 50;

export default async (req) => {
  if (req.method !== 'POST') return new Response(null, { status: 405 });
  let body;
  try { body = JSON.parse(await req.text()); } catch { return new Response(null, { status: 400 }); }
  const items = (Array.isArray(body) ? body : [body]).slice(0, MAX_ITEMS)
    .filter(x => x && typeof x.krok === 'string' && KROK.test(x.krok));
  if (!items.length) return new Response(null, { status: 400 });

  const store = getStore(STORE);
  const den = denPraha();
  await Promise.all(items.map(x => {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    return store.set(`${den}/${seg(x.utm_source)}/${seg(x.utm_content)}/${x.krok}/${id}`, '');
  }));
  return new Response(null, { status: 204 });
};

// Klára — počítadlo kroků testu (dhouse.cz/klara).
// Přijme navigator.sendBeacon s {krok, utm_source, utm_content} (nebo pole takových objektů – připraveno na dávkování)
// a každou událost uloží jako prázdný záznam v Netlify Blobs pod klíčem den/zdroj/obsah/krok/náhodné-UUID.
// Žádná osobní data: neukládá se IP, e-mail, ID testu, čas ani nic z prohlížeče, jen den, krok a z jaké reklamy.
// Čtení součtů: klara-stats.mjs.
import { getStore } from '@netlify/blobs';
import { randomUUID } from 'node:crypto';
import { storeName, denPraha, seg } from '../lib/klara.mjs';

// jen známé kroky testu (KlaraObr_… pro mezistránky)
const KROK = /^Klara(Nacteno|TestStart|Q(0[1-9]|10)|TestComplete|Mapa[1-4]|EmailVidet|EmailOdeslan|CTAVidet|ContinueClick|Obr_[A-Za-z0-9]{1,20})$/;
const MAX_ITEMS = 30; // jeden celý průchod testem má 22 kroků

export default async (req, context) => {
  if (req.method !== 'POST') return new Response(null, { status: 405 });
  let body;
  try { body = JSON.parse(await req.text()); } catch { return new Response(null, { status: 400 }); }
  const items = (Array.isArray(body) ? body : [body]).slice(0, MAX_ITEMS)
    .filter(x => x && typeof x.krok === 'string' && KROK.test(x.krok));
  if (!items.length) return new Response(null, { status: 400 });

  const store = getStore(storeName(context));
  const den = denPraha();
  await Promise.all(items.map(x =>
    store.set(`${den}/${seg(x.utm_source, 60)}/${seg(x.utm_content, 300)}/${x.krok}/${randomUUID()}`, '')));
  return new Response(null, { status: 204 });
};

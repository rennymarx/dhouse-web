// Společné pro funkce klara-krok a klara-stats (mimo netlify/functions, aby to nebyla samostatná funkce).
export const STORE = 'klara-kroky';

// Produkce (i neznámý kontext, aby se ostrá data nikdy tiše neztratila) píše do 'klara-kroky';
// deploy preview / branch deploy / dev mají vlastní store, takže testy na náhledu nemíchají ostrá čísla.
export function storeName(context) {
  const ctx = context?.deploy?.context;
  return (!ctx || ctx === 'production') ? STORE : `${STORE}-${ctx}`;
}

// Den v Praze ve tvaru RRRR-MM-DD.
export function denPraha(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Prague', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

// Zkrácení na nejvýš maxBytes bajtů UTF-8, bez rozdělení znaku.
function cut(s, maxBytes) {
  let out = '', n = 0;
  for (const ch of s) {
    const b = Buffer.byteLength(ch, 'utf8');
    if (n + b > maxBytes) break;
    out += ch; n += b;
  }
  return out;
}

// Hodnota do segmentu klíče: base64url s předponou „v“ (prázdná hodnota = „v“), aby v klíči nebylo „/“ ani diakritika.
// Limity drží celý klíč pod 600 B (limit Netlify Blobs).
export function seg(s, maxBytes) {
  return 'v' + Buffer.from(cut(String(s || '').trim(), maxBytes), 'utf8').toString('base64url');
}
export function unseg(s) {
  return Buffer.from(s.slice(1), 'base64url').toString('utf8');
}

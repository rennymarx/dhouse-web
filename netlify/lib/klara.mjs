// Společné pro funkce klara-krok a klara-stats (mimo netlify/functions, aby to nebyla samostatná funkce).
export const STORE = 'klara-kroky';

// Den v Praze ve tvaru RRRR-MM-DD.
export function denPraha(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Prague', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

// Hodnota do segmentu klíče: base64url s předponou „v“ (prázdná hodnota = „v“), aby v klíči nebylo „/“ ani diakritika.
export function seg(s) {
  return 'v' + Buffer.from(String(s || '').trim().slice(0, 100), 'utf8').toString('base64url');
}
export function unseg(s) {
  return Buffer.from(s.slice(1), 'base64url').toString('utf8');
}

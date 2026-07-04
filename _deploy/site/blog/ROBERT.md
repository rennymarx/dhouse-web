# Návod pro Roberta — nový blogový článek na dhouse.cz

Robert, ty jsi AI náměstek (Claude Cowork agent), který týdně tvoří obsah pro blog dhouse.cz. Tento dokument je tvůj přesný postup. Drž se ho. Když si nejsi jistý, **stop a zeptej se Marka** — raději opožděný článek než rozbitý web.

## Brand a tón hlasu

- **Značka:** dhouse je atelier prémiových kuchyní v Praze 10 — Vršovice. Výhradní zastoupení německé manufaktury **SACHSENKÜCHEN**. Komponenty: pracovní desky **AKP**, spotřebiče **TEKA** a **Küppersbusch**.
- **Tón:** věcný, klidný, mírně knižní. Žádné výkřiky, žádné prodejní fráze typu „bezkonkurenční", „nejlepší na trhu", „revoluční". Psali to lidé, kteří dělají kuchyně 30 let — ne markeťák.
- **Cíl publika:** majitelé bytů a domů, kteří plánují rekonstrukci nebo novostavbu, hodnotí kvalitu, mají rozpočet a chtějí rozumět tomu, za co platí.
- **Cíl článku:** pomoct čtenáři udělat informované rozhodnutí + nenápadně ho dovést k myšlence „zajít do atelieru". Žádné agresivní CTA v textu — CTA blok je už v šabloně.

## Délka a formát

- **Délka:** 600–1200 slov. Spíš méně a hutněji než dlouhé a vodnaté.
- **Struktura:** úvodní odstavec (3–4 věty, nastolení tématu) → 3–5 mezititulků (`<h2>`) → závěr (2–3 věty, shrnutí + odlehčená pointa).
- **HTML tagy v body:** `<h2>`, `<h3>`, `<p>`, `<ul>` / `<ol>` + `<li>`, `<blockquote>`, `<strong>`, `<em>`, `<a>`, `<img>`. **Žádný `<script>`, `<iframe>`, `<style>`.**
- **Odstavce:** 3–5 vět. Pak zalom. Žádné monolitické bloky.

## Postup (KROK ZA KROKEM)

### 1. Vyber téma a slug

- Téma konzultuj s Markem (nebo s tématickým plánem v Notion / repo `dhouse-content`).
- **Slug** = identifikátor v URL. Pravidla:
  - jen `[a-z0-9-]` (lowercase písmena, čísla, pomlčky)
  - bez diakritiky (`č` → `c`, `ž` → `z`, `ě` → `e`, …)
  - bez `the`, `a`, `o` na začátku — jdi rovnou k jádru
  - délka 30–60 znaků ideálně
- Příklad: `jak-vybrat-pracovni-desku-kuchyne`, `co-je-faceline-koncept`, `rozdil-mezi-lakem-a-dyhou`.

### 2. Zkopíruj šablonu

```bash
cp blog/_template.html blog/<slug>.html
```

Otevři nový soubor. Šablona má dvě části: **hlavičku (`<head>`) bez kotev — hodnoty edituj přímo** — a **tělo (`<body>`) s komentářovými kotvami `<!-- BLOG:* -->` — měň jen text mezi nimi, kotvy nemaž.**

### 3a. Hlavička (`<head>`) — edituj hodnoty přímo (žádné kotvy)

Nahraď výchozí hodnoty (např. „Titulek článku", „Perex článku…", `slug`) svými:

| Kde | Co tam jde |
|---|---|
| `<title>` | Titulek (max 70 znaků, bez tečky) + zůstává „ · dhouse Blog" |
| `<meta name="description">` | Perex 140–180 znaků, končí tečkou |
| `<link rel="canonical">` + `og:url` | `https://dhouse.cz/blog/<slug>` (doslova) |
| `og:title` + `twitter:title` | stejný titulek jako v `<title>` |
| `og:description` + `twitter:description` | stejný perex jako v description |
| `og:image` + `twitter:image` | **ABSOLUTNÍ** `https://dhouse.cz/blog/img/<slug>/hero.jpg` |
| `article:published_time` | `YYYY-MM-DD` |
| `article:author` | `Robert (dhouse)` |
| `article:section` | tag (lowercase, např. `materialy`) |
| JSON-LD `Article` (`<script type=ld+json>`) | přepiš `headline`, `description`, `datePublished`, `image` (absolutní) — musí sedět s hlavičkou |

### 3b. Tělo (`<body>`) — kotvy `<!-- BLOG:X -->…<!-- /BLOG:X -->` (nemaž je, měň text uvnitř)

| Kotva | Co tam jde | Výskytů v těle |
|---|---|---|
| `BLOG:TITLE` | Titulek v `<h1>` (stejný jako v hlavičce) | 1× |
| `BLOG:META_DESC` | Perex nad článkem (stejný jako v hlavičce) | 1× |
| `BLOG:DATE_ISO` | `YYYY-MM-DD` (do `<time datetime>`) | 1× |
| `BLOG:DATE_HUMAN` | „9. června 2026" | 1× |
| `BLOG:TAG` | jeden lowercase tag bez diakritiky (`materialy`, `tipy`, `inspirace`, `znacka`, `udrzba`) | 1× |
| `BLOG:BODY` | celé tělo článku v HTML | 1× |
| `BLOG:AUTHOR` | `Robert (dhouse)` | 1× |

### 4. Připrav obrázky

Vytvoř složku `/blog/img/<slug>/` a vlož:

- `hero.jpg` — **povinně**, 1600×900 px, ≤300 kB. Používá se jako hero v článku i jako Open Graph náhled.
- `01.jpg`, `02.jpg`, … — volitelně inline obrázky v těle. Referencuj v body: `<img src="/blog/img/<slug>/01.jpg" alt="popis" />`

**Bez diakritiky v názvech**, lowercase. Velikost: dlouhá strana max 1600 px, formát JPG (Q 80–85) nebo WebP.

### 5. Přidej záznam do `posts.js`

Otevři `/blog/posts.js`. Záznam přidej **NA ZAČÁTEK** pole `window.BLOG_POSTS` (nejnovější první):

```javascript
window.BLOG_POSTS = [
  {
    slug: "tvuj-novy-slug",
    title: "Tvůj titulek (přesně jako BLOG:TITLE)",
    date: "2026-06-15",
    excerpt: "Tvůj perex (přesně jako BLOG:META_DESC).",
    image: "/blog/img/tvuj-novy-slug/hero.jpg",
    tags: ["materialy"],
    author: "Robert (dhouse)"
  },
  // ... existující články pod
];
```

**Pozor na čárky.** Mezi záznamy patří `,`. Za posledním záznamem ne (nebo ano, JS to toleruje, ale ne všechny verze). Když si nejsi jistý, dej čárku za každým — moderní prohlížeče to zvládnou.

### 6. Aktualizuj `<noscript>` fallback v `blog/index.html`

Otevři `/blog/index.html`. Najdi blok mezi `<!-- BLOG:NOSCRIPT_LIST_START -->` a `<!-- BLOG:NOSCRIPT_LIST_END -->`. Vlož **na začátek** seznamu:

```html
<li><a href="/blog/<slug>"><strong>Tvůj titulek</strong> — krátký dodatek <em>(9. 6. 2026)</em></a></li>
```

Pokud je v seznamu už 10 položek, smaž tu poslední (nejstarší).

### 7. Přidej do `sitemap.xml`

Otevři `/sitemap.xml` v rootu projektu. Najdi blok `<!-- BLOG:POSTS_START -->`. Vlož **na začátek**:

```xml
<url>
  <loc>https://dhouse.cz/blog/<slug></loc>
  <lastmod>2026-06-15</lastmod>
  <changefreq>monthly</changefreq>
  <priority>0.6</priority>
</url>
```

### 8. Přidej do `blog/rss.xml`

Otevři `/blog/rss.xml`. Najdi blok `<!-- BLOG:RSS_ITEMS_START -->`. Vlož **na začátek**:

```xml
<item>
  <title>Tvůj titulek</title>
  <link>https://dhouse.cz/blog/<slug></link>
  <guid isPermaLink="true">https://dhouse.cz/blog/<slug></guid>
  <pubDate>Mon, 15 Jun 2026 09:00:00 +0200</pubDate>
  <dc:creator>Robert (dhouse)</dc:creator>
  <category>materialy</category>
  <description>Tvůj perex.</description>
</item>
```

`pubDate` musí být v formátu RFC 822 (`Mon, 15 Jun 2026 09:00:00 +0200`). Drž jen **posledních 20 položek**, starší smaž.

### 9. **VALIDACE — povinný krok**

Otevři `https://<staging-url>/blog/_check.html` (na lokálu: file:// nefunguje pro fetch, použij staging deploy).

**Všechny řádky musí být ✅.** Pokud něco není zelené, oprav a opakuj. Typické chyby:

- ❌ `slug` — máš v něm diakritiku nebo velká písmena
- ❌ `date` — nemá formát `YYYY-MM-DD`
- ❌ `excerpt` — moc krátký (<60) nebo moc dlouhý (>220)
- ❌ `HTML soubor existuje` — zapomněl jsi zkopírovat `_template.html` na `<slug>.html`
- ❌ `hero obrázek existuje` — chybí soubor `/blog/img/<slug>/hero.jpg`

### 10. Otevři článek v náhledu

Vizuální kontrola: titulek, hero, body, CTA blok. Open Graph se zkontrolovat dá až po deployi, ale formálně zkontroluj že **všechny `BLOG:*` kotvy mají správně doplněný obsah** (žádné defaultní „Titulek článku" tam zbývat nesmí).

### 11. Commit + push

```bash
git add blog/<slug>.html blog/img/<slug>/ blog/posts.js blog/index.html blog/rss.xml sitemap.xml
git commit -m "blog: <titulek>"
git push
```

Netlify deploy se spustí automaticky. Po 1–2 minutách je článek live.

### 12. Po deployi — finální kontrola

- Otevři `https://dhouse.cz/blog/<slug>` — vykresluje se?
- Otevři `https://dhouse.cz/blog` — je tam karta nejnovějšího článku?
- Vlož URL do [opengraph.xyz](https://www.opengraph.xyz) — náhled na Facebook/LinkedIn vypadá správně?
- Otevři `https://dhouse.cz/blog/_check.html` — vše ✅?

Pokud ano, hotovo. Pošli URL Markovi do Slacku.

---

## Časté otázky

**Q: Můžu psát něco kontroverzního nebo přímo kritizovat konkurenci?**
A: Ne. Pozitivní vymezení („proč naše řešení dává smysl"), ne negativní („proč konkurence nestojí za to"). Jméno konkurenční značky uváděj jen v technickém srovnání bez hodnocení.

**Q: Můžu zmínit ceny?**
A: Rozpočtové rozsahy ano (např. „kuchyně v této kategorii začínají na cca 350 000 Kč"). Konkrétní ceník ne — to je věc atelieru a konzultace.

**Q: Můžu psát jako „my" nebo jako „já"?**
A: My. „V dhouse atelieru pracujeme…", ne „Jsem Robert a doporučuji…". Robert je podpis, ne charakter textu.

**Q: Musím psát titulek a perex víckrát?**
A: Ano. Hlavička už kotvy nemá, takže titulek napiš do `<title>`, `og:title`, `twitter:title`, JSON-LD `headline` a do `<h1>` (kotva BLOG:TITLE); perex do `description`, `og:description`, `twitter:description`, JSON-LD `description` a do perexu v těle (kotva BLOG:META_DESC). Napiš jednou dobře a zkopíruj — všude musí být identické.

**Q: Co když si nejsem jistý slugem?**
A: Použij ASCII přepis bez diakritiky, lowercase, slova spojená pomlčkou, max 60 znaků. Zkontroluj v `posts.js` že stejný slug ještě neexistuje.

**Q: Mám psát na konec článku CTA „zajděte do atelieru"?**
A: Ne v body. CTA blok je už v šabloně pod článkem. Závěr body je pointa, ne prodej.

---

## Checklist před commitem

- [ ] `<slug>.html` existuje, žádné defaultní „Titulek článku" v něm nezůstaly
- [ ] `/blog/img/<slug>/hero.jpg` existuje (1600×900, ≤300 kB)
- [ ] Záznam přidán do `posts.js` na začátek pole
- [ ] Záznam přidán do `<noscript>` v `blog/index.html`
- [ ] Záznam přidán do `sitemap.xml`
- [ ] Záznam přidán do `blog/rss.xml`
- [ ] `_check.html` ukazuje samé ✅
- [ ] Vizuální kontrola článku v náhledu
- [ ] Commit message: `blog: <stručný popis článku>`

Pokud máš všechno odškrtnuté, commit a push. Hotovo.

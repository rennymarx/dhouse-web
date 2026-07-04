# dhouse.cz

Prezentační web atelieru prémiových kuchyní **dhouse** v Praze.
Výhradní zastoupení **SACHSENKÜCHEN** v Česku.

Statický web — **žádný build, žádné závislosti.** Čisté HTML + CSS + trocha JavaScriptu.
Otevře se v jakémkoli prohlížeči, nasadí kamkoli.

---

## Struktura

```
dhouse-web/
├─ index.html                      # Homepage
├─ galerie.html                    # Galerie kuchyní + lightbox
├─ kvalita.html                    # Manufaktura, SACHSENKÜCHEN, partneři (AKP/TEKA/Küppersbusch)
├─ atelier.html                    # Showroom Praha 10 — adresa, mapa
├─ kontakt.html                    # Kontaktní formulář (Netlify Forms)
├─ dekujeme.html                   # Po odeslání formuláře
├─ impressum.html                  # Tiráž
├─ obchodni-podminky.html
├─ ochrana-osobnich-udaju.html     # GDPR
├─ blog/
│  ├─ index.html                   # Přehled — renderuje z posts.js
│  ├─ posts.js                     # window.BLOG_POSTS = [...] (manifest)
│  ├─ rss.xml                      # RSS feed pro email kanály
│  ├─ _template.html               # Šablona pro Roberta
│  ├─ _check.html                  # Validátor (otevřít po každé úpravě)
│  ├─ ROBERT.md                    # Návod pro AI editora (Roberta)
│  └─ <slug>.html                  # Jednotlivé články
├─ css/style.css                   # Design tokeny + komponenty
├─ js/main.js                      # Mobilní menu, lightbox, scroll
├─ assets/                         # Loga, fotky kuchyní, ikony
├─ netlify.toml                    # Hezké URL, cache, bezpečnost
├─ robots.txt, sitemap.xml
└─ OBSAH.md                        # Co doplnit (fotky, texty, kontakty)
```

---

## Lokální náhled

Nejjednodušší: **dvakrát klikni na `index.html`** — otevře se v prohlížeči.
(Formulář a hezké URL `/galerie` fungují až po nasazení na Netlify.)

---

## Nasazení na Netlify

### Varianta A — přetažením (nejrychlejší)
1. Jdi na [app.netlify.com/drop](https://app.netlify.com/drop)
2. Přetáhni do okna **celou složku `dhouse-web`**
3. Hotovo — web je online na náhodné adrese `*.netlify.app`

### Varianta B — přes GitHub (doporučeno)
1. Nahraj složku na GitHub: `rennymarx/dhouse-web`
2. Na Netlify: **Add new site → Import from GitHub → vyber repozitář**
3. Build command nech **prázdný**, publish directory = `.`
4. Každý `git push` od teď web automaticky aktualizuje

---

## Doména dhouse.cz

Až přejdeme na ostrou doménu:
1. Na Netlify: **Site settings → Domain management → Add custom domain** → `dhouse.cz`
2. U registrátora domény přesměrovat A-záznam na Netlify (75.2.60.5) + CNAME `www`
3. HTTPS certifikát Netlify vystaví automaticky
4. Odstranit `<meta robots noindex>` z hlaviček HTML stránek (hledej komentář `STAGING`)
5. V `robots.txt` přepnout `Disallow: /` → `Allow: /` a odkomentovat sitemap

---

## Kontaktní formulář

Formulář na `kontakt.html` používá **Netlify Forms** — funguje bez serveru.
Odeslané poptávky jsou v **Netlify → Forms → `kontakt`**.
Email upozornění: **Forms → Settings → Form notifications → Add → Email**.

---

## Blog — týdně plněný Robertem

Robert (Claude Cowork agent) přidává články týdně. Přesný postup je v
[blog/ROBERT.md](blog/ROBERT.md). Lidská kontrola: po každém pushi otevři
`https://<staging-url>/blog/_check.html` — všechny řádky musí být ✅.

---

## Časté úpravy obsahu

| Co | Kde |
|---|---|
| Telefon / e-mail | hledej `+420 272 681 854` a `team@rennymarx.com` ve všech `.html` |
| Adresa atelieru | hledej `Svatopluka Čecha` ve všech `.html` |
| Otevírací doba | `atelier.html` + footer |
| Barvy / fonty | `css/style.css` nahoře — blok `:root` (`--accent`, `--bg`, …) |
| Testimoniály | `index.html`, sekce `recenze` |
| Modely v galerii | `galerie.html` |

---

## Co je hotové

Homepage + 5 sekundárních stránek + 3 právní stránky + blog systém.
Plně responzivní (mobil/tablet/desktop) · Netlify Forms · SEO (meta, OG, sitemap) ·
přístupnost (mobilní menu, focus stavy, alt texty) · žádné trackery, žádné cookies.

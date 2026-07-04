# dhouse.cz — Launch runbook (ostré spuštění)

Web běží jako staging na `https://papaya-genie-f481ff.netlify.app/` (v2 v rootu; verzování /1 /2
zrušeno 2026-07-04, staré cesty 301 na root). Doména `dhouse.cz` teď běží na **HubSpot CMS**.
Launch = přepnutí této Netlify site na produkční build + přepnutí DNS z HubSpotu.

## Architektura: JEDEN web (rozhodnutí 2026-07-05)

Tato Netlify site `papaya-genie-f481ff` slouží jako **staging teď i produkce po launchi**. Žádná druhá site se nezakládá.
- **Teď (staging):** root `netlify.toml` má `publish = "_deploy/site"` → v2 s `<meta noindex>`.
- **Po launchi (produkce):** změní se na `publish = "_deploy/prod"` → tentýž web BEZ noindex, na doméně `dhouse.cz`.

Přepínač je v **root `netlify.toml`** (má přednost před Netlify UI). Launch = jednořádková změna + push.

## Co je HOTOVO (nemusí se dělat v den D)
- **Produkční build v repu:** `_deploy/prod/` (root, BEZ noindex, prod `robots.txt`+`sitemap.xml`+`_redirects`+`_headers` vč. CSP). Generuje `_launch.ps1`. Ověřeno: 0 rozbitých odkazů, 45/45 sitemap URL, žádné hubfs/hs-fs hotlinky, canonical/OG → dhouse.cz.
- **Formulářová notifikace:** Netlify Forms detekce zapnuta, formulář `kontakt` detekován, e-mail poptávek chodí na `team@rennymarx.com` (předmět „Nová poptávka z webu dhouse.cz"). — nastaveno 2026-07-05.
- **root `netlify.toml` vyčištěn** na jedno-web přepínač (odstraněn hlavičkový `X-Robots-Tag=noindex`, který by jinak držel produkci neviditelnou, a mrtvé verzované redirecty).
- Meta Pixel `818976925290103` + HubSpot portal `2996399` v `js/main.js`, spouští se AŽ po souhlasu.
- Detaily inspirací na `/galerie/<český-slug>/`; `_redirects` má 1:1 301 ze starých `/realizace/<de-slug>/` + catch-all; staré `/1/ /2/ → /`.
- LocalBusiness + Article JSON-LD, sitemap.xml (45 URL), 404 (noindex), apple-touch-icon, OG image.
- Bezpečnostní hlavičky (CSP, Permissions-Policy, nosniff, Referrer-Policy, frame-ancestors); HSTS připraven zakomentovaný v `_deploy/prod/_headers`.

## Sekvence v den spuštění (pořadí ZACHOVAT)

**1. (volitelně) Čerstvý produkční build** — jen pokud se web od 2026-07-05 ještě měnil
```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File _launch.ps1   # -> _deploy/prod
git add -f _deploy/prod ; git commit -m "Launch: cerstvy prod build" ; git push
```

**2. Přepnout site na produkční build**
- V `netlify.toml` (root repa) změnit `publish = "_deploy/site"` → **`publish = "_deploy/prod"`**.
- `git commit -m "Launch: publish _deploy/prod" ; git push` → Netlify sám nasadí prod build.
- (Tohle udělá Claude na pokyn; je to jednořádková změna + push.)

**3. Ověřit produkci na `papaya-genie-f481ff.netlify.app` — JEŠTĚ PŘED DNS**
- Web se vykresluje, žádné rozbité cesty.
- Zdroj homepage **NEobsahuje** `noindex` a hlavičky **nemají** `X-Robots-Tag`; 404 stránka noindex ANO.
- `/robots.txt` = `Allow: /` + `Sitemap:`; `/sitemap.xml` = 200.
- Redirecty: `/hubfs/x` → 301 `/`; **`/realizace/harmonie-aus-natur-und-design/` → 301 `/galerie/harmonie-prirody-a-designu/`**; `/2/x` → 301 `/`; neexistující URL → 404.
- securityheaders.com → Grade A. Cookie lišta + po „Přijmout vše" pixel (Meta Pixel Helper) i HubSpot.
- **Test formuláře:** odeslat zkušební poptávku → přijde na `team@rennymarx.com`.
- **Až tady je vše OK, pokračuj na DNS.** (Prod je live na netlify.app PŘED DNS = žádné okno výpadku.)
- Pozn.: v tomto krátkém okně servíruje `netlify.app` indexovatelný prod build; canonical tagy míří na `dhouse.cz`, takže riziko zaindexování staging URL je zanedbatelné. Krok 2–5 udělej v jednom sezení.

**4. Custom doména na tuto site**
- Domain management → Add custom domain: `dhouse.cz` + `www.dhouse.cz`.
- Primary domain = **apex `dhouse.cz`** (sedí s canonical tagy); `www` → 301 na apex.

**5. DNS (dělá správce domény — přepnout z HubSpotu na Netlify)**
⚠️ **MĚNIT JEN WEBOVÉ ZÁZNAMY (A/CNAME).** Na doméně běží e-mailové schránky (mj. radek@dhouse.cz) —
**MX, SPF (TXT), DKIM a DMARC záznamy NECHAT NETKNUTÉ.**
Použij PŘESNÉ hodnoty z Netlify *Domain settings → DNS configuration*. Standardně:
- Apex `dhouse.cz`: **A** → `75.2.60.5` (ověř v UI)
- `www.dhouse.cz`: **CNAME** → `papaya-genie-f481ff.netlify.app`
- Odstranit staré HubSpot **A/CNAME** (a jen ty). TTL 300 s.

**6. TLS**
- Po propsání DNS: Netlify vydá Let's Encrypt cert pro `dhouse.cz` + `www`. Zapnout **Force HTTPS**.

**7. Ověření na ostré doméně**
- Všechny stránky 200: `/`, `/galerie`, `/galerie/<slug>/`, `/kvalita`, `/atelier`, `/kontakt`, `/blog`, právní.
- Redirecty (na `dhouse.cz`): `/hubfs/x` → 301; `/realizace/harmonie-aus-natur-und-design/` → 301 `/galerie/harmonie-prirody-a-designu/`; 404 stránka.
- **Pošta:** poslat + přijmout testovací mail na radek@dhouse.cz (MX nedotčeny).
- Meta Pixel Helper: pixel `818976925290103` + PageView po souhlasu. HubSpot: přicházejí návštěvy.
- Formulář: testovací poptávka → `team@rennymarx.com`. OG: FB debugger.

**8. HSTS (až po pár dnech stabilního https)**
- V `_deploy/prod/_headers` odkomentovat `Strict-Transport-Security: max-age=31536000` (bez `includeSubDomains`!
  `online.dhouse.cz` běží na Konverzky — includeSubDomains přidat až po ověření čistého https subdomény; `preload` později). Re-deploy.

**9. Google Search Console** (jde i den po launchi)
- Radek založí GSC property `dhouse.cz` → `googleXXXX.html` do rootu (repo root + `_launch.ps1` znovu) → commit → ověřit → Submit sitemap.

**10. Uptime monitoring**
- Netlify notifikace, nebo UptimeRobot na `https://dhouse.cz` (5 min, alert na team@).

## Akce mimo kód (dashboardy — dělá Radek)
- ~~Netlify Forms notifikace na team@~~ **HOTOVO 2026-07-05.**
- **Netlify → Deploy notifications → přidat „GitHub commit status"** (volitelné). Zjištěno 2026-07-04: Netlify teď deploy do GitHubu NEhlásí, takže nejde tahat deploy permalink z GitHub API. Po zapnutí to půjde bez Netlify tokenu; u private repa přes fine-grained `GITHUB_TOKEN` (jen toto repo, read-only, Commit statuses + Checks).
- **Repo → Private** (viz níže) + **2FA** na Netlify i GitHub účtu.
- **Staré DEPLOY notifikace na `marketing@rennymarx.com`** (Project configuration → Notifications → Deploy notifications, 6×) — technické, volitelně přesměrovat/smazat.
- HubSpot ↔ Calendly / plné napojení formuláře na CRM — později.
- Google Business Profil — HOTOVO (zbývá jen otevírací doba).

### Repo → Private
GitHub visibility je access-control změna — udělej ji ty (jedním z):
```bash
gh repo edit rennymarx/dhouse-web --visibility private --accept-visibility-change-consequences
```
nebo v GitHub UI: repo → Settings → General → Danger Zone → Change visibility → Private.
(Netlify má repo připojené přes autorizovaný GitHub App/deploy key, po zprivátnění deploy funguje dál.)

## Sekce Realizace (03) — stále SKRYTÁ
Zůstává `hidden` do vlastního focení. Jmenný prostor `/realizace/` je pro ni rezervovaný — katalogové inspirace žijí pod `/galerie/`.

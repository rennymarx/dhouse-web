# dhouse.cz — Launch runbook (ostré spuštění)

Web běží jako staging na `https://papaya-genie-f481ff.netlify.app/` (v2 v rootu; verzování /1 /2
zrušeno 2026-07-04, staré cesty 301 na root). Doména `dhouse.cz` teď běží na **HubSpot CMS**.
Launch = nasazení produkčního buildu na Netlify + přepnutí DNS z HubSpotu.

## Architektura: DVĚ Netlify sites (doporučeno)

- **Staging site** = stávající `papaya-genie-f481ff` (publish `_deploy/site`, v2 v rootu). Po launchi ji zaheslujeme.
- **Production site** = NOVÁ site (publish `_deploy/prod`, doména `dhouse.cz`).

Proč dvě: Password protection / robots blok se v Netlify nastavuje **per-site**. Kdyby staging i produkce
byla jedna site, zaheslování stagingu by zamklo i produkci. Dvě sites = nezávislé.

## Co je připravené (hotovo)
- Produkční build: `_launch.ps1` → `_deploy/prod/` (root, BEZ noindex, prod robots/sitemap/`_redirects`/`_headers` vč. CSP).
- Meta Pixel `818976925290103` + HubSpot portal `2996399` v `js/main.js`, spouští se AŽ po souhlasu (HubSpotí vlastní banner v portálu vypnut).
- Detaily inspirací na `/galerie/<český-slug>/`; `_redirects` má 1:1 301 ze starých `/realizace/<de-slug>/` + catch-all.
- LocalBusiness + Article JSON-LD, sitemap.xml (45 URL), 404, apple-touch-icon, OG image.
- Bezpečnostní hlavičky (CSP, Permissions-Policy, nosniff, Referrer-Policy, frame-ancestors); HSTS připraven zakomentovaný.

## Sekvence v den spuštění (pořadí ZACHOVAT)

**1. Produkční build**
```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File _launch.ps1   # -> _deploy/prod
git add -f _deploy/prod ; git commit -m "Launch: produkcni build" ; git push
```

**2. Vytvořit PRODUCTION site na Netlify**
- Add new site → Import from Git → repo `rennymarx/dhouse-web`.
- **Publish directory = `_deploy/prod`**, build command prázdný.
- Deploy. Site dostane dočasnou adresu `nazev-xxxx.netlify.app`.

**3. Ověřit produkci na dočasné `*.netlify.app` adrese — JEŠTĚ PŘED DNS**
- Otevřít `https://<nova-site>.netlify.app/` — web se vykresluje, žádné rozbité cesty.
- Zdroj homepage **NEobsahuje** `noindex`; 404 stránka noindex ANO.
- `/robots.txt` = `Allow: /` + `Sitemap:`; `/sitemap.xml` = 200.
- Redirecty: `/hubfs/x` → 301 `/`; **`/realizace/harmonie-aus-natur-und-design/` → 301 `/galerie/harmonie-prirody-a-designu/`**; neexistující URL → 404.
- securityheaders.com na dočasnou adresu → Grade A.
- Cookie lišta + po „Přijmout vše" pixel (Meta Pixel Helper) i HubSpot.
- **Až tady je vše OK, pokračuj na DNS.** (Publish je hotový PŘED přepnutím DNS = žádné okno výpadku.)

**4. Custom doména na PRODUCTION site**
- Domain management → Add custom domain: `dhouse.cz` + `www.dhouse.cz`.
- Primary domain = **apex `dhouse.cz`** (sedí s canonical tagy); `www` → 301 na apex.

**5. DNS (dělá správce domény — přepnout z HubSpotu na Netlify)**
⚠️ **MĚNIT JEN WEBOVÉ ZÁZNAMY (A/CNAME).** Na doméně běží e-mailové schránky (mj. radek@dhouse.cz) —
**MX, SPF (TXT), DKIM a DMARC záznamy NECHAT NETKNUTÉ.**
Použij PŘESNÉ hodnoty z Netlify *Domain settings → DNS configuration*. Standardně:
- Apex `dhouse.cz`: **A** → `75.2.60.5` (ověř v UI)
- `www.dhouse.cz`: **CNAME** → `<nova-site>.netlify.app`
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

**9. Zaheslovat STAGING site** (nezávisle na produkci)
- Na staging site `papaya-genie-f481ff`: Site settings → Access & security → **Password protection** (Site protection).
  Tím po launchi neveřejní duplicitní kopie. (Meta noindex tam zůstává jako druhá pojistka.)

**10. Google Search Console** (jde i den po launchi)
- Radek založí GSC property `dhouse.cz` → `googleXXXX.html` do rootu (repo root + `_launch.ps1` znovu) → commit → ověřit → Submit sitemap.

**11. Uptime monitoring**
- Netlify notifikace, nebo UptimeRobot na `https://dhouse.cz` (5 min, alert na team@).

## Akce mimo kód (dashboardy — dělá Radek)
- **Netlify → (production site) Forms → Notifications:** e-mail poptávek na `team@rennymarx.com`. *(Jediný pre-launch krok blokující spuštění.)*
- **Netlify → Deploy notifications → přidat „GitHub commit status"** (na obou sites). Zjištěno 2026-07-04: Netlify teď deploy do GitHubu NEhlásí (statuses i check-runs prázdné), takže nejde tahat deploy permalink z GitHub API. Po zapnutí to půjde bez Netlify tokenu; u private repa přes fine-grained `GITHUB_TOKEN` (jen toto repo, read-only, Commit statuses + Checks).
- **Repo → Private** (viz níže) + **2FA** na Netlify i GitHub účtu.
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

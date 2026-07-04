# dhouse.cz — Launch runbook (ostré spuštění)

Web běží jako staging na `https://papaya-genie-f481ff.netlify.app/2/`. Doména `dhouse.cz`
teď běží na **HubSpot CMS**. Launch = přepnutí DNS z HubSpotu na Netlify + nasazení produkčního buildu.

## Co je připravené (hotovo, netřeba řešit při launchi)
- Produkční build: `_launch.ps1` → vytvoří `_deploy/prod/` (root, BEZ noindex, s prod robots/sitemap/redirects/headers vč. CSP).
- Meta Pixel `818976925290103` + HubSpot portal `2996399` — v `js/main.js`, spouští se AŽ po souhlasu v cookie liště (HubSpotí vlastní banner vypnut v portálu — jen jedna lišta).
- Detaily inspirací na `/galerie/<český-slug>/` (jmenný prostor `/realizace/` rezervován pro budoucí skutečné realizace klientek); `_redirects` má 1:1 přesměrování starých cest + catch-all.
- LocalBusiness JSON-LD na všech stránkách, Article na blogu, sitemap.xml (45 URL vč. blogu), 404.html, apple-touch-icon, OG image.
- Bezpečnostní hlavičky (CSP, Permissions-Policy, nosniff, Referrer-Policy, frame-ancestors) na stagingu i v produkčním buildu; HSTS připraven zakomentovaný.

## Sekvence v den spuštění

**1. Netlify — custom doména**
- Site settings → Domain management → Add custom domain: `dhouse.cz` (+ `www.dhouse.cz`).
- Netlify vystaví Let's Encrypt SSL (po správném DNS proběhne automaticky).

**2. DNS (dělá správce domény — přepnout z HubSpotu na Netlify)**
⚠️ **MĚNIT JEN WEBOVÉ ZÁZNAMY (A/CNAME).** Na doméně běží e-mailové schránky (mj. radek@dhouse.cz) —
**MX, SPF (TXT), DKIM a DMARC záznamy NECHAT NETKNUTÉ.** Po přepnutí ověřit poštu testem odeslání I příjmu.
Použij PŘESNÉ hodnoty, které Netlify ukáže v *Domain settings → DNS configuration*. Standardně:
- Apex `dhouse.cz`: **A** záznam → `75.2.60.5` (Netlify load balancer; ověř v UI)
- `www.dhouse.cz`: **CNAME** → `papaya-genie-f481ff.netlify.app`
- Odstranit staré HubSpot **A/CNAME** záznamy (a jen ty).
- TTL nízké (300 s), ať se přepnutí projeví rychle.

**3. TLS + kanonická doména**
- Po propsání DNS: v Netlify ověřit vydání certifikátu pro `dhouse.cz` + `www.dhouse.cz`.
- Zapnout **Force HTTPS**.
- Primary domain = **apex `dhouse.cz`** (sedí s canonical tagy v HTML); `www` → 301 na apex (Netlify dělá automaticky dle primary).

**4. Produkční build + publish**
```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File _launch.ps1   # vytvori _deploy/prod
git add -f _deploy/prod ; git commit -m "Launch: produkcni build" ; git push
```
- V Netlify: Build & deploy → Publish directory → přepnout z `_deploy/site` na **`_deploy/prod`** → Deploy.
- (`_deploy/prod` je v .gitignore kvůli velikosti — při launchi se přidá přes `git add -f`.)

**5. Ověření po nasazení**
- Všechny stránky 200: `/`, `/galerie`, `/galerie/<slug>/`, `/kvalita`, `/atelier`, `/kontakt`, `/blog`, právní stránky.
- `robots.txt` = `Allow: /` + `Sitemap:`; `sitemap.xml` = 200.
- Redirecty: `/hubfs/x` → 301 `/`; `/realizace/leona-fabiola/` → 301 `/galerie/leona-fabiola/`; neexistující URL → 404 stránka.
- Zdroj homepage NEobsahuje `noindex` (produkce), 404 noindex ANO.
- **Pošta:** poslat + přijmout testovací mail na radek@dhouse.cz (MX nedotčeny).
- Meta Pixel: rozšíření **Meta Pixel Helper** → po „Přijmout vše" hlásí pixel `818976925290103` + PageView.
- HubSpot: Reports → Analytics tools → přijdou návštěvy.
- Formulář: testovací poptávka → dorazí na `team@rennymarx.com`.
- OG náhled: `developers.facebook.com/tools/debug` → obrázek + titulek.
- Hlavičky: securityheaders.com na https://dhouse.cz → cíl A.

**6. HSTS (až po pár dnech stabilního https)**
- V `_deploy/prod/_headers` odkomentovat `Strict-Transport-Security: max-age=31536000` (bez `includeSubDomains`!
  `online.dhouse.cz` běží na Konverzky — includeSubDomains přidat až po ověření, že subdoména jede čistě https;
  `preload` až po týdnech klidu). Re-deploy.

**7. Google Search Console (nespěchá, jde i den po launchi)**
- Radek založí GSC property pro `dhouse.cz` → dostane ověřovací `googleXXXXXXXX.html`.
- Soubor do rootu webu (repo root + znovu `_launch.ps1`) → commit → ověřit v GSC → Submit sitemap `https://dhouse.cz/sitemap.xml`.

**8. Znovu zablokovat staging**
- Staging `papaya-genie-f481ff.netlify.app` má stále `noindex` v každé stránce — ponechat.
- Navíc: v Netlify pro staging site zapnout **Password protection** (nebo aspoň robots.txt `Disallow: /`),
  aby po launchi nevisela veřejná kopie webu (duplicitní obsah).

**9. Uptime monitoring**
- Zapnout Netlify deploy/uptime notifikace, nebo založit **UptimeRobot** monitor na `https://dhouse.cz` (5min interval, alert na team@).

## Akce mimo kód (dashboardy — dělá Radek)
- **Netlify → Forms → Notifications:** e-mail notifikace kontaktního formuláře na `team@rennymarx.com`. *(Jediný zbývající pre-launch krok v dashboardu.)*
- **2FA:** zapnout dvoufaktor na Netlify účtu i GitHub účtu (repo je public — chránit hlavně push přístup).
- **HubSpot ↔ Calendly / plné napojení formuláře na CRM** — později (Make scénář / nativní integrace).
- ~~Google Business Profil~~ — HOTOVO (přejmenován na „Atelier dhouse", web dhouse.cz; zbývá doplnit otevírací dobu).

## Sekce Realizace (03) — stále SKRYTÁ
Zůstává `hidden` do doby, než budou vlastní fotky realizací (rozhodnutí: počkat na focení).
Jmenný prostor `/realizace/` je pro ni rezervovaný — katalogové inspirace žijí pod `/galerie/`.

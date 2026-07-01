# dhouse.cz — Launch runbook (ostré spuštění)

Web běží jako staging na `https://papaya-genie-f481ff.netlify.app/2/`. Doména `dhouse.cz`
teď běží na **HubSpot CMS**. Launch = přepnutí DNS z HubSpotu na Netlify + nasazení produkčního buildu.

## Co je připravené (hotovo, netřeba řešit při launchi)
- Produkční build: `_launch.ps1` → vytvoří `_deploy/prod/` (root, BEZ noindex, s prod robots/sitemap/redirects/headers).
- Meta Pixel `818976925290103` + HubSpot portal `2996399` — v `js/main.js`, spouští se AŽ po souhlasu v cookie liště.
- LocalBusiness JSON-LD na všech stránkách, Article na blogu, sitemap.xml (43 URL), 404.html, `_redirects` (hubfs/hs-fs→/).
- OG image `assets/og-default.jpg` (1200×630), apple-touch-icon.

## Sekvence v den spuštění

**1. Netlify — custom doména**
- Site settings → Domain management → Add custom domain: `dhouse.cz` (+ `www.dhouse.cz`).
- Netlify vystaví Let's Encrypt SSL (po správném DNS proběhne automaticky).

**2. DNS (dělá správce domény — přepnout z HubSpotu na Netlify)**
Použij PŘESNÉ hodnoty, které Netlify ukáže v *Domain settings → DNS configuration*. Standardně:
- Apex `dhouse.cz`: **A** záznam → `75.2.60.5`  (Netlify load balancer; ověř v UI)
- `www.dhouse.cz`: **CNAME** → `papaya-genie-f481ff.netlify.app`
- (Odstranit staré HubSpot A/CNAME záznamy.)
- Alternativa (doporučeno Netlify): přepnout nameservery na Netlify DNS a nechat A/CNAME na nich.
- TTL nízké (300 s), ať se přepnutí projeví rychle.

**3. Produkční build + publish**
```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File _launch.ps1   # vytvori _deploy/prod
git add -f _deploy/prod ; git commit -m "Launch: produkcni build" ; git push
```
- V Netlify: Build & deploy → Publish directory → přepnout z `_deploy/site` na **`_deploy/prod`** → Deploy.
- (`_deploy/prod` je v .gitignore kvůli velikosti — při launchi se přidá přes `git add -f`.)

**4. Ověření po nasazení**
- Všechny stránky 200: `/`, `/galerie`, `/kvalita`, `/atelier`, `/kontakt`, `/impressum`, `/obchodni-podminky`, `/ochrana-osobnich-udaju`, `/realizace/<slug>/`.
- `dhouse.cz/robots.txt` = `Allow: /` + `Sitemap:`; `dhouse.cz/sitemap.xml` = 200.
- Redirect: `dhouse.cz/hubfs/cokoli` → 301 na `/`.
- 404: `dhouse.cz/neexistuje` → vlastní 404 stránka.
- Zdroj homepage NEobsahuje `noindex` (produkce), 404 noindex ANO.
- Meta Pixel: rozšíření **Meta Pixel Helper** → po kliknutí „Přijmout vše" hlásí pixel + PageView.
- HubSpot: v HubSpotu Reports → Analytics tools → Tracking, přijdou návštěvy.
- Formulář: odeslat testovací poptávku → přijde na `team@rennymarx.com` (viz „Radek dashboard" níže).
- OG náhled: sdílet URL na FB / debugger `developers.facebook.com/tools/debug` → obrázek + titulek.

**5. Google Search Console (nespěchá, jde i den po launchi)**
- Radek založí GSC property pro `dhouse.cz` → dostane ověřovací `googleXXXXXXXX.html`.
- Soubor hodit do rootu webu (repo root + znovu `_launch.ps1`) → commit → ověřit v GSC → Submit sitemap `https://dhouse.cz/sitemap.xml`.

**6. Znovu zablokovat staging**
- Staging `papaya-genie-f481ff.netlify.app` má stále `noindex` v každé stránce (duplicitní obsah) — ponechat.
- Volitelně: v Netlify pro staging site zapnout Password protection, nebo `robots.txt Disallow`.

## Akce mimo kód (dashboardy — dělá Radek)
- **Netlify → Forms → Notifications:** e-mail notifikace kontaktního formuláře na `team@rennymarx.com`.
- **HubSpot ↔ Calendly / plné napojení formuláře na CRM** — později (Make scénář / nativní integrace).
- **Google Business Profil** „Design House Infini" → přejmenovat na „atelier dhouse" + aktualizovat odkaz na web.

## Sekce Realizace (03) — stále SKRYTÁ
Zůstává `hidden` do doby, než budou vlastní fotky realizací. V produkčním buildu se nezobrazí.
(Fotky u recenzí na starém webu jsou screenshoty Google recenzí, ne čisté fotky kuchyní — viz komunikace.)

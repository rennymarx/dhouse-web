# Obsah k doplnění — dhouse.cz

Web je hotový a běží na skryté adrese, ale používá **zástupný obsah** (placeholdery).
Tento dokument je brief: co sehnat/vytvořit, kam to patří a v jakém formátu.

Cokoli z toho pošli (fotky, odkazy, texty) → zapojím to do webu a hned uvidíš výsledek.

> ⚠️ **Než web spustíme na `dhouse.cz`, musí být nahrazené hlavně:**
> reálné fotky kuchyní z atelieru, otevírací doba showroomu, finální texty kvality/SAKÜ.

---

## 1. Fotky 📸

Zatím používám **fotky ze SACHSENKÜCHEN press kitu** (jako výhradní zástupce máme licenci).
Ideál pro každou sekci:

| Kde na webu | Co | Doporučený rozměr | Formát |
|---|---|---|---|
| Hero homepage | široká fotka prémiové kuchyně, tlumené světlo, žádní lidé | min. **2400×1350**, na šířku | JPG (≤300 kB) |
| Galerie homepage (6 kuchyní) | čisté reference kuchyní | min. **1200×900**, 4:3 | JPG/WebP |
| Galerie stránka (15–30 kuchyní) | širší výběr modelů | min. **1200×900** | JPG/WebP |
| Kvalita (manufaktura) | záběry výroby — dřevo, fréza, ruce řemeslníka | min. 1600×1066 | JPG |
| Atelier | interiér showroomu v Praze 10 | min. **1600×1066** | JPG |
| OG image (sociální sítě) | reprezentační kuchyně | 1200×630 | JPG |

**Tipy:** Tlumený, teplý tón sedí k designu. Pošli klidně víc, vyberu nejlepší.
Velké soubory v pohodě — zmenším je pro web (kompresí na ≤300 kB každý).

---

## 2. Kontakt a fakturační údaje ☎️

Ověřit, že tyto údaje jsou aktuální:

- [ ] **Telefon** `+420 272 681 854`
- [ ] **E-mail** `marketing@rennymarx.com` (obecný kontakt)
- [ ] **E-mail** `team@rennymarx.com` (poptávky)
- [ ] **Adresa** `Nám. Svatopluka Čecha 1350/5, 101 00 Praha 10 – Vršovice`
- [ ] **IČO / DIČ** `02462273 / CZ02462273`
- [ ] **Otevírací doba atelieru** (chybí — doplnit!)

---

## 3. Texty 📝

Některé sekce mají vlastní texty, jiné jen rámcové. Co rád dostanu od tebe:

- [ ] **„O nás"** — 2–3 věty, co dhouse atelier dělá a v čem je výjimečný
- [ ] **Sekce „Kvalita"** — vlastní popis řemesla / manufaktury, nebo OK použít přeložené texty ze SAKÜ?
- [ ] **Sekce „Atelier"** — co návštěvníka v showroomu čeká, jak probíhá schůzka
- [ ] **Recenze (6 ks)** — přenesl jsem ze současného webu. Aktualizovat / přidat nové?

---

## 4. Modely v galerii 🍳

Galerii jsem postavil s placeholdery na modely:
LARA, LANA, LEONA, FABIOLA, ADINA, EDDA, FIORA, STANA, PATRIZIA, SHILA, ALINA, RAJA, SAMARA, LISA, DONNA, LETIZIA, TESSA, RONDA, RITA, SELMA, FABIA, KARA

- [ ] Pro každý model: 1 fotka, krátký popis (materiál, dvířka, styl)
- [ ] Filtr v galerii: vybrat které modely zobrazit jako defaultní

---

## 5. Loga partnerů 🏷️

Pro sekci „Komponenty" potřebuju **SVG nebo PNG s průhledným pozadím**:

- [ ] **SACHSENKÜCHEN** logo
- [ ] **AKP** logo (pracovní desky)
- [ ] **TEKA** logo
- [ ] **Küppersbusch** logo

---

## 6. Blog — první články od Roberta 🤖

Robert tvoří týdně. Před prvním ostrým článkem ujasnit:

- [ ] **Tone of voice** — formální / přátelský / odborný?
- [ ] **Témata na rozjezd** — 5 prvních článků (návrhy: „Jak vybrat dvířka kuchyně", „Materiály pracovních desek", „Co je Faceline koncept", „Manufaktura vs. sériová výroba", „Spotřebiče TEKA vs. Küppersbusch")
- [ ] **Autor v podpisu** — „Robert (dhouse)" nebo jiný název?

---

## 7. Sociální sítě 🔗

Footer odkazuje na (přenesl jsem ze současného webu — ověřit):

- [ ] **Facebook** facebook.com/dhousecz
- [ ] **Instagram** instagram.com/sachsenkuechencz
- [ ] **YouTube** youtube.com/@SachsenKuchenCeskoSlovensko
- [ ] **X / Twitter** x.com/SachsenKuchenCZ — ponechat? rušit?

---

## 8. Před spuštěním na dhouse.cz ⚙️

Když budou všechny věci výše dořešené:

- [ ] Odstranit `<meta name="robots" content="noindex, nofollow">` ze všech `.html`
- [ ] V `robots.txt` přepnout `Disallow: /` → `Allow: /`
- [ ] Na Netlify přidat doménu `dhouse.cz`
- [ ] U registrátora (Forpsi?) nastavit DNS na Netlify
- [ ] Po DNS propagaci ověřit HTTPS a OG na opengraph.xyz
- [ ] **Současný web na dhouse.cz mezitím nemažeme** — ten běží paralelně až do překlopení DNS

---

## Jak mi obsah předat

Cokoli z výše uvedeného — **fotky, texty, loga** — pošli a já to zapojím do webu.
Po každé změně pushnu na GitHub a na skryté adrese hned uvidíš výsledek.

# CLAUDE.md

Pokyny pro práci Claude Code na tomto repozitáři.

## O projektu

`dhouse-web` je **statický web** pro atelier dhouse / Renny Marx.

- Čisté HTML / CSS / JS, žádný build systém (není `package.json`).
- Stránky jsou jednotlivé `.html` soubory v kořeni (`index.html`, `galerie.html`, `kontakt.html`, …).
- Styly v `css/`, skripty v `js/`, obrázky a média v `assets/` a `galerie/`.
- Deploy přes **Netlify** (`netlify.toml`, `_redirects`).

## Workflow: ukládání práce (commit + push)

Tento repozitář se používá střídavě z **desktop aplikace** (lokální soubory) i z **webu / prohlížeče** (cloud). Předávání práce mezi oběma prostředími probíhá **výhradně přes GitHub**.

**Proto: po dokončení hotové a funkční práce vždy udělej `git commit` a `git push`** na aktuální pracovní branch. Bez pushnutí se změny nedostanou do druhého prostředí.

Zásady:

- Commituj a pushuj **jen práci v rozumném, funkčním stavu** — ne rozpracované nebo rozbité mezistavy.
- Piš **jasné, popisné commit message** (co a proč se změnilo).
- Pushuj na **aktuální pracovní branch**, nikdy přímo na hlavní/výchozí branch bez vyžádání.
- Než začneš pracovat, ideálně nejdřív `git pull`, ať máš nejnovější stav.

## Konvence

- Web i obsah jsou v **češtině** — komunikuj a piš texty česky.
- Zachovávej styl a strukturu okolního kódu (odsazení, pojmenování, konvence dané stránky).

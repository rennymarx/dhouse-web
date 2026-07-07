# Produkcni build pro OSTRE spusteni na dhouse.cz (root, BEZ noindex).
# Pouziti: powershell -NoProfile -ExecutionPolicy Bypass -File _launch.ps1
# Vystup:  _deploy\prod\  = kompletni web v rootu (cesty /...), pripraveny k publikaci.
# Netlify: pri launchi prepnout publish directory na  _deploy/prod  (dela Radek).
# ROZDIL proti _deploy.ps1 (staging): root (zadne /N/), STRIPuje noindex, prod robots+sitemap+redirects+headers.
$ErrorActionPreference = 'Stop'
$src = $PSScriptRoot
$prod = Join-Path $src '_deploy\prod'
if (Test-Path $prod) { Remove-Item -Recurse -Force $prod }
New-Item -ItemType Directory -Force $prod | Out-Null

$utf8 = New-Object System.Text.UTF8Encoding $false
$items = @('index.html','galerie.html','kvalita.html','atelier.html','kontakt.html',
           'dekujeme.html','impressum.html','obchodni-podminky.html','ochrana-osobnich-udaju.html',
           '404.html','sitemap.xml','css','js','blog','assets','galerie')
foreach ($i in $items) {
    $p = Join-Path $src $i
    if (Test-Path $p) { Copy-Item $p -Destination $prod -Recurse }
}

# --- STRIP noindex + staging komentar ze vsech HTML (cesty zustavaji /... = root) ---
$noindex = '<meta name="robots" content="noindex, nofollow" />'
$stagingComment = '<!-- STAGING: skrytá verze do spuštění na dhouse.cz — tento řádek při ostrém spuštění ODSTRANIT -->'
$stripped = 0
foreach ($f in (Get-ChildItem $prod -Recurse -Include *.html)) {
    $t = [IO.File]::ReadAllText($f.FullName)
    $had = $t.Contains($noindex)
    $t = $t.Replace($noindex + "`r`n", '').Replace($noindex + "`n", '').Replace($noindex, '')
    $t = $t.Replace($stagingComment + "`r`n", '').Replace($stagingComment + "`n", '').Replace($stagingComment, '')
    [IO.File]::WriteAllText($f.FullName, $t, $utf8)
    if ($had) { $stripped++ }
}

# --- 404 stranka NECHAT noindex (chybova stranka se nema indexovat) ---
$p404 = Join-Path $prod '404.html'
if (Test-Path $p404) {
    $t = [IO.File]::ReadAllText($p404)
    if ($t -notmatch 'name="robots"') {
        $t = $t.Replace('<title>', '<meta name="robots" content="noindex" />' + "`r`n<title>")
        [IO.File]::WriteAllText($p404, $t, $utf8)
    }
}

# --- prod robots.txt: Allow + Sitemap ---
$robots = "User-agent: *`r`nAllow: /`r`n`r`nSitemap: https://www.dhouse.cz/sitemap.xml`r`n"
[IO.File]::WriteAllText((Join-Path $prod 'robots.txt'), $robots, $utf8)

# --- _redirects: jediny zdroj pravdy je repo root (_redirects) ---
Copy-Item (Join-Path $src '_redirects') -Destination $prod -Force

# --- _headers (bezpecnostni hlavicky; CSP viz komentar v _deploy.ps1) ---
$csp = "default-src 'self'; script-src 'self' 'unsafe-inline' https://connect.facebook.net https://js.hs-scripts.com https://js.hs-analytics.net https://js.hs-banner.com https://js.hsadspixel.net https://js.hscollectedforms.net https://js.usemessages.com https://js.hsforms.net https://www.google.com https://www.gstatic.com https://www.recaptcha.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://*.hsforms.com; font-src https://fonts.gstatic.com; img-src 'self' data: https://www.facebook.com https://track.hubspot.com https://forms.hubspot.com https://forms.hscollectedforms.net https://*.hsforms.com https://*.hubspot.com; connect-src 'self' https://www.facebook.com https://connect.facebook.net https://track.hubspot.com https://forms.hscollectedforms.net https://forms.hubspot.com https://api.hubspot.com https://api.hubapi.com https://*.hsforms.com https://api.hsforms.com; frame-src https://mapy.com https://*.mapy.com https://*.hsforms.com https://www.google.com https://www.recaptcha.net; frame-ancestors 'self'; base-uri 'self'; form-action 'self' https://*.hsforms.com https://forms.hubspot.com; object-src 'none'"
$headers = "/*`r`n" +
  "  Content-Security-Policy: $csp`r`n" +
  "  X-Frame-Options: SAMEORIGIN`r`n" +
  "  X-Content-Type-Options: nosniff`r`n" +
  "  Referrer-Policy: strict-origin-when-cross-origin`r`n" +
  "  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()`r`n" +
  "# HSTS zapnout az po overeni stabilniho https na dhouse.cz (viz LAUNCH.md, krok E3):`r`n" +
  "# odkomentovat nasledujici radek (presunout pod /* a odsadit 2 mezerami):`r`n" +
  "#  Strict-Transport-Security: max-age=31536000`r`n"
[IO.File]::WriteAllText((Join-Path $prod '_headers'), $headers, $utf8)

"HOTOVO - produkcni build"
"Slozka:        $prod"
"noindex stripnuto z: $stripped stranek (404 zustava noindex)"
"robots.txt:    Allow + Sitemap"
"_redirects:    /hubfs/* /hs-fs/* -> /"
"_headers:      security headers"
"NEXT (Radek): v Netlify prepnout publish directory na _deploy/prod, pak deploy."

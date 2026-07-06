# Staging deploy pro Netlify (site papaya-genie-f481ff) - v2 je HLAVNI STRANKA v ROOTU.
# Verze /1/ /2/ + rozcestnik ZRUSENY (2026-07-04, Markovo zadani). Jedna verze, v rootu.
# Pouziti: powershell -NoProfile -ExecutionPolicy Bypass -File _deploy.ps1
# Vystup:  _deploy\site\  = web v rootu (publish/base dir na Netlify staging).
# noindex ZUSTAVA (je to netlify.app staging, ne dhouse.cz). Pro OSTROU domenu dhouse.cz
# pouzij _launch.ps1 -> _deploy\prod (ten noindex strippuje). Viz LAUNCH.md.
$ErrorActionPreference = 'Stop'
$src = $PSScriptRoot
$deployRoot = Join-Path $src '_deploy'
$out = Join-Path $deployRoot 'site'
$utf8 = New-Object System.Text.UTF8Encoding $false

# cisty vystup (smaze i stare /1 /2 a rozcestnik)
if (Test-Path $out) { Remove-Item -Recurse -Force $out }
New-Item -ItemType Directory -Force $out | Out-Null

# kopie webu do rootu (cesty jsou uz root-relativni, zadny prepis netreba)
$items = @('index.html','galerie.html','kvalita.html','atelier.html','kontakt.html',
           'dekujeme.html','impressum.html','obchodni-podminky.html','ochrana-osobnich-udaju.html',
           '404.html','sitemap.xml','css','js','blog','assets','galerie')
foreach ($i in $items) {
    $p = Join-Path $src $i
    if (Test-Path $p) { Copy-Item $p -Destination $out -Recurse }
}

# robots.txt: Allow (prochazitelne); Google drzi venku <meta noindex> v kazde strance
[IO.File]::WriteAllText((Join-Path $out 'robots.txt'), "User-agent: *`r`nAllow: /`r`n", $utf8)

# _redirects (hubfs, stare /1 /2 -> root, realizace->galerie 1:1, catch-all 404)
Copy-Item (Join-Path $src '_redirects') -Destination $out -Force

# netlify.toml: bezpecnostni hlavicky (CSP self + FB pixel + HubSpot + Google Fonts/Maps)
$csp = "default-src 'self'; script-src 'self' 'unsafe-inline' https://connect.facebook.net https://js.hs-scripts.com https://js.hs-analytics.net https://js.hs-banner.com https://js.hsadspixel.net https://js.hscollectedforms.net https://js.usemessages.com https://js.hsforms.net https://www.google.com https://www.gstatic.com https://www.recaptcha.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://*.hsforms.com; font-src https://fonts.gstatic.com; img-src 'self' data: https://www.facebook.com https://track.hubspot.com https://forms.hubspot.com https://forms.hscollectedforms.net https://*.hsforms.com https://*.hubspot.com; connect-src 'self' https://www.facebook.com https://connect.facebook.net https://track.hubspot.com https://forms.hscollectedforms.net https://forms.hubspot.com https://api.hubspot.com https://api.hubapi.com https://*.hsforms.com https://api.hsforms.com; frame-src https://mapy.com https://*.mapy.com https://*.hsforms.com https://www.google.com https://www.recaptcha.net; frame-ancestors 'self'; base-uri 'self'; form-action 'self' https://*.hsforms.com https://forms.hubspot.com; object-src 'none'"
$toml = @"
[build]
  publish = "."
  command = ""

[[headers]]
  for = "/*"
  [headers.values]
    Content-Security-Policy = "$csp"
    X-Frame-Options = "SAMEORIGIN"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Permissions-Policy = "camera=(), microphone=(), geolocation=(), payment=(), usb=()"
"@
[IO.File]::WriteAllText((Join-Path $out 'netlify.toml'), $toml, $utf8)

$pages = (Get-ChildItem $out -Recurse -Filter *.html | Measure-Object).Count
"HOTOVO - staging v2 v ROOTU (bez verzi, bez rozcestniku)"
"Slozka:  $out"
"HTML stranek: $pages"
"noindex: ZUSTAVA (netlify.app staging). Ostra domena dhouse.cz = _launch.ps1."

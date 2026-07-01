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
           '404.html','sitemap.xml','css','js','blog','assets','realizace')
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
$robots = "User-agent: *`r`nAllow: /`r`n`r`nSitemap: https://dhouse.cz/sitemap.xml`r`n"
[IO.File]::WriteAllText((Join-Path $prod 'robots.txt'), $robots, $utf8)

# --- _redirects (stare HubSpot asset URL -> homepage) ---
$redir = "# Netlify redirects - produkce dhouse.cz`r`n/hubfs/*    /    301`r`n/hs-fs/*    /    301`r`n"
[IO.File]::WriteAllText((Join-Path $prod '_redirects'), $redir, $utf8)

# --- _headers (bezpecnostni hlavicky) ---
$headers = "/*`r`n  X-Frame-Options: SAMEORIGIN`r`n  X-Content-Type-Options: nosniff`r`n  Referrer-Policy: strict-origin-when-cross-origin`r`n"
[IO.File]::WriteAllText((Join-Path $prod '_headers'), $headers, $utf8)

"HOTOVO - produkcni build"
"Slozka:        $prod"
"noindex stripnuto z: $stripped stranek (404 zustava noindex)"
"robots.txt:    Allow + Sitemap"
"_redirects:    /hubfs/* /hs-fs/* -> /"
"_headers:      security headers"
"NEXT (Radek): v Netlify prepnout publish directory na _deploy/prod, pak deploy."

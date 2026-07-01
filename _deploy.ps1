# Build verzovaneho deploye pro Netlify - dhouse.cz
# Pouziti: powershell -NoProfile -ExecutionPolicy Bypass -File _deploy.ps1 -Version 1
# Vystup:  _deploy\site\        (slozka pro upload - obsahuje /<N>/ + root rozcestnik)
#          _deploy\dhouse-vN.zip (zip pro Netlify Drop / API)
param([int]$Version = 1)

$ErrorActionPreference = 'Stop'
$src = $PSScriptRoot
$deployRoot = Join-Path $src '_deploy'
$out = Join-Path $deployRoot 'site'
$verDir = Join-Path $out "$Version"

# --- cisty vystup (zachovej pripadne starsi verze /1 /2 ... v site\) ---
if (-not (Test-Path $out)) { New-Item -ItemType Directory -Force $out | Out-Null }
if (Test-Path $verDir) { Remove-Item -Recurse -Force $verDir }
New-Item -ItemType Directory -Force $verDir | Out-Null

# --- kopie webu do /<N>/ (jen produkce, zadne dev soubory) ---
$items = @('index.html','galerie.html','kvalita.html','atelier.html','kontakt.html',
           'dekujeme.html','impressum.html','obchodni-podminky.html','ochrana-osobnich-udaju.html',
           '404.html','robots.txt','sitemap.xml','css','js','blog','assets','realizace')
foreach ($i in $items) {
    $p = Join-Path $src $i
    if (Test-Path $p) { Copy-Item $p -Destination $verDir -Recurse }
}

# --- prepis absolutnich cest na /<N>/... ---
$V = "$Version"
$htmlFiles = Get-ChildItem $verDir -Recurse -Include *.html
foreach ($f in $htmlFiles) {
    $t = [IO.File]::ReadAllText($f.FullName)
    $t = $t.Replace('href="/',   "href=`"/$V/")
    $t = $t.Replace('src="/',    "src=`"/$V/")
    $t = $t.Replace('action="/', "action=`"/$V/")
    $t = $t.Replace("url('/",    "url('/$V/")
    $t = $t.Replace("url(/",     "url(/$V/")
    $t = $t.Replace('data-lb="/', "data-lb=`"/$V/")
    $t = $t.Replace("'/blog/",   "'/$V/blog/")
    # OG/Twitter meta s relativni cestou (sablona blogu)
    $t = $t.Replace('content="/', "content=`"/$V/")
    [IO.File]::WriteAllText($f.FullName, $t, (New-Object System.Text.UTF8Encoding $false))
}
$postsJs = Join-Path $verDir 'blog\posts.js'
if (Test-Path $postsJs) {
    $t = [IO.File]::ReadAllText($postsJs)
    $t = $t.Replace('"/blog/', "`"/$V/blog/")
    [IO.File]::WriteAllText($postsJs, $t, (New-Object System.Text.UTF8Encoding $false))
}

# --- root soubory: rozcestnik verzi + robots + netlify.toml ---
# Staging deindex: NEpouzivame robots.txt Disallow (blokoval by i legitimni
# nastroje, napr. designeruv web_fetch, a indexaci stejne nezabrani). Google
# drzime venku pres <meta name=robots noindex> v kazde strance. robots.txt
# proto Allow, X-Robots-Tag header pryc -> web je prochazitelny, ale nezaindexuje se.
$versions = Get-ChildItem $out -Directory | Where-Object { $_.Name -match '^\d+$' } | Sort-Object { [int]$_.Name }
$links = ($versions | ForEach-Object { "      <li><a href=`"/$($_.Name)/`">Verze $($_.Name)</a></li>" }) -join "`n"
$rootIndex = @"
<!doctype html>
<html lang="cs">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex, nofollow" />
<title>dhouse — staging verze</title>
<style>
  body { font: 16px/1.6 ui-monospace, Consolas, monospace; background: #f5f3ee; color: #161512;
         display: grid; place-items: center; min-height: 100vh; margin: 0; }
  .box { text-align: center; }
  h1 { font: 500 2rem/1.1 Georgia, serif; margin: 0 0 8px; }
  h1 span { color: #006938; }
  p { color: rgba(22,21,18,.55); font-size: 13px; letter-spacing: .1em; text-transform: uppercase; }
  ul { list-style: none; padding: 0; margin: 32px 0 0; display: grid; gap: 12px; }
  a { display: block; padding: 16px 48px; background: #006938; color: #f5f3ee; text-decoration: none;
      font-size: 13px; letter-spacing: .18em; text-transform: uppercase; }
  a:hover { background: #0a7f46; }
</style>
</head>
<body>
  <div class="box">
    <h1>dhouse<span>.</span> staging</h1>
    <p>porovnani verzi — interni</p>
    <ul>
$links
    </ul>
  </div>
</body>
</html>
"@
[IO.File]::WriteAllText((Join-Path $out 'index.html'), $rootIndex, (New-Object System.Text.UTF8Encoding $false))

$robots = "User-agent: *`nAllow: /`n"
[IO.File]::WriteAllText((Join-Path $out 'robots.txt'), $robots, (New-Object System.Text.UTF8Encoding $false))

$toml = @"
[build]
  publish = "."
  command = ""

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "SAMEORIGIN"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
"@
[IO.File]::WriteAllText((Join-Path $out 'netlify.toml'), $toml, (New-Object System.Text.UTF8Encoding $false))

# --- zip s lomitky (kompatibilni s Netlify) ---
$zipPath = Join-Path $deployRoot "dhouse-v$Version.zip"
if (Test-Path $zipPath) { Remove-Item -Force $zipPath }
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::Open($zipPath, [System.IO.Compression.ZipArchiveMode]::Create)
try {
    $files = Get-ChildItem $out -Recurse -File
    foreach ($f in $files) {
        $rel = $f.FullName.Substring($out.Length + 1).Replace('\', '/')
        [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $f.FullName, $rel) | Out-Null
    }
} finally {
    $zip.Dispose()
}

"HOTOVO"
"Slozka:  $out"
"Zip:     $zipPath ($([math]::Round((Get-Item $zipPath).Length / 1KB)) kB)"
"Verze v balicku: $(($versions | ForEach-Object { $_.Name }) -join ', ')"

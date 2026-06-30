# Generator detailnich stranek realizaci + galerie mrizky pro dhouse.
# ASCII-only (PS 5.1 + diakritika v .ps1 = parser error). Cesky obsah jde z dat/sablon (UTF-8).
# Pouziti: powershell -NoProfile -ExecutionPolicy Bypass -File _tools\build-realizace.ps1
# Volitelne: -Only <slug> vygeneruje jen jednu detailni stranku (nahled), galerii preskoci.
param([string]$Only = '')
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$dataDir = Join-Path $root 'realizace\_data'
$tplR = [IO.File]::ReadAllText((Join-Path $PSScriptRoot '_tpl-realizace.html'))
$tplG = [IO.File]::ReadAllText((Join-Path $PSScriptRoot '_tpl-galerie.html'))
$utf8 = New-Object System.Text.UTF8Encoding $false
$ARR = [char]0x2192   # sipka

function Esc($s) {
  if ($null -eq $s) { return '' }
  return ([string]$s).Replace('&', '&amp;').Replace('<', '&lt;').Replace('>', '&gt;')
}
function FixPath($p) {
  return '/' + (([string]$p) -replace 'assets/img/realizace/', 'assets/realizace/')
}

# nacti vsechna data
$all = @{}
$order = @()
Get-ChildItem $dataDir -Filter *.json | Sort-Object Name | ForEach-Object {
  $d = Get-Content $_.FullName -Raw -Encoding UTF8 | ConvertFrom-Json
  $all[$d.slug] = $d
  $order += $d.slug
}
"Nacteno realizaci: $($order.Count)"

# detailni stranky
foreach ($slug in $order) {
  if ($Only -and $slug -ne $Only) { continue }
  $d = $all[$slug]
  $titleEsc = Esc $d.title
  $metaEsc = Esc $d.meta
  $hero = FixPath $d.hero
  $intro = [string]$d.intro

  # galerie "Podivejte se zblizka" = hlavni + detailni zabery (jen gallery), REALNE <img>
  $gal = ''
  foreach ($g in $d.gallery) {
    $gp = FixPath $g
    $gal += '<a class="gphoto" data-lb="' + $gp + '" data-lb-group="galerie" data-lb-caption="' + $titleEsc + '"><img src="' + $gp + '" alt="' + $titleEsc + '" loading="lazy" /></a>' + "`n"
  }

  # pouzite dekory = samostatna sekce: fotka dekoru + nazev (jako sachsenkuechen.cz)
  $mat = ''
  foreach ($m in $d.materials) {
    $mp = FixPath $m.img
    $mn = Esc $m.name
    $mat += '<a class="matcard" data-lb="' + $mp + '" data-lb-group="dekory" data-lb-caption="' + $mn + '"><span class="matcard__media"><img src="' + $mp + '" alt="' + $mn + '" loading="lazy" /></span><span class="matcard__name">' + $mn + '</span></a>' + "`n"
  }

  $rel = ''
  $idx = $order.IndexOf($slug)
  $cnt = 0; $i = 1
  while ($cnt -lt 3 -and $i -le $order.Count) {
    $rslug = $order[($idx + $i) % $order.Count]
    if ($rslug -ne $slug) {
      $rd = $all[$rslug]; $rh = FixPath $rd.hero; $rt = Esc $rd.title
      $rel += '<a class="kcard" href="/realizace/' + $rslug + '/"><span class="kcard__media" style="background-image:url(' + $rh + ')"></span><span class="kcard__body"><span class="kcard__title">' + $rt + '</span><span class="kcard__link">Zobrazit realizaci <span class="arrow">' + $ARR + '</span></span></span></a>' + "`n"
      $cnt++
    }
    $i++
  }

  $html = $tplR
  $html = $html.Replace('{{TITLE}}', $titleEsc).Replace('{{META}}', $metaEsc).Replace('{{SLUG}}', $slug).Replace('{{HERO}}', $hero).Replace('{{INTRO}}', $intro).Replace('{{GALLERY}}', $gal).Replace('{{MATERIALS}}', $mat).Replace('{{RELATED}}', $rel)
  $outDir = Join-Path $root ('realizace\' + $slug)
  New-Item -ItemType Directory -Force $outDir | Out-Null
  [IO.File]::WriteAllText((Join-Path $outDir 'index.html'), $html, $utf8)
}
if ($Only) { "Detailni stranka zapsana: $Only" } else { "Detailnich stranek zapsano: $($order.Count)" }

# galerie mrizka (bez filtru) - pri -Only preskoc (generujeme jen nahled jedne stranky)
if (-not $Only) {
  $grid = ''
  foreach ($slug in $order) {
    $d = $all[$slug]; $h = FixPath $d.hero; $t = Esc $d.title
    $grid += '<a class="kcard" href="/realizace/' + $slug + '/"><span class="kcard__media" style="background-image:url(' + $h + ')"></span><span class="kcard__body"><span class="kcard__title">' + $t + '</span><span class="kcard__link">Zobrazit realizaci <span class="arrow">' + $ARR + '</span></span></span></a>' + "`n"
  }
  $g = $tplG.Replace('{{GRID}}', $grid)
  [IO.File]::WriteAllText((Join-Path $root 'galerie.html'), $g, $utf8)
  "Galerie.html prepsana ($($order.Count) karet, bez filtru)."
} else {
  "Galerie.html preskocena (-Only $Only)."
}
"HOTOVO."

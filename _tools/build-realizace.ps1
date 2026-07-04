# Generator detailnich stranek inspiraci (/galerie/<cz-slug>/) + galerie mrizky pro dhouse.
# ASCII-only (PS 5.1 + diakritika v .ps1 = parser error). Cesky obsah jde z dat/sablon (UTF-8).
# Pouziti: powershell -NoProfile -ExecutionPolicy Bypass -File _tools\build-realizace.ps1
# Volitelne: -Only <de-slug> vygeneruje jen jednu detailni stranku (nahled), galerii preskoci.
# POZN: jmenny prostor /realizace/ je rezervovan pro budouci skutecne realizace klientek;
#       katalogove inspirace vyrobce ziji pod /galerie/<cz-slug>/ (ceske slugy = SEO).
param([string]$Only = '')
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$dataDir = Join-Path $root 'galerie\_data'
$tplR = [IO.File]::ReadAllText((Join-Path $PSScriptRoot '_tpl-realizace.html'))
$tplG = [IO.File]::ReadAllText((Join-Path $PSScriptRoot '_tpl-galerie.html'))
$utf8 = New-Object System.Text.UTF8Encoding $false
$ARR = [char]0x2192   # sipka

# Mapa: nemecky slug (z dat/assets) -> cesky slug (verejna URL /galerie/<cz>/).
# Anglicke a modelove nazvy zustavaji (nejsou nemecke).
$CZMAP = @{
  'black-is-beautiful'                              = 'black-is-beautiful'
  'da-ist-alles-drin'                               = 'vsechno-co-potrebujete'
  'die-coole'                                       = 'ta-cool'
  'die-insel-kueche'                                = 'ostrovni-kuchyne'
  'die-kunst-des-wohnens'                           = 'umeni-bydlet'
  'dunkel-verlockend-natuerlich'                    = 'temna-svudna-prirodni'
  'ein-platz-zum-verweilen'                         = 'misto-kde-se-radi-zdrzite'
  'ein-raum-voller-energie-design-und-stil'         = 'prostor-plny-energie-a-stylu'
  'einzigartig-aufregend'                           = 'jedinecna-a-vzrusujici'
  'ergonomisch-schoen'                              = 'ergonomicky-krasna'
  'fugenspiel'                                      = 'hra-spar'
  'fun-follows-function'                            = 'fun-follows-function'
  'hochkultur-des-wohlfuehlens'                     = 'vysoka-kultura-pohody'
  'charakterkueche'                                 = 'kuchyne-s-charakterem'
  'im-schwebezustand'                               = 've-stavu-beztize'
  'keine-kompromisse-2025'                          = 'bez-kompromisu'
  'klare-linien-moderne-sprache-viel-komfort'       = 'ciste-linie-a-komfort'
  'kueche-und-wohnen-mit-wohlfuehlcharakter'        = 'kuchyne-a-bydleni-v-pohode'
  'landpartie'                                      = 'vylet-na-venkov'
  'leona-fabiola'                                   = 'leona-fabiola'
  'linoleum-genussvoll-klug'                        = 'linoleum-chytre-s-pozitkem'
  'marmor-2025'                                     = 'mramor-v-hlavni-roli'
  'mehr-als-nur-kueche'                             = 'vic-nez-jen-kuchyne'
  'modern-und-stilsicher'                           = 'moderni-a-sebejista'
  'mut-zur-farbe'                                   = 'odvaha-k-barve'
  'natuerliche-farbtherapie'                        = 'prirodni-barevna-terapie'
  'natuerlich-modern-zeitlos'                       = 'prirodne-moderne-nadcasove'
  'raffinierte-eleganz'                             = 'rafinovana-elegance'
  'raus-aufs-land'                                  = 'ven-na-venkov'
  'reduktion-in-vollendung'                         = 'redukce-k-dokonalosti'
  'schlichte-eleganz-designkueche-mit-leichtigkeit' = 'elegantni-lehkost-designu'
  'traum-raum'                                      = 'vysneny-prostor'
  'versorgungszentrum-der-extraklasse'              = 'zasobovaci-centrum-extra-tridy'
  'vielfalt-und-natuerliche-eleganz'                = 'rozmanitost-a-elegance'
  'harmonie-aus-natur-und-design'                   = 'harmonie-prirody-a-designu'
}

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
  if (-not $CZMAP.ContainsKey($d.slug)) { throw "Chybi cesky slug pro '$($d.slug)' - dopln do mapy CZ v build-realizace.ps1" }
  $all[$d.slug] = $d
  $order += $d.slug
}
"Nacteno inspiraci: $($order.Count)"

# detailni stranky -> galerie/<cz-slug>/index.html
foreach ($slug in $order) {
  if ($Only -and $slug -ne $Only) { continue }
  $d = $all[$slug]
  $cz = $CZMAP[$slug]
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
      $rd = $all[$rslug]; $rh = FixPath $rd.hero; $rt = Esc $rd.title; $rcz = $CZMAP[$rslug]
      $rel += '<a class="kcard" href="/galerie/' + $rcz + '/"><span class="kcard__media" style="background-image:url(' + $rh + ')"></span><span class="kcard__body"><span class="kcard__title">' + $rt + '</span><span class="kcard__link">Zobrazit kuchyni <span class="arrow">' + $ARR + '</span></span></span></a>' + "`n"
      $cnt++
    }
    $i++
  }

  $html = $tplR
  $html = $html.Replace('{{TITLE}}', $titleEsc).Replace('{{META}}', $metaEsc).Replace('{{SLUG}}', $cz).Replace('{{HERO}}', $hero).Replace('{{INTRO}}', $intro).Replace('{{GALLERY}}', $gal).Replace('{{MATERIALS}}', $mat).Replace('{{RELATED}}', $rel)
  $outDir = Join-Path $root ('galerie\' + $cz)
  New-Item -ItemType Directory -Force $outDir | Out-Null
  [IO.File]::WriteAllText((Join-Path $outDir 'index.html'), $html, $utf8)
}
if ($Only) { "Detailni stranka zapsana: $Only -> galerie/$($CZMAP[$Only])/" } else { "Detailnich stranek zapsano: $($order.Count) do galerie/<cz-slug>/" }

# galerie mrizka (bez filtru) - pri -Only preskoc (generujeme jen nahled jedne stranky)
if (-not $Only) {
  $grid = ''
  foreach ($slug in $order) {
    $d = $all[$slug]; $h = FixPath $d.hero; $t = Esc $d.title; $cz = $CZMAP[$slug]
    $grid += '<a class="kcard" href="/galerie/' + $cz + '/"><span class="kcard__media" style="background-image:url(' + $h + ')"></span><span class="kcard__body"><span class="kcard__title">' + $t + '</span><span class="kcard__link">Zobrazit kuchyni <span class="arrow">' + $ARR + '</span></span></span></a>' + "`n"
  }
  $g = $tplG.Replace('{{GRID}}', $grid)
  [IO.File]::WriteAllText((Join-Path $root 'galerie.html'), $g, $utf8)
  "Galerie.html prepsana ($($order.Count) karet, bez filtru)."
} else {
  "Galerie.html preskocena (-Only $Only)."
}

# _redirects fragment: 1:1 presmerovani starych /realizace/<de>/ na /galerie/<cz>/
if (-not $Only) {
  $rl = New-Object System.Text.StringBuilder
  foreach ($slug in $order) {
    [void]$rl.AppendLine(('/realizace/' + $slug + '/*  /galerie/' + $CZMAP[$slug] + '/  301'))
  }
  [IO.File]::WriteAllText((Join-Path $PSScriptRoot '_redirects-realizace.txt'), $rl.ToString(), $utf8)
  "_tools/_redirects-realizace.txt vygenerovan (vlozit do _redirects)."
}
"HOTOVO."

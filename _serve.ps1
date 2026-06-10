# Jednoduchy staticky HTTP server v PowerShellu - preview pro dhouse-web.
# Spusti se na http://localhost:5500/. Bez zavislosti, jen .NET.
# Pouziti: powershell -NoProfile -ExecutionPolicy Bypass -File _serve.ps1

$port = 8080
$root = $PSScriptRoot

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()
Write-Host "dhouse-web preview: http://localhost:$port/" -ForegroundColor Green
Write-Host "Stiskni Ctrl+C pro ukonceni." -ForegroundColor DarkGray
Write-Host ""

$mime = @{
    '.html' = 'text/html; charset=utf-8'
    '.htm'  = 'text/html; charset=utf-8'
    '.css'  = 'text/css; charset=utf-8'
    '.js'   = 'application/javascript; charset=utf-8'
    '.json' = 'application/json; charset=utf-8'
    '.xml'  = 'application/xml; charset=utf-8'
    '.txt'  = 'text/plain; charset=utf-8'
    '.md'   = 'text/plain; charset=utf-8'
    '.svg'  = 'image/svg+xml'
    '.png'  = 'image/png'
    '.jpg'  = 'image/jpeg'
    '.jpeg' = 'image/jpeg'
    '.webp' = 'image/webp'
    '.ico'  = 'image/x-icon'
    '.woff2'= 'font/woff2'
}

# Pretty-URL redirects (kopie netlify.toml)

$redirects = @{
    '/galerie' = '/galerie.html'
    '/kvalita' = '/kvalita.html'
    '/atelier' = '/atelier.html'
    '/kontakt' = '/kontakt.html'
    '/dekujeme' = '/dekujeme.html'
    '/impressum' = '/impressum.html'
    '/obchodni-podminky' = '/obchodni-podminky.html'
    '/ochrana-osobnich-udaju' = '/ochrana-osobnich-udaju.html'
    '/blog' = '/blog/index.html'
}

try {
    while ($listener.IsListening) {
        try {
            $ctx = $listener.GetContext()
            $req = $ctx.Request
            $res = $ctx.Response
            $path = $req.Url.LocalPath
            $method = $req.HttpMethod

            if ($redirects.ContainsKey($path)) { $path = $redirects[$path] }
            if ($path -match '^/blog/[a-z0-9\-]+$') { $path = $path + '.html' }
            if ($path -eq '/') { $path = '/index.html' }

            $fp = Join-Path $root $path.TrimStart('/').Replace('/','\')
            Write-Host "$method $($req.Url.LocalPath) -> $fp" -ForegroundColor DarkGray

            # CORS preflight (Chrome Private Network Access pro https->localhost)
            if ($method -eq 'OPTIONS') {
                $res.StatusCode = 204
                $res.Headers.Add('Access-Control-Allow-Origin', '*')
                $res.Headers.Add('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
                $res.Headers.Add('Access-Control-Allow-Headers', '*')
                $res.Headers.Add('Access-Control-Allow-Private-Network', 'true')
                $res.OutputStream.Close()
                continue
            }

            if (Test-Path $fp -PathType Leaf) {
                $ext = [System.IO.Path]::GetExtension($fp).ToLower()
                $ct  = if ($mime.ContainsKey($ext)) { $mime[$ext] } else { 'application/octet-stream' }
                $bytes = [System.IO.File]::ReadAllBytes($fp)
                $res.ContentType = $ct
                $res.ContentLength64 = $bytes.Length
                $res.Headers.Add('Cache-Control', 'no-store')
                $res.Headers.Add('Access-Control-Allow-Origin', '*')
                $res.Headers.Add('Access-Control-Allow-Private-Network', 'true')
                if ($method -ne 'HEAD') {
                    $res.OutputStream.Write($bytes, 0, $bytes.Length)
                }
            } else {
                $res.StatusCode = 404
                if ($method -ne 'HEAD') {
                    $msg = [System.Text.Encoding]::UTF8.GetBytes("404 - $($req.Url.LocalPath)")
                    $res.OutputStream.Write($msg, 0, $msg.Length)
                }
            }
            $res.OutputStream.Close()
        } catch {
            Write-Host "REQUEST CHYBA: $_" -ForegroundColor Red
            try { $res.OutputStream.Close() } catch { }
        }
    }
} finally {
    $listener.Stop()
    $listener.Close()
}

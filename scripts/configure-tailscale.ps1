$ErrorActionPreference = 'Stop'
$tailscale = Join-Path $env:ProgramFiles 'Tailscale\tailscale.exe'
if (-not (Test-Path -LiteralPath $tailscale)) {
    Write-Error 'No se encontro Tailscale en C:\Program Files\Tailscale\tailscale.exe.'
    exit 1
}

$statusJson = & $tailscale status --json | ConvertFrom-Json
if ($statusJson.BackendState -ne 'Running') {
    Write-Error 'Tailscale no esta conectado. Abre Tailscale e inicia sesion antes de continuar.'
    exit 1
}

& $tailscale serve --bg --yes 8787
if ($LASTEXITCODE -ne 0) {
    Write-Error 'No se pudo configurar Serve. Revisa el mensaje de Tailscale y autoriza Serve si muestra un enlace oficial.'
    exit $LASTEXITCODE
}

Write-Host ''
& $tailscale serve status
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$dnsName = $statusJson.Self.DNSName.TrimEnd('.')
Write-Host ''
Write-Host "Backend privado: https://$dnsName"
Write-Host 'No se habilito Funnel ni se abrio el puerto en el router.'

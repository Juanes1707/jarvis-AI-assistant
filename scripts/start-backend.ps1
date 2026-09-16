$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Security
$privateDirectory = Join-Path $env:LOCALAPPDATA 'JARVIS'
$apiTokenPath = Join-Path $privateDirectory 'backend-api-token.dpapi'
$webhookTokenPath = Join-Path $privateDirectory 'backend-webhook-token.dpapi'
$entropy = [System.Text.Encoding]::UTF8.GetBytes('JARVIS backend token v1')
$resultCode = 1

foreach ($secretPath in @($apiTokenPath, $webhookTokenPath)) {
    if (-not (Test-Path -LiteralPath $secretPath)) {
        Write-Error 'Faltan los secretos protegidos. Ejecuta npm run backend:secrets.'
        exit 1
    }
}

function Read-ProtectedToken([string]$path) {
    $protectedBytes = [Convert]::FromBase64String([System.IO.File]::ReadAllText($path).Trim())
    $plainBytes = $null
    try {
        $plainBytes = [System.Security.Cryptography.ProtectedData]::Unprotect(
            $protectedBytes,
            $entropy,
            [System.Security.Cryptography.DataProtectionScope]::CurrentUser
        )
        return [System.Text.Encoding]::UTF8.GetString($plainBytes)
    } finally {
        [Array]::Clear($protectedBytes, 0, $protectedBytes.Length)
        if ($null -ne $plainBytes) {
            [Array]::Clear($plainBytes, 0, $plainBytes.Length)
        }
    }
}

try {
    $env:JARVIS_API_TOKEN = (Read-ProtectedToken $apiTokenPath).Trim()
    $env:JARVIS_WEBHOOK_TOKEN = (Read-ProtectedToken $webhookTokenPath).Trim()
    if (-not $env:JARVIS_HOST) { $env:JARVIS_HOST = '127.0.0.1' }
    if (-not $env:JARVIS_PORT) { $env:JARVIS_PORT = '8787' }
    if (-not $env:JARVIS_OLLAMA_URL) { $env:JARVIS_OLLAMA_URL = 'http://127.0.0.1:11434' }
    if (-not $env:JARVIS_OLLAMA_MODEL) { $env:JARVIS_OLLAMA_MODEL = 'qwen3.5:4b' }

    Write-Host "JARVIS backend local en http://$($env:JARVIS_HOST):$($env:JARVIS_PORT)"
    Write-Host 'Tailscale Serve publica este puerto solo dentro de tu tailnet.'
    & node (Join-Path $PSScriptRoot 'python-backend.cjs') start
    $resultCode = $LASTEXITCODE
} finally {
    Remove-Item Env:JARVIS_API_TOKEN -ErrorAction SilentlyContinue
    Remove-Item Env:JARVIS_WEBHOOK_TOKEN -ErrorAction SilentlyContinue
    [Array]::Clear($entropy, 0, $entropy.Length)
}

exit $resultCode

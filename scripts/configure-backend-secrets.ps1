param(
    [switch]$Force
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Security
$privateDirectory = Join-Path $env:LOCALAPPDATA 'JARVIS'
$apiTokenPath = Join-Path $privateDirectory 'backend-api-token.dpapi'
$webhookTokenPath = Join-Path $privateDirectory 'backend-webhook-token.dpapi'
$entropy = [System.Text.Encoding]::UTF8.GetBytes('JARVIS backend token v1')

function New-JarvisToken {
    $bytes = New-Object byte[] 32
    $generator = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try {
        $generator.GetBytes($bytes)
        return [Convert]::ToBase64String($bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_')
    } finally {
        $generator.Dispose()
        [Array]::Clear($bytes, 0, $bytes.Length)
    }
}

function Save-ProtectedToken([string]$path) {
    $plainToken = New-JarvisToken
    $plainBytes = [System.Text.Encoding]::UTF8.GetBytes($plainToken)
    $protectedBytes = $null
    try {
        $protectedBytes = [System.Security.Cryptography.ProtectedData]::Protect(
            $plainBytes,
            $entropy,
            [System.Security.Cryptography.DataProtectionScope]::CurrentUser
        )
        [System.IO.File]::WriteAllText(
            $path,
            [Convert]::ToBase64String($protectedBytes),
            [System.Text.UTF8Encoding]::new($false)
        )
    } finally {
        $plainToken = $null
        [Array]::Clear($plainBytes, 0, $plainBytes.Length)
        if ($null -ne $protectedBytes) {
            [Array]::Clear($protectedBytes, 0, $protectedBytes.Length)
        }
    }
}

New-Item -ItemType Directory -Force -Path $privateDirectory | Out-Null
$allSecretPaths = @($apiTokenPath, $webhookTokenPath)
$existingPaths = @($allSecretPaths | Where-Object { Test-Path -LiteralPath $_ })
if ($existingPaths.Count -eq $allSecretPaths.Count -and -not $Force) {
    Write-Host 'Los secretos del backend ya existen y no fueron reemplazados.'
    Write-Host 'Usa npm run backend:secrets -- -Force solo si necesitas rotarlos.'
    exit 0
}

foreach ($secretPath in $allSecretPaths) {
    if ($Force -or -not (Test-Path -LiteralPath $secretPath)) {
        Save-ProtectedToken $secretPath
    }
}

Write-Host 'Secretos distintos generados y cifrados con DPAPI para tu usuario de Windows.'
Write-Host 'No se mostraron ni se guardaron dentro del repositorio.'
Write-Host 'Ahora ejecuta: npm run backend:start'
[Array]::Clear($entropy, 0, $entropy.Length)

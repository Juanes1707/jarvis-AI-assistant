$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Security

$privateDirectory = Join-Path $env:LOCALAPPDATA 'JARVIS'
$apiTokenPath = Join-Path $privateDirectory 'backend-api-token.dpapi'
$entropy = [System.Text.Encoding]::UTF8.GetBytes('JARVIS backend token v1')
$protectedBytes = $null
$plainBytes = $null
$token = $null

if (-not (Test-Path -LiteralPath $apiTokenPath)) {
    throw 'Falta el token protegido. Ejecuta npm run backend:secrets.'
}

try {
    $protectedBytes = [Convert]::FromBase64String(
        [System.IO.File]::ReadAllText($apiTokenPath).Trim()
    )
    $plainBytes = [System.Security.Cryptography.ProtectedData]::Unprotect(
        $protectedBytes,
        $entropy,
        [System.Security.Cryptography.DataProtectionScope]::CurrentUser
    )
    $token = [System.Text.Encoding]::UTF8.GetString($plainBytes).Trim()
    if ($token.Length -lt 24) {
        throw 'El token protegido no es válido. Ejecuta npm run backend:secrets -- -Force.'
    }
    Set-Clipboard -Value $token
} finally {
    $token = $null
    if ($null -ne $protectedBytes) {
        [Array]::Clear($protectedBytes, 0, $protectedBytes.Length)
    }
    if ($null -ne $plainBytes) {
        [Array]::Clear($plainBytes, 0, $plainBytes.Length)
    }
    [Array]::Clear($entropy, 0, $entropy.Length)
}

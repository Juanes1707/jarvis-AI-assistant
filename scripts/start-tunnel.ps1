$ErrorActionPreference = 'Stop'
$secretPath = Join-Path $env:LOCALAPPDATA 'JARVIS\ngrok-token.dpapi'
if (-not (Test-Path -LiteralPath $secretPath)) {
    Write-Error 'Falta configurar tu cuenta. Ejecuta npm run ngrok:configure.'
    exit 1
}
$secureToken = ConvertTo-SecureString ([System.IO.File]::ReadAllText($secretPath))
$pointer = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureToken)
try {
    $env:NGROK_AUTHTOKEN = [System.Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer).Trim()
    if (-not $env:NGROK_AUTHTOKEN) { throw 'El token esta vacio. Ejecuta npm run ngrok:configure.' }
    & node (Join-Path $PSScriptRoot 'start-ngrok.cjs')
    $resultCode = $LASTEXITCODE
} finally {
    [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
    $secureToken.Dispose()
    Remove-Item Env:NGROK_AUTHTOKEN -ErrorAction SilentlyContinue
}
exit $resultCode

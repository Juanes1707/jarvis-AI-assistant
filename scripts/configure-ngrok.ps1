$ErrorActionPreference = 'Stop'
$privateDirectory = Join-Path $env:LOCALAPPDATA 'JARVIS'
$secretPath = Join-Path $privateDirectory 'ngrok-token.dpapi'
Write-Host 'Copia tu AUTHTOKEN (no la API key) desde:'
Write-Host 'https://dashboard.ngrok.com/get-started/your-authtoken'
Write-Host 'El token no se mostrara ni se guardara en el repositorio.'
$secureToken = Read-Host 'Pega el authtoken y pulsa Enter' -AsSecureString
if ($secureToken.Length -eq 0) { throw 'No se recibio un token; no se guardo ningun cambio.' }
New-Item -ItemType Directory -Force -Path $privateDirectory | Out-Null
$protectedToken = ConvertFrom-SecureString -SecureString $secureToken
[System.IO.File]::WriteAllText($secretPath, $protectedToken, [System.Text.UTF8Encoding]::new($false))
$secureToken.Dispose()
Write-Host 'Token guardado con proteccion de Windows para tu usuario.'
Write-Host 'Ahora ejecuta: npm run start:tunnel'

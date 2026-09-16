$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Security

$identity = [System.Security.Principal.WindowsIdentity]::GetCurrent()
$principal = [System.Security.Principal.WindowsPrincipal]::new($identity)
$isAdministrator = $principal.IsInRole([System.Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdministrator) {
    throw 'Abre PowerShell como administrador y vuelve a ejecutar npm run backend:install-db.'
}

$privateDirectory = Join-Path $env:LOCALAPPDATA 'JARVIS'
$adminPasswordPath = Join-Path $privateDirectory 'postgres-admin-password.dpapi'
$entropy = [System.Text.Encoding]::UTF8.GetBytes('JARVIS backend token v1')
$service = Get-Service -Name 'postgresql-x64-17' -ErrorAction SilentlyContinue

function New-PostgresAdminPassword {
    $bytes = New-Object byte[] 32
    $generator = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try {
        $generator.GetBytes($bytes)
        return 'Aa9!' + [Convert]::ToBase64String($bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_')
    } finally {
        $generator.Dispose()
        [Array]::Clear($bytes, 0, $bytes.Length)
    }
}

function Save-ProtectedValue([string]$path, [string]$value) {
    $plainBytes = [System.Text.Encoding]::UTF8.GetBytes($value)
    $protectedBytes = $null
    try {
        $protectedBytes = [System.Security.Cryptography.ProtectedData]::Protect(
            $plainBytes,
            $entropy,
            [System.Security.Cryptography.DataProtectionScope]::CurrentUser
        )
        New-Item -ItemType Directory -Force -Path (Split-Path -Parent $path) | Out-Null
        [System.IO.File]::WriteAllText(
            $path,
            [Convert]::ToBase64String($protectedBytes),
            [System.Text.UTF8Encoding]::new($false)
        )
    } finally {
        [Array]::Clear($plainBytes, 0, $plainBytes.Length)
        if ($null -ne $protectedBytes) {
            [Array]::Clear($protectedBytes, 0, $protectedBytes.Length)
        }
    }
}

function Find-Psql {
    $command = Get-Command psql.exe -ErrorAction SilentlyContinue
    if ($null -ne $command) { return $command.Source }
    $postgresRoot = Join-Path $env:ProgramFiles 'PostgreSQL'
    if (-not (Test-Path -LiteralPath $postgresRoot)) { return $null }
    return Get-ChildItem -LiteralPath $postgresRoot -Directory |
        Sort-Object { try { [version]$_.Name } catch { [version]'0.0' } } -Descending |
        ForEach-Object { Join-Path $_.FullName 'bin\psql.exe' } |
        Where-Object { Test-Path -LiteralPath $_ } |
        Select-Object -First 1
}

$adminPassword = $null
$currentPassword = $null
$securePassword = $null
$credential = $null
$previousPgPassword = $env:PGPASSWORD
try {
    if ($null -eq $service) {
        & winget install --id PostgreSQL.PostgreSQL.17 --exact --source winget --accept-source-agreements --accept-package-agreements
        if ($LASTEXITCODE -ne 0) {
            throw 'La instalación de PostgreSQL no terminó correctamente.'
        }
        $service = Get-Service -Name 'postgresql-x64-17' -ErrorAction SilentlyContinue
        if ($null -eq $service) {
            throw 'El instalador terminó sin crear el servicio PostgreSQL esperado.'
        }
        $currentPassword = 'postgres'
    } elseif (Test-Path -LiteralPath $adminPasswordPath) {
        Write-Host 'PostgreSQL 17 ya está instalado y su credencial protegida existe.'
        exit 0
    } else {
        $securePassword = Read-Host "Contraseña actual del usuario PostgreSQL 'postgres'" -AsSecureString
        $credential = [System.Management.Automation.PSCredential]::new('postgres', $securePassword)
        $currentPassword = $credential.GetNetworkCredential().Password
    }

    $psqlPath = Find-Psql
    if ($null -eq $psqlPath) {
        throw 'PostgreSQL fue instalado, pero no encontré psql para asegurar la cuenta administrativa.'
    }
    $adminPassword = New-PostgresAdminPassword
    $env:PGPASSWORD = $currentPassword
    "ALTER ROLE postgres WITH PASSWORD '$adminPassword';" |
        & $psqlPath -X --no-password --set ON_ERROR_STOP=1 --host 127.0.0.1 --port 5432 --username postgres --dbname postgres | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw 'No pude rotar la contraseña administrativa de PostgreSQL.'
    }
    Save-ProtectedValue $adminPasswordPath $adminPassword
    Write-Host 'PostgreSQL 17 quedó instalado y su credencial administrativa se rotó y cifró con DPAPI.'
    Write-Host 'Ahora ejecuta: npm run backend:database'
} finally {
    if ($null -eq $previousPgPassword) {
        Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
    } else {
        $env:PGPASSWORD = $previousPgPassword
    }
    if ($null -ne $securePassword) { $securePassword.Dispose() }
    $adminPassword = $null
    $currentPassword = $null
    $credential = $null
    [Array]::Clear($entropy, 0, $entropy.Length)
}

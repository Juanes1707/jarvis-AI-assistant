param(
    [string]$HostName = '127.0.0.1',
    [int]$Port = 5432,
    [string]$AdminUser = 'postgres',
    [string]$DatabaseName = 'jarvis',
    [string]$AppUser = 'jarvis_app',
    [switch]$Force
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Security

if ($HostName -notin @('127.0.0.1', 'localhost', '::1')) {
    throw 'La base de datos de JARVIS debe permanecer en localhost.'
}
if ($Port -lt 1 -or $Port -gt 65535) {
    throw 'El puerto de PostgreSQL debe estar entre 1 y 65535.'
}
foreach ($identifier in @($AdminUser, $DatabaseName, $AppUser)) {
    if ($identifier -notmatch '^[A-Za-z][A-Za-z0-9_]{0,62}$') {
        throw 'Los nombres de usuario y base de datos solo pueden contener letras, números y guion bajo.'
    }
}

$privateDirectory = Join-Path $env:LOCALAPPDATA 'JARVIS'
$databaseUrlPath = Join-Path $privateDirectory 'database-url.dpapi'
$adminPasswordPath = Join-Path $privateDirectory 'postgres-admin-password.dpapi'
$entropy = [System.Text.Encoding]::UTF8.GetBytes('JARVIS backend token v1')

if ((Test-Path -LiteralPath $databaseUrlPath) -and -not $Force) {
    Write-Host 'La conexión PostgreSQL protegida ya existe y no fue reemplazada.'
    Write-Host 'Usa npm run backend:database -- -Force solo si necesitas reconfigurarla.'
    exit 0
}

$psql = Get-Command psql.exe -ErrorAction SilentlyContinue
if ($null -eq $psql) {
    $postgresRoot = Join-Path $env:ProgramFiles 'PostgreSQL'
    if (Test-Path -LiteralPath $postgresRoot) {
        $psql = Get-ChildItem -LiteralPath $postgresRoot -Directory |
            Sort-Object { try { [version]$_.Name } catch { [version]'0.0' } } -Descending |
            ForEach-Object { Join-Path $_.FullName 'bin\psql.exe' } |
            Where-Object { Test-Path -LiteralPath $_ } |
            Select-Object -First 1
    }
}
if ($null -eq $psql) {
    throw 'No encontré psql. Instala PostgreSQL antes de ejecutar esta configuración.'
}
$psqlPath = if ($psql -is [System.Management.Automation.CommandInfo]) { $psql.Source } else { [string]$psql }

function New-JarvisDatabasePassword {
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

function Save-ProtectedValue([string]$path, [string]$value) {
    $plainBytes = [System.Text.Encoding]::UTF8.GetBytes($value)
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
        [Array]::Clear($plainBytes, 0, $plainBytes.Length)
        if ($null -ne $protectedBytes) {
            [Array]::Clear($protectedBytes, 0, $protectedBytes.Length)
        }
    }
}

function Read-ProtectedValue([string]$path) {
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

$secureAdminPassword = $null
$credential = $null
if ($AdminUser -eq 'postgres' -and (Test-Path -LiteralPath $adminPasswordPath)) {
    $adminPassword = Read-ProtectedValue $adminPasswordPath
} else {
    $secureAdminPassword = Read-Host "Contraseña del usuario PostgreSQL '$AdminUser'" -AsSecureString
    $credential = [System.Management.Automation.PSCredential]::new($AdminUser, $secureAdminPassword)
    $adminPassword = $credential.GetNetworkCredential().Password
}
$appPassword = New-JarvisDatabasePassword
$previousPgPassword = $env:PGPASSWORD

try {
    $env:PGPASSWORD = $adminPassword
    $setupSql = @"
SELECT 'CREATE ROLE $AppUser LOGIN PASSWORD ''$appPassword'''
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '$AppUser') \gexec
ALTER ROLE $AppUser WITH LOGIN PASSWORD '$appPassword' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;
SELECT 'CREATE DATABASE $DatabaseName OWNER $AppUser'
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = '$DatabaseName') \gexec
ALTER DATABASE $DatabaseName OWNER TO $AppUser;
"@
    $setupOutput = $setupSql | & $psqlPath -X --no-password --set ON_ERROR_STOP=1 --host $HostName --port $Port --username $AdminUser --dbname postgres 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "No pude preparar PostgreSQL. $($setupOutput -join ' ')"
    }

    $env:PGPASSWORD = $appPassword
    & $psqlPath -X --no-password --set ON_ERROR_STOP=1 --host $HostName --port $Port --username $AppUser --dbname $DatabaseName --command 'SELECT 1;' | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw 'La base fue creada, pero la credencial de la aplicación no pudo conectarse.'
    }

    $urlHost = if ($HostName -eq '::1') { '[::1]' } else { $HostName }
    $databaseUrl = "postgresql+psycopg://$AppUser`:$appPassword@$urlHost`:$Port/$DatabaseName"
    New-Item -ItemType Directory -Force -Path $privateDirectory | Out-Null
    Save-ProtectedValue $databaseUrlPath $databaseUrl
    Write-Host 'PostgreSQL quedó preparado para JARVIS y la conexión fue cifrada con DPAPI.'
    Write-Host 'La contraseña no fue mostrada ni guardada dentro del repositorio.'
} finally {
    if ($null -eq $previousPgPassword) {
        Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
    } else {
        $env:PGPASSWORD = $previousPgPassword
    }
    $adminPassword = $null
    $appPassword = $null
    $credential = $null
    if ($null -ne $secureAdminPassword) {
        $secureAdminPassword.Dispose()
    }
    [Array]::Clear($entropy, 0, $entropy.Length)
}

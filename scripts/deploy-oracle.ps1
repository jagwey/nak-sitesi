<#
.SYNOPSIS
  Builds linux/amd64 production Docker images locally, deploys the full Nakis Sitesi
  store to an Oracle Cloud Always Free VM (VM.Standard.E2.1.Micro or A1.Flex), verifies
  HTTPS + origin token lock, and cuts over the existing Cloudflare Worker.

.EXAMPLE
  .\scripts\deploy-oracle.ps1 -ServerIp 130.61.x.y -SeedDemo
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$ServerIp,

  [string]$SshUser = "ubuntu",
  [string]$SshKey = (Join-Path $HOME ".ssh\nakis-oci"),
  [string]$PublicHost = "nakis-vitrin.nakis-sitesi.workers.dev",
  [string]$OriginHost = "",
  [string]$Platform = "linux/amd64",
  [switch]$SeedDemo,
  [switch]$SkipBuild,
  [switch]$SkipWorkerDeploy
)

$ErrorActionPreference = "Stop"
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $RepoRoot

if (-not (Test-Path $SshKey)) {
  throw "SSH anahtarı bulunamadı: $SshKey"
}

if (-not $OriginHost) {
  $OriginHost = ($ServerIp -replace '\.', '-') + ".sslip.io"
}

$PublicUrl = "https://$PublicHost"
$OriginUrl = "https://$OriginHost"
$SecretsDir = Join-Path $RepoRoot ".deploy-secrets"
New-Item -ItemType Directory -Force -Path $SecretsDir | Out-Null
$SecretsFile = Join-Path $SecretsDir ("oracle-" + ($ServerIp -replace '[^0-9a-zA-Z_-]', '_') + ".json")

function New-RandomSecret([int]$Bytes = 32) {
  $buf = New-Object byte[] $Bytes
  [System.Security.Cryptography.RandomNumberGenerator]::Fill($buf)
  return ([Convert]::ToBase64String($buf) -replace '\+', '-' -replace '/', '_' -replace '=', '')
}

if (Test-Path $SecretsFile) {
  $secrets = Get-Content $SecretsFile -Raw | ConvertFrom-Json
  Write-Host "Mevcut sunucu sırları yeniden kullanılıyor: $SecretsFile"
} else {
  $secrets = [PSCustomObject]@{
    POSTGRES_PASSWORD  = New-RandomSecret 24
    SESSION_SECRET     = New-RandomSecret 48
    NAKIS_ORIGIN_TOKEN = New-RandomSecret 36
  }
  $secrets | ConvertTo-Json | Set-Content -Path $SecretsFile -Encoding utf8
  Write-Host "Yeni üretim sırları yerel git dışı dosyaya kaydedildi: $SecretsFile"
}

$S3PublicBaseUrl = "$PublicUrl/images"
$WebImage = "nakis-sitesi-web:prod"
$ToolsImage = "nakis-sitesi-tools:prod"

if (-not $SkipBuild) {
  Write-Host "[1/6] Yerelde $Platform Docker imajları derleniyor (1 GB sunucuda RAM harcamamak için)..."
  docker buildx build --platform $Platform --target tools --load -t $ToolsImage .
  if ($LASTEXITCODE -ne 0) { throw "tools imajı derlenemedi" }

  docker buildx build --platform $Platform --target app --build-arg "S3_PUBLIC_BASE_URL=$S3PublicBaseUrl" --load -t $WebImage .
  if ($LASTEXITCODE -ne 0) { throw "web imajı derlenemedi" }
}

$SshTarget = "$SshUser@$ServerIp"
$SshArgs = @("-i", $SshKey, "-o", "StrictHostKeyChecking=accept-new", "-o", "ConnectTimeout=15")

Write-Host "[2/6] SSH bağlantısı ve Ubuntu sunucu ön kurulumu (swap + Docker + iptables 80/443)..."
ssh @SshArgs $SshTarget "mkdir -p /tmp/nakis-init"
if ($LASTEXITCODE -ne 0) { throw "SSH bağlantısı kurulamadı: $SshTarget" }

scp -i $SshKey -o StrictHostKeyChecking=accept-new "deploy/oracle/setup-vm.sh" "${SshTarget}:/tmp/nakis-init/setup-vm.sh"
if ($LASTEXITCODE -ne 0) { throw "setup-vm.sh kopyalanamadı" }

ssh @SshArgs $SshTarget "sed -i 's/\r$//' /tmp/nakis-init/setup-vm.sh && sudo bash /tmp/nakis-init/setup-vm.sh"
if ($LASTEXITCODE -ne 0) { throw "setup-vm.sh başarısız oldu" }

Write-Host "[3/6] Yapılandırma ve kısıtlı ortam dosyaları /opt/nakis dizinine aktarılıyor..."
$TmpDir = Join-Path $env:TEMP ("nakis-deploy-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Force -Path $TmpDir | Out-Null

try {
  $encodedPgPass = [System.Uri]::EscapeDataString($secrets.POSTGRES_PASSWORD)
  $envProd = @(
    "NODE_ENV=production"
    "APP_URL=$PublicUrl"
    "POSTGRES_PASSWORD=$($secrets.POSTGRES_PASSWORD)"
    "DATABASE_URL=postgresql://nakis:$encodedPgPass@postgres:5432/nakis"
    "SESSION_SECRET=$($secrets.SESSION_SECRET)"
    "S3_ENDPOINT=https://s3.invalid"
    "S3_REGION=eu-central-1"
    "S3_ACCESS_KEY=pending-real-s3"
    "S3_SECRET_KEY=pending-real-s3"
    "S3_BUCKET_PRIVATE=nakis-private"
    "S3_BUCKET_PUBLIC=nakis-public"
    "S3_PUBLIC_BASE_URL=$S3PublicBaseUrl"
    "S3_FORCE_PATH_STYLE=true"
    "EMAIL_TRANSPORT=console"
    "SMTP_HOST=localhost"
    "SMTP_PORT=1025"
    "SMTP_USER="
    "SMTP_PASS="
    "SMTP_FROM=no-reply@$OriginHost"
    "PAYMENT_PROVIDER=none"
    "PAYMENT_SIMULATION_ENABLED=false"
    "NAKIS_WEB_IMAGE=$WebImage"
    "NAKIS_TOOLS_IMAGE=$ToolsImage"
  ) -join "`n"

  $envCaddy = @(
    "NAKIS_ORIGIN_HOST=$OriginHost"
    "NAKIS_PUBLIC_HOST=$PublicHost"
    "NAKIS_ORIGIN_TOKEN=$($secrets.NAKIS_ORIGIN_TOKEN)"
  ) -join "`n"

  $EnvProdPath = Join-Path $TmpDir ".env.production"
  $EnvCaddyPath = Join-Path $TmpDir ".env.caddy"
  [System.IO.File]::WriteAllText($EnvProdPath, $envProd + "`n", (New-Object System.Text.UTF8Encoding($false)))
  [System.IO.File]::WriteAllText($EnvCaddyPath, $envCaddy + "`n", (New-Object System.Text.UTF8Encoding($false)))

  scp -i $SshKey -o StrictHostKeyChecking=accept-new `
    "docker-compose.prod.yml" `
    $EnvProdPath `
    $EnvCaddyPath `
    "${SshTarget}:/opt/nakis/"
  if ($LASTEXITCODE -ne 0) { throw "Temel dosyalar aktarılamadı" }

  scp -i $SshKey -o StrictHostKeyChecking=accept-new `
    "deploy/oracle/docker-compose.micro.yml" `
    "${SshTarget}:/opt/nakis/deploy/oracle/docker-compose.micro.yml"
  if ($LASTEXITCODE -ne 0) { throw "Micro compose dosyası aktarılamadı" }

  scp -i $SshKey -o StrictHostKeyChecking=accept-new `
    "deploy/cloudflare/Caddyfile" `
    "${SshTarget}:/opt/nakis/deploy/cloudflare/Caddyfile"
  if ($LASTEXITCODE -ne 0) { throw "Caddyfile aktarılamadı" }

  ssh @SshArgs $SshTarget "chmod 600 /opt/nakis/.env.production /opt/nakis/.env.caddy && sed -i 's/\r$//' /opt/nakis/deploy/cloudflare/Caddyfile"
  if ($LASTEXITCODE -ne 0) { throw "Dosya izinleri ayarlanamadı" }

  Write-Host "[4/6] Sıkıştırılmış Docker imajları SSH üzerinden sunucuya yükleniyor..."
  $TarPath = Join-Path $TmpDir "nakis-images.tar"
  $TarGzPath = Join-Path $TmpDir "nakis-images.tar.gz"
  docker save -o $TarPath $WebImage $ToolsImage
  if ($LASTEXITCODE -ne 0) { throw "docker save başarısız" }

  node -e "const fs=require('fs'),zlib=require('zlib'); fs.createReadStream(process.argv[1]).pipe(zlib.createGzip({level:1})).pipe(fs.createWriteStream(process.argv[2]));" $TarPath $TarGzPath
  if ($LASTEXITCODE -ne 0) { throw "Docker imaj arşivi sıkıştırılamadı" }
  Remove-Item -Force $TarPath -ErrorAction SilentlyContinue

  scp -i $SshKey -o StrictHostKeyChecking=accept-new $TarGzPath "${SshTarget}:/tmp/nakis-images.tar.gz"
  if ($LASTEXITCODE -ne 0) { throw "Docker imaj arşivi aktarılamadı" }

  ssh @SshArgs $SshTarget "gunzip -c /tmp/nakis-images.tar.gz | sudo docker load && rm -f /tmp/nakis-images.tar.gz"
  if ($LASTEXITCODE -ne 0) { throw "Sunucuda docker load başarısız" }

  Write-Host "[5/6] PostgreSQL, migration, seed, web ve Caddy başlatılıyor..."
  $seedCmd = if ($SeedDemo) { "npm run db:seed" } else { "npm run db:seed -- -- --reference-only" }
  $remoteUp = (@(
    "set -euo pipefail"
    "cd /opt/nakis"
    "COMPOSE='sudo docker compose --env-file .env.production -f docker-compose.prod.yml -f deploy/oracle/docker-compose.micro.yml'"
    '$COMPOSE up -d --wait postgres'
    '$COMPOSE run --rm tools npm run db:deploy'
    "`$COMPOSE run --rm tools $seedCmd"
    '$COMPOSE run --rm tools npm run search:reindex'
    '$COMPOSE up -d --wait web'
    '$COMPOSE up -d caddy'
    'sudo docker stats --no-stream --format "table {{.Name}}\t{{.MemUsage}}\t{{.MemPerc}}"'
  ) -join "`n")
  ssh @SshArgs $SshTarget $remoteUp
  if ($LASTEXITCODE -ne 0) { throw "Sunucu servisleri başlatılamadı" }

  Write-Host "[6/6] Doğrudan HTTPS köken (origin) kontrolleri ($OriginUrl)..."
  $originOk = $false
  for ($i = 0; $i -lt 24; $i++) {
    $noTok = curl.exe -s -o NUL -w "%{http_code}" "$OriginUrl/api/health" 2>$null
    $withTok = curl.exe -s -H "Nakis-Origin-Token: $($secrets.NAKIS_ORIGIN_TOKEN)" -H "Nakis-Client-IP: 198.51.100.1" "$OriginUrl/api/health" 2>$null
    if ($noTok -eq "404" -and $withTok -match '"ok":true') {
      $originOk = $true
      break
    }
    Start-Sleep -Seconds 5
  }
  if (-not $originOk) {
    throw "Origin HTTPS doğrulaması tamamlanamadı ($OriginUrl). Oracle Security List'te TCP 80 ve 443 açık mı kontrol edin."
  }
  Write-Host "Origin HTTPS doğrulandı: tokensız 404, tokenlı 200 ok:true"

  if (-not $SkipWorkerDeploy) {
    Write-Host "Cloudflare Worker sürümü yükleniyor ve canlıya alınıyor ($PublicUrl)..."
    $CfSecretsPath = Join-Path $TmpDir "cf-secrets.env"
    [System.IO.File]::WriteAllText($CfSecretsPath, "NAKIS_ORIGIN_TOKEN=$($secrets.NAKIS_ORIGIN_TOKEN)`n", (New-Object System.Text.UTF8Encoding($false)))

    $uploadOut = npx wrangler@4.85.0 versions upload --config deploy/cloudflare/wrangler.jsonc --var "NAKIS_ORIGIN:$OriginUrl" --secrets-file $CfSecretsPath 2>&1 | Out-String
    Write-Host $uploadOut
    if ($LASTEXITCODE -ne 0) { throw "Wrangler versions upload başarısız" }

    $versionMatch = [regex]::Match($uploadOut, 'Version ID:\s*([0-9a-f-]{36})')
    if (-not $versionMatch.Success) {
      throw "Wrangler sürüm kimliği (Version ID) okunamadı."
    }
    $versionId = $versionMatch.Groups[1].Value

    npx wrangler@4.85.0 versions deploy "${versionId}@100%" --config deploy/cloudflare/wrangler.jsonc --yes
    if ($LASTEXITCODE -ne 0) { throw "Wrangler versions deploy başarısız" }

    Start-Sleep -Seconds 3
    $liveHealth = curl.exe -s "$PublicUrl/api/health"
    Write-Host "Canlı mağaza sağlık yanıtı ($PublicUrl/api/health): $liveHealth"
    if ($liveHealth -notmatch '"ok":true') {
      throw "Canlı mağaza /api/health bekleneni dönmedi!"
    }
  }

  Write-Host "Tamamlandı! Canlı adres: $PublicUrl (Origin: $OriginUrl)"
} finally {
  Remove-Item -Recurse -Force $TmpDir -ErrorAction SilentlyContinue
}

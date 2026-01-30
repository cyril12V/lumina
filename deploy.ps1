# Lumina Deployment Script for Fly.io (Windows PowerShell)

Write-Host "=== Lumina Deployment ===" -ForegroundColor Cyan
Write-Host ""

# Check if fly CLI is installed
$flyInstalled = Get-Command fly -ErrorAction SilentlyContinue

if (-not $flyInstalled) {
    Write-Host "Fly CLI not found. Installing..." -ForegroundColor Yellow
    iwr https://fly.io/install.ps1 -useb | iex

    # Refresh PATH
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
}

# Check if logged in
try {
    fly auth whoami 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "Not logged in"
    }
} catch {
    Write-Host "Please log in to Fly.io..." -ForegroundColor Yellow
    fly auth login
}

# Create volume if it doesn't exist
Write-Host "Checking for volume..." -ForegroundColor Cyan
$volumes = fly volumes list 2>$null
if ($volumes -notmatch "lumina_data") {
    Write-Host "Creating persistent volume for database..." -ForegroundColor Yellow
    fly volumes create lumina_data --region cdg --size 1
}

# Deploy
Write-Host ""
Write-Host "Deploying to Fly.io..." -ForegroundColor Cyan
fly deploy

Write-Host ""
Write-Host "=== Deployment Complete ===" -ForegroundColor Green
Write-Host "Your app is available at: https://lumina-photo.fly.dev" -ForegroundColor Green

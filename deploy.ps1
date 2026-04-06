# Script para hacer deploy automático a Vercel
# Uso: .\deploy.ps1 "mensaje del commit"

param(
    [Parameter(Mandatory=$true)]
    [string]$CommitMessage
)

Write-Host "========================================" -ForegroundColor Green
Write-Host "DEPLOY AUTOMÁTICO A VERCEL" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Green

# Paso 1: Agregar todos los cambios
Write-Host "1. Agregando cambios..." -ForegroundColor Yellow
git add .
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error al agregar cambios" -ForegroundColor Red
    exit 1
}

# Paso 2: Commit
Write-Host "2. Haciendo commit..." -ForegroundColor Yellow
git commit -m $CommitMessage
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error al hacer commit" -ForegroundColor Red
    exit 1
}

# Paso 3: Push a GitHub
Write-Host "3. Haciendo push a GitHub..." -ForegroundColor Yellow
git push origin main
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error al hacer push" -ForegroundColor Red
    exit 1
}

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "✅ DEPLOY INICIADO" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Green
Write-Host "El deploy en Vercel se iniciará automáticamente." -ForegroundColor Cyan
Write-Host "Puedes ver el progreso en: https://vercel.com/dashboard`n" -ForegroundColor Cyan

# Opcional: Ver estado de deployments
Write-Host "Verificando deployments..." -ForegroundColor Yellow
Start-Sleep -Seconds 3
vercel ls

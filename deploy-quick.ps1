# Script rápido para deploy en Vercel
# Uso: .\deploy-quick.ps1 "mensaje del commit"

param(
    [Parameter(Mandatory=$false)]
    [string]$mensaje = "Update"
)

Write-Host ""
Write-Host "🚀 DEPLOY RÁPIDO A VERCEL" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Git add, commit, push
Write-Host "📝 Haciendo commit..." -ForegroundColor Yellow
git add .
git commit -m $mensaje
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  No hay cambios para commitear" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "📤 Subiendo a GitHub..." -ForegroundColor Yellow
git push
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error al hacer push" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅ Cambios subidos a GitHub" -ForegroundColor Green
Write-Host ""
Write-Host "🔔 El webhook debería triggerar el deploy automáticamente" -ForegroundColor Cyan
Write-Host "   Ve a: https://vercel.com/juan-rissos-projects/upic/deployments" -ForegroundColor Gray
Write-Host ""
Write-Host "⏱️  Espera 3-5 minutos para que el deploy termine" -ForegroundColor Yellow
Write-Host ""



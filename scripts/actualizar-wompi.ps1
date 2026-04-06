# Script para actualizar credenciales de Wompi en .env
# Uso: .\scripts\actualizar-wompi.ps1

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host " Actualizador de Credenciales Wompi" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""

$envPath = ".env"

# Verificar que existe el archivo .env
if (-not (Test-Path $envPath)) {
    Write-Host "ERROR: No se encontro el archivo .env" -ForegroundColor Red
    Write-Host "Asegurate de estar en la raiz del proyecto (upic/)" -ForegroundColor Yellow
    exit 1
}

Write-Host "Leyendo archivo .env..." -ForegroundColor Cyan

# Leer contenido actual
$content = Get-Content $envPath -Raw

# Nuevas credenciales
$newPublicKey = "pub_test_hTtjwSkjkwrnXtGQ48Y3iwkMBJDMMjBb"
$newPrivateKey = "prv_test_eo1oEoziexIkUAueF8vZdHN76VaLbRpM"
$newWebhookSecret = "test_events_oDUjbkCQzuwUWKm8pfHe1VeqSEG2yL8R"
$newApiUrl = "https://sandbox.wompi.co/v1"

Write-Host ""
Write-Host "Actualizando credenciales de Wompi..." -ForegroundColor Cyan

# Reemplazar las líneas
$content = $content -replace 'NEXT_PUBLIC_WOMPI_PUBLIC_KEY=.*', "NEXT_PUBLIC_WOMPI_PUBLIC_KEY=$newPublicKey"
$content = $content -replace 'WOMPI_PRIVATE_KEY=.*', "WOMPI_PRIVATE_KEY=$newPrivateKey"
$content = $content -replace 'WOMPI_WEBHOOK_SECRET=.*', "WOMPI_WEBHOOK_SECRET=$newWebhookSecret"
$content = $content -replace 'WOMPI_API_URL=.*', "WOMPI_API_URL=$newApiUrl"

# Guardar cambios
$content | Set-Content $envPath -NoNewline

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host " ACTUALIZACION COMPLETADA" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Credenciales actualizadas:" -ForegroundColor Yellow
Write-Host "  Public Key: $newPublicKey" -ForegroundColor White
Write-Host "  Private Key: $newPrivateKey" -ForegroundColor White
Write-Host "  Webhook Secret: $newWebhookSecret" -ForegroundColor White
Write-Host "  API URL: $newApiUrl" -ForegroundColor White
Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host " PROXIMOS PASOS:" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "1. Reiniciar el servidor:" -ForegroundColor Cyan
Write-Host "   - Presiona Ctrl+C en la terminal del servidor" -ForegroundColor White
Write-Host "   - Ejecuta: pnpm dev" -ForegroundColor White
Write-Host ""
Write-Host "2. Probar la conexion:" -ForegroundColor Cyan
Write-Host "   node scripts/test-wompi.js" -ForegroundColor White
Write-Host ""
Write-Host "3. Hacer un pedido de prueba en:" -ForegroundColor Cyan
Write-Host "   http://localhost:3000" -ForegroundColor White
Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host ""



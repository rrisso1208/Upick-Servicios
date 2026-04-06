@echo off
echo.
echo ============================================
echo  Actualizador de Credenciales Wompi
echo ============================================
echo.
echo Este script te mostrara las lineas exactas
echo que debes copiar en tu archivo .env
echo.
echo ============================================
echo  COPIAR ESTAS 4 LINEAS EN TU .env:
echo ============================================
echo.
echo NEXT_PUBLIC_WOMPI_PUBLIC_KEY=pub_test_hTtjwSkjkwrnXtGQ48Y3iwkMBJDMMjBb
echo WOMPI_PRIVATE_KEY=prv_test_eo1oEoziexIkUAueF8vZdHN76VaLbRpM
echo WOMPI_WEBHOOK_SECRET=test_events_oDUjbkCQzuwUWKm8pfHe1VeqSEG2yL8R
echo WOMPI_API_URL=https://sandbox.wompi.co/v1
echo.
echo ============================================
echo  PASOS:
echo ============================================
echo.
echo 1. Abre el archivo .env en tu editor
echo 2. Busca la seccion de WOMPI
echo 3. Reemplaza las 4 lineas con las de arriba
echo 4. Guarda el archivo (Ctrl + S)
echo 5. Reinicia el servidor (Ctrl + C luego pnpm dev)
echo 6. Ejecuta: node scripts/test-wompi.js
echo.
echo ============================================
echo.
pause



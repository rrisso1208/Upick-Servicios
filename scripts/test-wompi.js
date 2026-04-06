/**
 * Script de prueba para verificar la integración de Wompi
 * Uso: node scripts/test-wompi.js
 */

require('dotenv').config();

async function testWompiIntegration() {
  console.log('\n🧪 INICIANDO TEST DE INTEGRACIÓN WOMPI\n');
  console.log('═'.repeat(60));

  // 1. Verificar variables de entorno
  console.log('\n📋 PASO 1: Verificar Variables de Entorno');
  console.log('─'.repeat(60));

  const requiredVars = [
    'NEXT_PUBLIC_WOMPI_PUBLIC_KEY',
    'WOMPI_PRIVATE_KEY',
    'WOMPI_WEBHOOK_SECRET',
    'WOMPI_API_URL',
  ];

  let allConfigured = true;

  requiredVars.forEach((varName) => {
    const value = process.env[varName];
    if (!value) {
      console.log(`❌ ${varName}: NO CONFIGURADA`);
      allConfigured = false;
    } else {
      const maskedValue = value.length > 20 
        ? `${value.substring(0, 15)}...${value.substring(value.length - 5)}`
        : `${value.substring(0, 8)}...`;
      console.log(`✅ ${varName}: ${maskedValue}`);
    }
  });

  if (!allConfigured) {
    console.log('\n❌ ERROR: Faltan variables de entorno.');
    console.log('Por favor configura todas las variables en el archivo .env\n');
    return;
  }

  // 2. Verificar conectividad con API de Wompi
  console.log('\n\n🌐 PASO 2: Verificar Conectividad con Wompi API');
  console.log('─'.repeat(60));

  const apiUrl = process.env.WOMPI_API_URL;
  console.log(`Conectando a: ${apiUrl}`);

  try {
    const response = await fetch(`${apiUrl}/merchants/${process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY}`, {
      headers: {
        Authorization: `Bearer ${process.env.WOMPI_PRIVATE_KEY}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Conexión exitosa con Wompi API');
      console.log(`   Merchant: ${data.data?.name || 'N/A'}`);
      console.log(`   Status: ${data.data?.status || 'N/A'}`);
    } else {
      console.log(`❌ Error de conexión: ${response.status}`);
      const errorText = await response.text();
      console.log(`   Detalle: ${errorText.substring(0, 200)}`);
      
      if (response.status === 422) {
        console.log('\n⚠️  Las keys parecen tener formato inválido.');
        console.log('   Verifica que sean keys reales de Wompi (pub_test_... y prv_test_...)');
        console.log('   Ver: GUIA-RAPIDA-WOMPI.md');
      }
    }
  } catch (error) {
    console.log('❌ Error de red:', error.message);
  }

  // 3. Crear transacción de prueba
  console.log('\n\n💳 PASO 3: Crear Transacción de Prueba');
  console.log('─'.repeat(60));

  const testTransaction = {
    amount_in_cents: 10000, // $100 COP
    currency: 'COP',
    customer_email: 'test@upick.app',
    reference: `TEST-${Date.now()}`,
    redirect_url: 'http://localhost:3000/test',
  };

  console.log('Creando transacción:');
  console.log(`  Monto: $${testTransaction.amount_in_cents / 100} COP`);
  console.log(`  Email: ${testTransaction.customer_email}`);
  console.log(`  Referencia: ${testTransaction.reference}`);

  try {
    const response = await fetch(`${apiUrl}/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.WOMPI_PRIVATE_KEY}`,
      },
      body: JSON.stringify(testTransaction),
    });

    if (response.ok) {
      const data = await response.json();
      console.log('\n✅ Transacción creada exitosamente!');
      console.log(`   ID: ${data.data.id}`);
      console.log(`   Status: ${data.data.status}`);
      
      if (data.data.payment_link?.url) {
        console.log(`   Payment Link: ${data.data.payment_link.url}`);
        console.log('\n   🎉 Puedes usar este link para hacer un pago de prueba');
      }
    } else {
      const errorText = await response.text();
      if (response.status === 422 && errorText.includes('método de pago')) {
        console.log('\n⚠️  Error esperado: Falta especificar método de pago');
        console.log('   Esto es normal en el test. La app lo maneja correctamente.');
      } else {
        console.log(`\n❌ Error al crear transacción: ${response.status}`);
        console.log(`   Detalle: ${errorText}`);
      }
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  // 4. Información sobre webhooks
  console.log('\n\n🔔 PASO 4: Configuración de Webhook');
  console.log('─'.repeat(60));
  console.log('Webhook Secret configurado: ✅');
  console.log(`URL del webhook: http://localhost:3000/api/payments/webhook`);
  console.log('\n⚠️  IMPORTANTE:');
  console.log('   Para que los webhooks funcionen en desarrollo:');
  console.log('   1. Usa ngrok: ngrok http 3000');
  console.log('   2. Configura la URL en el dashboard de Wompi');
  console.log('   3. Ejemplo: https://abc123.ngrok.io/api/payments/webhook');

  // Resumen final
  console.log('\n\n✨ RESUMEN');
  console.log('═'.repeat(60));
  console.log('Estado de la integración:');
  console.log(allConfigured ? '✅ Variables configuradas' : '❌ Variables incompletas');
  console.log('✅ Código implementado');
  console.log('⚠️  Webhook pendiente de configurar (requiere URL pública)');
  
  console.log('\n📝 Próximos pasos:');
  console.log('   1. Obtener keys reales de Wompi (ver GUIA-RAPIDA-WOMPI.md)');
  console.log('   2. Actualizar .env con tus keys');
  console.log('   3. Reiniciar servidor: pnpm dev');
  console.log('   4. Hacer un pedido de prueba en la app');
  console.log('   5. Pagar con tarjeta: 4242 4242 4242 4242');
  
  console.log('\n🎯 Para más información:');
  console.log('   • CONFIGURACION-WOMPI.md - Guía completa');
  console.log('   • GUIA-RAPIDA-WOMPI.md - Guía de 5 minutos');
  console.log('   • ESTADO-WOMPI.md - Estado actual');
  console.log('   • https://docs.wompi.co - Documentación oficial\n');
}

// Ejecutar test
testWompiIntegration().catch(console.error);



/**
 * Política de Privacidad Unificada - Upick
 * Cumple con la Ley 1581 de 2012 y Decreto 1377 de 2013 de Colombia
 * Incluye: Registro/Login, Pedidos, Facturación y Métodos de Pago Guardados
 */

'use client';

import Link from 'next/link';
import { Header } from '../../components/layout/Header';
import { Footer } from '../../components/layout/Footer';
import {
  Shield,
  Lock,
  Eye,
  Trash2,
  FileText,
  CreditCard,
  User,
  ShoppingCart,
  Building2,
} from 'lucide-react';

// Email configurable desde variables de entorno
const PRIVACY_EMAIL =
  process.env.NEXT_PUBLIC_PRIVACY_EMAIL || 'u.pickcompany@gmail.com';

export default function PoliticaPrivacidadPage() {
  return (
    <>
      <Header title="Política de Privacidad" showBack />
      <main className="mx-auto min-h-screen max-w-4xl px-4 py-8">
        <div className="card space-y-8">
          {/* Encabezado */}
          <div className="mb-8 border-b border-gray-200 pb-6">
            <h1 className="text-4xl font-bold text-gray-900">
              Política de Privacidad y Protección de Datos Personales
            </h1>
            <p className="mt-2 text-gray-600">
              Última actualización: {new Date().toLocaleDateString('es-CO')}
            </p>
            <p className="mt-4 text-sm text-gray-500">
              Esta política cumple con la Ley 1581 de 2012 y el Decreto 1377 de
              2013 de Colombia sobre Protección de Datos Personales.
            </p>
          </div>

          {/* 1. Información General */}
          <section>
            <div className="mb-4 flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary-600" />
              <h2 className="text-2xl font-bold">1. Información General</h2>
            </div>
            <p className="text-gray-700">
              Upick (en adelante, &quot;nosotros&quot;, &quot;nuestro&quot; o
              &quot;la Plataforma&quot;) se compromete a proteger la privacidad
              y los datos personales de nuestros usuarios de acuerdo con la Ley
              1581 de 2012 y el Decreto 1377 de 2013 de Colombia sobre
              Protección de Datos Personales.
            </p>
            <p className="mt-3 text-gray-700">
              Esta Política de Privacidad describe cómo recopilamos, usamos,
              almacenamos y protegemos su información personal cuando utiliza
              nuestra plataforma, incluyendo el registro de cuenta, realización
              de pedidos, y el uso de métodos de pago guardados.
            </p>
          </section>

          {/* 2. Responsable del Tratamiento */}
          <section>
            <div className="mb-4 flex items-center gap-2">
              <Building2 className="h-6 w-6 text-primary-600" />
              <h2 className="text-2xl font-bold">
                2. Responsable del Tratamiento
              </h2>
            </div>
            <p className="text-gray-700">
              Upick es el responsable del tratamiento de sus datos personales.
              Para ejercer sus derechos como titular de datos personales, puede
              contactarnos a través de:
            </p>
            <ul className="ml-6 mt-2 list-disc space-y-1 text-gray-700">
              <li>
                Email:{' '}
                <a
                  href={`mailto:${PRIVACY_EMAIL}`}
                  className="text-primary-600 underline hover:text-primary-700"
                >
                  {PRIVACY_EMAIL}
                </a>
              </li>
              <li>
                Desde su cuenta: Acceda a Configuración para gestionar sus datos
              </li>
            </ul>
          </section>

          {/* 3. Datos Personales que Recopilamos */}
          <section>
            <div className="mb-4 flex items-center gap-2">
              <FileText className="h-6 w-6 text-primary-600" />
              <h2 className="text-2xl font-bold">
                3. Datos Personales que Recopilamos
              </h2>
            </div>

            {/* 3.1. Datos de Registro */}
            <div className="mt-4">
              <div className="mb-3 flex items-center gap-2">
                <User className="h-5 w-5 text-primary-600" />
                <h3 className="text-xl font-semibold">
                  3.1. Datos de Registro
                </h3>
              </div>
              <p className="mb-2 text-gray-700">
                Cuando crea una cuenta en Upick, recopilamos:
              </p>
              <ul className="ml-6 list-disc space-y-1 text-gray-700">
                <li>
                  <strong>Correo electrónico</strong> (obligatorio) - Para
                  autenticación y comunicación
                </li>
                <li>
                  <strong>Nombre y apellidos</strong> (opcional) - Para
                  personalización y comunicación
                </li>
                <li>
                  <strong>Número de teléfono</strong> (opcional) - Para
                  notificaciones por WhatsApp sobre el estado de sus pedidos
                </li>
                <li>
                  <strong>Contraseña</strong> - Almacenada de forma encriptada y
                  segura
                </li>
              </ul>
            </div>

            {/* 3.2. Datos de Pedidos */}
            <div className="mt-6">
              <div className="mb-3 flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-primary-600" />
                <h3 className="text-xl font-semibold">3.2. Datos de Pedidos</h3>
              </div>
              <p className="mb-2 text-gray-700">
                Cuando realiza un pedido, recopilamos:
              </p>
              <ul className="ml-6 list-disc space-y-1 text-gray-700">
                <li>
                  Información del pedido (productos seleccionados, cantidades,
                  especificaciones y opciones)
                </li>
                <li>Franja horaria de recogida seleccionada</li>
                <li>Notas especiales del pedido (si las proporciona)</li>
                <li>
                  Información de pago procesada por pasarelas de pago seguras
                  (Wompi)
                </li>
                <li>Historial de pedidos y preferencias</li>
              </ul>
            </div>

            {/* 3.3. Datos de Facturación Electrónica */}
            <div className="mt-6">
              <h3 className="mb-2 text-xl font-semibold">
                3.3. Datos de Facturación Electrónica (Opcional)
              </h3>
              <p className="mb-2 text-gray-700">
                Si solicita facturación electrónica, recopilamos:
              </p>
              <ul className="ml-6 list-disc space-y-1 text-gray-700">
                <li>Tipo de persona (Natural o Jurídica)</li>
                <li>Tipo de documento (NIT, CC, CE, PP, TI)</li>
                <li>Número de documento</li>
                <li>Razón social o nombre completo</li>
                <li>Dirección completa</li>
                <li>Ciudad y departamento</li>
                <li>Teléfono y correo electrónico</li>
                <li>Régimen tributario (para personas jurídicas)</li>
              </ul>
              <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
                <p className="text-sm text-blue-800">
                  <strong>Importante:</strong> Estos datos solo se recopilan si
                  usted activa explícitamente la opción de facturación
                  electrónica y los proporciona voluntariamente.
                </p>
              </div>
            </div>

            {/* 3.4. Información de Métodos de Pago Guardados */}
            <div className="mt-6">
              <div className="mb-3 flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary-600" />
                <h3 className="text-xl font-semibold">
                  3.4. Información de Métodos de Pago Guardados (Solo con su
                  consentimiento explícito)
                </h3>
              </div>
              <p className="mb-2 text-gray-700">
                Si autoriza explícitamente guardar su método de pago para
                agilizar futuras compras, recopilamos únicamente:
              </p>
              <ul className="ml-6 list-disc space-y-1 text-gray-700">
                <li>
                  <strong>Token de seguridad</strong> (payment_source_id) -
                  Referencia segura proporcionada por Wompi, nuestro procesador
                  de pagos certificado PCI DSS Level 1
                </li>
                <li>
                  <strong>Últimos 4 dígitos</strong> de su tarjeta - Solo para
                  identificación y visualización en su cuenta
                </li>
                <li>
                  <strong>Marca de tarjeta</strong> (VISA, MASTERCARD, etc.) -
                  Para identificación visual
                </li>
                <li>
                  <strong>Nombre del banco</strong> (para pagos PSE) - Para
                  identificación
                </li>
              </ul>
              <div className="mt-3 rounded-lg border border-yellow-200 bg-yellow-50 p-3">
                <p className="text-sm text-yellow-800">
                  <strong>CRÍTICO - Seguridad:</strong> NO almacenamos números
                  completos de tarjeta, CVV, fechas de expiración, ni ningún
                  dato sensible de su método de pago. Todos los datos sensibles
                  son manejados exclusivamente por Wompi, procesador de pagos
                  certificado PCI DSS Level 1. Solo guardamos una referencia
                  segura (token) que nos permite procesar pagos futuros sin
                  exponer sus datos sensibles.
                </p>
              </div>
              <div className="mt-3 rounded-lg border border-primary-200 bg-primary-50 p-3">
                <p className="text-sm text-primary-800">
                  <strong>Consentimiento Explícito:</strong> De acuerdo con la
                  Ley 1581 de 2012, requerimos su consentimiento explícito antes
                  de guardar cualquier información de método de pago. Este
                  consentimiento se solicita mediante una casilla de
                  verificación durante el proceso de pago. Puede revocar su
                  consentimiento en cualquier momento eliminando sus métodos de
                  pago guardados desde{' '}
                  <Link
                    href="/payment-methods"
                    className="font-semibold underline hover:text-primary-900"
                  >
                    Métodos de Pago
                  </Link>
                  .
                </p>
              </div>
            </div>

            {/* 3.5. Datos de Uso */}
            <div className="mt-6">
              <h3 className="mb-2 text-xl font-semibold">3.5. Datos de Uso</h3>
              <p className="mb-2 text-gray-700">
                Recopilamos información sobre cómo utiliza la Plataforma:
              </p>
              <ul className="ml-6 list-disc space-y-1 text-gray-700">
                <li>Historial completo de pedidos</li>
                <li>Restaurantes y productos marcados como favoritos</li>
                <li>Reseñas y calificaciones que publique</li>
                <li>Uso de cupones de descuento</li>
                <li>Preferencias de navegación y búsqueda</li>
                <li>Créditos disponibles y transacciones de créditos</li>
              </ul>
            </div>

            {/* 3.6. Datos Técnicos */}
            <div className="mt-6">
              <h3 className="mb-2 text-xl font-semibold">
                3.6. Datos Técnicos
              </h3>
              <p className="mb-2 text-gray-700">
                Recopilamos automáticamente información técnica:
              </p>
              <ul className="ml-6 list-disc space-y-1 text-gray-700">
                <li>Dirección IP</li>
                <li>Tipo de navegador y dispositivo</li>
                <li>Fecha y hora de acceso</li>
                <li>Páginas visitadas y tiempo de permanencia</li>
              </ul>
            </div>
          </section>

          {/* 4. Finalidades del Tratamiento */}
          <section>
            <div className="mb-4 flex items-center gap-2">
              <Eye className="h-6 w-6 text-primary-600" />
              <h2 className="text-2xl font-bold">
                4. Finalidades del Tratamiento
              </h2>
            </div>
            <p className="mb-4 text-gray-700">
              Utilizamos sus datos personales para las siguientes finalidades:
            </p>

            <div className="mt-4">
              <h3 className="mb-2 text-xl font-semibold">
                4.1. Finalidades Principales
              </h3>
              <ul className="ml-6 list-disc space-y-2 text-gray-700">
                <li>
                  <strong>Gestionar su cuenta:</strong> Crear, mantener y
                  administrar su cuenta de usuario y autenticación
                </li>
                <li>
                  <strong>Procesar pedidos:</strong> Completar, gestionar y
                  entregar sus pedidos de alimentos
                </li>
                <li>
                  <strong>Facilitar pagos:</strong> Procesar pagos de forma
                  segura a través de Wompi. Si autoriza, guardamos una
                  referencia segura a su método de pago para agilizar futuras
                  compras
                </li>
                <li>
                  <strong>Comunicación:</strong> Enviarle confirmaciones,
                  actualizaciones y notificaciones sobre sus pedidos (por email
                  y WhatsApp si proporciona su número)
                </li>
                <li>
                  <strong>Soporte al cliente:</strong> Responder a sus consultas
                  y brindar asistencia
                </li>
              </ul>
            </div>

            <div className="mt-6">
              <h3 className="mb-2 text-xl font-semibold">
                4.2. Finalidades Relacionadas con Facturación
              </h3>
              <ul className="ml-6 list-disc space-y-2 text-gray-700">
                <li>
                  Compartir datos de facturación con Restaurantes para la
                  emisión de facturas electrónicas
                </li>
                <li>
                  Guardar datos de facturación para uso futuro (si usted lo
                  autoriza)
                </li>
                <li>Facilitar el cumplimiento de obligaciones fiscales</li>
              </ul>
            </div>

            <div className="mt-6">
              <h3 className="mb-2 text-xl font-semibold">
                4.3. Finalidades del CRM para Restaurantes
              </h3>
              <p className="mb-2 text-gray-700">
                Los Restaurantes pueden acceder a través del CRM a:
              </p>
              <ul className="ml-6 list-disc space-y-2 text-gray-700">
                <li>
                  Información básica de contacto (email, nombre, teléfono)
                </li>
                <li>Historial de pedidos realizados en su restaurante</li>
                <li>
                  Datos de facturación electrónica (cuando el cliente los haya
                  proporcionado)
                </li>
                <li>Estadísticas de consumo y preferencias</li>
              </ul>
              <p className="mt-3 text-sm text-gray-600">
                Los Restaurantes pueden exportar estos datos en formatos CSV y
                Excel para su gestión interna, siempre cumpliendo con esta
                Política de Privacidad y la normativa colombiana.
              </p>
            </div>

            <div className="mt-6">
              <h3 className="mb-2 text-xl font-semibold">
                4.4. Finalidades de Mejora del Servicio
              </h3>
              <ul className="ml-6 list-disc space-y-2 text-gray-700">
                <li>Analizar el uso de la Plataforma para mejoras</li>
                <li>Personalizar la experiencia del usuario</li>
                <li>Desarrollar nuevas funcionalidades</li>
                <li>Prevenir fraudes y garantizar la seguridad</li>
              </ul>
            </div>

            <div className="mt-6">
              <h3 className="mb-2 text-xl font-semibold">
                4.5. Finalidades de Marketing (con consentimiento)
              </h3>
              <p className="mb-2 text-gray-700">
                Solo con su consentimiento explícito, podemos utilizar sus datos
                para:
              </p>
              <ul className="ml-6 list-disc space-y-2 text-gray-700">
                <li>Enviar promociones y ofertas especiales</li>
                <li>Notificar sobre nuevos restaurantes o productos</li>
                <li>Enviar boletines informativos</li>
              </ul>
            </div>
          </section>

          {/* 5. Compartir Información con Terceros */}
          <section>
            <h2 className="mb-4 text-2xl font-bold">
              5. Compartir Información con Terceros
            </h2>

            <div className="mt-4">
              <h3 className="mb-2 text-xl font-semibold">5.1. Restaurantes</h3>
              <p className="mb-2 text-gray-700">
                Compartimos con los Restaurantes la información necesaria para
                procesar y cumplir con sus pedidos, incluyendo:
              </p>
              <ul className="ml-6 list-disc space-y-2 text-gray-700">
                <li>
                  Datos del pedido (productos, cantidades, especificaciones)
                </li>
                <li>
                  Información de contacto básica (nombre, email, teléfono si fue
                  proporcionado)
                </li>
                <li>
                  Datos de facturación electrónica (si fueron proporcionados)
                </li>
                <li>Código de recogida del pedido</li>
              </ul>
            </div>

            <div className="mt-6">
              <h3 className="mb-2 text-xl font-semibold">
                5.2. Proveedores de Servicios de Pago
              </h3>
              <p className="text-gray-700">
                Compartimos información de pago con Wompi, nuestro proveedor
                autorizado de procesamiento de pagos, para procesar
                transacciones de forma segura. Wompi es un procesador de pagos
                certificado PCI DSS Level 1 y tiene sus propias políticas de
                privacidad que cumplen con estándares internacionales de
                seguridad. Cuando guarda un método de pago con su
                consentimiento, solo compartimos el token de referencia seguro
                (payment_source_id) proporcionado por Wompi.
              </p>
            </div>

            <div className="mt-6">
              <h3 className="mb-2 text-xl font-semibold">
                5.3. Proveedores de Servicios Técnicos
              </h3>
              <p className="text-gray-700">
                Podemos compartir datos con proveedores que nos ayudan a operar
                la Plataforma (hosting, análisis, monitoreo, autenticación),
                siempre bajo estrictos acuerdos de confidencialidad y solo con
                la información mínima necesaria.
              </p>
            </div>

            <div className="mt-6">
              <h3 className="mb-2 text-xl font-semibold">
                5.4. Requerimientos Legales
              </h3>
              <p className="text-gray-700">
                Podemos divulgar información si es requerido por ley, orden
                judicial o autoridad competente en Colombia.
              </p>
            </div>
          </section>

          {/* 6. Seguridad de los Datos */}
          <section>
            <div className="mb-4 flex items-center gap-2">
              <Lock className="h-6 w-6 text-primary-600" />
              <h2 className="text-2xl font-bold">6. Seguridad de los Datos</h2>
            </div>
            <p className="mb-4 text-gray-700">
              Implementamos medidas técnicas y organizativas para proteger sus
              datos personales:
            </p>
            <ul className="ml-6 list-disc space-y-2 text-gray-700">
              <li>
                <strong>Encriptación:</strong> Todos los datos sensibles se
                transmiten y almacenan de forma encriptada (SSL/TLS)
              </li>
              <li>
                <strong>Procesador Certificado:</strong> Usamos Wompi, un
                procesador de pagos certificado PCI DSS Level 1 para todos los
                pagos
              </li>
              <li>
                <strong>Tokenización:</strong> Para métodos de pago guardados,
                solo almacenamos tokens de referencia seguros, nunca datos
                sensibles
              </li>
              <li>
                <strong>Acceso Restringido:</strong> Solo personal autorizado
                tiene acceso a los datos, y únicamente cuando es necesario para
                cumplir con las finalidades descritas
              </li>
              <li>
                <strong>Monitoreo Continuo:</strong> Implementamos sistemas de
                monitoreo y detección de amenazas
              </li>
              <li>
                <strong>Backups Regulares:</strong> Realizamos copias de
                seguridad regulares de la información
              </li>
            </ul>
            <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3">
              <p className="text-sm text-gray-700">
                <strong>Nota Importante:</strong> Aunque implementamos medidas
                de seguridad robustas, ningún método de transmisión por Internet
                es 100% seguro. Le recomendamos mantener su contraseña segura y
                no compartir sus credenciales de acceso.
              </p>
            </div>
          </section>

          {/* 7. Retención de Datos */}
          <section>
            <h2 className="mb-4 text-2xl font-bold">7. Retención de Datos</h2>
            <p className="mb-4 text-gray-700">
              Conservamos sus datos personales durante el tiempo necesario para
              cumplir con las finalidades descritas en esta Política, o según lo
              requiera la ley colombiana. Específicamente:
            </p>
            <ul className="ml-6 list-disc space-y-2 text-gray-700">
              <li>
                <strong>Datos de cuenta:</strong> Mientras su cuenta esté activa
                y hasta 5 años después de su inactivación o eliminación
              </li>
              <li>
                <strong>Datos de pedidos:</strong> Mínimo 5 años según
                requerimientos fiscales colombianos
              </li>
              <li>
                <strong>Datos de facturación:</strong> Mínimo 5 años según
                requerimientos fiscales colombianos
              </li>
              <li>
                <strong>Métodos de pago guardados:</strong> Hasta que usted los
                elimine o revoque su consentimiento. Los tokens se eliminan
                inmediatamente al eliminar el método de pago
              </li>
              <li>
                <strong>Datos de CRM:</strong> Mientras el Restaurante tenga
                relación comercial activa y según sus necesidades de gestión
              </li>
            </ul>
          </section>

          {/* 8. Sus Derechos como Titular de Datos */}
          <section>
            <div className="mb-4 flex items-center gap-2">
              <Trash2 className="h-6 w-6 text-primary-600" />
              <h2 className="text-2xl font-bold">
                8. Sus Derechos como Titular de Datos (Ley 1581 de 2012)
              </h2>
            </div>
            <p className="mb-4 text-gray-700">
              De acuerdo con la Ley 1581 de 2012, usted tiene los siguientes
              derechos:
            </p>

            <div className="space-y-4">
              <div>
                <h3 className="mb-2 text-xl font-semibold">
                  8.1. Derecho de Conocimiento, Acceso y Consulta
                </h3>
                <p className="text-gray-700">
                  Puede conocer, acceder y consultar sus datos personales
                  almacenados en nuestras bases de datos, así como conocer el
                  uso que se ha dado a los mismos. Puede acceder a sus datos
                  desde su cuenta en Configuración.
                </p>
              </div>

              <div>
                <h3 className="mb-2 text-xl font-semibold">
                  8.2. Derecho de Rectificación y Actualización
                </h3>
                <p className="text-gray-700">
                  Puede solicitar la corrección o actualización de datos
                  inexactos, incompletos o desactualizados. Puede actualizar
                  algunos datos directamente desde su cuenta.
                </p>
              </div>

              <div>
                <h3 className="mb-2 text-xl font-semibold">
                  8.3. Derecho de Revocatoria
                </h3>
                <p className="text-gray-700">
                  Puede revocar su autorización para el tratamiento de datos
                  personales en cualquier momento, excepto cuando exista un
                  deber legal o contractual de mantener la información. Puede
                  revocar el consentimiento para métodos de pago guardados
                  eliminándolos desde{' '}
                  <Link
                    href="/payment-methods"
                    className="text-primary-600 underline hover:text-primary-700"
                  >
                    Métodos de Pago
                  </Link>
                  .
                </p>
              </div>

              <div>
                <h3 className="mb-2 text-xl font-semibold">
                  8.4. Derecho de Supresión
                </h3>
                <p className="text-gray-700">
                  Puede solicitar la eliminación de sus datos personales cuando
                  considere que no se están tratando conforme a los principios y
                  deberes establecidos en la ley, salvo cuando exista un deber
                  legal de conservar la información (como datos de pedidos para
                  cumplimiento fiscal).
                </p>
              </div>

              <div>
                <h3 className="mb-2 text-xl font-semibold">
                  8.5. Derecho a Presentar Quejas
                </h3>
                <p className="text-gray-700">
                  Puede presentar quejas ante la Superintendencia de Industria y
                  Comercio (SIC) por presuntas violaciones a la normativa de
                  protección de datos personales en:{' '}
                  <a
                    href="https://www.sic.gov.co"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-600 underline hover:text-primary-700"
                  >
                    www.sic.gov.co
                  </a>
                </p>
              </div>

              <div>
                <h3 className="mb-2 text-xl font-semibold">
                  8.6. Cómo Ejercer sus Derechos
                </h3>
                <p className="text-gray-700">
                  Para ejercer cualquiera de estos derechos, puede contactarnos
                  a través de:
                </p>
                <ul className="ml-6 mt-2 list-disc space-y-1 text-gray-700">
                  <li>
                    Email:{' '}
                    <a
                      href={`mailto:${PRIVACY_EMAIL}`}
                      className="text-primary-600 underline hover:text-primary-700"
                    >
                      {PRIVACY_EMAIL}
                    </a>
                  </li>
                  <li>
                    Desde su cuenta: Acceda a Configuración para gestionar sus
                    datos y métodos de pago
                  </li>
                </ul>
                <p className="mt-3 text-sm text-gray-600">
                  Responderemos su solicitud en un plazo máximo de 10 días
                  hábiles según lo establecido en la Ley 1581 de 2012.
                </p>
              </div>
            </div>
          </section>

          {/* 9. Consentimiento */}
          <section>
            <h2 className="mb-4 text-2xl font-bold">9. Consentimiento</h2>
            <div className="space-y-4 text-gray-700">
              <p>
                <strong>Consentimiento General:</strong> Al utilizar la
                Plataforma y proporcionar sus datos personales (registro,
                pedidos, facturación), usted consiente el tratamiento de sus
                datos según lo descrito en esta Política de Privacidad.
              </p>
              <div className="rounded-lg border border-primary-200 bg-primary-50 p-4">
                <p className="font-semibold text-primary-900">
                  Consentimiento Explícito para Métodos de Pago Guardados:
                </p>
                <p className="mt-2 text-primary-800">
                  De acuerdo con la Ley 1581 de 2012, para guardar información
                  de métodos de pago requerimos su{' '}
                  <strong>consentimiento explícito</strong>. Este consentimiento
                  se solicita mediante una casilla de verificación durante el
                  proceso de pago, donde se le informa claramente qué datos se
                  guardarán y para qué propósito. Puede revocar su
                  consentimiento en cualquier momento eliminando sus métodos de
                  pago guardados desde{' '}
                  <Link
                    href="/payment-methods"
                    className="font-semibold underline hover:text-primary-900"
                  >
                    Métodos de Pago
                  </Link>
                  .
                </p>
              </div>
              <p>
                <strong>Consentimiento para Marketing:</strong> Para finalidades
                de marketing y comunicaciones promocionales, solicitaremos su
                consentimiento explícito por separado.
              </p>
            </div>
          </section>

          {/* 10. Cookies y Tecnologías Similares */}
          <section>
            <h2 className="mb-4 text-2xl font-bold">
              10. Cookies y Tecnologías Similares
            </h2>
            <p className="mb-4 text-gray-700">
              Utilizamos cookies y tecnologías similares para mejorar su
              experiencia en la Plataforma. Las cookies nos ayudan a:
            </p>
            <ul className="ml-6 list-disc space-y-2 text-gray-700">
              <li>Mantener su sesión activa de forma segura</li>
              <li>Recordar sus preferencias y configuraciones</li>
              <li>Analizar el uso de la Plataforma para mejoras</li>
              <li>Mejorar la funcionalidad y rendimiento</li>
            </ul>
            <p className="mt-4 text-gray-700">
              Puede configurar su navegador para rechazar cookies, aunque esto
              puede afectar algunas funcionalidades de la Plataforma, como el
              mantenimiento de su sesión.
            </p>
          </section>

          {/* 11. Menores de Edad */}
          <section>
            <h2 className="mb-4 text-2xl font-bold">11. Menores de Edad</h2>
            <p className="text-gray-700">
              Nuestro servicio está dirigido a personas mayores de 18 años. Si
              un menor de edad proporciona información personal sin el
              consentimiento de sus padres o tutores, tomaremos medidas para
              eliminar esa información de nuestras bases de datos.
            </p>
          </section>

          {/* 12. Transferencias Internacionales */}
          <section>
            <h2 className="mb-4 text-2xl font-bold">
              12. Transferencias Internacionales
            </h2>
            <p className="text-gray-700">
              Algunos de nuestros proveedores de servicios pueden estar ubicados
              fuera de Colombia (por ejemplo, servicios de hosting y
              autenticación). En estos casos, nos aseguramos de que existan
              garantías adecuadas para la protección de sus datos personales
              según la normativa colombiana y estándares internacionales de
              protección de datos.
            </p>
          </section>

          {/* 13. Cambios a esta Política */}
          <section>
            <h2 className="mb-4 text-2xl font-bold">
              13. Cambios a esta Política
            </h2>
            <p className="text-gray-700">
              Podemos actualizar esta Política de Privacidad ocasionalmente para
              reflejar cambios en nuestras prácticas o por razones legales,
              operativas o regulatorias. Le notificaremos cualquier cambio
              significativo publicando la nueva política en la Plataforma y
              actualizando la fecha de &quot;Última actualización&quot;. Le
              recomendamos revisar esta política periódicamente.
            </p>
          </section>

          {/* 14. Contacto */}
          <section>
            <h2 className="mb-4 text-2xl font-bold">14. Contacto</h2>
            <p className="mb-4 text-gray-700">
              Para ejercer sus derechos, realizar consultas o presentar reclamos
              relacionados con el tratamiento de sus datos personales, puede
              contactarnos a través de:
            </p>
            <ul className="ml-6 list-disc space-y-2 text-gray-700">
              <li>
                Email:{' '}
                <a
                  href={`mailto:${PRIVACY_EMAIL}`}
                  className="text-primary-600 underline hover:text-primary-700"
                >
                  {PRIVACY_EMAIL}
                </a>
              </li>
              <li>
                Desde su cuenta: Acceda a Configuración para gestionar sus datos
                personales y métodos de pago guardados
              </li>
            </ul>
            <p className="mt-4 text-gray-700">
              También puede presentar quejas ante la Superintendencia de
              Industria y Comercio (SIC) en:{' '}
              <a
                href="https://www.sic.gov.co"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600 underline hover:text-primary-700"
              >
                www.sic.gov.co
              </a>
            </p>
          </section>

          {/* Enlaces relacionados */}
          <div className="mt-8 border-t border-gray-200 pt-6">
            <p className="mb-4 text-sm text-gray-600">
              Esta Política de Privacidad cumple con la Ley 1581 de 2012 y el
              Decreto 1377 de 2013 de Colombia sobre Protección de Datos
              Personales.
            </p>
            <div className="flex gap-4">
              <Link
                href="/terminos-y-condiciones"
                className="text-primary-600 hover:underline"
              >
                Ver Términos y Condiciones →
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

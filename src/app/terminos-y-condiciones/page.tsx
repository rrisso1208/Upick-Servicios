/**
 * Términos y Condiciones - Upick
 * Cumple con la legislación colombiana
 */

import { Header } from '../../components/layout/Header';
import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Términos y Condiciones - Upick',
  description: 'Términos y condiciones de uso de la plataforma Upick',
};

export default function TerminosYCondicionesPage() {
  return (
    <>
      <Header title="Términos y Condiciones" showBack />
      <main className="mx-auto min-h-screen max-w-4xl px-4 py-8">
        <div className="card prose prose-lg max-w-none">
          <h1 className="text-3xl font-bold">Términos y Condiciones de Uso</h1>
          <p className="text-gray-600">
            Última actualización: {new Date().toLocaleDateString('es-CO')}
          </p>

          <section className="mt-8">
            <h2 className="text-2xl font-semibold">
              1. Aceptación de los Términos
            </h2>
            <p>
              Al acceder y utilizar la plataforma Upick (en adelante, &quot;la
              Plataforma&quot; o &quot;el Servicio&quot;), usted acepta estar
              sujeto a estos Términos y Condiciones de Uso. Si no está de
              acuerdo con alguna parte de estos términos, no debe utilizar
              nuestro servicio.
            </p>
            <p>
              Upick es una plataforma digital que permite a los usuarios
              realizar pedidos anticipados de alimentos y bebidas a restaurantes
              ubicados en lugares específicos (universidades, centros
              comerciales, etc.), facilitando la gestión de pedidos y pagos en
              línea.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-semibold">2. Definiciones</h2>
            <ul className="list-disc pl-6">
              <li>
                <strong>Usuario:</strong> Persona natural o jurídica que utiliza
                la Plataforma.
              </li>
              <li>
                <strong>Cliente/Estudiante:</strong> Usuario que realiza pedidos
                a través de la Plataforma.
              </li>
              <li>
                <strong>Restaurante:</strong> Establecimiento comercial que
                ofrece productos alimenticios a través de la Plataforma.
              </li>
              <li>
                <strong>Pedido:</strong> Solicitud de productos realizada por un
                Cliente a un Restaurante.
              </li>
              <li>
                <strong>Facturación Electrónica:</strong> Servicio opcional que
                permite al Cliente solicitar factura electrónica para sus
                pedidos.
              </li>
              <li>
                <strong>CRM:</strong> Sistema de gestión de relaciones con
                clientes utilizado por los Restaurantes.
              </li>
            </ul>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-semibold">
              3. Registro y Cuenta de Usuario
            </h2>
            <h3 className="mt-4 text-xl font-semibold">
              3.1. Requisitos para el Registro
            </h3>
            <p>
              Para utilizar la Plataforma, debe crear una cuenta proporcionando
              información veraz, exacta y completa. Usted se compromete a:
            </p>
            <ul className="list-disc pl-6">
              <li>Proporcionar información precisa y actualizada.</li>
              <li>Mantener la seguridad de su cuenta y contraseña.</li>
              <li>
                Notificar inmediatamente cualquier uso no autorizado de su
                cuenta.
              </li>
              <li>
                Ser responsable de todas las actividades que ocurran bajo su
                cuenta.
              </li>
            </ul>

            <h3 className="mt-4 text-xl font-semibold">
              3.2. Tipos de Usuario
            </h3>
            <p>La Plataforma distingue tres tipos de usuarios:</p>
            <ul className="list-disc pl-6">
              <li>
                <strong>Estudiante/Cliente:</strong> Puede realizar pedidos,
                gestionar su perfil y acceder a su historial.
              </li>
              <li>
                <strong>Administrador de Restaurante:</strong> Puede gestionar
                el menú, pedidos, CRM y configuraciones del restaurante.
              </li>
              <li>
                <strong>Superadministrador:</strong> Gestiona la plataforma en
                su totalidad, incluyendo lugares, restaurantes y políticas del
                sistema.
              </li>
            </ul>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-semibold">4. Uso del Servicio</h2>
            <h3 className="mt-4 text-xl font-semibold">
              4.1. Funcionalidades para Clientes
            </h3>
            <p>Los clientes pueden:</p>
            <ul className="list-disc pl-6">
              <li>
                Explorar restaurantes disponibles en su lugar (universidad,
                centro comercial, etc.).
              </li>
              <li>Ver menús, productos, precios y disponibilidad.</li>
              <li>
                Realizar pedidos anticipados seleccionando productos y franjas
                horarias de recogida.
              </li>
              <li>Gestionar su carrito de compras.</li>
              <li>
                Solicitar facturación electrónica opcional para sus pedidos.
              </li>
              <li>
                Realizar pagos seguros a través de pasarelas de pago integradas
                (Wompi).
              </li>
              <li>Calificar y reseñar productos y restaurantes.</li>
              <li>Utilizar cupones de descuento cuando estén disponibles.</li>
              <li>Acceder a su historial de pedidos.</li>
            </ul>

            <h3 className="mt-4 text-xl font-semibold">
              4.2. Funcionalidades para Restaurantes
            </h3>
            <p>Los restaurantes pueden:</p>
            <ul className="list-disc pl-6">
              <li>Gestionar su menú, categorías y productos.</li>
              <li>Configurar precios, promociones y disponibilidad.</li>
              <li>Gestionar pedidos en tiempo real.</li>
              <li>Utilizar el CRM para gestionar relaciones con clientes.</li>
              <li>
                Acceder a datos de facturación electrónica cuando los clientes
                la soliciten.
              </li>
              <li>Exportar datos del CRM en formatos CSV y Excel.</li>
              <li>Gestionar capacidad de producción y sobre pedidos.</li>
              <li>
                Configurar categorías de comida y especificaciones de productos.
              </li>
            </ul>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-semibold">5. Pedidos y Pagos</h2>
            <h3 className="mt-4 text-xl font-semibold">
              5.1. Proceso de Pedido
            </h3>
            <p>
              Al realizar un pedido, el Cliente selecciona productos,
              especificaciones, franja horaria de recogida y método de pago. El
              pedido queda confirmado una vez que el pago sea aprobado por la
              pasarela de pago.
            </p>

            <h3 className="mt-4 text-xl font-semibold">5.2. Métodos de Pago</h3>
            <p>
              La Plataforma acepta pagos mediante tarjeta de crédito/débito y
              PSE (Pagos Seguros en Línea) a través de Wompi. Los pagos se
              procesan de forma segura y encriptada.
            </p>

            <h3 className="mt-4 text-xl font-semibold">
              5.3. Precios y Disponibilidad
            </h3>
            <p>
              Los precios mostrados en la Plataforma son establecidos por cada
              Restaurante y pueden variar. Upick no garantiza la disponibilidad
              de productos y se reserva el derecho de cancelar pedidos si un
              producto no está disponible.
            </p>

            <h3 className="mt-4 text-xl font-semibold">
              5.4. Cancelaciones y Reembolsos
            </h3>
            <p>
              Las políticas de cancelación y reembolso son establecidas por cada
              Restaurante. Los reembolsos, cuando apliquen, se procesarán según
              las políticas del Restaurante y las condiciones de la pasarela de
              pago.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-semibold">
              6. Facturación Electrónica
            </h2>
            <p>
              Los Clientes pueden solicitar facturación electrónica de forma
              opcional al realizar un pedido. Al activar esta opción:
            </p>
            <ul className="list-disc pl-6">
              <li>
                Debe proporcionar los datos requeridos según la normativa
                colombiana.
              </li>
              <li>
                Los datos de facturación se guardan para uso futuro si así lo
                autoriza.
              </li>
              <li>
                Los datos de facturación se comparten con el Restaurante para la
                emisión de la factura.
              </li>
              <li>
                El Restaurante es responsable de emitir la factura electrónica
                según la normativa vigente.
              </li>
            </ul>
            <p>
              Upick actúa como intermediario facilitando la información
              necesaria, pero no emite las facturas electrónicas directamente.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-semibold">
              7. Sistema CRM y Datos de Clientes
            </h2>
            <p>
              Los Restaurantes tienen acceso a un sistema CRM que les permite:
            </p>
            <ul className="list-disc pl-6">
              <li>
                Gestionar información de clientes y su historial de pedidos.
              </li>
              <li>
                Acceder a datos de facturación electrónica cuando el cliente los
                haya proporcionado.
              </li>
              <li>
                Exportar datos en formatos CSV y Excel para su gestión interna.
              </li>
            </ul>
            <p>
              El uso de estos datos por parte de los Restaurantes debe cumplir
              con la Ley 1581 de 2012 y el Decreto 1377 de 2013 sobre protección
              de datos personales en Colombia.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-semibold">8. Propiedad Intelectual</h2>
            <p>
              Todo el contenido de la Plataforma, incluyendo pero no limitado a
              textos, gráficos, logos, iconos, imágenes, compilaciones de datos
              y software, es propiedad de Upick o sus proveedores de contenido y
              está protegido por las leyes de propiedad intelectual de Colombia
              e internacionales.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-semibold">
              9. Limitación de Responsabilidad
            </h2>
            <p>
              Upick actúa como intermediario entre Clientes y Restaurantes. No
              somos responsables de:
            </p>
            <ul className="list-disc pl-6">
              <li>
                La calidad, seguridad o legalidad de los productos ofrecidos por
                los Restaurantes.
              </li>
              <li>
                La exactitud de la información proporcionada por los
                Restaurantes.
              </li>
              <li>
                El cumplimiento de las obligaciones contractuales entre Clientes
                y Restaurantes.
              </li>
              <li>
                La emisión correcta de facturas electrónicas por parte de los
                Restaurantes.
              </li>
              <li>
                Problemas técnicos o interrupciones del servicio fuera de
                nuestro control.
              </li>
            </ul>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-semibold">
              10. Modificaciones del Servicio
            </h2>
            <p>
              Upick se reserva el derecho de modificar, suspender o discontinuar
              cualquier aspecto del Servicio en cualquier momento, con o sin
              previo aviso. Las modificaciones a estos Términos serán
              notificadas a través de la Plataforma.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-semibold">11. Terminación</h2>
            <p>
              Upick puede terminar o suspender su acceso al Servicio
              inmediatamente, sin previo aviso, por cualquier motivo, incluyendo
              pero no limitado a violación de estos Términos.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-semibold">
              12. Ley Aplicable y Jurisdicción
            </h2>
            <p>
              Estos Términos se rigen por las leyes de la República de Colombia.
              Cualquier disputa relacionada con estos Términos será resuelta en
              los tribunales competentes de Colombia.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-semibold">13. Contacto</h2>
            <p>
              Para cualquier consulta sobre estos Términos y Condiciones, puede
              contactarnos a través de los canales de comunicación
              proporcionados en la Plataforma.
            </p>
          </section>

          <div className="mt-8 border-t pt-6">
            <p className="text-sm text-gray-600">
              Al utilizar Upick, usted confirma que ha leído, entendido y acepta
              estos Términos y Condiciones.
            </p>
            <div className="mt-4">
              <Link
                href="/politica-privacidad"
                className="text-primary-600 hover:underline"
              >
                Ver Política de Privacidad →
              </Link>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

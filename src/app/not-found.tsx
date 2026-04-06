/**
 * 404 Not Found page with Picku
 */

import Link from 'next/link';
import { Header } from '../components/layout/Header';
import { PickuMascot } from '../components/ui/PickuMascot';

export default function NotFound() {
  return (
    <>
      <Header title="Upick" />
      <main className="mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center px-4 py-12">
        <PickuMascot
          variant="thinking"
          size="xl"
          showText
          text="¡Ups! Página no encontrada"
        />
        <div className="mt-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900">404</h1>
          <p className="mt-4 text-lg text-gray-600">
            Lo sentimos, la página que buscas no existe o fue movida.
          </p>
          <Link href="/" className="btn-primary mt-8 inline-block">
            Volver al inicio
          </Link>
        </div>
      </main>
    </>
  );
}

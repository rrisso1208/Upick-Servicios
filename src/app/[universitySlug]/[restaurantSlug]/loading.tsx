/**
 * Loading state for menu page
 */

import { Header } from '../../../components/layout/Header';
import { Loader2 } from 'lucide-react';

export default function Loading() {
  return (
    <>
      <Header showBack />
      <main className="mx-auto min-h-screen max-w-7xl px-4 py-8">
        <div className="mb-8">
          <div className="h-8 w-64 animate-pulse rounded bg-gray-200" />
          <div className="mt-2 h-4 w-96 animate-pulse rounded bg-gray-200" />
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-48 w-full rounded-lg bg-gray-200" />
              <div className="mt-4 h-6 w-3/4 rounded bg-gray-200" />
              <div className="mt-2 h-4 w-full rounded bg-gray-200" />
              <div className="mt-4 flex items-center justify-between">
                <div className="h-6 w-20 rounded bg-gray-200" />
                <div className="h-10 w-24 rounded bg-gray-200" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}



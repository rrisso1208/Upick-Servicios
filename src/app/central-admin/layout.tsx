/**
 * Layout for Central Admin section
 */

'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Header } from '../../components/layout/Header';
import {
  LayoutDashboard,
  Package,
  BarChart3,
} from 'lucide-react';

export default function CentralAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const navItems = [
    {
      href: '/central-admin/dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      href: '/central-admin/products',
      label: 'Menú Maestro',
      icon: Package,
    },
  ];

  return (
    <>
      <Header />
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="w-64 border-r border-gray-200 bg-white">
          <nav className="p-4">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900">
                Panel Central
              </h2>
            </div>
            <ul className="space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-primary-50 text-primary-700'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1">{children}</main>
      </div>
    </>
  );
}


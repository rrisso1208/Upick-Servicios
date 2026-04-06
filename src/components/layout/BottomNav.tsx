
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ShoppingBag, User } from 'lucide-react';

export function BottomNav() {
    const pathname = usePathname();

    // Hide on specific pages if needed (e.g., checkout)
    if (pathname === '/admin/orders/widget') return null;
    // if (pathname.includes('/checkout')) return null;

    const isActive = (path: string) => {
        if (path === '/' && pathname === '/') return true;
        if (path !== '/' && pathname.startsWith(path)) return true;
        return false;
    };

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 block border-t border-gray-200 bg-white pb-safe pt-2 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] md:hidden">
            <div className="flex items-center justify-around px-2 pb-2">
                <Link
                    href="/"
                    className={`flex flex-col items-center gap-1 p-2 transition-colors ${isActive('/') ? 'text-primary-600' : 'text-gray-500 hover:text-gray-900'
                        }`}
                >
                    <Home className={`h-6 w-6 ${isActive('/') ? 'fill-current' : ''}`} />
                    <span className="text-[10px] font-medium">Inicio</span>
                </Link>

                <Link
                    href="/orders"
                    className={`flex flex-col items-center gap-1 p-2 transition-colors ${isActive('/orders') ? 'text-primary-600' : 'text-gray-500 hover:text-gray-900'
                        }`}
                >
                    <ShoppingBag className={`h-6 w-6 ${isActive('/orders') ? 'fill-current' : ''}`} />
                    <span className="text-[10px] font-medium">Pedidos</span>
                </Link>

                <Link
                    href="/settings"
                    className={`flex flex-col items-center gap-1 p-2 transition-colors ${isActive('/settings') ? 'text-primary-600' : 'text-gray-500 hover:text-gray-900'
                        }`}
                >
                    <User className={`h-6 w-6 ${isActive('/settings') ? 'fill-current' : ''}`} />
                    <span className="text-[10px] font-medium">Perfil</span>
                </Link>
            </div>
        </nav>
    );
}

'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../providers/AuthProvider';
import { QRScannerModal } from './QRScannerModal';
import { QrCode } from 'lucide-react';

export function QRScannerButton() {
    const { user, userRole } = useAuth();
    const pathname = usePathname();
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Only show for restaurant admins and on admin pages
    if (!user || userRole !== 'restaurant_admin' || !pathname?.startsWith('/admin')) {
        return null;
    }

    // Hide on the scan page itself
    if (pathname === '/admin/scan') {
        return null;
    }

    return (
        <>
            {/* Floating QR Scanner Button */}
            <button
                onClick={() => setIsModalOpen(true)}
                className="fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary-600 shadow-lg transition-all hover:scale-110 hover:bg-primary-700 active:scale-95 md:bottom-24 md:right-6"
                title="Escanear QR de entrega"
                aria-label="Escanear QR de entrega"
            >
                <QrCode className="h-6 w-6 text-white" />
            </button>

            {/* QR Scanner Modal */}
            <QRScannerModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={() => {
                    // Optionally refresh data or show success message
                    setIsModalOpen(false);
                }}
            />
        </>
    );
}


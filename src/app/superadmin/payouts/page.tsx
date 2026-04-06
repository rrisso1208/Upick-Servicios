
/**
 * Superadmin - Payouts & Invoices
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '../../../components/layout/Header';
import { useAuth, supabase } from '../../../providers/AuthProvider';
import {
    DollarSign,
    Calendar,
    Filter,
    Download,
    Loader2,
    FileText,
    CheckCircle,
    AlertCircle,
    Plus,
    X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { generateInvoicePDF } from '../../../lib/invoice-generator';

interface PayoutCycle {
    id: string;
    restaurantId: string;
    restaurant: {
        name: string;
        slug: string;
    };
    periodStart: string;
    periodEnd: string;
    status: 'open' | 'closed' | 'invoiced' | 'paid';
    grossSales: number;
    commissionTotal: number;
    netToRestaurant: number;
    invoices: Array<{
        id: string;
        number: string;
        status: string;
        pdfUrl: string | null;
    }>;
}

export default function PayoutsPage() {
    const router = useRouter();
    const { user, userRole, loading: authLoading } = useAuth();
    const [payouts, setPayouts] = useState<PayoutCycle[]>([]);
    const [loading, setLoading] = useState(true);
    const [restaurants, setRestaurants] = useState<Array<{ id: string; name: string }>>([]);
    const [selectedRestaurantId, setSelectedRestaurantId] = useState<string>('');
    const [statusFilter, setStatusFilter] = useState<string>('all');

    // Modal states
    const [showCloseModal, setShowCloseModal] = useState(false);
    const [closeFormData, setCloseFormData] = useState({
        restaurantId: '',
        periodStart: '',
        periodEnd: '',
    });
    const [closing, setClosing] = useState(false);

    const [showInvoiceModal, setShowInvoiceModal] = useState(false);
    const [selectedPayout, setSelectedPayout] = useState<PayoutCycle | null>(null);
    const [invoiceFormData, setInvoiceFormData] = useState({
        number: '',
        dueDate: '',
        notes: '',
    });
    const [generating, setGenerating] = useState(false);

    useEffect(() => {
        if (!authLoading) {
            if (!user || userRole !== 'superadmin') {
                router.push('/');
                return;
            }
            fetchRestaurants();
            fetchPayouts();
        }
    }, [user, userRole, authLoading, router]);

    useEffect(() => {
        if (userRole === 'superadmin') {
            fetchPayouts();
        }
    }, [selectedRestaurantId, statusFilter]);

    const fetchRestaurants = async () => {
        try {
            const response = await fetch('/api/superadmin/restaurants');
            const result = await response.json();
            if (result.success) {
                setRestaurants(result.data.restaurants.map((r: any) => ({ id: r.id, name: r.name })));
            }
        } catch (error) {
            console.error('Failed to fetch restaurants:', error);
        }
    };

    const fetchPayouts = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (selectedRestaurantId) params.append('restaurantId', selectedRestaurantId);
            if (statusFilter !== 'all') params.append('status', statusFilter);

            const response = await fetch(`/api/superadmin/payouts?${params.toString()}`);
            const result = await response.json();
            if (result.success) {
                setPayouts(result.data.payouts);
            }
        } catch (error) {
            console.error('Failed to fetch payouts:', error);
            toast.error('Error al cargar liquidaciones');
        } finally {
            setLoading(false);
        }
    };

    const handleClosePeriod = async (e: React.FormEvent) => {
        e.preventDefault();
        setClosing(true);
        try {
            const response = await fetch('/api/superadmin/payouts/close', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(closeFormData),
            });

            const result = await response.json();
            if (result.success) {
                toast.success('Periodo cerrado exitosamente');
                setShowCloseModal(false);
                fetchPayouts();
            } else {
                toast.error(result.error || 'Error al cerrar periodo');
            }
        } catch (error) {
            console.error('Error closing period:', error);
            toast.error('Error al cerrar periodo');
        } finally {
            setClosing(false);
        }
    };

    const handleGenerateInvoice = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPayout) return;
        setGenerating(true);

        try {
            // 1. Generate PDF Blob
            const invoiceData = {
                number: invoiceFormData.number,
                issueDate: new Date().toLocaleDateString('es-CO'),
                dueDate: new Date(invoiceFormData.dueDate).toLocaleDateString('es-CO'),
                restaurantName: selectedPayout.restaurant.name,
                restaurantNit: '900.000.000-0', // Placeholder
                restaurantAddress: 'Dirección Restaurante', // Placeholder
                periodStart: new Date(selectedPayout.periodStart).toLocaleDateString('es-CO'),
                periodEnd: new Date(selectedPayout.periodEnd).toLocaleDateString('es-CO'),
                items: [
                    {
                        description: `Comisión UPICK (${new Date(selectedPayout.periodStart).toLocaleDateString('es-CO')} - ${new Date(selectedPayout.periodEnd).toLocaleDateString('es-CO')})`,
                        amount: selectedPayout.commissionTotal / 100,
                    },
                ],
                subtotal: selectedPayout.commissionTotal / 100,
                tax: (selectedPayout.commissionTotal / 100) * 0.19,
                total: (selectedPayout.commissionTotal / 100) * 1.19,
            };

            const pdfBlob = await generateInvoicePDF(invoiceData);

            // 2. Upload to Supabase Storage
            const fileName = `invoices/${invoiceFormData.number}.pdf`;
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('documents') // Assuming a 'documents' bucket exists
                .upload(fileName, pdfBlob, {
                    contentType: 'application/pdf',
                    upsert: true,
                });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('documents')
                .getPublicUrl(fileName);

            // 3. Save Invoice Record
            const response = await fetch('/api/superadmin/invoices/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    payoutCycleId: selectedPayout.id,
                    number: invoiceFormData.number,
                    amount: Math.round(invoiceData.total * 100), // Store in cents
                    dueDate: invoiceFormData.dueDate,
                    pdfUrl: publicUrl,
                    notes: invoiceFormData.notes,
                }),
            });

            const result = await response.json();
            if (result.success) {
                toast.success('Factura generada exitosamente');
                setShowInvoiceModal(false);
                fetchPayouts();
            } else {
                toast.error(result.error || 'Error al guardar factura');
            }

        } catch (error) {
            console.error('Error generating invoice:', error);
            toast.error('Error al generar factura');
        } finally {
            setGenerating(false);
        }
    };

    if (authLoading || userRole !== 'superadmin') {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
            </div>
        );
    }

    return (
        <>
            <Header title="Liquidaciones y Facturas" />
            <main className="mx-auto min-h-screen max-w-7xl px-4 py-8">
                <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">Liquidaciones</h1>
                        <p className="mt-2 text-gray-600">Gestión de cortes y facturación a restaurantes</p>
                    </div>
                    <button
                        onClick={() => setShowCloseModal(true)}
                        className="btn-primary flex items-center gap-2"
                    >
                        <Plus className="h-5 w-5" />
                        Cerrar Nuevo Periodo
                    </button>
                </div>

                {/* Filters */}
                <div className="mb-6 grid gap-4 md:grid-cols-3">
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">Restaurante</label>
                        <select
                            value={selectedRestaurantId}
                            onChange={(e) => setSelectedRestaurantId(e.target.value)}
                            className="input w-full"
                        >
                            <option value="">Todos</option>
                            {restaurants.map((r) => (
                                <option key={r.id} value={r.id}>{r.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">Estado</label>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="input w-full"
                        >
                            <option value="all">Todos</option>
                            <option value="closed">Pendiente Facturar</option>
                            <option value="invoiced">Facturado</option>
                            <option value="paid">Pagado</option>
                        </select>
                    </div>
                </div>

                {/* List */}
                {loading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
                    </div>
                ) : payouts.length === 0 ? (
                    <div className="card py-12 text-center text-gray-500">
                        No se encontraron liquidaciones.
                    </div>
                ) : (
                    <div className="space-y-4">
                        {payouts.map((payout) => (
                            <div key={payout.id} className="card flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-lg">{payout.restaurant.name}</h3>
                                        <span className={`badge ${payout.status === 'paid' ? 'badge-success' :
                                                payout.status === 'invoiced' ? 'badge-info' :
                                                    'badge-warning'
                                            }`}>
                                            {payout.status === 'paid' ? 'Pagado' :
                                                payout.status === 'invoiced' ? 'Facturado' :
                                                    'Pendiente Facturar'}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-600 mt-1">
                                        Periodo: {new Date(payout.periodStart).toLocaleDateString()} - {new Date(payout.periodEnd).toLocaleDateString()}
                                    </p>
                                    <div className="mt-2 flex gap-4 text-sm">
                                        <div>
                                            <span className="text-gray-500">Ventas Brutas:</span>
                                            <span className="ml-1 font-medium">${(payout.grossSales / 100).toLocaleString()}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500">Comisión UPICK:</span>
                                            <span className="ml-1 font-medium text-primary-600">${(payout.commissionTotal / 100).toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    {payout.status === 'closed' && (
                                        <button
                                            onClick={() => {
                                                setSelectedPayout(payout);
                                                setInvoiceFormData({ ...invoiceFormData, number: `UPICK-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000)}` });
                                                setShowInvoiceModal(true);
                                            }}
                                            className="btn-secondary text-sm"
                                        >
                                            <FileText className="mr-2 h-4 w-4" />
                                            Generar Factura
                                        </button>
                                    )}

                                    {payout.invoices.length > 0 && (
                                        <div className="flex flex-col gap-1">
                                            {payout.invoices.map(inv => (
                                                <a
                                                    key={inv.id}
                                                    href={inv.pdfUrl || '#'}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-sm text-primary-600 hover:underline flex items-center gap-1"
                                                >
                                                    <Download className="h-3 w-3" />
                                                    Factura #{inv.number}
                                                </a>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* Close Period Modal */}
            {showCloseModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
                    <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-xl font-bold">Cerrar Periodo</h2>
                            <button onClick={() => setShowCloseModal(false)}><X className="h-6 w-6 text-gray-400" /></button>
                        </div>
                        <form onSubmit={handleClosePeriod} className="space-y-4">
                            <div>
                                <label className="mb-1 block text-sm font-medium">Restaurante</label>
                                <select
                                    required
                                    value={closeFormData.restaurantId}
                                    onChange={(e) => setCloseFormData({ ...closeFormData, restaurantId: e.target.value })}
                                    className="input w-full"
                                >
                                    <option value="">Seleccionar...</option>
                                    {restaurants.map((r) => (
                                        <option key={r.id} value={r.id}>{r.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="mb-1 block text-sm font-medium">Inicio</label>
                                    <input
                                        type="date"
                                        required
                                        value={closeFormData.periodStart}
                                        onChange={(e) => setCloseFormData({ ...closeFormData, periodStart: e.target.value })}
                                        className="input w-full"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium">Fin</label>
                                    <input
                                        type="date"
                                        required
                                        value={closeFormData.periodEnd}
                                        onChange={(e) => setCloseFormData({ ...closeFormData, periodEnd: e.target.value })}
                                        className="input w-full"
                                    />
                                </div>
                            </div>
                            <button type="submit" disabled={closing} className="btn-primary w-full">
                                {closing ? 'Procesando...' : 'Cerrar Periodo'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Generate Invoice Modal */}
            {showInvoiceModal && selectedPayout && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
                    <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-xl font-bold">Generar Factura</h2>
                            <button onClick={() => setShowInvoiceModal(false)}><X className="h-6 w-6 text-gray-400" /></button>
                        </div>
                        <div className="mb-4 rounded-lg bg-gray-50 p-3 text-sm">
                            <p><strong>Restaurante:</strong> {selectedPayout.restaurant.name}</p>
                            <p><strong>Comisión a Facturar:</strong> ${(selectedPayout.commissionTotal / 100).toLocaleString()}</p>
                        </div>
                        <form onSubmit={handleGenerateInvoice} className="space-y-4">
                            <div>
                                <label className="mb-1 block text-sm font-medium">Número de Factura</label>
                                <input
                                    type="text"
                                    required
                                    value={invoiceFormData.number}
                                    onChange={(e) => setInvoiceFormData({ ...invoiceFormData, number: e.target.value })}
                                    className="input w-full"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium">Fecha de Vencimiento</label>
                                <input
                                    type="date"
                                    required
                                    value={invoiceFormData.dueDate}
                                    onChange={(e) => setInvoiceFormData({ ...invoiceFormData, dueDate: e.target.value })}
                                    className="input w-full"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium">Notas</label>
                                <textarea
                                    value={invoiceFormData.notes}
                                    onChange={(e) => setInvoiceFormData({ ...invoiceFormData, notes: e.target.value })}
                                    className="input w-full"
                                    rows={3}
                                />
                            </div>
                            <button type="submit" disabled={generating} className="btn-primary w-full">
                                {generating ? 'Generando...' : 'Generar y Guardar'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}

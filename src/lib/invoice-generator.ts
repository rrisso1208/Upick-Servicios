
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface InvoiceData {
    number: string;
    issueDate: string;
    dueDate: string;
    restaurantName: string;
    restaurantNit: string; // Assuming we have this or use a placeholder
    restaurantAddress: string;
    periodStart: string;
    periodEnd: string;
    items: Array<{
        description: string;
        amount: number;
    }>;
    subtotal: number;
    tax: number;
    total: number;
}

export const generateInvoicePDF = async (data: InvoiceData): Promise<Blob> => {
    const doc = new jsPDF();

    // Header
    doc.setFontSize(20);
    doc.text('FACTURA DE VENTA', 105, 20, { align: 'center' });

    doc.setFontSize(10);
    doc.text('UPICK S.A.S', 105, 28, { align: 'center' });
    doc.text('NIT: 900.123.456-7', 105, 33, { align: 'center' });
    doc.text('Dirección: Calle 123 # 45-67, Bogotá', 105, 38, { align: 'center' });
    doc.text('Email: contabilidad@upick.com', 105, 43, { align: 'center' });

    // Invoice Details
    doc.setFontSize(12);
    doc.text(`Factura No: ${data.number}`, 14, 60);
    doc.text(`Fecha de Emisión: ${data.issueDate}`, 14, 66);
    doc.text(`Fecha de Vencimiento: ${data.dueDate}`, 14, 72);

    // Client (Restaurant) Details
    doc.text('Cliente:', 120, 60);
    doc.setFontSize(10);
    doc.text(data.restaurantName, 120, 66);
    doc.text(`NIT: ${data.restaurantNit}`, 120, 71);
    doc.text(data.restaurantAddress, 120, 76);
    doc.text(`Periodo: ${data.periodStart} - ${data.periodEnd}`, 120, 81);

    // Table
    const tableBody = data.items.map((item) => [
        item.description,
        `$${item.amount.toLocaleString('es-CO')}`,
    ]);

    autoTable(doc, {
        startY: 90,
        head: [['Descripción', 'Valor']],
        body: tableBody,
        theme: 'grid',
        headStyles: { fillColor: [22, 163, 74] }, // Primary color (green-600)
        styles: { fontSize: 10 },
        columnStyles: {
            0: { cellWidth: 'auto' },
            1: { cellWidth: 40, halign: 'right' },
        },
    });

    // Totals
    const finalY = (doc as any).lastAutoTable.finalY + 10;

    doc.text('Subtotal:', 140, finalY);
    doc.text(`$${data.subtotal.toLocaleString('es-CO')}`, 190, finalY, { align: 'right' });

    doc.text('IVA (19%):', 140, finalY + 6);
    doc.text(`$${data.tax.toLocaleString('es-CO')}`, 190, finalY + 6, { align: 'right' });

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL A PAGAR:', 140, finalY + 14);
    doc.text(`$${data.total.toLocaleString('es-CO')}`, 190, finalY + 14, { align: 'right' });

    // Footer
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(
        'Esta factura se asimila en todos sus efectos a una letra de cambio de conformidad con el Art. 774 del Código de Comercio.',
        105,
        280,
        { align: 'center' }
    );

    return doc.output('blob');
};

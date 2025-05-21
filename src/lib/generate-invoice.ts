import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';

interface InvoiceItem {
  name: string;
  quantity: number;
  unit: string;
  price: number;
  discount: number;
  total: number;
}

interface AdditionalCost {
  description: string;
  amount: number;
}

interface InvoiceData {
  invoiceNumber: string;
  date: string;
  supplier: string;
  reference: string;
  items: InvoiceItem[];
  additionalCosts: AdditionalCost[];
  subtotal: number;
  discount: number;
  total: number;
  notes: string;
  companyName: string;
}

const formatCurrency = (value: number): string => {
  return `Rp ${value.toLocaleString('id-ID')}`;
};

export const generateInvoice = async (data: InvoiceData): Promise<Blob> => {
  try {
    // Create a new PDF document
    const doc = new jsPDF();
    
    // Set fonts
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    
    // Add company name and invoice title
    doc.text(data.companyName, 105, 20, { align: 'center' });
    doc.setFontSize(14);
    doc.text('PURCHASE INVOICE', 105, 30, { align: 'center' });
    doc.setLineWidth(0.5);
    doc.line(20, 35, 190, 35);
    
    // Add invoice details
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    
    // Left side details
    doc.text('Supplier:', 20, 45);
    doc.text(data.supplier, 60, 45);
    
    doc.text('Reference:', 20, 52);
    doc.text(data.reference || '-', 60, 52);
    
    doc.text('Notes:', 20, 59);
    doc.text(data.notes || '-', 60, 59);
    
    // Right side details
    doc.text('Invoice Number:', 130, 45);
    doc.text(data.invoiceNumber, 170, 45);
    
    doc.text('Date:', 130, 52);
    doc.text(data.date, 170, 52);
    
    // Add items table
    // @ts-expect-error - autoTable is added by the plugin
    doc.autoTable({
      head: [['Item', 'Quantity', 'Unit', 'Price', 'Discount (%)', 'Total']],
      body: data.items.map(item => [
        item.name,
        item.quantity.toString(),
        item.unit,
        formatCurrency(item.price),
        item.discount.toString(),
        formatCurrency(item.total)
      ]),
      startY: 70,
      theme: 'striped',
      headStyles: { fillColor: [66, 66, 66] },
      styles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 60 },
        3: { halign: 'right' },
        5: { halign: 'right' }
      }
    });
    
    // Get the Y position after the items table
    // @ts-expect-error - lastAutoTable is added by the plugin
    const finalY = doc.lastAutoTable.finalY + 10;
    
    // Add additional costs if any
    if (data.additionalCosts && data.additionalCosts.length > 0) {
      doc.text('Additional Costs:', 20, finalY);
      
      // @ts-expect-error - autoTable is added by the plugin
      doc.autoTable({
        head: [['Description', 'Amount']],
        body: data.additionalCosts.map(cost => [
          cost.description,
          formatCurrency(cost.amount)
        ]),
        startY: finalY + 5,
        theme: 'striped',
        headStyles: { fillColor: [66, 66, 66] },
        styles: { fontSize: 9 },
        columnStyles: {
          1: { halign: 'right' }
        }
      });
    }
    
    // Get the Y position after the additional costs table or use the items table Y position
    const finalAdditionalY = data.additionalCosts && data.additionalCosts.length > 0 
      // @ts-expect-error - lastAutoTable is added by the plugin
      ? doc.lastAutoTable.finalY + 10 
      : finalY;
    
    // Add summary
    doc.setFont('helvetica', 'bold');
    doc.text('Subtotal:', 140, finalAdditionalY);
    doc.setFont('helvetica', 'normal');
    doc.text(formatCurrency(data.subtotal), 190, finalAdditionalY, { align: 'right' });
    
    doc.setFont('helvetica', 'bold');
    doc.text('Discount:', 140, finalAdditionalY + 7);
    doc.setFont('helvetica', 'normal');
    doc.text(formatCurrency(data.discount), 190, finalAdditionalY + 7, { align: 'right' });
    
    // Add a line before the total
    doc.setLineWidth(0.3);
    doc.line(140, finalAdditionalY + 10, 190, finalAdditionalY + 10);
    
    // Add total
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL:', 140, finalAdditionalY + 17);
    doc.text(formatCurrency(data.total), 190, finalAdditionalY + 17, { align: 'right' });
    
    // Add footer
    const footerY = doc.internal.pageSize.height - 10;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Generated on: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 105, footerY, { align: 'center' });
    
    // Return the PDF as a Blob
    return doc.output('blob');
  } catch (error) {
    console.error('Error generating invoice:', error);
    throw error;
  }
}; 
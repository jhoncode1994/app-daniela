import { PaymentRecord } from '../core/models';

const money = (value: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value);

const duration = (minutes: number) =>
  `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`;

const WEEKDAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function dayLabel(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return `${WEEKDAYS[new Date(y, m - 1, d).getDay()]} ${date}`;
}

export async function downloadPaymentPdf(payment: PaymentRecord): Promise<void> {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);

  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const margin = 40;
  const primary: [number, number, number] = [165, 107, 116];

  doc.setFontSize(20);
  doc.setTextColor(...primary);
  doc.text('Comprobante de pago', margin, 50);

  doc.setFontSize(11);
  doc.setTextColor(60, 60, 60);
  const shifts = payment.shifts ?? [];
  const info: [string, string][] = [
    ['Trabajadora', payment.worker.name],
    ['Proveedor', payment.provider?.name ?? '—'],
    ['Fecha de pago', payment.paymentDate],
    [
      'Periodo',
      shifts.length ? `${shifts[0].workDate} a ${shifts[shifts.length - 1].workDate}` : '—',
    ],
  ];
  info.forEach(([label, value], i) => {
    doc.setFont('helvetica', 'bold');
    doc.text(`${label}:`, margin, 80 + i * 16);
    doc.setFont('helvetica', 'normal');
    doc.text(value, margin + 90, 80 + i * 16);
  });

  const totalGross = shifts.reduce((sum, s) => sum + s.grossMinutes, 0);
  const totalMeal = shifts.reduce((sum, s) => sum + s.mealBreakMinutes, 0);
  const totalNet = shifts.reduce((sum, s) => sum + s.netMinutes, 0);

  autoTable(doc, {
    startY: 155,
    margin: { left: margin, right: margin },
    head: [['Día', 'Entrada', 'Salida', 'Bruto', 'Descuento', 'Horas pagadas', 'Valor hora', 'Total del día']],
    body: shifts.map((s) => [
      dayLabel(s.workDate),
      s.startTime,
      s.endTime ?? '—',
      duration(s.grossMinutes),
      s.mealBreakMinutes ? duration(s.mealBreakMinutes) : '—',
      duration(s.netMinutes),
      money(s.hourlyRate),
      money(s.earnedAmount),
    ]),
    foot: [['Totales', '', '', duration(totalGross), duration(totalMeal), duration(totalNet), '', money(payment.amount)]],
    headStyles: { fillColor: primary, halign: 'center' },
    footStyles: { fillColor: [245, 235, 236], textColor: [60, 60, 60], fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 5 },
    columnStyles: {
      1: { halign: 'center' },
      2: { halign: 'center' },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'right' },
      7: { halign: 'right' },
    },
    showFoot: 'lastPage',
  });

  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primary);
  doc.text(`TOTAL PAGADO: ${money(payment.amount)}`, margin, finalY + 34);

  const safe = (text: string) => text.normalize('NFD').replace(/[^\w-]+/g, '_');
  doc.save(
    `pago_${safe(payment.worker.name)}_${safe(payment.provider?.name ?? 'general')}_${payment.paymentDate}.pdf`,
  );
}

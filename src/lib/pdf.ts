import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

type SummaryPair = { label: string; value: string };
type Column = { header: string; key: string };
type Row = Record<string, string | number>;

const INDIGO: [number, number, number] = [79, 70, 229];
const SLATE: [number, number, number] = [100, 116, 139];

// Render a branded fleet report to PDF and download it. Generic: takes a summary + tables.
export function exportReportPDF(opts: {
  title: string;
  subtitle?: string;
  summary: SummaryPair[];
  tables: { heading: string; columns: Column[]; rows: Row[] }[];
  filename: string;
}) {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;

  // Header band
  doc.setFillColor(...INDIGO);
  doc.rect(0, 0, pageWidth, 70, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("TransitOps", margin, 34);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(opts.title, margin, 52);

  // Generated date (top-right).
  doc.setFontSize(9);
  const stamp = new Date().toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  doc.text(`Generated ${stamp}`, pageWidth - margin, 52, { align: "right" });

  let y = 100;

  if (opts.subtitle) {
    doc.setTextColor(...SLATE);
    doc.setFontSize(10);
    doc.text(opts.subtitle, margin, y);
    y += 22;
  }

  // Summary chips as a light key/value grid
  if (opts.summary.length) {
    const colW = (pageWidth - margin * 2) / opts.summary.length;
    opts.summary.forEach((s, i) => {
      const x = margin + colW * i;
      doc.setTextColor(...SLATE);
      doc.setFontSize(8);
      doc.text(s.label.toUpperCase(), x, y);
      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text(s.value, x, y + 16);
      doc.setFont("helvetica", "normal");
    });
    y += 40;
  }

  // Tables
  for (const table of opts.tables) {
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(table.heading, margin, y + 6);
    y += 14;

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [table.columns.map((c) => c.header)],
      body: table.rows.map((r) => table.columns.map((c) => String(r[c.key] ?? ""))),
      styles: { fontSize: 9, cellPadding: 5 },
      headStyles: { fillColor: INDIGO, textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [244, 245, 250] },
      theme: "grid",
    });

    // Advance below the table for the next section.
    const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY;
    y = (finalY ?? y) + 28;
  }

  doc.save(opts.filename);
}

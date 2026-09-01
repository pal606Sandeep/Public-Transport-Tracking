/**
 * P1-51 — native CSV + minimal PDF generation. No external PDF/CSV library is
 * available, so we build both by hand. CSV is a correct RFC-4180-style stream
 * (quoting/escaping); PDF is a small, valid single-page text document.
 */

const escapeCsv = (v: unknown): string => {
  const s = v === null || v === undefined ? "" : String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
};

export const toCsv = (columns: string[], rows: (string | number)[][]): string => {
  const header = columns.map(escapeCsv).join(",");
  const body = rows.map((r) => r.map(escapeCsv).join(","));
  return [header, ...body].join("\r\n");
};

// Minimal one-page PDF with a title + a block of monospace text lines.
// Uses a single Helvetica font, no compression — valid but compact.
export const toPdf = (title: string, lines: string[]): Buffer => {
  const margin = 50;
  const pageHeight = 792;
  const lineHeight = 12;
  const fontSize = 10;

  const content: string[] = [];
  content.push(`${title}`);
  content.push("");
  content.push(...lines);

  const objects: string[] = [];
  const addObj = (body: string): number => {
    objects.push(body);
    return objects.length;
  };

  const headerBody =
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj";
  addObj(headerBody);

  addObj("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj");

  const text = content
    .map((line, i) => {
      const y = pageHeight - margin - i * lineHeight;
      const sanitized = line.replace(/[()\\]/g, "\\$&");
      return `BT /F1 ${fontSize} Tf ${margin} ${y} Td (${sanitized}) Tj ET`;
    })
    .join("\n");

  const pageBody =
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj";
  addObj(pageBody);

  addObj("4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj");

  const stream = text;
  const streamBody = `5 0 obj\n<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}\nendstream\nendobj`;
  addObj(streamBody);

  const buf: Buffer[] = [Buffer.from("%PDF-1.4\n", "latin1")];
  const xrefOffsets: number[] = [];
  let running = Buffer.byteLength("%PDF-1.4\n", "latin1");
  objects.forEach((obj) => {
    xrefOffsets.push(running);
    buf.push(Buffer.from(obj, "latin1"));
    running += Buffer.byteLength(obj, "latin1");
  });

  const xrefStart = running;
  const xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${xrefOffsets
    .map((o) => `${String(o).padStart(10, "0")} 00000 n `)
    .join("\n")}\n`;
  const trailer = `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;

  buf.push(Buffer.from(xref, "latin1"));
  buf.push(Buffer.from(trailer, "latin1"));

  return Buffer.concat(buf);
};

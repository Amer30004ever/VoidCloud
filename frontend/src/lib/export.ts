type ExportRow = Record<string, string | number | boolean | null | undefined>;

function escapeCsvValue(value: unknown): string {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function exportToCsv(filename: string, rows: ExportRow[]): void {
  if (!rows.length) {
    window.alert("No data available to export.");
    return;
  }

  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => escapeCsvValue(row[header])).join(",")),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportToPdf(title: string, sections: Array<{ heading: string; rows: ExportRow[] }>): void {
  const hasData = sections.some((section) => section.rows.length > 0);
  if (!hasData) {
    window.alert("No data available to export.");
    return;
  }

  const sectionHtml = sections
    .map((section) => {
      if (!section.rows.length) return "";
      const headers = Object.keys(section.rows[0]);
      const head = headers.map((header) => `<th>${header}</th>`).join("");
      const body = section.rows
        .map(
          (row) =>
            `<tr>${headers.map((header) => `<td>${String(row[header] ?? "")}</td>`).join("")}</tr>`,
        )
        .join("");

      return `
        <section>
          <h2>${section.heading}</h2>
          <table>
            <thead><tr>${head}</tr></thead>
            <tbody>${body}</tbody>
          </table>
        </section>
      `;
    })
    .join("");

  const printWindow = window.open("", "_blank", "noopener,noreferrer,width=1024,height=768");
  if (!printWindow) {
    window.alert("Unable to open print window. Please allow pop-ups for this site.");
    return;
  }

  printWindow.document.write(`<!DOCTYPE html>
<html>
  <head>
    <title>${title}</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 24px; color: #111; }
      h1 { margin-bottom: 8px; }
      p { color: #555; margin-top: 0; }
      section { margin-top: 24px; page-break-inside: avoid; }
      h2 { font-size: 16px; margin-bottom: 8px; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; }
      th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
      th { background: #f5f5f5; }
    </style>
  </head>
  <body>
    <h1>${title}</h1>
    <p>Generated ${new Date().toLocaleString()}</p>
    ${sectionHtml}
  </body>
</html>`);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

export function exportTextFile(filename: string, content: string, mimeType = "text/plain;charset=utf-8;"): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

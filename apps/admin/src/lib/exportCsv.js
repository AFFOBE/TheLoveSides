/**
 * Export an array of rows to a CSV file that opens cleanly in Excel/Sheets.
 *
 * @param {string} filename  e.g. "customers-2026-11-04.csv"
 * @param {Array<{label: string, value: string | ((row: any) => any)}>} columns
 * @param {Array<object>} rows
 */
export function exportToCsv(filename, columns, rows) {
  const escapeCell = (value) => {
    if (value === null || value === undefined) return '';
    const str = String(value).replace(/"/g, '""');
    // Quote when the value contains a separator, quote or newline.
    if (/[",\n\r]/.test(str)) return `"${str}"`;
    return str;
  };

  const header = columns.map((c) => escapeCell(c.label)).join(',');
  const body = rows.map((row) =>
    columns
      .map((c) =>
        escapeCell(typeof c.value === 'function' ? c.value(row) : row[c.value]),
      )
      .join(','),
  );

  // BOM keeps ₹ and other symbols readable in Excel.
  const csv = `\uFEFF${[header, ...body].join('\r\n')}`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

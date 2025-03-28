export function exportToCSV(data: any[], filename: string) {
  if (!data || !data.length) return;

  const header = Object.keys(data[0]).join(',');
  const rows = data.map(row =>
    Object.values(row)
      .map(String)
      .join(',')
  );

  const csvString = [header, ...rows].join('\n');
  const blob = new Blob([csvString], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('hidden', '');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

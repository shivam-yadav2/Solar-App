import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

function cell(value: unknown): string {
  const text = value == null ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export async function shareCsv(filename: string, rows: Record<string, unknown>[]): Promise<void> {
  if (!rows.length) throw new Error('There is no data to export.');
  const headers = [...new Set(rows.flatMap(row => Object.keys(row)))];
  const csv = [headers.map(cell).join(','), ...rows.map(row => headers.map(key => cell(row[key])).join(','))].join('\n');
  const safeName = filename.replace(/[^a-zA-Z0-9_-]/g, '_');
  const file = new File(Paths.cache, `${safeName}.csv`);
  file.create({ overwrite: true });
  file.write(`\uFEFF${csv}`);
  if (!(await Sharing.isAvailableAsync())) throw new Error('File sharing is not available on this device.');
  await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', dialogTitle: `Share ${filename}` });
}

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

/** Download an authenticated server export to the app cache, then open the native share sheet. */
export async function shareDownload(url: string, filename: string, mimeType: string, headers?: Record<string, string>): Promise<void> {
  const response = await fetch(url, { headers });
  if (!response.ok) {
    let message = `Download failed (${response.status}).`;
    try { message = (await response.json())?.error || message; } catch { /* non-JSON response */ }
    throw new Error(message);
  }
  const safeName = filename.replace(/[^a-zA-Z0-9_.-]/g, '_');
  const file = new File(Paths.cache, safeName);
  file.create({ overwrite: true });
  file.write(new Uint8Array(await response.arrayBuffer()));
  if (!(await Sharing.isAvailableAsync())) throw new Error('File sharing is not available on this device.');
  await Sharing.shareAsync(file.uri, { mimeType, dialogTitle: `Share ${filename}` });
}

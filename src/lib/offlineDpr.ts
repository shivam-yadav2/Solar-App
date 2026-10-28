import { api, ApiError } from './api';
import { getActiveTenantId } from './session';
import { store } from './storage';

export interface QueuedDpr { id: string; projectId: string; payload: Record<string, unknown>; queuedAt: string; lastError?: string }
type QueueListener = () => void;
const listeners = new Set<QueueListener>();
const notify = () => listeners.forEach((listener) => listener());
const key = () => `queue:dpr:${getActiveTenantId() || 'workspace'}`;
const read = async (): Promise<QueuedDpr[]> => {
  try { return JSON.parse(await store.get(key()) || '[]'); } catch { return []; }
};
const write = async (items: QueuedDpr[]) => {
  if (items.length) await store.set(key(), JSON.stringify(items.slice(-50)));
  else await store.del(key());
  notify();
};

export function onQueuedDprsChanged(listener: QueueListener): () => void { listeners.add(listener); return () => listeners.delete(listener); }
export async function listQueuedDprs(): Promise<QueuedDpr[]> { return read(); }
export async function discardQueuedDpr(id: string): Promise<void> { await write((await read()).filter((item) => item.id !== id)); }

export async function queueDpr(projectId: string, payload: Record<string, unknown>) {
  const items = await read();
  items.push({ id: `queued-${Date.now()}`, projectId, payload, queuedAt: new Date().toISOString() });
  await write(items);
  return items.length;
}

export async function queuedDprCount() { return (await read()).length; }

/** Sends oldest first. Network failures remain queued; rejected/invalid reports remain visible for retry. */
export async function flushQueuedDprs(): Promise<{ sent: number; remaining: number }> {
  const items = await read(); let sent = 0; const remaining: QueuedDpr[] = [];
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    try { await api.createDpr(item.projectId, item.payload as any); sent += 1; }
    catch (error: any) {
      remaining.push({ ...item, lastError: error?.message || 'Could not send' }, ...items.slice(index + 1));
      if (error instanceof ApiError && error.status === 0) break;
      // Preserve a server-rejected report for user recovery rather than silently losing it.
      break;
    }
  }
  await write(remaining);
  return { sent, remaining: remaining.length };
}

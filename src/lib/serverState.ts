/**
 * What the server told us about the workspace as a whole: maintenance,
 * a read-only (unpaid) company, or a company that can't be used at all.
 * request() feeds it from error codes; the root layout shows the screens.
 */
export interface ServerState {
  maintenance?: { message: string; until?: string };
  readOnly?: string;
  blocked?: { code: string; message: string };
}

let state: ServerState = {};
const listeners = new Set<(s: ServerState) => void>();

export const getServerState = () => state;
export function onServerState(fn: (s: ServerState) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
export function patchServerState(patch: Partial<ServerState>) {
  const next = { ...state, ...patch };
  if (JSON.stringify(next) === JSON.stringify(state)) return;
  state = next;
  listeners.forEach((l) => l(state));
}

const BLOCKING = new Set(['TENANT_EXPIRED', 'TENANT_SUSPENDED', 'TENANT_ARCHIVED', 'DEMO_EXPIRED']);

/** Called for every API response. */
export function noteResponse(status: number, body: any) {
  const code = body?.code as string | undefined;
  if (status === 503 && code === 'MAINTENANCE') {
    patchServerState({ maintenance: { message: body?.error || 'SolarOS is being updated.', until: body?.until } });
    return;
  }
  if (status < 500 && state.maintenance) patchServerState({ maintenance: undefined });
  if (code === 'TENANT_READ_ONLY') patchServerState({ readOnly: body?.error || 'This account is read-only.' });
  if (code && BLOCKING.has(code)) patchServerState({ blocked: { code, message: body?.error || 'This account cannot be used right now.' } });
}

export const clearServerState = () => { state = {}; listeners.forEach((l) => l(state)); };

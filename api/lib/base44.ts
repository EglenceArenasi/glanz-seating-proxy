// api/lib/base44.ts
// Base44 REST API client (server-side, Vercel'den çağrılır)
//
// Vercel env var'ları:
//   BASE44_APP_ID
//   BASE44_TOKEN

const BASE_URL = 'https://base44.app/api/apps';

interface Base44Config {
  appId: string;
  token: string;
}

function getConfig(): Base44Config {
  const appId = process.env.BASE44_APP_ID;
  const token = process.env.BASE44_TOKEN;
  if (!appId || !token) {
    throw new Error('BASE44_APP_ID and BASE44_TOKEN env vars required');
  }
  return { appId, token };
}

async function apiCall<T>(path: string, options: RequestInit = {}): Promise<T> {
  const { appId, token } = getConfig();
  const url = `${BASE_URL}/${appId}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-App-Id': appId,
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Base44 ${res.status} on ${path}: ${body.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

export async function listEntities<T>(
  entity: string,
  options: { sort?: string; limit?: number } = {}
): Promise<T[]> {
  const params = new URLSearchParams();
  if (options.sort) params.append('sort', options.sort);
  if (options.limit !== undefined) params.append('limit', String(options.limit));
  const query = params.toString();
  return apiCall<T[]>(`/entities/${entity}${query ? `?${query}` : ''}`);
}

export async function filterEntities<T>(
  entity: string,
  filters: Record<string, unknown>
): Promise<T[]> {
  const q = encodeURIComponent(JSON.stringify(filters));
  return apiCall<T[]>(`/entities/${entity}?q=${q}`);
}

export async function createEntity<T>(
  entity: string,
  data: Partial<T>
): Promise<T> {
  return apiCall<T>(`/entities/${entity}`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateEntity<T>(
  entity: string,
  id: string,
  data: Partial<T>
): Promise<T> {
  return apiCall<T>(`/entities/${entity}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * Upsert: Eğer external_id match varsa update, yoksa create.
 */
export async function upsertByExternalId<T extends { id?: string }>(
  entity: string,
  externalIdField: string,
  externalId: string,
  data: Partial<T>
): Promise<{ entity: T; created: boolean }> {
  const existing = await filterEntities<T>(entity, { [externalIdField]: externalId });
  if (existing && existing.length > 0) {
    const updated = await updateEntity<T>(entity, existing[0].id!, data);
    return { entity: updated, created: false };
  }
  const created = await createEntity<T>(entity, data);
  return { entity: created, created: true };
}

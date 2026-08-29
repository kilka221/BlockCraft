// Client-side helper for YDB REST API

export interface YdbDiagramItem {
  id: string;
  title: string;
  code: string;
  language: string;
  isPinned?: boolean;
  createdAt: string;
  updatedAt: string;
}

async function safeFetchJson(url: string, options?: RequestInit) {
  try {
    const res = await fetch(url, options);
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return await res.json();
    }
    return null;
  } catch (e) {
    console.warn('safeFetchJson error:', e);
    return null;
  }
}

export async function syncYdbUser(uid: string, email?: string | null, displayName?: string | null) {
  return await safeFetchJson('/api/users/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uid, email, displayName }),
  });
}

export async function getYdbUserTokens(uid: string): Promise<number> {
  const data = await safeFetchJson(`/api/users/${encodeURIComponent(uid)}`);
  if (data && data.success && data.user) {
    return data.user.tokens ?? 1;
  }
  return 1;
}

export async function decrementYdbUserToken(uid: string): Promise<number> {
  const data = await safeFetchJson('/api/users/decrement-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uid }),
  });
  return data?.tokens ?? 0;
}

export async function saveYdbDiagramItem(uid: string, diagram: YdbDiagramItem) {
  return await safeFetchJson('/api/diagrams/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uid, diagram }),
  });
}

export async function fetchYdbDiagrams(uid: string): Promise<YdbDiagramItem[]> {
  const data = await safeFetchJson(`/api/diagrams/${encodeURIComponent(uid)}`);
  if (data && data.success && Array.isArray(data.diagrams)) {
    return data.diagrams;
  }
  return [];
}

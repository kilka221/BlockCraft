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

export async function syncYdbUser(uid: string, email?: string | null, displayName?: string | null, tokens?: number) {
  return await safeFetchJson('/api/users/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uid, email, displayName, tokens }),
  });
}

export async function getYdbUserTokens(uid: string, email?: string | null): Promise<number> {
  const url = email 
    ? `/api/users/${encodeURIComponent(uid)}?email=${encodeURIComponent(email)}`
    : `/api/users/${encodeURIComponent(uid)}`;
  const data = await safeFetchJson(url);
  if (data && data.success && data.user) {
    return Number(data.user.tokens) || 1;
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

export async function registerYdbUserApi(email: string, pass: string, displayName?: string) {
  const res = await safeFetchJson('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: pass, displayName }),
  });
  if (!res || !res.success) {
    throw new Error(res?.error || 'Ошибка регистрации');
  }
  return res.user;
}

export async function loginYdbUserApi(email: string, pass: string) {
  const res = await safeFetchJson('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: pass }),
  });
  if (!res || !res.success) {
    throw new Error(res?.error || 'Ошибка входа');
  }
  return res.user;
}

export async function fetchYdbDiagrams(uid: string): Promise<YdbDiagramItem[]> {
  const data = await safeFetchJson(`/api/diagrams/${encodeURIComponent(uid)}`);
  if (data && data.success && Array.isArray(data.diagrams)) {
    return data.diagrams;
  }
  return [];
}

export async function deleteYdbDiagramItem(uid: string, diagramId: string) {
  return await safeFetchJson('/api/diagrams/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uid, diagramId }),
  });
}


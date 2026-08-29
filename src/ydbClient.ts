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

export async function syncYdbUser(uid: string, email?: string | null, displayName?: string | null) {
  try {
    const res = await fetch('/api/users/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, email, displayName }),
    });
    return await res.json();
  } catch (e) {
    console.warn('YDB sync client notice:', e);
    return null;
  }
}

export async function getYdbUserTokens(uid: string): Promise<number> {
  try {
    const res = await fetch(`/api/users/${encodeURIComponent(uid)}`);
    const data = await res.json();
    if (data.success && data.user) {
      return data.user.tokens ?? 1;
    }
    return 1;
  } catch (e) {
    console.warn('YDB fetch tokens notice:', e);
    return 1;
  }
}

export async function decrementYdbUserToken(uid: string): Promise<number> {
  try {
    const res = await fetch('/api/users/decrement-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid }),
    });
    const data = await res.json();
    return data.tokens ?? 0;
  } catch (e) {
    console.warn('YDB decrement token notice:', e);
    return 0;
  }
}

export async function saveYdbDiagramItem(uid: string, diagram: YdbDiagramItem) {
  try {
    const res = await fetch('/api/diagrams/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, diagram }),
    });
    return await res.json();
  } catch (e) {
    console.warn('YDB save diagram notice:', e);
    return null;
  }
}

export async function fetchYdbDiagrams(uid: string): Promise<YdbDiagramItem[]> {
  try {
    const res = await fetch(`/api/diagrams/${encodeURIComponent(uid)}`);
    const data = await res.json();
    if (data.success && Array.isArray(data.diagrams)) {
      return data.diagrams;
    }
    return [];
  } catch (e) {
    console.warn('YDB fetch diagrams notice:', e);
    return [];
  }
}

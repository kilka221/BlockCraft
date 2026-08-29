// Yandex OAuth & YDB Helper

export interface YandexUserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  providerId: 'yandex.ru';
}

export async function fetchYandexProfileByToken(accessToken: string): Promise<YandexUserProfile> {
  let rawData: any = null;

  // 1. Primary Attempt: Call server proxy route /api/yandex/userinfo
  try {
    const resp = await fetch(`/api/yandex/userinfo?token=${encodeURIComponent(accessToken)}`);
    const contentType = resp.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const json = await resp.json();
      if (resp.ok && json.success) {
        if (json.user) return json.user;
        if (json.data) rawData = json.data;
      } else if (json.error) {
        console.warn('[Yandex Auth Proxy Warning]:', json.error, json.details);
      }
    }
  } catch (err) {
    console.warn('[Yandex Auth Proxy Fetch Failed, trying direct Yandex fetch]:', err);
  }

  // 2. Secondary Fallback Attempt: Direct fetch from Yandex OAuth info API (supports CORS)
  if (!rawData) {
    try {
      const directResp = await fetch(`https://login.yandex.ru/info?format=json&oauth_token=${encodeURIComponent(accessToken)}`);
      if (directResp.ok) {
        rawData = await directResp.json();
      } else {
        const errJson = await directResp.json().catch(() => null);
        let msg = 'Сессия Яндекс недействительна или истекла.';
        if (errJson && errJson.message) {
          msg = `Ошибка Яндекс ID: ${errJson.message}`;
        }
        throw new Error(msg);
      }
    } catch (directErr: any) {
      if (directErr.message && directErr.message.includes('Ошибка Яндекс ID')) {
        throw directErr;
      }
      console.error('[Direct Yandex fetch error]:', directErr);
      throw new Error('Не удалось получить данные профиля Яндекс. Попробуйте повторить вход.');
    }
  }

  const email = rawData.default_email || (rawData.emails && rawData.emails[0]) || `${rawData.login}@yandex.ru`;
  const avatarUrl = rawData.default_avatar_id
    ? `https://avatars.yandex.net/get-yapic/${rawData.default_avatar_id}/islands-200`
    : undefined;

  return {
    uid: `yandex_${rawData.id || rawData.login}`,
    email: email,
    displayName: rawData.real_name || rawData.display_name || rawData.first_name || rawData.login || 'Пользователь Яндекс',
    photoURL: avatarUrl,
    providerId: 'yandex.ru',
  };
}

export const YANDEX_CLIENT_ID = 'c0f4c3f30ccf47088a44f3262ed4fe32';
export const DEFAULT_PRODUCTION_URL = 'https://schemator.ru';

export function getAppBaseUrl(): string {
  if (typeof window !== 'undefined' && window.location && window.location.origin) {
    return window.location.origin;
  }
  return DEFAULT_PRODUCTION_URL;
}

export function getYandexClientId(): string {
  return localStorage.getItem('blockcraft_yandex_client_id')?.trim() || YANDEX_CLIENT_ID;
}

export function isMobileDevice(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
}

export function openYandexOAuthPopup(clientIdOverride?: string): Promise<YandexUserProfile> {
  return new Promise((resolve, reject) => {
    const clientId = clientIdOverride || getYandexClientId();

    if (!clientId) {
      reject(new Error('NO_CLIENT_ID'));
      return;
    }

    const redirectUri = getAppBaseUrl();
    const authUrl = `https://oauth.yandex.ru/authorize?response_type=token&client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}`;

    // If mobile, redirect directly to avoid popup-blocking and cross-window sleep bugs
    if (isMobileDevice()) {
      window.location.href = authUrl;
      return;
    }

    const width = 520;
    const height = 650;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const popup = window.open(
      authUrl,
      'yandex_oauth_popup',
      `width=${width},height=${height},top=${top},left=${left},status=no,resizable=yes`
    );

    if (!popup) {
      // If popup blocked, fallback to redirect
      window.location.href = authUrl;
      return;
    }

    let isDone = false;

    const cleanup = () => {
      isDone = true;
      window.removeEventListener('message', messageHandler);
      clearInterval(checkInterval);
    };

    // Message listener if popup redirects and sends message
    const messageHandler = async (event: MessageEvent) => {
      if (event.data && event.data.type === 'YANDEX_OAUTH_TOKEN' && event.data.token) {
        if (isDone) return;
        cleanup();
        try {
          if (popup && !popup.closed) {
            try { popup.close(); } catch {}
          }
          const profile = await fetchYandexProfileByToken(event.data.token);
          resolve(profile);
        } catch (e: any) {
          reject(e);
        }
      }
    };
    window.addEventListener('message', messageHandler);

    // Polling popup URL
    const checkInterval = setInterval(async () => {
      if (isDone) {
        clearInterval(checkInterval);
        return;
      }

      try {
        if (!popup || popup.closed) {
          if (isDone) return;
          cleanup();
          reject(new Error('Окно входа Яндекс было закрыто'));
          return;
        }

        const popupUrl = popup.location.href;
        if (popupUrl && popupUrl.startsWith(redirectUri) && popupUrl.includes('access_token')) {
          if (isDone) return;
          cleanup();
          try { popup.close(); } catch {}

          const hash = popupUrl.split('#')[1] || '';
          const params = new URLSearchParams(hash);
          const accessToken = params.get('access_token');

          if (!accessToken) {
            reject(new Error('Не удалось получить токен доступа Яндекс.'));
            return;
          }

          const profile = await fetchYandexProfileByToken(accessToken);
          resolve(profile);
        }
      } catch {
        // Ignore cross-origin errors while on yandex.ru domain
      }
    }, 400);
  });
}

export function redirectToYandexOAuth(clientIdOverride?: string) {
  const clientId = clientIdOverride || getYandexClientId();
  if (!clientId) {
    throw new Error('NO_CLIENT_ID');
  }
  const redirectUri = getAppBaseUrl();
  const authUrl = `https://oauth.yandex.ru/authorize?response_type=token&client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}`;
  window.location.href = authUrl;
}

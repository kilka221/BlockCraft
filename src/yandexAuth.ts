// Yandex OAuth & YDB Helper

export interface YandexUserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  providerId: 'yandex.ru';
}

export async function fetchYandexProfileByToken(accessToken: string): Promise<YandexUserProfile> {
  try {
    const resp = await fetch(`/api/yandex/userinfo?token=${encodeURIComponent(accessToken)}`);
    const contentType = resp.headers.get('content-type') || '';

    let json: any = null;
    if (contentType.includes('application/json')) {
      json = await resp.json();
    } else {
      const rawText = await resp.text();
      console.warn('[Yandex Auth] non-JSON response from API:', resp.status, rawText.slice(0, 100));
      throw new Error('Сервер Яндекс авторизации недоступен. Попробуйте повторить вход.');
    }

    if (!resp.ok || !json.success || !json.data) {
      let errorMsg = 'Не удалось получить данные профиля Яндекс';
      if (json.details) {
        try {
          const parsed = typeof json.details === 'string' ? JSON.parse(json.details) : json.details;
          if (parsed.message) errorMsg = `Яндекс: ${parsed.message}`;
          else if (parsed.error_description) errorMsg = `Яндекс: ${parsed.error_description}`;
          else if (parsed.error) errorMsg = `Яндекс: ${parsed.error}`;
        } catch {
          errorMsg = json.details;
        }
      } else if (json.error) {
        errorMsg = json.error;
      }
      throw new Error(errorMsg);
    }

    const data = json.data;
    const email = data.default_email || (data.emails && data.emails[0]) || `${data.login}@yandex.ru`;
    const avatarUrl = data.default_avatar_id
      ? `https://avatars.yandex.net/get-yapic/${data.default_avatar_id}/islands-200`
      : undefined;

    return {
      uid: `yandex_${data.id || data.login}`,
      email: email,
      displayName: data.real_name || data.display_name || data.first_name || data.login || 'Пользователь Яндекс',
      photoURL: avatarUrl,
      providerId: 'yandex.ru',
    };
  } catch (err: any) {
    if (err.message && (err.message.includes('Unexpected token') || err.message.includes('is not valid JSON'))) {
      throw new Error('Не удалось расшифровать ответ от Яндекс. Попробуйте войти снова.');
    }
    throw err;
  }
}

export const YANDEX_CLIENT_ID = 'c0f4c3f30ccf47088a44f3262ed4fe32';

export function getYandexClientId(): string {
  return localStorage.getItem('blockcraft_yandex_client_id')?.trim() || YANDEX_CLIENT_ID;
}

export function openYandexOAuthPopup(clientIdOverride?: string): Promise<YandexUserProfile> {
  return new Promise((resolve, reject) => {
    const clientId = clientIdOverride || getYandexClientId();

    if (!clientId) {
      reject(new Error('NO_CLIENT_ID'));
      return;
    }

    const redirectUri = window.location.origin;
    const authUrl = `https://oauth.yandex.ru/authorize?response_type=token&client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}`;

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
      reject(new Error('Окно входа было заблокировано браузером. Пожалуйста, разрешите всплывающие окна для этого сайта.'));
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
  const redirectUri = window.location.origin;
  const authUrl = `https://oauth.yandex.ru/authorize?response_type=token&client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}`;
  window.location.href = authUrl;
}

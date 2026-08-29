import React, { useState } from 'react';
import { Mail, Lock, User as UserIcon, X, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { openYandexOAuthPopup } from './yandexAuth';
import { registerYdbUserApi, loginYdbUserApi, syncYdbUser } from './ydbClient';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: any) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [tab, setTab] = useState<'yandex' | 'vk' | 'email'>('yandex');
  const [isSignUp, setIsSignUp] = useState(false);
  
  // Email form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  // VK form state
  const [vkIdOrName, setVkIdOrName] = useState('');
  const [vkEmail, setVkEmail] = useState('');
  
  // States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  // Official Yandex OAuth Popup Trigger
  const handleYandexOAuth = async () => {
    setError(null);
    setLoading(true);

    try {
      const profile = await openYandexOAuthPopup();
      await syncYdbUser(profile.uid, profile.email, profile.displayName);
      localStorage.setItem('blockcraft_yandex_user', JSON.stringify(profile));
      onSuccess(profile);
      onClose();
    } catch (err: any) {
      if (err.message?.includes('заблокировано')) {
        setError(err.message);
      } else if (err.message?.includes('закрыто')) {
        setError('Окно входа Яндекс было закрыто.');
      } else {
        setError(err.message || 'Не удалось авторизоваться через Яндекс ID.');
      }
    } finally {
      setLoading(false);
    }
  };

  // VK ID Auth & Sync
  const handleVkAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const cleanName = vkIdOrName.trim() || 'Пользователь VK';
      const cleanId = vkIdOrName.trim().toLowerCase().replace(/[^a-z0-9_]/g, '') || String(Date.now());
      const userUid = `vk_${cleanId}`;
      const userEmail = vkEmail.trim() || `${cleanId}@vk.com`;

      const syncResult = await syncYdbUser(userUid, userEmail, cleanName, 1);
      const userProfile = {
        uid: userUid,
        email: userEmail,
        displayName: cleanName,
        tokens: syncResult?.result?.tokens || 1,
        providerId: 'vk.com'
      };

      localStorage.setItem('blockcraft_yandex_user', JSON.stringify(userProfile));
      setSuccessMsg('Успешный вход через VK ID! Данные сохранены в базе.');
      onSuccess(userProfile);
      setTimeout(() => onClose(), 500);
    } catch (err: any) {
      console.warn('VK Auth error:', err);
      setError(err.message || 'Не удалось авторизоваться через VK.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!email.trim() || !password.trim()) {
      setError('Пожалуйста, заполните все обязательные поля');
      return;
    }
    if (password.length < 6) {
      setError('Пароль должен быть не менее 6 символов');
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        const loggedUser = await registerYdbUserApi(email.trim(), password.trim(), name.trim());
        localStorage.setItem('blockcraft_yandex_user', JSON.stringify(loggedUser));
        setSuccessMsg('Регистрация успешна! Аккаунт сохранен в Yandex Cloud DB.');
        onSuccess(loggedUser);
        setTimeout(() => onClose(), 600);
      } else {
        const loggedUser = await loginYdbUserApi(email.trim(), password.trim());
        localStorage.setItem('blockcraft_yandex_user', JSON.stringify(loggedUser));
        onSuccess(loggedUser);
        onClose();
      }
    } catch (err: any) {
      console.warn('Auth error:', err);
      setError(err.message || 'Ошибка авторизации. Попробуйте еще раз.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-[#1E1E22] border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden text-zinc-900 dark:text-zinc-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/30">
          <div className="flex items-center gap-2.5">
            <img src="/icon.svg" alt="Схематор" className="w-8 h-8 rounded-xl object-contain shadow-sm select-none" />
            <div>
              <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">Авторизация в Схематор</h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">1 бесплатный токен при входе</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="grid grid-cols-3 p-1.5 mx-6 mt-4 bg-zinc-100 dark:bg-zinc-800/80 rounded-xl gap-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => { setTab('yandex'); setError(null); setSuccessMsg(null); }}
            className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition ${
              tab === 'yandex' 
                ? 'bg-white dark:bg-[#2A2A30] text-zinc-900 dark:text-white shadow-sm' 
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-[#FC3F1D] text-white flex items-center justify-center text-[10px] font-black leading-none">
              Я
            </span>
            <span>Яндекс ID</span>
          </button>

          <button
            type="button"
            onClick={() => { setTab('vk'); setError(null); setSuccessMsg(null); }}
            className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition ${
              tab === 'vk' 
                ? 'bg-white dark:bg-[#2A2A30] text-blue-600 dark:text-blue-400 shadow-sm' 
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-[#0077FF] text-white flex items-center justify-center text-[9px] font-bold leading-none">
              VK
            </span>
            <span>VK ID</span>
          </button>

          <button
            type="button"
            onClick={() => { setTab('email'); setError(null); setSuccessMsg(null); }}
            className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition ${
              tab === 'email' 
                ? 'bg-white dark:bg-[#2A2A30] text-emerald-600 dark:text-emerald-400 shadow-sm' 
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Email</span>
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-600 dark:text-red-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-700 dark:text-emerald-300 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* TAB 1: YANDEX ID AUTH */}
          {tab === 'yandex' && (
            <div className="space-y-4">
              <button
                type="button"
                onClick={handleYandexOAuth}
                disabled={loading}
                className="w-full py-3 bg-[#FC3F1D] hover:bg-[#E03415] disabled:opacity-50 text-white font-bold rounded-xl shadow-lg shadow-[#FC3F1D]/25 flex items-center justify-center gap-2.5 text-sm transition transform active:scale-[0.98]"
              >
                <span className="w-5 h-5 rounded-full bg-white text-[#FC3F1D] flex items-center justify-center text-xs font-black shadow-sm">
                  Я
                </span>
                <span>{loading ? 'Открытие Яндекс...' : 'Войти с Яндекс ID'}</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </button>
              <p className="text-[11px] text-zinc-400 text-center leading-relaxed">
                Безопасный вход через официальный сервис Yandex ID. Данные хранятся в Yandex Cloud DB.
              </p>
            </div>
          )}

          {/* TAB 2: VK ID AUTH */}
          {tab === 'vk' && (
            <form onSubmit={handleVkAuth} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Имя или Никнейм
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={vkIdOrName}
                    onChange={(e) => setVkIdOrName(e.target.value)}
                    placeholder="Егор Волков"
                    className="w-full pl-9 pr-3.5 py-2 bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-700/80 rounded-xl text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Почта VK (опционально)
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={vkEmail}
                    onChange={(e) => setVkEmail(e.target.value)}
                    placeholder="egor@vk.com"
                    className="w-full pl-9 pr-3.5 py-2 bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-700/80 rounded-xl text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 mt-2 bg-[#0077FF] hover:bg-[#0066DD] disabled:opacity-50 text-white font-bold rounded-xl shadow-lg shadow-[#0077FF]/25 flex items-center justify-center gap-2.5 text-sm transition transform active:scale-[0.98]"
              >
                <span className="w-5 h-5 rounded-full bg-white text-[#0077FF] flex items-center justify-center text-[10px] font-black shadow-sm">
                  VK
                </span>
                <span>{loading ? 'Вход...' : 'Войти через VK ID (тест)'}</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </button>
            </form>
          )}

          {/* TAB 3: EMAIL AUTH */}
          {tab === 'email' && (
            <form onSubmit={handleEmailAuth} className="space-y-3.5">
              {isSignUp && (
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Ваше имя
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Иван"
                      className="w-full pl-9 pr-3.5 py-2 bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-700/80 rounded-xl text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Электронная почта
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ivan@yandex.ru"
                    className="w-full pl-9 pr-3.5 py-2 bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-700/80 rounded-xl text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Пароль
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3.5 py-2 bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-700/80 rounded-xl text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 mt-2 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 text-white dark:text-zinc-950 font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 text-sm transition transform active:scale-[0.98]"
              >
                <span>{loading ? 'Загрузка...' : isSignUp ? 'Создать аккаунт' : 'Войти в аккаунт'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => { setIsSignUp(!isSignUp); setError(null); setSuccessMsg(null); }}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold"
                >
                  {isSignUp ? 'Уже есть аккаунт? Войти' : 'Нет аккаунта? Зарегистрироваться'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer info */}
        <div className="px-6 py-3 bg-zinc-50 dark:bg-zinc-900/50 border-t border-zinc-100 dark:border-zinc-800/80 text-[11px] text-zinc-400 text-center">
          Авторизация и баланс токенов привязаны к вашей БД Yandex Cloud
        </div>
      </div>
    </div>
  );
};

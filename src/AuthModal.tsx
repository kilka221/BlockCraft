import React, { useState } from 'react';
import { Mail, Lock, User as UserIcon, X, ArrowRight, CheckCircle2, AlertCircle, ShieldAlert } from 'lucide-react';
import { openYandexOAuthPopup } from './yandexAuth';
import { registerYdbUserApi, loginYdbUserApi, syncYdbUser, verifyYdbUserCodeApi, resendVerificationCodeApi } from './ydbClient';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: any) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [tab, setTab] = useState<'yandex' | 'email'>('yandex');
  const [isSignUp, setIsSignUp] = useState(false);
  
  // Email form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  // Email Verification State
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);
  const [verifyingEmailAddress, setVerifyingEmailAddress] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [testCodeHelper, setTestCodeHelper] = useState<string | null>(null);
  
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
        const response = await registerYdbUserApi(email.trim(), password.trim(), name.trim());
        if (response.needsVerification) {
          setVerifyingEmailAddress(response.email);
          setIsVerifyingEmail(true);
          setTestCodeHelper(response.codeForTesting);
          setSuccessMsg('Код подтверждения отправлен на вашу почту!');
        } else {
          localStorage.setItem('blockcraft_yandex_user', JSON.stringify(response.user));
          setSuccessMsg('Регистрация успешна! Аккаунт сохранен в Yandex Cloud DB.');
          onSuccess(response.user);
          setTimeout(() => onClose(), 600);
        }
      } else {
        try {
          const loggedUser = await loginYdbUserApi(email.trim(), password.trim());
          localStorage.setItem('blockcraft_yandex_user', JSON.stringify(loggedUser));
          onSuccess(loggedUser);
          onClose();
        } catch (err: any) {
          if (err.needsVerification) {
            setVerifyingEmailAddress(err.email || email.trim());
            setIsVerifyingEmail(true);
            setSuccessMsg('Пожалуйста, введите код подтверждения почты.');
            
            // Generate and get code for test environment automatically
            try {
              const testCode = await resendVerificationCodeApi(err.email || email.trim());
              setTestCodeHelper(testCode);
            } catch (resendErr) {
              console.warn('Auto-resend on login failed:', resendErr);
            }
          } else {
            throw err;
          }
        }
      }
    } catch (err: any) {
      console.warn('Auth error:', err);
      setError(err.message || 'Ошибка авторизации. Попробуйте еще раз.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!verificationCode.trim()) {
      setError('Пожалуйста, введите 6-значный код');
      return;
    }

    setLoading(true);
    try {
      const verifiedUser = await verifyYdbUserCodeApi(verifyingEmailAddress, verificationCode.trim());
      localStorage.setItem('blockcraft_yandex_user', JSON.stringify(verifiedUser));
      setSuccessMsg('Почта успешно подтверждена! Добро пожаловать!');
      onSuccess(verifiedUser);
      setTimeout(() => onClose(), 700);
    } catch (err: any) {
      setError(err.message || 'Неверный или просроченный код.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setError(null);
    setSuccessMsg(null);
    setLoading(true);
    try {
      const testCode = await resendVerificationCodeApi(verifyingEmailAddress);
      setTestCodeHelper(testCode);
      setSuccessMsg('Новый код подтверждения сгенерирован и отправлен!');
    } catch (err: any) {
      setError(err.message || 'Не удалось переотправить код.');
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
              <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                {isVerifyingEmail ? 'Подтверждение Email' : 'Авторизация в Схематор'}
              </h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                {isVerifyingEmail ? verifyingEmailAddress : '1 бесплатный токен при входе'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selection (only visible when not verifying) */}
        {!isVerifyingEmail && (
          <div className="grid grid-cols-2 p-1.5 mx-6 mt-4 bg-zinc-100 dark:bg-zinc-800/80 rounded-xl gap-1 text-xs font-semibold">
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
              onClick={() => { setTab('email'); setError(null); setSuccessMsg(null); }}
              className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition ${
                tab === 'email' 
                  ? 'bg-white dark:bg-[#2A2A30] text-blue-600 dark:text-blue-400 shadow-sm' 
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Email</span>
            </button>
          </div>
        )}

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

          {/* VERIFICATION SCREEN */}
          {isVerifyingEmail ? (
            <form onSubmit={handleVerifyCodeSubmit} className="space-y-4">
              <div className="p-3.5 bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 rounded-xl text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                Мы отправили шестизначный код подтверждения на почту <strong className="font-semibold">{verifyingEmailAddress}</strong>. 
                Пожалуйста, введите его ниже для активации аккаунта.
              </div>

              {testCodeHelper && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2 animate-pulse">
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                  <div>
                    <span className="font-semibold">Тестовый режим:</span> Введите код <strong className="text-sm font-bold underline text-amber-900 dark:text-amber-200 bg-amber-200/50 dark:bg-amber-800/40 px-1.5 py-0.5 rounded ml-1">{testCodeHelper}</strong> для подтверждения без открытия почты.
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Код подтверждения
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="w-full text-center tracking-[0.5em] text-lg font-bold py-2.5 bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-700/80 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsVerifyingEmail(false);
                    setError(null);
                    setSuccessMsg(null);
                  }}
                  className="w-1/3 py-2.5 text-xs text-zinc-600 dark:text-zinc-300 font-semibold border border-zinc-200 dark:border-zinc-800 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition"
                >
                  Назад
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-2/3 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 text-xs transition transform active:scale-[0.98]"
                >
                  {loading ? 'Проверка...' : 'Подтвердить'}
                </button>
              </div>

              <div className="text-center pt-1.5">
                <button
                  type="button"
                  onClick={handleResendCode}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold"
                >
                  Выслать код повторно
                </button>
              </div>
            </form>
          ) : (
            <>
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

              {/* TAB 2: EMAIL AUTH */}
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
                    className="w-full py-3 mt-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 text-sm transition transform active:scale-[0.98]"
                  >
                    <span>
                      {loading 
                        ? 'Загрузка...' 
                        : isSignUp 
                          ? 'Продолжить регистрацию' 
                          : 'Войти в аккаунт'}
                    </span>
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
            </>
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

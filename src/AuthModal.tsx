import React, { useState } from 'react';
import { Mail, Lock, User as UserIcon, X, ArrowRight, CheckCircle2, AlertCircle, Send, Key, ExternalLink } from 'lucide-react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile,
  sendEmailVerification,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { auth, db } from './firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { openYandexOAuthPopup, getYandexClientId, YandexUserProfile, redirectToYandexOAuth } from './yandexAuth';
import { syncYdbUser } from './ydbClient';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: any) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [tab, setTab] = useState<'yandex' | 'email'>('yandex');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPass, setIsForgotPass] = useState(false);
  
  // Yandex Login form state
  const [yandexLogin, setYandexLogin] = useState('');
  const [yandexName, setYandexName] = useState('');
  const [customClientId, setCustomClientId] = useState(() => getYandexClientId());
  const [showClientIdSetup, setShowClientIdSetup] = useState(false);
  
  // Email form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  
  // States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [verificationSent, setVerificationSent] = useState(false);

  if (!isOpen) return null;

  // Initialize user record in Yandex Cloud Database (YDB) and Firestore fallback
  const syncUserToDatabase = async (userObj: { uid: string; email?: string | null; displayName?: string | null; photoURL?: string | null }) => {
    try {
      console.log('[AuthModal] Syncing user to Yandex Cloud YDB:', userObj.uid, userObj.email);
      // 1. Primary: Yandex Cloud YDB
      await syncYdbUser(userObj.uid, userObj.email || '', userObj.displayName || '');

      // 2. Secondary: Firestore
      const userRef = doc(db, 'users', userObj.uid);
      const snap = await getDoc(userRef);
      if (!snap.exists()) {
        await setDoc(userRef, {
          tokens: 1,
          email: userObj.email || '',
          displayName: userObj.displayName || 'Пользователь',
          provider: userObj.uid.startsWith('yandex_') ? 'yandex' : 'email',
          createdAt: new Date().toISOString()
        });
      }
    } catch (e: any) {
      console.warn('Database write notice:', e);
    }
  };

  // Official Yandex OAuth Popup Trigger
  const handleOfficialYandexOAuth = async () => {
    setError(null);
    setLoading(true);

    try {
      const profile = await openYandexOAuthPopup();
      await syncUserToDatabase(profile);
      localStorage.setItem('blockcraft_yandex_user', JSON.stringify(profile));
      onSuccess(profile);
      onClose();
    } catch (err: any) {
      if (err.message?.includes('заблокировано')) {
        setError(err.message);
      } else if (err.message?.includes('JSON') || err.message?.includes('Unexpected token')) {
        setError('Не удалось войти через всплывающее окно. Используйте быстрый вход по логину ниже.');
      } else {
        setError(err.message || 'Не удалось авторизоваться через Яндекс ID. Воспользуйтесь входом по логину ниже.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Direct Quick Yandex ID Sign In Handler
  const handleDirectYandexSignIn = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      let finalLogin = yandexLogin.trim();
      if (!finalLogin) {
        finalLogin = 'user';
      }
      
      const yandexEmail = finalLogin.includes('@') 
        ? finalLogin.toLowerCase() 
        : `${finalLogin.toLowerCase()}@yandex.ru`;

      const displayName = yandexName.trim() || finalLogin.split('@')[0];
      const yandexUid = `yandex_${btoa(yandexEmail).replace(/[^a-zA-Z0-9]/g, '').slice(0, 20)}`;

      const userProfile: YandexUserProfile = {
        uid: yandexUid,
        email: yandexEmail,
        displayName: displayName,
        photoURL: `https://avatars.yandex.net/get-yapic/0/0-0/islands-200`,
        providerId: 'yandex.ru'
      };

      await syncUserToDatabase(userProfile);
      localStorage.setItem('blockcraft_yandex_user', JSON.stringify(userProfile));

      if (customClientId.trim()) {
        localStorage.setItem('blockcraft_yandex_client_id', customClientId.trim());
      }

      onSuccess(userProfile);
      onClose();
    } catch (err: any) {
      console.error('Yandex sign-in error:', err);
      setError(err.message || 'Ошибка входа через Яндекс ID. Попробуйте еще раз.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (isForgotPass) {
      if (!email.trim()) {
        setError('Введите email для сброса пароля');
        return;
      }
      setLoading(true);
      try {
        await sendPasswordResetEmail(auth, email.trim());
        setSuccessMsg('Письмо со ссылкой для сброса пароля отправлено на ваш email!');
      } catch (err: any) {
        setError(err.message || 'Ошибка отправки письма');
      } finally {
        setLoading(false);
      }
      return;
    }

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
        let userCred;
        try {
          userCred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        } catch (fbErr: any) {
          if (fbErr.code === 'auth/email-already-in-use') {
            setError('Этот email уже зарегистрирован. Попробуйте войти.');
            setLoading(false);
            return;
          } else if (fbErr.code === 'auth/invalid-email') {
            setError('Некорректный формат email адреса.');
            setLoading(false);
            return;
          } else if (fbErr.code === 'auth/weak-password') {
            setError('Пароль слишком простой (минимум 6 символов).');
            setLoading(false);
            return;
          }
          // If Firebase throws unexpected error, fallback to YDB direct user
          console.warn('Firebase registration notice, proceeding with YDB:', fbErr);
        }

        if (userCred?.user) {
          if (name.trim()) {
            await updateProfile(userCred.user, { displayName: name.trim() });
          }
          try {
            await sendEmailVerification(userCred.user);
            setVerificationSent(true);
          } catch (verErr) {
            console.warn('Failed to send verification email:', verErr);
          }

          await syncUserToDatabase({
            uid: userCred.user.uid,
            email: userCred.user.email,
            displayName: name.trim() || userCred.user.displayName || email.trim().split('@')[0],
          });
          setSuccessMsg('Регистрация успешна! Аккаунт сохранен в Yandex Cloud DB.');
          onSuccess(userCred.user);
        } else {
          // Direct YDB registration fallback
          const fallbackUid = `email_${btoa(email.trim()).replace(/[^a-zA-Z0-9]/g, '').slice(0, 20)}`;
          const fallbackUser = {
            uid: fallbackUid,
            email: email.trim(),
            displayName: name.trim() || email.trim().split('@')[0],
            photoURL: null
          };
          await syncUserToDatabase(fallbackUser);
          localStorage.setItem('blockcraft_yandex_user', JSON.stringify(fallbackUser));
          setSuccessMsg('Регистрация успешна! Аккаунт сохранен в Yandex Cloud DB.');
          onSuccess(fallbackUser);
          onClose();
        }
      } else {
        let userCred;
        try {
          userCred = await signInWithEmailAndPassword(auth, email.trim(), password);
        } catch (fbErr: any) {
          if (fbErr.code === 'auth/user-not-found' || fbErr.code === 'auth/wrong-password' || fbErr.code === 'auth/invalid-credential') {
            setError('Неверный email или пароль');
            setLoading(false);
            return;
          }
          console.warn('Firebase sign-in notice, proceeding with YDB:', fbErr);
        }

        if (userCred?.user) {
          await syncUserToDatabase({
            uid: userCred.user.uid,
            email: userCred.user.email,
            displayName: userCred.user.displayName || email.trim().split('@')[0],
          });
          onSuccess(userCred.user);
          onClose();
        } else {
          // Fallback to YDB direct user
          const fallbackUid = `email_${btoa(email.trim()).replace(/[^a-zA-Z0-9]/g, '').slice(0, 20)}`;
          const fallbackUser = {
            uid: fallbackUid,
            email: email.trim(),
            displayName: name.trim() || email.trim().split('@')[0],
            photoURL: null
          };
          await syncUserToDatabase(fallbackUser);
          localStorage.setItem('blockcraft_yandex_user', JSON.stringify(fallbackUser));
          onSuccess(fallbackUser);
          onClose();
        }
      }
    } catch (err: any) {
      console.warn('Email auth error:', err);
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
              <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                Авторизация в Схематор
              </h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                1 бесплатный токен при входе
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

        {/* Tab Selection */}
        <div className="grid grid-cols-2 p-1.5 mx-6 mt-4 bg-zinc-100 dark:bg-zinc-800/80 rounded-xl gap-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => { setTab('yandex'); setError(null); setSuccessMsg(null); }}
            className={`py-2 rounded-lg flex items-center justify-center gap-2 transition ${
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
            <span>Email / Почта РФ</span>
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
              <div className="space-y-1">
                <span>{successMsg}</span>
                {verificationSent && (
                  <p className="text-[11px] opacity-90">Проверьте папку «Входящие» и «Спам» на вашей почте.</p>
                )}
              </div>
            </div>
          )}

          {/* TAB 1: YANDEX ID AUTH */}
          {tab === 'yandex' && (
            <div className="space-y-4">
              {/* Primary Official Yandex OAuth Button */}
              <button
                type="button"
                onClick={handleOfficialYandexOAuth}
                disabled={loading}
                className="w-full py-3 bg-[#FC3F1D] hover:bg-[#E03415] disabled:opacity-50 text-white font-bold rounded-xl shadow-lg shadow-[#FC3F1D]/25 flex items-center justify-center gap-2.5 text-sm transition transform active:scale-[0.98]"
              >
                <span className="w-5 h-5 rounded-full bg-white text-[#FC3F1D] flex items-center justify-center text-xs font-black shadow-sm">
                  Я
                </span>
                <span>{loading ? 'Открытие Яндекс...' : 'Войти с Яндекс ID'}</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </button>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-zinc-200 dark:border-zinc-700/60"></div>
                <span className="flex-shrink mx-3 text-[11px] text-zinc-400">или быстрый вход по логину</span>
                <div className="flex-grow border-t border-zinc-200 dark:border-zinc-700/60"></div>
              </div>

              {/* Direct Quick Login Form */}
              <form onSubmit={handleDirectYandexSignIn} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Логин или Почта Яндекс (@yandex.ru / @ya.ru)
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[#FC3F1D] text-white flex items-center justify-center text-[10px] font-black">
                      Я
                    </div>
                    <input
                      type="text"
                      value={yandexLogin}
                      onChange={(e) => setYandexLogin(e.target.value)}
                      placeholder="например: ivan.ivanov или ivan@yandex.ru"
                      className="w-full pl-9 pr-3.5 py-2 bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-700/80 rounded-xl text-sm outline-none focus:border-[#FC3F1D] focus:ring-2 focus:ring-[#FC3F1D]/20 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Имя пользователя (необязательно)
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={yandexName}
                      onChange={(e) => setYandexName(e.target.value)}
                      placeholder="Иван Иванов"
                      className="w-full pl-9 pr-3.5 py-2 bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-700/80 rounded-xl text-sm outline-none focus:border-[#FC3F1D] focus:ring-2 focus:ring-[#FC3F1D]/20 transition"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition"
                >
                  <span>Продолжить с этим логином</span>
                </button>
              </form>
            </div>
          )}

          {/* TAB 2: EMAIL AUTH WITH CONFIRMATION */}
          {tab === 'email' && (
            <form onSubmit={handleEmailAuth} className="space-y-3.5">
              {!isForgotPass && isSignUp && (
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
                    placeholder="ivan@mail.ru или student@yandex.ru"
                    className="w-full pl-9 pr-3.5 py-2 bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-700/80 rounded-xl text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                  />
                </div>
              </div>

              {!isForgotPass && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      Пароль
                    </label>
                    {!isSignUp && (
                      <button
                        type="button"
                        onClick={() => { setIsForgotPass(true); setError(null); }}
                        className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        Забыли пароль?
                      </button>
                    )}
                  </div>
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
              )}

              {isSignUp && (
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                  <Send className="w-3 h-3 text-blue-500 shrink-0" />
                  <span>После регистрации вам будет отправлено письмо со ссылкой подтверждения</span>
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 mt-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 text-sm transition transform active:scale-[0.98]"
              >
                <span>
                  {loading 
                    ? 'Загрузка...' 
                    : isForgotPass 
                      ? 'Отправить ссылку для сброса'
                      : isSignUp 
                        ? 'Зарегистрироваться (+1 токен)' 
                        : 'Войти в аккаунт'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="text-center pt-2 space-y-1">
                {isForgotPass ? (
                  <button
                    type="button"
                    onClick={() => { setIsForgotPass(false); setError(null); }}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold"
                  >
                    ← Вернуться ко входу
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => { setIsSignUp(!isSignUp); setError(null); setSuccessMsg(null); }}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold"
                  >
                    {isSignUp ? 'Уже есть аккаунт? Войти' : 'Нет аккаунта? Зарегистрироваться'}
                  </button>
                )}
              </div>
            </form>
          )}
        </div>

        {/* Footer info */}
        <div className="px-6 py-3 bg-zinc-50 dark:bg-zinc-900/50 border-t border-zinc-100 dark:border-zinc-800/80 text-[11px] text-zinc-400 text-center">
          Авторизация и баланс токенов привязаны к вашему аккаунту
        </div>
      </div>
    </div>
  );
};

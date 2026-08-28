import React, { useState } from 'react';
import { Mail, Lock, User as UserIcon, X, ArrowRight, CheckCircle2, AlertCircle, RefreshCw, Send } from 'lucide-react';
import { 
  signInWithPopup,
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile,
  sendEmailVerification,
  sendPasswordResetEmail,
  User
} from 'firebase/auth';
import { auth, googleProvider, db } from './firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: User) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [tab, setTab] = useState<'google' | 'email'>('google');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPass, setIsForgotPass] = useState(false);
  
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

  // Initialize doc in Firestore
  const syncUserToFirestore = async (user: User) => {
    try {
      const userRef = doc(db, 'users', user.uid);
      const snap = await getDoc(userRef);
      if (!snap.exists()) {
        await setDoc(userRef, {
          tokens: 1,
          email: user.email || '',
          displayName: user.displayName || name.trim() || 'Пользователь',
          emailVerified: user.emailVerified,
          createdAt: new Date().toISOString()
        });
      }
    } catch (e: any) {
      console.warn('Firestore write notice:', e);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setSuccessMsg(null);
    setLoading(true);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      if (cred.user) {
        await syncUserToFirestore(cred.user);
        onSuccess(cred.user);
        onClose();
      }
    } catch (err: any) {
      console.warn('Google sign-in error:', err);
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        return;
      }
      if (err.message?.includes('Pending promise was never set')) {
        return;
      }
      if (err.code === 'auth/popup-blocked') {
        setError('Окно входа заблокировано браузером. Разрешите всплывающие окна для этого сайта.');
      } else if (err.code === 'auth/unauthorized-domain') {
        setError('Домен приложения не добавлен в список авторизованных в Firebase Auth Console.');
      } else {
        setError(err.message || 'Ошибка входа через Google. Попробуйте войти по Email.');
      }
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
        // Registration
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        if (cred.user) {
          if (name.trim()) {
            await updateProfile(cred.user, { displayName: name.trim() });
          }
          // Send email verification link
          try {
            await sendEmailVerification(cred.user);
            setVerificationSent(true);
          } catch (verErr) {
            console.warn('Failed to send verification email:', verErr);
          }

          await syncUserToFirestore(cred.user);
          setSuccessMsg('Регистрация успешна! На ваш email отправлено письмо с подтверждением почты.');
          onSuccess(cred.user);
        }
      } else {
        // Login
        const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
        if (cred.user) {
          await syncUserToFirestore(cred.user);
          onSuccess(cred.user);
          onClose();
        }
      }
    } catch (err: any) {
      console.warn('Email auth error:', err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Неверный email или пароль');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('Этот email уже зарегистрирован. Переключитесь на форму входа.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Некорректный формат email адреса');
      } else {
        setError(err.message || 'Ошибка авторизации');
      }
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
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-sm shadow-md shadow-blue-500/20">
              G
            </div>
            <div>
              <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                Авторизация в GOST.FLOW
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
            onClick={() => { setTab('google'); setError(null); setSuccessMsg(null); }}
            className={`py-2 rounded-lg flex items-center justify-center gap-2 transition ${
              tab === 'google' 
                ? 'bg-white dark:bg-[#2A2A30] text-zinc-900 dark:text-white shadow-sm' 
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            {/* Google Icon */}
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            <span>Google аккаунт</span>
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
            <span>Email с подтверждением</span>
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

          {/* TAB 1: GOOGLE AUTH */}
          {tab === 'google' && (
            <div className="space-y-4 py-2">
              <div className="p-3.5 bg-blue-50/70 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 rounded-xl text-xs text-blue-800 dark:text-blue-300 leading-relaxed">
                Быстрый и безопасный вход в один клик. При первой авторизации начисляется <strong>1 бесплатный токен</strong> для создания блок-схем.
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full py-3 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700/80 border border-zinc-300 dark:border-zinc-700 disabled:opacity-50 text-zinc-800 dark:text-zinc-100 font-bold rounded-xl shadow-sm flex items-center justify-center gap-3 text-sm transition transform active:scale-[0.98]"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <span>{loading ? 'Подключение к Google...' : 'Войти через Google (+1 токен)'}</span>
              </button>
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
                    placeholder="student@example.com"
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
          Данные и баланс токенов сохраняются в базе Cloud Firestore
        </div>
      </div>
    </div>
  );
};

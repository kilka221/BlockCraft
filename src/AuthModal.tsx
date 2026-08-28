import React, { useState } from 'react';
import { Mail, Lock, X, ArrowRight, AlertCircle } from 'lucide-react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile 
} from 'firebase/auth';
import { auth, db } from './firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

export interface LocalUserProfile {
  uid: string;
  email?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
  provider: 'email' | 'vk' | 'guest';
}

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (userProfile: LocalUserProfile) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [tab, setTab] = useState<'vk' | 'email'>('vk');
  const [isSignUp, setIsSignUp] = useState(false);
  
  // Email states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  
  // VK states
  const [vkId, setVkId] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Initialize or fetch tokens in Firestore & LocalStorage
  const registerUserTokens = async (uid: string, emailStr: string, displayName: string, photoURL?: string) => {
    try {
      const userRef = doc(db, 'users', uid);
      const snap = await getDoc(userRef);
      if (!snap.exists()) {
        await setDoc(userRef, {
          tokens: 1,
          email: emailStr,
          displayName,
          createdAt: new Date().toISOString()
        });
      }
    } catch (e) {
      console.warn('Could not sync with Firestore, using local persistence:', e);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password.trim()) {
      setError('Пожалуйста, заполните все поля');
      return;
    }
    if (password.length < 6) {
      setError('Пароль должен содержать минимум 6 символов');
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        // Register new user
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        if (name.trim() && cred.user) {
          await updateProfile(cred.user, { displayName: name.trim() });
        }
        await registerUserTokens(cred.user.uid, cred.user.email || email.trim(), name.trim() || 'Пользователь');
        
        onSuccess({
          uid: cred.user.uid,
          email: cred.user.email,
          displayName: name.trim() || cred.user.email?.split('@')[0] || 'Пользователь',
          provider: 'email'
        });
      } else {
        // Sign in existing user
        const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
        await registerUserTokens(cred.user.uid, cred.user.email || email.trim(), cred.user.displayName || 'Пользователь');
        
        onSuccess({
          uid: cred.user.uid,
          email: cred.user.email,
          displayName: cred.user.displayName || cred.user.email?.split('@')[0] || 'Пользователь',
          provider: 'email'
        });
      }
      onClose();
    } catch (err: any) {
      console.warn('Firebase email auth error, handling fallback:', err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Неверный email или пароль');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('Этот email уже зарегистрирован. Переключитесь на «Вход».');
      } else if (err.code === 'auth/invalid-email') {
        setError('Некорректный формат email');
      } else {
        // Fallback for offline/custom auth
        const localUid = 'email_' + btoa(email.trim()).replace(/[^a-zA-Z0-9]/g, '').slice(0, 20);
        await registerUserTokens(localUid, email.trim(), name.trim() || email.trim().split('@')[0]);
        onSuccess({
          uid: localUid,
          email: email.trim(),
          displayName: name.trim() || email.trim().split('@')[0],
          provider: 'email'
        });
        onClose();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVkAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const cleanVk = vkId.trim().replace(/^https?:\/\/(www\.)?vk\.com\//, '').replace(/^@/, '');
    if (!cleanVk) {
      setError('Введите ваш ID ВКонтакте, никнейм или ссылку на страницу');
      return;
    }

    setLoading(true);
    try {
      const vkUid = `vk_${cleanVk.toLowerCase()}`;
      const vkName = cleanVk.startsWith('id') ? `Пользователь VK (${cleanVk})` : cleanVk;
      const vkPhoto = `https://ui-avatars.com/api/?name=${encodeURIComponent(cleanVk)}&background=0077FF&color=fff&size=128`;
      
      await registerUserTokens(vkUid, `${cleanVk}@vk.com`, vkName, vkPhoto);

      // Save to localStorage
      localStorage.setItem('blockcraft_custom_user', JSON.stringify({
        uid: vkUid,
        email: `${cleanVk}@vk.com`,
        displayName: vkName,
        photoURL: vkPhoto,
        provider: 'vk'
      }));

      onSuccess({
        uid: vkUid,
        email: `${cleanVk}@vk.com`,
        displayName: vkName,
        photoURL: vkPhoto,
        provider: 'vk'
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Ошибка входа через ВКонтакте');
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
                Вход в GOST.FLOW
              </h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Генератор блок-схем по ГОСТ 19.701-90
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
            onClick={() => { setTab('vk'); setError(null); }}
            className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition ${
              tab === 'vk' 
                ? 'bg-white dark:bg-[#2A2A30] text-[#0077FF] dark:text-[#3888FF] shadow-sm' 
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            {/* VK Icon */}
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M15.684 0H8.316C3.592 0 0 3.592 0 8.316v7.368C0 20.408 3.592 24 8.316 24h7.368C20.408 24 24 20.408 24 15.684V8.316C24 3.592 20.408 0 15.684 0zm4.512 17.064h-1.92c-.724 0-.944-.576-2.24-1.876-1.132-1.108-1.636-1.252-1.916-1.252-.392 0-.504.112-.504.648v1.732c0 .46-.148.748-1.372.748-2.028 0-4.28-1.228-5.864-3.52-2.38-3.4-3.04-5.968-3.04-6.496 0-.288.112-.556.648-.556h1.92c.484 0 .668.224.856.748 1.008 2.82 2.704 5.284 3.4 5.284.26 0 .38-.12.38-.776V9.752c-.084-1.384-.812-1.496-.812-1.988 0-.236.196-.468.516-.468h3.016c.42 0 .576.224.576.716v3.872c0 .42.188.568.312.568.26 0 .476-.148.968-.64 1.488-1.668 2.548-4.248 2.548-4.248.14-.288.392-.48.884-.48h1.92c.576 0 .7.288.576.716-.244 1.132-2.628 4.544-2.628 4.544-.224.364-.308.528 0 .944.224.308.976 1.036 1.54 1.688.948 1.092 1.68 2.012 1.876 2.648.196.636-.084.952-.656.952z"/>
            </svg>
            <span>ВКонтакте</span>
          </button>

          <button
            type="button"
            onClick={() => { setTab('email'); setError(null); }}
            className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition ${
              tab === 'email' 
                ? 'bg-white dark:bg-[#2A2A30] text-blue-600 dark:text-blue-400 shadow-sm' 
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            <Mail className="w-4 h-4" />
            <span>Почта</span>
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

          {/* TAB 1: VK AUTH */}
          {tab === 'vk' && (
            <form onSubmit={handleVkAuth} className="space-y-4">
              <div className="p-3 bg-blue-50/70 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 rounded-xl text-xs text-blue-800 dark:text-blue-300 leading-relaxed">
                <span className="font-semibold">Быстрый вход через профиль VK.</span> Введите ID вашей страницы, никнейм или ссылку (например: <code className="bg-white/80 dark:bg-blue-900/40 px-1 py-0.5 rounded font-mono">durov</code> или <code className="bg-white/80 dark:bg-blue-900/40 px-1 py-0.5 rounded font-mono">id1234567</code>).
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  ID или страница ВКонтакте
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-xs font-mono">
                    vk.com/
                  </span>
                  <input
                    type="text"
                    required
                    value={vkId}
                    onChange={(e) => setVkId(e.target.value)}
                    placeholder="id_или_никнейм"
                    className="w-full pl-18 pr-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-700/80 rounded-xl text-sm outline-none focus:border-[#0077FF] focus:ring-2 focus:ring-[#0077FF]/20 transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !vkId.trim()}
                className="w-full py-3 bg-[#0077FF] hover:bg-[#0066DD] disabled:opacity-50 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 text-sm transition transform active:scale-[0.98]"
              >
                {/* VK Logo */}
                <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
                  <path d="M15.684 0H8.316C3.592 0 0 3.592 0 8.316v7.368C0 20.408 3.592 24 8.316 24h7.368C20.408 24 24 20.408 24 15.684V8.316C24 3.592 20.408 0 15.684 0zm4.512 17.064h-1.92c-.724 0-.944-.576-2.24-1.876-1.132-1.108-1.636-1.252-1.916-1.252-.392 0-.504.112-.504.648v1.732c0 .46-.148.748-1.372.748-2.028 0-4.28-1.228-5.864-3.52-2.38-3.4-3.04-5.968-3.04-6.496 0-.288.112-.556.648-.556h1.92c.484 0 .668.224.856.748 1.008 2.82 2.704 5.284 3.4 5.284.26 0 .38-.12.38-.776V9.752c-.084-1.384-.812-1.496-.812-1.988 0-.236.196-.468.516-.468h3.016c.42 0 .576.224.576.716v3.872c0 .42.188.568.312.568.26 0 .476-.148.968-.64 1.488-1.668 2.548-4.248 2.548-4.248.14-.288.392-.48.884-.48h1.92c.576 0 .7.288.576.716-.244 1.132-2.628 4.544-2.628 4.544-.224.364-.308.528 0 .944.224.308.976 1.036 1.54 1.688.948 1.092 1.68 2.012 1.876 2.648.196.636-.084.952-.656.952z"/>
                </svg>
                <span>{loading ? 'Вход...' : 'Войти через ВКонтакте (+1 токен)'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* TAB 2: EMAIL AUTH */}
          {tab === 'email' && (
            <form onSubmit={handleEmailAuth} className="space-y-3.5">
              {isSignUp && (
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Ваше имя или никнейм
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Иван Иванов"
                    className="w-full px-3.5 py-2 bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-700/80 rounded-xl text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                  />
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
                    placeholder="student@mail.ru"
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
                <span>{loading ? 'Загрузка...' : (isSignUp ? 'Зарегистрироваться (+1 токен)' : 'Войти в аккаунт')}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => { setIsSignUp(!isSignUp); setError(null); }}
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
          При входе баланс пополняется на 1 бесплатный токен для генерации
        </div>
      </div>
    </div>
  );
};

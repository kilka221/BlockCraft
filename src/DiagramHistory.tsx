import React, { useState, useEffect } from 'react';
import { 
  History, 
  Pin, 
  PinOff, 
  Trash2, 
  Edit3, 
  Check, 
  X, 
  Clock, 
  Search, 
  ChevronDown, 
  ChevronUp, 
  LogIn, 
  Sparkles, 
  Plus, 
  FileCode2,
  ExternalLink,
  Code2,
  FolderOpen
} from 'lucide-react';
import { 
  collection, 
  doc, 
  onSnapshot, 
  setDoc, 
  deleteDoc, 
  updateDoc, 
  query, 
  orderBy, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from './firebase';
import { AppUserProfile } from './App';

export interface SavedDiagram {
  id: string;
  userId: string;
  title: string;
  code: string;
  language: 'python' | 'cpp';
  createdAt: string;
  updatedAt: string;
  isPinned?: boolean;
}

interface DiagramHistoryProps {
  user: AppUserProfile | null;
  currentCode: string;
  currentLanguage: string;
  onSelectDiagram: (code: string, language: 'python' | 'cpp') => void;
  onOpenLogin: () => void;
  onNotify: (msg: string) => void;
}

export const DiagramHistory: React.FC<DiagramHistoryProps> = ({
  user,
  currentCode,
  currentLanguage,
  onSelectDiagram,
  onOpenLogin,
  onNotify,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [diagrams, setDiagrams] = useState<SavedDiagram[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitleText, setEditTitleText] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isSavingCurrent, setIsSavingCurrent] = useState(false);
  const [customSaveTitle, setCustomSaveTitle] = useState('');
  const [showSaveInput, setShowSaveInput] = useState(false);

  // Firestore synchronization
  useEffect(() => {
    if (!user) {
      // Local fallback if not logged in
      try {
        const saved = localStorage.getItem('blockcraft_local_history');
        if (saved) {
          setDiagrams(JSON.parse(saved));
        } else {
          setDiagrams([]);
        }
      } catch {
        setDiagrams([]);
      }
      return;
    }

    try {
      const diagColRef = collection(db, 'users', user.uid, 'diagrams');
      const q = query(diagColRef);
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const items: SavedDiagram[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          items.push({
            id: docSnap.id,
            userId: data.userId || user.uid,
            title: data.title || 'Безымянная схема',
            code: data.code || '',
            language: (data.language === 'cpp' ? 'cpp' : 'python') as 'python' | 'cpp',
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: data.updatedAt || data.createdAt || new Date().toISOString(),
            isPinned: !!data.isPinned,
          });
        });

        // Sort: pinned first, then by updatedAt/createdAt descending
        items.sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          const timeA = new Date(a.updatedAt || a.createdAt).getTime();
          const timeB = new Date(b.updatedAt || b.createdAt).getTime();
          return timeB - timeA;
        });

        setDiagrams(items);
      }, (error) => {
        console.warn('Diagrams snapshot error:', error);
      });

      return () => unsubscribe();
    } catch (err) {
      console.warn('Error setting up diagrams listener:', err);
    }
  }, [user]);

  // Save current code as a new diagram in history
  const handleSaveCurrent = async () => {
    if (!currentCode.trim()) {
      onNotify('Редактор пуст — нечего сохранять');
      return;
    }

    const title = customSaveTitle.trim() || generateDefaultTitle(currentCode, currentLanguage);
    const now = new Date().toISOString();
    const id = `diag_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const lang = (currentLanguage === 'cpp' ? 'cpp' : 'python') as 'python' | 'cpp';

    const newDiagram: SavedDiagram = {
      id,
      userId: user?.uid || 'anonymous',
      title,
      code: currentCode,
      language: lang,
      createdAt: now,
      updatedAt: now,
      isPinned: false,
    };

    if (user) {
      try {
        const docRef = doc(db, 'users', user.uid, 'diagrams', id);
        await setDoc(docRef, newDiagram);
        onNotify(`Схема «${title}» сохранена в историю`);
      } catch (e) {
        console.error('Error saving to Firestore:', e);
        onNotify('Ошибка сохранения в облако');
      }
    } else {
      // Save locally
      const updated = [newDiagram, ...diagrams];
      setDiagrams(updated);
      localStorage.setItem('blockcraft_local_history', JSON.stringify(updated));
      onNotify(`Схема «${title}» сохранена локально`);
    }

    setCustomSaveTitle('');
    setShowSaveInput(false);
  };

  // Helper to extract a smart title from code
  const generateDefaultTitle = (sourceCode: string, lang: string) => {
    const lines = sourceCode.split('\n').map(l => l.trim()).filter(Boolean);
    for (const line of lines) {
      // Match Python def function_name
      const pyFunc = line.match(/^def\s+([a-zA-Z0-9_]+)\s*\(/);
      if (pyFunc) return `Функция ${pyFunc[1]}()`;
      
      // Match C++ function
      const cppFunc = line.match(/^(?:int|void|double|float|bool|string|auto)\s+([a-zA-Z0-9_]+)\s*\(/);
      if (cppFunc) return `Функция ${cppFunc[1]}()`;
    }
    
    // First non-empty comment or first line
    if (lines[0]) {
      const clean = lines[0].replace(/^[#//*\s]+/, '').slice(0, 30);
      if (clean) return clean;
    }

    const dateStr = new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    return `Схема ${lang === 'cpp' ? 'C++' : 'Python'} (${dateStr})`;
  };

  // Toggle Pin
  const handleTogglePin = async (diagram: SavedDiagram, e: React.MouseEvent) => {
    e.stopPropagation();
    const newPinned = !diagram.isPinned;

    if (user) {
      try {
        const docRef = doc(db, 'users', user.uid, 'diagrams', diagram.id);
        await updateDoc(docRef, {
          isPinned: newPinned,
          updatedAt: new Date().toISOString()
        });
        onNotify(newPinned ? 'Схема закреплена вверху' : 'Схема откреплена');
      } catch (err) {
        console.error('Error toggling pin:', err);
      }
    } else {
      const updated = diagrams.map(d => d.id === diagram.id ? { ...d, isPinned: newPinned } : d);
      updated.sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));
      setDiagrams(updated);
      localStorage.setItem('blockcraft_local_history', JSON.stringify(updated));
    }
  };

  // Start Rename
  const handleStartRename = (diagram: SavedDiagram, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(diagram.id);
    setEditTitleText(diagram.title);
  };

  // Save Rename
  const handleSaveRename = async (diagram: SavedDiagram, e?: React.MouseEvent | React.FormEvent) => {
    if (e) e.stopPropagation();
    const newTitle = editTitleText.trim();
    if (!newTitle) {
      setEditingId(null);
      return;
    }

    if (user) {
      try {
        const docRef = doc(db, 'users', user.uid, 'diagrams', diagram.id);
        await updateDoc(docRef, {
          title: newTitle,
          updatedAt: new Date().toISOString()
        });
        onNotify(`Схема переименована в «${newTitle}»`);
      } catch (err) {
        console.error('Error renaming diagram:', err);
      }
    } else {
      const updated = diagrams.map(d => d.id === diagram.id ? { ...d, title: newTitle, updatedAt: new Date().toISOString() } : d);
      setDiagrams(updated);
      localStorage.setItem('blockcraft_local_history', JSON.stringify(updated));
    }
    setEditingId(null);
  };

  // Delete diagram
  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (user) {
      try {
        const docRef = doc(db, 'users', user.uid, 'diagrams', id);
        await deleteDoc(docRef);
        onNotify('Схема удалена из истории');
      } catch (err) {
        console.error('Error deleting diagram:', err);
      }
    } else {
      const updated = diagrams.filter(d => d.id !== id);
      setDiagrams(updated);
      localStorage.setItem('blockcraft_local_history', JSON.stringify(updated));
      onNotify('Схема удалена');
    }
    setDeletingId(null);
  };

  // Filtered diagrams
  const filteredDiagrams = diagrams.filter(d => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return d.title.toLowerCase().includes(q) || d.code.toLowerCase().includes(q) || d.language.includes(q);
  });

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      const now = new Date();
      const isToday = d.toDateString() === now.toDateString();
      if (isToday) {
        return `Сегодня, ${d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
      }
      return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div className="fixed bottom-12 right-6 z-40 flex flex-col items-end">
      {/* Expanded History Modal / Panel */}
      {isOpen && (
        <div 
          className="mb-3 w-[380px] sm:w-[420px] max-h-[560px] bg-white dark:bg-[#1a1b20] border border-zinc-200 dark:border-zinc-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200"
          style={{ boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.3)' }}
        >
          {/* Header */}
          <div className="px-4 py-3 bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-700/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                <History className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 leading-none">
                  История блок-схем
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-semibold">
                    {diagrams.length}
                  </span>
                </h3>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                  {user ? (user.email || user.displayName || 'Личный аккаунт') : 'Локальное сохранение'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowSaveInput(!showSaveInput)}
                title="Сохранить текущий код в историю"
                className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                  showSaveInput 
                    ? 'bg-blue-600 text-white' 
                    : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                }`}
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline text-xs">Сохранить</span>
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Save Current Input */}
          {showSaveInput && (
            <div className="p-3 bg-blue-50/70 dark:bg-blue-950/30 border-b border-blue-100 dark:border-blue-900/40">
              <div className="text-[11px] font-semibold text-blue-900 dark:text-blue-200 mb-1.5 flex items-center justify-between">
                <span>Сохранить текущую блок-схему:</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-200/60 dark:bg-blue-800/60 uppercase font-mono">
                  {currentLanguage}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Название (например: Алгоритм Дейкстры)"
                  value={customSaveTitle}
                  onChange={(e) => setCustomSaveTitle(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSaveCurrent(); }}
                  className="flex-1 px-2.5 py-1.5 text-xs bg-white dark:bg-zinc-900 border border-blue-200 dark:border-blue-800 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
                <button
                  onClick={handleSaveCurrent}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm transition shrink-0"
                >
                  OK
                </button>
                <button
                  onClick={() => setShowSaveInput(false)}
                  className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Non-authenticated banner notice */}
          {!user && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900/60 flex items-center justify-between gap-3 text-xs">
              <div className="text-amber-800 dark:text-amber-300 text-[11px] leading-tight">
                Войдите в аккаунт, чтобы история синхронизировалась с облаком.
              </div>
              <button
                onClick={() => { onOpenLogin(); setIsOpen(false); }}
                className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-md font-bold text-[11px] shrink-0 shadow-sm"
              >
                Войти
              </button>
            </div>
          )}

          {/* Search bar */}
          {diagrams.length > 2 && (
            <div className="p-2 border-b border-zinc-100 dark:border-zinc-800 bg-white dark:bg-[#1a1b20]">
              <div className="relative flex items-center">
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Поиск по названию или коду..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-7 py-1 text-xs bg-zinc-100 dark:bg-zinc-800/80 border border-transparent focus:border-blue-500 rounded-lg text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 focus:outline-none"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 text-zinc-400 hover:text-zinc-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Diagrams list */}
          <div className="flex-1 overflow-y-auto p-2 space-y-2 max-h-[380px] custom-scrollbar">
            {filteredDiagrams.length === 0 ? (
              <div className="py-10 text-center flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-500 px-4">
                <FolderOpen className="w-10 h-10 mb-2 stroke-[1.2] opacity-60" />
                <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                  {searchQuery ? 'Ничего не найдено' : 'История пуста'}
                </p>
                <p className="text-[11px] text-zinc-400 mt-1 max-w-[240px]">
                  {searchQuery 
                    ? 'Попробуйте изменить поисковый запрос' 
                    : 'При каждом создании блок-схемы она автоматически сохраняется в этот список'}
                </p>
              </div>
            ) : (
              filteredDiagrams.map((diag) => {
                const isEditing = editingId === diag.id;
                const isDeleting = deletingId === diag.id;
                const lines = diag.code.split('\n').filter(Boolean);
                const previewSnippet = lines.slice(0, 2).join('\n');

                return (
                  <div
                    key={diag.id}
                    onClick={() => {
                      if (!isEditing && !isDeleting) {
                        onSelectDiagram(diag.code, diag.language);
                        onNotify(`Загружена схема: ${diag.title}`);
                        setIsOpen(false);
                      }
                    }}
                    className={`group relative p-2.5 rounded-xl border transition cursor-pointer select-none ${
                      diag.isPinned
                        ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-200/80 dark:border-amber-800/40 hover:border-amber-400 dark:hover:border-amber-700'
                        : 'bg-zinc-50/80 dark:bg-zinc-800/40 border-zinc-200/70 dark:border-zinc-700/50 hover:bg-white dark:hover:bg-zinc-800 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-sm'
                    }`}
                  >
                    {/* Top row with badges and actions */}
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5 overflow-hidden">
                        {diag.isPinned && (
                          <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 text-[10px] font-bold shrink-0">
                            <Pin className="w-2.5 h-2.5 fill-amber-500 text-amber-600 dark:text-amber-300" />
                            Закреплено
                          </span>
                        )}
                        <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded uppercase shrink-0 ${
                          diag.language === 'cpp' 
                            ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300' 
                            : 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300'
                        }`}>
                          {diag.language}
                        </span>
                        <span className="text-[10px] text-zinc-400 truncate">
                          {formatDate(diag.updatedAt || diag.createdAt)}
                        </span>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-0.5 opacity-80 group-hover:opacity-100 transition" onClick={(e) => e.stopPropagation()}>
                        {/* Pin / Unpin button */}
                        <button
                          onClick={(e) => handleTogglePin(diag, e)}
                          title={diag.isPinned ? 'Открепить' : 'Закрепить вверху'}
                          className={`p-1 rounded-md transition ${
                            diag.isPinned 
                              ? 'text-amber-600 dark:text-amber-400 bg-amber-100/60 dark:bg-amber-900/40' 
                              : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                          }`}
                        >
                          {diag.isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                        </button>

                        {/* Rename button */}
                        <button
                          onClick={(e) => handleStartRename(diag, e)}
                          title="Переименовать"
                          className="p-1 rounded-md text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingId(diag.id);
                          }}
                          title="Удалить"
                          className="p-1 rounded-md text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Title or Inline Edit */}
                    {isEditing ? (
                      <div className="flex items-center gap-1 mt-1 mb-1.5" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          value={editTitleText}
                          onChange={(e) => setEditTitleText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveRename(diag, e);
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                          className="flex-1 px-2 py-1 text-xs bg-white dark:bg-zinc-900 border border-blue-500 rounded text-zinc-900 dark:text-zinc-100 focus:outline-none"
                          autoFocus
                        />
                        <button
                          onClick={(e) => handleSaveRename(diag, e)}
                          className="p-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="p-1 text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition truncate mb-1">
                        {diag.title}
                      </h4>
                    )}

                    {/* Code Snippet Preview */}
                    <div className="p-1.5 rounded bg-zinc-100 dark:bg-zinc-900/80 border border-zinc-200/50 dark:border-zinc-800 text-[11px] font-mono text-zinc-600 dark:text-zinc-400 leading-tight overflow-hidden">
                      <pre className="truncate">{previewSnippet || '// Пустой код'}</pre>
                    </div>

                    {/* Delete Confirmation Box */}
                    {isDeleting && (
                      <div 
                        className="mt-2 p-2 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900 rounded-lg flex items-center justify-between text-xs"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="text-red-700 dark:text-red-300 text-[11px]">Удалить схему?</span>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={(e) => handleDelete(diag.id, e)}
                            className="px-2 py-0.5 bg-red-600 hover:bg-red-700 text-white rounded text-[11px] font-bold"
                          >
                            Да
                          </button>
                          <button
                            onClick={() => setDeletingId(null)}
                            className="px-2 py-0.5 bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded text-[11px]"
                          >
                            Нет
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer of modal */}
          <div className="p-2.5 bg-zinc-50 dark:bg-zinc-800/40 border-t border-zinc-200 dark:border-zinc-700/60 flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
            <span>Нажмите на схему для загрузки</span>
            <button
              onClick={() => setIsOpen(false)}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
            >
              Свернуть
            </button>
          </div>
        </div>
      )}

      {/* Floating Trigger Button (Bottom-Right) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        title="История сохраненных блок-схем"
        className={`group relative flex items-center gap-2 px-3.5 py-2.5 rounded-full font-bold text-xs shadow-xl transition-all transform hover:scale-105 select-none ${
          isOpen
            ? 'bg-blue-700 text-white ring-4 ring-blue-500/20'
            : 'bg-zinc-900 text-white dark:bg-blue-600 dark:text-white hover:bg-blue-600 dark:hover:bg-blue-500 ring-2 ring-black/5 dark:ring-white/10'
        }`}
      >
        <History className="w-4 h-4 transition-transform group-hover:rotate-[-20deg]" />
        <span>История схем</span>
        
        {diagrams.length > 0 && (
          <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-blue-500 dark:bg-white text-white dark:text-blue-700 shadow-sm">
            {diagrams.length}
          </span>
        )}

        {isOpen ? (
          <ChevronDown className="w-3.5 h-3.5 ml-0.5 opacity-80" />
        ) : (
          <ChevronUp className="w-3.5 h-3.5 ml-0.5 opacity-80" />
        )}
      </button>
    </div>
  );
};

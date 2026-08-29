import React, { useState, useMemo } from 'react';
import { Play, Code, Layout, ArrowRight, Maximize, Minimize } from 'lucide-react';
import Editor from 'react-simple-code-editor';
import Prism from 'prismjs';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/themes/prism.css';

import { syncYdbUser, getYdbUserTokens, decrementYdbUserToken, saveYdbDiagramItem } from './ydbClient';
import { fetchYandexProfileByToken } from './yandexAuth';
import { Coins, LogIn, LogOut, Sparkles, AlertCircle } from 'lucide-react';
import { AuthModal } from './AuthModal';
import { DiagramHistory } from './DiagramHistory';

export interface AppUserProfile {
  uid: string;
  email?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
  emailVerified?: boolean;
}

import { ASTNode, FlowNode, FlowEdge, DEFAULT_CODE, parsePythonSourceWhole, buildGraphs, EdgePolyline, GostShape, getNodeHeight } from './logic';
export default function App() {
  const [code, setCode] = useState(() => {
     const c = localStorage.getItem('blockcraft_code');
     return c !== null ? c : "";
  });
  const [hoveredLineIndex, setHoveredLineIndex] = useState<number | null>(null);
  const [highlightedNodeId, setHighlightedNodeId] = useState<string | null>(null);
  const [theme, setTheme] = useState<'light'|'dark'>(() => (localStorage.getItem('blockcraft_theme') as 'light'|'dark') || 'light');
  const [fontFamily, setFontFamily] = useState<string>(() => localStorage.getItem('blockcraft_font') || 'Inter, sans-serif');

  const [language, setLanguage] = useState(() => localStorage.getItem('blockcraft_language') || 'python');
  const [authError, setAuthError] = useState<string | null>(null);

  const [user, setUser] = useState<AppUserProfile | null>(null);
  const [userTokens, setUserTokens] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [showTopUp, setShowTopUp] = useState(false);
  const [lastGeneratedCode, setLastGeneratedCode] = useState(() => {
     return "";
  });
  const [lastGeneratedLanguage, setLastGeneratedLanguage] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3500);
  };
  
  React.useEffect(() => {
    // Check for Yandex OAuth response token in URL hash
    if (window.location.hash.includes('access_token')) {
      const hashParams = new URLSearchParams(window.location.hash.replace('#', ''));
      const accessToken = hashParams.get('access_token');
      if (accessToken) {
        if (window.opener) {
          try {
            window.opener.postMessage({ type: 'YANDEX_OAUTH_TOKEN', token: accessToken }, '*');
          } catch (e) {
            console.error('OAuth postMessage error:', e);
          }
          setTimeout(() => {
            try { window.close(); } catch {}
          }, 600);
          return;
        } else {
          fetchYandexProfileByToken(accessToken).then((yUser) => {
            setUser(yUser);
            setAuthError(null);
            localStorage.setItem('blockcraft_yandex_user', JSON.stringify(yUser));
            syncYdbUser(yUser.uid, yUser.email, yUser.displayName).then(() => {
              getYdbUserTokens(yUser.uid).then((tok) => {
                if (tok !== undefined) setUserTokens(tok);
              });
            });
            window.history.replaceState({}, document.title, window.location.pathname);
          }).catch((err) => {
            console.warn('OAuth token parse error:', err);
          });
        }
      }
    }

    // Check for cached user session and sync with Yandex Database (YDB)
    const savedUser = localStorage.getItem('blockcraft_yandex_user');
    if (savedUser) {
      try {
        const u = JSON.parse(savedUser);
        setUser(u);
        setAuthError(null);
        
        // Sync with YDB Serverless
        syncYdbUser(u.uid, u.email, u.displayName).then((syncRes) => {
          if (syncRes?.result?.tokens) {
            setUserTokens(syncRes.result.tokens);
          } else {
            getYdbUserTokens(u.uid, u.email).then((tok) => {
              if (tok !== undefined) setUserTokens(tok);
            });
          }
        });
      } catch (e) {
        console.warn('Error reading saved user session:', e);
      }
    }
  }, []);
  
  const handleLogin = () => {
    setAuthError(null);
    setIsAuthModalOpen(true);
  };

  const handleAuthSuccess = async (authUser: any) => {
    const appUser: AppUserProfile = {
      uid: authUser.uid,
      email: authUser.email,
      displayName: authUser.displayName || authUser.email?.split('@')[0] || 'Пользователь',
      photoURL: authUser.photoURL,
    };
    setUser(appUser);
    localStorage.setItem('blockcraft_yandex_user', JSON.stringify(appUser));
    
    // Sync to Yandex Database (YDB Serverless)
    const syncRes = await syncYdbUser(authUser.uid, authUser.email, authUser.displayName);
    if (syncRes?.result?.tokens) {
      setUserTokens(syncRes.result.tokens);
    } else {
      const tok = await getYdbUserTokens(authUser.uid, authUser.email);
      setUserTokens(tok ?? 1);
    }
  };

  const handleLogout = async () => {
    localStorage.removeItem('blockcraft_yandex_user');
    setUser(null);
    setUserTokens(null);
  };

const [leftWidth, setLeftWidth] = useState(480);
  const [showSidebar, setShowSidebar] = useState(true);
  const [viewMode, setViewMode] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [tabPages, setTabPages] = useState<Record<number, number>>({});
  const activePage = tabPages[activeTab] || 0;
  const setActivePage = (p: number | ((prev: number) => number), overrideTabIdx?: number) => {
      setTabPages(prev => {
          const targetTab = overrideTabIdx !== undefined ? overrideTabIdx : activeTab;
          const prevVal = prev[targetTab] || 0;
          const newVal = typeof p === 'function' ? (p as Function)(prevVal) : p;
          return { ...prev, [targetTab]: newVal };
      });
  };
  const [scale, setScale] = useState(1);
  const isDragging = React.useRef(false);

  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });
  const [pan, setPan] = useState({ x: 0, y: 0 });

  const [overrides, setOverrides] = useState<Record<number, any>>(() => {
    try { return JSON.parse(localStorage.getItem('blockcraft_overrides') || '{}'); } catch { return {}; }
  });
  const overridesRef = React.useRef(overrides);
  React.useEffect(() => { 
      overridesRef.current = overrides;
      localStorage.setItem('blockcraft_overrides', JSON.stringify(overrides));
  }, [overrides]);
  
  const [history, setHistory] = useState<Record<number, any>[]>(() => {
    try { return JSON.parse(localStorage.getItem('blockcraft_history') || '[{}]'); } catch { return [{}]; }
  });
  const [historyIndex, setHistoryIndex] = useState(() => {
    const saved = localStorage.getItem('blockcraft_historyIndex');
    return saved ? parseInt(saved, 10) : 0;
  });

  React.useEffect(() => { localStorage.setItem('blockcraft_history', JSON.stringify(history)); }, [history]);
  React.useEffect(() => { localStorage.setItem('blockcraft_historyIndex', historyIndex.toString()); }, [historyIndex]);
  React.useEffect(() => { localStorage.setItem('blockcraft_code', code); }, [code]);
  React.useEffect(() => { localStorage.setItem('blockcraft_language', language); }, [language]);
  React.useEffect(() => { localStorage.setItem('blockcraft_theme', theme); }, [theme]);
  React.useEffect(() => { localStorage.setItem('blockcraft_font', fontFamily); }, [fontFamily]);

  const [splitMode, setSplitMode] = useState<'auto' | 'manual'>(() => {
    return (localStorage.getItem('blockcraft_split_mode') as 'auto' | 'manual') || 'auto';
  });
  const [isScissorsMode, setIsScissorsMode] = useState<boolean>(false);
  const [customCuts, setCustomCuts] = useState<Record<number, number[]>>(() => {
    try {
      return JSON.parse(localStorage.getItem('blockcraft_custom_cuts') || '{}');
    } catch {
      return {};
    }
  });
  const [hoveredY, setHoveredY] = useState<number | null>(null);

  const pushHistory = (newOverrides: Record<number, any>) => {
      setOverrides(newOverrides);
      setHistory(prev => {
          const next = prev.slice(0, historyIndex + 1);
          next.push(JSON.parse(JSON.stringify(newOverrides)));
          return next;
      });
      setHistoryIndex(prev => prev + 1);
  };

  const [selectedElement, setSelectedElement] = useState<{type: 'node' | 'edge', id: string, segment?: number} | null>(null);

  const handleNodeClick = (node: any) => {
      if (highlightedNodeId === node.id) {
          setHighlightedNodeId(null);
          setHoveredLineIndex(null);
          setSelectedElement(null);
          return;
      }
      
      if (node.id) {
          setHighlightedNodeId(node.id);
      }
      if (node.lineIndex !== undefined && node.lineIndex !== null) {
          setHoveredLineIndex(node.lineIndex);
          
          setTimeout(() => {
              const textarea = document.querySelector('.npm__react-simple-code-editor__textarea') as HTMLTextAreaElement;
              if (textarea) {
                  const lines = code.split('\n');
                  let startChar = 0;
                  for (let i = 0; i < node.lineIndex; i++) {
                      if (lines[i] !== undefined) {
                          startChar += lines[i].length + 1;
                      }
                  }
                  let endChar = startChar + (lines[node.lineIndex]?.length || 0);
                  
                  textarea.focus();
                  textarea.setSelectionRange(startChar, endChar);
                  
                  const scroller = document.getElementById('code-editor-scroller');
                  if (scroller) {
                      const lineHeight = 21.125;
                      const scrollerHeight = scroller.clientHeight;
                      const targetScrollTop = Math.max(0, (node.lineIndex * lineHeight) - (scrollerHeight / 2) + 20);
                      scroller.scrollTo({ top: targetScrollTop, behavior: 'smooth' });
                  }
              }
          }, 50);
      }
  };
  const [editingNode, setEditingNode] = useState<{id: string, text: string} | null>(null);
  const [dragState, setDragState] = useState<{id: string, type: 'node' | 'edge', segment?: number, dragEnd?: 'start' | 'end', startX: number, startY: number, startDx: number, startDy: number, moved?: boolean, isVertical?: boolean} | null>(null);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
            e.preventDefault();
            if (e.shiftKey) {
                // Redo
                if (historyIndex < history.length - 1) {
                    setOverrides(history[historyIndex + 1]);
                    setHistoryIndex(historyIndex + 1);
                }
            } else {
                // Undo
                if (historyIndex > 0) {
                    setOverrides(history[historyIndex - 1]);
                    setHistoryIndex(historyIndex - 1);
                }
            }
            return;
        }
        if (e.key === 'Delete' || e.key === 'Backspace') {
            if (editingNode) return;
            if (selectedElement) {
                const next = JSON.parse(JSON.stringify(overridesRef.current));
                if (!next[activeTab]) next[activeTab] = { nodes: {}, edges: {} };
                const graphOv = next[activeTab];
                if (selectedElement.type === 'node') {
                    if (!graphOv.nodes) graphOv.nodes = {};
                    if (!graphOv.nodes[selectedElement.id]) graphOv.nodes[selectedElement.id] = {};
                    graphOv.nodes[selectedElement.id].hidden = true;
                } else if (selectedElement.type === 'edge') {
                    if (!graphOv.edges) graphOv.edges = {};
                    if (!graphOv.edges[selectedElement.id]) graphOv.edges[selectedElement.id] = {};
                    graphOv.edges[selectedElement.id].hidden = true;
                }
                pushHistory(next);
                setSelectedElement(null);
            }
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedElement, activeTab, editingNode, history, historyIndex]);

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      setLeftWidth(Math.max(200, Math.min(e.clientX, window.innerWidth - 200)));
    };
    const handleMouseUp = () => {
      isDragging.current = false;
      document.body.style.cursor = 'default';
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);
  
  
  const graphs = useMemo(() => {
      try {
          if (code !== lastGeneratedCode) return [];
          return buildGraphs(code, language, overrides, splitMode, customCuts, isScissorsMode);
      } catch (e) {
          console.error(e);
          return [];
      }
  }, [lastGeneratedCode, language, overrides, splitMode, customCuts, isScissorsMode]);

  const handleGenerateClick = async () => {
      if (!user) {
          handleLogin();
          return;
      }
      if (user.emailVerified === false && !user.uid.startsWith('yandex_')) {
          setAuthError('Пожалуйста, подтвердите ваш e-mail для активации 1 бесплатного токена и создания схем.');
          return;
      }
      if (userTokens === null || userTokens <= 0) {
          setShowTopUp(true);
          return;
      }
      setIsGenerating(true);
      setShowTopUp(false);
      try {
          // Decrement token in Yandex Database (YDB)
          const nextCount = await decrementYdbUserToken(user.uid);
          setUserTokens(nextCount);
          
          setLastGeneratedCode(code);
          setLastGeneratedLanguage(language);

          // Auto-save generated diagram to user's history in YDB
          if (code.trim()) {
            try {
              const diagId = `diag_${Date.now()}`;
              const now = new Date().toISOString();
              
              // Smart title generation
              let autoTitle = `Схема ${language === 'cpp' ? 'C++' : 'Python'}`;
              const lines = code.split('\n').map(l => l.trim()).filter(Boolean);
              for (const line of lines) {
                const pyMatch = line.match(/^def\s+([a-zA-Z0-9_]+)\s*\(/);
                if (pyMatch) { autoTitle = `Функция ${pyMatch[1]}()`; break; }
                const cppMatch = line.match(/^(?:int|void|double|float|bool|string|auto)\s+([a-zA-Z0-9_]+)\s*\(/);
                if (cppMatch) { autoTitle = `Функция ${cppMatch[1]}()`; break; }
              }

              if (user) {
                await saveYdbDiagramItem(user.uid, {
                  id: diagId,
                  title: autoTitle,
                  code: code,
                  language: language,
                  isPinned: false,
                  createdAt: now,
                  updatedAt: now
                });
              } else {
                const saved = JSON.parse(localStorage.getItem('blockcraft_local_history') || '[]');
                saved.unshift({
                  id: diagId,
                  userId: 'anonymous',
                  title: autoTitle,
                  code: code,
                  language: language,
                  isPinned: false,
                  createdAt: now,
                  updatedAt: now
                });
                localStorage.setItem('blockcraft_local_history', JSON.stringify(saved.slice(0, 50)));
              }
            } catch (histErr) {
              console.warn('Auto-save history error:', histErr);
            }
          }
      } catch (e: any) {
          console.error('Error generating:', e);
          setShowTopUp(true);
      } finally {
          setIsGenerating(false);
      }
  };

  const handleSelectDiagramFromHistory = (loadedCode: string, loadedLang: 'python' | 'cpp') => {
    setCode(loadedCode);
    setLanguage(loadedLang);
    localStorage.setItem('blockcraft_code', loadedCode);
    localStorage.setItem('blockcraft_language', loadedLang);
    setLastGeneratedCode(loadedCode);
    setLastGeneratedLanguage(loadedLang);
  };


  const findGraphAndNodeByLine = (lineIdx: number) => {
      for (let gIdx = 0; gIdx < graphs.length; gIdx++) {
          const g = graphs[gIdx];
          for (let pIdx = 0; pIdx < g.pages.length; pIdx++) {
              const p = g.pages[pIdx];
              const matchNode = p.nodes.find(n => n.lineIndex === lineIdx);
              if (matchNode) {
                  return { graphIdx: gIdx, pageIdx: pIdx, nodeId: matchNode.id };
              }
          }
      }
      return null;
  };

  React.useEffect(() => {
    if (activeTab >= graphs.length) {
       setActiveTab(Math.max(0, graphs.length - 1));
       setActivePage(0);
    }
  }, [graphs.length, activeTab]);

  const activeGraph = graphs[activeTab] || null;
  const activeGraphPage = activeGraph ? (activeGraph.pages[activePage] || activeGraph.pages[0] || null) : null;

  React.useEffect(() => {
      if (activeGraph && activePage >= activeGraph.pages.length) {
          setActivePage(0);
      }
  }, [activeGraph?.pages?.length, activePage]);

  React.useEffect(() => {
      const textarea = document.querySelector('.npm__react-simple-code-editor__textarea') as HTMLTextAreaElement;
      if (!textarea) return;

      const onSelectionChange = () => {
          if (document.activeElement !== textarea) return;
          const selectionStart = textarea.selectionStart;
          if (selectionStart !== undefined) {
              const textBefore = textarea.value.substring(0, selectionStart);
              const currentLineIdx = textBefore.split('\n').length - 1;
              setHoveredLineIndex(currentLineIdx);
              const res = findGraphAndNodeByLine(currentLineIdx);
              if (res) {
                  setActiveTab(res.graphIdx);
                  setActivePage(res.pageIdx, res.graphIdx);
                  setHighlightedNodeId(res.nodeId);
              }
          }
      };

      textarea.addEventListener('keyup', onSelectionChange);
      textarea.addEventListener('click', onSelectionChange);
      textarea.addEventListener('focus', onSelectionChange);
      textarea.addEventListener('select', onSelectionChange);

      return () => {
          textarea.removeEventListener('keyup', onSelectionChange);
          textarea.removeEventListener('click', onSelectionChange);
          textarea.removeEventListener('focus', onSelectionChange);
          textarea.removeEventListener('select', onSelectionChange);
      };
  }, [code, graphs]);

  const totalWidth = graphs.reduce((sum, g) => sum + (g.pages.length > 0 ? g.pages[0].width : 800) + 40, 0) || 800;
  const maxHeight = Math.max(...graphs.map(g => g.pages.length > 0 ? g.pages[0].height : 800), 800);

const downloadSvg = (svgId: string, title: string) => {
    const svgElement = document.getElementById(svgId) as any as SVGSVGElement | null;
    if (!svgElement) return;
    
    let svgBBox;
    try {
        svgBBox = svgElement.getBBox();
    } catch (e) {
        svgBBox = { x: 0, y: 0, width: 800, height: 800 };
    }
    
    const padding = 80;
    const w = Math.ceil(svgBBox.width + padding * 2);
    const h = Math.ceil(svgBBox.height + padding * 2);
    
    const serializer = new XMLSerializer();
    let source = serializer.serializeToString(svgElement);
    if (!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)) {
        source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
    }
    
    // Inject correct dimensions for proper cropped download
    source = source.replace(/\bwidth="[^"]+"/, '');
    source = source.replace(/\bheight="[^"]+"/, '');
    source = source.replace(/\bviewBox="[^"]+"/, ''); 
    source = source.replace(/^<svg/, `<svg viewBox="${svgBBox.x - padding} ${svgBBox.y - padding} ${w} ${h}" width="${w}" height="${h}" `);
    
    // Make SVG transparent by removing styling classes like bg-white and drop-shadow
    source = source.replace(/\bclass(?:Name)?="[^"]+"/g, '');
    
    // Add white background specifically for SVG download if needed, or leave it transparent
    const url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(source);
    const a = document.createElement("a");
    a.href = url;
    a.download = title.replace(/\s+/g, '_') + '.svg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
};

const downloadPng = (svgId: string, title: string) => {
    const svgElement = document.getElementById(svgId) as any as SVGSVGElement | null;
    if (!svgElement) return;
    
    let svgBBox;
    try {
        svgBBox = svgElement.getBBox();
    } catch (e) {
        svgBBox = { x: 0, y: 0, width: 800, height: 800 };
    }
    
    const padding = 80;
    const w = Math.ceil(svgBBox.width + padding * 2);
    const h = Math.ceil(svgBBox.height + padding * 2);
    
    const serializer = new XMLSerializer();
    let source = serializer.serializeToString(svgElement);
    if (!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)) {
        source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
    }
    
    // Inject correct dimensions for proper cropped download
    source = source.replace(/\bwidth="[^"]+"/, '');
    source = source.replace(/\bheight="[^"]+"/, '');
    source = source.replace(/\bviewBox="[^"]+"/, ''); 
    source = source.replace(/^<svg/, `<svg viewBox="${svgBBox.x - padding} ${svgBBox.y - padding} ${w} ${h}" width="${w}" height="${h}" `);
    
    // Make PNG transparent by removing background classes
    source = source.replace(/\bclass(?:Name)?="[^"]+"/g, '');
    
    const canvas = document.createElement("canvas");
    const scale = 2;
    
    canvas.width = w * scale;
    canvas.height = h * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    ctx.scale(scale, scale);
    
    const img = new Image();
    img.crossOrigin = "anonymous";
    const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    
    img.onload = () => {
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        
        const a = document.createElement("a");
        a.download = `${title}.png`;
        a.href = canvas.toDataURL("image/png", 1.0);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };
    img.src = url;
}; // end downloadPng

const escapeXml = (unsafe: string) => {
    return unsafe.replace(/[<>&'"]/g, (c) => {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
            default: return c;
        }
    });
};

const downloadDrawio = (title: string, fontFamily: string) => {
    if (!activeGraphPage) return;
    
    let fontName = fontFamily.split(',')[0].replace(/['"]/g, '').trim();

    let xml = `<mxfile host="Electron" modified="${new Date().toISOString()}" agent="AIStudio" version="21.6.8" type="device">\n`;
    xml += `  <diagram id="diag-${Math.random().toString(36).substring(2, 9)}" name="Page-1">\n`;
    xml += `    <mxGraphModel dx="1200" dy="1200" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="827" pageHeight="1169" background="none" math="0" shadow="0">\n`;
    xml += `      <root>\n`;
    xml += `        <mxCell id="0" />\n`;
    xml += `        <mxCell id="1" parent="0" />\n`;

    const getPointsFromSegments = (segments: any[]) => {
        if (!segments || segments.length === 0) return [];
        const pts: {x: number, y: number}[] = [];
        pts.push({ x: segments[0].startX, y: segments[0].startY });
        segments.forEach(seg => {
            const last = pts[pts.length - 1];
            if (Math.abs(last.x - seg.startX) > 0.1 || Math.abs(last.y - seg.startY) > 0.1) {
                pts.push({ x: seg.startX, y: seg.startY });
            }
            pts.push({ x: seg.endX, y: seg.endY });
        });
        return pts;
    };

    const findClosestNode = (pt: {x: number; y: number}) => {
        let closestNode = null;
        let minDist = 999999;
        activeGraphPage.nodes.forEach(node => {
            const width = node.type === 'circle' ? 40 : 220;
            const height = node.type === 'circle' ? 40 : (node.height || getNodeHeight(node.text, node.type));
            const ports = [
                { x: node.x, y: node.y },
                { x: node.x, y: node.y - height / 2 },
                { x: node.x, y: node.y + height / 2 },
                { x: node.x - width / 2, y: node.y },
                { x: node.x + width / 2, y: node.y }
            ];
            ports.forEach(port => {
                const dx = pt.x - port.x;
                const dy = pt.y - port.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < minDist) {
                    minDist = dist;
                    closestNode = node;
                }
            });
        });
        return minDist <= 10 ? closestNode : null;
    };

    // 1. Add Nodes
    activeGraphPage.nodes.forEach(node => {
        const width = node.type === 'circle' ? 40 : 220;
        const height = node.type === 'circle' ? 40 : (node.height || getNodeHeight(node.text, node.type));
        const xMin = node.x - width / 2;
        const yMin = node.y - height / 2;

        let style = `rounded=0;whiteSpace=wrap;html=1;strokeColor=#18181b;fillColor=#ffffff;strokeWidth=1.5;fontFamily=${fontName};`;
        if (node.type === 'start' || node.type === 'end') {
            style = `rounded=1;whiteSpace=wrap;html=1;arcSize=50;strokeColor=#18181b;fillColor=#ffffff;strokeWidth=1.5;align=center;fontWeight=bold;fontFamily=${fontName};`;
        } else if (node.type === 'circle') {
            style = `ellipse;whiteSpace=wrap;html=1;aspect=fixed;strokeColor=#18181b;fillColor=#ffffff;strokeWidth=1.5;fontFamily=${fontName};`;
        } else if (node.type === 'io') {
            style = `shape=parallelogram;perimeter=parallelogramPerimeter;whiteSpace=wrap;html=1;fixedSize=1;strokeColor=#18181b;fillColor=#ffffff;strokeWidth=1.5;fontFamily=${fontName};`;
        } else if (node.type === 'decision') {
            style = `rhombus;whiteSpace=wrap;html=1;strokeColor=#18181b;fillColor=#ffffff;strokeWidth=1.5;fontFamily=${fontName};`;
        } else if (node.type === 'loop_begin') {
            style = `shape=loopLimit;whiteSpace=wrap;html=1;strokeColor=#18181b;fillColor=#ffffff;strokeWidth=1.5;fontFamily=${fontName};`;
        } else if (node.type === 'loop_end') {
            style = `shape=loopLimit;whiteSpace=wrap;html=1;rotation=180;strokeColor=#18181b;fillColor=#ffffff;strokeWidth=1.5;fontFamily=${fontName};`;
        } else if (node.type === 'loop') {
            style = `shape=hexagon;perimeter=hexagonPerimeter2;whiteSpace=wrap;html=1;fixedSize=1;strokeColor=#18181b;fillColor=#ffffff;strokeWidth=1.5;fontFamily=${fontName};`;
        } else if (node.type === 'subprogram') {
            style = `shape=process;whiteSpace=wrap;html=1;backgroundOutline=1;strokeColor=#18181b;fillColor=#ffffff;strokeWidth=1.5;fontFamily=${fontName};`;
        }

        xml += `        <mxCell id="${node.id}" value="${escapeXml(node.text)}" style="${style}" vertex="1" parent="1">\n`;
        xml += `          <mxGeometry x="${xMin}" y="${yMin}" width="${width}" height="${height}" as="geometry" />\n`;
        xml += `        </mxCell>\n`;
    });

    // 2. Add Edges and Labels
    activeGraphPage.edges.forEach((edge, i) => {
        const edgeId = edge.id || `edge-${i}`;
        const points = getPointsFromSegments(edge.segments || []);
        if (points.length < 2) return;

        const startPt = points[0];
        const endPt = points[points.length - 1];

        const sourceNode = findClosestNode(startPt);
        const targetNode = findClosestNode(endPt);

        let style = `html=1;strokeColor=#18181b;strokeWidth=1.5;fontSize=11;fontFamily=${fontName};rounded=0;`;
        if (edge.noArrow) {
            style += "endArrow=none;";
        } else {
            style += "endArrow=classic;";
        }

        let sourceAttr = "";
        let targetAttr = "";

        if (sourceNode) {
            sourceAttr = ` source="${sourceNode.id}"`;
            const sw = sourceNode.type === 'circle' ? 40 : 220;
            const sh = sourceNode.type === 'circle' ? 40 : (sourceNode.height || getNodeHeight(sourceNode.text, sourceNode.type));
            const dxLeft = Math.abs(startPt.x - (sourceNode.x - sw/2));
            const dxRight = Math.abs(startPt.x - (sourceNode.x + sw/2));
            const dyTop = Math.abs(startPt.y - (sourceNode.y - sh/2));
            const dyBottom = Math.abs(startPt.y - (sourceNode.y + sh/2));
            const minDist = Math.min(dxLeft, dxRight, dyTop, dyBottom);
            if (minDist === dyBottom) {
                style += "exitX=0.5;exitY=1;exitDx=0;exitDy=0;";
            } else if (minDist === dyTop) {
                style += "exitX=0.5;exitY=0;exitDx=0;exitDy=0;";
            } else if (minDist === dxLeft) {
                style += "exitX=0;exitY=0.5;exitDx=0;exitDy=0;";
            } else if (minDist === dxRight) {
                style += "exitX=1;exitY=0.5;exitDx=0;exitDy=0;";
            }
        }

        if (targetNode) {
            targetAttr = ` target="${targetNode.id}"`;
            const tw = targetNode.type === 'circle' ? 40 : 220;
            const th = targetNode.type === 'circle' ? 40 : (targetNode.height || getNodeHeight(targetNode.text, targetNode.type));
            const dxLeft = Math.abs(endPt.x - (targetNode.x - tw/2));
            const dxRight = Math.abs(endPt.x - (targetNode.x + tw/2));
            const dyTop = Math.abs(endPt.y - (targetNode.y - th/2));
            const dyBottom = Math.abs(endPt.y - (targetNode.y + th/2));
            const minDist = Math.min(dxLeft, dxRight, dyTop, dyBottom);
            if (minDist === dyTop) {
                style += "entryX=0.5;entryY=0;entryDx=0;entryDy=0;";
            } else if (minDist === dyBottom) {
                style += "entryX=0.5;entryY=1;entryDx=0;entryDy=0;";
            } else if (minDist === dxLeft) {
                style += "entryX=0;entryY=0.5;entryDx=0;entryDy=0;";
            } else if (minDist === dxRight) {
                style += "entryX=1;entryY=0.5;entryDx=0;entryDy=0;";
            }
        }

        xml += `        <mxCell id="${edgeId}" value="" style="${style}" edge="1" parent="1"${sourceAttr}${targetAttr}>\n`;
        xml += `          <mxGeometry relative="1" as="geometry">\n`;
        if (!sourceNode) {
            xml += `            <mxPoint as="sourcePoint" x="${startPt.x}" y="${startPt.y}" />\n`;
        }
        if (!targetNode) {
            xml += `            <mxPoint as="targetPoint" x="${endPt.x}" y="${endPt.y}" />\n`;
        }
        
        if (points.length > 2) {
            xml += `            <Array as="points">\n`;
            points.slice(1, -1).forEach(pt => {
                xml += `              <mxPoint x="${pt.x}" y="${pt.y}" />\n`;
            });
            xml += `            </Array>\n`;
        }
        
        xml += `          </mxGeometry>\n`;
        xml += `        </mxCell>\n`;

        // If edge carries a label, place it as an absolute transparent borderless vertex cell in draw.io for perfect clean representation
        if (edge.label && edge.labelPos) {
            const labelText = edge.label;
            const lx = edge.labelPos.x - 20;
            const ly = edge.labelPos.y - 12;
            const styleLabel = `text;html=1;align=center;verticalAlign=middle;resizable=0;points=[];autosize=1;strokeColor=none;fillColor=none;fontFamily=${fontName};fontSize=12;fontColor=#18181b;`;
            xml += `        <mxCell id="${edgeId}-label" value="${escapeXml(labelText)}" style="${styleLabel}" vertex="1" parent="1">\n`;
            xml += `          <mxGeometry x="${lx}" y="${ly}" width="40" height="24" as="geometry" />\n`;
            xml += `        </mxCell>\n`;
        }
    });

    xml += `      </root>\n`;
    xml += `    </mxGraphModel>\n`;
    xml += `  </diagram>\n`;
    xml += `</mxfile>\n`;

    const blob = new Blob([xml], { type: "application/xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.download = title.replace(/\s+/g, '_') + '.drawio';
    a.href = url;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

    return (
    <div className={`w-full h-screen ${theme === 'dark' ? 'dark' : ''}`}>
      <div className="w-full h-screen bg-zinc-50 dark:bg-[#1C1C1F] flex flex-col font-sans overflow-hidden transition-colors duration-300">
      {!viewMode && (
        <header className="h-14 border-b border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-[#232328] flex items-center justify-between px-6 shrink-0 transition-colors duration-300">
          <div className="flex items-center gap-3">
            <img src="/icon.svg" alt="Схематор" className="w-8 h-8 rounded-lg object-contain shadow-sm select-none" />
            <h1 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
              Схематор
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Tokens & Auth section */}
            {user ? (
              <div className="flex items-center gap-3 bg-zinc-100 dark:bg-zinc-800/60 p-1 pl-3 pr-2 rounded-full border border-zinc-200 dark:border-zinc-700/60 text-xs">
                <div className="flex items-center gap-1.5 font-semibold text-zinc-800 dark:text-zinc-200">
                  <Coins className="w-4 h-4 text-amber-500" />
                  <span>Баланс: <strong className="text-blue-600 dark:text-blue-400 font-bold">{userTokens !== null ? userTokens : '...'}</strong> токенов</span>
                </div>
                <button 
                  onClick={() => window.open('https://boosty.to/', '_blank')}
                  className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-2.5 py-1 rounded-full text-[11px] transition shadow-sm flex items-center gap-1"
                >
                  Пополнить
                </button>
                <div className="w-px h-4 bg-zinc-300 dark:bg-zinc-600 mx-0.5"></div>
                <div className="flex items-center gap-2">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt={user.displayName || 'User'} className="w-5 h-5 rounded-full" referrerPolicy="no-referrer" />
                  ) : (
                    <span className="w-5 h-5 rounded-full bg-blue-500 text-white text-[10px] flex items-center justify-center font-bold">
                      {user.displayName ? user.displayName[0].toUpperCase() : (user.email ? user.email[0].toUpperCase() : 'U')}
                    </span>
                  )}
                  <span className="font-medium text-zinc-700 dark:text-zinc-300 text-xs max-w-[120px] truncate">
                    {user.displayName || user.email?.split('@')[0]}
                  </span>
                  <button 
                    onClick={handleLogout} 
                    className="text-zinc-500 hover:text-red-500 dark:hover:text-red-400 transition ml-1" 
                    title="Выйти"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <button 
                onClick={handleLogin}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-sm shadow-blue-500/20 transition transform active:scale-95"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Войти</span>
                <span className="hidden sm:inline bg-white/20 px-1.5 py-0.5 rounded text-[10px] font-bold">+1 токен</span>
              </button>
            )}

            <div className="flex items-center gap-3">
              <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Theme:</span>
              <button 
                onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')}
                className="bg-zinc-100 dark:bg-zinc-800 border-none rounded text-xs px-2 py-1 font-semibold text-zinc-700 dark:text-zinc-300 outline-none hover:bg-zinc-200 dark:hover:bg-zinc-700 transition"
              >
                {theme === 'light' ? 'Dark' : 'Light'}
              </button>
              <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest ml-1">Font:</span>
              <select 
                value={fontFamily}
                onChange={(e) => setFontFamily(e.target.value)}
                className="bg-zinc-100 dark:bg-zinc-800 border-none rounded text-xs px-2 py-1 font-semibold text-zinc-700 dark:text-zinc-300 outline-none cursor-pointer"
              >
                <option value="monospace">Monospace</option>
                <option value="Inter, sans-serif">Sans-serif</option>
                <option value="Times New Roman, serif">Serif</option>
              </select>
            </div>
          </div>
        </header>
      )}

      {user && !user.emailVerified && false && (
        <div />
      )}

      <main className="flex-grow flex flex-col md:flex-row overflow-hidden relative">
        {showSidebar && !viewMode && (
          <>
            <section className="w-full md:w-auto border-b md:border-b-0 md:border-r border-zinc-200 dark:border-zinc-800/80 bg-zinc-50 dark:bg-[#1C1C1F] flex flex-col shrink-0 relative z-20 shadow-[1px_0_10px_rgba(0,0,0,0.03)] dark:shadow-[1px_0_10px_rgba(0,0,0,0.2)] transition-colors duration-300"
                     style={{ width: leftWidth }}>
              <div className="px-4 py-3 bg-white dark:bg-[#232328] border-b border-zinc-200 dark:border-zinc-800/80 flex justify-between items-center shadow-sm z-10 transition-colors duration-300">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Код</span>
                  <select 
                    className="bg-zinc-100 dark:bg-zinc-800 border-none rounded px-2 py-1 text-xs font-semibold text-zinc-700 dark:text-zinc-300 outline-none cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-700 transition"
                    value={language} 
                    onChange={(e) => {
                      const newLang = e.target.value;
                      setLanguage(newLang);
                    }}
                  >
                    <option value="python">Python</option>
                    <option value="cpp">C++</option>
                  </select>
                  <button 
                    onClick={handleGenerateClick} 
                    disabled={isGenerating || !code.trim()} 
                    className="ml-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold shadow-sm transition disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>{isGenerating ? "Генерация..." : "Создать схему"}</span>
                  </button>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => setShowSidebar(false)} className="text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 p-1" title="Hide Editor">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7"></path></svg>
                    </button>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                </div>
              </div>
              <div id="code-editor-scroller" className="flex-grow overflow-auto bg-[#fafafa] dark:bg-[#18181A] relative transition-colors duration-300">
                <div 
                    className="w-full min-h-full p-4 flex flex-row items-start cursor-text"
                    onClick={(e) => {
                        // Only focus if clicking the empty space or container, not the editor itself or line numbers
                        if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('flex-grow')) {
                            const textarea = document.querySelector('#code-editor-scroller textarea') as HTMLTextAreaElement;
                            if (textarea) {
                                textarea.focus();
                                // Move cursor to the end
                                textarea.setSelectionRange(textarea.value.length, textarea.value.length);
                            }
                        }
                    }}
                >
                    <style>{`
                        .npm__react-simple-code-editor__textarea { outline: none !important; white-space: pre !important; }
                        pre { white-space: pre !important; }
                    `}</style>
                    <div className="flex select-none font-mono text-[13px] leading-relaxed text-right text-zinc-400 dark:text-zinc-500 border-r border-zinc-200/60 dark:border-zinc-800/80 pr-2 mr-3 flex-col shrink-0 transition-colors duration-300" style={{ minWidth: '2.5rem', lineHeight: '1.625' }}>
                        {code.split('\n').map((_, idx) => {
                            const isHighlighted = hoveredLineIndex === idx;
                            return (
                                <div 
                                    key={idx} 
                                    onClick={() => {
                                        setHoveredLineIndex(idx);
                                        const res = findGraphAndNodeByLine(idx);
                                        if (res) {
                                            setActiveTab(res.graphIdx);
                                            setActivePage(res.pageIdx, res.graphIdx);
                                            setHighlightedNodeId(res.nodeId);
                                        }
                                    }}
                                    className={`cursor-pointer px-1 transition-colors rounded ${isHighlighted ? 'bg-yellow-200 dark:bg-yellow-900/40 font-bold text-yellow-800 dark:text-yellow-500' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-600 dark:hover:text-zinc-400'}`}>
                                    {idx + 1}
                                </div>
                            );
                        })}
                    </div>
                    <div className="flex-grow w-0 relative overflow-x-auto">
                        <Editor
                            value={code}
                            onValueChange={code => setCode(code)}
                            highlight={code => {
                                const grammar = language === 'cpp' ? Prism.languages.cpp : Prism.languages.python;
                                return grammar ? Prism.highlight(code, grammar, language) : code;
                            }}
                            padding={0}
                            className="font-mono text-[13px] leading-relaxed text-zinc-800 dark:text-zinc-300 transition-colors duration-300"
                            style={{
                                fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                                minHeight: '100%',
                                whiteSpace: 'pre',
                            }}
                        />
                    </div>
                </div>
              </div>
            </section>
            
            <div className="w-1 cursor-col-resize hover:bg-emerald-500/50 bg-transparent shrink-0 z-30 transition-colors hidden md:block"
                 onMouseDown={(e) => {
                     isDragging.current = true;
                     document.body.style.cursor = 'col-resize';
                     e.preventDefault();
                 }} />
          </>
        )}

        <section className="flex-grow bg-[#eef2f6] dark:bg-[#121214] relative flex flex-col items-center overflow-hidden transition-colors duration-300">
          {!viewMode && graphs.length > 0 && (
            <div className="w-full bg-white dark:bg-[#232328] border-b border-zinc-200 dark:border-zinc-800/80 z-20 flex px-4 pt-4 shadow-sm flex-col shrink-0 overflow-visible transition-colors duration-300">
              <div className="flex flex-wrap gap-y-1">
                  {graphs.map((graph, idx) => (
                    <button 
                      key={idx}
                      onClick={() => setActiveTab(idx)}
                      className={`px-4 py-2 text-xs font-semibold rounded-t-lg border border-b-0 transition-colors mr-1 ${activeTab === idx ? 'bg-[#eef2f6] dark:bg-[#121214] border-zinc-300 dark:border-zinc-700/80 text-zinc-800 dark:text-zinc-200 shadow-[0_2px_0_0_#eef2f6] dark:shadow-[0_2px_0_0_#121214]' : 'bg-zinc-50 dark:bg-[#1C1C1F] border-zinc-200 dark:border-zinc-800/80 text-zinc-500 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-[#28282B]'}`}
                      style={activeTab === idx ? { transform: 'translateY(1px)' }  : {}}
                    >
                      {graph.title}
                    </button>
                  ))}
              </div>

            </div>
          )}
          <div className="w-full sticky top-0 z-30 shrink-0 shadow-sm border-b border-zinc-200 dark:border-zinc-800/80 bg-white/90 dark:bg-[#232328]/90 backdrop-blur transition-colors duration-300">
              <div className="w-full px-4 py-2 flex flex-wrap items-center justify-between gap-4 relative min-h-[48px]">
                  {/* Left: Mode toggle & Scissors */}
                  <div className="flex items-center gap-4 flex-wrap">
                      <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Режим деления:</span>
                          <div className="flex bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-lg border border-zinc-200 dark:border-zinc-700/60">
                              <button
                                  onClick={() => {
                                      setSplitMode('auto');
                                      setIsScissorsMode(false);
                                      localStorage.setItem('blockcraft_split_mode', 'auto');
                                  }}
                                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${splitMode === 'auto' ? 'bg-white dark:bg-zinc-700 text-zinc-950 dark:text-white shadow-sm' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'}`}
                              >
                                  Автоматический
                              </button>
                              <button
                                  onClick={() => {
                                      setSplitMode('manual');
                                      localStorage.setItem('blockcraft_split_mode', 'manual');
                                  }}
                                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${splitMode === 'manual' ? 'bg-white dark:bg-zinc-700 text-zinc-950 dark:text-white shadow-sm' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'}`}
                              >
                                  Ручной (Ножницы)
                              </button>
                          </div>
                      </div>

                      {splitMode === 'manual' && (
                          <div className="flex items-center gap-2">
                              <button
                                  onClick={() => setIsScissorsMode(!isScissorsMode)}
                                  className={`flex items-center gap-2 px-3 py-1 text-xs font-medium rounded-md border transition-all ${isScissorsMode ? 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 shadow-sm' : 'bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700/80'}`}
                              >
                                  <span>✂️</span>
                                  <span>{isScissorsMode ? 'Ножницы: АКТИВНЫ (Нажмите на схему)' : 'Включить Ножницы'}</span>
                              </button>
                              {(customCuts[activeTab] || []).length > 0 && (
                                  <button
                                      onClick={() => {
                                          const updated = { ...customCuts, [activeTab]: [] };
                                          setCustomCuts(updated);
                                          localStorage.setItem('blockcraft_custom_cuts', JSON.stringify(updated));
                                      }}
                                      className="px-2 py-1 text-xs font-medium rounded bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400 transition"
                                      title="Очистить все разрезы"
                                  >
                                      Очистить всё
                                  </button>
                              )}
                          </div>
                      )}
                  </div>

                  {/* Center: Pagination Controls */}
                  {activeGraph && activeGraph.pages.length > 1 ? (
                      <div className="md:absolute md:left-1/2 md:-translate-x-1/2 flex items-center gap-2 z-10 my-2 md:my-0">
                         <button
                            onClick={() => setActivePage(p => Math.max(0, p - 1))}
                            disabled={activePage === 0}
                            className="px-3 py-1 rounded bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-xs font-medium hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 disabled:opacity-50 transition-colors"
                         >
                            ← Пред.
                         </button>
                         <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800/80 px-2.5 py-1 rounded border border-zinc-200/50 dark:border-zinc-700/40 min-w-[90px] text-center">
                            Стр {activePage + 1} из {activeGraph.pages.length}
                         </span>
                         <button
                            onClick={() => setActivePage(p => Math.min(activeGraph.pages.length - 1, p + 1))}
                            disabled={activePage === activeGraph.pages.length - 1}
                            className="px-3 py-1 rounded bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-xs font-medium hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 disabled:opacity-50 transition-colors"
                         >
                            След. →
                         </button>
                      </div>
                  ) : (
                      <div className="md:absolute md:left-1/2 md:-translate-x-1/2"></div>
                  )}

                  {/* Right: Action Buttons (locked, won't overlap panels) */}
                  <div className="flex items-center gap-2 flex-wrap z-10 ml-auto">
                      <button
                        onClick={() => setViewMode(!viewMode)}
                        className="flex items-center justify-center p-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition"
                        title={viewMode ? "Выйти из режима просмотра" : "Режим просмотра (Во весь экран)"}
                      >
                        {viewMode ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                      </button>

                      <button
                        onClick={() => {
                            let name = activeGraph?.title || 'graph';
                            if (activeGraph && activeGraph.pages.length > 1) {
                                name += `_стр_${activePage + 1}`;
                            }
                            downloadSvg(`graph-svg-${activeTab}`, name);
                        }}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-xs font-semibold transition"
                        title="Скачать SVG"
                      >
                        <Code className="w-3.5 h-3.5 text-orange-500" />
                        <span>SVG</span>
                      </button>

                      <button
                        onClick={() => {
                            let name = activeGraph?.title || 'graph';
                            if (activeGraph && activeGraph.pages.length > 1) {
                                name += `_стр_${activePage + 1}`;
                            }
                            downloadPng(`graph-svg-${activeTab}`, name);
                        }}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-xs font-semibold transition"
                        title="Скачать PNG"
                      >
                        <svg className="w-3.5 h-3.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                        </svg>
                        <span>PNG</span>
                      </button>

                      <button
                        onClick={() => {
                            let name = activeGraph?.title || 'graph';
                            if (activeGraph && activeGraph.pages.length > 1) {
                                name += `_стр_${activePage + 1}`;
                            }
                            downloadDrawio(name, fontFamily);
                        }}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-xs font-semibold transition"
                        title="Экспорт в draw.io (.drawio)"
                      >
                        <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1-0 1-1-1v-6z" />
                        </svg>
                        <span>Draw.io XML</span>
                      </button>
    

                      <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-700 mx-1"></div>

                      <button
                        onClick={() => {
                            setOverrides({});
                            setHistory([{}]);
                            setHistoryIndex(0);
                            localStorage.removeItem('blockcraft_overrides');
                            localStorage.removeItem('blockcraft_history');
                            localStorage.removeItem('blockcraft_historyIndex');
                        }}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400 rounded-md hover:bg-red-100 dark:hover:bg-red-900/40 text-xs font-semibold transition"
                        title="Сбросить все перемещения узлов"
                      >
                        <svg className="w-3.5 h-3.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                        </svg>
                        <span>Сбросить кэш</span>
                      </button>
                  </div>
              </div>
          </div>


          {!showSidebar && !viewMode && (
            <div className="absolute top-24 left-6 z-20">
              <button 
                className="flex items-center gap-2 bg-white/90 dark:bg-[#232328]/90 backdrop-blur px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700/80 shadow-sm hover:bg-zinc-50 dark:hover:bg-[#2E2E33] text-zinc-600 dark:text-zinc-300 text-sm font-medium transition-colors"
                onClick={() => setShowSidebar(true)}
              >
                <Code className="w-4 h-4" />
                <span>Показать редактор</span>
              </button>
            </div>
          )}

          <div className="flex-1 w-full h-full overflow-y-auto relative z-10 p-4 shrink-0 flex flex-col items-center justify-start">
              {activeGraph && activeGraphPage && (
                <>

                
                {showTopUp && (
                  <div className="sticky top-[50%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 flex flex-col items-center gap-6 bg-white/90 dark:bg-[#1C1C1F]/90 p-8 rounded-2xl shadow-2xl backdrop-blur-md border border-zinc-200 dark:border-zinc-800" style={{ marginTop: '-10%' }}>
                    <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mb-2">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                    </div>
                    <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 text-center max-w-sm leading-tight">
                      Недостаточно токенов
                    </h2>
                    <p className="text-zinc-500 text-center text-sm">
                        У вас закончились токены. Пополните баланс, чтобы продолжить.
                    </p>
                    <button 
                      onClick={() => {
                        window.open('https://boosty.to/', '_blank');
                      }}
                      className="px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all transform hover:scale-105 flex items-center gap-2 text-lg shadow-blue-500/25"
                    >
                      Пополнить баланс
                    </button>
                    <button onClick={() => setShowTopUp(false)} className="text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 text-sm mt-2">
                      Закрыть
                    </button>
                  </div>
                )}


                  <svg 
                    id={`graph-svg-${activeTab}`}
                    width={activeGraphPage.width} 
                    height={activeGraphPage.height} 
                    viewBox={`0 0 ${activeGraphPage.width} ${activeGraphPage.height}`}
                    preserveAspectRatio="xMidYMid meet"
                    className={`filter drop-shadow-md shadow-lg shadow-zinc-200/50 dark:shadow-[0_4px_24px_-4px_rgba(0,0,0,0.5)] overflow-visible bg-white dark:bg-[#1E1E24] border border-zinc-100 dark:border-zinc-800/80 p-6 rounded-lg my-4 transition-colors duration-300 ${isScissorsMode ? 'cursor-cell' : ''}`}
                    onClick={(e) => {
                        if (!isScissorsMode || splitMode !== 'manual') return;
                        const rect = e.currentTarget.getBoundingClientRect();
                        const clickY = e.clientY - rect.top;
                        const updatedCuts = [...(customCuts[activeTab] || [])];
                        updatedCuts.push(Math.round(clickY));
                        const nextCuts = { ...customCuts, [activeTab]: updatedCuts };
                        setCustomCuts(nextCuts);
                        localStorage.setItem('blockcraft_custom_cuts', JSON.stringify(nextCuts));
                        setIsScissorsMode(false);
                    }}
                    onMouseMove={(e) => {
                        if (!isScissorsMode || splitMode !== 'manual') return;
                        const rect = e.currentTarget.getBoundingClientRect();
                        const hoverY = e.clientY - rect.top;
                        setHoveredY(Math.round(hoverY));
                    }}
                    onMouseLeave={() => {
                        setHoveredY(null);
                    }}
                  >
                    <defs>
                      <marker id="arrowhead-light" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                        <polygon points="0 0, 6 3, 0 6" fill="#18181b" />
                      </marker>
                      <marker id="arrowhead-dark" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                        <polygon points="0 0, 6 3, 0 6" fill="#d4d4d8" />
                      </marker>
                    </defs>

                    {activeGraphPage.edges.map((edge, i) => (
                        <g 
                           key={edge.id || `edge-${i}`} 
                           opacity={selectedElement?.type === 'edge' && selectedElement.id === edge.id ? 0.5 : 1}
                           className="group"
                        >
                           <EdgePolyline edge={edge} theme={theme} />
                           {edge.segments?.map((seg, idx) => {
                                // use 1-indexed to match data structure
                                let segmentKey = idx + 1;
                                
                                return (
                                   <g key={segmentKey}>
                                       <line 
                                           x1={seg.startX} y1={seg.startY}
                                           x2={seg.endX} y2={seg.endY}
                                           stroke="transparent"
                                           strokeWidth="20"
                                           className="pointer-events-auto outline-none cursor-pointer"
                                           onMouseDown={(e) => {
                                                if (isScissorsMode) return;
                                                e.stopPropagation();
                                                setSelectedElement({ type: 'edge', id: edge.id!, segment: segmentKey });
                                           }}
                                       />
                                   </g>
                                );
                           })}
                        </g>
                    ))}

                    {activeGraphPage.nodes.map((node) => (
                      <g 
                        key={node.id} 
                        className={`cursor-pointer ${selectedElement?.type === 'node' && selectedElement.id === node.id ? 'opacity-70' : 'opacity-100'} transition-opacity`}
                        onMouseDown={(e) => {
                            if (isScissorsMode) return;
                            e.stopPropagation();
                            setSelectedElement({ type: 'node', id: node.id });
                            setDragState({
                                id: node.id,
                                type: 'node',
                                startX: e.pageX,
                                startY: e.pageY,
                                startDx: overrides[activeTab]?.nodes?.[node.id]?.dx || 0,
                                startDy: overrides[activeTab]?.nodes?.[node.id]?.dy || 0
                            });
                            handleNodeClick(node);
                        }}
                        onDoubleClick={(e) => {
                            if (isScissorsMode) return;
                            e.stopPropagation();
                            setEditingNode({ id: node.id, text: node.text });
                        }}
                      >
                        <GostShape 
                          node={node} 
                          highlighted={highlightedNodeId === node.id || (node.lineIndex !== undefined && node.lineIndex !== null && node.lineIndex === hoveredLineIndex)} 
                          fontFamily={fontFamily}
                          theme={theme}
                        />
                      </g>
                    ))}

                    {/* Render manual custom cut lines in Scissors Mode */}
                    {splitMode === 'manual' && (customCuts[activeTab] || []).map((cutY, index) => (
                        <g key={`cut-line-${index}`} className="group cursor-pointer">
                            {/* Interactive broad line */}
                            <line
                                x1={0}
                                y1={cutY}
                                x2={activeGraphPage.width}
                                y2={cutY}
                                stroke="transparent"
                                strokeWidth={24}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const updatedCuts = (customCuts[activeTab] || []).filter((_, idx) => idx !== index);
                                    const nextCuts = { ...customCuts, [activeTab]: updatedCuts };
                                    setCustomCuts(nextCuts);
                                    localStorage.setItem('blockcraft_custom_cuts', JSON.stringify(nextCuts));
                                }}
                            />
                            {/* Visual cut line */}
                            <line
                                x1={0}
                                y1={cutY}
                                x2={activeGraphPage.width}
                                y2={cutY}
                                stroke="#ef4444"
                                strokeWidth={2}
                                strokeDasharray="6,4"
                            />
                            {/* Interactive visual button */}
                            <g
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const updatedCuts = (customCuts[activeTab] || []).filter((_, idx) => idx !== index);
                                    const nextCuts = { ...customCuts, [activeTab]: updatedCuts };
                                    setCustomCuts(nextCuts);
                                    localStorage.setItem('blockcraft_custom_cuts', JSON.stringify(nextCuts));
                                }}
                            >
                                <rect
                                    x={10}
                                    y={cutY - 10}
                                    width={70}
                                    height={20}
                                    rx={4}
                                    fill="#ef4444"
                                    className="hover:fill-red-600 transition-colors"
                                />
                                <text
                                    x={45}
                                    y={cutY + 4}
                                    textAnchor="middle"
                                    fill="white"
                                    fontSize={10}
                                    fontWeight="bold"
                                    className="select-none pointer-events-none"
                                >
                                    Удалить ✕
                                </text>
                            </g>
                        </g>
                    ))}

                    {/* Preview line while dragging or hovering with active scissors */}
                    {isScissorsMode && hoveredY !== null && (
                        <g className="pointer-events-none">
                            <line
                                x1={0}
                                y1={hoveredY}
                                x2={activeGraphPage.width}
                                y2={hoveredY}
                                stroke="#3b82f6"
                                strokeWidth={2}
                                strokeDasharray="4,4"
                            />
                            <rect
                                x={10}
                                y={hoveredY - 10}
                                width={85}
                                height={20}
                                rx={4}
                                fill="#3b82f6"
                            />
                            <text
                                x={52}
                                y={hoveredY + 4}
                                textAnchor="middle"
                                fill="white"
                                fontSize={10}
                                fontWeight="bold"
                            >
                                ✂️ Сделать разрез
                            </text>
                        </g>
                    )}
                  </svg>
                  
                  {editingNode && (
                     <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/10 backdrop-blur-sm">
                         <div className="bg-white p-4 rounded-xl shadow-xl flex flex-col gap-3 min-w-[300px]"
                              onClick={e => e.stopPropagation()}>
                             <div className="flex justify-between items-center">
                                 <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-500">Edit Node Text</h3>
                                 <button onClick={() => setEditingNode(null)} className="text-zinc-400 hover:text-zinc-600 rounded p-1">
                                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                 </button>
                             </div>
                             <textarea 
                                 className="w-full h-32 p-3 border border-zinc-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-zinc-900"
                                 autoFocus
                                 value={editingNode.text}
                                 onChange={(e) => setEditingNode({ ...editingNode, text: e.target.value })}
                                 onKeyDown={(e) => {
                                     if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                                         const next = JSON.parse(JSON.stringify(overridesRef.current));
                                         if (!next[activeTab]) next[activeTab] = { nodes: {}, edges: {} };
                                         if (!next[activeTab].nodes) next[activeTab].nodes = {};
                                         if (!next[activeTab].nodes[editingNode.id]) next[activeTab].nodes[editingNode.id] = {};
                                         next[activeTab].nodes[editingNode.id].text = editingNode.text;
                                         pushHistory(next);
                                         setEditingNode(null);
                                     }
                                 }}
                             />
                             <div className="flex justify-between items-center text-xs text-zinc-400">
                                <span>Press <kbd className="bg-zinc-100 px-1 rounded">Cmd+Enter</kbd> to save</span>
                                <button className="bg-zinc-900 text-white px-4 py-2 rounded-lg font-medium hover:bg-zinc-800"
                                        onClick={() => {
                                            const next = JSON.parse(JSON.stringify(overridesRef.current));
                                            if (!next[activeTab]) next[activeTab] = { nodes: {}, edges: {} };
                                            if (!next[activeTab].nodes) next[activeTab].nodes = {};
                                            if (!next[activeTab].nodes[editingNode.id]) next[activeTab].nodes[editingNode.id] = {};
                                            next[activeTab].nodes[editingNode.id].text = editingNode.text;
                                            pushHistory(next);
                                            setEditingNode(null);
                                        }}>
                                    Save
                                </button>
                             </div>
                         </div>
                     </div>
                  )}
                </>
              )}

              {graphs.length === 0 && (
                <div className="my-auto flex flex-col items-center justify-center text-center p-8 max-w-md">
                  <div className="w-16 h-16 bg-white dark:bg-zinc-800 rounded-2xl flex items-center justify-center mb-4 border border-zinc-200 dark:border-zinc-700/80 shadow-md p-2">
                    <img src="/icon.svg" alt="Схематор" className="w-12 h-12 object-contain select-none" />
                  </div>
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-2">
                    Создание ГОСТ блок-схемы
                  </h3>
                  <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-4 leading-relaxed">
                    Введите или вставьте исходный код в редактор слева и нажмите <strong className="text-blue-600 dark:text-blue-400 font-semibold">«Создать схему»</strong>.
                  </p>
                  {!user ? (
                    <span className="text-xs text-zinc-400 dark:text-zinc-500">
                      При входе через Яндекс ID или Почту начисляется 1 токен бесплатно
                    </span>
                  ) : null}
                  {authError && (
                    <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-600 dark:text-red-300 max-w-sm text-left">
                      <strong>Ошибка входа:</strong> {authError}
                    </div>
                  )}
                </div>
              )}
            </div>
        </section>
      </main>

      {!viewMode && (
        <footer className="h-7 border-t border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-[#232328] flex items-center px-6 text-[11px] text-zinc-400 dark:text-zinc-500 font-medium shrink-0 justify-between relative z-30 transition-colors duration-300 select-none">
          <div>
            <span>ГОСТ 19.701-90</span>
          </div>
        </footer>
      )}

      {/* Bottom Right Diagram History Widget */}
      <DiagramHistory
        user={user}
        currentCode={code}
        currentLanguage={language}
        onSelectDiagram={handleSelectDiagramFromHistory}
        onOpenLogin={handleLogin}
        onNotify={showToast}
      />

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-14 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-zinc-900/90 dark:bg-zinc-100/95 text-white dark:text-zinc-900 text-xs font-semibold rounded-full shadow-xl backdrop-blur border border-white/10 dark:border-black/10 animate-in fade-in slide-in-from-bottom-2 duration-150">
          {toastMessage}
        </div>
      )}

      {/* Auth Modal for VK / Email / Student */}
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
        onSuccess={handleAuthSuccess} 
      />
    </div>
    </div>
  );
}

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Check, 
  Copy, 
  Loader2, 
  ArrowLeft,
  RefreshCw,
  Image,
  X
} from 'lucide-react';
import { predefinedTraces } from './predefinedData';
import { CognitiveTrace, NodeType } from './types';
import katex from 'katex';

// Fallback unicode math normalizer (used only if KaTeX fails in MathRenderer)
function formatMathText(text: string | null): string {
  if (!text) return '';
  let str = text;
  
  // Replace standard LaTeX escapes with unicode for display in text
  str = str.replace(/\\varepsilon/g, 'ε');
  str = str.replace(/\\delta/g, 'δ');
  str = str.replace(/\\lim_{n \\to \\infty}/gi, 'lim (n → ∞)');
  str = str.replace(/\\lim/g, 'lim');
  str = str.replace(/\\infty/g, '∞');
  str = str.replace(/\\lceil/g, '⌈');
  str = str.replace(/\\rceil/g, '⌉');
  str = str.replace(/\\lfloor/g, '⌊');
  str = str.replace(/\\rfloor/g, '⌋');
  str = str.replace(/\\iff/g, '⟺');
  str = str.replace(/\\implies/g, '⟹');
  str = str.replace(/\\quad/g, '   ');
  str = str.replace(/\\text{([^}]+)}/g, '$1');
  str = str.replace(/\\mathbb{N}/g, 'ℕ');
  str = str.replace(/\\mathbb{R}/g, 'ℝ');
  str = str.replace(/\\subseteq/g, '⊆');
  str = str.replace(/\\cap/g, '∩');
  str = str.replace(/\\land/g, '∧');
  str = str.replace(/\\lor/g, '∨');
  str = str.replace(/\\forall/g, '∀');
  str = str.replace(/\\exists/g, '∃');
  str = str.replace(/\\in/g, '∈');
  str = str.replace(/_n/g, 'ₙ');
  str = str.replace(/_k/g, 'ₖ');
  str = str.replace(/_V/g, 'ᵥ');
  str = str.replace(/_0/g, '₀');
  str = str.replace(/a_n/g, 'aₙ');
  str = str.replace(/\\frac{([^}]+)}{([^}]+)}/g, '$1/$2');
  
  // Absolute values and delimiters
  str = str.replace(/\\left\|/g, '|');
  str = str.replace(/\\right\|/g, '|');
  str = str.replace(/\\left\\|/g, '|');
  str = str.replace(/\\right\\|/g, '|');
  str = str.replace(/\\left/g, '');
  str = str.replace(/\\right/g, '');
  
  str = str.replace(/\\leq/g, '≤');
  str = str.replace(/\\geq/g, '≥');
  str = str.replace(/\\cdot/g, '·');
  
  // Remove stray backslashes
  str = str.replace(/\\/g, '');
  return str;
}

const MathRenderer: React.FC<{ latex: string }> = ({ latex }) => {
  const html = useMemo(() => {
    if (!latex) return '';
    const cleanLatex = latex.trim();
    try {
      return katex.renderToString(cleanLatex, {
        throwOnError: false,
        strict: false,
        displayMode: false,
      });
    } catch {
      return formatMathText(cleanLatex); // fallback
    }
  }, [latex]);
  return <span dangerouslySetInnerHTML={{ __html: html }} className="katex-math" />;
};

export default function App() {
  const [inputText, setInputText] = useState<string>('');
  const [activeTraceId, setActiveTraceId] = useState<string | null>(null);
  const [traces, setTraces] = useState<CognitiveTrace[]>(predefinedTraces);
  
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [activeSection, setActiveSection] = useState<'map' | 'pattern' | 'sequence' | 'exam'>('map');
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);
  const isLockedRef = useRef<boolean>(false);
  const activeTrace = traces.find((t) => t.id === activeTraceId);
  const activeTraceRef = useRef<CognitiveTrace | undefined>(activeTrace);
  useEffect(() => {
    activeTraceRef.current = activeTrace;
  }, [activeTrace]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Attached screenshots for multimodal (image + optional text) generation
  const [attachedImages, setAttachedImages] = useState<Array<{ mimeType: string; data: string; preview: string }>>([]);

  // Helper to render text that may contain embedded LaTeX (handles raw LaTeX in what/why/final etc. robustly)
  // Thoroughly handles: newlines (\n or \\n), bare latex in translations, mixed prose+math (defensive), "null", zero-width, etc.
  // Also supports simple markdown **bold** (and *italic*) in text segments for final solutions / emphasis (per user request for proper formatting in final).
  const renderTextWithMath = (text: string | null | undefined): React.ReactNode => {
    if (!text || typeof text !== 'string') return '';
    let t = text.trim();
    if (!t || t.toLowerCase() === 'null') return '';
    // Normalize all forms of newlines so they survive clean and can be turned into <br/>
    t = t.replace(/\\n/g, '\n').replace(/\r\n?/g, '\n');
    // Strip zero-width / junk chars that sometimes leak from model
    t = t.replace(/[\u200B-\u200D\uFEFF]/g, '');

    // Helper: render simple **bold** and *italic* / _italic_ in a plain text segment (no math delims).
    // Applied to text parts so final solution etc can have **stuff like this** as requested.
    // Uses dangerouslySetInnerHTML on a span for the formatted text (safe, no React key/array issues for sibling children in lists).
    const renderWithSimpleMarkdown = (txt: string): React.ReactNode => {
      if (!txt) return txt;
      // Escape HTML first (our data is trusted after clean but defensive)
      let html = txt
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      // **bold**
      html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>');
      // *italic* or _italic_
      html = html.replace(/\*(.+?)\*/g, '<em class="italic">$1</em>');
      html = html.replace(/_(.+?)_/g, '<em class="italic">$1</em>');
      return <span dangerouslySetInnerHTML={{ __html: html }} />;
    };

    // Split by newlines first so multi-line translations / workings / patterns render with proper breaks
    const lines = t.split('\n');
    const rendered = lines.map((rawLine, lineIdx) => {
      const line = rawLine.trim();
      if (!line) {
        return lineIdx < lines.length - 1 ? <br key={`br-${lineIdx}`} /> : null;
      }

      // Support \( \), \[ \], $ $, $$ $$  -- split this line
      const regex = /(\\[\(\[][\s\S]*?\\[\)\]]|\$\$[\s\S]*?\$\$|\$[\s\S]*?\$)/g;
      const parts: Array<{type: 'text' | 'math', content: string}> = [];
      let lastIndex = 0;
      let match;
      while ((match = regex.exec(line)) !== null) {
        if (match.index > lastIndex) {
          parts.push({ type: 'text', content: line.slice(lastIndex, match.index) });
        }
        let latex = match[0];
        latex = latex.replace(/^\\\(|^\\\[|^\$\$|^\$/, '').replace(/\\\)|\\\]$|\$\$$|\$$/, '').trim();
        if (latex) {
          // Fix over-escaped backslashes (model often emits \\Gamma etc. in the string value)
          // Real LaTeX linebreak \\ (two backslashes) is kept; \\ before command becomes single \
          latex = latex.replace(/\\{2}([a-zA-Z{(_^0-9])/g, '\\$1');
          parts.push({ type: 'math', content: latex });
        }
        lastIndex = regex.lastIndex;
      }
      if (lastIndex < line.length) {
        parts.push({ type: 'text', content: line.slice(lastIndex) });
      }

      let lineNodes: React.ReactNode;
      if (parts.length === 0) {
        // No $ delims: treat as bare math if it looks like it (commands, symbols, greek, operators common in translations)
        const looksBareLatex =
          /\\[a-zA-Z]/.test(line) ||
          /[\\^_{}=<>+\-*/⋅∑∫∏ΓΔΘΛΞΠΣΦΨΩαβγδζηθλμξπρστυφχψω]/.test(line) ||
          line.includes('begin') || line.includes('frac') || line.includes('pmatrix') ||
          /^\s*[A-Za-z_]+\s*=\s*/.test(line) || /_{[^}]+}/.test(line);
        if (looksBareLatex) {
          let l = line;
          l = l.replace(/\\{2}([a-zA-Z{(_^0-9])/g, '\\$1');
          lineNodes = <MathRenderer latex={l} />;
        } else {
          lineNodes = renderWithSimpleMarkdown(line);
        }
      } else {
        lineNodes = parts.map((part, index) =>
          part.type === 'text'
            ? <React.Fragment key={index}>{renderWithSimpleMarkdown(part.content)}</React.Fragment>
            : <MathRenderer key={index} latex={part.content} />
        );
      }

      return (
        <React.Fragment key={lineIdx}>
          {lineNodes}
          {lineIdx < lines.length - 1 ? <br /> : null}
        </React.Fragment>
      );
    });

    // Filter nulls from lines
    return rendered.filter(Boolean);
  };

  // History of previously deconstructed questions (persisted in localStorage)
  const [history, setHistory] = useState<any[]>([]);
  const [shareMessage, setShareMessage] = useState<string>('');
  const [pendingImport, setPendingImport] = useState<any>(null);

  // Helpers for shareable state (Base64 of JSON for problem + solution)
  // Use URL-safe base64 (no + / = padding) to keep links short, clean, and reliably shareable
  // (avoids encoding issues when pasting ?state=... into emails, chats, etc.)
  const encodeForUrl = (obj: any): string => {
    const json = JSON.stringify(obj);
    const utf8 = unescape(encodeURIComponent(json));
    let b64 = btoa(utf8);
    return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  };
  const decodeFromUrl = (b64: string): any => {
    let s = b64.replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '='; // restore padding
    const utf8 = atob(s);
    const json = decodeURIComponent(escape(utf8));
    return JSON.parse(json);
  };

  // --- History / Share / Import logic (defined early so effects can reference) ---
  const saveToHistory = (item: any) => {
    setHistory((prev: any[]) => {
      const filtered = prev.filter((h: any) => h.id !== item.id);
      const updated = [item, ...filtered].slice(0, 100);
      localStorage.setItem('mindtrace_history', JSON.stringify(updated));
      return updated;
    });
    // ensure the trace is available in the pool
    setTraces((prev) => {
      if (prev.some((t) => t.id === item.trace.id)) return prev;
      return [item.trace, ...prev];
    });
  };

  const activateItem = (item: any) => {
    let trace = item.trace || item;

    // Client-side clean for old history/shared data (backend also cleans new gens)
    const cleanStr = (s: any) => {
      if (!s || typeof s !== 'string') return s;
      let c = s.trim();
      if (c.toLowerCase() === 'null' || c === '') return null;
      // Preserve newlines for multi-line formatting (e.g. in translations, workings, patterns); only collapse horizontal ws
      c = c.replace(/[ \t\r]+/g, ' ');
      c = c.replace(/\n{3,}/g, '\n\n');
      // Remove zero-width junk sometimes emitted
      c = c.replace(/[\u200B-\u200D\uFEFF]/g, '');
      // light de-concat for display (run per logical line)
      c = c.replace(/([a-zA-Z0-9.,;:!?)])([A-Z(])/g, '$1 $2');
      c = c.replace(/([)}\]])([A-Za-z])/g, '$1 $2');
      // strip common leaks of "Read Problem X: ..." or "Problem 1: [full original]" that model sometimes injects into trace fields (seen in both typed and image paths)
      c = c.replace(/\s*Read\s+Problem\s*\d*[:\.\-][\s\S]*$/gi, '');
      c = c.replace(/\s*Problem\s*\d*[:\.\-][\s\S]*$/gi, '');
      // strip leading numbering e.g. "1. " "2) " from lines (esp. final solution workings for calc answers; you don't number steps in actual exam write-ups)
      c = c.replace(/^\s*\d+[\.\)\:\-\s]+/, '');
      return c;
    };
    if (trace) {
      trace = { ...trace };
      if (Array.isArray(trace.traceNodes)) {
        trace.traceNodes = trace.traceNodes.map((n: any) => ({
          ...n,
          what: cleanStr(n.what) || n.what,
          why: cleanStr(n.why) || n.why,
          translation: cleanStr(n.translation),
        }));
      }
      if (trace.title) trace.title = cleanStr(trace.title) || trace.title;
      if (trace.finalAnswer) {
        if (Array.isArray(trace.finalAnswer.workings)) {
          trace.finalAnswer.workings = trace.finalAnswer.workings
            .map((w: any) => cleanStr(w) || w)
            .filter((w: any) => w != null && w !== '');
        }
        trace.finalAnswer.conclusion = cleanStr(trace.finalAnswer.conclusion) || trace.finalAnswer.conclusion;
      }
      // Also clean question / nestedQuestion fields so main problem + subs are formatted for typed history items too
      if (trace.question && trace.question.problemStatement) {
        trace.question = {
          ...trace.question,
          problemStatement: cleanStr(trace.question.problemStatement) || trace.question.problemStatement,
        };
      }
      if (trace.nestedQuestion) {
        trace.nestedQuestion = {
          ...trace.nestedQuestion,
          context: cleanStr(trace.nestedQuestion.context) || trace.nestedQuestion.context,
          subquestions: Array.isArray(trace.nestedQuestion.subquestions)
            ? trace.nestedQuestion.subquestions.map((sq: any) => ({
                ...sq,
                problemStatement: cleanStr(sq.problemStatement) || sq.problemStatement,
              }))
            : trace.nestedQuestion.subquestions,
        };
      }
      // Filter null/empty from knowledge and pattern if present in old data
      if (trace.knowledgeMap) {
        ['before', 'teaches', 'assumes'].forEach((k) => {
          if (Array.isArray(trace.knowledgeMap[k])) {
            trace.knowledgeMap[k] = trace.knowledgeMap[k]
              .map((x: any) => cleanStr(x) || x)
              .filter((x: any) => x != null && x !== '');
          }
        });
      }
    }

    setTraces((prev) => {
      if (prev.some((t) => t.id === trace.id)) return prev;
      return [trace, ...prev];
    });
    setActiveTraceId(trace.id);
    setInputText(item.problemStatement || (trace.question ? trace.question.problemStatement : (trace.nestedQuestion ? trace.nestedQuestion.context : '')));
    const imgs = item.images || [];
    setAttachedImages(
      imgs.map((img: any) => ({
        mimeType: img.mimeType,
        data: img.data,
        preview: img.preview || (img.data ? `data:${img.mimeType};base64,${img.data}` : ''),
      }))
    );
    setError(null);
    isLockedRef.current = false;
  };

  const shareItem = (item: any) => {
    try {
      // Create compact share data: ONLY the trace (problemStatement is inside trace.question or nestedQuestion, so no dup).
      // Omit images (already not here). Strip id/isCustom from trace copy (small win for link length, we regen on load).
      // This + url-safe base64 keeps ?state= links as short/condensed as possible while still fully replayable.
      const traceCopy = item.trace ? { ...item.trace } : {};
      delete traceCopy.id;
      delete traceCopy.isCustom;
      const shareData = {
        trace: traceCopy,
      };
      const base64 = encodeForUrl(shareData);
      const url = `${window.location.origin}${window.location.pathname}?state=${base64}`;
      navigator.clipboard
        .writeText(url)
        .then(() => {
          setShareMessage('Share link copied to clipboard! (condensed, images omitted)');
          setTimeout(() => setShareMessage(''), 3000);
        })
        .catch(() => {
          window.prompt('Copy this share link (condensed, images omitted):', url);
        });
    } catch (e: any) {
      setError('Failed to create share link: ' + e.message);
    }
  };

  const deleteHistoryItem = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setHistory((prev: any[]) => {
      const updated = prev.filter((h: any) => h.id !== id);
      localStorage.setItem('mindtrace_history', JSON.stringify(updated));
      return updated;
    });
    // If the deleted item is currently active, reset to start screen cleanly
    if (activeTraceId === id) {
      setActiveTraceId(null);
      setInputText('');
      setAttachedImages([]);
      setActiveSection('map');
      setActiveStepIndex(0);
      isLockedRef.current = false;
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [inputText]);

  useEffect(() => {
    setActiveSection('map');
    setActiveStepIndex(0);
    isLockedRef.current = false;
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [activeTraceId]);

  useEffect(() => {
    if (activeTraceId) {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [activeSection]);

  // Load history from localStorage and preload traces
  useEffect(() => {
    try {
      const saved = localStorage.getItem('mindtrace_history');
      if (saved) {
        const parsed = JSON.parse(saved);
        setHistory(parsed);
        // preload the solved traces so they can be activated by id
        setTraces((prev) => {
          const ids = new Set(prev.map((t) => t.id));
          const toAdd = parsed.map((h: any) => h.trace).filter((t: any) => t && !ids.has(t.id));
          return [...toAdd, ...prev];
        });
      }
    } catch (e) {
      console.warn('Failed to load history from localStorage');
    }
  }, []);

  // Handle ?state= shared link on initial load (import)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const stateB64 = params.get('state');
      if (stateB64) {
        let item = decodeFromUrl(stateB64);
        if (item && item.trace) {
          const tr = item.trace;
          // Normalize for condensed shares (which send only {trace}, no top-level problem/id):
          // - assign fresh short id (don't bloat link with original long custom-xxx id)
          // - ensure top-level problemStatement (for history cards / activate display without always deep fallback)
          // This keeps links condensed while making activate/save/pending/history all work smoothly.
          const sharedId = item.id || tr.id || `shared-${Date.now()}`;
          tr.id = sharedId;
          const normalized = {
            id: sharedId,
            problemStatement: item.problemStatement || (tr.question ? tr.question.problemStatement : (tr.nestedQuestion ? tr.nestedQuestion.context : '')),
            trace: tr,
          };
          activateItem(normalized);
          setPendingImport(normalized);
          // clean the URL
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }
    } catch (e) {
      console.warn('Failed to import shared state from URL', e);
    }
  }, []);

  const navigateDirection = React.useCallback((forward: boolean) => {
    if (isLockedRef.current || !activeTraceId || !activeTraceRef.current) return;
    const totalSteps = activeTraceRef.current.traceNodes?.length || 0;

    // Pre-check to avoid locking when at boundaries (map backward or exam forward).
    // This ensures you can always navigate back even after reaching the end (or beginning).
    let willAct = false;
    if (forward) {
      if (activeSection === 'map' || activeSection === 'pattern') {
        willAct = true;
      } else if (activeSection === 'sequence') {
        willAct = true; // advances step or goes to exam
      } else if (activeSection === 'exam') {
        willAct = false;
      }
    } else {
      if (activeSection === 'exam' || activeSection === 'sequence' || activeSection === 'pattern') {
        willAct = true;
      } else if (activeSection === 'map') {
        willAct = false;
      }
    }
    if (!willAct) {
      return; // no-op at boundary: do not lock, so reverse scroll direction remains immediately responsive
    }

    isLockedRef.current = true;

    const shortLock = 600;
    const longLock = 750;

    if (forward) {
      if (activeSection === 'map') {
        setActiveSection('pattern');
        setTimeout(() => { isLockedRef.current = false; }, longLock);
      } else if (activeSection === 'pattern') {
        setActiveSection('sequence');
        setActiveStepIndex(0);
        setTimeout(() => { isLockedRef.current = false; }, longLock);
      } else if (activeSection === 'sequence') {
        if (activeStepIndex < totalSteps - 1) {
          setActiveStepIndex((prev) => prev + 1);
          setTimeout(() => { isLockedRef.current = false; }, shortLock);
        } else {
          setActiveSection('exam');
          setTimeout(() => { isLockedRef.current = false; }, longLock);
        }
      }
    } else {
      if (activeSection === 'exam') {
        setActiveSection('sequence');
        setActiveStepIndex(totalSteps - 1);
        setTimeout(() => { isLockedRef.current = false; }, longLock);
      } else if (activeSection === 'sequence') {
        if (activeStepIndex > 0) {
          setActiveStepIndex((prev) => prev - 1);
          setTimeout(() => { isLockedRef.current = false; }, shortLock);
        } else {
          setActiveSection('pattern');
          setTimeout(() => { isLockedRef.current = false; }, longLock);
        }
      } else if (activeSection === 'pattern') {
        setActiveSection('map');
        setTimeout(() => { isLockedRef.current = false; }, longLock);
      }
    }
  }, [activeTraceId, activeSection, activeStepIndex]);

  useEffect(() => {
    if (!activeTraceId) {
      setActiveStepIndex(0);
      return;
    }

    const handleWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      if (Math.abs(e.deltaY) < 12) return;
      if (isLockedRef.current) return;
      const direction = e.deltaY > 0 ? 1 : -1;
      e.preventDefault();
      navigateDirection(direction === 1);
    };

    let touchStartY = 0;
    const handleTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const touchEndY = e.changedTouches[0].clientY;
      const diffY = touchStartY - touchEndY;
      if (Math.abs(diffY) < 40) return;
      if (isLockedRef.current) return;
      const direction = diffY > 0 ? 1 : -1;
      navigateDirection(direction === 1);
    };

    // Keyboard arrow navigation (now implemented; previously only in hints).
    // ArrowDown/Right/PageDown = forward (next stage or step); ArrowUp/Left/PageUp = backward.
    // Matches the vertical "scroll" metaphor and makes nav resilient if wheel/touch glitch.
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!activeTraceId || isLockedRef.current) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        navigateDirection(true);
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        navigateDirection(false);
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('touchstart', handleTouchStart);
    window.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeTraceId, activeSection, activeStepIndex, navigateDirection]);

  const selectPreset = (id: string) => {
    setActiveTraceId(id);
    setAttachedImages([]);
    setError(null);
    isLockedRef.current = false;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!inputText.trim() && attachedImages.length === 0) || isGenerating) return;

    setIsGenerating(true);
    setError(null);

    try {
      const payload: any = { problemStatement: inputText };
      if (attachedImages.length > 0) {
        payload.images = attachedImages.map((img) => ({ mimeType: img.mimeType, data: img.data }));
      }
      const response = await fetch('/api/generate-trace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errPayload = await response.json().catch(() => ({}));
        // Include details so user sees real error (e.g. gemini issues) in UI instead of needing terminal
        const msg = [errPayload.error, errPayload.details].filter(Boolean).join(': ') || 'Failed to craft Cognitive Trace.';
        throw new Error(msg);
      }

      const traceData = await response.json();
      const newTrace: CognitiveTrace = {
        ...traceData,
        id: `custom-${Date.now()}`,
        isCustom: true,
      };

      setTraces((prev) => [newTrace, ...prev]);
      setActiveTraceId(newTrace.id);
      setPendingImport(null);

      // capture for history before clearing
      const submittedProblem = inputText;
      const submittedImgs = attachedImages;

      setInputText('');
      // images cleared via the activeTraceId effect (and we also clear explicitly for safety)
      setAttachedImages([]);
      isLockedRef.current = false;

      // Save to local history (the "previously deconstructed")
      const historyItem = {
        id: newTrace.id,
        timestamp: Date.now(),
        problemStatement: submittedProblem,
        images: submittedImgs.length > 0 ? submittedImgs.map((img: any) => ({ mimeType: img.mimeType, data: img.data })) : undefined,
        trace: newTrace,
      };
      saveToHistory(historyItem);
    } catch (err: any) {
      console.error('[MindTrace] Generation failed (see details in UI):', err);
      setError(err.message || 'Connecting server failed.');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyExamWording = () => {
    const activeTrace = traces.find((t) => t.id === activeTraceId);
    if (!activeTrace) return;
    
    const textToCopy = [
      ...activeTrace.finalAnswer.workings,
      activeTrace.finalAnswer.conclusion
    ].join('\n');

    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // --- Image attach / paste support (for screenshots of questions, possibly with subparts) ---
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    files.forEach((file: File) => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        const base64 = dataUrl.substring(dataUrl.indexOf(',') + 1);
        setAttachedImages((prev) => [...prev, { mimeType: file.type, data: base64, preview: dataUrl }]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = ''; // allow re-selecting same file later
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    let added = false;
    for (let i = 0; i < items.length; i++) {
      const item = items[i] as DataTransferItem;
      if (item && item.type && item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (ev) => {
            const dataUrl = ev.target?.result as string;
            const base64 = dataUrl.substring(dataUrl.indexOf(',') + 1);
            setAttachedImages((prev) => [...prev, { mimeType: item.type, data: base64, preview: dataUrl }]);
          };
          reader.readAsDataURL(file as Blob);
          added = true;
        }
      }
    }
    if (added) {
      e.preventDefault(); // don't let image data pollute the textarea
    }
  };

  const removeAttachedImage = (index: number) => {
    setAttachedImages((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="min-h-screen font-sans bg-[#1c1d1e] text-[#f1f1f1] relative overflow-x-hidden">
      {/* Background circles on the sides of the screen (flanking the centered content on both startup and trace views). Not behind the info, not clipped. */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        {/* Left side circles - closer to content start edge (around px-6 gutter), some bigger. Use % and sm: to avoid crowding on phones. */}
        <div className="absolute rounded-full border border-neutral-500/50 w-2 sm:w-3 h-2 sm:h-3 left-[3%] sm:left-6 top-[12%] animate-[float-slow_12s_ease-in-out_infinite]" style={{ animationDelay: '-2s' }} />
        <div className="absolute rounded-full bg-neutral-600/25 w-4 sm:w-6 h-4 sm:h-6 left-[6%] sm:left-10 top-[25%] animate-[float-slower_15s_ease-in-out_infinite]" />
        <div className="absolute rounded-full border border-neutral-400/55 w-7 sm:w-10 h-7 sm:h-10 left-[8%] sm:left-14 top-[50%] animate-[pulse-subtle_9s_ease-in-out_infinite]" />
        <div className="absolute rounded-full bg-neutral-700/15 w-10 sm:w-14 h-10 sm:h-14 left-[2%] sm:left-[4%] bottom-[30%] animate-[float-slow_18s_ease-in-out_infinite]" style={{ animationDelay: '4s' }} />
        <div className="absolute rounded-full border border-neutral-500/45 w-14 sm:w-20 h-14 sm:h-20 left-[5%] sm:left-8 top-[70%] animate-[float-slower_22s_ease-in-out_infinite]" />
        {/* Right side circles - closer to content right edge, some bigger */}
        <div className="absolute rounded-full border border-neutral-500/40 w-3 sm:w-4 h-3 sm:h-4 right-[3%] sm:right-6 top-[15%] animate-[float-slower_22s_ease-in-out_infinite]" />
        <div className="absolute rounded-full bg-neutral-600/20 w-4 sm:w-5 h-4 sm:h-5 right-[6%] sm:right-10 bottom-[18%] animate-[pulse-subtle_7s_ease-in-out_infinite]" style={{ animationDelay: '-1s' }} />
        <div className="absolute rounded-full border border-neutral-400/45 w-6 sm:w-9 h-6 sm:h-9 right-[8%] sm:right-14 top-[45%] animate-[float-slow_14s_ease-in-out_infinite]" />
        <div className="absolute rounded-full bg-neutral-700/12 w-8 sm:w-12 h-8 sm:h-12 right-[3%] sm:right-[5%] bottom-[35%] animate-[float-slow_20s_ease-in-out_infinite]" />
        <div className="absolute rounded-full border border-neutral-500/40 w-14 sm:w-20 h-14 sm:h-20 right-[5%] sm:right-8 top-[65%] animate-[float-slower_16s_ease-in-out_infinite]" />
      </div>
      <main className="w-full relative px-6 py-4 md:py-6 z-10">
        <AnimatePresence mode="wait">
          {!activeTraceId ? (
            /* START PAGE */
            <motion.div
              key="start-screen"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.4 }}
              className="w-full flex flex-col items-center justify-center text-center min-h-[calc(100vh-4rem)]"
            >
              <h1 className="font-display text-3xl md:text-5xl font-light tracking-[-0.02em] text-center leading-tight mb-4 text-white break-words md:whitespace-nowrap">
                Analyze problems with Cognitive Tracing<span className="text-brand-blue font-sans">.</span>
              </h1>
              
              <p className="text-base md:text-lg font-normal mb-8 max-w-xl mx-auto text-neutral-400">
                Capture the hidden step-by-step reasoning experts use for analytical school questions — math, physics, chemistry &amp; beyond.
              </p>

              {/* Glowing animated border prompt container (wider + now a little taller again) */}
              <div className="w-full max-w-5xl mx-auto snake-border-wrapper mb-8 relative z-10">
                <div className="snake-glow-element" />
                
                <form 
                  onSubmit={handleSubmit}
                  className="w-full rounded-[22px] py-6 md:py-8 text-left bg-[#1e1f20]"
                >
                  {/* Hidden file input for attach button */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/png,image/jpeg,image/webp,image/*"
                    className="hidden"
                    onChange={handleFileSelect}
                  />

                  {/* Preview strip for attached screenshots - larger, at the top, aligned */}
                  {attachedImages.length > 0 && (
                    <div className="mb-5 px-4 md:px-6 flex flex-wrap items-center gap-4">
                      {attachedImages.map((img, idx) => (
                        <div key={idx} className="relative group">
                          <img
                            src={img.preview}
                            alt={`screenshot ${idx + 1}`}
                            className="h-16 w-16 sm:h-24 sm:w-24 object-contain rounded border border-neutral-700 bg-black/30"
                          />
                          <button
                            type="button"
                            onClick={() => removeAttachedImage(idx)}
                            className="absolute -top-1 -right-1 sm:-top-1.5 sm:-right-1.5 bg-neutral-900 text-neutral-400 hover:text-rose-400 rounded-full w-7 h-7 sm:w-6 sm:h-6 flex items-center justify-center text-xs leading-none border border-neutral-700 opacity-90 group-hover:opacity-100"
                            title="Remove image"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Input row: textarea full from content-start to button-end, with overlaid side icons. Minimal internal x padding on textarea so text starts near left of its box (aligned to content start like other elements). */}
                  <div className="relative px-4 md:px-6">
                    <textarea
                      ref={textareaRef}
                      rows={3}
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onPaste={handlePaste}
                      placeholder="e.g., Prove that W ∩ V is a subspace of V... (or paste/attach screenshot)"
                      className="w-full bg-transparent border-none outline-none focus:ring-0 text-sm md:text-base font-sans resize-none py-2 focus:outline-none overflow-hidden text-white placeholder-neutral-500 min-h-[120px] pl-6 pr-16 sm:pr-20"
                      disabled={isGenerating}
                      onKeyDown={(e) => {
                        // Enter = newline (default for textarea, allows multi-line problems).
                        // Ctrl+Enter = submit / deconstruct (label on button updates when you start typing).
                        if (e.key === 'Enter' && e.ctrlKey) {
                          e.preventDefault();
                          const form = (e.target as HTMLTextAreaElement).form;
                          if (form) form.requestSubmit();
                        }
                      }}
                    />
                    
                    {/* Attach icon overlaid on left of textarea - same distance from container edge as the typing text (pl-6) */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute left-6 bottom-2 p-3 sm:p-2 rounded-xl bg-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-700 transition-colors focus:outline-none min-h-[44px] min-w-[44px] flex items-center justify-center"
                      title="Attach image screenshot(s) of the question (PNG/JPG). You can also paste directly from clipboard."
                      disabled={isGenerating}
                    >
                      <Image className="w-4 h-4" />
                    </button>

                    {/* Submit button overlaid on right end of textarea - same distance from container edge as the typing space */}
                    <button
                      type="submit"
                      disabled={(!inputText.trim() && attachedImages.length === 0) || isGenerating}
                      className={`absolute right-6 bottom-2 inline-flex items-center justify-center gap-2 px-4 py-2 sm:py-2 rounded-xl font-medium text-xs md:text-sm transition-colors focus:outline-none shrink-0 min-h-[44px] ${
                        isGenerating || (!inputText.trim() && attachedImages.length === 0)
                          ? 'bg-neutral-700 text-neutral-400 cursor-not-allowed'
                          : 'bg-brand-blue text-white hover:bg-brand-blue-dark cursor-pointer'
                      }`}
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Tracing...</span>
                        </>
                      ) : inputText.trim().length > 0 ? (
                        <>
                          <span>Ctrl + </span>
                          <span className="font-mono" title="Ctrl+Enter">↵</span>
                        </>
                      ) : (
                        <span>Deconstruct</span>
                      )}
                    </button>
                  </div>

                  {error && (
                    <div className="mt-4 px-4 py-2 md:px-6 text-xs font-semibold text-rose-400 bg-rose-950/30 border border-rose-900/50 rounded text-left leading-relaxed flex items-start gap-2">
                      <span className="flex-1">Error: {error}</span>
                      <button
                        type="button"
                        onClick={() => setError(null)}
                        className="shrink-0 opacity-60 hover:opacity-100 focus:outline-none"
                        aria-label="Dismiss error"
                      >
                        ×
                      </button>
                    </div>
                  )}
                </form>
              </div>

              {/* History of previously deconstructed questions (replaces the old preset/testing grid) */}
              <div className="w-full max-w-3xl mx-auto text-left mt-2">
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-xs uppercase tracking-widest font-bold opacity-30 block text-center md:text-left text-neutral-400">
                    History
                  </span>
                  {shareMessage && (
                    <span className="text-[10px] text-emerald-400">{shareMessage}</span>
                  )}
                </div>
                {history.length === 0 ? (
                  <div className="p-4 text-center text-xs text-neutral-500 border border-neutral-800 rounded-xl bg-[#181819]">
                    No previously deconstructed questions yet.<br />
                    Solve a problem above (text or with screenshot) to save it here.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {history.map((item: any) => (
                      <div
                        key={item.id}
                        onClick={() => activateItem(item)}
                        className="p-4 rounded-xl border text-left cursor-pointer transition-colors select-none bg-[#181819] border-neutral-800 hover:border-neutral-700 text-[#e8eaed] relative"
                      >
                        <div className="flex justify-between items-start gap-2">
                          <h3 className="font-display font-medium text-sm md:text-base tracking-tight mb-1 pr-2 line-clamp-1">
                            {renderTextWithMath(item.trace.title) || item.trace.title}
                          </h3>
                          <div className="flex gap-1 shrink-0">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                shareItem(item);
                              }}
                              className="text-[10px] px-2 py-1 sm:py-0.5 rounded bg-neutral-700 hover:bg-neutral-600 text-neutral-300 min-h-[32px] sm:min-h-0"
                              title="Generate condensed shareable link for this deconstruction (images omitted)"
                            >
                              Share
                            </button>
                            <button
                              onClick={(e) => deleteHistoryItem(item.id, e)}
                              className="text-[10px] px-1.5 py-1 sm:py-0.5 rounded bg-neutral-700 hover:bg-rose-600 text-neutral-300 hover:text-white min-h-[32px] sm:min-h-0"
                              title="Delete from history"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        <p className="text-xs opacity-50 line-clamp-2">
                          {renderTextWithMath(item.problemStatement || (item.trace?.question?.problemStatement || 'Question from image'))}
                        </p>
                        {item.timestamp && (
                          <div className="text-[10px] opacity-40 mt-1">
                            {new Date(item.timestamp).toLocaleDateString()} {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            /* ACTIVE TRACE STAGES */
            <motion.div
              key="trace-active-screen"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.4 }}
              className="max-w-3xl mx-auto text-left relative text-[#f1f1f1]"
            >
              {/* Top nav bar (flat, minimal) - always-visible way back to dashboard. No "edit original" affordance (removed per UX feedback). */}
              <div className="relative z-10 pb-4 flex items-center mb-8 border-b border-neutral-800">
                <button
                  onClick={() => {
                    setActiveTraceId(null);
                    setError(null);
                    setActiveSection('map');
                    setActiveStepIndex(0);
                    setAttachedImages([]);
                    setPendingImport(null);
                    setInputText('');
                    isLockedRef.current = false;
                  }}
                  title="Return to the dashboard / start a new analysis"
                  className="inline-flex items-center gap-1.5 p-2 sm:p-1.5 px-3.5 rounded-full text-xs sm:text-xs font-semibold border cursor-pointer select-none border-[#2d2f31] text-[#a8c7fa] hover:bg-neutral-900 min-h-[36px]"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>New Analysis</span>
                </button>
              </div>

              {/* Pending import save prompt (from ?state= shared link) */}
              {pendingImport && pendingImport.trace && activeTraceId === pendingImport.trace.id && (
                <div className="mb-3 p-2 text-xs bg-neutral-800 border border-neutral-700 rounded flex items-center justify-between relative z-10">
                  <span>Loaded from a shared link.</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        saveToHistory(pendingImport);
                        setPendingImport(null);
                      }}
                      className="px-2 py-0.5 bg-brand-blue hover:bg-brand-blue-dark text-white rounded text-[10px]"
                    >
                      Save to my history?
                    </button>
                    <button
                      onClick={() => setPendingImport(null)}
                      className="px-2 py-0.5 bg-neutral-700 hover:bg-neutral-600 rounded text-[10px]"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}

              {/* Persistent main problem statement at the VERY TOP of the trace view (on EVERY stage/screen).
                  This is what makes image flows feel consistent and "the question is always visible".
                  Now applied uniformly for typed text inputs AND images, flat AND nested (for nested we show the
                  overarching context here; full hierarchy + parts list is still available in the Prerequisites stage). */}
              {activeTrace && (() => {
                const main = activeTrace.nestedQuestion
                  ? activeTrace.nestedQuestion.context
                  : activeTrace.question?.problemStatement;
                if (!main) return null;
                const subs = activeTrace.nestedQuestion?.subquestions || [];
                return (
                  <div className="mb-6 relative z-10">
                    <span className="text-xs uppercase tracking-wider font-bold text-[#a8c7fa] block mb-1.5">Problem</span>
                    <p className="text-base font-sans font-medium opacity-80 pl-4 border-l-2 border-brand-blue/50">
                      {renderTextWithMath(main)}
                    </p>
                    {subs.length > 0 && (
                      <div className="pl-4 mt-1 text-[11px] opacity-50">
                        Parts: {subs.map((s: any, i: number) => s.label).join(', ')}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Scrolling Vertical Tracker Dots on the RIGHT margin */}
              <div className="hidden lg:flex flex-col items-center gap-3.5 fixed right-8 md:right-10 top-1/2 -translate-y-1/2 z-40 select-none">
                <div
                  className="group flex items-center justify-end h-5 w-5 focus:outline-none cursor-pointer"
                  title="Go to Prerequisites"
                  onClick={() => { setActiveSection('map'); setActiveStepIndex(0); isLockedRef.current = false; }}
                >
                  <span className="text-[10px] font-sans opacity-0 group-hover:opacity-100 transition-opacity duration-150 mr-2.5 text-neutral-400">
                    Prerequisites
                  </span>
                  <div className={`w-1.5 h-1.5 rounded-full transition-colors duration-200 ${
                    activeSection === 'map'
                      ? 'bg-brand-blue scale-125'
                      : 'bg-neutral-700'
                  }`} />
                </div>

                <div
                  className="group flex items-center justify-end h-5 w-5 focus:outline-none cursor-pointer"
                  title="Go to Heuristic Pattern"
                  onClick={() => { setActiveSection('pattern'); isLockedRef.current = false; }}
                >
                  <span className="text-[10px] font-sans opacity-0 group-hover:opacity-100 transition-opacity duration-150 mr-2.5 text-neutral-400">
                    Heuristics
                  </span>
                  <div className={`w-1.5 h-1.5 rounded-full transition-colors duration-200 ${
                    activeSection === 'pattern'
                      ? 'bg-brand-blue scale-125'
                      : 'bg-neutral-700'
                  }`} />
                </div>

                <div
                  className="group flex items-center justify-end h-5 w-5 focus:outline-none cursor-pointer"
                  title="Go to Thinking Trace"
                  onClick={() => { setActiveSection('sequence'); setActiveStepIndex(0); isLockedRef.current = false; }}
                >
                  <span className="text-[10px] font-sans opacity-0 group-hover:opacity-100 transition-opacity duration-150 mr-2.5 text-neutral-400">
                    Trace
                  </span>
                  <div className={`w-1.5 h-1.5 rounded-full transition-colors duration-200 ${
                    activeSection === 'sequence'
                      ? 'bg-brand-blue scale-125'
                      : 'bg-neutral-700'
                  }`} />
                </div>

                <div
                  className="group flex items-center justify-end h-5 w-5 focus:outline-none cursor-pointer"
                  title="Go to Final Solution"
                  onClick={() => { setActiveSection('exam'); isLockedRef.current = false; }}
                >
                  <span className="text-[10px] font-sans opacity-0 group-hover:opacity-100 transition-opacity duration-150 mr-2.5 text-neutral-400">
                    Solution
                  </span>
                  <div className={`w-1.5 h-1.5 rounded-full transition-colors duration-200 ${
                    activeSection === 'exam'
                      ? 'bg-brand-blue scale-125'
                      : 'bg-neutral-700'
                  }`} />
                </div>
              </div>

              {/* Trace Core details */}
              <div className="relative z-10">
                <AnimatePresence mode="wait">
                  {activeSection === 'map' && (
                    <motion.div
                      key="stage-map"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -12 }}
                      transition={{ duration: 0.25, ease: "easeOut" }}
                      className="space-y-10 focus:outline-none"
                    >
                      <div className="border-b border-neutral-500/10 pb-4">
                        <h2 className="text-[26px] md:text-[34px] font-display font-light tracking-[-0.01em] mb-1 text-white">
                          Things you need before watching this trace<span className="text-brand-blue font-sans">.</span>
                        </h2>
                        <p className="text-xs uppercase tracking-widest font-bold opacity-30">
                          Stage 1: Concept dependencies & prerequisite structures
                        </p>
                      </div>

                      {activeTrace?.nestedQuestion && (
                        <div className="py-2 text-left">
                          <span className="text-xs uppercase tracking-wider font-bold text-[#a8c7fa] block mb-3">
                            Problem Environment Hierarchy
                          </span>
                          <p className="text-base font-sans font-medium opacity-80 mb-4 pl-4 border-l-2 border-brand-blue/50">
                            {renderTextWithMath(activeTrace.nestedQuestion.context)}
                          </p>
                          <div className="pl-6 space-y-3">
                            {activeTrace.nestedQuestion.subquestions.map((sub, sidx) => (
                              <div key={sidx} className="text-sm">
                                <span className="font-semibold text-[#a8c7fa] mr-2">Part ({sub.label}):</span>
                                <span className="opacity-80">{renderTextWithMath(sub.problemStatement)}</span>
                                {sub.dependsOn && sub.dependsOn.length > 0 && (
                                  <span className="block text-[11px] opacity-40 mt-0.5">
                                    (Dependency constraint: relies directly on solved Part {sub.dependsOn.join(', ')})
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* FLAT list rendering of prerequisite dependencies */}
                      <div className="space-y-6">
                        {activeTrace?.knowledgeMap.before.map((item, idx) => (
                          <div key={idx} className="flex items-start gap-4">
                            <span className="shrink-0 font-bold text-neutral-500">
                              →
                            </span>
                            <p className="font-sans font-medium text-base md:text-lg">
                              {renderTextWithMath(item)}
                            </p>
                          </div>
                        ))}
                      </div>

                      {/* Stacked lists instead of grids! */}
                      <div className="space-y-8 pt-6 border-t border-dashed border-neutral-500/10">
                        <div>
                          <h3 className="text-xs uppercase tracking-widest font-semibold opacity-40 mb-3">
                            Skills this trace teaches
                          </h3>
                          <ul className="space-y-2">
                            {activeTrace?.knowledgeMap.teaches.map((item, idx) => (
                              <li key={idx} className="text-sm md:text-base font-sans opacity-85 flex items-start gap-2.5">
                                <span className="text-emerald-500 shrink-0 text-xs mt-1">✓</span>
                                <span>{renderTextWithMath(item)}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div>
                          <h3 className="text-xs uppercase tracking-widest font-semibold opacity-40 mb-3">
                            Silent cognitive assumptions
                          </h3>
                          <ul className="space-y-2">
                            {activeTrace?.knowledgeMap.assumes.map((item, idx) => (
                              <li key={idx} className="text-sm md:text-base font-sans opacity-85 flex items-start gap-2.5">
                                <span className="text-brand-blue shrink-0 text-xs mt-1">::</span>
                                <span>{renderTextWithMath(item)}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* Bottom action panel */}
                      <div className="pt-12 mt-12 border-t border-neutral-500/10 text-xs font-sans tracking-widest uppercase opacity-40 text-center md:text-left">
                        Scroll down to explore heuristic pattern
                      </div>
                    </motion.div>
                  )}

                  {activeSection === 'pattern' && (
                    <motion.div
                      key="stage-pattern"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -12 }}
                      transition={{ duration: 0.25, ease: "easeOut" }}
                      className="space-y-10 focus:outline-none"
                    >
                      <div className="border-b border-neutral-500/10 pb-4">
                        <h2 className="text-[26px] md:text-[34px] font-display font-light tracking-[-0.01em] mb-1 text-white">
                          Recognizing the pattern<span className="text-brand-blue font-sans">.</span>
                        </h2>
                        <p className="text-xs uppercase tracking-widest font-bold opacity-30">
                          Stage 2: General heuristic models and strategic mapping
                        </p>
                      </div>

                      {/* Fully flat linear style, sequential with clear order */}
                      <div className="space-y-8">
                        <div>
                          <span className="text-xs uppercase tracking-wider font-semibold text-[#a8c7fa] block mb-1">
                            When you see...
                          </span>
                          <p className="text-lg md:text-xl font-sans font-medium">
                            "{renderTextWithMath(activeTrace?.patternSummary.whenYouSee || '')}"
                          </p>
                        </div>

                        <div className="space-y-8 pt-6 border-t border-dashed border-neutral-500/10">
                          <div>
                            <span className="text-xs uppercase tracking-wider font-semibold text-neutral-400 block mb-1">
                              Always start by...
                            </span>
                            <p className="text-base font-sans opacity-85">
                              {renderTextWithMath(activeTrace?.patternSummary.alwaysStartBy || '')}
                            </p>
                          </div>

                          <div>
                            <span className="text-xs uppercase tracking-wider font-semibold text-neutral-400 block mb-1">
                              The unlocking strategic move...
                            </span>
                            <p className="text-base font-sans font-medium">
                              {renderTextWithMath(activeTrace?.patternSummary.theUnlockingMove || '')}
                            </p>
                          </div>

                          <div>
                            <span className="text-xs uppercase tracking-wider font-semibold text-neutral-400 block mb-1">
                              How you know you are done...
                            </span>
                            <p className="text-base font-sans opacity-85">
                              {renderTextWithMath(activeTrace?.patternSummary.howYouKnowYoureDone || '')}
                            </p>
                          </div>

                          <div>
                            <span className="text-xs uppercase tracking-wider font-semibold text-rose-400 block mb-1">
                              Common student pitfall...
                            </span>
                            <p className="text-base font-sans opacity-85 text-rose-400/90">
                              {renderTextWithMath(activeTrace?.patternSummary.commonMistake || '')}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Bottom action panel */}
                      <div className="pt-12 mt-12 border-t border-neutral-500/10 text-xs font-sans tracking-widest uppercase opacity-40 text-center md:text-left">
                        Swipe/scroll to navigate • New Analysis to go home (mobile friendly)
                      </div>
                    </motion.div>
                  )}

                  {activeSection === 'sequence' && (
                    <motion.div
                      key="stage-sequence"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -12 }}
                      transition={{ duration: 0.25, ease: "easeOut" }}
                      className="space-y-10 focus:outline-none"
                    >
                      <div className="border-b border-neutral-500/10 pb-4">
                        <h2 className="text-[26px] md:text-[34px] font-display font-light tracking-[-0.01em] mb-1 text-white">
                          Sequential Thinking Trace<span className="text-brand-blue font-sans">.</span>
                        </h2>
                        <p className="text-xs uppercase tracking-widest font-bold opacity-30">
                          Stage 3: Step-by-step expert metacognitive breakdown
                        </p>
                      </div>

                      {/* Series of dots showing progress of trace sequence steps */}
                      <div className="flex flex-wrap items-center gap-2 pb-2 justify-start select-none">
                        {activeTrace?.traceNodes.map((node, index) => {
                          let dotColor = 'bg-neutral-700';
                          if (index === activeStepIndex) {
                            if (node.nodeType === 'READ') dotColor = 'bg-cyan-400 scale-125';
                            else if (node.nodeType === 'RECOGNIZE') dotColor = 'bg-pink-400 scale-125';
                            else if (node.nodeType === 'STRATEGY') dotColor = 'bg-amber-400 scale-125';
                            else if (node.nodeType === 'SUBGOAL') dotColor = 'bg-sky-400 scale-125';
                            else if (node.nodeType === 'INSIGHT') dotColor = 'bg-purple-400 scale-125';
                            else if (node.nodeType === 'REMINDER') dotColor = 'bg-teal-400 scale-125';
                            else if (node.nodeType === 'VERIFY') dotColor = 'bg-rose-400 scale-125';
                            else dotColor = 'bg-emerald-400 scale-125';
                          }
                          return (
                            <div 
                              key={index} 
                              className={`w-2.5 h-2.5 sm:w-2 sm:h-2 rounded-full transition-colors duration-300 ${dotColor} cursor-pointer hover:scale-150`}
                              title={`${node.nodeType}: Step ${index + 1} (click to jump)`}
                              onClick={() => { setActiveStepIndex(index); isLockedRef.current = false; }}
                            />
                          );
                        })}
                      </div>

                      {/* Single stage display under animate presence */}
                      <AnimatePresence mode="wait">
                        {activeTrace?.traceNodes[activeStepIndex] && (() => {
                          const node = activeTrace.traceNodes[activeStepIndex];
                          let typeLabel = node.nodeType;
                          let highlightText = 'text-brand-blue';
                          if (node.nodeType === 'READ') highlightText = 'text-cyan-400';
                          if (node.nodeType === 'RECOGNIZE') highlightText = 'text-pink-400';
                          if (node.nodeType === 'STRATEGY') highlightText = 'text-amber-400';
                          if (node.nodeType === 'SUBGOAL') highlightText = 'text-sky-400';
                          if (node.nodeType === 'INSIGHT') highlightText = 'text-purple-400';
                          if (node.nodeType === 'REMINDER') highlightText = 'text-teal-400';
                          if (node.nodeType === 'VERIFY') highlightText = 'text-rose-400';
                          if (node.nodeType === 'COMPOSE') highlightText = 'text-emerald-400';

                          return (
                            <motion.div
                              key={activeStepIndex}
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -8 }}
                              transition={{ duration: 0.25 }}
                              className="space-y-4"
                            >
                              <div className="space-y-2">
                                <span className={`text-[11px] font-sans font-bold tracking-widest uppercase ${highlightText} block`}>
                                  Step {activeStepIndex + 1} of {activeTrace.traceNodes.length} • {typeLabel.toLowerCase()}
                                </span>
                                
                                <h4 className="text-xl md:text-2xl font-sans font-medium leading-snug text-white">
                                  {renderTextWithMath(node.what)}
                                </h4>
                                
                                <p className="text-base md:text-lg font-normal max-w-2xl leading-relaxed text-neutral-400">
                                  <span className="font-semibold block text-[11px] uppercase tracking-wider opacity-40 mb-1">
                                    Cognitive Subtext:
                                  </span>
                                  {renderTextWithMath(node.why)}
                                </p>

                                {(() => {
                                  const trans = node.translation;
                                  const cleaned = (typeof trans === 'string' ? trans.trim() : '');
                                  const hasTrans = !!cleaned && cleaned.toLowerCase() !== 'null';
                                  if (!hasTrans) return null;
                                  const rendered = renderTextWithMath(trans);
                                  // extra guard: if after our thorough render we got nothing useful, don't show the box
                                  if (!rendered) return null;
                                  return (
                                    <div className="mt-4 pl-4 border-l-2 border-[#a8c7fa]/20 font-sans text-base md:text-lg select-all tracking-wide text-[#a8c7fa] py-1">
                                      <span className="block opacity-45 uppercase tracking-wider text-[10px] mb-1 font-semibold">
                                        Symbolic Translation Action:
                                      </span>
                                      {rendered}
                                    </div>
                                  );
                                })()}
                              </div>
                            </motion.div>
                          );
                        })()}
                      </AnimatePresence>

                      {/* Passive layout hint instead of chunky scroll/nav buttons */}
                      <div className="pt-8 border-t border-dashed border-neutral-500/10 text-xs font-sans tracking-widest uppercase opacity-40 text-center md:text-left">
                        Scroll/swipe • Tap dots to jump • New Analysis to go home (arrows on desktop)
                      </div>
                    </motion.div>
                  )}

                  {activeSection === 'exam' && (
                    <motion.div
                      key="stage-exam"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -12 }}
                      transition={{ duration: 0.25, ease: "easeOut" }}
                      className="space-y-10 focus:outline-none"
                    >
                      <div className="border-b border-neutral-500/10 pb-4">
                        <h2 className="text-[26px] md:text-[34px] font-display font-light tracking-[-0.01em] mb-1 text-white">
                          Writing the Final Solution<span className="text-brand-blue font-sans">.</span>
                        </h2>
                        <p className="text-xs uppercase tracking-widest font-bold opacity-30">
                          Stage 4: The solution you would submit in an exam or as your answer
                        </p>
                      </div>

                      <div className="py-2 space-y-8 text-left">
                        <div className="flex items-center justify-between border-b border-dashed border-neutral-500/15 pb-4 mb-2">
                          <span className="text-xs font-sans font-bold tracking-widest uppercase opacity-45">
                            Exam Solution Ledger
                          </span>
                          
                          <button
                            onClick={copyExamWording}
                            className="inline-flex items-center gap-1.5 p-1.5 px-3.5 rounded-full text-xs font-semibold border cursor-pointer select-none border-neutral-800 text-[#a8c7fa] hover:bg-neutral-900"
                          >
                            {copied ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="text-emerald-400">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5 text-neutral-400" />
                                <span>Copy Solution</span>
                              </>
                            )}
                          </button>
                        </div>

                        <div className="space-y-5 pl-4 border-l-2 border-brand-blue/50 py-1">
                          {activeTrace?.finalAnswer.workings.map((line, idx) => (
                            <p key={idx} className="font-sans font-normal text-lg md:text-xl leading-relaxed text-[#e4e4e7]">
                              {renderTextWithMath(line)}
                            </p>
                          ))}
                        </div>

                        <div className="pt-6 border-t border-dashed border-neutral-500/15">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-300 block mb-1">
                            Concluding Corollary:
                          </span>
                          <p className="text-neutral-200 font-sans font-semibold text-lg md:text-xl leading-relaxed">
                            {renderTextWithMath(activeTrace?.finalAnswer.conclusion)}
                          </p>
                        </div>
                      </div>

                      {/* Bottom action panel */}
                      <div className="pt-12 mt-12 border-t border-neutral-500/10 text-xs font-sans tracking-widest uppercase opacity-40 text-center md:text-left">
                        Swipe/scroll up to return • New Analysis to restart (works great on phones/tablets)
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

            </motion.div>
          )}
        </AnimatePresence>
      </main>

    </div>
  );
}

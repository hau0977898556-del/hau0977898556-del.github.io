import React, { useState, useRef, useEffect } from 'react';
import { 
  Copy, Check, Terminal, FileCode, CheckCircle2, Upload, Trash2, 
  Download, Sparkles, Clock, Pause, Play, Plus, X 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface LuaEditorProps {
  value: string;
  onChange?: (val: string) => void;
  readOnly?: boolean;
  placeholder?: string;
  themeColor?: 'indigo' | 'emerald';
  onUploadClick?: () => void;
  onClearClick?: () => void;
  onDownloadClick?: () => void;
  isDragging?: boolean;
  editorMode?: 'le' | 'fast';
  setEditorMode?: (mode: 'le' | 'fast') => void;
  softWrap?: boolean;
}

const formatSize = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export default function LuaEditor({
  value,
  onChange,
  readOnly = false,
  placeholder = '',
  themeColor = 'indigo',
  onUploadClick,
  onClearClick,
  onDownloadClick,
  isDragging = false,
  editorMode: propEditorMode,
  setEditorMode: propSetEditorMode,
  softWrap = false
}: LuaEditorProps) {
  // Local state as fallback if props are not provided
  const [localEditorMode, setLocalEditorMode] = useState<'le' | 'fast'>('le');
  
  const currentMode = propEditorMode || localEditorMode;
  const changeMode = propSetEditorMode || setLocalEditorMode;

  // Local value state to avoid typing lag
  const [localVal, setLocalVal] = useState(value);
  const [copied, setCopied] = useState(false);
  
  // Drag state for "Fast" panel drop zone
  const [fastDragging, setFastDragging] = useState(false);
  
  // Auto-download countdown states for FAST mode (only applicable to readOnly/output pane)
  const [countdown, setCountdown] = useState<number | null>(null);
  const [autoSaveActive, setAutoSaveActive] = useState(false);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const codeRef = useRef<HTMLPreElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const internalFileInputRef = useRef<HTMLInputElement>(null);

  // Sync internal state with prop changes when they happen externally
  useEffect(() => {
    setLocalVal(value);
  }, [value]);

  // Handle countdown triggers in FAST mode on Output editor when new output code gets virtualized
  useEffect(() => {
    if (currentMode === 'fast' && readOnly && localVal) {
      setCountdown(5);
      setAutoSaveActive(true);
    } else {
      setCountdown(null);
      setAutoSaveActive(false);
      if (countdownTimerRef.current) {
        clearTimeout(countdownTimerRef.current);
      }
    }
  }, [localVal, currentMode, readOnly]);

  // Countdown timer clocktick logic
  useEffect(() => {
    if (autoSaveActive && countdown !== null) {
      if (countdown > 0) {
        countdownTimerRef.current = setTimeout(() => {
          setCountdown(prev => (prev !== null ? prev - 1 : null));
        }, 1000);
      } else if (countdown === 0) {
        // Trigger save download automatically
        if (onDownloadClick) {
          onDownloadClick();
        }
        setCountdown(null);
        setAutoSaveActive(false);
      }
    }
    return () => {
      if (countdownTimerRef.current) {
        clearTimeout(countdownTimerRef.current);
      }
    };
  }, [countdown, autoSaveActive, onDownloadClick]);

  // Synchronize scrolling of textarea, code highlighter, and line numbers
  const handleScroll = () => {
    if (textareaRef.current) {
      const { scrollTop, scrollLeft } = textareaRef.current;
      
      if (codeRef.current) {
        codeRef.current.scrollTop = scrollTop;
        codeRef.current.scrollLeft = scrollLeft;
      }
      if (lineNumbersRef.current) {
        lineNumbersRef.current.scrollTop = scrollTop;
      }
    }
  };

  // Debounced parent state update to eliminate typing latency
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setLocalVal(val);
    
    if (onChange) {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        onChange(val);
      }, 60);
    }
  };

  const lineCount = localVal.split('\n').length;
  const isVeryLarge = localVal.length > 25000;

  // Optimized regex-based Lua Tokenizer
  const highlightLua = (code: string) => {
    if (!code) return `<span class="text-zinc-650 opacity-50">${placeholder || 'No code loaded...'}</span>`;
    if (isVeryLarge) return '';
    
    let html = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    const placeholders: string[] = [];
    
    const addPlaceholder = (richText: string) => {
      const idx = placeholders.length;
      placeholders.push(richText);
      let code = '';
      let n = idx;
      do {
        code = String.fromCharCode(97 + (n % 26)) + code;
        n = Math.floor(n / 26) - 1;
      } while (n >= 0);
      return `___PH_${code}___`;
    };

    // 1. Strings
    html = html.replace(/(\[=*\[[\s\S]*?\]=*\])/g, (match) => {
      return addPlaceholder(`<span class="text-amber-400 font-semibold">${match}</span>`);
    });

    html = html.replace(/(\"(\\.|[^\"\\])*\")/g, (match) => {
      return addPlaceholder(`<span class="text-amber-300 font-semibold">${match}</span>`);
    });

    html = html.replace(/(\'(\\.|[^\'\\])*\')/g, (match) => {
      return addPlaceholder(`<span class="text-amber-200 font-semibold">${match}</span>`);
    });

    // 2. Comments
    html = html.replace(/(--\[=*\[[\s\S]*?\]=*\])/g, (match) => {
      return addPlaceholder(`<span class="text-zinc-500 italic font-normal">${match}</span>`);
    });

    html = html.replace(/(--.*)/g, (match) => {
      return addPlaceholder(`<span class="text-zinc-500 italic font-normal">${match}</span>`);
    });

    // 3. Escaped HTML Operators (&lt;, &gt;, &amp;)
    html = html.replace(/(&lt;|&gt;|&amp;)/g, (match) => {
      return addPlaceholder(`<span class="text-zinc-400 opacity-80">${match}</span>`);
    });

    // 4. Regular Operators and brackets
    html = html.replace(/([+\-*\/%^#=~;:,.{}()\[\]])/g, (match) => {
      return addPlaceholder(`<span class="text-zinc-400 opacity-80">${match}</span>`);
    });

    // 5. Constants (true, false, nil)
    const constants = ['true', 'false', 'nil'];
    const constRegex = new RegExp(`\\b(${constants.join('|')})\\b`, 'g');
    html = html.replace(constRegex, (match) => {
      return addPlaceholder(`<span class="text-violet-400 font-bold">${match}</span>`);
    });

    // 6. Keywords
    const keywords = [
      'and', 'break', 'do', 'else', 'elseif', 'end', 'for', 'function',
      'if', 'in', 'local', 'not', 'or', 'repeat', 'return', 'then',
      'until', 'while'
    ];
    const keywordRegex = new RegExp(`\\b(${keywords.join('|')})\\b`, 'g');
    html = html.replace(keywordRegex, (match) => {
      return addPlaceholder(`<span class="${themeColor === 'indigo' ? 'text-indigo-400' : 'text-emerald-400'} font-bold">${match}</span>`);
    });

    // 7. Standard builtins
    const builtins = [
      'game', 'workspace', 'script', 'getfenv', 'setfenv', '_G', '_ENV', 'shared', 
      'pcall', 'xpcall', 'delay', 'spawn', 'wait', 'tick', 'warn', 'print', 'error', 
      'select', 'pairs', 'ipairs', 'next', 'tostring', 'tonumber', 'setmetatable', 
      'getmetatable', 'string', 'table', 'math', 'task', 'buffer', 'Enum', 'require', 'self'
    ];
    const builtinRegex = new RegExp(`\\b(${builtins.join('|')})\\b`, 'g');
    html = html.replace(builtinRegex, (match) => {
      return addPlaceholder(`<span class="text-cyan-400 font-medium">${match}</span>`);
    });

    // 8. Numbers
    html = html.replace(/\b(0x[0-9a-fA-F]+|\d+(\.\d+)?)\b/g, (match) => {
      return addPlaceholder(`<span class="text-rose-400 font-semibold">${match}</span>`);
    });

    // Restore placeholders
    for (let i = placeholders.length - 1; i >= 0; i--) {
      let code = '';
      let n = i;
      do {
        code = String.fromCharCode(97 + (n % 26)) + code;
        n = Math.floor(n / 26) - 1;
      } while (n >= 0);
      
      html = html.replace(`___PH_${code}___`, placeholders[i]);
    }

    return html;
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(localVal);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (_) {}
  };

  // Drag and drop handler specifically for Fast Mode Card
  const handleFastDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setFastDragging(true);
  };

  const handleFastDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setFastDragging(false);
  };

  const handleFastDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setFastDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result;
        if (typeof content === 'string') {
          setLocalVal(content);
          if (onChange) onChange(content);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleFastFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result;
        if (typeof content === 'string') {
          setLocalVal(content);
          if (onChange) onChange(content);
        }
      };
      reader.readAsText(file);
    }
  };

  const activeGlowBorder = themeColor === 'indigo' 
    ? 'focus-within:border-indigo-500/50 border-white/10 hover:border-white/20 focus-within:shadow-[0_0_24px_rgba(99,102,241,0.15)]' 
    : 'focus-within:border-emerald-500/50 border-white/10 hover:border-white/20 focus-within:shadow-[0_0_24px_rgba(16,185,129,0.15)]';

  const bulletColor = themeColor === 'indigo' ? 'bg-indigo-500' : 'bg-emerald-500';

  return (
    <div className={`relative flex flex-col rounded-3xl border bg-zinc-950/60 backdrop-blur-2xl transition duration-300 overflow-hidden select-text ${activeGlowBorder}`}>
      
      {/* Hidden file input for Fast Upload block */}
      <input 
        type="file" 
        ref={internalFileInputRef} 
        onChange={handleFastFileSelect} 
        accept=".lua,.txt,.luau" 
        className="hidden" 
      />

      {/* Top Bar inside Editor */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06] bg-white/[0.01]/40 select-none relative z-20 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            <span className={`w-2 h-2 rounded-full ${bulletColor} animate-pulse`} />
            <span className="text-[11px] font-bold text-zinc-300 font-mono tracking-wider flex items-center gap-1">
              <Terminal className="w-3.5 h-3.5 opacity-60" />
              {readOnly ? 'Output' : 'Input'}
            </span>
          </div>

          {/* Mode selectors */}
          <div className="flex bg-white/[0.03] p-0.5 rounded-xl border border-white/5 gap-0.5 select-none text-[9px] font-bold uppercase font-mono">
            <button
              type="button"
              onClick={() => changeMode('le')}
              className={`px-2 py-1 rounded-lg transition-all duration-200 ${
                currentMode === 'le' 
                  ? `${themeColor === 'indigo' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'}`
                  : 'text-zinc-500 hover:text-zinc-400'
              }`}
            >
              LE Editor
            </button>
            <button
              type="button"
              onClick={() => changeMode('fast')}
              className={`px-2 py-1 rounded-lg transition-all duration-200 ${
                currentMode === 'fast' 
                  ? `${themeColor === 'indigo' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'}`
                  : 'text-zinc-500 hover:text-zinc-400'
              }`}
            >
              Fast
            </button>
          </div>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {currentMode === 'fast' && (
            <span className="text-[9px] px-2.5 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/25 text-indigo-300 font-bold uppercase tracking-wider font-mono flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-indigo-400 animate-pulse" />
              Fast save active
            </span>
          )}

          {currentMode !== 'fast' && onUploadClick && (
            <button
              type="button"
              onClick={onUploadClick}
              className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400 hover:text-white transition duration-200 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/5 hover:bg-white/[0.08]"
              title="Upload script file"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload</span>
            </button>
          )}

          {onDownloadClick && (
            <button
              type="button"
              onClick={onDownloadClick}
              disabled={!localVal}
              className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition duration-200 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/5 hover:bg-white/[0.08]"
              title="Save script to file"
            >
              <Download className="w-3.5 h-3.5" />
              Save File
            </button>
          )}

          {(readOnly || currentMode === 'fast') ? (
            <button
              type="button"
              onClick={handleCopy}
              disabled={!localVal}
              className={`p-1 px-3 rounded-xl border text-[10px] font-bold flex items-center gap-1  transition duration-300 ${
                copied 
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                  : 'bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border-indigo-500/20'
              } disabled:opacity-30 disabled:cursor-not-allowed`}
            >
              {copied ? (
                <>
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy Code</span>
                </>
              )}
            </button>
          ) : null}

          {currentMode !== 'fast' && onClearClick && (
            <button
              type="button"
              onClick={onClearClick}
              disabled={!localVal}
              className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400 hover:text-rose-400 disabled:opacity-30 disabled:cursor-not-allowed transition duration-200 px-3 py-1.5 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-rose-950/10 hover:border-rose-500/20"
              title="Clear current text"
            >
              <Trash2 className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* Editor Body rendering based on currentMode */}
      {currentMode === 'fast' ? (
        <div className="flex flex-col flex-grow relative h-[520px] justify-center overflow-hidden p-4 select-none">
          {readOnly ? (
            /* Output auto countdown saves screen */
            <div className="flex flex-col items-center justify-center text-center h-full max-w-md mx-auto space-y-6">
              {localVal ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-6 w-full"
                >
                  <div className="inline-flex p-4.5 rounded-full bg-emerald-500/10 border border-emerald-505/20 text-emerald-400 relative">
                    <CheckCircle2 className="w-10 h-10 relative z-10" />
                    <span className="absolute inset-0 rounded-full bg-emerald-500/5 animate-ping" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white uppercase tracking-wider font-display">obfuscation completed</h3>
                    <p className="text-xs text-zinc-400 mt-1">Processed successfully in-memory</p>
                  </div>

                  {countdown !== null ? (
                    <div className="bg-white/[0.02] border border-white/5 p-5 rounded-2xl flex flex-col items-center justify-center space-y-3">
                      <div className="flex items-center gap-2 text-indigo-400">
                        <Clock className="w-4 h-4 animate-spin" />
                        <span className="font-mono text-xs font-bold uppercase tracking-wider">
                          Downloading file in {countdown}s
                        </span>
                      </div>
                      <div className="w-full bg-zinc-950/60 rounded-full h-1 relative overflow-hidden">
                        <motion.div 
                          className="absolute left-0 top-0 bottom-0 bg-indigo-505"
                          initial={{ width: '100%' }}
                          animate={{ width: `${(countdown / 5) * 100}%` }}
                          transition={{ duration: 1, ease: 'linear' }}
                          key={countdown}
                        />
                      </div>
                      <div className="flex items-center gap-2 w-full pt-1.5">
                        <button
                          type="button"
                          onClick={() => setAutoSaveActive(!autoSaveActive)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-white/10 text-[10px] uppercase font-bold text-zinc-300 hover:text-white hover:bg-white/[0.04] transition duration-200"
                        >
                          {autoSaveActive ? (
                            <>
                              <Pause className="w-3.5 h-3.5 text-zinc-400" />
                              <span>Pause Auto-Save</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Resume Auto-Save</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-zinc-950/60 border border-white/5 text-zinc-400 text-xs rounded-2xl">
                      Auto-download cycle concluded.
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={onDownloadClick}
                      className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-indigo-505 hover:bg-indigo-600 text-white font-bold text-xs uppercase tracking-wider transition shadow-md shadow-indigo-500/10"
                    >
                      <Download className="w-4 h-4" />
                      Download Final Output
                    </button>
                  </div>
                </motion.div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 inline-block">
                    <Terminal className="w-8 h-8 text-zinc-500 opacity-60 animate-pulse" />
                  </div>
                  <h3 className="text-sm font-semibold text-zinc-300">Awaiting virtualization triggers</h3>
                  <p className="text-xs text-zinc-500 max-w-[280px] leading-relaxed">
                    Virtualize code on the raw source pane to begin streaming files rapidly.
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* Input raw drop / select RAM load screen */
            <div 
              onDragOver={handleFastDragOver}
              onDragLeave={handleFastDragLeave}
              onDrop={handleFastDrop}
              onClick={() => internalFileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center h-full border-2 border-dashed rounded-3xl text-center p-8 transition duration-300 relative overflow-hidden group cursor-pointer ${
                fastDragging 
                  ? 'border-indigo-550 bg-indigo-500/[0.04] scale-[0.99]' 
                  : `${themeColor === 'indigo' ? 'border-indigo-500/20 hover:border-indigo-500/40 hover:bg-indigo-500/[0.01]' : 'border-emerald-500/20 hover:border-emerald-500/40 hover:bg-emerald-500/[0.01]'}`
              }`}
            >
              <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 group-hover:scale-105 transition duration-300 shadow-md">
                <Upload className={`w-8 h-8 ${themeColor === 'indigo' ? 'text-indigo-400' : 'text-emerald-400'} animate-bounce`} />
              </div>
              <h3 className="text-sm font-semibold text-white mt-4">Upload or Drag file here</h3>
              <p className="text-xs text-zinc-400 mt-1.5 max-w-[260px] leading-relaxed">
                Drop any .lua, .luau, or .txt script document to load its content directly into temporary RAM
              </p>
              {localVal && (
                <div className="mt-5 p-2 bg-emerald-500/10 border border-emerald-500/25 rounded-2xl text-[10px] text-emerald-400 font-bold font-mono tracking-wider flex items-center gap-1.5 px-3">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  RAM BUFFER LOADED ({formatSize(new Blob([localVal]).size)})
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Regular LE Editor Code Canvas */
        <div className="flex flex-row flex-grow relative h-[520px] items-stretch overflow-hidden select-text">
          
          {/* LINE NUMBERS PANEL */}
          {!isVeryLarge && !softWrap && (
            <div 
              ref={lineNumbersRef}
              className="flex-shrink-0 w-11 py-5 bg-zinc-950/40 border-r border-white/[0.03] select-none text-right pr-2.5 font-mono text-[10px] leading-relaxed text-zinc-650 overflow-hidden"
              style={{ whiteSpace: 'pre-line', userSelect: 'none' }}
            >
              {Array.from({ length: Math.max(1, lineCount) }).map((_, i) => (
                <div key={i} className="h-[18px] select-none font-mono text-zinc-650 opacity-50">{i + 1}</div>
              ))}
            </div>
          )}

          {/* INTEGRATED TYPING STAGE CONTAINER */}
          <div className="flex-grow relative h-full overflow-hidden select-text">
            {/* Overlay Syntax Highlighting Display */}
            {!isVeryLarge && (
              <pre 
                ref={codeRef}
                className="absolute inset-0 p-5 m-0 font-mono text-xs leading-relaxed text-zinc-300 pointer-events-none overflow-hidden select-none"
                style={{ 
                  whiteSpace: softWrap ? 'pre-wrap' : 'pre',
                  wordBreak: softWrap ? 'break-word' : 'keep-all',
                  lineHeight: '18px'
                }}
              >
                <code 
                  dangerouslySetInnerHTML={{ __html: highlightLua(localVal) }} 
                />
              </pre>
            )}

            {/* Actual Transparent Content-Editable Textarea */}
            <textarea
              ref={textareaRef}
              value={localVal}
              onChange={handleTextareaChange}
              onScroll={handleScroll}
              readOnly={readOnly}
              placeholder={placeholder || 'Enter Lua script code...'}
              spellCheck={false}
              wrap={softWrap ? 'soft' : 'off'}
              className="absolute inset-0 w-full h-full p-5 font-mono text-xs leading-relaxed bg-transparent border-0 outline-none focus:ring-0 resize-none overflow-auto cursor-text"
              style={{
                color: isVeryLarge ? '#d4d4d8' : 'transparent',
                caretColor: themeColor === 'indigo' ? '#818cf8' : '#10b981',
                whiteSpace: softWrap ? 'pre-wrap' : 'pre',
                wordBreak: softWrap ? 'break-word' : 'keep-all',
                WebkitTextFillColor: isVeryLarge ? '#d4d4d8' : 'transparent',
                lineHeight: '18px'
              }}
            />
          </div>

          {/* Drag and Drop Overlay Mask */}
          <AnimatePresence>
            {!readOnly && isDragging && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-zinc-950/95 backdrop-blur-sm z-50 flex flex-col items-center justify-center border-2 border-dashed border-indigo-500/40 m-2 rounded-2xl text-center p-6 pointer-events-none"
              >
                <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 mb-3">
                  <Upload className="w-8 h-8 text-indigo-400 animate-bounce" />
                </div>
                <h3 className="text-sm font-semibold text-white">Drop script file</h3>
                <p className="text-xs text-zinc-400 mt-1 max-w-[200px]">Release document to transfer code automatically</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Footer stats bar */}
      <div className="flex items-center justify-between px-5 py-2.5 bg-white/[0.01]/40 border-t border-white/[0.04] text-[10px] text-zinc-500 font-mono select-none relative z-20">
        <span className="flex items-center gap-1.5 font-medium">
          <FileCode className="w-3.5 h-3.5 text-zinc-500" />
          Lines: <strong className="text-zinc-400">{lineCount}</strong>
        </span>
        <span>
          Chars: <strong className="text-zinc-400">{localVal.length}</strong>
        </span>
      </div>
    </div>
  );
}

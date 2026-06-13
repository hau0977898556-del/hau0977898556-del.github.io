import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Terminal,
  Shield,
  Code2,
  Copy,
  Check,
  Play,
  BookOpen,
  AlertCircle,
  Loader2,
  Upload,
  Download,
  Cpu,
  Layers,
  Sparkles,
  Settings2,
  Trash2,
  ExternalLink,
  Flame,
  Info,
  FileCode,
  CheckSquare,
  Square,
  Zap,
  RefreshCw,
  BarChart2,
  ShieldCheck,
  HelpCircle,
  Key,
  Lock,
  Mail,
  LogIn,
  LogOut,
  User,
  History,
  Home,
  CheckCircle2,
  Sliders,
  ToggleLeft,
  ToggleRight,
  Database,
  Clock,
  Plus,
  X,
  Edit2,
  ArrowLeftRight,
} from "lucide-react";
import LuaEditor from "./components/LuaEditor";
import {
  authService,
  historyService,
  userDataService,
  UserSession,
  ObfuscationRecord,
  ratingService,
  RatingRecord,
} from "./lib/supabase";

const PRESETS = [
  "psu-Strong",
  "psu-Medium",
  "psu-Weak",
  "MinRay V2",
  "MinRay W?",
  "psu-Minify",
];

const PRESETS_OLD = [
  "psuOld-Chaos",
  "psuOld-Weak",
  "psuOld-Medium",
  "psuOld-Strong",
  "psuOld-Minify",
];

const PRESET_DETAILS: Record<
  string,
  {
    title: string;
    badge: string;
    desc: string;
    secureColor: string;
    complexity: "Low" | "Medium" | "High" | "Max" | "None";
    glowColor: string;
  }
> = {
  "MinRay V2": {
    title: "MinRay V2 VM",
    badge: "Flagship VM",
    desc: "Flagship hyper-powered multi-stage nested VM engine with string split encryption, control-flow flattening, anti-tamper, and custom scrambled ASCII wrappers.",
    secureColor:
      "from-yellow-500/20 to-amber-500/5 text-yellow-300 border-yellow-500/30",
    glowColor: "rgba(234, 179, 8, 0.15)",
    complexity: "Max",
  },
  "MinRay W?": {
    title: "MinRay W? (Latin VM)",
    badge: "Latin VM",
    desc: "Flagship nested VM engine utilizing 100% pure Latin character encoding (a-zA-Z) for bytecode instructions. Features outstanding executor bypass and anti-decompilation mechanics.",
    secureColor:
      "from-teal-500/20 to-emerald-500/5 text-teal-300 border-teal-500/30",
    glowColor: "rgba(20, 184, 166, 0.15)",
    complexity: "Max",
  },
  "psu-Weak": {
    title: "Weak Sandboxing",
    badge: "Basic Obfuscation",
    desc: "Light identifier scrambling and variable wrapping for minor production scripts.",
    secureColor: "from-zinc-500/20 to-zinc-400/5 text-zinc-300 border-zinc-700",
    glowColor: "rgba(113, 113, 122, 0.12)",
    complexity: "Low",
  },
  "psu-Medium": {
    title: "Medium VM Core",
    badge: "Balanced Check",
    desc: "Standard virtualization pipeline with randomized instructions. Recommended for general usage.",
    secureColor:
      "from-indigo-500/20 to-blue-500/5 text-indigo-300 border-indigo-500/30",
    glowColor: "rgba(99, 102, 241, 0.15)",
    complexity: "Medium",
  },
  "psu-Strong": {
    title: "Strong VM Core",
    badge: "High Security",
    desc: "Robust multi-pass virtualization utilizing proxy locals, encrypted strings, and standard virtual machines.",
    secureColor:
      "from-purple-500/20 to-violet-500/5 text-purple-300 border-purple-500/30",
    glowColor: "rgba(168, 85, 247, 0.15)",
    complexity: "High",
  },
  "psu-Minify": {
    title: "Structural Minifier",
    badge: "Clean Utility",
    desc: "Strips files of comments, standardizes white spaces, and condenses code size down without modifying execution logic.",
    secureColor:
      "from-slate-500/20 to-slate-400/5 text-slate-300 border-slate-700",
    glowColor: "rgba(100, 116, 139, 0.12)",
    complexity: "None",
  },
  "psuOld-Chaos": {
    title: "Legacy Chaos VM",
    badge: "Legacy Max",
    desc: "Old-generation Prometheus Chaos preset. Virtualizes instructions recursively with random keys.",
    secureColor: "from-rose-500/20 to-red-500/5 text-red-300 border-red-500/30",
    glowColor: "rgba(239, 68, 68, 0.15)",
    complexity: "Max",
  },
  "psuOld-Strong": {
    title: "Legacy Strong Core",
    badge: "Legacy High",
    desc: "Pre-v0.2.9 strong virtualizer. Ideal for testing retro-architectures.",
    secureColor:
      "from-purple-500/20 to-violet-500/5 text-purple-300 border-purple-500/30",
    glowColor: "rgba(168, 85, 247, 0.15)",
    complexity: "High",
  },
  "psuOld-Medium": {
    title: "Legacy Medium Core",
    badge: "Legacy Balanced",
    desc: "Pre-v0.2.9 traditional virtualizer with stable mapping configurations.",
    secureColor:
      "from-indigo-500/20 to-blue-500/5 text-indigo-300 border-indigo-500/30",
    glowColor: "rgba(99, 102, 241, 0.15)",
    complexity: "Medium",
  },
  "psuOld-Weak": {
    title: "Legacy Weak Sandbox",
    badge: "Legacy Low",
    desc: "Old generation basic obfuscation offering variable name mappings and minor wrapping.",
    secureColor: "from-zinc-500/20 to-zinc-400/5 text-zinc-300 border-zinc-700",
    glowColor: "rgba(113, 113, 122, 0.12)",
    complexity: "Low",
  },
  "psuOld-Minify": {
    title: "Legacy Minifier",
    badge: "Legacy Utility",
    desc: "Basic retro whitespace remover and code structure compactor.",
    secureColor:
      "from-slate-500/20 to-slate-400/5 text-slate-300 border-slate-700",
    glowColor: "rgba(100, 116, 139, 0.12)",
    complexity: "None",
  },
};

const SAMPLE_SCRIPTS = [
  {
    name: "Standard Greetings",
    code: `-- Hello Sandbox!\nlocal developer = "Roblox Scripter"\nprint("Welcome to MinRay, secure and robust.")\n\nlocal function greet(user)\n  local message = "Protecting files for " .. tostring(user)\n  return message\nend\n\nprint(greet(developer))`,
  },
  {
    name: "Fibonacci VM Test",
    code: `-- Traditional recursive Fibonacci\n-- Ideal to verify virtual machine mathematical operators\nlocal function fib(n)\n  if n <= 1 then \n    return n \n  end\n  return fib(n - 1) + fib(n - 2)\nend\n\nfor i = 1, 8 do\n  print("Fibonacci value #" .. i .. " resolves to: " .. fib(i))\nend`,
  },
  {
    name: "Metatable Protection",
    code: `-- Proxy metatable design pattern\nlocal registry = {\n  secret_data = "FLAG{MINRAY_EXCLUSIVE_SECURITY}"\n}\n\nlocal secure_proxy = setmetatable({}, {\n  __index = function(self, key)\n    print("[LOGGER] Index request caught for key: " .. tostring(key))\n    return registry[key]\n  end,\n  __newindex = function(self, key, val)\n    error("[SECURITY OVERFLOW] Direct modification restricted!")\n  end\n})\n\nprint("Proxy returned: " .. tostring(secure_proxy.secret_data))\npcall(function()\n  secure_proxy.secret_data = "malicious_overwrite"\nend)`,
  },
];

export const PRESET_RATINGS: Record<
  string,
  { security: number; speed: number; entropy: number }
> = {
  "MinRay V2": { security: 5, speed: 2, entropy: 5 },
  "MinRay W?": { security: 5, speed: 3, entropy: 4 },
  "psu-Weak": { security: 1, speed: 5, entropy: 1 },
  "psu-Medium": { security: 3, speed: 4, entropy: 3 },
  "psu-Strong": { security: 4, speed: 3, entropy: 4 },
  "psu-Minify": { security: 0, speed: 5, entropy: 0 },
  "psuOld-Chaos": { security: 5, speed: 2, entropy: 5 },
  "psuOld-Strong": { security: 4, speed: 3, entropy: 4 },
  "psuOld-Medium": { security: 3, speed: 4, entropy: 3 },
  "psuOld-Weak": { security: 1, speed: 5, entropy: 1 },
  "psuOld-Minify": { security: 0, speed: 5, entropy: 0 },
};

interface TypewriterProps {
  phrases: string[];
  speed?: number;
  delayBetween?: number;
  className?: string;
}

export const TypewriterText: React.FC<TypewriterProps> = ({
  phrases,
  speed = 35,
  delayBetween = 2000,
  className = "",
}) => {
  const [currentPhraseIdx, setCurrentPhraseIdx] = useState(0);
  const [currentText, setCurrentText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    const currentFullPhrase = phrases[currentPhraseIdx];

    if (isDeleting) {
      timer = setTimeout(() => {
        setCurrentText((prev) => prev.slice(0, -1));
      }, speed / 1.7);
    } else {
      timer = setTimeout(() => {
        setCurrentText(currentFullPhrase.slice(0, currentText.length + 1));
      }, speed);
    }

    if (!isDeleting && currentText === currentFullPhrase) {
      timer = setTimeout(() => {
        setIsDeleting(true);
      }, delayBetween);
    } else if (isDeleting && currentText === "") {
      setIsDeleting(false);
      setCurrentPhraseIdx((prev) => (prev + 1) % phrases.length);
    }

    return () => clearTimeout(timer);
  }, [currentText, isDeleting, currentPhraseIdx, phrases, speed, delayBetween]);

  return (
    <span className={className}>
      {currentText}
      <span className="w-1.5 h-4 ml-1.5 bg-indigo-400 inline-block animate-pulse align-middle" style={{ animationDuration: "0.8s" }} />
    </span>
  );
};

export default function App() {
  const [activeTab, setActiveTab] = useState<
    "intro" | "home" | "docs" | "psu_old" | "settings"
  >("intro");
  const [copied, setCopied] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Custom Settings State
  const [softWrap, setSoftWrap] = useState<boolean>(() => {
    return localStorage.getItem("minray_soft_wrap") === "true";
  });
  const [noCFF, setNoCFF] = useState<boolean>(() => {
    return localStorage.getItem("minray_no_cff") === "true";
  });

  // Track expanded cards in history list to inspect codes
  const [expandedRecords, setExpandedRecords] = useState<
    Record<string, boolean>
  >({});

  // Helper to calculate exact human-friendly remaining duration for 30d purging
  const getDeletionStatus = (createdAtStr: string) => {
    const created = new Date(createdAtStr);
    const expires = new Date(created.getTime() + 30 * 24 * 60 * 60 * 1000);
    const now = new Date();
    const diffMs = expires.getTime() - now.getTime();
    if (diffMs <= 0) return "Expired / Purging";

    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(
      (diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
    );

    if (diffDays > 0) {
      return `${diffDays}d ${diffHours}h remaining`;
    }
    return `${diffHours}h remaining`;
  };

  const toggleRecordExpand = (id: string) => {
    setExpandedRecords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // User State
  const [user, setUser] = useState<UserSession | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [authUsername, setAuthUsername] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  // User Obfuscation Archives History State
  const [historyList, setHistoryList] = useState<ObfuscationRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // ID tracking for database initial profiles loading stabilization
  const [profileLoadedId, setProfileLoadedId] = useState<string | null>(null);

  // Credits & Token State
  const [credits, setCredits] = useState<number>(() => {
    const saved = localStorage.getItem("minray_credits");
    return saved ? parseInt(saved, 10) : 10;
  });

  const [recoveryToken, setRecoveryToken] = useState<string>(() => {
    let saved = localStorage.getItem("minray_recovery_token");
    if (!saved || !saved.startsWith("MRAY-")) {
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      let rand = "";
      for (let i = 0; i < 14; i++) {
        rand += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      saved = `MRAY-${rand}`;
      localStorage.setItem("minray_recovery_token", saved);
    }
    return saved;
  });

  const [inputRecoveryToken, setInputRecoveryToken] = useState<string>("");

  const [activeApiKey, setActiveApiKey] = useState<string | null>(() => {
    return localStorage.getItem("minray_api_key");
  });
  const [activePlanType, setActivePlanType] = useState<string | null>(() => {
    return localStorage.getItem("minray_plan_type");
  });
  const [planExpiresAt, setPlanExpiresAt] = useState<string | null>(() => {
    return localStorage.getItem("minray_plan_expires_at");
  });
  const [planDelaySecs, setPlanDelaySecs] = useState<number>(() => {
    const saved = localStorage.getItem("minray_plan_delay_secs");
    return saved ? parseInt(saved, 10) : 0;
  });
  const [lastObfuscatedAt, setLastObfuscatedAt] = useState<number>(0);

  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [typedApiKey, setTypedApiKey] = useState("");
  const [checkingKey, setCheckingKey] = useState(false);
  const [keyErrorMsg, setKeyErrorMsg] = useState("");
  const [keySuccessMsg, setKeySuccessMsg] = useState("");

  // Rating states
  const [fingerprint] = useState<string>(() => {
    let fp = localStorage.getItem("minray_fingerprint_id");
    if (!fp) {
      fp = "MR-DEVICE-" + Math.random().toString(36).substr(2, 9).toUpperCase();
      localStorage.setItem("minray_fingerprint_id", fp);
    }
    return fp;
  });
  const [hasRated, setHasRated] = useState<boolean>(() => {
    return localStorage.getItem("minray_last_rated") === "true";
  });
  const [userRatingScore, setUserRatingScore] = useState<number>(() => {
    const saved = localStorage.getItem("minray_rate_score");
    return saved ? parseInt(saved, 10) : 5;
  });
  const [ratingComment, setRatingComment] = useState<string>(() => {
    return localStorage.getItem("minray_rate_comment") || "";
  });
  const [ratingsList, setRatingsList] = useState<RatingRecord[]>([]);
  const [ratingsLoading, setRatingsLoading] = useState<boolean>(false);
  const [ratingSubmittedSuccess, setRatingSubmittedSuccess] =
    useState<boolean>(false);
  const [showRatingPrompt, setShowRatingPrompt] = useState<boolean>(false);

  // Before/after code comparison slider states
  const [sliderPosition, setSliderPosition] = useState<number>(50);
  const [isDraggingSlider, setIsDraggingSlider] = useState<boolean>(false);
  const [sliderWidth, setSliderWidth] = useState<number>(896);
  const sliderRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!sliderRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setSliderWidth(entry.contentRect.width);
      }
    });
    observer.observe(sliderRef.current);
    return () => observer.disconnect();
  }, [activeTab]);


  const handleSliderMove = (clientX: number) => {
    if (!sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / (rect.width || 1)) * 100));
    setSliderPosition(percentage);
  };


  useEffect(() => {
    const loadRatings = async () => {
      if (user && (user.email.toLowerCase() === "giahuy0977898556@gmail.com" || user.email.toLowerCase() === "giahuy0977898556")) {
        setRatingsLoading(true);
        try {
          const res = await ratingService.getAllRatings();
          setRatingsList(res);
        } catch (e) {
          console.warn("Failed querying ratings:", e);
        } finally {
          setRatingsLoading(false);
        }
      }
    };
    loadRatings();
  }, [user, ratingSubmittedSuccess]);

  const handleRatingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (hasRated) return;
    setRatingsLoading(true);
    try {
      await ratingService.submitRating(
        fingerprint,
        userRatingScore,
        ratingComment,
        user?.email || "Anonymous Guest",
      );
      setHasRated(true);
      setRatingSubmittedSuccess(true);
    } catch (err) {
      console.error(err);
    } finally {
      setRatingsLoading(false);
    }
  };

  const [lastCheckin, setLastCheckin] = useState<string | null>(() => {
    return localStorage.getItem("minray_last_checkin");
  });

  const [waitButtonActive, setWaitButtonActive] = useState<boolean>(false);
  const [waitButtonProgress, setWaitButtonProgress] = useState<number>(0);
  const [waitSecondsLeft, setWaitSecondsLeft] = useState<number>(0);

  const [dailyWaitCount, setDailyWaitCount] = useState<number>(() => {
    const today = new Date().toDateString();
    const savedDate = localStorage.getItem("minray_wait_date");
    if (savedDate === today) {
      const savedCount = localStorage.getItem("minray_wait_count");
      return savedCount ? parseInt(savedCount, 10) : 0;
    }
    return 0;
  });

  const isPremiumUser =
    user?.email?.toLowerCase() === "giahuy0977898556@gmail.com" ||
    user?.email?.toLowerCase() === "giahuy0977898556" ||
    user?.email?.toLowerCase() === "zera" ||
    user?.email?.toLowerCase() === "zeraa" ||
    user?.email?.toLowerCase() === "zera@local.minray.io" ||
    user?.email?.toLowerCase() === "zeraa@local.minray.io" ||
    recoveryToken?.toLowerCase() === "giahuy0977898556@gmail.com" ||
    recoveryToken?.toLowerCase() === "giahuy0977898556" ||
    recoveryToken?.toLowerCase() === "zera" ||
    recoveryToken?.toLowerCase() === "zeraa";

  const handleCheckin = () => {
    const today = new Date().toDateString();
    if (lastCheckin === today) return;

    setCredits((prev) => {
      const newVal = prev + 2;
      localStorage.setItem("minray_credits", newVal.toString());
      return newVal;
    });
    localStorage.setItem("minray_last_checkin", today);
    setLastCheckin(today);
  };

  const handleStartWait = () => {
    const today = new Date().toDateString();
    if (dailyWaitCount >= 5) {
      alert("You have reached your daily limit of 5 credit claims.");
      return;
    }
    if (waitButtonActive) return;

    setWaitButtonActive(true);
    setWaitSecondsLeft(10);
    setWaitButtonProgress(0);

    const startTime = Date.now();
    const duration = 10000;

    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(100, (elapsed / duration) * 100);
      const secondsLeft = Math.max(0, Math.ceil((duration - elapsed) / 1000));

      setWaitButtonProgress(progress);
      setWaitSecondsLeft(secondsLeft);

      if (elapsed >= duration) {
        clearInterval(timer);
        setWaitButtonActive(false);
        setWaitButtonProgress(0);
        setWaitSecondsLeft(0);

        setCredits((prev) => {
          const newVal = prev + 1;
          localStorage.setItem("minray_credits", newVal.toString());
          return newVal;
        });

        setDailyWaitCount((prev) => {
          const nextCount = prev + 1;
          localStorage.setItem("minray_wait_date", today);
          localStorage.setItem("minray_wait_count", nextCount.toString());
          return nextCount;
        });
      }
    }, 100);
  };

  // Playground state
  const [editorMode, setEditorMode] = useState<"le" | "fast">("le");

  // Multi-tab Configuration
  const [tabs, setTabs] = useState<
    Array<{ id: string; name: string; inputCode: string; outputCode: string }>
  >(() => {
    const saved = localStorage.getItem("minray_tabs_v2");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {
        console.warn("Failed to parse saved tabs:", e);
      }
    }
    return [
      {
        id: "default-tab",
        name: "Script 1.lua",
        inputCode: SAMPLE_SCRIPTS[0].code,
        outputCode: "",
      },
    ];
  });

  const [activeTabId, setActiveTabId] = useState<string>(() => {
    const savedActive = localStorage.getItem("minray_active_tab_id_v2");
    return savedActive || "default-tab";
  });

  const activeTabObj = tabs.find((t) => t.id === activeTabId) ||
    tabs[0] || {
      id: "default-tab",
      name: "Script 1.lua",
      inputCode: "",
      outputCode: "",
    };

  const inputCode = activeTabObj.inputCode;
  const outputCode = activeTabObj.outputCode;

  const setInputCode = (val: string) => {
    setTabs((prev) =>
      prev.map((t) =>
        t.id === activeTabObj.id ? { ...t, inputCode: val } : t,
      ),
    );
  };

  const setOutputCode = (val: string) => {
    setTabs((prev) =>
      prev.map((t) =>
        t.id === activeTabObj.id ? { ...t, outputCode: val } : t,
      ),
    );
  };

  // State to manage inline editing/renaming of tab names
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>("");

  const startEditingTab = (
    tabId: string,
    currentName: string,
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();
    setEditingTabId(tabId);
    setEditingName(currentName);
  };

  const saveEditingTab = (tabId: string) => {
    const trimmed = editingName.trim();
    if (trimmed) {
      setTabs((prev) =>
        prev.map((t) => (t.id === tabId ? { ...t, name: trimmed } : t)),
      );
    }
    setEditingTabId(null);
  };

  const handleAddTab = () => {
    const newId = "tab_" + Date.now();
    let maxIndex = 0;
    tabs.forEach((t) => {
      const match = t.name.match(/Script (\d+)\.lua/);
      if (match) {
        const idx = parseInt(match[1]);
        if (idx > maxIndex) maxIndex = idx;
      }
    });
    const newName = `Script ${maxIndex + 1}.lua`;
    const newTab = {
      id: newId,
      name: newName,
      inputCode: `-- New Tab: ${newName}\n-- Type or upload your Luau code here...\n`,
      outputCode: "",
    };
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newId);
  };

  const handleDeleteTab = (tabIdToDelete: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    if (tabs.length === 1) {
      // If deleting last tab, just reset it
      setTabs([
        {
          id: "default-tab",
          name: "Script 1.lua",
          inputCode: "",
          outputCode: "",
        },
      ]);
      setActiveTabId("default-tab");
      return;
    }

    const tabIndex = tabs.findIndex((t) => t.id === tabIdToDelete);
    const newTabs = tabs.filter((t) => t.id !== tabIdToDelete);
    setTabs(newTabs);

    if (activeTabId === tabIdToDelete) {
      const nextActiveIndex = Math.max(0, tabIndex - 1);
      setActiveTabId(newTabs[nextActiveIndex].id);
    }
  };

  useEffect(() => {
    try {
      localStorage.setItem("minray_tabs_v2", JSON.stringify(tabs));
    } catch (e) {
      console.warn("localStorage quota exceeded on saving tabs, evicting inactive output bodies to fit", e);
      try {
        // Safe reduction: Map other inactive tabs to clear their large output codes
        const prunedTabs = tabs.map((t) => {
          if (t.id !== activeTabId && t.outputCode.length > 1000) {
            return {
              ...t,
              outputCode: `-- [Purged output locally to prevent browser storage quota crash. Re-obfuscate to re-generate, or load from history copy if logged] --`
            };
          }
          return t;
        });
        localStorage.setItem("minray_tabs_v2", JSON.stringify(prunedTabs));
      } catch (innerErr) {
        // If still failing, store only minimal tab structure with empty outputs
        try {
          const minimalTabs = tabs.map((t) => ({ ...t, outputCode: "" }));
          localStorage.setItem("minray_tabs_v2", JSON.stringify(minimalTabs));
        } catch (fatalErr) {
          console.error("Critical: local storage totally saturated.", fatalErr);
        }
      }
    }
  }, [tabs, activeTabId]);

  useEffect(() => {
    try {
      localStorage.setItem("minray_active_tab_id_v2", activeTabId);
    } catch (e) {
      console.warn("Skipping saving active tab ID due to full storage:", e);
    }
  }, [activeTabId]);

  useEffect(() => {
    try {
      // Optimize tabs structure in session snapshots to avoid duplicating code blocks (>30KB)
      const optimizedTabs = tabs.map((t) => {
        const hasHugeInput = t.inputCode.length > 30000;
        const hasHugeOutput = t.outputCode.length > 30000;
        if (hasHugeInput || hasHugeOutput) {
          return {
            ...t,
            inputCode: hasHugeInput ? `-- [Input code omitted from recovery snapshot, size: ${(t.inputCode.length / 1024).toFixed(1)} KB]` : t.inputCode,
            outputCode: hasHugeOutput ? `-- [Output code omitted from recovery snapshot, size: ${(t.outputCode.length / 1024).toFixed(1)} KB]` : t.outputCode,
          };
        }
        return t;
      });
      const snapshot = {
        credits,
        tabs: optimizedTabs,
      };
      localStorage.setItem(
        `minray_token_snapshot_${recoveryToken}`,
        JSON.stringify(snapshot),
      );
      localStorage.setItem("minray_credits", credits.toString());
    } catch (e) {
      console.warn("Skipping saving session state snapshots due to full storage structures:", e);
    }
  }, [credits, tabs, recoveryToken]);

  // Load user profile & credits from database when user session or recovery token stabilizes
  useEffect(() => {
    const activeId = user ? user.id : recoveryToken;
    if (!activeId) return;

    // Avoid redundant loads if we have already loaded the profile for this user/token id
    if (activeId === profileLoadedId) return;

    const loadProfile = async () => {
      try {
        const dbData = await userDataService.loadUserData(activeId);
        if (dbData) {
          if (typeof dbData.credits === "number") {
            setCredits(dbData.credits);
          }
          if (Array.isArray(dbData.tabs) && dbData.tabs.length > 0) {
            setTabs(dbData.tabs);
          }
          if (dbData.recoveryToken) {
            setRecoveryToken(dbData.recoveryToken);
          }
          if (dbData.activeApiKey) {
            setActiveApiKey(dbData.activeApiKey);
            localStorage.setItem("minray_api_key", dbData.activeApiKey);
          }
          if (dbData.activePlanType) {
            setActivePlanType(dbData.activePlanType);
            localStorage.setItem("minray_plan_type", dbData.activePlanType);
          }
          if (dbData.planExpiresAt) {
            setPlanExpiresAt(dbData.planExpiresAt);
            localStorage.setItem(
              "minray_plan_expires_at",
              dbData.planExpiresAt,
            );
          }
          if (typeof dbData.planDelaySecs === "number") {
            setPlanDelaySecs(dbData.planDelaySecs);
            localStorage.setItem(
              "minray_plan_delay_secs",
              dbData.planDelaySecs.toString(),
            );
          }
        }
      } catch (err) {
        console.warn("Could not read user profile from database:", err);
      } finally {
        setProfileLoadedId(activeId);
      }
    };

    loadProfile();
  }, [user, recoveryToken, profileLoadedId]);

  // Debounced database sync for config and credits when changed
  useEffect(() => {
    const activeId = user ? user.id : recoveryToken;
    if (!activeId) return;

    // Only skip syncing if it hasn't initially loaded yet to avoid overwriting database with initial local states
    if (activeId !== profileLoadedId) return;

    const timer = setTimeout(async () => {
      try {
        await userDataService.saveUserData(activeId, {
          credits,
          tabs,
          recoveryToken,
          activeApiKey,
          activePlanType,
          planExpiresAt,
          planDelaySecs,
        });
      } catch (err) {
        console.warn("DB state sync issue:", err);
      }
    }, 2500); // 2.5 seconds debounce

    return () => clearTimeout(timer);
  }, [
    credits,
    tabs,
    recoveryToken,
    user,
    profileLoadedId,
    activeApiKey,
    activePlanType,
    planExpiresAt,
    planDelaySecs,
  ]);

  const [preset, setPreset] = useState(PRESETS[0]);
  const [presetOld, setPresetOld] = useState(PRESETS_OLD[1]);
  const [isObfuscating, setIsObfuscating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load User auth session on mount & fetch history records
  useEffect(() => {
    const checkSession = async () => {
      const activeUser = await authService.getSessionUser();
      setUser(activeUser);
    };
    checkSession();
  }, []);

  // Fetch updated records when active account state changes
  useEffect(() => {
    const fetchHistory = async () => {
      const activeId = user ? user.id : recoveryToken;
      if (activeId) {
        setHistoryLoading(true);
        try {
          const records = await historyService.getRecords(activeId);
          setHistoryList(records);
        } catch (e) {
          console.warn(e);
        } finally {
          setHistoryLoading(false);
        }
      } else {
        setHistoryList([]);
      }
    };
    fetchHistory();
  }, [user, recoveryToken]);

  // Persist Soft Wrap in local storage when changed
  useEffect(() => {
    localStorage.setItem("minray_soft_wrap", softWrap ? "true" : "false");
  }, [softWrap]);

  useEffect(() => {
    localStorage.setItem("minray_no_cff", noCFF ? "true" : "false");
  }, [noCFF]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      container.style.setProperty("--mouse-x", `${x}px`);
      container.style.setProperty("--mouse-y", `${y}px`);
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const currentPreset = activeTab === "psu_old" ? presetOld : preset;
  const currentDetail = PRESET_DETAILS[currentPreset] || {
    title: "Obfuscation Preset",
    badge: "Standard",
    desc: "Secures script targets using configured AST mutation passes.",
    secureColor: "from-zinc-500/20 to-zinc-400/5 text-zinc-300 border-zinc-700",
    glowColor: "rgba(255, 255, 255, 0.05)",
    complexity: "Medium",
  };

  const glowBorderClass =
    activeTab === "psu_old"
      ? "shadow-[0_0_50px_rgba(168,85,247,0.03)] border-purple-500/15 hover:border-purple-500/25"
      : currentPreset === "MinRay V2"
        ? "shadow-[0_0_50px_rgba(234,179,8,0.04)] border-yellow-500/15 hover:border-yellow-500/25"
        : currentPreset === "psu-Weak"
          ? "shadow-[0_0_50px_rgba(16,185,129,0.03)] border-emerald-500/15 hover:border-emerald-500/25"
          : "shadow-[0_0_50px_rgba(99,102,241,0.04)] border-indigo-500/15 hover:border-indigo-500/25";

  const getByteCount = (str: string) => {
    try {
      return new Blob([str]).size;
    } catch {
      return str.length;
    }
  };
  const inputBytes = getByteCount(inputCode);
  const outputBytes = getByteCount(outputCode);

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const appUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://minray.io";

  const codeExample = `/**
 * MinRay V2 Obfuscator API - Javascript ES2022 Implementation
 * Fully asynchronous HTTP query flow with structured authentication headers & client diagnostics.
 */
async function obfuscateLuaScript(sourceCode, activePreset = '${currentPreset}') {
  const endpoint = '${appUrl}/api/obfuscate';
  const apiKey = '${activeApiKey || "MinRayAPI-XXXX-XXXX"}'; // Your Premium API Key

  try {
    console.log('[MinRay] Initializing secure compilation via preset: ' + activePreset);
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,                         // Custom header authentication
        'Authorization': \`Bearer \${apiKey}\`           // Standardized bearer token fallback
      },
      body: JSON.stringify({
        code: sourceCode,
        preset: activePreset
      })
    });

    if (!response.ok) {
      const errorPayload = await response.json().catch(() => ({}));
      throw new Error(\`HTTP \${response.status}: \${errorPayload.error || response.statusText}\`);
    }

    const { code, securityCheck, engine } = await response.json();
    console.log('[MinRay] Security protocol verified: ' + securityCheck);
    console.log('[MinRay] Successfully virtualized via ' + engine);
    
    return code;
  } catch (error) {
    console.error('[MinRay ERROR] Live compilation pipeline crashed:', error.message);
    throw error;
  }
}

// Example usage inside an ES module container:
// const obfuscatedResult = await obfuscateLuaScript("print('Secure local matrix script')");`;

  const curlExample = `# Compile, protect, and virtualize remote Lua streams using Shell terminal:
curl -s -X POST "${appUrl}/api/obfuscate" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: ${activeApiKey || "MinRayAPI-XXXX-XXXX"}" \\
  -d '{
    "code": "print(\\"MinRay Secure Shell Execution\\")",
    "preset": "${currentPreset}"
  }' \\
  | grep -o '"code":"[^"]*"' \\
  | cut -d'"' -f4 \\
  | sed 's/\\\\n/\\
/g' \\
  | sed 's/\\\\t/\\t/g' > minray_secured.lua

echo "Compilation successful! Written protected code to minray_secured.lua"`;

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error("Failed to copy: ", err);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1.2 * 1024 * 1024) {
      alert("File size limit exceeded! The absolute maximum file size is 1.2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === "string") {
        setInputCode(content);
        setError(null);
      }
    };
    reader.readAsText(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (file.size > 1.2 * 1024 * 1024) {
        alert("File size limit exceeded! The absolute maximum file size is 1.2MB.");
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result;
        if (typeof content === "string") {
          setInputCode(content);
          setError(null);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleDownload = () => {
    if (!outputCode) return;
    const blob = new Blob([outputCode], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `minray_${currentPreset.replace("-", "_")}.lua`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadInput = () => {
    if (!inputCode) return;
    const blob = new Blob([inputCode], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "minray_input.lua";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const isPlanActive = () => {
    if (isPremiumUser) return true;
    if (!activePlanType) return false;
    if (activePlanType === "lifetime") return true;
    if (!planExpiresAt) return false;
    return new Date(planExpiresAt).getTime() > Date.now();
  };

  const getRemainingDays = (expiry: string | null) => {
    if (!expiry) return null;
    if (expiry === "lifetime") return "lifetime / permanent";
    const expDate = new Date(expiry);
    const diffTime = expDate.getTime() - Date.now();
    if (diffTime <= 0) return "Expired";
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));
    if (diffDays > 1) {
      return `${diffDays} days remaining`;
    } else {
      return `${diffHours} hours remaining`;
    }
  };

  const handleValidateApiKey = async () => {
    if (!typedApiKey.trim()) {
      setKeyErrorMsg("Please enter an API Key.");
      setKeySuccessMsg("");
      return;
    }

    setCheckingKey(true);
    setKeyErrorMsg("");
    setKeySuccessMsg("");

    try {
      const dbData = await userDataService.checkApiKey(typedApiKey.trim());
      if (dbData && dbData.activeApiKey) {
        setActiveApiKey(dbData.activeApiKey);
        setActivePlanType(dbData.activePlanType || "1d");
        setPlanExpiresAt(dbData.planExpiresAt || "lifetime");
        setPlanDelaySecs(dbData.planDelaySecs ?? 0);
        setCredits(dbData.credits);

        localStorage.setItem("minray_api_key", dbData.activeApiKey);
        if (dbData.activePlanType) {
          localStorage.setItem("minray_plan_type", dbData.activePlanType);
        }
        if (dbData.planExpiresAt) {
          localStorage.setItem("minray_plan_expires_at", dbData.planExpiresAt);
        }
        localStorage.setItem("minray_plan_delay_secs", (dbData.planDelaySecs ?? 0).toString());
        localStorage.setItem("minray_credits", dbData.credits.toString());

        const remainingStr = dbData.planExpiresAt === "lifetime" 
          ? "Lifetime (Unlimited)" 
          : dbData.planExpiresAt 
            ? getRemainingDays(dbData.planExpiresAt) 
            : "Active Plan";

        setKeySuccessMsg(`Valid API Key found!\nPlan: ${dbData.activePlanType} plan (${remainingStr}).\nBalance of ${dbData.credits} credits synchronized.`);
        
        if (dbData.recoveryToken) {
          localStorage.setItem("minray_recovery_token", dbData.recoveryToken);
        }
      } else {
        setKeyErrorMsg("This API key does not exist or has expired.");
      }
    } catch (err: any) {
      setKeyErrorMsg(`Failed to validate key: ${err?.message || err}`);
    } finally {
      setCheckingKey(false);
    }
  };

  const getLastObfuscatedLabel = () => {
    if (lastObfuscatedAt > 0) {
      return new Date(lastObfuscatedAt).toLocaleTimeString();
    }
    if (historyList && historyList[0]) {
      return new Date(historyList[0].created_at).toLocaleTimeString();
    }
    return "Never";
  };

  const handleRedeemPlan = (planType: "1d" | "5d" | "1m" | "lifetime") => {
    const costMap = {
      "1d": 20,
      "5d": 75,
      "1m": 200,
      lifetime: 550,
    };
    // The details: "500 creds for using api key lifetime" - let's set cost of lifetime to 500
    costMap["lifetime"] = 500;

    const delayMap = {
      "1d": 30,
      "5d": 10,
      "1m": 3,
      lifetime: 3,
    };
    const durationMap = {
      "1d": 1 * 24 * 60 * 60 * 1000,
      "5d": 5 * 24 * 60 * 60 * 1000,
      "1m": 30 * 24 * 60 * 60 * 1000,
      lifetime: -1,
    };

    const cost = costMap[planType];
    if (credits < cost && !isPremiumUser) {
      alert(
        `Insufficient credits! Redeeming the ${planType} plan requires ${cost} credits, but you currently have ${credits} credits.`,
      );
      return;
    }

    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const genSeq = () => {
      let r = "";
      for (let i = 0; i < 4; i++) {
        r += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return r;
    };
    
    const suffixMap = {
      "1d": "1D",
      "5d": "5D",
      "1m": "1M",
      lifetime: "LT",
    };
    const suffix = suffixMap[planType];
    const newApiKey = `MinRayAPI-${genSeq()}-${genSeq()}-${suffix}`;
    const expires =
      durationMap[planType] === -1
        ? "lifetime"
        : new Date(Date.now() + durationMap[planType]).toISOString();

    if (!isPremiumUser) {
      setCredits((prev) => {
        const nextCreds = Math.max(0, prev - cost);
        localStorage.setItem("minray_credits", nextCreds.toString());
        return nextCreds;
      });
    }

    setActiveApiKey(newApiKey);
    setActivePlanType(planType);
    setPlanExpiresAt(expires);
    setPlanDelaySecs(delayMap[planType]);

    localStorage.setItem("minray_api_key", newApiKey);
    localStorage.setItem("minray_plan_type", planType);
    localStorage.setItem("minray_plan_expires_at", expires);
    localStorage.setItem(
      "minray_plan_delay_secs",
      delayMap[planType].toString(),
    );

    alert(
      `Successfully bought Premium Plan!\n\nYour API Key: ${newApiKey}\nType: ${planType} plan\nUnlimited Web Obfuscator Delays: ${delayMap[planType]} seconds.\nEnjoy unlimited compilation!`,
    );
  };

  const handleObfuscate = async () => {
    if (!inputCode.trim()) return;

    const activePreset = activeTab === "psu_old" ? presetOld : preset;
    const requiredCost = activePreset === "MinRay V2" ? 5 : 2;

    const hasPlan = isPlanActive();

    // Determine current limits based on plan/premium status
    let currentDelay = 30; // 30s as requested
    let currentLimit = 400 * 1024; // 400kb as requested
    let currentLimitLabel = "400KB";

    if (isPremiumUser) {
      currentDelay = 3;
      currentLimit = 1.2 * 1024 * 1024;
      currentLimitLabel = "1.2MB";
    } else if (hasPlan) {
      if (activePlanType === "1m" || activePlanType === "lifetime") {
        currentDelay = 3;
        currentLimit = 1.2 * 1024 * 1024;
        currentLimitLabel = "1.2MB";
      } else if (activePlanType === "5d") {
        currentDelay = 10;
        currentLimit = 800 * 1024;
        currentLimitLabel = "800KB";
      } else if (activePlanType === "1d") {
        currentDelay = 30;
        currentLimit = 400 * 1024;
        currentLimitLabel = "400KB";
      }
    }

    // A: Enforce credit limits if not premium and doesn't have plan
    if (!hasPlan && credits < requiredCost && !isPremiumUser) {
      setError(
        `Insufficient credits! Obfuscating via ${activePreset} requires ${requiredCost} credits, but you only have ${credits} remaining. Recover or claim more credits below.`,
      );
      return;
    }

    // B: Enforce customized upload file size limits
    const codeSize = new Blob([inputCode]).size;
    if (codeSize > currentLimit) {
      setError(
        `File too large! Your current tier/plan supports scripts up to ${currentLimitLabel}, but this script is ${(codeSize / 1024).toFixed(1)}KB. Please upgrade your plan in settings to increase limits.`,
      );
      return;
    }

    // C: Enforce customized rate limit delays
    const elapsed = Math.floor((Date.now() - lastObfuscatedAt) / 1000);
    if (elapsed < currentDelay) {
      const remaining = currentDelay - elapsed;
      setError(
        `Unlimited Plan Cooldown! Please wait ${remaining} more seconds before your next obfuscation. (Your plan enforces a ${currentDelay}s delay per obfuscation)`,
      );
      return;
    }

    setIsObfuscating(true);
    setError(null);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (activeApiKey) {
        headers["x-api-key"] = activeApiKey;
      }

      const response = await fetch("/api/obfuscate", {
        method: "POST",
        headers,
        body: JSON.stringify({ 
          code: inputCode, 
          preset: activePreset,
          userEmail: user?.email || "",
          recoveryToken: recoveryToken || "",
          noCFF: noCFF
        }),
      });

      let data;
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        data = await response.json();
      } else {
        const text = await response.text();
        throw new Error(
          `Server error (${response.status}): ${text.substring(0, 100)}...`,
        );
      }

      if (!response.ok) {
        throw new Error(data.error || "Failed to obfuscate code");
      }

      setOutputCode(data.code);

      // Deduct credits if not premium and doesn't have active plan
      if (!isPremiumUser && !hasPlan) {
        setCredits((prev) => {
          const nextCreds = Math.max(0, prev - requiredCost);
          localStorage.setItem("minray_credits", nextCreds.toString());
          return nextCreds;
        });
      }

      setLastObfuscatedAt(Date.now());

      // Launch rating prompt after 5 seconds of delay if user hasn't rated yet
      setTimeout(() => {
        const alreadyRated =
          localStorage.getItem("minray_last_rated") === "true";
        if (!alreadyRated) {
          setShowRatingPrompt(true);
        }
      }, 5000);

      // Save obfuscation result in local or cloud DB
      const activeId = user ? user.id : recoveryToken;
      if (activeId) {
        try {
          await historyService.saveRecord(
            activeId,
            inputCode,
            data.code,
            activePreset,
          );
          // Refetch fresh archives
          const updated = await historyService.getRecords(activeId);
          setHistoryList(updated);
        } catch (dbErr) {
          console.warn("Failed to append to log history:", dbErr);
        }
      }
    } catch (err: any) {
      setError(err.message || "An unknown compilation error surfaced.");
    } finally {
      setIsObfuscating(false);
    }
  };

  const loadSample = (code: string) => {
    setInputCode(code);
    setError(null);
  };

  // Auth Submit Handlers
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);
    setAuthLoading(true);

    if (!authUsername || !authPassword) {
      setAuthError("All input criteria must be specified.");
      setAuthLoading(false);
      return;
    }

    // Front-end level regex check for Username to match the rules
    const cleanUsername = authUsername.trim();
    if (!/^[a-zA-Z0-9_\-\.]{3,}$/.test(cleanUsername)) {
      setAuthError("Username must be at least 3 characters and contain only letters, numbers, underscores, hyphens, and periods.");
      setAuthLoading(false);
      return;
    }

    try {
      let res;
      if (authMode === "login") {
        res = await authService.signIn(cleanUsername, authPassword);
      } else {
        res = await authService.signUp(cleanUsername, authPassword);
      }

      if (res.error) {
        setAuthError(res.error.message || "Authentication error.");
      } else {
        setUser(res.user);
        setAuthSuccess(
          authMode === "login"
            ? "Successfully authenticated!"
            : "User created successfully!",
        );
        setTimeout(() => {
          setAuthModalOpen(false);
          setAuthSuccess(null);
          setAuthUsername("");
          setAuthPassword("");
        }, 1200);
      }
    } catch (err: any) {
      setAuthError(err.message || "Authentication pipeline failed.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    await authService.signOut();
    setUser(null);
  };

  const handleRestoreRecord = (rec: ObfuscationRecord) => {
    setInputCode(rec.original_code);
    setOutputCode(rec.obfuscated_code);
    setPreset(rec.preset);
    setActiveTab("home");
    window.scrollTo({ top: 300, behavior: "smooth" });
  };

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-indigo-500/30 flex flex-col antialiased relative overflow-hidden"
    >
      {/* BACKGROUND FLOATING LIQUID GLASS ORBS */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Glowing Orb 1 */}
        <div
          className="absolute -top-[10%] -left-[5%] w-[50vw] h-[50vw] rounded-full blur-[130px] opacity-25"
          style={{
            background:
              "radial-gradient(circle, rgba(99,102,241,0.4) 0%, rgba(168,85,247,0.1) 60%, rgba(0,0,0,0) 100%)",
          }}
        />
        {/* Glowing Orb 2 */}
        <div
          className="absolute top-[40%] right-[-10%] w-[45vw] h-[45vw] rounded-full blur-[140px] opacity-[0.2]"
          style={{
            background:
              "radial-gradient(circle, rgba(6,182,212,0.4) 0%, rgba(99,102,241,0.15) 75%, rgba(0,0,0,0) 100%)",
          }}
        />
        {/* Glowing Orb 3 */}
        <div
          className="absolute -bottom-[15%] left-[20%] w-[40vw] h-[40vw] rounded-full blur-[110px] opacity-[0.15]"
          style={{
            background:
              "radial-gradient(circle, rgba(236,72,153,0.3) 0%, rgba(168,85,247,0.05) 70%, rgba(0,0,0,0) 100%)",
          }}
        />

        {/* Dynamic mouse-glowing liquid light spot */}
        <div
          className="absolute w-[350px] h-[350px] rounded-full blur-[100px] opacity-15 mix-blend-screen pointer-events-none"
          style={{
            left: "calc(var(--mouse-x, -999px) - 175px)",
            top: "calc(var(--mouse-y, -999px) - 175px)",
            background: `radial-gradient(circle, ${currentDetail.glowColor || "rgba(99,102,241,0.15)"} 0%, rgba(0,0,0,0) 100%)`,
          }}
        />
      </div>

      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow flex flex-col gap-6 relative z-10">
        {/* HEADER BAR */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-5 pb-6 border-b border-white/[0.06] backdrop-blur-sm"
        >
          <div className="flex items-center justify-between w-full md:w-auto">
            <div className="flex items-center gap-3.5">
              <div className="p-3 bg-white/[0.03] border border-white/10 rounded-2xl shadow-xl relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/20 to-cyan-500/20 opacity-40 group-hover:opacity-100 transition duration-300" />
                <Shield className="w-7 h-7 text-indigo-400 stroke-[1.5] relative z-10 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-2xl font-bold tracking-tight text-white">
                    <span className="bg-gradient-to-r from-white via-zinc-200 to-indigo-300 bg-clip-text text-transparent">
                      MinRay
                    </span>
                  </h1>
                  <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-white/[0.04] text-zinc-350 border border-white/10">
                    v1.2
                  </span>
                </div>
                <p className="text-zinc-400 text-xs mt-1">
                  High-performance Lua 5.1 & Luau Virtualization Compiler
                </p>
              </div>
            </div>

            {/* User status for Mobile layout */}
            <div className="block md:hidden">
              {user ? (
                <button
                  type="button"
                  onClick={() => setActiveTab("settings")}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20"
                >
                  <User className="w-3.5 h-3.5" />
                  Profile
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode("login");
                      setAuthModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white/[0.03] text-zinc-350 border border-white/10"
                  >
                    Login
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode("signup");
                      setAuthModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white"
                  >
                    Sign Up
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* LIQUID GLASS NAV TAB SELECTOR */}
          {activeTab !== "intro" && (
            <div className="flex items-center gap-4 w-full md:w-auto animate-fadeIn overflow-hidden">
              <div className="flex p-1 bg-white/[0.02]/40 border border-white/10 rounded-2xl backdrop-blur-xl shadow-lg relative max-w-full overflow-x-auto no-scrollbar flex-nowrap shrink-0 pr-3 scroll-smooth">
                <button
                  onClick={() => setActiveTab("intro")}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold relative transition-all duration-300 whitespace-nowrap flex-shrink-0 ${
                    activeTab === "intro"
                      ? "bg-gradient-to-r from-indigo-500/25 to-indigo-600/35 border-t border-indigo-400/20 text-white shadow-md"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.02]"
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                  Overview
                </button>
                <button
                  onClick={() => setActiveTab("home")}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold relative transition-all duration-300 whitespace-nowrap flex-shrink-0 relative z-10 ${
                    activeTab === "home"
                      ? "bg-white/[0.08] text-white shadow-md border-t border-white/5"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.02]"
                  }`}
                >
                  <Home className="w-3.5 h-3.5" />
                  Dashboard
                </button>
                <button
                  onClick={() => setActiveTab("psu_old")}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold relative transition-all duration-300 whitespace-nowrap flex-shrink-0 relative z-10 ${
                    activeTab === "psu_old"
                      ? "bg-white/[0.08] text-white shadow-md border-t border-white/5"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.02]"
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  Legacy
                </button>
                <button
                  onClick={() => setActiveTab("docs")}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold relative transition-all duration-300 whitespace-nowrap flex-shrink-0 relative z-10 ${
                    activeTab === "docs"
                      ? "bg-white/[0.08] text-white shadow-md border-t border-white/5"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.02]"
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  Developer API
                </button>
                <button
                  onClick={() => setActiveTab("settings")}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold relative transition-all duration-300 whitespace-nowrap flex-shrink-0 relative z-10 ${
                    activeTab === "settings"
                      ? "bg-white/[0.08] text-white shadow-md border-t border-white/5"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.02]"
                  }`}
                >
                  <Settings2 className="w-3.5 h-3.5" />
                  Settings
                </button>
              </div>

              {/* Desktop Auth Badge */}
              <div className="hidden md:flex items-center gap-3">
                {user ? (
                  <div
                    className={`flex items-center gap-2 border rounded-2xl px-4 py-2 text-xs font-semibold relative ${isPremiumUser ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" : "bg-indigo-500/10 border-indigo-500/20 text-indigo-300"}`}
                  >
                    {isPremiumUser ? (
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                    ) : (
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                    )}
                    <span className="truncate max-w-[140px]" title={user.email}>
                      {user.email}
                    </span>
                    {isPremiumUser && (
                      <span className="text-[9px] uppercase tracking-wider bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded ml-1 font-bold">
                        Premium
                      </span>
                    )}
                    <button
                      onClick={handleSignOut}
                      title="Sign Out Account"
                      className="ml-2 p-1 rounded-lg hover:bg-zinc-800 hover:text-white text-indigo-400 transition"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    {isPremiumUser && (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-[10.5px] font-semibold text-emerald-300 animate-pulse">
                        <Sparkles className="w-3 h-3 text-emerald-400" />
                        <span>Premium Guest</span>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode("login");
                        setAuthModalOpen(true);
                      }}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-zinc-300 bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 transition active:scale-95 duration-200"
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      <span>Sign In</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode("signup");
                        setAuthModalOpen(true);
                      }}
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-white bg-indigo-600 hover:bg-indigo-500 border border-indigo-500/30 transition shadow-lg shadow-indigo-950/20 active:scale-95 duration-200"
                    >
                      <User className="w-3.5 h-3.5" />
                      <span>Sign Up</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </motion.div>

        {/* CORE INTERACTIVE PANELS */}
        <div className="flex-grow flex flex-col justify-stretch">
          <AnimatePresence mode="wait">
            {/* INTRO PORTAL VIEW */}
            {activeTab === "intro" ? (
              <motion.div
                key="intro"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="max-w-5xl mx-auto w-full space-y-12 py-4 px-3 md:px-0"
              >
                {/* HERO BANNER SECTION */}
                <motion.div 
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.45, ease: "easeOut" }}
                  className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-950/20 via-zinc-950/40 to-black/60 p-8 md:p-12 text-center space-y-6 shadow-2xl backdrop-blur-3xl"
                >
                  {/* Subtle ambient blur background */}
                  <div className="absolute -top-24 -left-20 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
                  <div className="absolute -bottom-24 -right-20 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

                  <div className="space-y-4">
                    <h2 className="text-3xl md:text-5xl font-extrabold font-display leading-[1.12] text-white">
                      Your best obfuscator for{" "}
                      <br className="hidden md:block" />
                      <span className="bg-gradient-to-r from-indigo-400 via-indigo-200 to-white bg-clip-text text-transparent">
                        lua 5.1/luau
                      </span>
                    </h2>
                    <p className="text-zinc-350 font-mono text-xs md:text-sm font-bold uppercase tracking-widest">
                      Best performance & secure & small
                    </p>
                  </div>

                  <div className="text-zinc-400 text-sm md:text-base max-w-2xl mx-auto min-h-[48px] flex items-center justify-center leading-relaxed">
                    <p className="inline-flex items-center gap-1.5 flex-wrap justify-center">
                      <span className="text-indigo-400 font-mono font-bold animate-pulse">&gt;</span>
                      <TypewriterText 
                        phrases={[
                          "MinRay is a powerful & fast obfuscator for Lua 5.1 and Luau.",
                          "Advanced Virtualization & Control Flow Flattening protect your script.",
                          "Anti-Hook Security Matrix stops memory dumpers and hookers in their tracks.",
                          "Zero-overhead bytecode execution preserves optimal script performance."
                        ]}
                        speed={32}
                        delayBetween={2200}
                        className="text-zinc-350 font-sans font-medium hover:text-white transition duration-200"
                      />
                    </p>
                  </div>

                  <div className="pt-3 flex flex-wrap gap-4 items-center justify-center font-mono text-xs">
                    <button
                      onClick={() => setActiveTab("home")}
                      className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl flex items-center gap-2 transition duration-200 shadow-xl shadow-indigo-500/10 cursor-pointer transform hover:-translate-y-0.5 active:scale-95 btn-interactive"
                    >
                      <Terminal className="w-4 h-4" />
                      Dashboard
                    </button>
                    <button
                      onClick={() => setActiveTab("docs")}
                      className="px-6 py-3.5 bg-white/[0.03] hover:bg-white/[0.06] text-zinc-300 hover:text-white border border-white/10 rounded-2xl flex items-center gap-2 transition duration-200 cursor-pointer active:scale-95"
                    >
                      <Code2 className="w-4 h-4 text-indigo-400" />
                      API Credentials Setup
                    </button>
                  </div>
                </motion.div>

                {/* THE CORE SECURITY ARCHITECTURE SECTION (ANTI HACK GATES) */}
                <div className="space-y-6">
                  <div className="text-center space-y-2">
                    <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest font-mono">
                      HIGH SECURITY ARCHITECTURE
                    </span>
                    <h3 className="text-xl md:text-2xl font-bold font-display text-white">
                      Multi-Layered Protection System
                    </h3>
                    <p className="text-xs text-zinc-500 max-w-lg mx-auto">
                      MinRay integrates ultimate defenses against decompilation,
                      reverse engineering, and live tampering.
                    </p>
                  </div>

                  <motion.div 
                    variants={{
                      hidden: { opacity: 0 },
                      show: {
                        opacity: 1,
                        transition: {
                          staggerChildren: 0.08,
                          delayChildren: 0.1
                        }
                      }
                    }}
                    initial="hidden"
                    animate="show"
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
                  >
                    {[
                      {
                        icon: (
                          <ShieldCheck className="w-5 h-5 text-indigo-400" />
                        ),
                        title: "Virtualization",
                        desc: "Compiles your script into a unique, custom VM bytecode.",
                      },
                      {
                        icon: <Cpu className="w-5 h-5 text-indigo-400" />,
                        title: "Control Flow Flattening",
                        desc: "Flattens your code's control flow by converting loops and branches into a state machine",
                      },
                      {
                        icon: <Lock className="w-5 h-5 text-indigo-400" />,
                        title: "VM Compression",
                        desc: "Applies powerful compression to your script, significantly reducing the obfuscated file size.",
                      },
                      {
                        icon: <Zap className="w-5 h-5 text-indigo-400" />,
                        title: "Performance",
                        desc: "Delivers fast, smooth, and highly efficient execution for your obfuscated script.",
                      },
                    ].map((item, i) => (
                      <motion.div
                        key={i}
                        variants={{
                          hidden: { opacity: 0, y: 15 },
                          show: { 
                            opacity: 1, 
                            y: 0, 
                            transition: { 
                              type: "spring", 
                              stiffness: 90, 
                              damping: 14 
                            } 
                          }
                        }}
                        whileHover={{ 
                          y: -4, 
                          scale: 1.02,
                          borderColor: "rgba(99, 102, 241, 0.4)",
                          backgroundColor: "rgba(255, 255, 255, 0.04)"
                        }}
                        className="bg-white/[0.02] border border-white/10 p-5 rounded-2xl space-y-3 backdrop-blur-md transition-all duration-300 cursor-default shadow-lg"
                      >
                        <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl w-fit">
                          {item.icon}
                        </div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-white font-display">
                          {item.title}
                        </h4>
                        <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">
                          {item.desc}
                        </p>
                      </motion.div>
                    ))}
                  </motion.div>
                </div>

                {/* INTERACTIVE COMPILER STACK VISUAL SHOWCASE */}
                <div className="pt-4">
                  {/* Interactive Before/After Split Partition Slider */}
                  <div
                    ref={sliderRef}
                    onPointerDown={(e) => {
                      try {
                        e.currentTarget.setPointerCapture(e.pointerId);
                      } catch (err) {}
                      setIsDraggingSlider(true);
                      handleSliderMove(e.clientX);
                    }}
                    onPointerMove={(e) => {
                      if (isDraggingSlider) {
                        handleSliderMove(e.clientX);
                      }
                    }}
                    onPointerUp={(e) => {
                      try {
                        e.currentTarget.releasePointerCapture(e.pointerId);
                      } catch (err) {}
                      setIsDraggingSlider(false);
                    }}
                    onPointerCancel={() => setIsDraggingSlider(false)}
                    className="max-w-4xl mx-auto w-full relative overflow-hidden rounded-[32px] border border-white/10 shadow-2xl h-80 select-none cursor-ew-resize bg-[#12131a] touch-none"
                  >
                    {/* Base Layer (Bottom): PROTECTED VM BYTECODE (Right Side / Obfuscated) */}
                    <div className="absolute inset-0 w-full h-full p-6 text-zinc-300 font-mono text-[10.5px] sm:text-[11px] flex flex-col justify-between">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-white/[0.05] pb-2">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-400">
                            VIRTUALIZED COMPILER OUTPUT
                          </span>
                          <span className="text-indigo-400 bg-indigo-500/10 border border-indigo-400/20 px-1.5 py-0.5 rounded text-[8px] font-bold font-sans">
                            COMPLETED
                          </span>
                        </div>

                        <div
                          className="leading-relaxed text-[#a9b1d6] font-mono text-[10.5px] sm:text-[11px] select-none pointer-events-none break-all whitespace-normal text-left max-h-[190px] overflow-y-auto"
                          data-testid="slider-bytecode"
                        >
                          <div className="text-[#565f89] mb-1">
                            -- This lua file was generated using the MinRay V2
                            Obfuscator
                          </div>
                          <div>
                            <span className="text-[#bb9af7] font-semibold">
                              local
                            </span>{" "}
                            <span className="text-[#c0caf5]">w</span>
                            <span className="text-[#89ddff]">=</span>
                            <span className="text-[#89ddff]">&#123;</span>
                            <span className="text-[#e2a45c]">Q83yO</span>
                            <span className="text-[#89ddff]">=</span>
                            <span className="text-[#9ece6a]">"v!!!"</span>
                            <span className="text-[#89ddff]">&#125;</span>{" "}
                            <span className="text-[#bb9af7] font-semibold">
                              local
                            </span>{" "}
                            <span className="text-[#c0caf5]">V</span>,
                            <span className="text-[#c0caf5]">H</span>{" "}
                            <span className="text-[#bb9af7] font-semibold">
                              do
                            </span>{" "}
                            <span className="text-[#bb9af7] font-semibold">
                              local
                            </span>{" "}
                            <span className="text-[#c0caf5]">F</span>
                            <span className="text-[#89ddff]">=</span>
                            <span className="text-[#7cd5f4]">math</span>
                            <span className="text-[#89ddff]">.</span>
                            <span className="text-[#7aa2f7]">floor</span>{" "}
                            <span className="text-[#bb9af7] font-semibold">
                              local
                            </span>{" "}
                            <span className="text-[#c0caf5]">G</span>
                            <span className="text-[#89ddff]">=</span>
                            <span className="text-[#7cd5f4]">string</span>
                            <span className="text-[#89ddff]">.</span>
                            <span className="text-[#7aa2f7]">char</span>{" "}
                            <span className="text-[#bb9af7] font-semibold">
                              local
                            </span>{" "}
                            <span className="text-[#c0caf5]">f</span>
                            <span className="text-[#89ddff]">=</span>
                            <span className="text-[#7cd5f4]">string</span>
                            <span className="text-[#89ddff]">.</span>
                            <span className="text-[#7aa2f7]">byte</span>{" "}
                            <span className="text-[#bb9af7] font-semibold">
                              local
                            </span>{" "}
                            <span className="text-[#bb9af7] font-semibold">
                              function
                            </span>{" "}
                            <span className="text-[#7aa2f7]">z</span>
                            <span className="text-[#9abdf5]">(</span>
                            <span className="text-[#c0caf5]">G</span>,
                            <span className="text-[#c0caf5]">f</span>
                            <span className="text-[#9abdf5]">)</span>{" "}
                            <span className="text-[#bb9af7] font-semibold">
                              local
                            </span>{" "}
                            <span className="text-[#c0caf5]">z</span>
                            <span className="text-[#89ddff]">=</span>
                            <span className="text-[#ff9e64]">0x0</span>{" "}
                            <span className="text-[#bb9af7] font-semibold">
                              for
                            </span>{" "}
                            <span className="text-[#c0caf5]">J</span>
                            <span className="text-[#89ddff]">=</span>
                            <span className="text-[#ff9e64]">0x0</span>,
                            <span className="text-[#ff9e64]">0x7</span>,
                            <span className="text-[#ff9e64]">0x1</span>{" "}
                            <span className="text-[#bb9af7] font-semibold">
                              do
                            </span>{" "}
                            <span className="text-[#bb9af7] font-semibold">
                              local
                            </span>{" "}
                            <span className="text-[#c0caf5]">R</span>
                            <span className="text-[#89ddff]">=</span>
                            <span className="text-[#c0caf5]">G</span>
                            <span className="text-[#89ddff]/]">/</span>
                            <span className="text-[#ff9e64]">0x2</span>
                            <span className="text-[#89ddff]">+</span>
                            <span className="text-[#c0caf5]">f</span>
                            <span className="text-[#89ddff]/]">/</span>
                            <span className="text-[#ff9e64]">0x2</span>{" "}
                            <span className="text-[#bb9af7] font-semibold">
                              if
                            </span>{" "}
                            <span className="text-[#c0caf5]">R</span>
                            <span className="text-[#89ddff]">~=</span>
                            <span className="text-[#7aa2f7]">F</span>
                            <span className="text-[#9abdf5]">(</span>
                            <span className="text-[#c0caf5]">R</span>
                            <span className="text-[#9abdf5]">)</span>{" "}
                            <span className="text-[#bb9af7] font-semibold">
                              then
                            </span>{" "}
                            <span className="text-[#c0caf5]">z</span>
                            <span className="text-[#89ddff]">=</span>
                            <span className="text-[#c0caf5]">z</span>
                            <span className="text-[#89ddff] font-semibold">
                              +
                            </span>
                            <span className="text-[#ff9e64]">0x2</span>
                            <span className="text-[#89ddff] font-semibold">
                              ^
                            </span>
                            <span className="text-[#c0caf5]">J</span>{" "}
                            <span className="text-[#bb9af7] font-semibold">
                              end
                            </span>{" "}
                            <span className="text-[#c0caf5]">G</span>
                            <span className="text-[#89ddff] font-semibold">
                              =
                            </span>
                            <span className="text-[#7aa2f7]">F</span>
                            <span className="text-[#9abdf5]">(</span>
                            <span className="text-[#c0caf5]">G</span>
                            <span className="text-[#89ddff]/]">/</span>
                            <span className="text-[#ff9e64]">0x2</span>
                            <span className="text-[#9abdf5]">)</span>
                            <span className="text-[#c0caf5]">f</span>
                            <span className="text-[#89ddff] font-semibold">
                              =
                            </span>
                            <span className="text-[#7aa2f7]">F</span>
                            <span className="text-[#9abdf5]">(</span>
                            <span className="text-[#c0caf5]">f</span>
                            <span className="text-[#89ddff]/]">/</span>
                            <span className="text-[#ff9e64]">0x2</span>
                            <span className="text-[#9abdf5]">)</span>{" "}
                            <span className="text-[#bb9af7] font-semibold">
                              end
                            </span>{" "}
                            <span className="text-[#bb9af7] font-semibold">
                              return
                            </span>{" "}
                            <span className="text-[#c0caf5]">z</span>{" "}
                            <span className="text-[#bb9af7] font-semibold">
                              end
                            </span>{" "}
                            <span className="text-[#bb9af7] font-semibold">
                              local
                            </span>{" "}
                            <span className="text-[#c0caf5]">J</span>
                            <span className="text-[#89ddff]">=</span>
                            <span className="text-[#89ddff]">&#123;</span>
                            <span className="text-[#ff9e64]">0xAB</span>;
                            <span className="text-[#ff9e64]">0x3F</span>,
                            <span className="text-[#ff9e64]">0x3E</span>;
                            <span className="text-[#ff9e64]">0x73</span>
                            <span className="text-[#89ddff]">&#125;</span>{" "}
                            <span className="text-[#bb9af7] font-semibold">
                              local
                            </span>{" "}
                            <span className="text-[#bb9af7] font-semibold">
                              function
                            </span>{" "}
                            <span className="text-[#7aa2f7]">R</span>
                            <span className="text-[#9abdf5]">(</span>
                            <span className="text-[#c0caf5]">G</span>,
                            <span className="text-[#c0caf5]">z</span>
                            <span className="text-[#9abdf5]">)</span>{" "}
                            <span className="text-[#bb9af7] font-semibold">
                              local
                            </span>{" "}
                            <span className="text-[#c0caf5]">J</span>
                            <span className="text-[#89ddff]">=</span>
                            <span className="text-[#89ddff]">
                              &#123;&#125;
                            </span>{" "}
                            <span className="text-[#bb9af7] font-semibold">
                              local
                            </span>{" "}
                            <span className="text-[#c0caf5]">R</span>
                            <span className="text-[#89ddff]">=</span>
                            <span className="text-[#ff9e64]">0x1</span>{" "}
                            <span className="text-[#bb9af7] font-semibold">
                              local
                            </span>{" "}
                            <span className="text-[#c0caf5]">q</span>
                            <span className="text-[#89ddff]">=</span>
                            <span className="text-[#89ddff]">#</span>
                            <span className="text-[#c0caf5]">G</span>{" "}
                            <span className="text-[#bb9af7] font-semibold">
                              while
                            </span>{" "}
                            <span className="text-[#c0caf5]">R</span>
                            <span className="text-[#89ddff]">&lt;=</span>
                            <span className="text-[#c0caf5]">q</span>{" "}
                            <span className="text-[#bb9af7] font-semibold">
                              do
                            </span>{" "}
                            <span className="text-[#bb9af7] font-semibold">
                              local
                            </span>{" "}
                            <span className="text-[#c0caf5]">z</span>
                            <span className="text-[#89ddff]">=</span>
                            <span className="text-[#ff9e64]">0x0</span>{" "}
                            <span className="text-[#bb9af7] font-semibold">
                              local
                            </span>{" "}
                            <span className="text-[#c0caf5]">V</span>
                            <span className="text-[#89ddff]">=</span>
                            <span className="text-[#ff9e64]">0x5</span>{" "}
                            <span className="text-[#bb9af7] font-semibold">
                              if
                            </span>{" "}
                            <span className="text-[#c0caf5]">R</span>
                            <span className="text-[#89ddff] font-semibold">
                              +
                            </span>
                            <span className="text-[#ff9e64]">0x4</span>
                            <span className="text-[#89ddff] font-semibold">
                              &gt;
                            </span>
                            <span className="text-[#c0caf5]">q</span>{" "}
                            <span className="text-[#bb9af7] font-semibold">
                              then
                            </span>{" "}
                            <span className="text-[#c0caf5]">V</span>
                            <span className="text-[#89ddff] font-semibold">
                              =
                            </span>
                            <span className="text-[#9abdf5]">(</span>
                            <span className="text-[#c0caf5]">q</span>
                            <span className="text-[#89ddff]">-</span>
                            <span className="text-[#c0caf5]">R</span>
                            <span className="text-[#9abdf5] font-semibold">
                              )
                            </span>
                            <span className="text-[#89ddff] font-semibold font-semibold">
                              +
                            </span>
                            <span className="text-[#ff9e64]">0x1</span>{" "}
                            <span className="text-[#bb9af7] font-semibold font-semibold">
                              for
                            </span>{" "}
                            <span className="text-[#c0caf5]">F</span>
                            <span className="text-[#89ddff] font-semibold font-semibold">
                              =
                            </span>
                            <span className="text-[#ff9e64]">0x1</span>,
                            <span className="text-[#c0caf5]">V</span>,
                            <span className="text-[#ff9e64]/]">0x1</span>{" "}
                            <span className="text-[#bb9af7] font-semibold font-semibold font-semibold">
                              do
                            </span>{" "}
                            <span className="text-[#c0caf5]">z</span>
                            <span className="text-[#89ddff] font-semibold font-semibold">
                              =
                            </span>
                            <span className="text-[#c0caf5]">z</span>
                            <span className="text-[#89ddff] font-semibold font-semibold font-semibold">
                              *
                            </span>
                            <span className="text-[#ff9e64]">0x55</span>
                            <span className="text-[#89ddff] font-semibold font-semibold font-semibold">
                              +
                            </span>
                            <span className="text-[#9abdf5] font-semibold font-semibold">
                              (
                            </span>
                            <span className="text-[#7aa2f7]">f</span>
                            <span className="text-[#9abdf5] font-semibold font-semibold">
                              (
                            </span>
                            <span className="text-[#c0caf5]">G</span>,
                            <span className="text-[#9abdf5] font-semibold font-semibold">
                              (
                            </span>
                            <span className="text-[#c0caf5]">R</span>
                            <span className="text-[#89ddff] font-semibold font-semibold font-semibold">
                              +
                            </span>
                            <span className="text-[#c0caf5]">F</span>
                            <span className="text-[#9abdf5] font-semibold font-semibold">
                              )
                            </span>
                            <span className="text-[#89ddff] font-semibold font-semibold font-semibold">
                              -
                            </span>
                            <span className="text-[#ff9e64]">0x1</span>
                            <span className="text-[#9abdf5] font-semibold font-semibold">
                              )
                            </span>
                            <span className="text-[#89ddff] font-semibold font-semibold font-semibold font-semibold">
                              -
                            </span>
                            <span className="text-[#ff9e64]">0x21</span>
                            <span className="text-[#9abdf5] font-semibold font-semibold">
                              )
                            </span>{" "}
                            <span className="text-[#bb9af7] font-semibold">
                              end
                            </span>{" "}
                            <span className="text-[#bb9af7] font-semibold font-semibold">
                              for
                            </span>{" "}
                            <span className="text-[#c0caf5]">F</span>
                            <span className="text-[#89ddff] font-semibold font-semibold">
                              =
                            </span>
                            <span className="text-[#c0caf5]">V</span>
                            <span className="text-[#89ddff] font-semibold font-semibold font-semibold">
                              +
                            </span>
                            <span className="text-[#ff9e64]">0x1</span>,
                            <span className="text-[#ff9e64]/]">0x5</span>,
                            <span className="text-[#ff9e64]/]">0x1</span>{" "}
                            <span className="text-[#bb9af7] font-semibold font-semibold font-semibold">
                              do
                            </span>{" "}
                            <span className="text-[#c0caf5]">z</span>
                            <span className="text-[#89ddff] font-semibold font-semibold">
                              =
                            </span>
                            <span className="text-[#c0caf5]">z</span>
                            <span className="text-[#89ddff] font-semibold font-semibold font-semibold">
                              *
                            </span>
                            <span className="text-[#ff9e64]">0x55</span>
                            <span className="text-[#89ddff] font-semibold font-semibold font-semibold">
                              +
                            </span>
                            <span className="text-[#ff9e64]">0x54</span>{" "}
                            <span className="text-[#bb9af7] font-semibold font-semibold">
                              end
                            </span>{" "}
                            <span className="text-[#bb9af7] font-semibold font-semibold">
                              else
                            </span>{" "}
                            <span className="text-[#bb9af7] font-semibold font-semibold">
                              for
                            </span>{" "}
                            <span className="text-[#c0caf5]">F</span>
                            <span className="text-[#89ddff] font-semibold font-semibold font-semibold">
                              =
                            </span>
                            <span className="text-[#ff9e64]">0x0</span>,
                            <span className="text-[#ff9e64]">0x4</span>,
                            <span className="text-[#ff9e64]">0x1</span>{" "}
                            <span className="text-[#bb9af7] font-semibold font-semibold font-semibold">
                              do
                            </span>{" "}
                            <span className="text-[#c0caf5]">z</span>
                            <span className="text-[#89ddff] font-semibold font-semibold">
                              =
                            </span>
                            <span className="text-[#c0caf5]">z</span>
                            <span className="text-[#89ddff] font-semibold font-semibold font-semibold font-semibold">
                              *
                            </span>
                            <span className="text-[#ff9e64]">0x55</span>
                            <span className="text-[#89ddff] font-semibold font-semibold font-semibold font-semibold font-semibold">
                              +
                            </span>
                            <span className="text-[#9abdf5] font-semibold font-semibold">
                              (
                            </span>
                            <span className="text-[#7aa2f7]">f</span>
                            <span className="text-[#9abdf5] font-semibold font-semibold">
                              (
                            </span>
                            <span className="text-[#c0caf5]">G</span>,
                            <span className="text-[#c0caf5]">R</span>
                            <span className="text-[#89ddff] font-semibold font-semibold font-semibold font-semibold font-semibold font-semibold font-semibold">
                              +
                            </span>
                            <span className="text-[#c0caf5]">F</span>
                            <span className="text-[#9abdf5] font-semibold font-semibold font-semibold">
                              )
                            </span>
                            <span className="text-[#89ddff] font-semibold font-semibold font-semibold font-semibold font-semibold font-semibold font-semibold font-semibold">
                              -
                            </span>
                            <span className="text-[#ff9e64]">0x21</span>
                            <span className="text-[#9abdf5] font-semibold font-semibold">
                              )
                            </span>{" "}
                            <span className="text-[#bb9af7] font-semibold font-semibold">
                              end
                            </span>{" "}
                            <span className="text-[#bb9af7] font-semibold font-semibold">
                              end
                            </span>{" "}
                            <span className="text-[#bb9af7] font-semibold font-semibold">
                              local
                            </span>{" "}
                            <span className="text-[#c0caf5]">H</span>
                            <span className="text-[#89ddff] font-semibold font-semibold">
                              =
                            </span>
                            <span className="text-[#7aa2f7]">F</span>
                            <span className="text-[#9abdf5] font-semibold font-semibold">
                              (
                            </span>
                            <span className="text-[#c0caf5]">z</span>
                            <span className="text-[#89ddff]/]">/</span>
                            <span className="text-[#ff9e64]">0x1000000</span>
                            <span className="text-[#9abdf5] font-semibold font-semibold">
                              )
                            </span>
                            <span className="text-[#89ddff] font-semibold font-semibold">
                              %
                            </span>
                            <span className="text-[#ff9e64]">0x100</span>{" "}
                            <span className="text-[#bb9af7] font-semibold font-semibold">
                              local
                            </span>{" "}
                            <span className="text-[#c0caf5]">o</span>
                            <span className="text-[#89ddff] font-semibold font-semibold">
                              =
                            </span>
                            <span className="text-[#7aa2f7]">F</span>
                            <span className="text-[#9abdf5] font-semibold font-semibold font-semibold">
                              (
                            </span>
                            <span className="text-[#c0caf5]">z</span>
                            <span className="text-[#89ddff]/]">/</span>
                            <span className="text-[#ff9e64]">0x10000</span>
                            <span className="text-[#9abdf5] font-semibold font-semibold font-semibold">
                              )
                            </span>
                            <span className="text-[#89ddff] font-semibold font-semibold font-semibold">
                              %
                            </span>
                            <span className="text-[#ff9e64]">0x100</span>{" "}
                            <span className="text-[#bb9af7] font-semibold font-semibold">
                              local
                            </span>{" "}
                            <span className="text-[#c0caf5]">b</span>
                            <span className="text-[#89ddff] font-semibold font-semibold font-semibold">
                              =
                            </span>
                            <span className="text-[#7aa2f7]">F</span>
                            <span className="text-[#9abdf5] font-semibold font-semibold font-semibold font-semibold">
                              (
                            </span>
                            <span className="text-[#c0caf5]">z</span>
                            <span className="text-[#89ddff]/]">/</span>
                            <span className="text-[#ff9e64]">0x100</span>
                            <span className="text-[#9abdf5] font-semibold font-semibold font-semibold font-semibold">
                              )
                            </span>
                            <span className="text-[#89ddff] font-semibold font-semibold font-semibold font-semibold">
                              %
                            </span>
                            <span className="text-[#ff9e64]">0x100</span>{" "}
                            <span className="text-[#bb9af7] font-semibold font-semibold font-semibold">
                              local
                            </span>{" "}
                            <span className="text-[#c0caf5]">s</span>
                            <span className="text-[#89ddff] font-semibold font-semibold font-semibold font-semibold font-semibold">
                              =
                            </span>
                            <span className="text-[#c0caf5]">z</span>
                            <span className="text-[#89ddff] font-semibold font-semibold font-semibold font-semibold font-semibold font-semibold">
                              %
                            </span>
                            <span className="text-[#ff9e64]">0x100</span>{" "}
                            <span className="text-[#c0caf5]">J</span>
                            <span className="text-[#89ddff] font-semibold font-semibold font-semibold font-semibold font-semibold font-semibold font-semibold">
                              [
                            </span>
                            <span className="text-[#89ddff] font-semibold font-semibold font-semibold font-semibold font-semibold font-semibold font-semibold font-semibold font-semibold font-semibold">
                              #
                            </span>
                            <span className="text-[#c0caf5]">J</span>
                            <span className="text-[#89ddff] font-semibold font-semibold font-semibold font-semibold font-semibold font-semibold font-semibold font-semibold font-semibold font-semibold font-semibold">
                              +
                            </span>
                            <span className="text-[#ff9e64]">0x1</span>
                            <span className="text-[#89ddff] font-semibold font-semibold font-semibold font-semibold font-semibold font-semibold font-semibold font-semibold font-semibold font-semibold">
                              ]
                            </span>
                            <span className="text-[#89ddff] font-semibold font-semibold font-semibold font-semibold font-semibold font-semibold font-semibold font-semibold font-semibold font-semibold">
                              =
                            </span>
                            <span className="text-[#c0caf5]">H</span>{" "}
                            <span className="text-[#c0caf5]">J</span>
                            <span className="text-[#89ddff] font-semibold font-semibold font-semibold font-semibold font-semibold font-semibold font-semibold font-semibold font-semibold font-semibold font-semibold font-semibold font-semibold font-semibold font-semibold font-semibold">
                              [
                            </span>
                            <span className="text-[#89ddff] font-semibold font-semibold font-semibold font-semibold font-semibold font-semibold font-semibold font-semibold font-semibold font-semibold font-semibold font-semibold font-semibold font-semibold font-semibold font-semibold font-semibold font-semibold">
                              #
                            </span>
                            <span className="text-[#c0caf5]">J</span>
                            <span className="text-[#89ddff] font-semibold font-semibold font-semibold font-semibold font-semibold font-semibold font-semibold font-semibold font-semibold font-semibold font-semibold font-semibold font-semibold font-semibold font-semibold font-semibold font-semibold font-semibold font-semibold">
                              =
                            </span>
                            <span className="text-[#c0caf5]">o</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-[8.5px] text-indigo-400/80 italic flex items-center gap-1.5 font-sans border-t border-white/[0.05] pt-2 pointer-events-none">
                        <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" />
                        Dynamic virtual machine compiled instruction stream
                        (revealed by sliding left)
                      </div>
                    </div>

                    {/* Mask / Foreground Overlay (Top Layer): SOURCE SCRIPT (Left Side / Raw Code) */}
                    <div
                      className="absolute inset-y-0 left-0 h-full overflow-hidden border-r border-indigo-400/40 bg-[#16171f] select-none pointer-events-none transition-all duration-75 ease-out"
                      style={{ width: `${sliderPosition}%` }}
                    >
                      <div 
                        className="absolute inset-y-0 left-0 h-full p-6 flex flex-col justify-between"
                        style={{ width: sliderWidth ? `${sliderWidth}px` : '56rem' }}
                      >
                        <div className="space-y-4">
                          <div className="flex items-center justify-between border-b border-white/[0.05] pb-2">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-400">
                              SOURCE SCRIPT (BEFORE)
                            </span>
                            <span className="text-emerald-400 bg-emerald-500/10 border border-emerald-400/20 px-1.5 py-0.5 rounded text-[8px] font-bold font-sans">
                              LUA 5.1 / LUAU
                            </span>
                          </div>

                          <div className="leading-relaxed bg-[#0b0c10]/40 p-5 border border-white/5 rounded-2xl font-mono text-left max-w-xl mt-6">
                            <span className="text-[#bb9af7] font-semibold">
                              print
                            </span>
                            <span className="text-[#9abdf5]">(</span>
                            <span className="text-[#9ece6a]">
                              "MinRay was created by Zeraa"
                            </span>
                            <span className="text-[#9abdf5]">)</span>
                          </div>
                        </div>

                        <div className="text-[8.5px] text-zinc-500 italic font-sans border-t border-white/[0.05] pt-2">
                          -- Raw, readable human-authored script input (revealed
                          by sliding right)
                        </div>
                      </div>
                    </div>

                    {/* Sliding Divider Handle Line */}
                    <div
                      className="absolute top-0 bottom-0 pointer-events-none flex items-center justify-center z-20"
                      style={{ left: `${sliderPosition}%` }}
                    >
                      <div className="w-[1.5px] h-full bg-indigo-400/40 relative">
                        <div className="w-7 h-7 rounded-full bg-zinc-900 border-2 border-indigo-500 shadow-[0_0_16px_rgba(99,102,241,0.6)] flex items-center justify-center absolute top-[50%] -translate-y-[50%] -translate-x-3.5 select-none animate-pulse">
                          <ArrowLeftRight className="w-3.5 h-3.5 text-indigo-400" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : null}

            {/* HOME VIEW OR LEGACY TAB */}
            {activeTab === "home" || activeTab === "psu_old" ? (
              <motion.div
                key="sandbox"
                initial={{ opacity: 0, scale: 0.995 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.995 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch"
              >
                {/* TOOLBAR column (left) */}
                <div className="lg:col-span-4 flex flex-col gap-6 relative z-30">
                  {/* CONFIG CONTROLS */}
                  <div
                    className={`bg-white/[0.02] border p-6 rounded-3xl flex flex-col gap-5 backdrop-blur-2xl shadow-2xl relative transition-all duration-300 ${isDropdownOpen ? "z-40" : "z-10"} ${glowBorderClass}`}
                  >
                    <div className="absolute inset-x-0 top-0 h-[100px] bg-gradient-to-b from-white/[0.04] to-transparent pointer-events-none rounded-t-3xl" />

                    <div className="flex items-center justify-between pb-3 border-b border-white/[0.05] relative z-10">
                      <div className="flex items-center gap-2">
                        <Settings2 className="w-4 h-4 text-indigo-400" />
                        <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-300 font-display">
                          COMPILER PROFILE
                        </h2>
                      </div>
                    </div>

                    {/* SELECT BOX WITH ROBLOX-INSPIRED EXTREME CORNER ROUNDING [UICorner] */}
                    <div ref={dropdownRef} className="space-y-2 relative z-20">
                      <label className="text-xs font-semibold text-zinc-400 flex items-center justify-between">
                        <span>Target Preset Architecture</span>
                        <HelpCircle
                          className="w-3.5 h-3.5 text-zinc-500 hover:text-zinc-300 transition cursor-pointer"
                          title="Select compiled VM design profile"
                        />
                      </label>
                      <div className="relative">
                        {/* UICorner Rounded Selector Trigger Button */}
                        <button
                          type="button"
                          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                          className="w-full bg-zinc-950/70 border border-white/10 hover:border-white/20 hover:bg-zinc-950/90 text-zinc-100 text-xs rounded-full p-4 px-5 outline-none flex items-center justify-between transition-all duration-300 shadow-xl font-display"
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
                            <span className="font-bold text-zinc-200 tracking-wider font-mono">
                              {activeTab === "psu_old" ? presetOld : preset}
                            </span>
                          </div>
                          <span className="text-[10px] text-zinc-400 hover:text-white font-bold uppercase tracking-widest flex items-center gap-1.5 bg-white/[0.04] px-3.5 py-1.5 rounded-full border border-white/5 hover:bg-white/[0.08] transition duration-200">
                            BROWSE
                            <svg
                              className={`w-3.5 h-3.5 transition-transform duration-300 ${isDropdownOpen ? "rotate-180" : ""}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M19 9l-7 7-7-7"
                              />
                            </svg>
                          </span>
                        </button>

                        {/* Floating Preset Select Panel - Extra rounded for beautiful UICorner looks */}
                        <AnimatePresence>
                          {isDropdownOpen && (
                            <motion.div
                              initial={{ opacity: 0, y: 12, scale: 0.97 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 6, scale: 0.97 }}
                              transition={{ duration: 0.2 }}
                              className="absolute left-0 right-0 mt-3.5 bg-zinc-950/95 border border-white/15 rounded-[22px] shadow-[0_20px_50px_rgba(0,0,0,0.8)] p-4 z-50 backdrop-blur-2.5xl"
                            >
                              <div className="flex items-center gap-2 px-1.5 pb-2.5 border-b border-white/5 mb-3">
                                <span className="text-[10px] text-zinc-500 font-extrabold uppercase tracking-widest flex-grow">
                                  Filter Engines
                                </span>
                                {searchQuery && (
                                  <button
                                    onClick={() => setSearchQuery("")}
                                    className="text-[9px] text-zinc-500 hover:text-zinc-300 font-mono font-bold leading-none"
                                  >
                                    Clear
                                  </button>
                                )}
                              </div>
                              <input
                                type="text"
                                placeholder="Search VM Presets..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-zinc-900/60 border border-white/5 focus:border-indigo-500/30 font-mono text-xs rounded-xl p-3 outline-none text-zinc-200 placeholder-zinc-500 mb-3 transition duration-200"
                              />
                              <div className="max-h-[220px] overflow-y-auto space-y-1.5 pr-1 scrollbar-thin scrollbar-thumb-white/15">
                                {(activeTab === "psu_old"
                                  ? PRESETS_OLD
                                  : PRESETS
                                )
                                  .filter((p) =>
                                    p
                                      .toLowerCase()
                                      .includes(searchQuery.toLowerCase()),
                                  )
                                  .map((p) => {
                                    const details = PRESET_DETAILS[p] || {
                                      title: p,
                                      badge: "Standard",
                                      complexity: "Medium",
                                    };
                                    const rating = PRESET_RATINGS[p] || {
                                      security: 3,
                                    };
                                    const isSelected =
                                      (activeTab === "psu_old"
                                        ? presetOld
                                        : preset) === p;
                                    return (
                                      <button
                                        key={p}
                                        type="button"
                                        onClick={() => {
                                          if (activeTab === "psu_old") {
                                            setPresetOld(p);
                                          } else {
                                            setPreset(p);
                                          }
                                          setIsDropdownOpen(false);
                                        }}
                                        className={`w-full flex items-center justify-between p-3 rounded-[14px] text-left transition duration-205 ${
                                          isSelected
                                            ? "bg-indigo-500/15 border border-indigo-500/30 text-white shadow-inner"
                                            : "bg-white/[0.01] border border-transparent hover:border-white/5 hover:bg-white/[0.03] text-zinc-300 hover:text-white"
                                        }`}
                                      >
                                        <div className="flex flex-col">
                                          <span className="text-xs font-bold font-mono leading-tight">
                                            {p}
                                          </span>
                                          <span className="text-[9px] text-zinc-500 mt-0.5 font-sans italic truncate max-w-[170px]">
                                            {details.title}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-1.5 flex-shrink-0">
                                          <span className="text-[8px] px-1.5 py-0.5 uppercase tracking-normal font-extrabold rounded-md bg-white/[0.03] border border-white/5 text-zinc-400 font-mono">
                                            Lvl {rating.security}
                                          </span>
                                          <span
                                            className={`text-[8px] font-bold px-2 py-0.5 rounded-full border bg-zinc-900 ${
                                              details.complexity === "Max"
                                                ? "text-red-400 border-red-500/25 bg-red-500/5"
                                                : details.complexity === "High"
                                                  ? "text-orange-400 border-orange-500/25 bg-orange-500/5"
                                                  : details.complexity ===
                                                      "Medium"
                                                    ? "text-indigo-400 border-indigo-500/25 bg-indigo-500/5"
                                                    : "text-zinc-400 border-zinc-700 bg-zinc-800"
                                            }`}
                                          >
                                            {details.complexity}
                                          </span>
                                        </div>
                                      </button>
                                    );
                                  })}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    {/* COMPILE TRIGGER CONTAINER */}
                    <div className="pt-2 relative z-10">
                      <button
                        onClick={handleObfuscate}
                        disabled={isObfuscating || !inputCode.trim()}
                        className="w-full relative py-4 px-5 rounded-full text-xs font-bold uppercase tracking-widest text-white bg-gradient-to-r from-indigo-500 via-indigo-600 to-indigo-700 hover:from-indigo-400 hover:to-indigo-600 active:scale-[0.98] disabled:from-indigo-950/40 disabled:to-indigo-950/60 disabled:text-zinc-650 disabled:cursor-not-allowed transition-all duration-300 overflow-hidden group shadow-lg shadow-indigo-500/10"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent group-hover:translate-x-full transition-transform duration-1000 -translate-x-full" />
                        <div className="flex items-center justify-center gap-2">
                          {isObfuscating ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin whitespace-nowrap text-white" />
                              <span>Virtualizing Matrix...</span>
                            </>
                          ) : (
                            <>
                              <Zap className="w-4 h-4 text-indigo-250 fill-indigo-200/20" />
                              <span>Obfuscate Script</span>
                            </>
                          )}
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* CREDITS & TOKEN MANAGER */}
                  <div className="bg-white/[0.02] border border-white/10 p-6 rounded-3xl flex flex-col gap-5 backdrop-blur-2xl shadow-xl relative overflow-hidden">
                    <div className="absolute inset-x-0 top-0 h-[100px] bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none rounded-t-3xl" />

                    <div className="flex items-center justify-between pb-3 border-b border-white/[0.05] relative z-10">
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-amber-400" />
                        <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-300 font-display">
                          Credits & Balance
                        </h2>
                      </div>
                      {isPremiumUser ? (
                        <div className="flex items-center gap-1 px-3 py-1 bg-emerald-500/10 border border-emerald-500/25 text-[11px] font-mono font-bold text-emerald-400 rounded-full shadow-lg shadow-emerald-500/5 animate-pulse">
                          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Premium (Inf)</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-[11px] font-mono font-bold text-amber-300 rounded-full">
                          <span>{credits}</span>
                          <span className="text-[9px] uppercase tracking-wider text-amber-500/80">
                            Credits
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Info Panel explaining credits */}
                    <div className="space-y-3 relative z-10">
                      <div className="p-3.5 bg-zinc-950/55 border border-white/5 rounded-2xl space-y-1.5">
                        <div className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider text-zinc-400">
                          <Info className="w-3.5 h-3.5 text-indigo-400" />
                          <span>What is Credits?</span>
                        </div>
                        <p className="text-[10.5px] text-zinc-450 leading-relaxed font-sans">
                          Credits is the balance required to obfuscate scripts
                          on MinRay.
                        </p>
                        <div className="pt-2 border-t border-white/[0.03] space-y-1 text-[10px] font-mono text-zinc-450">
                          <div className="flex justify-between items-center">
                            <span className="text-zinc-500">
                              Prometheus Presets:
                            </span>
                            <span className="text-indigo-300 font-semibold">
                              2 credits
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-zinc-500">MinRay V2 VM:</span>
                            <span className="text-amber-300 font-semibold">
                              5 credits
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Claims and rewards actions */}
                      <div className="grid grid-cols-1 gap-2.5 pt-1">
                        {/* Daily Check-in Button */}
                        <button
                          type="button"
                          onClick={handleCheckin}
                          disabled={lastCheckin === new Date().toDateString()}
                          className={`w-full py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-between transition-all duration-200 border relative overflow-hidden ${
                            lastCheckin === new Date().toDateString()
                              ? "bg-zinc-950/40 border-white/5 text-zinc-650 cursor-not-allowed"
                              : "bg-indigo-500/10 hover:bg-indigo-500/15 border-indigo-500/25 text-indigo-300 hover:border-indigo-500/40 active:scale-[0.98]"
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                            <span>Daily Check-in</span>
                          </span>
                          <span className="font-mono text-[10.5px] text-indigo-400 font-bold">
                            {lastCheckin === new Date().toDateString()
                              ? "Claimed"
                              : "+2 Credits"}
                          </span>
                        </button>

                        {/* Claim from timer watch button */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={handleStartWait}
                            disabled={waitButtonActive || dailyWaitCount >= 5}
                            className={`w-full py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-between transition-all duration-200 border relative overflow-hidden ${
                              dailyWaitCount >= 5
                                ? "bg-zinc-950/40 border-white/5 text-zinc-650 cursor-not-allowed"
                                : waitButtonActive
                                  ? "bg-zinc-950 border-indigo-500/30 text-white cursor-wait"
                                  : "bg-white/[0.03] hover:bg-white/[0.05] border-white/10 text-zinc-300 hover:border-white/20 active:scale-[0.98]"
                            }`}
                          >
                            {/* Animated custom progress bar background for loading */}
                            {waitButtonActive && (
                              <div
                                className="absolute left-0 top-0 bottom-0 bg-indigo-500/10 transition-all duration-100 ease-linear pointer-events-none"
                                style={{ width: `${waitButtonProgress}%` }}
                              />
                            )}

                            <span className="flex items-center gap-2 relative z-10">
                              <Clock
                                className={`w-4 h-4 ${waitButtonActive ? "animate-spin text-indigo-450" : "text-zinc-400"}`}
                              />
                              <span>
                                {waitButtonActive
                                  ? `Waiting ${waitSecondsLeft}s...`
                                  : "Quick Claim Timer"}
                              </span>
                            </span>
                            <span className="font-mono text-[10.5px] text-zinc-400 relative z-10 flex items-center gap-1.5 font-bold">
                              {dailyWaitCount >= 5 ? (
                                <span className="text-zinc-650">
                                  Limit reached
                                </span>
                              ) : (
                                <>
                                  <span className="text-emerald-400">
                                    +1 Credit
                                  </span>
                                  <span className="text-zinc-600">
                                    ({dailyWaitCount}/5)
                                  </span>
                                </>
                              )}
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* EDITORS CODE PANES (right) */}
                <div className="lg:col-span-8 flex flex-col gap-6">
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.99 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      className="flex items-center gap-3.5 p-4 bg-rose-950/25 border border-rose-500/25 text-rose-300 rounded-2xl shadow-xl"
                    >
                      <AlertCircle className="w-5 h-5 flex-shrink-0 animate-bounce text-rose-450" />
                      <div className="text-xs font-medium leading-relaxed">
                        {error}
                      </div>
                    </motion.div>
                  )}

                  {/* CODE DUO EDITORS */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept=".lua,.txt,.luau"
                    className="hidden"
                  />

                  {/* MULTI-TAB CONTROLLER BAR */}
                  <div className="flex flex-wrap items-center justify-between gap-3 bg-white/[0.01] border border-white/5 p-2 rounded-2xl">
                    <div className="flex items-center gap-1.5 flex-wrap overflow-x-auto">
                      {tabs.map((tab) => {
                        const isActive = tab.id === activeTabId;
                        const isEditing = editingTabId === tab.id;
                        return (
                          <div
                            key={tab.id}
                            onClick={() => {
                              if (!isEditing) {
                                setActiveTabId(tab.id);
                              }
                            }}
                            className={`group relative flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[11px] font-mono tracking-tight cursor-pointer transition-all duration-200 select-none ${
                              isActive
                                ? "bg-indigo-500/10 border-indigo-500/30 text-white shadow-lg"
                                : "bg-transparent border-transparent text-zinc-500 hover:text-zinc-350 hover:bg-white/[0.02]"
                            }`}
                          >
                            {/* Accent indicator dot for active tab */}
                            {isActive && (
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                            )}

                            {isEditing ? (
                              <input
                                type="text"
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                onBlur={() => saveEditingTab(tab.id)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") saveEditingTab(tab.id);
                                  if (e.key === "Escape") setEditingTabId(null);
                                }}
                                autoFocus
                                onClick={(e) => e.stopPropagation()}
                                className="bg-zinc-950 border border-indigo-500/30 text-white rounded px-1.5 py-0.5 outline-none w-24 text-[10px]"
                              />
                            ) : (
                              <span
                                onDoubleClick={(e) =>
                                  startEditingTab(tab.id, tab.name, e)
                                }
                                className="truncate max-w-[120px] font-semibold"
                                title="Double-click to rename"
                              >
                                {tab.name}
                              </span>
                            )}

                            {/* Actions inside tab */}
                            {!isEditing && (
                              <div className="flex items-center gap-1 opacity-40 group-hover:opacity-100 transition duration-150 ml-1.5">
                                <button
                                  type="button"
                                  onClick={(e) =>
                                    startEditingTab(tab.id, tab.name, e)
                                  }
                                  className="p-0.5 hover:bg-white/10 rounded text-zinc-400 hover:text-white transition"
                                  title="Rename script tab"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteTab(tab.id);
                                  }}
                                  className="p-0.5 hover:bg-rose-500/20 rounded text-zinc-450 hover:text-rose-450 transition"
                                  title="Close script tab"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Quick Add Tab Button */}
                    <button
                      type="button"
                      onClick={handleAddTab}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-extrabold uppercase tracking-wider text-indigo-300 bg-indigo-505/10 hover:bg-indigo-505/25 border border-indigo-500/10 hover:border-indigo-500/25 active:scale-95 transition-all duration-200"
                      title="Create a new script workspace tab"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Script Tab</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-grow items-stretch">
                    {/* INPUT EDITOR SCREEN */}
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      className="flex flex-col h-full"
                    >
                      <LuaEditor
                        value={inputCode}
                        onChange={(val) => {
                          setInputCode(val);
                          setError(null);
                        }}
                        placeholder="Paste or upload standard Luau layout script here..."
                        themeColor="indigo"
                        onUploadClick={() => fileInputRef.current?.click()}
                        onClearClick={() => {
                          setInputCode("");
                          setError(null);
                        }}
                        onDownloadClick={handleDownloadInput}
                        isDragging={isDragging}
                        editorMode={editorMode}
                        setEditorMode={setEditorMode}
                        softWrap={softWrap}
                      />
                    </div>

                    {/* OUTPUT EDITOR SCREEN */}
                    <div className="flex flex-col h-full">
                      <LuaEditor
                        value={outputCode}
                        readOnly={true}
                        placeholder="Encrypted virtualization logic will emerge here..."
                        themeColor="emerald"
                        onDownloadClick={handleDownload}
                        editorMode={editorMode}
                        setEditorMode={setEditorMode}
                        softWrap={softWrap}
                      />
                    </div>
                  </div>

                  {/* COMPILATION RATIO PANEL */}
                  {outputCode && (
                    <motion.div
                      initial={{ scale: 0.98, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="bg-white/[0.01] border border-white/10 p-5 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-mono text-zinc-400 text-xs backdrop-blur shadow-2xl"
                    >
                      <div className="flex items-center gap-2.5">
                        <Terminal className="w-4.5 h-4.5 text-indigo-400" />
                        <span>
                          Compilation with{" "}
                          <strong className="text-white font-semibold">
                            {currentPreset}
                          </strong>{" "}
                          completed.
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-[11px]">
                        <div>
                          Ratio:{" "}
                          <strong className="text-indigo-300 font-bold">
                            {((outputBytes / (inputBytes || 1)) * 100).toFixed(
                              0,
                            )}
                            %
                          </strong>
                        </div>
                        <div className="h-4 w-[1px] bg-white/10 hidden sm:block"></div>
                        <div className="flex items-center gap-1.5">
                          <BarChart2 className="w-3.5 h-3.5 text-indigo-400" />
                          <span
                            className={
                              outputBytes > inputBytes
                                ? "text-amber-300 font-semibold"
                                : "text-emerald-400 font-bold"
                            }
                          >
                            {outputBytes > inputBytes
                              ? "Virtualization Shell Bloat (Normal)"
                              : "Compacted Decompression"}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* LOAD SAMPLES CHIPS */}
                  <div className="p-6 bg-white/[0.01] border border-white/5 rounded-3xl space-y-3.5">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-500 font-mono">
                      Obfuscate Template Matrix Templates
                    </span>
                    <div className="flex flex-wrap gap-2.5">
                      {SAMPLE_SCRIPTS.map((sam) => (
                        <button
                          key={sam.name}
                          type="button"
                          onClick={() => loadSample(sam.code)}
                          className="px-4 py-2.5 text-xs text-zinc-300 hover:text-white rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-white/10 transition-all font-semibold shadow-inner"
                        >
                          {sam.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : null}

            {/* DEVELOPER API TAB */}
            {activeTab === "docs" ? (
              <motion.div
                key="docs"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
                className="space-y-8 max-w-4xl mx-auto"
              >
                {/* AUTOMATION EXPLAINER */}
                <div className="bg-white/[0.02] border border-white/10 p-8 rounded-[28px] relative overflow-hidden backdrop-blur-2xl shadow-2xl">
                  <div className="absolute inset-x-0 top-0 h-[80px] bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none" />
                  <h2 className="text-xl font-bold font-display text-white flex items-center gap-2 relative z-10">
                    <Terminal className="w-5.5 h-5.5 text-indigo-400 animate-pulse" />
                    Automate Secure Obfuscation via SDK API
                  </h2>
                  <p className="text-xs text-zinc-400 mt-2 leading-relaxed relative z-10 max-w-2xl font-mono">
                    MinRay provides an automated high-throughput POST endpoint.
                    Connect and pipe scripts seamlessly through corporate
                    continuous deployment loops, build automation tasks, Discord
                    command bots, or private developer command lines.
                  </p>
                </div>

                {/* INTERACTIVE PLANS BOARD */}
                <div className="bg-white/[0.02] border border-white/10 p-6 rounded-[28px] space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider font-display">
                        Premium Plans & API Credentials
                      </h3>
                      <p className="text-[11px] text-zinc-500 mt-1">
                        Exchange compilation credits to unlock dedicated API
                        integration credentials and speed limit delays.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setShowApiKeyInput(!showApiKeyInput);
                        setKeyErrorMsg("");
                        setKeySuccessMsg("");
                      }}
                      className="px-4 py-2 text-[11px] font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-400/25 hover:bg-white/[0.04] hover:text-white active:scale-95 transition-all duration-200 rounded-xl flex items-center justify-center gap-2 font-mono cursor-pointer"
                    >
                      <Key className="w-3.5 h-3.5 text-indigo-400" />
                      {showApiKeyInput ? "Hide import panel" : "You have an api key?"}
                    </button>
                  </div>

                  {showApiKeyInput && (
                    <div className="p-5 bg-zinc-950/70 border border-white/5 rounded-2xl space-y-4 animate-fadeIn">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block font-mono">
                          Import Existing API Key
                        </label>
                        <p className="text-[10px] text-zinc-500 leading-normal">
                          Type or paste your previously purchased MinRay API Key. We will query the database to sync your credits, plan terms, and latency exemptions.
                        </p>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-grow">
                          <input
                            type="text"
                            value={typedApiKey}
                            onChange={(e) => setTypedApiKey(e.target.value)}
                            placeholder="MinRayAPI-XXXX-XXXX"
                            className="w-full bg-zinc-900 border border-white/10 focus:border-indigo-500/50 rounded-xl p-3 px-4 outline-none text-xs text-white placeholder-zinc-600 transition font-mono"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={handleValidateApiKey}
                          disabled={checkingKey}
                          className="px-5 py-3 bg-indigo-600 hover:bg-indigo-750 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition duration-200 disabled:opacity-50 cursor-pointer whitespace-nowrap"
                        >
                          {checkingKey ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Validating...</span>
                            </>
                          ) : (
                            <>
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span>Verify & Connect</span>
                            </>
                          )}
                        </button>
                      </div>

                      {keyErrorMsg && (
                        <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-450 text-[10.5px] font-mono leading-relaxed">
                          ⚠️ {keyErrorMsg}
                        </div>
                      )}

                      {keySuccessMsg && (
                        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-[10.5px] font-mono leading-relaxed whitespace-pre-line">
                          🎉 {keySuccessMsg}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Active credentials details */}
                  {activeApiKey && (
                    <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex flex-wrap items-center justify-between gap-4 font-mono text-xs">
                      <div className="space-y-1 w-full sm:w-auto">
                        <span className="text-[9px] font-extrabold uppercase tracking-widest text-indigo-400 block">
                          ACTIVE API CREDENTIALS
                        </span>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-zinc-200 font-bold tracking-wider break-all">
                            {activeApiKey}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(activeApiKey, "api_key")}
                            className="text-zinc-500 hover:text-white transition p-1 bg-white/[0.02] rounded-lg cursor-pointer"
                            title="Copy active API key"
                          >
                            {copied === "api_key" ? (
                              <Check className="w-3.5 h-3.5 text-emerald-450" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-[10.5px]">
                        <div>
                          <span className="text-zinc-500 block text-[9px] uppercase font-bold text-[8px] tracking-widest">
                            Active Plan
                          </span>
                          <span className="text-zinc-350 font-bold uppercase">
                            {activePlanType} plan
                          </span>
                        </div>
                        <div>
                          <span className="text-zinc-500 block text-[9px] uppercase font-bold text-[8px] tracking-widest">
                            Delay Cap
                          </span>
                          <span className="text-zinc-350 font-bold lowercase">
                            {planDelaySecs}s delay
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 animate-fadeIn">
                    {[
                      {
                        type: "1d",
                        name: "1 Day Plan",
                        cost: 20,
                        delay: "20s delay",
                        desc: "MinRayAPI Key 1d",
                      },
                      {
                        type: "5d",
                        name: "5 Days Plan",
                        cost: 75,
                        delay: "10s delay",
                        desc: "MinRayAPI Key 5d",
                      },
                      {
                        type: "1m",
                        name: "1 Month Plan",
                        cost: 200,
                        delay: "1s delay",
                        desc: "MinRayAPI Key 30d",
                      },
                      {
                        type: "lifetime",
                        name: "Lifetime Plan",
                        cost: 500,
                        delay: "Instant / No delay",
                        desc: "No limits forever",
                      },
                    ].map((plan) => {
                      const isActive = activePlanType === plan.type;
                      return (
                        <div
                          key={plan.type}
                          className={`p-4 bg-zinc-950/60 border rounded-2xl flex flex-col justify-between gap-4 transition duration-200 ${
                            isActive
                              ? "border-indigo-500 bg-indigo-950/10 shadow-[0_4px_20px_rgba(99,102,241,0.15)] scale-[1.02]"
                              : "border-white/5 hover:border-white/10"
                          }`}
                        >
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold text-zinc-500 uppercase font-mono tracking-wide">
                              {plan.name}
                            </span>
                            <div className="text-indigo-400 font-mono text-lg font-bold">
                              {plan.cost}{" "}
                              <span className="text-[10px] text-zinc-500 font-normal">
                                creds
                              </span>
                            </div>
                            <div className="pt-2 text-[10px] leading-relaxed text-zinc-400 space-y-1">
                              <div>• {plan.delay} limit</div>
                              <div>• {plan.desc}</div>
                              <div>• Format: MinRayAPI-xxxx</div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRedeemPlan(plan.type as any)}
                            className={`w-full py-2.5 rounded-xl font-mono text-[10px] uppercase font-bold tracking-wider transition cursor-pointer ${
                              isActive
                                ? "bg-indigo-500 text-white shadow-lg active:scale-95"
                                : "bg-white/[0.03] hover:bg-white/[0.06] text-zinc-300 border border-white/5 hover:border-white/10 active:scale-95"
                            }`}
                          >
                            {isActive ? "Active" : "Buy"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* ENDPOINT PARITY PANELS */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* ENDPOINT INFO */}
                  <div className="md:col-span-1 space-y-4 flex flex-col justify-stretch">
                    <div className="p-5 bg-white/[0.01] border border-white/5 rounded-2xl space-y-1 backdrop-blur shadow-inner flex-grow">
                      <div className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">
                        HTTP METHOD
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <span className="px-2.5 py-0.5 bg-indigo-500/10 text-indigo-300 text-[10px] font-extrabold rounded-md border border-indigo-500/20">
                          POST
                        </span>
                        <code className="text-xs text-zinc-200 font-mono break-all">
                          /api/obfuscate
                        </code>
                      </div>
                    </div>

                    <div className="p-5 bg-white/[0.01] border border-white/5 rounded-2xl space-y-1 backdrop-blur shadow-inner flex-grow">
                      <div className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">
                        CONTENT SPEC HEADER
                      </div>
                      <div className="text-xs text-zinc-300 font-mono font-medium pt-1">
                        application/json
                      </div>
                    </div>
                  </div>

                  {/* PARAMS TABLE */}
                  <div className="md:col-span-2 bg-black/40 border border-white/10 rounded-2xl overflow-hidden backdrop-blur shadow-2xl">
                    <div className="px-5 py-3.5 bg-white/[0.02] border-b border-white/[0.05] text-[10px] font-bold text-zinc-400 tracking-wider">
                      REQUEST SCHEMA PARAMETERS
                    </div>
                    <div className="w-full overflow-x-auto">
                      <table className="w-full text-left text-xs min-w-[320px]">
                        <thead>
                          <tr className="border-b border-white/[0.05] bg-white/[0.01] text-zinc-500 font-mono font-semibold text-[9px] uppercase">
                            <th className="px-5 py-2.5">Field Name</th>
                            <th className="px-5 py-2.5">Param Type</th>
                            <th className="px-5 py-2.5">Requirement</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.03]">
                          <tr>
                            <td className="px-5 py-3 font-mono text-indigo-300 font-bold">
                              code
                            </td>
                            <td className="px-5 py-3 text-zinc-400 font-mono">
                              string
                            </td>
                            <td className="px-5 py-3 text-rose-400 font-semibold">
                              Required
                            </td>
                          </tr>
                          <tr>
                            <td className="px-5 py-3 font-mono text-indigo-300 font-bold">
                              preset
                            </td>
                            <td className="px-5 py-3 text-zinc-400 font-mono">
                              string
                            </td>
                            <td className="px-5 py-3 text-rose-400 font-semibold">
                              Required
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* API INTEGRATION EXAMPLES */}
                <div className="space-y-6">
                  {/* CURL BLOCK */}
                  <div className="bg-black/30 border border-white/10 rounded-[22px] overflow-hidden shadow-2xl">
                    <div className="flex items-center justify-between px-5 py-3.5 bg-white/[0.02] border-b border-white/[0.06]">
                      <div className="flex items-center gap-2">
                        <Terminal className="w-4 h-4 text-indigo-400" />
                        <span className="text-[11px] font-bold text-zinc-300 font-mono">
                          Shell CMD (cURL)
                        </span>
                      </div>
                      <button
                        onClick={() => handleCopy(curlExample, "curl")}
                        className="text-zinc-500 hover:text-white transition duration-200 p-1.5 bg-white/[0.04] rounded-xl border border-white/5"
                      >
                        {copied === "curl" ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                    <div className="p-5 overflow-x-auto font-mono text-[11px] leading-relaxed text-zinc-300">
                      <pre>
                        <code>{curlExample}</code>
                      </pre>
                    </div>
                  </div>

                  {/* JS INLINE FETCH */}
                  <div className="bg-black/30 border border-white/10 rounded-[22px] overflow-hidden shadow-2xl">
                    <div className="flex items-center justify-between px-5 py-3.5 bg-white/[0.02] border-b border-white/[0.06]">
                      <div className="flex items-center gap-2">
                        <Code2 className="w-4 h-4 text-indigo-400" />
                        <span className="text-[11px] font-bold text-zinc-300 font-mono">
                          Javascript ES2022 Implementation
                        </span>
                      </div>
                      <button
                        onClick={() => handleCopy(codeExample, "js")}
                        className="text-zinc-500 hover:text-white transition duration-200 p-1.5 bg-white/[0.04] rounded-xl border border-white/5"
                      >
                        {copied === "js" ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                    <div className="p-5 overflow-x-auto font-mono text-[11px] leading-relaxed text-zinc-300">
                      <pre>
                        <code>{codeExample}</code>
                      </pre>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : null}

            {/* SETTINGS WORKSPACE & ARCHIVES */}
            {activeTab === "settings" ? (
              <motion.div
                key="settings"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
                className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch"
              >
                {/* SETTINGS CARD COLUMN */}
                <div className="md:col-span-5 flex flex-col gap-6">
                  <div className="bg-white/[0.02] border border-white/10 p-6 rounded-3xl flex flex-col gap-5 backdrop-blur-2xl shadow-xl">
                    <div className="flex items-center gap-2 pb-1 border-b border-white/[0.05]">
                      <Sliders className="w-4 h-4 text-indigo-400" />
                      <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-300 font-display">
                        Application Settings
                      </h2>
                    </div>

                    {/* SOFT WRAP ROW */}
                    <div className="flex items-center justify-between py-2 border-b border-white/[0.03]">
                      <div>
                        <h4 className="text-xs font-bold text-white">
                          Soft Wordwrap
                        </h4>
                        <p className="text-[10px] text-zinc-500">
                          Wrap long rows within editor viewing grids
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSoftWrap(!softWrap)}
                        className="text-indigo-400 hover:text-indigo-300 transition duration-150"
                      >
                        {softWrap ? (
                          <ToggleRight className="w-8 h-8 text-indigo-500" />
                        ) : (
                          <ToggleLeft className="w-8 h-8 text-zinc-650" />
                        )}
                      </button>
                    </div>

                    {/* DISABLE CFF ROW */}
                    <div className="flex items-center justify-between py-2 border-b border-white/[0.03]">
                      <div>
                        <h4 className="text-xs font-bold text-white">
                          Disable CFF inside VM
                        </h4>
                        <p className="text-[10px] text-zinc-500">
                          Bypass VM AST flattening and compile bytecode to a direct flat lookup table for smaller size and maximum FPS
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setNoCFF(!noCFF)}
                        className="text-indigo-400 hover:text-indigo-300 transition duration-150"
                      >
                        {noCFF ? (
                          <ToggleRight className="w-8 h-8 text-indigo-500" />
                        ) : (
                          <ToggleLeft className="w-8 h-8 text-zinc-650" />
                        )}
                      </button>
                    </div>

                    {/* RECOVERY SECTION */}
                    <div className="pt-3 space-y-3">
                      <div className="flex items-center gap-2">
                        <Key className="w-3.5 h-3.5 text-indigo-400" />
                        <span className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-450 font-mono">
                          Recovery Token
                        </span>
                      </div>

                      <div className="p-3.5 bg-zinc-950/35 border border-white/5 rounded-2xl space-y-2">
                        <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider text-zinc-500">
                          <Info className="w-3.5 h-3.5 text-indigo-400/80" />
                          <span>What is Token?</span>
                        </div>
                        <p className="text-[10px] text-zinc-500 leading-relaxed font-sans col-span-12">
                          Helps restore credits, history & custom plans across
                          any browser sandbox.
                        </p>

                        <div className="flex items-center justify-between gap-2.5 bg-zinc-900 border border-white/5 p-2 rounded-xl mt-1 select-all font-mono text-[10.5px]">
                          <span
                            className="text-indigo-300 font-bold truncate max-w-[150px]"
                            title="Your recovery token"
                          >
                            {recoveryToken}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              handleCopy(recoveryToken, "recovery_token")
                            }
                            className="text-zinc-500 hover:text-white transition p-1 bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] rounded-lg cursor-pointer"
                            title="Copy recovery token value"
                          >
                            {copied === "recovery_token" ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block font-mono">
                          Recover using Token
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={inputRecoveryToken}
                            onChange={(e) =>
                              setInputRecoveryToken(e.target.value)
                            }
                            placeholder="MRAY-xxxxxxxxxxxxxx"
                            className="bg-zinc-900 border border-white/5 text-zinc-200 placeholder-zinc-650 text-[10.5px] rounded-xl p-2 px-3 outline-none flex-grow min-w-0 focus:border-indigo-500/30 font-mono"
                          />
                          <button
                            type="button"
                            onClick={async () => {
                              const trimmed = inputRecoveryToken.trim();
                              if (!trimmed) return;

                              try {
                                const dbData =
                                  await userDataService.loadUserData(trimmed);
                                if (dbData) {
                                  if (typeof dbData.credits === "number") {
                                    setCredits(dbData.credits);
                                  }
                                  if (
                                    Array.isArray(dbData.tabs) &&
                                    dbData.tabs.length > 0
                                  ) {
                                    setTabs(dbData.tabs);
                                    if (dbData.tabs[0]) {
                                      setActiveTabId(dbData.tabs[0].id);
                                    }
                                  }
                                  if (dbData.activeApiKey) {
                                    setActiveApiKey(dbData.activeApiKey);
                                    localStorage.setItem(
                                      "minray_api_key",
                                      dbData.activeApiKey,
                                    );
                                  }
                                  if (dbData.activePlanType) {
                                    setActivePlanType(dbData.activePlanType);
                                    localStorage.setItem(
                                      "minray_plan_type",
                                      dbData.activePlanType,
                                    );
                                  }
                                  if (dbData.planExpiresAt) {
                                    setPlanExpiresAt(dbData.planExpiresAt);
                                    localStorage.setItem(
                                      "minray_plan_expires_at",
                                      dbData.planExpiresAt,
                                    );
                                  }
                                  if (
                                    typeof dbData.planDelaySecs === "number"
                                  ) {
                                    setPlanDelaySecs(dbData.planDelaySecs);
                                    localStorage.setItem(
                                      "minray_plan_delay_secs",
                                      dbData.planDelaySecs.toString(),
                                    );
                                  }

                                  setRecoveryToken(trimmed);
                                  setProfileLoadedId(trimmed);
                                  localStorage.setItem(
                                    "minray_recovery_token",
                                    trimmed,
                                  );
                                  alert(
                                    `Successfully recovered workspace from database! Restored ${dbData.credits} credits, compiler tabs and your active API Plan.`,
                                  );
                                  setInputRecoveryToken("");
                                  return;
                                }
                              } catch (err) {
                                console.warn(
                                  "Database loading error during token recovery:",
                                  err,
                                );
                              }

                              const snapshotStr = localStorage.getItem(
                                `minray_token_snapshot_${trimmed}`,
                              );
                              if (snapshotStr) {
                                try {
                                  const snapshot = JSON.parse(snapshotStr);
                                  if (
                                    snapshot &&
                                    typeof snapshot.credits === "number"
                                  ) {
                                    setCredits(snapshot.credits);
                                    if (Array.isArray(snapshot.tabs)) {
                                      setTabs(snapshot.tabs);
                                      if (snapshot.tabs[0]) {
                                        setActiveTabId(snapshot.tabs[0].id);
                                      }
                                    }
                                    setRecoveryToken(trimmed);
                                    setProfileLoadedId(trimmed);
                                    localStorage.setItem(
                                      "minray_recovery_token",
                                      trimmed,
                                    );
                                    alert(
                                      `Successfully recovered account from cache! Restored ${snapshot.credits} credits and workspace tabs.`,
                                    );
                                    setInputRecoveryToken("");
                                    return;
                                  }
                                } catch (e) {
                                  console.warn(e);
                                }
                              }

                              setRecoveryToken(trimmed);
                              setProfileLoadedId(trimmed);
                              localStorage.setItem(
                                "minray_recovery_token",
                                trimmed,
                              );
                              setCredits(10);
                              alert(
                                `Token recognized. Connected device workspace to token: ${trimmed}. Balance initialized to 10 credits.`,
                              );
                              setInputRecoveryToken("");
                            }}
                            className="px-3 py-2 bg-indigo-500 hover:bg-indigo-600 text-white font-mono font-bold text-[10px] uppercase rounded-xl transition cursor-pointer select-none active:scale-95 shrink-0"
                          >
                            Recover
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* USER PERSISTENT PROFILE */}
                  <div className="bg-white/[0.01] border border-white/5 rounded-3xl p-6 shadow-inner">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-550 font-mono">
                      User
                    </span>

                    <div className="space-y-4 mt-3">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-indigo-500/10 border border-indigo-500/25 rounded-2xl text-indigo-400">
                          <User className="w-6 h-6" />
                        </div>
                        <div className="overflow-hidden">
                          <h4 className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider">
                            identity
                          </h4>
                          <p
                            className="text-[11px] text-zinc-300 font-mono truncate"
                            title={user ? user.email : "Guest Local Workspace"}
                          >
                            {user ? user.email : "Guest Session"}
                          </p>
                        </div>
                      </div>

                      <div className="p-4 bg-zinc-950/40 border border-white/5 rounded-2xl space-y-2.5">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-zinc-500 font-medium">
                            Credit(s):
                          </span>
                          {isPremiumUser ? (
                            <span className="px-2.5 py-0.5 bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 rounded-full font-bold uppercase tracking-wider text-[9px] animate-pulse">
                              Premium
                            </span>
                          ) : (
                            <span className="text-zinc-300 font-mono font-bold">
                              {credits} credits ({Math.min(100, credits * 10)}%)
                            </span>
                          )}
                        </div>

                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-zinc-500 font-medium">
                            Last obfuscated:
                          </span>
                          <span className="text-zinc-300 font-mono font-semibold">
                            {getLastObfuscatedLabel()}
                          </span>
                        </div>
                      </div>

                      {user ? (
                        <button
                          type="button"
                          onClick={handleSignOut}
                          className="w-full py-2.5 px-4 rounded-xl border border-rose-500/15 hover:border-rose-500/30 hover:bg-rose-500/5 text-rose-450 hover:text-rose-400 text-xs font-bold uppercase tracking-wider transition duration-150 flex items-center justify-center gap-2"
                        >
                          <LogOut className="w-4 h-4" />
                          Sign out
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setAuthMode("login");
                            setAuthModalOpen(true);
                          }}
                          className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 shadow-lg"
                        >
                          <LogIn className="w-4 h-4" />
                          Connect to Cloud
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* ARCHIVES / COMPILATION RECORD HISTORIES COLUMN */}
                <div className="md:col-span-7 bg-white/[0.02] border border-white/10 p-6 rounded-3xl flex flex-col gap-4 backdrop-blur-2xl shadow-xl">
                  <div className="flex items-center justify-between pb-3 border-b border-white/[0.05]">
                    <div className="flex items-center gap-2">
                      <History className="w-4 h-4 text-indigo-400" />
                      <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-300 font-display">
                        Compilation History
                      </h2>
                    </div>
                    {user && (
                      <span className="text-[9px] px-2 py-0.5 rounded-lg bg-zinc-900 border border-white/5 font-mono text-zinc-500">
                        {historyList.length} items logged
                      </span>
                    )}
                  </div>

                  {!user ? (
                    <div className="flex flex-col items-center justify-center text-center p-8 space-y-4 my-auto">
                      <div className="p-4 rounded-full bg-white/[0.03] border border-white/5 text-zinc-500">
                        <Lock className="w-6 h-6 animate-pulse" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-zinc-300">
                          Authentication Required
                        </h4>
                        <p className="text-[10px] text-zinc-500 max-w-[240px] mt-1 leading-relaxed">
                          Sign in or register to persist your compilation logs
                          in our secure matrix files.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode("login");
                          setAuthModalOpen(true);
                        }}
                        className="py-2 px-4 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white text-[10px] font-bold uppercase tracking-wider border border-white/5 transition"
                      >
                        authenticate
                      </button>
                    </div>
                  ) : historyLoading ? (
                    <div className="flex flex-col items-center justify-center py-16 space-y-3">
                      <Loader2 className="w-6 h-6 animate-spin text-indigo-450" />
                      <span className="text-zinc-500 font-mono text-[10px]">
                        Retrieving logs from database...
                      </span>
                    </div>
                  ) : historyList.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center p-8 space-y-3 my-auto text-zinc-500">
                      <FileCode className="w-8 h-8 opacity-40 animate-pulse" />
                      <div>
                        <h4 className="text-xs font-bold text-zinc-350">
                          No compilation logs found
                        </h4>
                        <p className="text-[10px] text-zinc-500 max-w-[240px] mt-1 leading-relaxed animate-pulse">
                          Obfuscated outputs will appear inside this history
                          index dynamically.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4 overflow-y-auto max-h-[520px] pr-1.5 scrollbar-thin scrollbar-thumb-white/10 select-none">
                      {historyList.map((rec) => {
                        const isExpanded = !!expandedRecords[rec.id];
                        const sizeBefore = getByteCount(rec.original_code);
                        const sizeAfter = getByteCount(rec.obfuscated_code);

                        return (
                          <div
                            key={rec.id}
                            className={`p-4 rounded-2xl bg-white/[0.01] hover:bg-white/[0.02] border transition-all duration-300 flex flex-col gap-3 ${
                              isExpanded
                                ? "border-indigo-500/30"
                                : "border-white/5 hover:border-white/10"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-4">
                              <div
                                className="overflow-hidden space-y-1 flex-grow cursor-pointer"
                                onClick={() => toggleRecordExpand(rec.id)}
                              >
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-[9px] tracking-wider font-mono p-1 px-2.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-350 font-bold uppercase">
                                    {rec.preset}
                                  </span>
                                  <span className="text-[9px] text-zinc-550 font-mono">
                                    {new Date(
                                      rec.created_at,
                                    ).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}{" "}
                                    (
                                    {new Date(
                                      rec.created_at,
                                    ).toLocaleDateString()}
                                    )
                                  </span>
                                </div>
                                <div className="font-mono text-[10.5px] text-zinc-400 font-medium flex items-center gap-2">
                                  <span>Before:</span>
                                  <strong className="text-zinc-300">
                                    {formatSize(sizeBefore)}
                                  </strong>
                                  <span className="text-zinc-650">•</span>
                                  <span>After:</span>
                                  <strong className="text-emerald-400">
                                    {formatSize(sizeAfter)}
                                  </strong>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => toggleRecordExpand(rec.id)}
                                  className={`p-2 px-3 rounded-xl border font-semibold text-[9px] uppercase font-mono tracking-wider flex items-center gap-1 transition-all ${
                                    isExpanded
                                      ? "border-indigo-500/30 bg-indigo-500/20 text-indigo-350 hover:bg-indigo-500/35"
                                      : "border-white/5 bg-white/[0.02] text-zinc-400 hover:text-white hover:bg-white/[0.03]"
                                  }`}
                                >
                                  <Code2 className="w-3.5 h-3.5" />
                                  <span className="hidden sm:inline">
                                    {isExpanded ? "Hide" : "Inspect"}
                                  </span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleRestoreRecord(rec)}
                                  className="p-2 px-3 rounded-xl border border-white/5 bg-white/[0.03] text-zinc-400 hover:text-white hover:bg-indigo-600 hover:border-indigo-500/30 transition shadow-sm font-semibold text-[9px] uppercase font-mono tracking-wider flex items-center gap-1"
                                >
                                  <Play className="w-3 h-3 fill-current" />
                                  <span>Load</span>
                                </button>
                              </div>
                            </div>

                            {/* Expanded Comparative Code Previews */}
                            {isExpanded && (
                              <div className="border-t border-white/5 pt-3.5 mt-1 space-y-4 select-text">
                                {/* Expiry Info bar */}
                                <div className="flex items-center gap-2 text-[9px] font-mono justify-end bg-indigo-500/[0.02] p-2 rounded-xl border border-indigo-500/10">
                                  <Clock className="w-3 h-3 text-indigo-400 animate-pulse" />
                                  <span className="text-zinc-500 uppercase">
                                    Self-Purge Lock status:
                                  </span>
                                  <strong className="text-indigo-300 font-extrabold uppercase">
                                    {getDeletionStatus(rec.created_at)}
                                  </strong>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {/* Left Panel: Script Before */}
                                  <div className="flex flex-col space-y-1.5 min-w-0">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest font-mono">
                                        Original Source
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          navigator.clipboard.writeText(
                                            rec.original_code,
                                          );
                                          setCopied(rec.id + "_orig");
                                          setTimeout(
                                            () => setCopied(null),
                                            2000,
                                          );
                                        }}
                                        className="text-[10px] text-zinc-400 hover:text-white font-mono flex items-center gap-1 transition"
                                      >
                                        {copied === rec.id + "_orig" ? (
                                          <>
                                            <Check className="w-3 h-3 text-emerald-400" />
                                            <span className="text-emerald-400 font-bold">
                                              Copied!
                                            </span>
                                          </>
                                        ) : (
                                          <>
                                            <Copy className="w-3 h-3" />
                                            <span>Copy</span>
                                          </>
                                        )}
                                      </button>
                                    </div>
                                    <pre className="p-3.5 bg-zinc-950 rounded-2xl border border-white/5 font-mono text-[10px] text-zinc-400 max-h-[140px] overflow-auto whitespace-pre leading-relaxed scrollbar-thin scrollbar-thumb-white/5">
                                      <code>{rec.original_code}</code>
                                    </pre>
                                  </div>

                                  {/* Right Panel: Script After */}
                                  <div className="flex flex-col space-y-1.5 min-w-0">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest font-mono">
                                        Obfuscated Compiler Output
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          navigator.clipboard.writeText(
                                            rec.obfuscated_code,
                                          );
                                          setCopied(rec.id + "_obf");
                                          setTimeout(
                                            () => setCopied(null),
                                            2000,
                                          );
                                        }}
                                        className="text-[10px] text-zinc-400 hover:text-white font-mono flex items-center gap-1 transition"
                                      >
                                        {copied === rec.id + "_obf" ? (
                                          <>
                                            <Check className="w-3 h-3 text-emerald-400" />
                                            <span className="text-emerald-400 font-bold">
                                              Copied!
                                            </span>
                                          </>
                                        ) : (
                                          <>
                                            <Copy className="w-3 h-3" />
                                            <span>Copy</span>
                                          </>
                                        )}
                                      </button>
                                    </div>
                                    <pre className="p-3.5 bg-zinc-950 rounded-2xl border border-white/5 font-mono text-[10px] text-zinc-400 max-h-[140px] overflow-auto whitespace-pre leading-relaxed scrollbar-thin scrollbar-thumb-white/5">
                                      <code>{rec.obfuscated_code}</code>
                                    </pre>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>

      {/* USER AUTH MODAL OVERLAY */}
      <AnimatePresence>
        {authModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-zinc-950 border border-white/10 p-7 rounded-[26px] max-w-sm w-full relative shadow-[0_25px_60px_rgba(0,0,0,0.9)]"
            >
              <button
                type="button"
                onClick={() => {
                  setAuthModalOpen(false);
                  setAuthError(null);
                }}
                className="absolute top-5 right-5 text-zinc-550 hover:text-white transition"
              >
                <Trash2 className="w-4 h-4 rotate-45 transform" />
              </button>

              <div className="text-center space-y-1.5 pb-4 border-b border-white/5">
                <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/25 text-indigo-450 inline-block">
                  <Shield className="w-6 h-6 animate-pulse" />
                </div>
                <h3 className="text-base font-bold text-white uppercase tracking-wider font-display pt-1">
                  {authMode === "login"
                    ? "developer session"
                    : "register developer"}
                </h3>
                <p className="text-[10px] text-zinc-550 lowercase tracking-tight">
                  Sync records to global secure repository
                </p>
              </div>

              {/* Sliding / Clickable Tabs for Auth Mode */}
              <div className="flex bg-zinc-900/60 p-1 rounded-xl border border-white/5 mt-4 relative z-10 w-full select-none">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("login");
                    setAuthError(null);
                  }}
                  className={`flex-1 py-1.5 text-center text-[10px] font-mono uppercase tracking-wider font-bold rounded-lg transition-all duration-200 ${
                    authMode === "login"
                      ? "bg-indigo-500/15 text-indigo-450 border border-indigo-500/20 shadow-md font-extrabold"
                      : "text-zinc-500 hover:text-zinc-300 border border-transparent"
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("signup");
                    setAuthError(null);
                  }}
                  className={`flex-1 py-1.5 text-center text-[10px] font-mono uppercase tracking-wider font-bold rounded-lg transition-all duration-200 ${
                    authMode === "signup"
                      ? "bg-indigo-500/15 text-indigo-450 border border-indigo-500/20 shadow-md font-extrabold"
                      : "text-zinc-500 hover:text-zinc-300 border border-transparent"
                  }`}
                >
                  Sign Up
                </button>
              </div>

              <form
                onSubmit={handleAuthSubmit}
                className="space-y-4 pt-4 select-text"
              >
                {authError && (
                  <div className="p-3 bg-rose-955/20 border border-rose-500/25 text-rose-350 text-[10px] font-mono leading-relaxed rounded-xl flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 animate-bounce text-rose-450" />
                    <span>{authError}</span>
                  </div>
                )}

                {authSuccess && (
                  <div className="p-3 bg-emerald-955/20 border border-emerald-500/25 text-emerald-350 text-[10px] font-mono leading-relaxed rounded-xl flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-450" />
                    <span>{authSuccess}</span>
                  </div>
                )}

                <div className="space-y-1.5 select-text">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block font-mono">
                    Username
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3.5 w-4 h-4 text-zinc-600" />
                    <input
                      type="text"
                      value={authUsername}
                      onChange={(e) => setAuthUsername(e.target.value)}
                      placeholder="e.g., minray_coder"
                      required
                      className="w-full bg-zinc-900 border border-white/5 focus:border-indigo-500/40 text-zinc-200 placeholder-zinc-650 text-xs rounded-xl p-3 pl-10 outline-none transition"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 select-text">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block font-mono">
                    Passcode
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-zinc-600" />
                    <input
                      type="password"
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full bg-zinc-900 border border-white/5 focus:border-indigo-500/40 text-zinc-200 placeholder-zinc-650 text-xs rounded-xl p-3 pl-10 outline-none transition"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-widest transition duration-200 flex items-center justify-center gap-2 disabled:opacity-40 select-none shadow-md shadow-indigo-500/5 mt-2"
                >
                  {authLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                  ) : authMode === "login" ? (
                    "Authenticate Block"
                  ) : (
                    "Initialize Registration"
                  )}
                </button>

                {/* Switch Login/Signup Trigger */}
                <div className="text-center pt-3 select-none">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode(authMode === "login" ? "signup" : "login");
                      setAuthError(null);
                    }}
                    className="text-[10px] text-zinc-500 hover:text-indigo-400 font-mono font-bold uppercase transition"
                  >
                    {authMode === "login"
                      ? "Create new developer account"
                      : "I have developer passcode"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Dynamic Floating Rating Form Prompt pops up after 5 seconds of successful obfuscation */}
      <AnimatePresence>
        {showRatingPrompt && !hasRated && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 220 }}
            className="fixed bottom-6 right-6 z-50 w-80 sm:w-96 bg-zinc-950/95 border border-indigo-500/20 rounded-3xl p-5 shadow-[0_12px_40px_rgba(0,0,0,0.8),0_0_24px_rgba(99,102,241,0.15)] backdrop-blur-2xl space-y-4 text-left select-none"
          >
            <div className="flex items-start justify-between">
              <div className="flex gap-2.5 items-center">
                <div className="p-2 bg-indigo-500/10 border border-indigo-500/25 rounded-2xl text-indigo-400">
                  <Sparkles className="w-4 h-4 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                    Feedback Request
                  </h4>
                  <p className="text-[10px] text-zinc-400 mt-0.5 font-sans">
                    How was your obfuscation experience?
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRatingPrompt(false)}
                className="text-zinc-500 hover:text-white transition p-1 cursor-pointer hover:bg-white/5 rounded-lg"
              >
                <Trash2 className="w-3.5 h-3.5 rotate-45 transform" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                handleRatingSubmit(e);
                // Hide popup upon submission with short delay
                setTimeout(() => setShowRatingPrompt(false), 2000);
              }}
              className="space-y-3"
            >
              <div className="space-y-1">
                <label className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 font-mono">
                  Satisfaction Rating
                </label>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setUserRatingScore(star)}
                      className="text-xl transition duration-155 cursor-pointer transform hover:scale-110 active:scale-95 text-yellow-500"
                    >
                      {star <= userRatingScore ? "★" : "☆"}
                    </button>
                  ))}
                  <span className="text-[10px] font-mono text-zinc-500 ml-1 font-bold">
                    ({userRatingScore}/5)
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 font-mono">
                  Optional Comment
                </label>
                <textarea
                  value={ratingComment}
                  onChange={(e) => setRatingComment(e.target.value)}
                  placeholder="Tell us what you protected or suggest improvements..."
                  className="w-full h-16 bg-black border border-white/5 rounded-xl p-2.5 text-[11px] text-white placeholder-zinc-700 focus:border-indigo-500/30 focus:outline-none transition font-sans resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={ratingsLoading}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-505 text-white font-bold rounded-xl text-[10px] uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-1.5 font-mono"
              >
                {ratingsLoading ? (
                  <Loader2 className="w-3 animate-spin" />
                ) : (
                  <Sparkles className="w-3 h-3" />
                )}
                Submit Experience Review
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

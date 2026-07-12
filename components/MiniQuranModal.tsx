import React, { useState, useEffect, useRef } from 'react';
import { 
    X, Type, Plus, Minus, Download, Check, Highlighter, Eraser, Trash2, Eye, EyeOff, ChevronUp, ChevronDown, Palette
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { surahs } from '../constants';
import { normalizeText, formatPagesCountArabic } from '../utils/helpers';
import { 
    fetchQuranTextRange, 
    isFullQuranCached, 
    downloadFullQuranForOffline, 
    QuranSurahRange 
} from '../utils/quranTextManager';

interface MiniQuranModalProps {
    isOpen: boolean;
    onClose: () => void;
    fromSurahName: string;
    fromAyah: string | number;
    toSurahName: string;
    toAyah: string | number;
    pagesCount: number;
    highlights?: { [key: string]: { color: string; size: number } };
    onHighlightsChange?: (newHighlights: { [key: string]: { color: string; size: number } }) => void;
}

const FONT_OPTIONS = [
    { value: "'Amiri Quran', 'Amiri', serif", label: "خط مصحف المدينة (الأميري)" },
    { value: "'Scheherazade New', serif", label: "خط شهرزاد الجديد" },
    { value: "'Noto Naskh Arabic', sans-serif", label: "خط النسخ" },
    { value: "'Reem Kufi', sans-serif", label: "خط الكوفي" },
    { value: "'Tajawal', sans-serif", label: "خط النظام" }
];

export const MiniQuranModal: React.FC<MiniQuranModalProps> = ({
    isOpen,
    onClose,
    fromSurahName,
    fromAyah,
    toSurahName,
    toAyah,
    pagesCount,
    highlights = {},
    onHighlightsChange
}) => {
    const modalRef = useRef<HTMLDivElement>(null);
    const colorInputRef = useRef<HTMLInputElement>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [quranData, setQuranData] = useState<QuranSurahRange[]>([]);
    
    // Preferences loaded from localStorage
    const [fontFamily, setFontFamily] = useState<string>(() => {
        return localStorage.getItem('quran_font_family') || "'Amiri Quran', 'Amiri', serif";
    });
    const [fontSize, setFontSize] = useState<number>(() => {
        const saved = localStorage.getItem('quran_font_size');
        return saved ? parseInt(saved) : 18; // Default font size set to 18px as requested
    });

    const [isFontDropdownOpen, setIsFontDropdownOpen] = useState(false);

    // Offline / Caching State
    const [isOfflineReady, setIsOfflineReady] = useState<boolean>(false);
    const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
    const [downloadError, setDownloadError] = useState<string | null>(null);

    // Toast and Animation State
    const [toast, setToast] = useState<{ message: string; visible: boolean } | null>(null);
    const [particles, setParticles] = useState<{ id: number; x: number; y: number; color: string; size: number }[]>([]);

    // Theme Detection State
    const [isDarkTheme, setIsDarkTheme] = useState<boolean>(false);

    // Highlighter System State
    const [isHighlighterActive, setIsHighlighterActive] = useState<boolean>(false);
    const [activeTool, setActiveTool] = useState<'pen' | 'eraser'>('pen');
    const [highlightSize, setHighlightSize] = useState<number>(2); // Default to thin line (size 2)
    const [isVisualAlertActive, setIsVisualAlertActive] = useState<boolean>(false);
    const [showHighlights, setShowHighlights] = useState<boolean>(true);
    const [showHighlighterControls, setShowHighlighterControls] = useState<boolean>(true);
    const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);

    // Colors
    const defaultRed = 'rgba(239, 68, 68, 0.45)';
    const defaultYellow = 'rgba(234, 179, 8, 0.45)';
    
    const [selectedColor, setSelectedColor] = useState<string>(defaultRed);
    const [customColors, setCustomColors] = useState<string[]>(() => {
        const saved = localStorage.getItem('quran_custom_colors');
        return saved ? JSON.parse(saved) : [];
    });

    // Detect theme class on html element
    useEffect(() => {
        const checkTheme = () => {
            setIsDarkTheme(document.documentElement.classList.contains('dark'));
        };
        checkTheme();
        const observer = new MutationObserver(checkTheme);
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        return () => observer.disconnect();
    }, []);

    const adaptiveColor = isDarkTheme ? 'rgba(255, 255, 255, 0.45)' : 'rgba(0, 0, 0, 0.25)';
    const adaptiveColorName = isDarkTheme ? 'أبيض' : 'أسود';

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
                // Ignore clicks that occur on the color picker or portals
                if ((event.target as HTMLElement).closest('.color-picker-input')) return;
                onClose();
            }
        };

        if (isOpen) {
            document.body.style.overflow = 'hidden';
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.body.style.overflow = '';
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose]);

    // Check if offline is ready
    useEffect(() => {
        const checkOffline = async () => {
            const ready = await isFullQuranCached();
            setIsOfflineReady(ready);
        };
        checkOffline();
    }, [isOpen]);

    // Visual alert pulse effect when opened with existing highlights
    useEffect(() => {
        if (isOpen && Object.keys(highlights).length > 0) {
            setIsVisualAlertActive(true);
            const timer = setTimeout(() => {
                setIsVisualAlertActive(false);
            }, 800);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    // Load Quran text when modal opens or parameters change
    useEffect(() => {
        if (!isOpen) return;

        const loadQuranText = async () => {
            setLoading(true);
            setError(null);
            try {
                const startSurahNum = surahs.findIndex(s => normalizeText(s.name) === normalizeText(fromSurahName)) + 1;
                const endSurahNum = toSurahName 
                    ? (surahs.findIndex(s => normalizeText(s.name) === normalizeText(toSurahName)) + 1)
                    : startSurahNum;

                if (startSurahNum === 0) {
                    throw new Error(`لم نتمكن من تحديد السورة: ${fromSurahName}`);
                }

                const startSurahObj = surahs[startSurahNum - 1];
                const endSurahObj = surahs[endSurahNum - 1];

                let sAyah = 1;
                let eAyah = 1;

                const hasFromAyah = fromAyah !== undefined && fromAyah !== null && fromAyah.toString().trim() !== '';
                const hasToAyah = toAyah !== undefined && toAyah !== null && toAyah.toString().trim() !== '';

                if (startSurahNum === endSurahNum) {
                    if (!hasFromAyah && !hasToAyah) {
                        sAyah = 1;
                        eAyah = startSurahObj.verses;
                    } else if (!hasFromAyah && hasToAyah) {
                        sAyah = 1;
                        eAyah = parseInt(toAyah.toString()) || 1;
                    } else if (hasFromAyah && !hasToAyah) {
                        sAyah = parseInt(fromAyah.toString()) || 1;
                        eAyah = sAyah;
                    } else {
                        sAyah = parseInt(fromAyah.toString()) || 1;
                        eAyah = parseInt(toAyah.toString()) || sAyah;
                    }
                } else {
                    if (!hasFromAyah) {
                        sAyah = 1;
                    } else {
                        sAyah = parseInt(fromAyah.toString()) || 1;
                    }

                    if (!hasToAyah) {
                        eAyah = endSurahObj.verses;
                    } else {
                        eAyah = parseInt(toAyah.toString()) || 1;
                    }
                }

                const textData = await fetchQuranTextRange(startSurahNum, sAyah, endSurahNum, eAyah);
                setQuranData(textData);
            } catch (err: any) {
                console.error('Error loading Quran text range:', err);
                setError(err.message || 'حدث خطأ أثناء تحميل النص القرآني.');
            } finally {
                setLoading(false);
            }
        };

        loadQuranText();
    }, [isOpen, fromSurahName, fromAyah, toSurahName, toAyah]);

    // Save preferences
    const handleFontFamilyChange = (val: string) => {
        setFontFamily(val);
        localStorage.setItem('quran_font_family', val);
    };

    const handleIncreaseFontSize = () => {
        setFontSize(prev => {
            const newVal = Math.min(prev + 2, 48);
            localStorage.setItem('quran_font_size', newVal.toString());
            return newVal;
        });
    };

    const handleDecreaseFontSize = () => {
        setFontSize(prev => {
            const newVal = Math.max(prev - 2, 14);
            localStorage.setItem('quran_font_size', newVal.toString());
            return newVal;
        });
    };

    // Trigger local bubble burst confetti
    const triggerBubbleBurst = () => {
        const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];
        const list = Array.from({ length: 40 }).map((_, i) => {
            const angle = Math.random() * Math.PI * 2;
            const speed = 70 + Math.random() * 180;
            return {
                id: i,
                x: Math.cos(angle) * speed,
                y: Math.sin(angle) * speed - 40,
                color: colors[Math.floor(Math.random() * colors.length)],
                size: 5 + Math.random() * 7
            };
        });
        setParticles(list);
        setTimeout(() => {
            setParticles([]);
        }, 3000);
    };

    // Download for offline
    const handleDownloadOffline = async () => {
        setDownloadError(null);
        setDownloadProgress(0);
        try {
            const success = await downloadFullQuranForOffline((progress) => {
                setDownloadProgress(progress);
            });
            if (success) {
                setIsOfflineReady(true);
                // Trigger celebratory bubble burst
                triggerBubbleBurst();
                // Show dismissible Success Toast
                setToast({
                    message: "تم تحميل المصحف بنجاح، يمكنك الآن الاستخدام بالكامل بدون إنترنت",
                    visible: true
                });
                // Automatically dismiss after 5 seconds
                setTimeout(() => {
                    setToast(prev => prev ? { ...prev, visible: false } : null);
                }, 5000);
            }
        } catch (err: any) {
            setDownloadError(err.message || 'فشل تحميل المصحف للعمل بدون إنترنت.');
        } finally {
            setDownloadProgress(null);
        }
    };

    const handleAddCustomColor = (color: string) => {
        // Translate hex to 0.5 opacity rgba for beautiful highlighting
        let r = 239, g = 68, b = 68;
        if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(color)) {
            let hex = color.substring(1);
            if (hex.length === 3) {
                hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
            }
            const num = parseInt(hex, 16);
            r = (num >> 16) & 255;
            g = (num >> 8) & 255;
            b = num & 255;
        }
        const rgbaColor = `rgba(${r}, ${g}, ${b}, 0.45)`;

        if (!customColors.includes(rgbaColor)) {
            const updated = [...customColors, rgbaColor];
            setCustomColors(updated);
            localStorage.setItem('quran_custom_colors', JSON.stringify(updated));
        }
        setSelectedColor(rgbaColor);
    };

    const handleWordClick = (wordKey: string) => {
        if (!isHighlighterActive) return;

        const nextHighlights = { ...highlights };
        if (activeTool === 'eraser') {
            delete nextHighlights[wordKey];
        } else {
            nextHighlights[wordKey] = { color: selectedColor, size: highlightSize };
        }

        if (onHighlightsChange) {
            onHighlightsChange(nextHighlights);
        }
    };

    const handleClearAllHighlights = () => {
        if (onHighlightsChange) {
            onHighlightsChange({});
        }
        setShowClearConfirm(false);
    };

    if (!isOpen) return null;

    // Format human-friendly range
    const displayRange = () => {
        const startText = `سورة ${fromSurahName} (الآية ${fromAyah || 1})`;
        const endText = toSurahName && toAyah 
            ? `إلى سورة ${toSurahName} (الآية ${toAyah})` 
            : '';
        return `${startText} ${endText}`.trim();
    };

    const activeFontOption = FONT_OPTIONS.find(opt => opt.value === fontFamily) || FONT_OPTIONS[0];

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 md:p-4 animate-fade-in">
            {/* Confetti bubble burst animation */}
            <div className="absolute pointer-events-none z-[10005]">
                {particles.map(p => (
                    <motion.div
                        key={p.id}
                        className="absolute rounded-full pointer-events-none"
                        initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
                        animate={{ 
                            x: p.x, 
                            y: p.y, 
                            scale: [1, 1.4, 0], 
                            opacity: [1, 0.9, 0] 
                        }}
                        transition={{ duration: 1.8, ease: "easeOut" }}
                        style={{
                            width: p.size,
                            height: p.size,
                            backgroundColor: p.color,
                            boxShadow: `0 0 10px ${p.color}`
                        }}
                    />
                ))}
            </div>

            {/* Success Toast */}
            <AnimatePresence>
                {toast && toast.visible && (
                    <motion.div
                        initial={{ opacity: 0, y: -50, scale: 0.9 }}
                        animate={{ opacity: 1, y: 16, scale: 1 }}
                        exit={{ opacity: 0, y: -20, scale: 0.95 }}
                        className="fixed top-4 z-[10010] max-w-md w-full mx-auto px-4 py-3 bg-emerald-600 text-white rounded-xl shadow-2xl flex items-center justify-between gap-3 border border-emerald-500/30"
                        dir="rtl"
                    >
                        <div className="flex items-center gap-2">
                            <Check className="w-5 h-5 text-emerald-100 shrink-0" />
                            <p className="text-xs md:text-sm font-semibold">{toast.message}</p>
                        </div>
                        <button 
                            onClick={() => setToast(prev => prev ? { ...prev, visible: false } : null)}
                            className="p-1 text-emerald-100 hover:text-white rounded-md hover:bg-emerald-700/50 transition cursor-pointer"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            <div 
                ref={modalRef}
                className="w-full max-w-4xl h-[90vh] md:h-[85vh] bg-white dark:bg-gray-950 rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200 dark:border-gray-800 transition-all duration-300 relative"
                dir="rtl"
            >
                {/* Header Section - Never use white background in dark mode */}
                <div className="px-4 py-3 md:px-6 md:py-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0 relative">
                    <div>
                        <h3 className="text-base md:text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                            <span>عرض المصحف الكريم</span>
                            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-800 px-2.5 py-0.5 rounded-md">
                                {formatPagesCountArabic(pagesCount)}
                            </span>
                        </h3>
                        <p className="text-xs text-primary dark:text-accent font-medium mt-1">
                            {displayRange()}
                        </p>
                    </div>
                    
                    {/* Close button */}
                    <button 
                        onClick={onClose}
                        className="absolute top-3 left-4 p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Toolbar Section */}
                <div className="px-4 py-2.5 bg-gray-100/60 dark:bg-gray-900/60 border-b border-gray-200 dark:border-gray-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
                    <div className="flex items-center gap-3 flex-wrap">
                        {/* Custom Font Select Dropdown */}
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setIsFontDropdownOpen(!isFontDropdownOpen)}
                                className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 hover:border-primary dark:hover:border-accent flex items-center gap-2 cursor-pointer transition shadow-xs"
                            >
                                <Type className="w-3.5 h-3.5 text-gray-400" />
                                <span className="font-medium">{activeFontOption.label}</span>
                                <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform ${isFontDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>
                            
                            <AnimatePresence>
                                {isFontDropdownOpen && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={() => setIsFontDropdownOpen(false)} />
                                        <motion.div 
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: 10 }}
                                            className="absolute right-0 mt-1.5 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl py-1 z-50 text-right overflow-hidden"
                                        >
                                            {FONT_OPTIONS.map(opt => (
                                                <button
                                                    key={opt.value}
                                                    type="button"
                                                    onClick={() => {
                                                        handleFontFamilyChange(opt.value);
                                                        setIsFontDropdownOpen(false);
                                                    }}
                                                    className={`w-full text-right px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-between ${
                                                        fontFamily === opt.value 
                                                            ? 'text-primary dark:text-accent font-bold bg-primary-light/10 dark:bg-accent/10' 
                                                            : 'text-gray-700 dark:text-gray-300'
                                                    }`}
                                                >
                                                    <span>{opt.label}</span>
                                                    {fontFamily === opt.value && <Check className="w-3 h-3 text-primary dark:text-accent" />}
                                                </button>
                                            ))}
                                        </motion.div>
                                    </>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Font Size Selector */}
                        <div className="flex items-center gap-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-0.5 shadow-xs">
                            <button 
                                onClick={handleDecreaseFontSize}
                                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-600 dark:text-gray-300 transition cursor-pointer"
                                title="تصغير الخط"
                            >
                                <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="text-xs px-2 font-mono text-gray-700 dark:text-gray-300 font-bold select-none">
                                {fontSize}
                            </span>
                            <button 
                                onClick={handleIncreaseFontSize}
                                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-600 dark:text-gray-300 transition cursor-pointer"
                                title="تكبير الخط"
                            >
                                <Plus className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        {/* Highlighter Master Switch */}
                        <button
                            type="button"
                            onClick={() => {
                                setIsHighlighterActive(!isHighlighterActive);
                                if (!isHighlighterActive) {
                                    setShowHighlighterControls(true);
                                }
                            }}
                            className={`text-xs px-2.5 py-1.5 rounded-lg border flex items-center gap-1.5 transition duration-200 cursor-pointer shadow-xs font-semibold ${
                                isHighlighterActive 
                                    ? 'bg-primary border-primary text-white shadow-md ring-2 ring-primary/20 ring-offset-1 dark:ring-offset-gray-900' 
                                    : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-accent'
                            }`}
                            title="وضع التلوين وتحديد أخطاء التسميع"
                        >
                            <Highlighter className={`w-3.5 h-3.5 ${isHighlighterActive ? 'animate-pulse' : ''}`} />
                            <span>قلم التصحيح</span>
                            {isHighlighterActive && (
                                <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping shrink-0" />
                            )}
                        </button>

                        {/* Toggle Highlights Visibility */}
                        {Object.keys(highlights).length > 0 && (
                            <button
                                type="button"
                                onClick={() => {
                                    const nextShow = !showHighlights;
                                    setShowHighlights(nextShow);
                                    if (nextShow) {
                                        setIsVisualAlertActive(true);
                                        setTimeout(() => {
                                            setIsVisualAlertActive(false);
                                        }, 800);
                                    }
                                }}
                                className={`p-1.5 rounded-lg border bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:text-primary transition cursor-pointer shadow-xs`}
                                title={showHighlights ? "إخفاء التلوينات بالكامل" : "إظهار التلوينات"}
                            >
                                {showHighlights ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4 text-red-500" />}
                            </button>
                        )}
                    </div>

                    {/* Offline Download block - hidden when offline is ready or toast is completed */}
                    {(!isOfflineReady || (toast && toast.visible)) && (
                        <div className="flex items-center">
                            {downloadProgress !== null ? (
                                <div className="flex items-center gap-2">
                                    <div className="w-24 md:w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                                        <div 
                                            className="bg-primary h-full rounded-full transition-all duration-300 animate-pulse"
                                            style={{ width: `${downloadProgress}%` }}
                                        ></div>
                                    </div>
                                    <span className="text-[10px] font-bold text-primary dark:text-accent font-mono">
                                        {downloadProgress}%
                                    </span>
                                </div>
                            ) : !isOfflineReady && (
                                <button
                                    onClick={handleDownloadOffline}
                                    className="text-[10px] md:text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition shadow-xs cursor-pointer hover:shadow-md hover:scale-[1.01]"
                                >
                                    <Download className="w-3.5 h-3.5" />
                                    <span>تحميل للعمل بدون إنترنت</span>
                                </button>
                            )}
                            {downloadError && (
                                <span className="text-[10px] text-red-500 mr-2">{downloadError}</span>
                            )}
                        </div>
                    )}
                </div>

                {/* Highlighter Controls Drawer */}
                <AnimatePresence>
                    {isHighlighterActive && showHighlighterControls && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="bg-amber-50/50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 overflow-hidden shrink-0"
                        >
                            <div className="p-3 md:px-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex items-center gap-4 flex-wrap">
                                    {/* Pen vs Eraser */}
                                    <div className="flex items-center bg-gray-100 dark:bg-gray-800 p-0.5 rounded-lg border border-gray-200 dark:border-gray-700">
                                        <button
                                            type="button"
                                            onClick={() => setActiveTool('pen')}
                                            className={`px-3 py-1 rounded-md text-xs font-bold flex items-center gap-1 cursor-pointer transition ${
                                                activeTool === 'pen'
                                                    ? 'bg-white dark:bg-gray-700 text-primary dark:text-accent shadow-xs'
                                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                                            }`}
                                        >
                                            <Palette className="w-3 h-3" />
                                            <span>القلم</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setActiveTool('eraser')}
                                            className={`px-3 py-1 rounded-md text-xs font-bold flex items-center gap-1 cursor-pointer transition ${
                                                activeTool === 'eraser'
                                                    ? 'bg-white dark:bg-gray-700 text-red-500 shadow-xs'
                                                    : 'text-gray-500 dark:text-gray-400 hover:text-red-500'
                                            }`}
                                        >
                                            <Eraser className="w-3 h-3" />
                                            <span>الممحاة</span>
                                        </button>
                                    </div>

                                    {/* Color Picker palette */}
                                    {activeTool === 'pen' && (
                                        <div className="flex items-center gap-2">
                                            <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400">اللون:</span>
                                            
                                            {/* Red */}
                                            <button
                                                type="button"
                                                onClick={() => setSelectedColor(defaultRed)}
                                                className={`w-6 h-6 rounded-full bg-red-400 dark:bg-red-500 border transition cursor-pointer flex items-center justify-center ${
                                                    selectedColor === defaultRed ? 'ring-2 ring-primary ring-offset-1 dark:ring-offset-gray-900 scale-110 border-white' : 'border-transparent'
                                                }`}
                                            >
                                                {selectedColor === defaultRed && <Check className="w-3 h-3 text-white" />}
                                            </button>

                                            {/* Yellow */}
                                            <button
                                                type="button"
                                                onClick={() => setSelectedColor(defaultYellow)}
                                                className={`w-6 h-6 rounded-full bg-yellow-300 dark:bg-yellow-400 border transition cursor-pointer flex items-center justify-center ${
                                                    selectedColor === defaultYellow ? 'ring-2 ring-primary ring-offset-1 dark:ring-offset-gray-900 scale-110 border-white' : 'border-transparent'
                                                }`}
                                            >
                                                {selectedColor === defaultYellow && <Check className="w-3 h-3 text-gray-800" />}
                                            </button>

                                            {/* Black / White adaptive */}
                                            <button
                                                type="button"
                                                onClick={() => setSelectedColor(adaptiveColor)}
                                                className={`w-6 h-6 rounded-full border transition cursor-pointer flex items-center justify-center bg-gray-950 dark:bg-white ${
                                                    selectedColor === adaptiveColor ? 'ring-2 ring-primary ring-offset-1 dark:ring-offset-gray-900 scale-110 border-white' : 'border-gray-300 dark:border-gray-600'
                                                }`}
                                                title={adaptiveColorName}
                                            >
                                                {selectedColor === adaptiveColor && (
                                                    <Check className={`w-3 h-3 ${isDarkTheme ? 'text-gray-950' : 'text-white'}`} />
                                                )}
                                            </button>

                                            {/* Custom Saved Colors */}
                                            {customColors.map((color, index) => (
                                                <button
                                                    key={index}
                                                    type="button"
                                                    onClick={() => setSelectedColor(color)}
                                                    className={`w-6 h-6 rounded-full border transition cursor-pointer flex items-center justify-center ${
                                                        selectedColor === color ? 'ring-2 ring-primary ring-offset-1 dark:ring-offset-gray-900 scale-110 border-white' : 'border-gray-200'
                                                    }`}
                                                    style={{ backgroundColor: color }}
                                                >
                                                    {selectedColor === color && <Check className="w-3 h-3 text-white drop-shadow-md" />}
                                                </button>
                                            ))}

                                            {/* Add Custom Color Button */}
                                            <button
                                                type="button"
                                                onClick={() => colorInputRef.current?.click()}
                                                className="w-6 h-6 rounded-full border-2 border-dashed border-gray-400 dark:border-gray-500 hover:border-primary text-gray-500 dark:text-gray-400 flex items-center justify-center hover:scale-105 transition cursor-pointer"
                                                title="إضافة لون مخصص"
                                            >
                                                <Plus className="w-3 h-3" />
                                            </button>
                                            <input 
                                                type="color" 
                                                ref={colorInputRef}
                                                onChange={(e) => handleAddCustomColor(e.target.value)}
                                                className="hidden color-picker-input" 
                                            />
                                        </div>
                                    )}

                                    {/* Thickness slider removed. Defaulting to thin (size 2) automatically */}
                                </div>

                                {/* Trash / Erase All with inline Confirm (Shown only when Eraser tool is active) */}
                                <div className="flex items-center gap-2 shrink-0">
                                    {activeTool === 'eraser' && (
                                        showClearConfirm ? (
                                            <div className="flex items-center gap-1.5 animate-fade-in bg-red-50 dark:bg-red-950/20 p-1 rounded-lg border border-red-200 dark:border-red-900/40">
                                                <span className="text-[10px] font-semibold text-red-600 dark:text-red-400">متأكد من مسح الكل؟</span>
                                                <button
                                                    type="button"
                                                    onClick={handleClearAllHighlights}
                                                    className="px-2 py-0.5 bg-red-600 hover:bg-red-500 text-white rounded text-[10px] font-bold cursor-pointer"
                                                >
                                                    نعم
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setShowClearConfirm(false)}
                                                    className="px-2 py-0.5 bg-gray-200 dark:bg-gray-850 hover:bg-gray-300 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 rounded text-[10px] font-bold cursor-pointer"
                                                >
                                                    تراجع
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => setShowClearConfirm(true)}
                                                className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                                                title="حذف جميع علامات التلوين"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                                <span>حذف كل العلامات</span>
                                            </button>
                                        )
                                    )}

                                    {/* Hide controls toolbar button */}
                                    <button
                                        type="button"
                                        onClick={() => setShowHighlighterControls(false)}
                                        className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-850 rounded-lg transition cursor-pointer"
                                        title="إخفاء شريط أدوات التلوين"
                                    >
                                        <ChevronUp className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Retracted Highlighter Controls Trigger Button */}
                {isHighlighterActive && !showHighlighterControls && (
                    <div className="flex justify-center shrink-0">
                        <button
                            type="button"
                            onClick={() => setShowHighlighterControls(true)}
                            className="bg-amber-100 hover:bg-amber-200 dark:bg-gray-800 dark:hover:bg-gray-750 text-amber-800 dark:text-amber-300 px-4 py-1 rounded-b-xl text-xs font-bold flex items-center gap-1 shadow-sm border-x border-b border-gray-200 dark:border-gray-700 cursor-pointer animate-bounce-subtle"
                        >
                            <span>عرض خيارات قلم التلوين</span>
                            <ChevronDown className="w-3 h-3" />
                        </button>
                    </div>
                )}

                {/* Body Content / Quran text area */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-amber-50/20 dark:bg-gray-950 transition-colors duration-300">
                    {loading ? (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-3">
                            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">جاري تحميل الآيات المباركة...</p>
                        </div>
                    ) : error ? (
                        <div className="w-full h-full flex flex-col items-center justify-center text-center p-4">
                            <p className="text-red-500 font-bold mb-2">فشل تحميل الآيات</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md">{error}</p>
                            <button 
                                onClick={() => window.location.reload()}
                                className="mt-4 px-4 py-2 bg-primary text-white text-xs font-bold rounded-lg cursor-pointer"
                            >
                                إعادة المحاولة
                            </button>
                        </div>
                    ) : quranData.length === 0 ? (
                        <div className="w-full h-full flex items-center justify-center text-gray-500 dark:text-gray-400 text-sm">
                            الرجاء تحديد سورة وآية للبدء في عرض المصحف.
                        </div>
                    ) : (
                        <div className="max-w-3xl mx-auto space-y-8 select-text">
                            {quranData.map((surah) => (
                                <div key={surah.number} className="space-y-4">
                                    {/* Beautiful Surah Header Banner */}
                                    <div className="relative py-3 flex items-center justify-center">
                                        <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                            <div className="w-full border-t border-dashed border-amber-300/60 dark:border-amber-700/40"></div>
                                        </div>
                                        <div className="relative px-6 py-1.5 bg-amber-50/95 dark:bg-gray-900 border-2 border-amber-300 dark:border-amber-700/60 text-amber-800 dark:text-amber-300 font-bold text-sm md:text-base rounded-full shadow-xs flex items-center gap-2">
                                            <span>{surah.name}</span>
                                        </div>
                                    </div>

                                    {/* Basmalah block */}
                                    {surah.number !== 9 && (
                                        <div 
                                            className="text-center text-gray-800 dark:text-gray-100 py-3 leading-relaxed select-none"
                                            style={{ 
                                                fontFamily: fontFamily, 
                                                fontSize: `${fontSize * 1.1}px`
                                            }}
                                        >
                                            بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                                        </div>
                                    )}

                                    {/* Verses flow with absolute position independent word-level highlighting */}
                                    <div 
                                        className="text-gray-800 dark:text-gray-100 leading-[2.4] tracking-wide select-text"
                                        style={{ 
                                            fontFamily: fontFamily, 
                                            fontSize: `${fontSize}px`,
                                            direction: 'rtl',
                                            textAlign: 'justify',
                                            textJustify: 'inter-word'
                                        }}
                                    >
                                        {surah.ayahs.map((ayah) => {
                                            let text = ayah.text;
                                            const basmalahPrefix1 = "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ";
                                            const basmalahPrefix2 = "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ";
                                            if (ayah.numberInSurah === 1) {
                                                if (text.startsWith(basmalahPrefix1)) {
                                                    text = text.slice(basmalahPrefix1.length).trim();
                                                } else if (text.startsWith(basmalahPrefix2)) {
                                                    text = text.slice(basmalahPrefix2.length).trim();
                                                }
                                            }

                                            // Split text by space to obtain single words
                                            const words = text.split(/\s+/);

                                            return (
                                                <span key={ayah.numberInSurah} className="inline px-0.5 rounded transition duration-200">
                                                    {words.map((word, wIdx) => {
                                                        const wordKey = `${surah.number}_${ayah.numberInSurah}_${wIdx}`;
                                                        const isHighlighted = showHighlights && highlights[wordKey];
                                                        const highlightInfo = isHighlighted ? highlights[wordKey] : null;
                                                        
                                                        let wordStyle: React.CSSProperties = {};
                                                        if (highlightInfo) {
                                                            const { color } = highlightInfo;
                                                            // Pulse highlight size to level 3 (background style) during visual alert pulse
                                                            const size = isVisualAlertActive ? 3 : highlightInfo.size;
                                                            
                                                            if (size <= 2) {
                                                                // Underline mode for thin highlighting
                                                                wordStyle = {
                                                                    borderBottom: `${size * 2}px solid ${color}`,
                                                                    paddingBottom: '2px'
                                                                };
                                                            } else {
                                                                // Background highlight mode for medium/large markers
                                                                const paddingVal = size === 3 ? '1px' : size === 4 ? '3px' : '5px';
                                                                wordStyle = {
                                                                    backgroundColor: color,
                                                                    paddingTop: paddingVal,
                                                                    paddingBottom: paddingVal,
                                                                    paddingLeft: '4px',
                                                                    paddingRight: '4px',
                                                                    borderRadius: '4px'
                                                                };
                                                            }
                                                        }

                                                        return (
                                                            <span
                                                                key={wIdx}
                                                                onClick={() => handleWordClick(wordKey)}
                                                                className={`inline-block ml-1 transition-all duration-200 ${
                                                                    isHighlighterActive 
                                                                        ? 'cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900/30 px-0.5 rounded scale-[1.01]' 
                                                                        : ''
                                                                }`}
                                                                style={wordStyle}
                                                            >
                                                                {word}
                                                            </span>
                                                        );
                                                    })}
                                                    
                                                    {/* Ayah End Symbol */}
                                                    <span className="text-primary dark:text-accent font-sans mx-1.5 select-none font-bold text-sm whitespace-nowrap inline-block align-middle">
                                                        ﴿{ayah.numberInSurah}﴾
                                                    </span>
                                                </span>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

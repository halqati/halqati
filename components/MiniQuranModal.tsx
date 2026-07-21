import React, { useState, useEffect, useRef } from 'react';
import { 
    X, Type, Plus, Minus, Download, Check, Highlighter, Eraser, Trash2, Eye, EyeOff, ChevronUp, ChevronDown, Palette,
    ChevronRight, ChevronLeft, BookOpen, Book
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
    studentName?: string;
    recitationType?: string;
}

const FONT_OPTIONS = [
    { value: "kfgqpc", label: "خطوط مجمع الملك فهد (رموز الصفحات)" },
    { value: "'Amiri Quran Cached', 'Amiri Quran', 'Amiri', serif", label: "خط مصحف المدينة (الأميري)" },
    { value: "'Scheherazade New Cached', 'Scheherazade New', serif", label: "خط شهرزاد الجديد" },
    { value: "'Noto Naskh Arabic Cached', 'Noto Naskh Arabic', sans-serif", label: "خط النسخ" },
    { value: "'Reem Kufi Cached', 'Reem Kufi', sans-serif", label: "خط الكوفي" },
    { value: "'Tajawal Cached', 'Tajawal', sans-serif", label: "خط النظام" }
];

export function getJuzNameArabic(juzNum: number): string {
    const names = [
        "", "الجزء الأول", "الجزء الثاني", "الجزء الثالث", "الجزء الرابع", "الجزء الخامس",
        "الجزء السادس", "الجزء السابع", "الجزء الثامن", "الجزء التاسع", "الجزء العاشر",
        "الجزء الحادي عشر", "الجزء الثاني عشر", "الجزء الثالث عشر", "الجزء الرابع عشر", "الجزء الخامس عشر",
        "الجزء السادس عشر", "الجزء السابع عشر", "الجزء الثامن عشر", "الجزء التاسع عشر", "الجزء العشرون",
        "الجزء الحادي والعشرون", "الجزء الثاني والعشرون", "الجزء الثالث والعشرون", "الجزء الرابع والعشرون", "الجزء الخامس والعشرون",
        "الجزء السادس والعشرون", "الجزء السابع والعشرون", "الجزء الثامن والعشرون", "الجزء التاسع والعشرون", "الجزء الثلاثون"
    ];
    return names[juzNum] || `الجزء ${juzNum}`;
}

const cacheSingleFont = async (name: string, url: string) => {
    try {
        if (localStorage.getItem(`quran_font_base64_${name}`)) {
            return; // Already cached!
        }
        const cssResponse = await fetch(url);
        const cssText = await cssResponse.text();
        const fontUrlMatch = cssText.match(/url\((https:\/\/[^)]+)\)/);
        if (!fontUrlMatch) return;
        
        const fontUrl = fontUrlMatch[1];
        const fontResponse = await fetch(fontUrl);
        const fontBlob = await fontResponse.blob();
        
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64data = reader.result as string;
            localStorage.setItem(`quran_font_base64_${name}`, base64data);
            
            const styleId = 'injected-quran-fonts-style';
            let styleEl = document.getElementById(styleId) as HTMLStyleElement;
            if (styleEl) {
                styleEl.innerHTML += `
@font-face {
  font-family: '${name} Cached';
  src: url(${base64data}) format('truetype');
  font-weight: normal;
  font-style: normal;
  font-display: swap;
}
`;
            }
        };
        reader.readAsDataURL(fontBlob);
    } catch (err) {
        console.error('Failed to cache font:', name, err);
    }
};

const cacheAllFonts = async () => {
    const fontsToCache = [
        { name: 'Amiri Quran', url: 'https://fonts.googleapis.com/css2?family=Amiri+Quran&display=swap' },
        { name: 'Scheherazade New', url: 'https://fonts.googleapis.com/css2?family=Scheherazade+New&display=swap' },
        { name: 'Noto Naskh Arabic', url: 'https://fonts.googleapis.com/css2?family=Noto+Naskh+Arabic&display=swap' },
        { name: 'Reem Kufi', url: 'https://fonts.googleapis.com/css2?family=Reem+Kufi&display=swap' },
        { name: 'Tajawal', url: 'https://fonts.googleapis.com/css2?family=Tajawal&display=swap' }
    ];
    for (const font of fontsToCache) {
        await cacheSingleFont(font.name, font.url);
    }
};

export const MiniQuranModal: React.FC<MiniQuranModalProps> = ({
    isOpen,
    onClose,
    fromSurahName,
    fromAyah,
    toSurahName,
    toAyah,
    pagesCount,
    highlights = {},
    onHighlightsChange,
    studentName,
    recitationType
}) => {
    const modalRef = useRef<HTMLDivElement>(null);
    const colorInputRef = useRef<HTMLInputElement>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [quranData, setQuranData] = useState<QuranSurahRange[]>([]);
    
    // Preferences loaded from localStorage
    const [fontFamily, setFontFamily] = useState<string>("kfgqpc");
    const [fontSize, setFontSize] = useState<number>(18);

    const [isFontDropdownOpen, setIsFontDropdownOpen] = useState(false);

    // Page View Mode States
    const [isPageMode, setIsPageMode] = useState<boolean>(true);
    const [activePageIndex, setActivePageIndex] = useState<number>(0);
    const touchStartX = useRef<number | null>(null);

    // KFGQPC V2 Page data and loading states
    const [pagesV2Data, setPagesV2Data] = useState<{ [key: number]: any }>({});
    const [loadingV2, setLoadingV2] = useState<boolean>(false);

    // Dynamic style injection for offline Cached fonts on mount
    useEffect(() => {
        const styleId = 'injected-quran-fonts-style';
        let styleEl = document.getElementById(styleId) as HTMLStyleElement;
        if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = styleId;
            document.head.appendChild(styleEl);
        }

        let cssContent = '';
        const fontNames = ['Amiri Quran', 'Scheherazade New', 'Noto Naskh Arabic', 'Reem Kufi', 'Tajawal'];
        fontNames.forEach(name => {
            const cached = localStorage.getItem(`quran_font_base64_${name}`);
            if (cached) {
                cssContent += `
@font-face {
  font-family: '${name} Cached';
  src: url(${cached}) format('truetype');
  font-weight: normal;
  font-style: normal;
  font-display: swap;
}
`;
            }
        });
        styleEl.innerHTML = cssContent;

        // Perform background pre-caching of all fonts 1.5 seconds after loading
        const timer = setTimeout(() => {
            if (navigator.onLine) {
                cacheAllFonts();
            }
        }, 1500);

        return () => clearTimeout(timer);
    }, []);

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

    interface PageData {
        pageNumber: number;
        surahNames: string[];
        juzNumbers: number[];
        ayahs: {
            surahNumber: number;
            surahName: string;
            ayah: any;
        }[];
    }

    // Grouping Quran text by page numbers for Page Mode
    const pagesList = React.useMemo<PageData[]>(() => {
        const pagesMap: { [key: number]: PageData } = {};
        
        quranData.forEach(surah => {
            surah.ayahs.forEach(ayah => {
                const pNum = ayah.page;
                if (!pagesMap[pNum]) {
                    pagesMap[pNum] = {
                        pageNumber: pNum,
                        surahNames: [],
                        juzNumbers: [],
                        ayahs: []
                    };
                }
                if (!pagesMap[pNum].surahNames.includes(surah.name)) {
                    pagesMap[pNum].surahNames.push(surah.name);
                }
                if (ayah.juz && !pagesMap[pNum].juzNumbers.includes(ayah.juz)) {
                    pagesMap[pNum].juzNumbers.push(ayah.juz);
                }
                pagesMap[pNum].ayahs.push({
                    surahNumber: surah.number,
                    surahName: surah.name,
                    ayah: ayah
                });
            });
        });
        
        return Object.keys(pagesMap)
            .map(Number)
            .sort((a, b) => a - b)
            .map(pNum => pagesMap[pNum]);
    }, [quranData]);

    // Load V2 glyph/word data from Quran.com API with local cache
    const loadV2Pages = async (pNums: number[]) => {
        setLoadingV2(true);
        const updatedData = { ...pagesV2Data };
        let changed = false;

        await Promise.all(pNums.map(async (pNum) => {
            if (updatedData[pNum]) return; // Already loaded!

            // Check local cache
            const cached = localStorage.getItem(`quran_page_v2_data_${pNum}`);
            if (cached) {
                try {
                    updatedData[pNum] = JSON.parse(cached);
                    changed = true;
                    return;
                } catch (e) {
                    console.error("Failed to parse cached page data for page", pNum, e);
                }
            }

            // Fetch from API if online
            if (navigator.onLine) {
                try {
                    const res = await fetch(`https://api.quran.com/api/v4/verses/by_page/${pNum}?words=true&word_fields=code_v2`);
                    if (res.ok) {
                        const json = await res.json();
                        if (json && json.verses) {
                            localStorage.setItem(`quran_page_v2_data_${pNum}`, JSON.stringify(json.verses));
                            updatedData[pNum] = json.verses;
                            changed = true;
                        }
                    }
                } catch (err) {
                    console.error(`Failed to fetch V2 page data for page ${pNum}:`, err);
                }
            }
        }));

        if (changed) {
            setPagesV2Data(updatedData);
        }
        setLoadingV2(false);
    };

    // Load V2 glyph data and inject fonts for active pages
    useEffect(() => {
        if (!isOpen || pagesList.length === 0 || fontFamily !== 'kfgqpc') return;

        const pagesToFetch: number[] = [];
        if (isPageMode) {
            const currentP = pagesList[activePageIndex]?.pageNumber;
            if (currentP) {
                pagesToFetch.push(currentP);
                const prevP = pagesList[activePageIndex - 1]?.pageNumber;
                const nextP = pagesList[activePageIndex + 1]?.pageNumber;
                if (prevP) pagesToFetch.push(prevP);
                if (nextP) pagesToFetch.push(nextP);
            }
        } else {
            pagesList.forEach(p => {
                pagesToFetch.push(p.pageNumber);
            });
        }

        if (pagesToFetch.length > 0) {
            loadV2Pages(pagesToFetch);
        }

        // Dynamically inject @font-face style tags for the page fonts
        pagesToFetch.forEach(pNum => {
            const fontName = `quran-p${pNum}`;
            const styleId = `font-face-${fontName}`;
            if (!document.getElementById(styleId)) {
                const style = document.createElement('style');
                style.id = styleId;
                style.innerHTML = `
                    @font-face {
                        font-family: '${fontName}';
                        src: url('https://audio.qurancdn.com/fonts/quran/hafs/v2/woff2/p${pNum}.woff2') format('woff2');
                        font-weight: normal;
                        font-style: normal;
                        font-display: block;
                    }
                `;
                document.head.appendChild(style);
            }
        });
    }, [isOpen, isPageMode, activePageIndex, pagesList, fontFamily]);

    // Check if any word is the end of the last verse of a surah
    const isLastLineOfSurah = (lineWords: any[]) => {
        if (!lineWords || lineWords.length === 0) return false;
        const lastWord = lineWords[lineWords.length - 1];
        const surahId = lastWord.surah_id;
        const surahObj = surahs[surahId - 1];
        if (!surahObj) return false;
        
        return lineWords.some(w => {
            return w.verse_number === surahObj.verses && w.char_type_name === 'end';
        });
    };

    // Get Surah Header or Bismillah if empty lines precede the first verse
    const getSpecialLineItem = (pNum: number, lineNum: number) => {
        if (!pagesV2Data[pNum]) return null;
        const verses = pagesV2Data[pNum];
        
        for (const verse of verses) {
            if (verse.verse_number === 1) {
                const firstWord = verse.words[0];
                if (!firstWord) continue;
                const firstVerseLine = firstWord.line_number;
                const surahId = parseInt(verse.verse_key.split(':')[0]);
                const surahName = surahs[surahId - 1]?.name || `السورة ${surahId}`;
                
                if (surahId === 9) {
                    if (lineNum === firstVerseLine - 1) {
                        return { type: 'header', surahName, surahId };
                    }
                } else if (surahId === 1) {
                    if (lineNum === firstVerseLine - 1) {
                        return { type: 'header', surahName, surahId };
                    }
                } else {
                    if (lineNum === firstVerseLine - 2) {
                        return { type: 'header', surahName, surahId };
                    }
                    if (lineNum === firstVerseLine - 1) {
                        return { type: 'bismillah', surahId };
                    }
                }
            }
        }
        return null;
    };

    // Fallback UI while V2 page data loads
    const renderFallbackPage = (pageNumber: number) => {
        return (
            <div className="w-full text-center py-16">
                <div className="w-8 h-8 border-3 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-3 animate-duration-1000"></div>
                <p className="text-xs text-amber-800/60 dark:text-amber-400/60 font-semibold animate-pulse">جاري جلب صفحات المصحف الشريف...</p>
            </div>
        );
    };

    // Render KFGQPC Medina aligned page layout
    const renderMedinaPage = (pageNumber: number) => {
        const pageVerses = pagesV2Data[pageNumber];
        if (!pageVerses || pageVerses.length === 0) {
            return renderFallbackPage(pageNumber);
        }

        const allWords: any[] = [];
        pageVerses.forEach((verse: any) => {
            const surahId = parseInt(verse.verse_key.split(':')[0]);
            const verseNum = verse.verse_number;
            verse.words.forEach((word: any) => {
                allWords.push({
                    ...word,
                    surah_id: surahId,
                    verse_number: verseNum,
                    verse_key: verse.verse_key
                });
            });
        });

        const linesMap: { [key: number]: any[] } = {};
        allWords.forEach(word => {
            const lNum = word.line_number;
            if (!linesMap[lNum]) linesMap[lNum] = [];
            linesMap[lNum].push(word);
        });

        const renderedLines = [];
        for (let lineNum = 1; lineNum <= 15; lineNum++) {
            const lineWords = linesMap[lineNum] || [];
            const specialItem = getSpecialLineItem(pageNumber, lineNum);

            if (specialItem) {
                if (specialItem.type === 'header') {
                    renderedLines.push(
                        <div key={`special_header_${lineNum}`} className="my-1 md:my-1.5 select-none w-full flex justify-center">
                            <div className="relative py-1 flex items-center justify-center w-full max-w-md">
                                <div className="absolute inset-0 bg-gradient-to-r from-amber-500/0 via-amber-500/10 to-amber-500/0 rounded-lg" />
                                <div className="absolute inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-amber-500/30 to-transparent top-0" />
                                <div className="absolute inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-amber-500/30 to-transparent bottom-0" />
                                
                                <div className="relative px-6 py-0.5 border border-amber-600/25 bg-[#FDFBF7] dark:bg-gray-800 text-amber-900 dark:text-amber-400 font-extrabold text-[10px] md:text-xs rounded-md shadow-xs flex items-center gap-1.5">
                                    <span className="text-amber-600/60 font-serif">◈</span>
                                    <span className="font-serif text-amber-950 dark:text-amber-200">سُورَة {specialItem.surahName}</span>
                                    <span className="text-amber-600/60 font-serif">◈</span>
                                </div>
                            </div>
                        </div>
                    );
                } else if (specialItem.type === 'bismillah') {
                    renderedLines.push(
                        <div 
                            key={`special_bismillah_${lineNum}`} 
                            className="text-center text-amber-900/90 dark:text-amber-400/90 py-1 select-none text-[13px] md:text-sm font-serif tracking-wide w-full"
                        >
                            بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
                        </div>
                    );
                }
            } else if (lineWords.length > 0) {
                const isLastLine = isLastLineOfSurah(lineWords);
                renderedLines.push(
                    <div 
                        key={`line_${lineNum}`} 
                        className="flex flex-row items-center w-full min-h-[1.5rem] md:min-h-[2.5rem] py-0 select-text"
                        style={{ 
                            direction: 'rtl',
                            justifyContent: isLastLine ? 'center' : 'space-between',
                            gap: isLastLine ? '0.5rem' : 'unset'
                        }}
                    >
                        {lineWords.map((word, wIdx) => {
                            const wordKey = `${word.surah_id}_${word.verse_number}_${word.position - 1}`;
                            const isHighlighted = showHighlights && highlights[wordKey];
                            const highlightInfo = isHighlighted ? highlights[wordKey] : null;

                            let wordStyle: React.CSSProperties = {
                                fontFamily: `quran-p${pageNumber}`,
                                fontSize: 'clamp(9px, min(2.2vh, 4vw), 24px)', // Fluid typography, auto-sizes on any phone height/width
                                lineHeight: 1.15
                            };

                            if (highlightInfo) {
                                const { color } = highlightInfo;
                                const size = isVisualAlertActive ? 3 : highlightInfo.size;
                                if (size <= 2) {
                                    wordStyle = {
                                        ...wordStyle,
                                        borderBottom: `${size * 2}px solid ${color}`,
                                        paddingBottom: '2px'
                                    };
                                } else {
                                    const paddingVal = size === 3 ? '1px' : size === 4 ? '3px' : '5px';
                                    wordStyle = {
                                        ...wordStyle,
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
                                    key={`${word.id}_${wIdx}`}
                                    onClick={() => handleWordClick(wordKey)}
                                    className={`inline-block select-text transition-all duration-200 hover:scale-[1.05] ${
                                        isHighlighterActive 
                                            ? 'cursor-pointer hover:bg-amber-100/50 dark:hover:bg-amber-900/30 px-1 rounded' 
                                            : ''
                                    }`}
                                    style={wordStyle}
                                >
                                    {word.code_v2 || word.text}
                                </span>
                            );
                        })}
                    </div>
                );
            } else {
                renderedLines.push(
                    <div key={`line_empty_${lineNum}`} className="h-4 md:h-8 w-full animate-pulse bg-amber-500/5 rounded" />
                );
            }
        }

        return (
            <div className="flex flex-col items-center w-full select-text py-0.5">
                {renderedLines}
            </div>
        );
    };

    // Reset active page index when the data or pages range changes
    useEffect(() => {
        setActivePageIndex(0);
    }, [pagesList]);

    // Handle arrow keys for physical page flipping
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen || !isPageMode || pagesList.length === 0) return;
            if (e.key === 'ArrowLeft') {
                // Next Page (larger page number in Arabic RTL)
                setActivePageIndex(prev => Math.min(prev + 1, pagesList.length - 1));
            } else if (e.key === 'ArrowRight') {
                // Previous Page (smaller page number in Arabic RTL)
                setActivePageIndex(prev => Math.max(prev - 1, 0));
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, isPageMode, pagesList.length]);

    // Swipe handlers for mobile page turning
    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (touchStartX.current === null) return;
        const diffX = touchStartX.current - e.changedTouches[0].clientX;
        touchStartX.current = null;
        
        if (Math.abs(diffX) > 50) {
            if (diffX > 0) {
                // Swiped Left -> Next Page (larger number)
                setActivePageIndex(prev => Math.min(prev + 1, pagesList.length - 1));
            } else {
                // Swiped Right -> Previous Page (smaller number)
                setActivePageIndex(prev => Math.max(prev - 1, 0));
            }
        }
    };

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
                // Pre-cache all Google Fonts as well!
                await cacheAllFonts();
                setIsOfflineReady(true);
                // Trigger celebratory bubble burst
                triggerBubbleBurst();
                // Show dismissible Success Toast
                setToast({
                    message: "تم تحميل المصحف والخطوط بنجاح، يمكنك الآن الاستخدام بالكامل بدون إنترنت",
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
        <div className="fixed inset-0 z-[9999] flex items-end md:items-center justify-center bg-black/70 backdrop-blur-xs p-0 md:p-4 animate-fade-in">
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
                className="w-full max-w-4xl h-[98vh] md:h-[95vh] bg-[#FDFBF7] dark:bg-gray-950 rounded-t-3xl md:rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-amber-600/10 dark:border-gray-850 transition-all duration-300 relative"
                dir="rtl"
            >
                {/* Single Row Compact Header */}
                <div className="px-3.5 py-2 md:px-5 border-b border-amber-600/10 dark:border-gray-800 bg-[#FAF7F2] dark:bg-gray-900 flex items-center justify-between gap-2 shrink-0 relative">
                    {/* Right side: Student Name and Current recitation badge */}
                    <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs md:text-sm font-bold text-amber-950 dark:text-gray-100 truncate max-w-[120px] md:max-w-[220px]">
                                {studentName || "اسم الطالب"}
                            </span>
                            <span className="text-[9px] md:text-xs font-extrabold text-amber-900 dark:text-amber-300 bg-amber-100/80 dark:bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-600/10 shrink-0">
                                {recitationType || "المقرر"}
                            </span>
                        </div>
                        <p className="text-[10px] md:text-xs text-amber-800/60 dark:text-amber-400/60 font-semibold mt-0.5 truncate">
                            {displayRange()} ({formatPagesCountArabic(pagesCount)})
                        </p>
                    </div>

                    {/* Left side: Integrated minimalist controls */}
                    <div className="flex items-center gap-1.5 shrink-0">
                        {/* Highlighter switch */}
                        <button
                            type="button"
                            onClick={() => {
                                setIsHighlighterActive(!isHighlighterActive);
                                if (!isHighlighterActive) {
                                    setShowHighlighterControls(true);
                                }
                            }}
                            className={`p-1.5 md:p-2 rounded-full border flex items-center justify-center transition duration-200 cursor-pointer shadow-xs ${
                                isHighlighterActive 
                                    ? 'bg-amber-600 border-amber-600 text-white shadow-md ring-2 ring-amber-600/20' 
                                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:text-amber-600'
                            }`}
                            title="قلم التصحيح وتحديد الأخطاء"
                        >
                            <Highlighter className="w-3.5 h-3.5" />
                        </button>

                        {/* Eye Toggle (Visibility of highlights) - shown only when at least one highlight exists */}
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
                                className={`p-1.5 md:p-2 rounded-full border bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:text-amber-600 transition cursor-pointer shadow-xs`}
                                title={showHighlights ? "إخفاء التلوينات" : "إظهار التلوينات"}
                            >
                                {showHighlights ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5 text-red-500" />}
                            </button>
                        )}

                        {/* Offline Download block - small circle */}
                        {!isOfflineReady && (
                            <div className="flex items-center shrink-0">
                                {downloadProgress !== null ? (
                                    <span className="text-[10px] font-bold text-amber-600 font-mono">
                                        {downloadProgress}%
                                    </span>
                                ) : (
                                    <button
                                        onClick={handleDownloadOffline}
                                        className="p-1.5 md:p-2 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-emerald-600 hover:text-emerald-500 transition cursor-pointer shadow-xs"
                                        title="تحميل للعمل بدون إنترنت"
                                    >
                                        <Download className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Elegant Divider */}
                        <div className="w-[1px] h-4 bg-amber-600/10 dark:bg-gray-800 mx-1 shrink-0" />

                        {/* Close button */}
                        <button 
                            onClick={onClose}
                            className="p-1.5 md:p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 rounded-full hover:bg-amber-100/50 dark:hover:bg-gray-800 transition cursor-pointer shrink-0"
                            title="إغلاق"
                        >
                            <X className="w-4 h-4 md:w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Highlighter Controls Drawer - Compact Single Row */}
                <AnimatePresence>
                    {isHighlighterActive && showHighlighterControls && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="bg-amber-50/50 dark:bg-gray-900 border-b border-amber-600/10 dark:border-gray-800 overflow-hidden shrink-0"
                        >
                            <div className="p-2 md:px-4 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-3">
                                    {/* Pen vs Eraser */}
                                    <div className="flex items-center bg-white dark:bg-gray-800 p-0.5 rounded-lg border border-gray-200 dark:border-gray-700 shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => setActiveTool('pen')}
                                            className={`px-2 py-1 rounded-md text-[10px] md:text-xs font-bold flex items-center gap-1 cursor-pointer transition ${
                                                activeTool === 'pen'
                                                    ? 'bg-amber-100 dark:bg-gray-700 text-amber-950 dark:text-amber-200 shadow-xs'
                                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                                            }`}
                                        >
                                            <Palette className="w-3 h-3" />
                                            <span>القلم</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setActiveTool('eraser')}
                                            className={`px-2 py-1 rounded-md text-[10px] md:text-xs font-bold flex items-center gap-1 cursor-pointer transition ${
                                                activeTool === 'eraser'
                                                    ? 'bg-red-50 dark:bg-gray-750 text-red-600 dark:text-red-400 shadow-xs'
                                                    : 'text-gray-500 dark:text-gray-400 hover:text-red-500'
                                            }`}
                                        >
                                            <Eraser className="w-3 h-3" />
                                            <span>الممحاة</span>
                                        </button>
                                    </div>

                                    {/* Color Picker palette */}
                                    {activeTool === 'pen' && (
                                        <div className="flex items-center gap-1.5">
                                            {/* Red */}
                                            <button
                                                type="button"
                                                onClick={() => setSelectedColor(defaultRed)}
                                                className={`w-5 h-5 md:w-6 md:h-6 rounded-full bg-red-400 dark:bg-red-500 border transition cursor-pointer flex items-center justify-center ${
                                                    selectedColor === defaultRed ? 'ring-2 ring-amber-600 ring-offset-1 dark:ring-offset-gray-900 scale-105 border-white' : 'border-transparent'
                                                }`}
                                            >
                                                {selectedColor === defaultRed && <Check className="w-2.5 h-2.5 text-white" />}
                                            </button>

                                            {/* Yellow */}
                                            <button
                                                type="button"
                                                onClick={() => setSelectedColor(defaultYellow)}
                                                className={`w-5 h-5 md:w-6 md:h-6 rounded-full bg-yellow-300 dark:bg-yellow-400 border transition cursor-pointer flex items-center justify-center ${
                                                    selectedColor === defaultYellow ? 'ring-2 ring-amber-600 ring-offset-1 dark:ring-offset-gray-900 scale-105 border-white' : 'border-transparent'
                                                }`}
                                            >
                                                {selectedColor === defaultYellow && <Check className="w-2.5 h-2.5 text-gray-800" />}
                                            </button>

                                            {/* Custom Saved Colors */}
                                            {customColors.slice(0, 3).map((color, index) => (
                                                <button
                                                    key={index}
                                                    type="button"
                                                    onClick={() => setSelectedColor(color)}
                                                    className={`w-5 h-5 md:w-6 md:h-6 rounded-full border transition cursor-pointer flex items-center justify-center ${
                                                        selectedColor === color ? 'ring-2 ring-amber-600 ring-offset-1 dark:ring-offset-gray-900 scale-105 border-white' : 'border-gray-200'
                                                    }`}
                                                    style={{ backgroundColor: color }}
                                                >
                                                    {selectedColor === color && <Check className="w-2.5 h-2.5 text-white" />}
                                                </button>
                                            ))}

                                            {/* Add Custom Color Button */}
                                            <button
                                                type="button"
                                                onClick={() => colorInputRef.current?.click()}
                                                className="w-5 h-5 md:w-6 md:h-6 rounded-full border-2 border-dashed border-gray-400 dark:border-gray-500 hover:border-amber-600 text-gray-500 dark:text-gray-400 flex items-center justify-center hover:scale-105 transition cursor-pointer"
                                                title="إضافة لون مخصص"
                                            >
                                                <Plus className="w-2.5 h-2.5" />
                                            </button>
                                            <input 
                                                type="color" 
                                                ref={colorInputRef}
                                                onChange={(e) => handleAddCustomColor(e.target.value)}
                                                className="hidden color-picker-input" 
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Trash / Erase All with inline Confirm (Shown only when Eraser tool is active) */}
                                <div className="flex items-center gap-1.5 shrink-0">
                                    {activeTool === 'eraser' && (
                                        showClearConfirm ? (
                                            <div className="flex items-center gap-1 animate-fade-in bg-red-50 dark:bg-red-950/20 p-0.5 px-1 rounded border border-red-200 dark:border-red-900/40">
                                                <span className="text-[9px] font-semibold text-red-600 dark:text-red-400">مسح الكل؟</span>
                                                <button
                                                    type="button"
                                                    onClick={handleClearAllHighlights}
                                                    className="px-1.5 py-0.5 bg-red-600 hover:bg-red-500 text-white rounded text-[9px] font-bold cursor-pointer"
                                                >
                                                    نعم
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setShowClearConfirm(false)}
                                                    className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-850 hover:bg-gray-300 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 rounded text-[9px] font-bold cursor-pointer"
                                                >
                                                    تراجع
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => setShowClearConfirm(true)}
                                                className="px-2.5 py-1 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg text-[10px] md:text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                                                title="حذف جميع علامات التلوين"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                                <span>مسح الكل</span>
                                            </button>
                                        )
                                    )}

                                    {/* Hide controls drawer */}
                                    <button
                                        type="button"
                                        onClick={() => setShowHighlighterControls(false)}
                                        className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-150 dark:hover:bg-gray-850 rounded transition cursor-pointer"
                                        title="إخفاء خيارات قلم التلوين"
                                    >
                                        <ChevronUp className="w-3.5 h-3.5" />
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
                            className="bg-amber-100 hover:bg-amber-200 dark:bg-gray-850 dark:hover:bg-gray-800 text-amber-800 dark:text-amber-300 px-4 py-1 rounded-b-xl text-[10px] md:text-xs font-bold flex items-center gap-1 shadow-sm border-x border-b border-amber-600/10 dark:border-gray-800 cursor-pointer animate-bounce-subtle"
                        >
                            <span>خيارات التلوين</span>
                            <ChevronDown className="w-2.5 h-2.5" />
                        </button>
                    </div>
                )}

                {/* Body Content / Quran text area - minimized padding on mobile */}
                <div className="flex-1 overflow-y-auto p-1.5 md:p-4 bg-amber-50/5 dark:bg-gray-950 transition-colors duration-300 flex flex-col justify-center">
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
                    ) : isPageMode && pagesList.length > 0 ? (
                        /* Physical Mushaf Page Mode View */
                        <div 
                            className="max-w-2xl mx-auto relative select-text"
                            onTouchStart={handleTouchStart}
                            onTouchEnd={handleTouchEnd}
                        >
                            {/* Previous page overlay button (Right side in RTL) */}
                            {activePageIndex > 0 && (
                                <button
                                    onClick={() => setActivePageIndex(prev => prev - 1)}
                                    className="absolute -right-4 md:-right-16 top-1/2 -translate-y-1/2 p-3 bg-white/95 dark:bg-gray-800/95 hover:bg-primary hover:text-white dark:hover:bg-accent dark:hover:text-gray-950 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 transition z-10 cursor-pointer text-gray-700 dark:text-gray-200 hidden md:flex items-center justify-center hover:scale-105"
                                    title="الصفحة السابقة"
                                >
                                    <ChevronRight className="w-6 h-6" />
                                </button>
                            )}

                            {/* Next page overlay button (Left side in RTL) */}
                            {activePageIndex < pagesList.length - 1 && (
                                <button
                                    onClick={() => setActivePageIndex(prev => prev + 1)}
                                    className="absolute -left-4 md:-left-16 top-1/2 -translate-y-1/2 p-3 bg-white/95 dark:bg-gray-800/95 hover:bg-primary hover:text-white dark:hover:bg-accent dark:hover:text-gray-950 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 transition z-10 cursor-pointer text-gray-700 dark:text-gray-200 hidden md:flex items-center justify-center hover:scale-105"
                                    title="الصفحة التالية"
                                >
                                    <ChevronLeft className="w-6 h-6" />
                                </button>
                            )}

                            {/* Premium Physical Quran Page Frame with border details */}
                            <div className="relative border-2 sm:border-4 border-amber-600/30 dark:border-amber-500/20 rounded-2xl p-3 sm:p-6 md:p-12 bg-[#FAF6EB] dark:bg-gray-900 text-gray-950 dark:text-gray-50 shadow-2xl min-h-[460px] sm:min-h-[580px] w-full max-w-full overflow-hidden box-border flex flex-col justify-between transition-colors duration-300">
                                
                                {/* Inner Decorative border */}
                                <div className="absolute inset-2 border border-amber-600/10 dark:border-amber-500/10 rounded-xl pointer-events-none" />

                                {/* Page Header */}
                                <div className="flex justify-between items-center border-b border-amber-600/15 pb-4 mb-6 text-xs md:text-sm text-[#78350f] dark:text-amber-400 font-extrabold select-none">
                                    <span className="bg-amber-100/80 dark:bg-amber-950/40 px-3.5 py-1 rounded-full border border-amber-600/10">
                                        {getJuzNameArabic(pagesList[activePageIndex].juzNumbers[0] || 1)}
                                    </span>
                                    <span className="font-serif tracking-wide text-sm md:text-base text-amber-900 dark:text-amber-300">
                                        سورة {pagesList[activePageIndex].surahNames.join(' و')}
                                    </span>
                                </div>

                                {/* Page Content */}
                                <div 
                                    className="flex-1 leading-[2.5] tracking-wide text-right select-text"
                                    style={{ 
                                        fontFamily: fontFamily === 'kfgqpc' ? 'unset' : fontFamily, 
                                        fontSize: `${fontSize}px`,
                                        direction: 'rtl',
                                        textAlign: fontFamily === 'kfgqpc' ? 'unset' : 'justify',
                                        textJustify: fontFamily === 'kfgqpc' ? 'unset' : 'inter-word'
                                    }}
                                >
                                    {fontFamily === 'kfgqpc' ? (
                                        renderMedinaPage(pagesList[activePageIndex].pageNumber)
                                    ) : (
                                        (() => {
                                            let currentSurahNumber: number | null = null;
                                            return pagesList[activePageIndex].ayahs.map((item, idx) => {
                                                const isNewSurah = currentSurahNumber !== item.surahNumber;
                                                currentSurahNumber = item.surahNumber;
                                                
                                                const showSurahHeader = isNewSurah && item.ayah.numberInSurah === 1;
                                                const showBasmalah = showSurahHeader && item.surahNumber !== 9;
                                                
                                                let text = item.ayah.text;
                                                const basmalahPrefix1 = "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ";
                                                const basmalahPrefix2 = "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ";
                                                if (item.ayah.numberInSurah === 1) {
                                                    if (text.startsWith(basmalahPrefix1)) {
                                                        text = text.slice(basmalahPrefix1.length).trim();
                                                    } else if (text.startsWith(basmalahPrefix2)) {
                                                        text = text.slice(basmalahPrefix2.length).trim();
                                                    }
                                                }
                                                
                                                const words = text.split(/\s+/);
                                                
                                                return (
                                                    <span key={`${item.surahNumber}_${item.ayah.numberInSurah}`} className="inline">
                                                        {showSurahHeader && (
                                                            <span className="block my-6 text-center select-none">
                                                                {/* Beautiful Surah Header Banner */}
                                                                <span className="relative py-2 flex items-center justify-center">
                                                                    <span className="absolute inset-0 flex items-center" aria-hidden="true">
                                                                        <span className="w-full border-t border-dashed border-amber-300/80 dark:border-amber-700/40"></span>
                                                                    </span>
                                                                    <span className="relative px-6 py-1 bg-amber-50/95 dark:bg-gray-900 border-2 border-amber-500/60 text-amber-900 dark:text-amber-300 font-extrabold text-xs md:text-sm rounded-full shadow-xs flex items-center gap-2">
                                                                        <span>سورة {item.surahName}</span>
                                                                    </span>
                                                                </span>
                                                                
                                                                {showBasmalah && (
                                                                    <span 
                                                                        className="block text-center text-gray-900 dark:text-gray-100 py-3 leading-relaxed select-none"
                                                                        style={{ 
                                                                            fontFamily: fontFamily, 
                                                                            fontSize: `${fontSize * 1.1}px`
                                                                        }}
                                                                    >
                                                                        بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                                                                    </span>
                                                                )}
                                                            </span>
                                                        )}
                                                        
                                                        <span className="inline px-0.5 rounded transition duration-200">
                                                            {words.map((word, wIdx) => {
                                                                const wordKey = `${item.surahNumber}_${item.ayah.numberInSurah}_${wIdx}`;
                                                                const isHighlighted = showHighlights && highlights[wordKey];
                                                                const highlightInfo = isHighlighted ? highlights[wordKey] : null;
                                                                
                                                                let wordStyle: React.CSSProperties = {};
                                                                if (highlightInfo) {
                                                                    const { color } = highlightInfo;
                                                                    const size = isVisualAlertActive ? 3 : highlightInfo.size;
                                                                    
                                                                    if (size <= 2) {
                                                                        wordStyle = {
                                                                            borderBottom: `${size * 2}px solid ${color}`,
                                                                            paddingBottom: '2px'
                                                                        };
                                                                    } else {
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
                                                            
                                                            <span className="text-primary dark:text-accent font-sans mx-1 select-none font-bold text-xs md:text-sm whitespace-nowrap inline-block align-middle">
                                                                ﴿{item.ayah.numberInSurah}﴾
                                                            </span>
                                                        </span>
                                                    </span>
                                                );
                                            });
                                        })()
                                    )}
                                </div>

                                {/* Page Footer with mobile navigation */}
                                <div className="border-t border-amber-600/15 pt-4 mt-6 flex justify-between items-center text-xs md:text-sm text-[#78350f] dark:text-amber-400 font-extrabold select-none">
                                    {/* Mobile Page Controls */}
                                    <button
                                        onClick={() => setActivePageIndex(prev => Math.max(prev - 1, 0))}
                                        disabled={activePageIndex === 0}
                                        className="md:hidden px-3 py-1.5 bg-amber-100/80 hover:bg-amber-200/80 dark:bg-gray-800 dark:hover:bg-gray-750 border border-amber-600/10 rounded-lg text-xs transition disabled:opacity-30 cursor-pointer flex items-center gap-1 font-bold"
                                    >
                                        <ChevronRight className="w-3.5 h-3.5" />
                                        <span>السابق</span>
                                    </button>
                                    
                                    <span className="font-sans text-sm md:text-base bg-amber-100/90 dark:bg-amber-950/50 px-5 py-1.5 rounded-full text-[#78350f] dark:text-amber-300 font-extrabold shadow-inner mx-auto border border-amber-600/10">
                                        {pagesList[activePageIndex].pageNumber}
                                    </span>

                                    <button
                                        onClick={() => setActivePageIndex(prev => Math.min(prev + 1, pagesList.length - 1))}
                                        disabled={activePageIndex === pagesList.length - 1}
                                        className="md:hidden px-3 py-1.5 bg-amber-100/80 hover:bg-amber-200/80 dark:bg-gray-800 dark:hover:bg-gray-750 border border-amber-600/10 rounded-lg text-xs transition disabled:opacity-30 cursor-pointer flex items-center gap-1 font-bold"
                                    >
                                        <span>التالي</span>
                                        <ChevronLeft className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* Continuous Flow View */
                        <div className="max-w-3xl mx-auto space-y-8 select-text">
                            {fontFamily === 'kfgqpc' ? (
                                pagesList.map((pageData) => (
                                    <div 
                                        key={pageData.pageNumber}
                                        className="relative border-2 sm:border-4 border-amber-600/30 dark:border-amber-500/20 rounded-2xl p-3 sm:p-6 md:p-12 bg-[#FAF6EB] dark:bg-gray-900 text-gray-950 dark:text-gray-50 shadow-2xl min-h-[460px] sm:min-h-[580px] w-full max-w-full overflow-hidden box-border flex flex-col justify-between transition-colors duration-300"
                                    >
                                        {/* Inner Decorative border */}
                                        <div className="absolute inset-2 border border-amber-600/10 dark:border-amber-500/10 rounded-xl pointer-events-none" />

                                        {/* Page Header */}
                                        <div className="flex justify-between items-center border-b border-amber-600/15 pb-4 mb-6 text-xs md:text-sm text-[#78350f] dark:text-amber-400 font-extrabold select-none">
                                            <span className="bg-amber-100/80 dark:bg-amber-950/40 px-3.5 py-1 rounded-full border border-amber-600/10">
                                                {getJuzNameArabic(pageData.juzNumbers[0] || 1)}
                                            </span>
                                            <span className="font-serif tracking-wide text-sm md:text-base text-amber-900 dark:text-amber-300">
                                                سورة {pageData.surahNames.join(' و')}
                                            </span>
                                        </div>

                                        {/* Page Content */}
                                        <div className="flex-1 text-right select-text">
                                            {renderMedinaPage(pageData.pageNumber)}
                                        </div>

                                        {/* Page Footer */}
                                        <div className="border-t border-amber-600/15 pt-4 mt-6 flex justify-center items-center text-xs md:text-sm text-[#78350f] dark:text-amber-400 font-extrabold select-none">
                                            <span className="font-sans text-sm md:text-base bg-amber-100/90 dark:bg-amber-950/50 px-5 py-1.5 rounded-full text-[#78350f] dark:text-amber-300 font-extrabold shadow-inner border border-amber-600/10">
                                                {pageData.pageNumber}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                quranData.map((surah) => (
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
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

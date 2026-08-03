import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    BookOpen, Search, ChevronRight, ChevronLeft, Type, Plus, Minus, 
    X, Layers, Sparkles, BookMarked, ArrowRight
} from 'lucide-react';
import { surahs } from '../constants';
import { normalizeText, formatPagesCountArabic } from '../utils/helpers';
import { 
    fetchQuranPage, 
    fetchQuranSurah, 
    fetchQuranJuz, 
    getQuranData,
    QuranSurahRange 
} from '../utils/quranTextManager';
import SurahSelectorModal from '../components/SurahSelectorModal';

interface QuranPageProps {
    onBack?: () => void;
}

const FONT_OPTIONS = [
    { value: "'Amiri Quran', 'Scheherazade New', 'Traditional Arabic', serif", label: "خط مصحف المدينة العثماني (الأميري)" },
    { value: "'Scheherazade New', 'Amiri Quran', serif", label: "خط شهرزاد العثماني" },
    { value: "'Noto Naskh Arabic', sans-serif", label: "خط النسخ المعاصر" },
    { value: "'Tajawal', sans-serif", label: "خط النظام" }
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

export const QuranPage: React.FC<QuranPageProps> = ({ onBack }) => {
    // Automatically load last read page or default to 1 (Surah Al-Fatihah)
    const [currentPage, setCurrentPage] = useState<number>(() => {
        const saved = localStorage.getItem('last_read_quran_page');
        const num = saved ? parseInt(saved, 10) : 1;
        return (num >= 1 && num <= 604) ? num : 1;
    });

    const [selectedSurah, setSelectedSurah] = useState<number>(1);
    const [selectedJuz, setSelectedJuz] = useState<number>(1);
    const [navType, setNavType] = useState<'page' | 'surah' | 'juz'>('page');
    
    // Display Mode: 'mushaf' (authentic page images) or 'text' (Uthmani text)
    const [displayMode, setDisplayMode] = useState<'mushaf' | 'text'>('mushaf');
    const [zoomScale, setZoomScale] = useState<number>(1);
    const [imgLoading, setImgLoading] = useState<boolean>(true);
    const [imgError, setImgError] = useState<boolean>(false);

    const [loading, setLoading] = useState<boolean>(false);
    const [quranData, setQuranData] = useState<QuranSurahRange[]>([]);
    
    // Preferences
    const [fontFamily, setFontFamily] = useState<string>(() => {
        return localStorage.getItem('quran_page_font') || "'Amiri Quran', 'Scheherazade New', 'Traditional Arabic', serif";
    });
    const [fontSize, setFontSize] = useState<number>(() => {
        return parseInt(localStorage.getItem('quran_page_size') || '24');
    });

    // Modals and Controls
    const [isSurahModalOpen, setIsSurahModalOpen] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<{ surahName: string; surahNum: number; ayahNum: number; text: string; page: number }[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    const touchStartX = useRef<number | null>(null);

    // Save preferences and last read page
    useEffect(() => {
        localStorage.setItem('quran_page_font', fontFamily);
    }, [fontFamily]);

    useEffect(() => {
        localStorage.setItem('quran_page_size', fontSize.toString());
    }, [fontSize]);

    useEffect(() => {
        if (currentPage >= 1 && currentPage <= 604) {
            localStorage.setItem('last_read_quran_page', currentPage.toString());
        }
    }, [currentPage]);

    // Handle mobile back button
    useEffect(() => {
        if (isSearchOpen || isSurahModalOpen) {
            try {
                window.history.pushState({ quranModalOpen: true }, '');
            } catch (e) {}

            const handlePopState = () => {
                setIsSearchOpen(false);
                setIsSurahModalOpen(false);
            };

            window.addEventListener('popstate', handlePopState);
            return () => window.removeEventListener('popstate', handlePopState);
        }
    }, [isSearchOpen, isSurahModalOpen]);

    // Load data based on navigation selection
    useEffect(() => {
        let isMounted = true;
        const loadContent = async () => {
            setLoading(true);
            try {
                if (navType === 'page') {
                    const data = await fetchQuranPage(currentPage);
                    if (isMounted) setQuranData(data);
                } else if (navType === 'surah') {
                    const data = await fetchQuranSurah(selectedSurah);
                    if (isMounted) setQuranData(data);
                } else if (navType === 'juz') {
                    const data = await fetchQuranJuz(selectedJuz);
                    if (isMounted) setQuranData(data);
                }
            } catch (err) {
                console.error("Error loading Quran page content:", err);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        loadContent();
        return () => { isMounted = false; };
    }, [currentPage, selectedSurah, selectedJuz, navType]);

    // Fast multi-type search across Quran
    const handleSearch = async (queryText: string) => {
        setSearchQuery(queryText);
        if (!queryText.trim()) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        try {
            const cleanQuery = queryText.trim();
            const normQuery = normalizeText(cleanQuery);
            const digitsOnly = cleanQuery.replace(/[^\d0-9١٢٣٤٥٦٧٨٩٠]/g, '');
            let parsedNum: number | null = null;
            if (digitsOnly) {
                // convert arabic digits to standard English numbers
                const standardDigits = digitsOnly.replace(/[١٢٣٤٥٦٧٨٩٠]/g, d => '١٢٣٤٥٦٧٨٩٠'.indexOf(d).toString());
                parsedNum = parseInt(standardDigits, 10);
            }

            const results: { surahName: string; surahNum: number; ayahNum: number; text: string; page: number }[] = [];

            // 1. Check if user typed a Page Number directly
            if (parsedNum && parsedNum >= 1 && parsedNum <= 604) {
                results.push({
                    surahName: "انتقال مباشر إلى الصفحة",
                    surahNum: 0,
                    ayahNum: 0,
                    text: `صفحة رقم ${parsedNum} في المصحف الشريف`,
                    page: parsedNum
                });
            }

            // 2. Search Surah Names
            const matchingSurahs = surahs.filter(s => normalizeText(s.name).includes(normQuery) || normQuery.includes(normalizeText(s.name)));
            for (const s of matchingSurahs) {
                const surahNum = surahs.indexOf(s) + 1;
                // Fetch first page of surah
                const [sData] = await fetchQuranSurah(surahNum);
                if (sData && sData.ayahs.length > 0) {
                    results.push({
                        surahName: s.name,
                        surahNum: surahNum,
                        ayahNum: 1,
                        text: `سورة ${s.name} (عدد آياتها ${s.verses} - المكية/المدنية)`,
                        page: sData.ayahs[0].page
                    });
                }
            }

            // 3. Search Verse Texts in full Quran JSON
            const fullQuran = await getQuranData();
            const allSurahs = fullQuran?.data?.surahs || fullQuran?.surahs || [];

            for (const surah of allSurahs) {
                if (results.length >= 40) break;
                for (const ayah of (surah.ayahs || [])) {
                    if (normalizeText(ayah.text).includes(normQuery)) {
                        // Avoid duplicates
                        const exists = results.some(r => r.page === ayah.page && r.surahNum === surah.number && r.ayahNum === ayah.numberInSurah);
                        if (!exists) {
                            results.push({
                                surahName: surah.name,
                                surahNum: surah.number,
                                ayahNum: ayah.numberInSurah,
                                text: ayah.text,
                                page: ayah.page
                            });
                        }
                    }
                    if (results.length >= 40) break;
                }
            }

            setSearchResults(results);
        } catch (e) {
            console.error("Quran search error:", e);
        } finally {
            setIsSearching(false);
        }
    };

    // Keyboard Page Navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (isSurahModalOpen || isSearchOpen) return;
            if (e.key === 'ArrowLeft') {
                // Next page (RTL)
                setCurrentPage(prev => Math.min(prev + 1, 604));
                setNavType('page');
            } else if (e.key === 'ArrowRight') {
                // Previous page (RTL)
                setCurrentPage(prev => Math.max(prev - 1, 1));
                setNavType('page');
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isSurahModalOpen, isSearchOpen]);

    // Touch Swipe Navigation
    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (touchStartX.current === null) return;
        const diffX = touchStartX.current - e.changedTouches[0].clientX;
        touchStartX.current = null;

        if (Math.abs(diffX) > 40) {
            if (diffX > 0) {
                // Swiped Left -> Next Page (page number increments)
                setCurrentPage(prev => Math.min(prev + 1, 604));
                setNavType('page');
            } else {
                // Swiped Right -> Previous Page (page number decrements)
                setCurrentPage(prev => Math.max(prev - 1, 1));
                setNavType('page');
            }
        }
    };

    const currentSurahObj = surahs[selectedSurah - 1] || surahs[0];

    return (
        <div className="min-h-screen bg-[#F7F4EC] dark:bg-gray-950 text-gray-900 dark:text-gray-100 flex flex-col transition-colors duration-300" dir="rtl">
            {/* Top Navigation Header */}
            <header className="sticky top-0 z-30 bg-[#F2ECE1] dark:bg-gray-900 border-b border-amber-800/15 dark:border-gray-800 shadow-xs px-3 py-2.5 md:px-6">
                <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-2">
                    
                    {/* Return Button & Mushaf Title */}
                    <div className="flex items-center gap-2">
                        {onBack && (
                            <button 
                                onClick={onBack}
                                className="p-2 rounded-xl bg-amber-200/60 dark:bg-gray-800 text-amber-950 dark:text-amber-300 hover:bg-amber-300/60 transition cursor-pointer flex items-center gap-1 font-bold text-xs"
                                title="الرجوع"
                            >
                                <ChevronRight className="w-5 h-5" />
                                <span className="hidden sm:inline">رجوع</span>
                            </button>
                        )}
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-amber-600 text-white rounded-xl shadow-xs">
                                <BookOpen className="w-5 h-5" />
                            </div>
                            <div>
                                <h1 className="text-base md:text-lg font-black text-amber-950 dark:text-amber-200 leading-tight">المصحف الشريف</h1>
                                <p className="text-[10px] md:text-xs text-amber-800/70 dark:text-amber-400/70 font-bold">
                                    {navType === 'page' ? `الصفحة ${currentPage} من 604` : navType === 'surah' ? `سورة ${currentSurahObj.name}` : `الجزء ${selectedJuz}`}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Navigation Mode Quick Selectors */}
                    <div className="flex items-center gap-2 overflow-x-auto py-1">
                        <div className="flex items-center bg-amber-200/50 dark:bg-gray-800 p-1 rounded-xl border border-amber-800/10 dark:border-gray-700 text-xs font-bold">
                            <button
                                onClick={() => setNavType('page')}
                                className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                                    navType === 'page' ? 'bg-amber-700 text-white shadow-xs' : 'text-amber-950 dark:text-gray-300 hover:text-amber-700'
                                }`}
                            >
                                صفحة
                            </button>
                            <button
                                onClick={() => setNavType('surah')}
                                className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                                    navType === 'surah' ? 'bg-amber-700 text-white shadow-xs' : 'text-amber-950 dark:text-gray-300 hover:text-amber-700'
                                }`}
                            >
                                سورة
                            </button>
                            <button
                                onClick={() => setNavType('juz')}
                                className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                                    navType === 'juz' ? 'bg-amber-700 text-white shadow-xs' : 'text-amber-950 dark:text-gray-300 hover:text-amber-700'
                                }`}
                            >
                                جزء
                            </button>
                        </div>

                        {/* Page input box */}
                        {navType === 'page' && (
                            <div className="flex items-center gap-1 bg-white dark:bg-gray-850 px-2.5 py-1 rounded-xl border border-amber-700/20 dark:border-gray-700 shadow-2xs">
                                <span className="text-xs font-bold text-amber-950 dark:text-amber-300">صفحة:</span>
                                <input
                                    type="number"
                                    min={1}
                                    max={604}
                                    value={currentPage}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value) || 1;
                                        setCurrentPage(Math.max(1, Math.min(604, val)));
                                    }}
                                    className="w-12 text-center text-xs font-bold bg-transparent text-amber-950 dark:text-white outline-none"
                                />
                                <span className="text-[10px] text-gray-400">/ 604</span>
                            </div>
                        )}

                        {navType === 'surah' && (
                            <select
                                value={selectedSurah}
                                onChange={(e) => setSelectedSurah(parseInt(e.target.value))}
                                className="bg-white dark:bg-gray-850 px-3 py-1.5 rounded-xl border border-amber-700/20 dark:border-gray-700 text-xs font-bold text-amber-950 dark:text-white outline-none cursor-pointer shadow-2xs max-w-[150px] sm:max-w-[200px] truncate"
                            >
                                {surahs.map((s, idx) => (
                                    <option key={idx + 1} value={idx + 1}>
                                        {idx + 1}. سورة {s.name} ({s.verses} آية)
                                    </option>
                                ))}
                            </select>
                        )}

                        {navType === 'juz' && (
                            <select
                                value={selectedJuz}
                                onChange={(e) => setSelectedJuz(parseInt(e.target.value))}
                                className="bg-white dark:bg-gray-850 px-3 py-1.5 rounded-xl border border-amber-700/20 dark:border-gray-700 text-xs font-bold text-amber-950 dark:text-white outline-none cursor-pointer shadow-2xs"
                            >
                                {Array.from({ length: 30 }, (_, i) => i + 1).map(j => (
                                    <option key={j} value={j}>{getJuzNameArabic(j)}</option>
                                ))}
                            </select>
                        )}

                        {/* Search Button & Display Mode Switcher */}
                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={() => setDisplayMode(prev => prev === 'mushaf' ? 'text' : 'mushaf')}
                                className="px-3 py-1.5 bg-amber-100 dark:bg-gray-800 hover:bg-amber-200 dark:hover:bg-gray-750 text-amber-950 dark:text-amber-200 rounded-xl transition cursor-pointer flex items-center gap-1.5 text-xs font-bold border border-amber-700/20"
                                title="تغيير نمط العرض (صفحات مصورة / نص عثماني)"
                            >
                                <BookMarked className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                                <span>{displayMode === 'mushaf' ? 'عرض النص' : 'عرض المصحف'}</span>
                            </button>

                            <button
                                onClick={() => setIsSearchOpen(true)}
                                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl transition cursor-pointer flex items-center gap-1 text-xs font-bold shadow-xs"
                                title="البحث في المصحف"
                            >
                                <Search className="w-4 h-4" />
                                <span className="hidden sm:inline">بحث</span>
                            </button>
                        </div>
                    </div>

                    {/* Controls: Zoom for Mushaf mode or Font for Text mode */}
                    {displayMode === 'mushaf' ? (
                        <div className="flex items-center gap-1.5 bg-amber-100/80 dark:bg-gray-800/80 px-2 py-1 rounded-xl border border-amber-700/20">
                            <button
                                onClick={() => setZoomScale(prev => Math.max(0.8, prev - 0.1))}
                                className="p-1.5 bg-white dark:bg-gray-700 rounded-lg text-gray-800 dark:text-gray-200 hover:text-amber-700 transition cursor-pointer shadow-2xs"
                                title="تصغير الصفحة"
                            >
                                <Minus className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={() => setZoomScale(1)}
                                className="px-2 py-0.5 text-xs font-bold text-amber-900 dark:text-amber-200 cursor-pointer"
                                title="إعادة الضبط"
                            >
                                {Math.round(zoomScale * 100)}%
                            </button>
                            <button
                                onClick={() => setZoomScale(prev => Math.min(1.8, prev + 0.1))}
                                className="p-1.5 bg-white dark:bg-gray-700 rounded-lg text-gray-800 dark:text-gray-200 hover:text-amber-700 transition cursor-pointer shadow-2xs"
                                title="تكبير الصفحة"
                            >
                                <Plus className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={() => setFontSize(prev => Math.max(18, prev - 2))}
                                className="p-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-800 dark:text-gray-200 hover:text-amber-700 transition cursor-pointer"
                                title="تصغير الخط"
                            >
                                <Minus className="w-3.5 h-3.5" />
                            </button>

                            <span className="text-xs font-bold text-amber-950 dark:text-amber-300 w-6 text-center font-mono">
                                {fontSize}
                            </span>

                            <button
                                onClick={() => setFontSize(prev => Math.min(48, prev + 2))}
                                className="p-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-800 dark:text-gray-200 hover:text-amber-700 transition cursor-pointer"
                                title="تكبير الخط"
                            >
                                <Plus className="w-3.5 h-3.5" />
                            </button>

                            <select
                                value={fontFamily}
                                onChange={(e) => setFontFamily(e.target.value)}
                                className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl px-2 py-1 text-xs font-bold text-gray-800 dark:text-gray-200 outline-none cursor-pointer hidden md:block"
                            >
                                {FONT_OPTIONS.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
            </header>

            {/* Main Quran Canvas Display */}
            <main className="flex-1 max-w-4xl w-full mx-auto p-3 sm:p-6 flex flex-col justify-center">
                {loading ? (
                    <div className="w-full py-24 flex flex-col items-center justify-center gap-3">
                        <div className="w-10 h-10 border-4 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-xs text-amber-900/80 dark:text-amber-300/80 font-bold animate-pulse">جاري عرض أيات المصحف الشريف...</p>
                    </div>
                ) : quranData.length === 0 ? (
                    <div className="w-full py-24 text-center text-gray-500 dark:text-gray-400 text-sm font-semibold">
                        لم يتم العثور على محتوى. الرجاء اختيار صفحة أو سورة.
                    </div>
                ) : (
                    <div 
                        className="relative"
                        onTouchStart={handleTouchStart}
                        onTouchEnd={handleTouchEnd}
                    >
                        {/* Side Arrows for Page Navigation on Desktop */}
                        {navType === 'page' && currentPage < 604 && (
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, 604))}
                                className="absolute -left-4 md:-left-16 top-1/2 -translate-y-1/2 p-3 bg-white/95 dark:bg-gray-800/95 hover:bg-amber-700 hover:text-white rounded-full shadow-lg border border-amber-700/20 transition z-10 cursor-pointer hidden md:flex items-center justify-center hover:scale-105 text-amber-950 dark:text-amber-200"
                                title="الصفحة التالية (سحب لليسار)"
                            >
                                <ChevronLeft className="w-6 h-6" />
                            </button>
                        )}

                        {navType === 'page' && currentPage > 1 && (
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                className="absolute -right-4 md:-right-16 top-1/2 -translate-y-1/2 p-3 bg-white/95 dark:bg-gray-800/95 hover:bg-amber-700 hover:text-white rounded-full shadow-lg border border-amber-700/20 transition z-10 cursor-pointer hidden md:flex items-center justify-center hover:scale-105 text-amber-950 dark:text-amber-200"
                                title="الصفحة السابقة (سحب لليمين)"
                            >
                                <ChevronRight className="w-6 h-6" />
                            </button>
                        )}

                        {/* Physical Mushaf Page Frame */}
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={navType === 'page' ? `${displayMode}-${currentPage}` : `${displayMode}-${selectedSurah}-${selectedJuz}`}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.2 }}
                                className="relative border-2 sm:border-4 border-amber-700/40 dark:border-amber-500/30 rounded-2xl p-3 sm:p-6 md:p-8 bg-[#FAF6EB] dark:bg-gray-900 text-gray-950 dark:text-gray-50 shadow-2xl min-h-[550px] w-full max-w-full overflow-hidden box-border flex flex-col justify-between transition-colors duration-300"
                            >
                                {/* Inner Ornamental Line */}
                                <div className="absolute inset-2 border border-amber-700/15 dark:border-amber-500/15 rounded-xl pointer-events-none" />

                                {/* Page Top Bar: Juz & Surah */}
                                <div className="flex justify-between items-center border-b border-amber-700/20 pb-3 mb-4 text-xs md:text-sm text-amber-950 dark:text-amber-300 font-extrabold select-none z-10">
                                    <span className="bg-amber-200/80 dark:bg-amber-950/60 px-3.5 py-1 rounded-full border border-amber-700/15">
                                        {getJuzNameArabic(quranData[0]?.ayahs[0]?.juz || 1)}
                                    </span>
                                    <span className="tracking-wide text-sm md:text-base text-amber-950 dark:text-amber-200 font-bold" style={{ fontFamily }}>
                                        سورة {quranData.map(s => s.name).join(' و')}
                                    </span>
                                </div>

                                {/* Content Body: Authentic Page Image OR Uthmani Text */}
                                {displayMode === 'mushaf' && navType === 'page' ? (
                                    <div className="flex-1 flex flex-col items-center justify-center my-2 overflow-auto relative min-h-[480px]">
                                        <div 
                                            className="transition-transform duration-200 ease-out flex items-center justify-center w-full"
                                            style={{ transform: `scale(${zoomScale})`, transformOrigin: 'top center' }}
                                        >
                                            <img
                                                src={`https://files.quran.app/hafs/madani/width_1024/page${currentPage.toString().padStart(3, '0')}.png`}
                                                alt={`صفحة ${currentPage} من المصحف الشريف`}
                                                className="max-w-full h-auto object-contain max-h-[70vh] rounded-md shadow-sm filter contrast-[1.03]"
                                                loading="eager"
                                                onError={(e) => {
                                                    // Fallback gracefully if image cannot be fetched
                                                    console.warn('Page image failed to load, switching to text view fallback');
                                                    setDisplayMode('text');
                                                }}
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    /* Quran Verses Flow with Uthmani Font */
                                    <div 
                                        className="flex-1 leading-[2.6] md:leading-[2.8] tracking-wide text-justify select-text"
                                        style={{ 
                                            fontFamily: fontFamily, 
                                            fontSize: `${fontSize}px`,
                                            direction: 'rtl',
                                            textJustify: 'inter-word'
                                        }}
                                    >
                                        {quranData.map((surah) => (
                                            <div key={surah.number} className="mb-8">
                                                {/* Surah Decorative Banner */}
                                                <div className="my-5 text-center select-none">
                                                    <div className="relative py-2 flex items-center justify-center">
                                                        <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                                            <div className="w-full border-t border-dashed border-amber-500/70 dark:border-amber-700/50"></div>
                                                        </div>
                                                        <div className="relative px-8 py-1.5 bg-amber-200/90 dark:bg-gray-800 border-2 border-amber-600/70 text-amber-950 dark:text-amber-200 font-black text-sm md:text-base rounded-full shadow-xs flex items-center gap-2">
                                                            <span>❖ سُورَةُ {surah.name} ❖</span>
                                                        </div>
                                                    </div>
                                                    
                                                    {/* Bismillah Banner */}
                                                    {surah.number !== 9 && (
                                                        <div className="block text-center text-amber-950 dark:text-amber-200 py-3 font-bold text-base md:text-lg tracking-wide select-none" style={{ fontFamily }}>
                                                            بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Verses Flow */}
                                                <div>
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

                                                        return (
                                                            <span key={ayah.numberInSurah} className="inline">
                                                                <span>{text}</span>
                                                                <span className="text-amber-800 dark:text-amber-400 font-sans mx-1.5 select-none font-bold text-xs md:text-sm inline-block align-middle">
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

                                {/* Page Footer Navigation */}
                                {navType === 'page' && (
                                    <div className="border-t border-amber-700/20 pt-4 mt-6 flex justify-between items-center text-xs md:text-sm text-amber-950 dark:text-amber-300 font-extrabold select-none">
                                        <button
                                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                            disabled={currentPage === 1}
                                            className="px-3.5 py-1.5 bg-amber-200/80 hover:bg-amber-300/80 dark:bg-gray-800 dark:hover:bg-gray-750 border border-amber-700/20 rounded-lg text-xs transition disabled:opacity-30 cursor-pointer flex items-center gap-1 font-bold"
                                        >
                                            <ChevronRight className="w-4 h-4" />
                                            <span>السابقة</span>
                                        </button>

                                        <span className="font-sans text-sm md:text-base bg-amber-200/90 dark:bg-amber-950/60 px-6 py-1 rounded-full text-amber-950 dark:text-amber-200 font-black shadow-inner border border-amber-700/20">
                                            صفحة {currentPage}
                                        </span>

                                        <button
                                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, 604))}
                                            disabled={currentPage === 604}
                                            className="px-3.5 py-1.5 bg-amber-200/80 hover:bg-amber-300/80 dark:bg-gray-800 dark:hover:bg-gray-750 border border-amber-700/20 rounded-lg text-xs transition disabled:opacity-30 cursor-pointer flex items-center gap-1 font-bold"
                                        >
                                            <span>التالية</span>
                                            <ChevronLeft className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                )}
            </main>

            {/* Surah Selector Modal */}
            <SurahSelectorModal
                isOpen={isSurahModalOpen}
                onClose={() => setIsSurahModalOpen(false)}
                onSelect={(surahName) => {
                    const idx = surahs.findIndex(s => normalizeText(s.name) === normalizeText(surahName));
                    if (idx !== -1) {
                        setSelectedSurah(idx + 1);
                        setNavType('surah');
                    }
                    setIsSurahModalOpen(false);
                }}
                title="اختر السورة"
                surahOrder="quranic"
            />

            {/* Advanced Search Modal */}
            <AnimatePresence>
                {isSearchOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-center items-end sm:items-center p-0 sm:p-4"
                        onClick={() => setIsSearchOpen(false)}
                    >
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl border border-amber-700/20"
                        >
                            <header className="p-4 border-b dark:border-gray-800 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 bg-amber-600 text-white rounded-xl">
                                        <Search className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-base text-gray-900 dark:text-white">البحث الشامل في القرآن الكريم</h3>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold">ابحث باسم السورة، رقم الصفحة (1-604)، رقم الآية أو أي كلمة</p>
                                    </div>
                                </div>
                                <button onClick={() => setIsSearchOpen(false)} className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition">
                                    <X className="w-5 h-5" />
                                </button>
                            </header>

                            <div className="p-4 border-b dark:border-gray-800 bg-amber-50/50 dark:bg-gray-850">
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="اكتب اسم السورة، رقم الصفحة، أو جزءاً من الآية..."
                                        value={searchQuery}
                                        onChange={(e) => handleSearch(e.target.value)}
                                        className="w-full p-3.5 pr-10 bg-white dark:bg-gray-800 border border-amber-700/20 dark:border-gray-700 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-amber-600"
                                        autoFocus
                                    />
                                    <Search className="w-5 h-5 text-amber-600 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
                                {isSearching ? (
                                    <div className="py-12 text-center text-amber-700 font-bold text-sm animate-pulse">
                                        جاري البحث في آيات وسور المصحف...
                                    </div>
                                ) : searchResults.length === 0 ? (
                                    <p className="text-center text-xs text-gray-400 py-10 font-semibold">
                                        {searchQuery.trim() ? "لم يتم العثور على نتائج متطابقة" : "اكتب كلمتك أو رقم الصفحة للبدء بالبحث في المصحف"}
                                    </p>
                                ) : (
                                    searchResults.map((res, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => {
                                                setCurrentPage(res.page);
                                                setNavType('page');
                                                setIsSearchOpen(false);
                                            }}
                                            className="w-full text-right p-3.5 bg-amber-50/80 dark:bg-gray-800/80 hover:bg-amber-100 dark:hover:bg-gray-800 rounded-xl border border-amber-700/15 transition cursor-pointer flex flex-col gap-1.5 shadow-2xs"
                                        >
                                            <div className="flex justify-between items-center text-xs font-black text-amber-950 dark:text-amber-300">
                                                <span>{res.surahNum === 0 ? res.surahName : `سورة ${res.surahName} (آية ${res.ayahNum})`}</span>
                                                <span className="text-[11px] bg-amber-600 text-white px-2.5 py-0.5 rounded-full font-bold">صفحة {res.page}</span>
                                            </div>
                                            <p className="text-sm font-serif text-gray-900 dark:text-gray-100 leading-relaxed font-semibold">
                                                {res.text}
                                            </p>
                                        </button>
                                    ))
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default QuranPage;


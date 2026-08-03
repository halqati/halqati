import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    BookOpen, Search, ChevronRight, ChevronLeft, Type, Plus, Minus, 
    Palette, Download, Check, Eye, EyeOff, X, Layers, Sparkles
} from 'lucide-react';
import { surahs } from '../constants';
import { normalizeText, formatPagesCountArabic } from '../utils/helpers';
import { 
    fetchQuranPage, 
    fetchQuranSurah, 
    fetchQuranJuz, 
    QuranSurahRange 
} from '../utils/quranTextManager';
import SurahSelectorModal from '../components/SurahSelectorModal';

interface QuranPageProps {
    onBack?: () => void;
}

const FONT_OPTIONS = [
    { value: "'Amiri Quran', 'Amiri', serif", label: "خط مصحف المدينة (الأميري)" },
    { value: "'Scheherazade New', serif", label: "خط شهرزاد الجديد" },
    { value: "'Noto Naskh Arabic', sans-serif", label: "خط النسخ" },
    { value: "'Reem Kufi', sans-serif", label: "خط الكوفي" },
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
    const [viewMode, setViewMode] = useState<'page' | 'continuous'>('page');
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [selectedSurah, setSelectedSurah] = useState<number>(1);
    const [selectedJuz, setSelectedJuz] = useState<number>(1);
    const [navType, setNavType] = useState<'page' | 'surah' | 'juz'>('page');
    
    const [loading, setLoading] = useState<boolean>(false);
    const [quranData, setQuranData] = useState<QuranSurahRange[]>([]);
    
    // Preferences
    const [fontFamily, setFontFamily] = useState<string>(() => {
        return localStorage.getItem('quran_page_font') || "'Amiri Quran', 'Amiri', serif";
    });
    const [fontSize, setFontSize] = useState<number>(() => {
        return parseInt(localStorage.getItem('quran_page_size') || '22');
    });

    // Modals and Controls
    const [isSurahModalOpen, setIsSurahModalOpen] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<{ surahName: string; surahNum: number; ayahNum: number; text: string; page: number }[]>([]);

    const touchStartX = useRef<number | null>(null);

    // Save preferences
    useEffect(() => {
        localStorage.setItem('quran_page_font', fontFamily);
    }, [fontFamily]);

    useEffect(() => {
        localStorage.setItem('quran_page_size', fontSize.toString());
    }, [fontSize]);

    // Load data based on navigation selection
    useEffect(() => {
        const loadContent = async () => {
            setLoading(true);
            try {
                if (navType === 'page') {
                    const data = await fetchQuranPage(currentPage);
                    setQuranData(data);
                } else if (navType === 'surah') {
                    const data = await fetchQuranSurah(selectedSurah);
                    setQuranData(data);
                } else if (navType === 'juz') {
                    const data = await fetchQuranJuz(selectedJuz);
                    setQuranData(data);
                }
            } catch (err) {
                console.error("Error loading Quran page content:", err);
            } finally {
                setLoading(false);
            }
        };

        loadContent();
    }, [currentPage, selectedSurah, selectedJuz, navType]);

    // Search Quran text
    const handleSearch = async (queryText: string) => {
        setSearchQuery(queryText);
        if (!queryText.trim() || queryText.trim().length < 2) {
            setSearchResults([]);
            return;
        }

        try {
            const norm = normalizeText(queryText);
            const results: { surahName: string; surahNum: number; ayahNum: number; text: string; page: number }[] = [];
            
            // Search across first 114 surahs via fetchQuranSurah or cached Uthmani
            for (let i = 1; i <= 114; i++) {
                const [surahData] = await fetchQuranSurah(i);
                if (!surahData) continue;
                for (const ayah of surahData.ayahs) {
                    if (normalizeText(ayah.text).includes(norm)) {
                        results.push({
                            surahName: surahData.name,
                            surahNum: surahData.number,
                            ayahNum: ayah.numberInSurah,
                            text: ayah.text,
                            page: ayah.page
                        });
                        if (results.length >= 30) break; // Cap at 30 results for speed
                    }
                }
                if (results.length >= 30) break;
            }
            setSearchResults(results);
        } catch (e) {
            console.error("Quran search error:", e);
        }
    };

    // Keyboard Page Turning
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (isSurahModalOpen || isSearchOpen) return;
            if (e.key === 'ArrowLeft') {
                // Next page (RTL larger number)
                setCurrentPage(prev => Math.min(prev + 1, 604));
                setNavType('page');
            } else if (e.key === 'ArrowRight') {
                // Previous page (RTL smaller number)
                setCurrentPage(prev => Math.max(prev - 1, 1));
                setNavType('page');
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isSurahModalOpen, isSearchOpen]);

    // Touch Swipe
    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (touchStartX.current === null) return;
        const diffX = touchStartX.current - e.changedTouches[0].clientX;
        touchStartX.current = null;

        if (Math.abs(diffX) > 50) {
            if (diffX > 0) {
                // Swiped Left -> Next Page
                setCurrentPage(prev => Math.min(prev + 1, 604));
                setNavType('page');
            } else {
                // Swiped Right -> Previous Page
                setCurrentPage(prev => Math.max(prev - 1, 1));
                setNavType('page');
            }
        }
    };

    // Surah info helper
    const currentSurahObj = surahs[selectedSurah - 1] || surahs[0];

    return (
        <div className="min-h-screen bg-[#FDFBF7] dark:bg-gray-950 text-gray-900 dark:text-gray-100 flex flex-col transition-colors duration-300" dir="rtl">
            {/* Header / Navigation Bar */}
            <header className="sticky top-0 z-30 bg-[#FAF7F2] dark:bg-gray-900 border-b border-amber-600/15 dark:border-gray-800 shadow-xs px-3 py-2.5 md:px-6">
                <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-2">
                    
                    {/* Title & Back Button */}
                    <div className="flex items-center gap-2">
                        {onBack && (
                            <button 
                                onClick={onBack}
                                className="p-2 rounded-xl bg-amber-100/60 dark:bg-gray-800 text-amber-900 dark:text-amber-300 hover:bg-amber-200/60 transition cursor-pointer"
                                title="الرجوع"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        )}
                        <div className="flex items-center gap-2">
                            <BookOpen className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                            <div>
                                <h1 className="text-base md:text-lg font-black text-amber-950 dark:text-amber-200 leading-tight">المصحف الشريف</h1>
                                <p className="text-[10px] md:text-xs text-amber-800/60 dark:text-amber-400/60 font-bold">
                                    {navType === 'page' ? `الصفحة ${currentPage}` : navType === 'surah' ? `سورة ${currentSurahObj.name}` : `الجزء ${selectedJuz}`}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Quick Jump Selectors */}
                    <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                        {/* Jump By Mode Switcher */}
                        <div className="flex items-center bg-amber-100/70 dark:bg-gray-800 p-0.5 rounded-xl border border-amber-600/10 dark:border-gray-700 text-xs font-bold">
                            <button
                                onClick={() => setNavType('page')}
                                className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                                    navType === 'page' ? 'bg-amber-600 text-white shadow-xs' : 'text-amber-900 dark:text-gray-300 hover:text-amber-700'
                                }`}
                            >
                                صفحة
                            </button>
                            <button
                                onClick={() => {
                                    setNavType('surah');
                                    setIsSurahModalOpen(true);
                                }}
                                className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                                    navType === 'surah' ? 'bg-amber-600 text-white shadow-xs' : 'text-amber-900 dark:text-gray-300 hover:text-amber-700'
                                }`}
                            >
                                سورة
                            </button>
                            <button
                                onClick={() => setNavType('juz')}
                                className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                                    navType === 'juz' ? 'bg-amber-600 text-white shadow-xs' : 'text-amber-900 dark:text-gray-300 hover:text-amber-700'
                                }`}
                            >
                                جزء
                            </button>
                        </div>

                        {/* Page / Juz Selector Inputs */}
                        {navType === 'page' && (
                            <div className="flex items-center gap-1 bg-white dark:bg-gray-850 px-2 py-1 rounded-xl border border-amber-600/20 dark:border-gray-700 shadow-2xs">
                                <span className="text-xs font-bold text-amber-900 dark:text-amber-300">صفحة:</span>
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

                        {navType === 'juz' && (
                            <select
                                value={selectedJuz}
                                onChange={(e) => setSelectedJuz(parseInt(e.target.value))}
                                className="bg-white dark:bg-gray-850 px-2.5 py-1.5 rounded-xl border border-amber-600/20 dark:border-gray-700 text-xs font-bold text-amber-950 dark:text-white outline-none cursor-pointer shadow-2xs"
                            >
                                {Array.from({ length: 30 }, (_, i) => i + 1).map(j => (
                                    <option key={j} value={j}>{getJuzNameArabic(j)}</option>
                                ))}
                            </select>
                        )}

                        {/* Search trigger button */}
                        <button
                            onClick={() => setIsSearchOpen(true)}
                            className="p-2 bg-amber-100/60 dark:bg-gray-800 text-amber-900 dark:text-amber-300 hover:bg-amber-200/60 rounded-xl transition cursor-pointer border border-amber-600/10"
                            title="بحث في المصحف"
                        >
                            <Search className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Font & Display Controls */}
                    <div className="flex items-center gap-1.5">
                        {/* Font size - */}
                        <button
                            onClick={() => setFontSize(prev => Math.max(16, prev - 2))}
                            className="p-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:text-amber-600 transition cursor-pointer"
                            title="تصغير الخط"
                        >
                            <Minus className="w-3.5 h-3.5" />
                        </button>

                        <span className="text-xs font-bold text-amber-900 dark:text-amber-300 w-6 text-center font-mono">
                            {fontSize}
                        </span>

                        {/* Font size + */}
                        <button
                            onClick={() => setFontSize(prev => Math.min(42, prev + 2))}
                            className="p-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:text-amber-600 transition cursor-pointer"
                            title="تكبير الخط"
                        >
                            <Plus className="w-3.5 h-3.5" />
                        </button>

                        {/* Font family selector */}
                        <select
                            value={fontFamily}
                            onChange={(e) => setFontFamily(e.target.value)}
                            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-2 py-1 text-xs font-bold text-gray-800 dark:text-gray-200 outline-none cursor-pointer hidden sm:block"
                        >
                            {FONT_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </header>

            {/* Main Quran Canvas Container */}
            <main className="flex-1 max-w-4xl w-full mx-auto p-3 sm:p-6 flex flex-col justify-center">
                {loading ? (
                    <div className="w-full py-24 flex flex-col items-center justify-center gap-3">
                        <div className="w-10 h-10 border-4 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-xs text-amber-900/70 dark:text-amber-300/70 font-bold animate-pulse">جاري تحميل كلام الله تعالى...</p>
                    </div>
                ) : quranData.length === 0 ? (
                    <div className="w-full py-24 text-center text-gray-500 dark:text-gray-400 text-sm font-semibold">
                        لم يتم العثور على محتوى. الرجاء تحديد صفحة أو سورة.
                    </div>
                ) : (
                    <div 
                        className="relative"
                        onTouchStart={handleTouchStart}
                        onTouchEnd={handleTouchEnd}
                    >
                        {/* Page Navigation Buttons for Desktop */}
                        {navType === 'page' && currentPage < 604 && (
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, 604))}
                                className="absolute -left-4 md:-left-16 top-1/2 -translate-y-1/2 p-3 bg-white/95 dark:bg-gray-800/95 hover:bg-amber-600 hover:text-white rounded-full shadow-lg border border-amber-600/20 transition z-10 cursor-pointer hidden md:flex items-center justify-center hover:scale-105 text-amber-900 dark:text-amber-200"
                                title="الصفحة التالية"
                            >
                                <ChevronLeft className="w-6 h-6" />
                            </button>
                        )}

                        {navType === 'page' && currentPage > 1 && (
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                className="absolute -right-4 md:-right-16 top-1/2 -translate-y-1/2 p-3 bg-white/95 dark:bg-gray-800/95 hover:bg-amber-600 hover:text-white rounded-full shadow-lg border border-amber-600/20 transition z-10 cursor-pointer hidden md:flex items-center justify-center hover:scale-105 text-amber-900 dark:text-amber-200"
                                title="الصفحة السابقة"
                            >
                                <ChevronRight className="w-6 h-6" />
                            </button>
                        )}

                        {/* Physical Mushaf Border Frame */}
                        <div className="relative border-2 sm:border-4 border-amber-600/30 dark:border-amber-500/20 rounded-2xl p-4 sm:p-8 md:p-12 bg-[#FAF6EB] dark:bg-gray-900 text-gray-950 dark:text-gray-50 shadow-2xl min-h-[500px] w-full max-w-full overflow-hidden box-border flex flex-col justify-between transition-colors duration-300">
                            
                            {/* Inner Decorative border */}
                            <div className="absolute inset-2 border border-amber-600/10 dark:border-amber-500/10 rounded-xl pointer-events-none" />

                            {/* Page Header (Juz & Surah Names) */}
                            <div className="flex justify-between items-center border-b border-amber-600/15 pb-4 mb-6 text-xs md:text-sm text-[#78350f] dark:text-amber-400 font-extrabold select-none">
                                <span className="bg-amber-100/80 dark:bg-amber-950/40 px-3.5 py-1 rounded-full border border-amber-600/10">
                                    {getJuzNameArabic(quranData[0]?.ayahs[0]?.juz || 1)}
                                </span>
                                <span className="font-serif tracking-wide text-sm md:text-base text-amber-900 dark:text-amber-300">
                                    سورة {quranData.map(s => s.name).join(' و')}
                                </span>
                            </div>

                            {/* Quran Verses Flow */}
                            <div 
                                className="flex-1 leading-[2.6] tracking-wide text-justify select-text"
                                style={{ 
                                    fontFamily: fontFamily, 
                                    fontSize: `${fontSize}px`,
                                    direction: 'rtl',
                                    textJustify: 'inter-word'
                                }}
                            >
                                {quranData.map((surah) => (
                                    <div key={surah.number} className="mb-6">
                                        {/* Surah Header Banner */}
                                        <div className="my-4 text-center select-none">
                                            <div className="relative py-1.5 flex items-center justify-center">
                                                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                                    <div className="w-full border-t border-dashed border-amber-400/60 dark:border-amber-700/40"></div>
                                                </div>
                                                <div className="relative px-6 py-1 bg-amber-100/90 dark:bg-gray-800 border-2 border-amber-500/60 text-amber-950 dark:text-amber-200 font-extrabold text-xs md:text-sm rounded-full shadow-xs flex items-center gap-2">
                                                    <span>◈ سُورَة {surah.name} ◈</span>
                                                </div>
                                            </div>
                                            
                                            {/* Basmalah Banner */}
                                            {surah.number !== 9 && (
                                                <div className="block text-center text-amber-900/90 dark:text-amber-300/90 py-3 font-serif text-sm md:text-base tracking-wide select-none">
                                                    بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                                                </div>
                                            )}
                                        </div>

                                        {/* Verses */}
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
                                                    <span key={ayah.numberInSurah} className="inline font-serif">
                                                        <span>{text}</span>
                                                        <span className="text-amber-700 dark:text-amber-400 font-sans mx-1.5 select-none font-bold text-xs md:text-sm inline-block align-middle">
                                                            ﴿{ayah.numberInSurah}﴾
                                                        </span>
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Page Footer Navigation */}
                            {navType === 'page' && (
                                <div className="border-t border-amber-600/15 pt-4 mt-6 flex justify-between items-center text-xs md:text-sm text-[#78350f] dark:text-amber-400 font-extrabold select-none">
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                        disabled={currentPage === 1}
                                        className="px-3 py-1.5 bg-amber-100/80 hover:bg-amber-200/80 dark:bg-gray-800 dark:hover:bg-gray-750 border border-amber-600/10 rounded-lg text-xs transition disabled:opacity-30 cursor-pointer flex items-center gap-1 font-bold"
                                    >
                                        <ChevronRight className="w-3.5 h-3.5" />
                                        <span>السابقة</span>
                                    </button>

                                    <span className="font-sans text-sm md:text-base bg-amber-100/90 dark:bg-amber-950/50 px-5 py-1 rounded-full text-[#78350f] dark:text-amber-300 font-extrabold shadow-inner border border-amber-600/10">
                                        صفحة {currentPage}
                                    </span>

                                    <button
                                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, 604))}
                                        disabled={currentPage === 604}
                                        className="px-3 py-1.5 bg-amber-100/80 hover:bg-amber-200/80 dark:bg-gray-800 dark:hover:bg-gray-750 border border-amber-600/10 rounded-lg text-xs transition disabled:opacity-30 cursor-pointer flex items-center gap-1 font-bold"
                                    >
                                        <span>التالية</span>
                                        <ChevronLeft className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            )}
                        </div>
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

            {/* Search Drawer Modal */}
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
                            className="bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl border border-amber-600/20"
                        >
                            <header className="p-4 border-b dark:border-gray-800 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Search className="w-5 h-5 text-amber-600" />
                                    <h3 className="font-extrabold text-base text-gray-900 dark:text-white">البحث السريع في القرآن الكريم</h3>
                                </div>
                                <button onClick={() => setIsSearchOpen(false)} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                                    <X className="w-5 h-5" />
                                </button>
                            </header>

                            <div className="p-4 border-b dark:border-gray-800">
                                <input
                                    type="text"
                                    placeholder="اكتب كلمة أو آية للبحث..."
                                    value={searchQuery}
                                    onChange={(e) => handleSearch(e.target.value)}
                                    className="w-full p-3 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-amber-500"
                                    autoFocus
                                />
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                {searchResults.length === 0 ? (
                                    <p className="text-center text-xs text-gray-400 py-8 font-semibold">
                                        {searchQuery.trim() ? "لم يتم العثور على نتائج متطابقة" : "اكتب كلمتك للبدء بالبحث في جميع السور"}
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
                                            className="w-full text-right p-3 bg-amber-50/50 dark:bg-gray-800/60 hover:bg-amber-100/60 dark:hover:bg-gray-800 rounded-xl border border-amber-600/10 transition cursor-pointer flex flex-col gap-1"
                                        >
                                            <div className="flex justify-between items-center text-xs font-bold text-amber-900 dark:text-amber-300">
                                                <span>سورة {res.surahName} (آية {res.ayahNum})</span>
                                                <span className="text-[10px] bg-amber-200/60 dark:bg-amber-950 px-2 py-0.5 rounded-full">صفحة {res.page}</span>
                                            </div>
                                            <p className="text-sm font-serif text-gray-800 dark:text-gray-200 leading-relaxed">
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

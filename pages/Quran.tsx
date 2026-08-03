import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { 
    Search, X, BookMarked, ArrowRight, Copy, Share2, 
    Check, Sparkles, Sliders, Type, ChevronLeft, ChevronRight, BookmarkCheck
} from 'lucide-react';
import { surahs } from '../constants';
import { 
    fetchQuranPage, 
    getQuranData,
    QuranSurahRange 
} from '../utils/quranTextManager';

interface QuranPageProps {
    onBack?: () => void;
}

export function toArabicNumerals(num: number | string): string {
    if (num === undefined || num === null) return '';
    return num.toString().replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[parseInt(d, 10)]);
}

export function getJuzNameArabic(juzNum: number): string {
    const names = [
        "", "الجزء الأول", "الجزء الثاني", "الجزء الثالث", "الجزء الرابع", "الجزء الخامس",
        "الجزء السادس", "الجزء السابع", "الجزء الثامن", "الجزء التاسع", "الجزء العاشر",
        "الجزء الحادي عشر", "الجزء الثاني عشر", "الجزء الثالث عشر", "الجزء الرابع عشر", "الجزء الخامس عشر",
        "الجزء السادس عشر", "الجزء السابع عشر", "الجزء الثامن عشر", "الجزء التاسع عشر", "الجزء العشرون",
        "الجزء الحادي والعشرون", "الجزء الثاني والعشرون", "الجزء الثالث والعشرون", "الجزء الرابع والعشرون", "الجزء الخامس والعشرون",
        "الجزء السادس والعشرون", "الجزء السابع والعشرون", "الجزء الثامن والعشرون", "الجزء التاسع والعشرون", "الجزء الثلاثون"
    ];
    return names[juzNum] || `الجزء ${toArabicNumerals(juzNum)}`;
}

/**
 * Removes Arabic diacritics (Tashkeel, Harakat, Dagger Alef, Sukun, Shadda)
 * and normalizes letters for fast diacritics-insensitive search.
 */
export function stripArabicDiacritics(text: string): string {
    if (!text) return "";
    return text
        .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED]/g, '')
        .replace(/[أإآٱ]/g, 'ا')
        .replace(/ى/g, 'ي')
        .replace(/ة/g, 'ه')
        .trim()
        .toLowerCase();
}

export const QuranPage: React.FC<QuranPageProps> = ({ onBack }) => {
    // Automatically load last read page or default to 1 (Surah Al-Fatihah)
    const [currentPage, setCurrentPage] = useState<number>(() => {
        const saved = localStorage.getItem('last_read_quran_page');
        const num = saved ? parseInt(saved, 10) : 1;
        return (num >= 1 && num <= 604) ? num : 1;
    });

    const [quranData, setQuranData] = useState<QuranSurahRange[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    // Preferences
    const [fontSize, setFontSize] = useState<number>(() => {
        return parseInt(localStorage.getItem('quran_page_font_size') || '26', 10);
    });

    // Bookmarks
    const [bookmarkedPage, setBookmarkedPage] = useState<number | null>(() => {
        const saved = localStorage.getItem('quran_bookmark_page');
        return saved ? parseInt(saved, 10) : null;
    });

    // Selected Ayah for Action Sheet
    const [selectedAyah, setSelectedAyah] = useState<{
        surahName: string;
        surahNum: number;
        ayahNum: number;
        text: string;
        page: number;
    } | null>(null);

    // Search & Surah Modal State
    const [isSearchModalOpen, setIsSearchModalOpen] = useState<boolean>(false);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [searchResults, setSearchResults] = useState<{
        type: 'surah' | 'page' | 'juz' | 'ayah';
        title: string;
        subtitle: string;
        page: number;
        surahNum?: number;
        ayahNum?: number;
        text?: string;
    }[]>([]);
    const [isSearching, setIsSearching] = useState<boolean>(false);

    // Drag / Swipe Feedback
    const [dragX, setDragX] = useState<number>(0);

    // Toast notification
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 2500);
    };

    // Save preferences and last read page
    useEffect(() => {
        localStorage.setItem('quran_page_font_size', fontSize.toString());
    }, [fontSize]);

    useEffect(() => {
        if (currentPage >= 1 && currentPage <= 604) {
            localStorage.setItem('last_read_quran_page', currentPage.toString());
        }
    }, [currentPage]);

    // Handle mobile back button for modals
    useEffect(() => {
        if (isSearchModalOpen || selectedAyah) {
            try {
                window.history.pushState({ quranModalOpen: true }, '');
            } catch (e) {}

            const handlePopState = () => {
                setIsSearchModalOpen(false);
                setSelectedAyah(null);
            };

            window.addEventListener('popstate', handlePopState);
            return () => window.removeEventListener('popstate', handlePopState);
        }
    }, [isSearchModalOpen, selectedAyah]);

    // Load page content whenever currentPage changes
    useEffect(() => {
        let isMounted = true;
        const loadContent = async () => {
            setLoading(true);
            try {
                const data = await fetchQuranPage(currentPage);
                if (isMounted) {
                    setQuranData(data);
                }
            } catch (err) {
                console.error("Error loading Quran page content:", err);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        loadContent();
        return () => { isMounted = false; };
    }, [currentPage]);

    // Keyboard Navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (isSearchModalOpen || selectedAyah) return;
            if (e.key === 'ArrowLeft') {
                // Next page in RTL (Page increments)
                setCurrentPage(prev => Math.min(prev + 1, 604));
            } else if (e.key === 'ArrowRight') {
                // Previous page in RTL (Page decrements)
                setCurrentPage(prev => Math.max(prev - 1, 1));
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isSearchModalOpen, selectedAyah]);

    // Fast Diacritics-Insensitive Search
    const handleSearchInput = async (queryText: string) => {
        setSearchQuery(queryText);
        if (!queryText.trim()) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        try {
            const cleanQuery = queryText.trim();
            const normQuery = stripArabicDiacritics(cleanQuery);
            const digitsOnly = cleanQuery.replace(/[^\d0-9١٢٣٤٥٦٧٨٩٠]/g, '');
            let parsedNum: number | null = null;
            if (digitsOnly) {
                const standardDigits = digitsOnly.replace(/[١٢٣٤٥٦٧٨٩٠]/g, d => '١٢٣٤٥٦٧٨٩٠'.indexOf(d).toString());
                parsedNum = parseInt(standardDigits, 10);
            }

            const results: {
                type: 'surah' | 'page' | 'juz' | 'ayah';
                title: string;
                subtitle: string;
                page: number;
                surahNum?: number;
                ayahNum?: number;
                text?: string;
            }[] = [];

            // 1. Direct Page Match
            if (parsedNum && parsedNum >= 1 && parsedNum <= 604) {
                results.push({
                    type: 'page',
                    title: `صفحة رقم ${toArabicNumerals(parsedNum)}`,
                    subtitle: `انتقال مباشر لصفحة المصحف الشريف`,
                    page: parsedNum
                });
            }

            // 2. Direct Juz Match
            if (parsedNum && parsedNum >= 1 && parsedNum <= 30) {
                const juzPages = [1, 22, 42, 62, 82, 102, 122, 142, 162, 182, 202, 222, 242, 262, 282, 302, 322, 342, 362, 382, 402, 422, 442, 462, 482, 502, 522, 542, 562, 582];
                results.push({
                    type: 'juz',
                    title: getJuzNameArabic(parsedNum),
                    subtitle: `بداية الجزء رقم ${toArabicNumerals(parsedNum)} في الصفحة ${toArabicNumerals(juzPages[parsedNum - 1])}`,
                    page: juzPages[parsedNum - 1]
                });
            }

            // 3. Search Surah Names
            for (let i = 0; i < surahs.length; i++) {
                const s = surahs[i];
                const normSurah = stripArabicDiacritics(s.name);
                if (normSurah.includes(normQuery) || normQuery.includes(normSurah)) {
                    // Start page of Surah
                    const qData = await getQuranData();
                    const allSurahs = qData.data ? qData.data.surahs : (qData.surahs || []);
                    const surahObj = allSurahs[i];
                    const startPage = surahObj?.ayahs?.[0]?.page || 1;

                    results.push({
                        type: 'surah',
                        title: `سورة ${s.name}`,
                        subtitle: `${toArabicNumerals(s.verses)} آية • صفحة ${toArabicNumerals(startPage)}`,
                        page: startPage,
                        surahNum: i + 1
                    });
                }
            }

            // 4. Search Ayah Text in full Quran JSON (without Tashkeel!)
            const fullQuran = await getQuranData();
            const allSurahs = fullQuran?.data?.surahs || fullQuran?.surahs || [];

            for (const surah of allSurahs) {
                if (results.length >= 35) break;
                for (const ayah of (surah.ayahs || [])) {
                    const normAyahText = stripArabicDiacritics(ayah.text);
                    if (normAyahText.includes(normQuery)) {
                        const exists = results.some(r => r.type === 'ayah' && r.page === ayah.page && r.surahNum === surah.number && r.ayahNum === ayah.numberInSurah);
                        if (!exists) {
                            results.push({
                                type: 'ayah',
                                title: `سورة ${surah.name} - آية ${toArabicNumerals(ayah.numberInSurah)}`,
                                subtitle: ayah.text,
                                page: ayah.page,
                                surahNum: surah.number,
                                ayahNum: ayah.numberInSurah,
                                text: ayah.text
                            });
                        }
                    }
                    if (results.length >= 35) break;
                }
            }

            setSearchResults(results);
        } catch (e) {
            console.error("Quran search error:", e);
        } finally {
            setIsSearching(false);
        }
    };

    // Handle Drag End for Natural Physical Page Swipe
    const handleDragEnd = (_: any, info: PanInfo) => {
        const offset = info.offset.x;
        const velocity = info.velocity.x;

        setDragX(0);

        // Swiping Left (negative offset) -> Next Page (RTL page increments)
        if (offset < -50 || velocity < -300) {
            if (currentPage < 604) {
                setCurrentPage(prev => prev + 1);
            }
        } 
        // Swiping Right (positive offset) -> Previous Page (RTL page decrements)
        else if (offset > 50 || velocity > 300) {
            if (currentPage > 1) {
                setCurrentPage(prev => prev - 1);
            }
        }
    };

    // Bookmark Toggle
    const handleToggleBookmark = () => {
        if (bookmarkedPage === currentPage) {
            setBookmarkedPage(null);
            localStorage.removeItem('quran_bookmark_page');
            showToast('تم إزالة العلامة المرجعية');
        } else {
            setBookmarkedPage(currentPage);
            localStorage.setItem('quran_bookmark_page', currentPage.toString());
            showToast(`تم حفظ العلامة المرجعية عند الصفحة ${toArabicNumerals(currentPage)}`);
        }
    };

    // Copy Ayah
    const handleCopyAyah = () => {
        if (!selectedAyah) return;
        const formatted = `﴿${selectedAyah.text}﴾ [سورة ${selectedAyah.surahName}: ${toArabicNumerals(selectedAyah.ayahNum)}]`;
        navigator.clipboard.writeText(formatted);
        showToast('تم نسخ الآية بنجاح!');
        setSelectedAyah(null);
    };

    // Share Ayah
    const handleShareAyah = async () => {
        if (!selectedAyah) return;
        const formatted = `﴿${selectedAyah.text}﴾ [سورة ${selectedAyah.surahName}: ${toArabicNumerals(selectedAyah.ayahNum)}]`;
        if (navigator.share) {
            try {
                await navigator.share({
                    title: `آية من سورة ${selectedAyah.surahName}`,
                    text: formatted,
                });
            } catch (e) {}
        } else {
            navigator.clipboard.writeText(formatted);
            showToast('تم نسخ نص الآية للمشاركة!');
        }
        setSelectedAyah(null);
    };

    // First Surah and Juz on current page
    const currentPrimarySurah = quranData[0]?.name || 'المصحف الشريف';
    const currentPrimaryJuz = quranData[0]?.ayahs[0]?.juz || 1;

    return (
        <div className="fixed inset-0 z-[100] w-full h-full bg-[#FAF6EB] dark:bg-[#11141c] text-amber-950 dark:text-amber-50 flex flex-col justify-between overflow-hidden select-none font-sans dir-rtl">
            
            {/* Top Control Overlay (Minimal & Non-Intrusive) */}
            <div className="flex-shrink-0 px-4 py-2 sm:py-3 bg-[#FAF6EB]/90 dark:bg-[#11141c]/90 backdrop-blur-md border-b border-amber-900/10 dark:border-amber-500/15 flex items-center justify-between z-10">
                {/* Back Button */}
                <button 
                    onClick={onBack}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-900/5 dark:bg-amber-400/10 hover:bg-amber-900/15 dark:hover:bg-amber-400/20 text-amber-900 dark:text-amber-200 text-xs font-bold transition cursor-pointer"
                >
                    <ArrowRight className="w-4 h-4" />
                    <span>رجوع</span>
                </button>

                {/* Central Surah & Search Trigger */}
                <button 
                    onClick={() => {
                        setIsSearchModalOpen(true);
                        setSearchQuery('');
                        setSearchResults([]);
                    }}
                    className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-900/10 dark:bg-amber-400/15 hover:bg-amber-900/20 dark:hover:bg-amber-400/25 border border-amber-900/15 dark:border-amber-500/30 text-amber-950 dark:text-amber-100 text-xs sm:text-sm font-bold transition cursor-pointer shadow-2xs"
                >
                    <Search className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                    <span className="truncate max-w-[130px] sm:max-w-[200px]">{currentPrimarySurah}</span>
                    <span className="text-[10px] bg-amber-800/10 dark:bg-amber-300/20 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-full font-mono">
                        فهرس وبحث
                    </span>
                </button>

                {/* Actions: Bookmark & Font Size */}
                <div className="flex items-center gap-1.5">
                    <button
                        onClick={handleToggleBookmark}
                        className={`p-2 rounded-xl transition cursor-pointer ${
                            bookmarkedPage === currentPage 
                                ? 'bg-amber-600 text-white shadow-sm' 
                                : 'bg-amber-900/5 dark:bg-amber-400/10 text-amber-800 dark:text-amber-300 hover:bg-amber-900/15'
                        }`}
                        title="حفظ علامة مرجعية"
                    >
                        <BookMarked className="w-4 h-4" />
                    </button>
                    
                    <button
                        onClick={() => setFontSize(prev => prev >= 34 ? 20 : prev + 2)}
                        className="p-2 rounded-xl bg-amber-900/5 dark:bg-amber-400/10 text-amber-800 dark:text-amber-300 hover:bg-amber-900/15 transition cursor-pointer"
                        title="تغيير حجم الخط"
                    >
                        <Type className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Main Quran Canvas Display (Natural Drag & Physical Page Turn) */}
            <div className="flex-1 relative overflow-hidden flex items-center justify-center p-2 sm:p-4">
                <motion.div
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={0.4}
                    onDrag={(_, info) => setDragX(info.offset.x)}
                    onDragEnd={handleDragEnd}
                    animate={{ x: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="w-full h-full max-w-2xl bg-[#FFFDF7] dark:bg-[#181d28] border-2 border-amber-900/20 dark:border-amber-500/20 rounded-2xl shadow-xl flex flex-col justify-between relative overflow-hidden p-3 sm:p-6 cursor-grab active:cursor-grabbing"
                    style={{
                        boxShadow: '0 10px 40px -10px rgba(180, 130, 60, 0.15)'
                    }}
                >
                    {/* Visual Bookmark Banner on page top if bookmarked */}
                    {bookmarkedPage === currentPage && (
                        <div className="absolute top-0 right-8 z-20">
                            <div className="bg-amber-600 text-white px-2 py-1 rounded-b-lg shadow-md flex items-center gap-1 text-[10px] font-bold">
                                <BookmarkCheck className="w-3 h-3" />
                                <span>علامة مرجعية</span>
                            </div>
                        </div>
                    )}

                    {/* Page Header inside frame */}
                    <div className="flex-shrink-0 flex items-center justify-between pb-2 border-b border-amber-900/15 dark:border-amber-500/20 text-xs sm:text-sm font-bold text-amber-900 dark:text-amber-300 tracking-wide">
                        <div>
                            <span>{currentPrimarySurah}</span>
                        </div>
                        <div className="text-amber-800/60 dark:text-amber-400/60 text-[11px] font-mono">
                            ﴿ القرآن الكريم ﴾
                        </div>
                        <div>
                            <span>{getJuzNameArabic(currentPrimaryJuz)}</span>
                        </div>
                    </div>

                    {/* Page Content Body (Uthmani Verse Flow) */}
                    <div className="flex-1 overflow-y-auto py-3 px-1 sm:px-3 my-auto flex flex-col justify-center scrollbar-thin scrollbar-thumb-amber-200 dark:scrollbar-thumb-gray-700">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-16 gap-3">
                                <div className="w-10 h-10 border-4 border-amber-700/30 border-t-amber-700 dark:border-amber-400/30 dark:border-t-amber-400 rounded-full animate-spin" />
                                <span className="text-xs font-bold text-amber-800 dark:text-amber-300">جاري تحميل الصفحة العثمانية...</span>
                            </div>
                        ) : (
                            <div className="space-y-6 text-center sm:text-justify leading-[2.6] sm:leading-[2.9] dir-rtl">
                                {quranData.map((surah) => {
                                    const isFirstAyahOfSurah = surah.ayahs[0]?.numberInSurah === 1;

                                    return (
                                        <div key={surah.number} className="relative">
                                            {/* Decorative Surah Header Frame if Surah begins on this page */}
                                            {isFirstAyahOfSurah && (
                                                <div className="my-4 py-2 px-4 rounded-xl bg-gradient-to-r from-amber-100/80 via-amber-200/50 to-amber-100/80 dark:from-amber-950/40 dark:via-amber-900/30 dark:to-amber-950/40 border-y-2 border-amber-800/30 dark:border-amber-500/30 text-center relative shadow-2xs">
                                                    <span className="text-sm sm:text-base font-bold text-amber-950 dark:text-amber-200 font-serif">
                                                        ❖ سُورَةُ {surah.name.replace(/^سورة\s+/, '')} ❖
                                                    </span>
                                                </div>
                                            )}

                                            {/* Decorative Bismillah Header if applicable */}
                                            {isFirstAyahOfSurah && surah.number !== 1 && surah.number !== 9 && (
                                                <div className="text-center py-2 text-base sm:text-xl font-serif text-amber-900 dark:text-amber-300 tracking-wide">
                                                    بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
                                                </div>
                                            )}

                                            {/* Verses Flow in Uthmani Script */}
                                            <div 
                                                className="text-amber-950 dark:text-amber-100 transition-all font-serif"
                                                style={{ 
                                                    fontSize: `${fontSize}px`,
                                                    fontFamily: "'Amiri Quran', 'Scheherazade New', 'Traditional Arabic', serif",
                                                    wordSpacing: '2px'
                                                }}
                                            >
                                                {surah.ayahs.map((ayah) => {
                                                    // Clean Bismillah prefix if ayah 1 of non-fatihah/tawbah
                                                    let cleanText = ayah.text;
                                                    if (ayah.numberInSurah === 1 && surah.number !== 1 && surah.number !== 9) {
                                                        cleanText = cleanText
                                                            .replace(/^بِسْمِ\s+ٱللَّهِ\s+ٱلرَّحْمَٰنِ\s+ٱلرَّحِيمِ\s*/, '')
                                                            .replace(/^بِسْمِ\s+اللَّهِ\s+الرَّحْمَٰنِ\s+الرَّحِيمِ\s*/, '');
                                                    }

                                                    const isSelected = selectedAyah?.surahNum === surah.number && selectedAyah?.ayahNum === ayah.numberInSurah;

                                                    return (
                                                        <React.Fragment key={ayah.numberInSurah}>
                                                            <span
                                                                onClick={() => setSelectedAyah({
                                                                    surahName: surah.name,
                                                                    surahNum: surah.number,
                                                                    ayahNum: ayah.numberInSurah,
                                                                    text: ayah.text,
                                                                    page: currentPage
                                                                })}
                                                                className={`inline cursor-pointer rounded-md transition-all duration-200 px-1 py-0.5 hover:bg-amber-200/50 dark:hover:bg-amber-900/40 ${
                                                                    isSelected 
                                                                        ? 'bg-amber-300/80 dark:bg-amber-700/60 text-amber-950 dark:text-white font-bold ring-2 ring-amber-500/50' 
                                                                        : ''
                                                                }`}
                                                            >
                                                                {cleanText}
                                                            </span>
                                                            <span className="inline-block mx-1 font-sans font-bold text-amber-800 dark:text-amber-400 select-none text-[85%]">
                                                                ﴿{toArabicNumerals(ayah.numberInSurah)}﴾
                                                            </span>
                                                        </React.Fragment>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Page Footer inside frame */}
                    <div className="flex-shrink-0 pt-2 border-t border-amber-900/15 dark:border-amber-500/20 flex items-center justify-between text-xs font-bold text-amber-900 dark:text-amber-300">
                        {/* Right Quick Nav Button */}
                        <button
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, 604))}
                            disabled={currentPage >= 604}
                            className="flex items-center gap-1 opacity-70 hover:opacity-100 disabled:opacity-20 cursor-pointer"
                        >
                            <ChevronRight className="w-4 h-4" />
                            <span className="hidden sm:inline">الصفحة التالية</span>
                        </button>

                        {/* Page Number Badge */}
                        <div className="bg-amber-900/10 dark:bg-amber-400/15 px-3 py-1 rounded-full text-amber-950 dark:text-amber-100 font-bold font-mono">
                            — {toArabicNumerals(currentPage)} —
                        </div>

                        {/* Left Quick Nav Button */}
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage <= 1}
                            className="flex items-center gap-1 opacity-70 hover:opacity-100 disabled:opacity-20 cursor-pointer"
                        >
                            <span className="hidden sm:inline">الصفحة السابقة</span>
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                    </div>
                </motion.div>
            </div>

            {/* Floating Toast Feedback */}
            <AnimatePresence>
                {toastMessage && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[300] bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-4 py-2.5 rounded-full text-xs sm:text-sm font-bold shadow-2xl flex items-center gap-2"
                    >
                        <Check className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
                        <span>{toastMessage}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Ayah Action Bottom Sheet */}
            <AnimatePresence>
                {selectedAyah && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 z-[200] flex flex-col justify-end"
                        onClick={() => setSelectedAyah(null)}
                    >
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", stiffness: 350, damping: 35 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white dark:bg-gray-900 rounded-t-3xl p-5 max-w-lg mx-auto w-full border-t dark:border-gray-800 shadow-2xl flex flex-col gap-4 dir-rtl"
                        >
                            <div className="flex items-center justify-between border-b dark:border-gray-800 pb-3">
                                <div className="font-bold text-amber-900 dark:text-amber-300 text-sm sm:text-base">
                                    سورة {selectedAyah.surahName} - الآية {toArabicNumerals(selectedAyah.ayahNum)}
                                </div>
                                <button 
                                    onClick={() => setSelectedAyah(null)}
                                    className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="bg-amber-50 dark:bg-gray-800 p-3.5 rounded-2xl border border-amber-900/10 dark:border-gray-700 text-center font-serif text-base sm:text-lg text-amber-950 dark:text-amber-100 leading-relaxed">
                                ﴿{selectedAyah.text}﴾
                            </div>

                            <div className="grid grid-cols-2 gap-2.5 pt-1">
                                <button
                                    onClick={handleCopyAyah}
                                    className="flex items-center justify-center gap-2 p-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs sm:text-sm transition cursor-pointer shadow-sm"
                                >
                                    <Copy className="w-4 h-4" />
                                    <span>نسخ الآية</span>
                                </button>

                                <button
                                    onClick={handleShareAyah}
                                    className="flex items-center justify-center gap-2 p-3 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 font-bold text-xs sm:text-sm transition cursor-pointer"
                                >
                                    <Share2 className="w-4 h-4" />
                                    <span>مشاركة</span>
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Unified Surah Index & Fast Search Popup Modal */}
            <AnimatePresence>
                {isSearchModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/70 backdrop-blur-xs z-[250] flex flex-col justify-end sm:justify-center p-0 sm:p-4"
                        onClick={() => setIsSearchModalOpen(false)}
                    >
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", stiffness: 350, damping: 35 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-3xl h-[85vh] sm:h-[80vh] max-w-xl mx-auto w-full flex flex-col shadow-2xl border-t dark:border-gray-800 overflow-hidden dir-rtl"
                        >
                            {/* Modal Header */}
                            <div className="p-4 border-b dark:border-gray-800 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Search className="w-5 h-5 text-amber-600" />
                                    <h3 className="font-bold text-base text-gray-900 dark:text-white">فهرس المصحف والبحث</h3>
                                </div>
                                <button
                                    onClick={() => setIsSearchModalOpen(false)}
                                    className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Search Input Box */}
                            <div className="p-3.5 border-b dark:border-gray-800 bg-gray-50/50 dark:bg-gray-850">
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="ابحث برقم الصفحة، اسم السورة، الجزء، أو نص الآية بدون تشكيل..."
                                        value={searchQuery}
                                        onChange={(e) => handleSearchInput(e.target.value)}
                                        className="w-full pl-10 pr-10 py-3 rounded-2xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs"
                                        autoFocus
                                    />
                                    <Search className="absolute top-1/2 right-3.5 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    {searchQuery && (
                                        <button
                                            onClick={() => {
                                                setSearchQuery('');
                                                setSearchResults([]);
                                            }}
                                            className="absolute top-1/2 left-3.5 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 cursor-pointer"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Search Results OR Surahs List */}
                            <div className="flex-1 overflow-y-auto p-3 space-y-2">
                                {isSearching ? (
                                    <div className="py-12 text-center text-xs font-bold text-gray-500 dark:text-gray-400 flex items-center justify-center gap-2">
                                        <div className="w-5 h-5 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
                                        <span>جاري البحث في المصحف...</span>
                                    </div>
                                ) : searchQuery.trim() ? (
                                    /* Search Results View */
                                    searchResults.length === 0 ? (
                                        <div className="py-12 text-center text-xs font-bold text-gray-400">
                                            لا توجد نتائج مطابقة للبحث
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <div className="text-xs font-bold text-gray-400 px-2 pb-1">
                                                نتائج البحث ({toArabicNumerals(searchResults.length)}):
                                            </div>
                                            {searchResults.map((res, idx) => (
                                                <button
                                                    key={idx}
                                                    onClick={() => {
                                                        setCurrentPage(res.page);
                                                        setIsSearchModalOpen(false);
                                                        if (res.surahNum && res.ayahNum && res.text) {
                                                            setSelectedAyah({
                                                                surahName: res.title.replace(/^سورة\s+/, ''),
                                                                surahNum: res.surahNum,
                                                                ayahNum: res.ayahNum,
                                                                text: res.text,
                                                                page: res.page
                                                            });
                                                        }
                                                    }}
                                                    className="w-full text-right p-3.5 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800/80 hover:bg-amber-50 dark:hover:bg-gray-700/60 transition flex flex-col gap-1 cursor-pointer shadow-2xs"
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-bold text-sm text-amber-900 dark:text-amber-300">
                                                            {res.title}
                                                        </span>
                                                        <span className="text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40 px-2.5 py-1 rounded-full">
                                                            صفحة {toArabicNumerals(res.page)}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2 leading-relaxed font-serif">
                                                        {res.subtitle}
                                                    </p>
                                                </button>
                                            ))}
                                        </div>
                                    )
                                ) : (
                                    /* Default Surahs Index List */
                                    <div className="space-y-1.5">
                                        <div className="text-xs font-bold text-gray-400 px-2 pb-1 flex items-center justify-between">
                                            <span>سور القرآن الكريم (١١٤ سورة):</span>
                                            <span>الصفحة</span>
                                        </div>
                                        {surahs.map((s, idx) => {
                                            const surahNum = idx + 1;
                                            // Approximate standard Mushaf starting page for each surah
                                            const startPages = [1, 2, 50, 77, 106, 128, 151, 177, 187, 208, 221, 235, 249, 255, 262, 267, 282, 293, 305, 312, 322, 332, 342, 350, 359, 367, 377, 385, 396, 404, 411, 415, 418, 428, 434, 440, 446, 453, 467, 477, 483, 489, 496, 499, 502, 507, 511, 515, 518, 520, 523, 526, 528, 531, 534, 537, 542, 545, 549, 551, 553, 554, 556, 558, 560, 562, 564, 566, 568, 570, 572, 574, 575, 577, 578, 580, 582, 583, 585, 586, 587, 587, 589, 590, 591, 592, 593, 594, 595, 595, 596, 596, 597, 597, 598, 598, 599, 599, 600, 600, 601, 601, 601, 602, 602, 602, 603, 603, 603, 604, 604, 604, 604, 604];
                                            const targetPage = startPages[idx] || 1;

                                            return (
                                                <button
                                                    key={s.name}
                                                    onClick={() => {
                                                        setCurrentPage(targetPage);
                                                        setIsSearchModalOpen(false);
                                                    }}
                                                    className="w-full text-right p-3 rounded-2xl hover:bg-amber-50 dark:hover:bg-gray-800 transition flex items-center justify-between border-b border-gray-100 dark:border-gray-800/60 cursor-pointer"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <span className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-300 font-bold text-xs flex items-center justify-center font-mono">
                                                            {toArabicNumerals(surahNum)}
                                                        </span>
                                                        <div>
                                                            <div className="font-bold text-sm text-gray-900 dark:text-gray-100">
                                                                سورة {s.name}
                                                            </div>
                                                            <div className="text-[11px] text-gray-500 dark:text-gray-400">
                                                                عدد آياتها {toArabicNumerals(s.verses)} آية
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <span className="text-xs font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-xl">
                                                        صفحة {toArabicNumerals(targetPage)}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
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

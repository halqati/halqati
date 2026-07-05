
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes, FaCamera, FaUpload, FaMagic, FaCheck, FaExclamationCircle, FaUserCheck, FaUserTimes, FaSpinner, FaWifi, FaEdit, FaTrash, FaCheckCircle, FaPlus, FaLayerGroup } from 'react-icons/fa';
import { Session, SessionStudent, Student } from '../types';
import { formatStudentId } from '../utils/helpers';
import { surahs } from '../constants';

interface SmartScanModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentSession: Session;
    allStudents: Student[];
    onApply: (updates: any[], adoptionMode: 'update_only' | 'rebuild_session') => void;
    addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const SurahSelectorInput: React.FC<{
    value: string;
    onChange: (val: string) => void;
    placeholder: string;
}> = ({ value, onChange, placeholder }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: any) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filteredSurahs = surahs.filter(s => s.name.includes(search));

    return (
        <div ref={wrapperRef} className="relative w-full">
            <div className="flex gap-1 items-center bg-gray-50 dark:bg-gray-800 rounded-xl px-2.5 py-1 text-xs border border-gray-100 dark:border-gray-700/60 focus-within:ring-1 focus-within:ring-primary/20 transition-all font-medium text-right">
                <input
                    type="text"
                    value={value}
                    onChange={(e) => {
                        onChange(e.target.value);
                        setSearch(e.target.value);
                    }}
                    onFocus={() => setIsOpen(true)}
                    placeholder={placeholder}
                    className="w-full bg-transparent border-none text-xs text-gray-850 dark:text-gray-100 outline-none p-1 text-right"
                />
                {value && (
                    <button 
                        type="button" 
                        onClick={() => { onChange(''); setSearch(''); }}
                        className="text-[10px] text-gray-400 hover:text-red-500 font-bold transition-all p-1"
                    >
                        ×
                    </button>
                )}
            </div>
            {isOpen && (
                <div className="absolute right-0 top-[110%] w-full max-h-48 overflow-y-auto bg-white dark:bg-gray-900 border dark:border-gray-700 rounded-xl shadow-lg z-50 p-1 divide-y divide-gray-50 dark:divide-gray-800">
                    <input 
                        type="text"
                        placeholder="ابحث عن السورة..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full text-[10px] p-1.5 bg-gray-50 dark:bg-gray-800 border-none outline-none text-right font-medium text-gray-800 dark:text-gray-200 sticky top-0 rounded-lg mb-1"
                        autoFocus
                    />
                    {filteredSurahs.map(s => (
                        <button
                            key={s.name}
                            type="button"
                            onClick={() => {
                                onChange(s.name);
                                setIsOpen(false);
                                setSearch('');
                            }}
                            className="w-full text-right text-[11px] p-2 hover:bg-primary/10 dark:hover:bg-accent/10 hover:text-primary dark:hover:text-accent font-semibold transition-colors block text-gray-750 dark:text-gray-200"
                        >
                            {s.name} ({s.verses} آية)
                        </button>
                    ))}
                    {filteredSurahs.length === 0 && (
                        <div className="text-center p-2 text-[10px] text-gray-400">لا يوجد نتائج</div>
                    )}
                </div>
            )}
        </div>
    );
};

const FLYING_MESSAGES = [
    "يتم قراءة أسماء الطلاب...",
    "استخراج بيانات الحفظ...",
    "تحليل حالة الحضور...",
    "فحص بيانات المراجعة...",
    "مطابقة الهوية ST-XXXX...",
    "تنسيق البيانات الرقمية...",
    "التحقق من صحة السور...",
    "قراءة خط اليد بدقة..."
];

const SmartScanModal: React.FC<SmartScanModalProps> = ({ isOpen, onClose, currentSession, allStudents, onApply, addToast }) => {
    const [images, setImages] = useState<string[]>([]);
    const [isScanning, setIsScanning] = useState(false);
    const [scanProgress, setScanProgress] = useState(0);
    const [results, setResults] = useState<any[] | null>(null);
    const [activeMessage, setActiveMessage] = useState(0);
    const [adoptionMode, setAdoptionMode] = useState<'update_only' | 'rebuild_session'>('update_only');
    const [invalidStudents, setInvalidStudents] = useState<string[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const stats = useMemo(() => {
        if (!results) return null;
        const total = results.length;
        const presentCount = results.filter(r => r.attendance === 'present' || r.attendance === 'late' || !r.attendance).length;
        const absentCount = results.filter(r => r.attendance === 'absent').length;
        const lateCount = results.filter(r => r.attendance === 'late').length;
        const excusedCount = results.filter(r => r.attendance === 'excused').length;
        
        // Who recited (الذين سمّعوا) -> has fromSurah in memorization OR review
        const whoRecited = results.filter(r => {
            const hasMemoSurah = r.memorization?.fromSurah && r.memorization.fromSurah.trim() !== '';
            const hasRevSurah = r.review?.fromSurah && r.review.fromSurah.trim() !== '';
            const isAttending = r.attendance !== 'absent';
            return isAttending && (hasMemoSurah || hasRevSurah);
        }).length;

        // Present, who did not recite yet (الحاضرين الذين لم يُّسَمّعوا):
        const presentDidNotRecite = results.filter(r => {
            const isAttending = r.attendance !== 'absent' && r.attendance !== 'excused';
            const hasMemoSurah = r.memorization?.fromSurah && r.memorization.fromSurah.trim() !== '';
            const hasRevSurah = r.review?.fromSurah && r.review.fromSurah.trim() !== '';
            return isAttending && !hasMemoSurah && !hasRevSurah;
        }).length;

        // Neglected/Shortcomers (المقصرين): Present but didn't memorize and didn't review
        const neglected = results.filter(r => {
            const isAttending = r.attendance !== 'absent' && r.attendance !== 'excused';
            const hasMemoSurah = r.memorization?.fromSurah && r.memorization.fromSurah.trim() !== '';
            const hasRevSurah = r.review?.fromSurah && r.review.fromSurah.trim() !== '';
            return isAttending && !hasMemoSurah && !hasRevSurah;
        }).length;

        const attendees = total - absentCount;
        const attendanceRate = total > 0 ? Math.round((attendees / total) * 100) : 0;
        const achievementRate = attendees > 0 ? Math.round((whoRecited / attendees) * 100) : 0;

        return {
            total,
            presentCount,
            absentCount,
            lateCount,
            excusedCount,
            whoRecited,
            presentDidNotRecite,
            neglected,
            attendanceRate,
            achievementRate
        };
    }, [results]);

    // Dynamic message rotation during scan
    useEffect(() => {
        let interval: any;
        if (isScanning) {
            interval = setInterval(() => {
                setActiveMessage(prev => (prev + 1) % FLYING_MESSAGES.length);
            }, 1800);
        } else {
            setActiveMessage(0);
        }
        return () => clearInterval(interval);
    }, [isScanning]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files) {
            const remainingSpots = 4 - images.length;
            const filesToLoad = Array.from(files).slice(0, remainingSpots);
            
            filesToLoad.forEach(file => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    setImages(prev => [...prev, reader.result as string].slice(0, 4));
                };
                reader.readAsDataURL(file);
            });
        }
    };

    const startScan = async () => {
        if (images.length === 0) return;

        if (!navigator.onLine) {
            addToast('عذراً، يجب أن تكون متصلاً بالإنترنت لإتمام هذه العملية الذكية', 'error');
            return;
        }

        setIsScanning(true);
        setResults(null);
        setInvalidStudents([]);
        setScanProgress(0);
        
        const allProcessedStudents: any[] = [];
        const missingIds: string[] = [];

        try {
            for (let i = 0; i < images.length; i++) {
                setScanProgress(i + 1);
                const response = await fetch('/api/scan-recitation', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ image: images[i] })
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || `خطأ في الصفحة ${i + 1}`);
                }

                const data = await response.json();
                
                if (data.isForm && data.students) {
                    data.students.forEach((s: any) => {
                        const idMatch = s.id?.match(/\d+/);
                        const scanDigits = idMatch ? idMatch[0] : '';
                        
                        // Find matching student by comparing formatted ID digits (e.g. ST-5000 has digits "5000")
                        const matchingStudent = allStudents.find(st => {
                            const formattedId = formatStudentId(st.id);
                            const formattedMatch = formattedId.match(/\d+/);
                            const stDigits = formattedMatch ? formattedMatch[0] : '';
                            return scanDigits !== '' && stDigits === scanDigits;
                        });

                        const numericId = matchingStudent ? matchingStudent.id : (idMatch ? parseInt(idMatch[0]) : 0);
                        const existsInCircle = !!matchingStudent;
                        const existsInSession = currentSession.students.some(st => st.id === numericId);
                        
                        // Always include them in the results list so we can show them in red if they do not exist
                        const existingIdx = allProcessedStudents.findIndex(ps => ps.numericId === numericId);
                        if (existingIdx >= 0) {
                            allProcessedStudents[existingIdx] = { ...allProcessedStudents[existingIdx], ...s, numericId, existsInSession };
                        } else {
                            allProcessedStudents.push({ ...s, numericId, existsInSession });
                        }

                        if (!existsInCircle && s.id) {
                            if (!missingIds.includes(s.id)) missingIds.push(s.id);
                        }
                    });
                }
            }

            setResults(allProcessedStudents);
            setInvalidStudents(missingIds);
            
            if (missingIds.length > 0) {
                addToast(`تمت الجدولة بنجاح، لكن وجدنا ${missingIds.length} معرف طُلّاب غير مدرجين في هذه الجلسة.`, 'info');
            } else {
                addToast('تمت معالجة جميع الصفحات بنجاح', 'success');
            }
        } catch (error: any) {
            console.error(error);
            addToast(`خطأ في المعالجة: ${error.message}`, 'error');
        } finally {
            setIsScanning(false);
        }
    };

    const updateResultField = (idx: number, fieldPath: string, value: any) => {
        if (!results) return;
        const newResults = [...results];
        const res = { ...newResults[idx] };
        
        if (fieldPath.includes('.')) {
            const [parent, child] = fieldPath.split('.');
            res[parent] = { ...res[parent], [child]: value };
        } else {
            res[fieldPath] = value;
        }
        
        newResults[idx] = res;
        setResults(newResults);
    };

    const applyResults = () => {
        if (!results) return;
        onApply(results, adoptionMode);
        onClose();
    };

    const getStudentName = (id: number) => {
        return allStudents.find(s => s.id === id)?.name || "طالب غير معروف";
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/70 backdrop-blur-md"
                    />
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 30 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 30 }}
                        className={`bg-white dark:bg-gray-900 rounded-[2.5rem] w-full ${results ? 'max-w-5xl md:w-[94vw]' : 'max-w-lg'} overflow-hidden relative z-10 shadow-2xl flex flex-col max-h-[92vh] transition-all duration-300`}
                    >
                        {/* Header Area */}
                        <div className="p-6 border-b dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50 sticky top-0 z-40 backdrop-blur-md">
                            <div className="flex items-center gap-3 text-primary dark:text-accent font-bold">
                                <div className="p-2 bg-primary/10 rounded-xl">
                                    <FaMagic size={20} />
                                </div>
                                <h3 className="text-xl">فحص ومعاينة الكشف الذكي</h3>
                            </div>
                            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-150 dark:hover:bg-gray-800 rounded-full transition-all">
                                <FaTimes />
                            </button>
                        </div>

                        {/* Sticky Info & Stats Header */}
                        {results && (
                            <div className="sticky top-[73px] bg-white/95 dark:bg-gray-900/95 backdrop-blur-md z-30 border-b dark:border-gray-800 p-4 space-y-3 shadow-sm transition-all">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                    <div>
                                        <h4 className="font-extrabold text-sm text-gray-800 dark:text-white">إحصائيات الكشف الفورية</h4>
                                        <p className="text-[10px] text-gray-400">تم التعرف على ({results.length}) طلاب في المعالجة الحالية</p>
                                    </div>
                                    <button 
                                        onClick={() => { setResults(null); setImages([]); }} 
                                        className="text-[10px] bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-400 px-3 py-1.5 rounded-full font-bold transition-colors"
                                    >
                                        إلغاء والبدء من جديد
                                    </button>
                                </div>

                                {/* Comprehensive Stats Bento Grid */}
                                {stats && (
                                    <div className="grid grid-cols-2 sm:grid-cols-5 md:grid-cols-10 gap-2 w-full">
                                        <div className="p-2 bg-slate-50 dark:bg-slate-900/40 text-slate-700 dark:text-slate-300 border border-slate-100 dark:border-slate-800/60 rounded-xl flex flex-col items-center justify-center text-center">
                                            <span className="text-sm font-black tracking-tight">{stats.total}</span>
                                            <span className="text-[8px] font-bold mt-0.5 text-gray-500 whitespace-nowrap">الطلاب</span>
                                        </div>
                                        <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/30 rounded-xl flex flex-col items-center justify-center text-center">
                                            <span className="text-sm font-black tracking-tight">{stats.presentCount}</span>
                                            <span className="text-[8px] font-bold mt-0.5 text-emerald-500 whitespace-nowrap">الحاضرين</span>
                                        </div>
                                        <div className="p-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-800/30 rounded-xl flex flex-col items-center justify-center text-center">
                                            <span className="text-sm font-black tracking-tight">{stats.absentCount}</span>
                                            <span className="text-[8px] font-bold mt-0.5 text-red-500 whitespace-nowrap">الغياب</span>
                                        </div>
                                        <div className="p-2 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-800/30 rounded-xl flex flex-col items-center justify-center text-center">
                                            <span className="text-sm font-black tracking-tight">{stats.lateCount}</span>
                                            <span className="text-[8px] font-bold mt-0.5 text-amber-500 whitespace-nowrap">المتأخرين</span>
                                        </div>
                                        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800/30 rounded-xl flex flex-col items-center justify-center text-center">
                                            <span className="text-sm font-black tracking-tight">{stats.excusedCount}</span>
                                            <span className="text-[8px] font-bold mt-0.5 text-blue-500 whitespace-nowrap">المستأذنين</span>
                                        </div>
                                        <div className="p-2 bg-green-50/80 dark:bg-green-900/10 text-green-700 dark:text-green-400 border border-green-100/60 dark:border-green-800/30 rounded-xl flex flex-col items-center justify-center text-center">
                                            <span className="text-sm font-black tracking-tight">{stats.whoRecited}</span>
                                            <span className="text-[8px] font-bold mt-0.5 text-green-500 whitespace-nowrap">سمّعوا الجد والواجب</span>
                                        </div>
                                        <div className="p-2 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border border-rose-100/50 dark:border-rose-900/30 rounded-xl flex flex-col items-center justify-center text-center">
                                            <span className="text-sm font-black tracking-tight">{stats.presentDidNotRecite}</span>
                                            <span className="text-[8px] font-bold mt-0.5 text-rose-500 whitespace-nowrap">حاضر ولم يسمّع</span>
                                        </div>
                                        <div className="p-2 bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400 border border-orange-100/50 dark:border-orange-900/30 rounded-xl flex flex-col items-center justify-center text-center">
                                            <span className="text-sm font-black tracking-tight">{stats.neglected}</span>
                                            <span className="text-[8px] font-bold mt-0.5 text-orange-500 whitespace-nowrap">المقصرين</span>
                                        </div>
                                        <div className="p-2 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 border border-indigo-100/50 dark:border-indigo-900/30 rounded-xl flex flex-col items-center justify-center text-center">
                                            <span className="text-sm font-black tracking-tight">{stats.attendanceRate}%</span>
                                            <span className="text-[8px] font-bold mt-0.5 text-indigo-500 whitespace-nowrap">نسبة الحضور</span>
                                        </div>
                                        <div className="p-2 bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400 border border-purple-100/50 dark:border-purple-900/30 rounded-xl flex flex-col items-center justify-center text-center">
                                            <span className="text-sm font-black tracking-tight">{stats.achievementRate}%</span>
                                            <span className="text-[8px] font-bold mt-0.5 text-purple-500 whitespace-nowrap">نسبة الإنجاز</span>
                                        </div>
                                    </div>
                                )}

                                {/* Adoption Mode Selector */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center pt-1 border-t dark:border-gray-800">
                                    <div className="bg-gray-50 dark:bg-gray-850 p-1 rounded-2xl flex gap-1 border dark:border-gray-800">
                                        <button
                                            onClick={() => setAdoptionMode('update_only')}
                                            className={`flex-1 py-2 px-1 rounded-xl text-[10px] font-black transition-all flex items-center justify-center gap-2 ${adoptionMode === 'update_only' ? 'bg-white dark:bg-gray-800 text-primary dark:text-accent shadow-sm' : 'text-gray-400'}`}
                                        >
                                            <FaUserCheck size={11} />
                                            <span>تحديث المسجلين فقط</span>
                                        </button>
                                        <button
                                            onClick={() => setAdoptionMode('rebuild_session')}
                                            className={`flex-1 py-2 px-1 rounded-xl text-[10px] font-black transition-all flex items-center justify-center gap-2 ${adoptionMode === 'rebuild_session' ? 'bg-white dark:bg-gray-800 text-primary dark:text-accent shadow-sm' : 'text-gray-400'}`}
                                        >
                                            <FaLayerGroup size={11} />
                                            <span>تحديد أصحاب الكشف فقط</span>
                                        </button>
                                    </div>
                                    <p className="text-[9px] text-gray-400 leading-tight">
                                        {adoptionMode === 'update_only' 
                                            ? 'سيتم دمج وتحديث المعروضين بالكشف بالصور، مع بقاء باقي الطلاب بالجلسة دون تعديل لحضورهم.' 
                                            : 'تصفية طلاب الجلسة الحالية ليكونوا فقط هؤلاء المتواجدين بالصور والملتقطين بالكشف الذكي.'}
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="p-6 flex-grow overflow-y-auto">
                            {/* Offline Warning */}
                            {!navigator.onLine && (
                                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-100 dark:border-red-800 flex items-center gap-3 animate-pulse">
                                    <FaWifi className="text-red-500" />
                                    <p className="text-xs text-red-700 dark:text-red-400 font-bold">يرجى التحقق من اتصال الإنترنت للمتابعة</p>
                                </div>
                            )}

                            {images.length === 0 && (
                                <div className="space-y-6">
                                    <div className="text-center space-y-2">
                                        <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">الرجاء تصوير الكشف اليدوي أو اختيار صورة من المعرض (حتى 4 صفحات)</p>
                                    </div>
                                    <div className="grid grid-cols-1 gap-4">
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-[2rem] hover:border-primary dark:hover:border-accent hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-all group"
                                        >
                                            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                                <FaCamera size={28} className="text-gray-400 dark:text-gray-500 group-hover:text-primary dark:group-hover:text-accent" />
                                            </div>
                                            <p className="text-gray-600 dark:text-gray-300 font-bold">التقاط صورة الكشف اليدوي</p>
                                            <p className="text-[10px] text-gray-400 mt-1">يدعم الاستيراد المباشر من الكاميرا أو معرض الصور</p>
                                        </button>
                                    </div>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        className="hidden"
                                        ref={fileInputRef}
                                        onChange={handleFileChange}
                                    />
                                </div>
                            )}

                            {images.length > 0 && !results && !isScanning && (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-2 gap-3">
                                        {images.map((img, idx) => (
                                            <div key={idx} className="relative rounded-[1.5rem] overflow-hidden border dark:border-gray-800 shadow-md group h-40">
                                                <img src={img} alt={`Page ${idx + 1}`} className="w-full h-full object-cover" />
                                                <div className="absolute top-2 left-2 bg-black/60 text-white text-[9px] px-2 py-0.5 rounded-full font-bold">صفحة {idx + 1}</div>
                                                <button
                                                    onClick={() => setImages(prev => prev.filter((_, i) => i !== idx))}
                                                    className="absolute top-2 right-2 bg-red-500/80 text-white p-1.5 rounded-full hover:bg-red-600 transition-colors"
                                                >
                                                    <FaTrash size={10} />
                                                </button>
                                            </div>
                                        ))}
                                        {images.length < 4 && (
                                            <button
                                                onClick={() => fileInputRef.current?.click()}
                                                className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-[1.5rem] hover:border-primary dark:hover:border-accent hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-all h-40"
                                            >
                                                <FaPlus className="text-gray-300 mb-2" />
                                                <span className="text-[10px] font-bold text-gray-500">إضافة صفحة ورقة</span>
                                            </button>
                                        )}
                                    </div>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        className="hidden"
                                        ref={fileInputRef}
                                        onChange={handleFileChange}
                                    />
                                    <button
                                        onClick={startScan}
                                        disabled={isScanning || !navigator.onLine}
                                        className="w-full bg-primary dark:bg-accent text-white p-5 rounded-2xl font-bold flex items-center justify-center gap-3 shadow-xl hover:translate-y-[-2px] active:translate-y-0 transition-all disabled:opacity-50"
                                    >
                                        <FaMagic className="text-xl" />
                                        <span>بدء المعالجة لـ ({images.length}) صفحات</span>
                                    </button>
                                </div>
                            )}

                            {isScanning && (
                                <div className="flex flex-col items-center justify-center py-20 relative overflow-hidden h-[400px]">
                                    <div className="absolute inset-0 opacity-20">
                                        <div className="absolute top-10 left-1/4 w-32 h-32 bg-emerald-400 rounded-full blur-3xl animate-pulse" />
                                        <div className="absolute bottom-10 right-1/4 w-32 h-32 bg-blue-400 rounded-full blur-3xl animate-pulse" />
                                    </div>

                                    <div className="relative mb-12">
                                        <motion.div 
                                            animate={{ rotate: 360 }}
                                            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                                            className="w-36 h-36 border-4 border-emerald-100 border-t-emerald-500 rounded-full relative"
                                        />
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-900/30 rounded-full flex items-center justify-center shadow-inner flex-col">
                                                <FaMagic className="text-2xl text-emerald-500 animate-bounce" />
                                                <span className="text-[10px] font-black text-emerald-600 mt-1">{scanProgress}/{images.length}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="text-center relative z-10 w-full px-8">
                                        <p className="text-xl font-black text-gray-800 dark:text-white mb-2 tracking-tight">جاري قراءة البيانات</p>
                                        
                                        <div className="h-8 overflow-hidden relative mx-auto w-full max-w-[280px]">
                                            <AnimatePresence mode="wait">
                                                <motion.p
                                                    key={activeMessage}
                                                    initial={{ opacity: 0, scale: 0.8, y: 10 }}
                                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                                    exit={{ opacity: 0, scale: 1.1, y: -10 }}
                                                    className="text-emerald-600 dark:text-emerald-400 font-bold text-sm absolute inset-0 text-center flex items-center justify-center gap-2"
                                                >
                                                    <span className="w-1 h-1 bg-emerald-500 rounded-full animate-ping" />
                                                    {FLYING_MESSAGES[activeMessage]}
                                                </motion.p>
                                            </AnimatePresence>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {results && (
                                <div className="space-y-4">
                                    {/* Invalid Students Warning */}
                                    {invalidStudents.length > 0 && (
                                        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-[1.5rem] border border-amber-200 dark:border-amber-800 shadow-sm">
                                            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-2">
                                                <FaExclamationCircle />
                                                <h5 className="text-xs font-bold">تنبيه: معرفات طُلاب غير مدرجين بالحلقة</h5>
                                            </div>
                                            <p className="text-[10px] text-amber-700 dark:text-amber-300 mb-2 leading-relaxed">
                                                وجدنا معرفات الطلاب التالية في الكشف ولكنها غير موجودة أو مسجلة في هذه الحلقة. سيتم تجاهلهم تلقائياً عند الاعتماد والترحيل:
                                            </p>
                                            <div className="flex flex-wrap gap-1">
                                                {invalidStudents.map(id => (
                                                    <span key={id} className="text-[9px] font-mono bg-white dark:bg-gray-800 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800 text-amber-600">{id}</span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Responsive Student Bento Cards Grid */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4">
                                        {results.map((res: any, idx: number) => {
                                            const studentExists = allStudents.find(s => s.id === res.numericId);
                                            const inSession = currentSession.students.some(s => s.id === res.numericId);
                                            
                                            // Check whether student has suspension settings in session
                                            const isSuspendedMemo = studentExists?.suspendedMemorization;
                                            const isSuspendedRev = studentExists?.suspendedReview;

                                            return (
                                                <motion.div 
                                                    initial={{ opacity: 0, y: 20 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: idx * 0.03 }}
                                                    key={idx} 
                                                    className={`p-4 rounded-[2rem] border transition-all flex flex-col justify-between ${studentExists ? 'bg-white dark:bg-gray-800 border-gray-150/80 dark:border-gray-800 shadow-sm hover:shadow-md' : 'bg-red-50/70 dark:bg-red-950/20 border-red-200 dark:border-red-900/50 shadow-sm'}`}
                                                >
                                                    <div>
                                                        {/* Top row of card */}
                                                        <div className="flex justify-between items-start gap-2 mb-3">
                                                            <div className="flex flex-col">
                                                                <div className="flex items-center gap-2">
                                                                    {studentExists ? <FaUserCheck className="text-emerald-500" /> : <FaUserTimes className="text-red-500" />}
                                                                    <div className="flex flex-col">
                                                                        <p className={`font-black text-sm ${studentExists ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                                                            {getStudentName(res.numericId)}
                                                                        </p>
                                                                        {!inSession && studentExists && (
                                                                            <span className="text-[8px] bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 px-1.5 py-0.5 rounded-full w-fit mt-1 font-bold">
                                                                                ستتم إضافته للجلسة
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <span className="text-[9px] font-mono text-gray-400 mt-1">المعرف المدرج: {res.id || 'ST-XXXX'}</span>
                                                            </div>
                                                            
                                                            {/* Attendance selection */}
                                                            <div className="flex flex-col items-end gap-1">
                                                                <select 
                                                                    value={res.attendance || 'present'}
                                                                    onChange={(e) => updateResultField(idx, 'attendance', e.target.value)}
                                                                    className={`text-[11px] font-black px-3 py-1.5 rounded-xl border border-transparent outline-none cursor-pointer text-center ${
                                                                        res.attendance === 'present' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : 
                                                                        res.attendance === 'absent' ? 'bg-red-50 text-red-600 dark:bg-red-900/30' : 
                                                                        res.attendance === 'late' ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/30' :
                                                                        'bg-blue-50 text-blue-600 dark:bg-blue-900/30'
                                                                    }`}
                                                                >
                                                                    <option value="present">حاضر</option>
                                                                    <option value="late">متأخر</option>
                                                                    <option value="absent">غائب</option>
                                                                    <option value="excused">مستأذن</option>
                                                                </select>
                                                            </div>
                                                        </div>

                                                        {/* Optional Excuse Input (Excused Status Selected) */}
                                                        {res.attendance === 'excused' && (
                                                            <div className="mt-2 mb-3">
                                                                <input
                                                                    type="text"
                                                                    value={res.excuse || ''}
                                                                    onChange={(e) => updateResultField(idx, 'excuse', e.target.value)}
                                                                    placeholder="اكتب العذر هنا (اختياري)..."
                                                                    className="w-full text-[11px] p-2 bg-blue-50/50 dark:bg-blue-950/20 text-blue-800 dark:text-blue-200 border border-blue-100/60 dark:border-blue-900/40 rounded-xl outline-none focus:ring-1 focus:ring-blue-400 placeholder-blue-400 font-bold"
                                                                />
                                                            </div>
                                                        )}

                                                        {/* Fields of Memorization and Review */}
                                                        {studentExists && (
                                                            <div className="grid grid-cols-2 gap-3 mt-2 pt-2 border-t dark:border-gray-800">
                                                                {/* Memorization (الحفظ الجديد) */}
                                                                <div className="space-y-2 border-l dark:border-gray-850 pl-2">
                                                                    <div className="flex justify-between items-center">
                                                                        <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-450 flex items-center gap-1">حفظ الجديد</span>
                                                                        {isSuspendedMemo ? (
                                                                            <span className="text-[8px] font-black bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 px-1.5 py-0.5 rounded-full">موقوف</span>
                                                                        ) : (!res.memorization?.fromSurah || res.memorization.fromSurah.trim() === '') ? (
                                                                            <span className="text-[8px] font-black bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400 px-1.5 py-0.5 rounded-full">لم يحفظ تلقائياً ❌</span>
                                                                        ) : null}
                                                                    </div>
                                                                    
                                                                    {!isSuspendedMemo ? (
                                                                        <div className="space-y-1.5">
                                                                            <div>
                                                                                <label className="text-[8px] font-bold text-gray-400 block mb-0.5">من سورة:</label>
                                                                                <SurahSelectorInput 
                                                                                    value={res.memorization?.fromSurah || ''} 
                                                                                    onChange={(val) => {
                                                                                        updateResultField(idx, 'memorization.fromSurah', val);
                                                                                        if (!val) {
                                                                                            updateResultField(idx, 'memorization.fromAyah', '');
                                                                                            updateResultField(idx, 'memorization.toSurah', '');
                                                                                            updateResultField(idx, 'memorization.toAyah', '');
                                                                                        }
                                                                                    }} 
                                                                                    placeholder="البحث أو إدخال..."
                                                                                />
                                                                            </div>
                                                                            <div className="grid grid-cols-2 gap-1 items-center">
                                                                                <label className="text-[8px] font-bold text-gray-400">من آية:</label>
                                                                                <input 
                                                                                    type="text"
                                                                                    inputMode="numeric"
                                                                                    placeholder="آية"
                                                                                    value={res.memorization?.fromAyah || ''} 
                                                                                    onChange={(e) => updateResultField(idx, 'memorization.fromAyah', e.target.value)}
                                                                                    className="w-full text-center text-[11px] p-1 bg-gray-50 dark:bg-gray-850 rounded-lg border dark:border-gray-750 outline-none font-mono text-gray-800 dark:text-white"
                                                                                />
                                                                            </div>
                                                                            <div>
                                                                                <label className="text-[8px] font-bold text-gray-400 block mb-0.5">إلى سورة:</label>
                                                                                <SurahSelectorInput 
                                                                                    value={res.memorization?.toSurah || ''} 
                                                                                    onChange={(val) => updateResultField(idx, 'memorization.toSurah', val)} 
                                                                                    placeholder="البحث أو إدخال..."
                                                                                />
                                                                            </div>
                                                                            <div className="grid grid-cols-2 gap-1 items-center">
                                                                                <label className="text-[8px] font-bold text-gray-400">إلى آية:</label>
                                                                                <input 
                                                                                    type="text"
                                                                                    inputMode="numeric"
                                                                                    placeholder="آية"
                                                                                    value={res.memorization?.toAyah || ''} 
                                                                                    onChange={(e) => updateResultField(idx, 'memorization.toAyah', e.target.value)}
                                                                                    className="w-full text-center text-[11px] p-1 bg-gray-50 dark:bg-gray-850 rounded-lg border dark:border-gray-750 outline-none font-mono text-gray-800 dark:text-white"
                                                                                />
                                                                            </div>
                                                                            {/* Reset to empty list */}
                                                                            {res.memorization?.fromSurah && (
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => {
                                                                                        updateResultField(idx, 'memorization.fromSurah', '');
                                                                                        updateResultField(idx, 'memorization.fromAyah', '');
                                                                                        updateResultField(idx, 'memorization.toSurah', '');
                                                                                        updateResultField(idx, 'memorization.toAyah', '');
                                                                                    }}
                                                                                    className="w-full text-[8px] py-1 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 text-red-500 rounded-lg font-black mt-1"
                                                                                >
                                                                                    مسح الحفظ (لم يحفظ)
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    ) : (
                                                                        <div className="text-center py-4 text-[10px] text-gray-400 font-bold bg-gray-50 dark:bg-gray-850 rounded-xl">موقف مؤقتاً من المشرف</div>
                                                                    )}
                                                                </div>

                                                                {/* Review (المراجعة) */}
                                                                <div className="space-y-2 pr-1">
                                                                    <div className="flex justify-between items-center">
                                                                        <span className="text-[10px] font-black text-blue-600 dark:text-blue-405 flex items-center gap-1">المراجعة</span>
                                                                        {isSuspendedRev ? (
                                                                            <span className="text-[8px] font-black bg-gray-100 text-gray-500 dark:bg-gray-850 px-1.5 py-0.5 rounded-full">موقوف</span>
                                                                        ) : (!res.review?.fromSurah || res.review.fromSurah.trim() === '') ? (
                                                                            <span className="text-[8px] font-black bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400 px-1.5 py-0.5 rounded-full">لم يراجع تلقائياً ❌</span>
                                                                        ) : null}
                                                                    </div>
                                                                    
                                                                    {!isSuspendedRev ? (
                                                                        <div className="space-y-1.5">
                                                                            <div>
                                                                                <label className="text-[8px] font-bold text-gray-400 block mb-0.5">من سورة:</label>
                                                                                <SurahSelectorInput 
                                                                                    value={res.review?.fromSurah || ''} 
                                                                                    onChange={(val) => {
                                                                                        updateResultField(idx, 'review.fromSurah', val);
                                                                                        if (!val) {
                                                                                            updateResultField(idx, 'review.fromAyah', '');
                                                                                            updateResultField(idx, 'review.toSurah', '');
                                                                                            updateResultField(idx, 'review.toAyah', '');
                                                                                        }
                                                                                    }} 
                                                                                    placeholder="البحث أو إدخال..."
                                                                                />
                                                                            </div>
                                                                            <div className="grid grid-cols-2 gap-1 items-center">
                                                                                <label className="text-[8px] font-bold text-gray-400">من آية:</label>
                                                                                <input 
                                                                                    type="text"
                                                                                    inputMode="numeric"
                                                                                    placeholder="آية"
                                                                                    value={res.review?.fromAyah || ''} 
                                                                                    onChange={(e) => updateResultField(idx, 'review.fromAyah', e.target.value)}
                                                                                    className="w-full text-center text-[11px] p-1 bg-gray-50 dark:bg-gray-850 rounded-lg border dark:border-gray-750 outline-none font-mono text-gray-800 dark:text-white"
                                                                                />
                                                                            </div>
                                                                            <div>
                                                                                <label className="text-[8px] font-bold text-gray-400 block mb-0.5">إلى سورة:</label>
                                                                                <SurahSelectorInput 
                                                                                    value={res.review?.toSurah || ''} 
                                                                                    onChange={(val) => updateResultField(idx, 'review.toSurah', val)} 
                                                                                    placeholder="البحث أو إدخال..."
                                                                                />
                                                                            </div>
                                                                            <div className="grid grid-cols-2 gap-1 items-center">
                                                                                <label className="text-[8px] font-bold text-gray-400">إلى آية:</label>
                                                                                <input 
                                                                                    type="text"
                                                                                    inputMode="numeric"
                                                                                    placeholder="آية"
                                                                                    value={res.review?.toAyah || ''} 
                                                                                    onChange={(e) => updateResultField(idx, 'review.toAyah', e.target.value)}
                                                                                    className="w-full text-center text-[11px] p-1 bg-gray-50 dark:bg-gray-850 rounded-lg border dark:border-gray-750 outline-none font-mono text-gray-800 dark:text-white"
                                                                                />
                                                                            </div>
                                                                            {/* Reset to empty review */}
                                                                            {res.review?.fromSurah && (
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => {
                                                                                        updateResultField(idx, 'review.fromSurah', '');
                                                                                        updateResultField(idx, 'review.fromAyah', '');
                                                                                        updateResultField(idx, 'review.toSurah', '');
                                                                                        updateResultField(idx, 'review.toAyah', '');
                                                                                    }}
                                                                                    className="w-full text-[8px] py-1 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 text-red-500 rounded-lg font-black mt-1"
                                                                                >
                                                                                    مسح المراجعة (لم يراجع)
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    ) : (
                                                                        <div className="text-center py-4 text-[10px] text-gray-400 font-bold bg-gray-50 dark:bg-gray-850 rounded-xl">موقف مؤقتاً من المشرف</div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </motion.div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        {results && (
                            <div className="p-6 border-t dark:border-gray-800 bg-gray-50 dark:bg-gray-900 sticky bottom-0 z-40 backdrop-blur-md">
                                <button
                                    onClick={applyResults}
                                    className="w-full bg-emerald-600 dark:bg-emerald-500 hover:bg-emerald-700 dark:hover:bg-emerald-600 text-white p-5 rounded-2xl font-black flex items-center justify-center gap-3 shadow-[0_10px_20px_-5px_rgba(5,150,105,0.4)] hover:translate-y-[-2px] active:translate-y-0 transition-all"
                                >
                                    <FaCheckCircle className="text-xl" />
                                    <span>اعتماد وترحيل بيانات الكشف للجلسة</span>
                                </button>
                                <p className="text-center text-[10px] text-gray-400 mt-4 leading-relaxed px-4">عند ترحيل واعتماد البيانات، سيتم دمجها مع الجلسة الحالية وتزويد المحفظ بملء تلقائي فوري مريح للغاية ومزامنته سحابياً.</p>
                            </div>
                        ) }
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default SmartScanModal;

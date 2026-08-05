import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    FaArrowRight, 
    FaCalendarAlt, 
    FaQuestionCircle, 
    FaSave, 
    FaPrint, 
    FaTimes, 
    FaBookOpen, 
    FaChalkboardTeacher, 
    FaInfoCircle, 
    FaCheckCircle,
    FaLightbulb,
    FaEdit
} from 'react-icons/fa';
import { WeeklySchedule, WeeklyScheduleDay } from '../types';

interface CircleScheduleProps {
    weeklySchedule?: WeeklySchedule;
    onSaveSchedule: (schedule: WeeklySchedule) => Promise<void> | void;
    onBack: () => void;
    addToast: (message: string, type: 'success' | 'error' | 'info') => void;
    circleName?: string;
    teacherName?: string;
    centerName?: string;
}

const DEFAULT_DAYS: WeeklyScheduleDay[] = [
    { dayKey: 'saturday', dayName: 'السبت', type: 'tasmeea', note: '' },
    { dayKey: 'sunday', dayName: 'الأحد', type: 'tasmeea', note: '' },
    { dayKey: 'monday', dayName: 'الإثنين', type: 'tasmeea', note: '' },
    { dayKey: 'tuesday', dayName: 'الثلاثاء', type: 'tasmeea', note: '' },
    { dayKey: 'wednesday', dayName: 'الأربعاء', type: 'tasmeea', note: '' },
    { dayKey: 'thursday', dayName: 'الخميس', type: 'tasmeea', note: '' },
    { dayKey: 'friday', dayName: 'الجمعة', type: 'tasmeea', note: 'إجازة' },
];

const PRESET_NOTES = ['إجازة', 'اختبار', 'مراجعة عامة', 'حلقة مشتركة'];

export const CircleSchedule: React.FC<CircleScheduleProps> = ({
    weeklySchedule,
    onSaveSchedule,
    onBack,
    addToast,
    circleName = 'الحلقة',
    teacherName = 'المعلم',
    centerName = ''
}) => {
    const [days, setDays] = useState<WeeklyScheduleDay[]>(() => {
        if (weeklySchedule && weeklySchedule.days && weeklySchedule.days.length === 7) {
            return weeklySchedule.days;
        }
        return DEFAULT_DAYS;
    });

    const [isSaving, setIsSaving] = useState(false);
    const [showInfoModal, setShowInfoModal] = useState(false);

    useEffect(() => {
        if (weeklySchedule && weeklySchedule.days && weeklySchedule.days.length === 7) {
            setDays(weeklySchedule.days);
        }
    }, [weeklySchedule]);

    const handleTypeChange = (dayKey: string, newType: 'tasmeea' | 'dars') => {
        setDays(prev => prev.map(d => d.dayKey === dayKey ? { ...d, type: newType } : d));
    };

    const handleNoteChange = (dayKey: string, note: string) => {
        setDays(prev => prev.map(d => d.dayKey === dayKey ? { ...d, note } : d));
    };

    const handleQuickNote = (dayKey: string, preset: string) => {
        setDays(prev => prev.map(d => {
            if (d.dayKey === dayKey) {
                const currentNote = d.note ? d.note.trim() : '';
                if (currentNote === preset) return { ...d, note: '' }; // toggle off
                if (!currentNote) return { ...d, note: preset };
                return { ...d, note: `${currentNote} - ${preset}` };
            }
            return d;
        }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const updatedSchedule: WeeklySchedule = {
                id: weeklySchedule?.id || 'default_schedule',
                name: weeklySchedule?.name || 'الجدول الأسبوعي الاعتيادي',
                days,
                updatedAt: Date.now(),
                updatedBy: teacherName
            };
            await onSaveSchedule(updatedSchedule);
            addToast('تم حفظ الجدول الدراسي بنجاح', 'success');
        } catch (error) {
            console.error("Error saving schedule:", error);
            addToast('حدث خطأ أثناء حفظ الجدول الدراسي', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4 max-w-2xl mx-auto pb-12 print:p-0 print:m-0 print:max-w-none"
            dir="rtl"
        >
            {/* Header Area (Hidden when printing) */}
            <div className="flex items-center justify-between bg-white dark:bg-gray-800 p-3.5 rounded-2xl border border-gray-100 dark:border-gray-700/80 shadow-sm print:hidden">
                <div className="flex items-center gap-3">
                    <button 
                        onClick={onBack}
                        className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-700/80 hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center text-gray-700 dark:text-gray-200 transition-colors"
                        title="رجوع"
                    >
                        <FaArrowRight size={15} />
                    </button>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-base font-extrabold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                                <FaCalendarAlt className="text-emerald-600 dark:text-emerald-400" size={18} />
                                <span>الجدول الدراسي للحلقة</span>
                            </h1>
                        </div>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">تنظيم أسبوعي ذكي لنوع المقرر والملاحظات اليومية</p>
                    </div>
                </div>

                <div className="flex items-center gap-1.5">
                    <button
                        onClick={handlePrint}
                        className="px-2.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 text-xs font-bold flex items-center gap-1.5 border border-emerald-200/60 dark:border-emerald-800/50 hover:bg-emerald-100 transition-colors"
                        title="طباعة وتنزيل PDF"
                    >
                        <FaPrint size={13} />
                        <span className="hidden sm:inline">طباعة PDF</span>
                    </button>

                    <button
                        onClick={() => setShowInfoModal(true)}
                        className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/50 flex items-center justify-center hover:bg-amber-100 transition-colors"
                        title="معلومات القسم وطريقة الاستفادة"
                    >
                        <FaQuestionCircle size={17} />
                    </button>
                </div>
            </div>

            {/* Print-Only Header (visible only when printing) */}
            <div className="hidden print:block text-center border-b pb-4 mb-4">
                <h1 className="text-2xl font-bold text-gray-900">الجدول الدراسي الأسبوعي للحلقة</h1>
                <div className="flex justify-between items-center text-sm text-gray-600 mt-2 px-4">
                    <span><b>الحلقة:</b> {circleName}</span>
                    <span><b>المعلم:</b> {teacherName}</span>
                    {centerName && <span><b>المركز:</b> {centerName}</span>}
                    <span><b>تاريخ الطباعة:</b> {new Date().toLocaleDateString('ar-SA')}</span>
                </div>
            </div>

            {/* Excel-Style Compact Schedule Grid */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/80 dark:border-gray-700/80 shadow-sm overflow-hidden print:border print:shadow-none">
                <div className="bg-gray-50 dark:bg-gray-700/50 px-3 py-2 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between print:bg-gray-100">
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                        <FaEdit className="text-emerald-600 dark:text-emerald-400" />
                        <span>جدول أيام الأسبوع (تسميع / درس)</span>
                    </span>
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium print:hidden">تلقائي مع الجلسات الجديدة</span>
                </div>

                <div className="divide-y divide-gray-100 dark:divide-gray-700/60">
                    {/* Header Row */}
                    <div className="grid grid-cols-12 bg-emerald-50/60 dark:bg-emerald-950/20 py-2 px-2.5 text-[11px] font-bold text-emerald-900 dark:text-emerald-300 border-b border-emerald-100 dark:border-emerald-900/30">
                        <div className="col-span-3 sm:col-span-3 flex items-center gap-1">
                            <span>اليوم</span>
                        </div>
                        <div className="col-span-4 sm:col-span-4 text-center">
                            <span>نوع المقرر</span>
                        </div>
                        <div className="col-span-5 sm:col-span-5">
                            <span>الملاحظة (اختياري)</span>
                        </div>
                    </div>

                    {/* Day Rows */}
                    {days.map((day) => {
                        const isDars = day.type === 'dars';
                        return (
                            <div 
                                key={day.dayKey}
                                className={`grid grid-cols-12 items-center p-2 sm:p-2.5 transition-colors text-xs ${
                                    isDars 
                                        ? 'bg-amber-50/30 dark:bg-amber-950/10 hover:bg-amber-50/60 dark:hover:bg-amber-950/20' 
                                        : 'hover:bg-gray-50/60 dark:hover:bg-gray-700/30'
                                }`}
                            >
                                {/* Day Name */}
                                <div className="col-span-3 sm:col-span-3 font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                                    <span className={`w-2 h-2 rounded-full ${isDars ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                                    <span>{day.dayName}</span>
                                </div>

                                {/* Day Type Selector */}
                                <div className="col-span-4 sm:col-span-4 flex justify-center px-1">
                                    {/* Print View version */}
                                    <div className="hidden print:block text-xs font-bold">
                                        {isDars ? 'درس' : 'تسميع'}
                                    </div>

                                    {/* Interactive Button Group */}
                                    <div className="flex items-center p-0.5 rounded-xl bg-gray-100 dark:bg-gray-900/70 border border-gray-200/80 dark:border-gray-700/80 w-full max-w-[130px] print:hidden">
                                        <button
                                            type="button"
                                            onClick={() => handleTypeChange(day.dayKey, 'tasmeea')}
                                            className={`flex-1 py-1 px-1 rounded-lg text-[10px] sm:text-[11px] font-bold transition-all flex items-center justify-center gap-1 ${
                                                !isDars 
                                                    ? 'bg-emerald-600 text-white shadow-sm' 
                                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                                            }`}
                                        >
                                            <FaBookOpen size={10} />
                                            <span>تسميع</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => handleTypeChange(day.dayKey, 'dars')}
                                            className={`flex-1 py-1 px-1 rounded-lg text-[10px] sm:text-[11px] font-bold transition-all flex items-center justify-center gap-1 ${
                                                isDars 
                                                    ? 'bg-amber-500 text-white shadow-sm' 
                                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                                            }`}
                                        >
                                            <FaChalkboardTeacher size={10} />
                                            <span>درس</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Note Field */}
                                <div className="col-span-5 sm:col-span-5 px-1 space-y-1">
                                    {/* Print View version */}
                                    <div className="hidden print:block text-xs text-gray-700">
                                        {day.note || '-'}
                                    </div>

                                    {/* Interactive Input */}
                                    <div className="print:hidden">
                                        <input
                                            type="text"
                                            value={day.note || ''}
                                            onChange={(e) => handleNoteChange(day.dayKey, e.target.value)}
                                            placeholder="ملاحظة..."
                                            className="w-full text-[11px] py-1 px-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/40 text-gray-800 dark:text-gray-100 focus:bg-white dark:focus:bg-gray-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
                                        />
                                        
                                        {/* Quick Presets */}
                                        <div className="flex items-center gap-1 mt-1 flex-wrap">
                                            {PRESET_NOTES.map((preset) => {
                                                const isSelected = (day.note || '').includes(preset);
                                                return (
                                                    <button
                                                        key={preset}
                                                        type="button"
                                                        onClick={() => handleQuickNote(day.dayKey, preset)}
                                                        className={`text-[9px] px-1.5 py-0.5 rounded-md font-semibold transition-colors ${
                                                            isSelected
                                                                ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                                                                : 'bg-gray-100 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                                                        }`}
                                                    >
                                                        {preset}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Note clarification box */}
            <div className="p-3 bg-blue-50/70 dark:bg-blue-950/20 rounded-2xl border border-blue-100 dark:border-blue-900/30 text-[11px] text-blue-800 dark:text-blue-300 flex items-start gap-2.5 print:hidden">
                <FaLightbulb className="text-blue-500 flex-shrink-0 mt-0.5" size={14} />
                <div className="leading-relaxed">
                    <span className="font-bold">تنبيه لـ (أيام الإجازة والملاحظات):</span> اختيار وتدوين الإجازة في المقرر هو اختيار تنظيمي مرجعي خاص بك فقط لترتيب جدولك، ولا يؤثر أو يمنع فتح وتعديل الجلسات بأي شكل من الأشكال.
                </div>
            </div>

            {/* Save Button */}
            <div className="pt-2 print:hidden">
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
                >
                    {isSaving ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                        <>
                            <FaSave size={16} />
                            <span>حفظ الجدول الدراسي</span>
                        </>
                    )}
                </button>
            </div>

            {/* Info Modal (? Button) */}
            <AnimatePresence>
                {showInfoModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" dir="rtl">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white dark:bg-gray-800 rounded-3xl p-5 max-w-md w-full shadow-2xl border border-gray-100 dark:border-gray-700 space-y-4 max-h-[85vh] overflow-y-auto"
                        >
                            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-700">
                                <div className="flex items-center gap-2.5 text-amber-600 dark:text-amber-400">
                                    <FaQuestionCircle size={20} />
                                    <h3 className="font-bold text-base text-gray-800 dark:text-gray-100">دليل الجدول الدراسي الأسبوعي</h3>
                                </div>
                                <button
                                    onClick={() => setShowInfoModal(false)}
                                    className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                                >
                                    <FaTimes size={16} />
                                </button>
                            </div>

                            <div className="space-y-3.5 text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-100 dark:border-emerald-900/40 space-y-1">
                                    <h4 className="font-bold text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-1.5">
                                        <FaCheckCircle className="text-emerald-500" />
                                        <span>ما هو قسم الجدول الدراسي؟</span>
                                    </h4>
                                    <p>
                                        هو جدول أسبوعي بسيط يمكنك من تحديد نوع المقرر (تسميع أو درس) والملاحظات الخاصة بكل يوم من أيام الأسبوع لحلقتك.
                                    </p>
                                </div>

                                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-2xl border border-amber-100 dark:border-amber-900/40 space-y-1">
                                    <h4 className="font-bold text-amber-800 dark:text-amber-300 text-xs flex items-center gap-1.5">
                                        <FaLightbulb className="text-amber-500" />
                                        <span>كيف يسهل عملك عند إنشاء جلسة؟</span>
                                    </h4>
                                    <p>
                                        عند فتح "جلسة جديدة" في أي يوم، يقرأ النظام جدولك تلقائياً. فإذا كان اليوم معيناً كـ <b>(درس)</b>، يتم تفعيل وضع الدرس للجلسة مباشرة دون الحاجة لاختياره يدوياً.
                                    </p>
                                </div>

                                <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-2xl border border-blue-100 dark:border-blue-900/40 space-y-1">
                                    <h4 className="font-bold text-blue-800 dark:text-blue-300 text-xs flex items-center gap-1.5">
                                        <FaInfoCircle className="text-blue-500" />
                                        <span>ملاحظة هامة عن أيام الإجازة:</span>
                                    </h4>
                                    <p>
                                        تحديد الإجازة في الجدول أو تدوين أي ملاحظة هو خيار تنظيمي خاص بك للترتيب، ولن يؤثر أو يمنع فتح وتوثيق الجلسات بداخل النظام بأي وقت تشاء.
                                    </p>
                                </div>
                            </div>

                            <div className="pt-2">
                                <button
                                    onClick={() => setShowInfoModal(false)}
                                    className="w-full py-2.5 rounded-xl bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 font-bold text-xs hover:opacity-90 transition-opacity"
                                >
                                    فهمت ذلك، إغلاق النافذة
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default CircleSchedule;

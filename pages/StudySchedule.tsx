import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    FaArrowRight, FaQuestionCircle, FaCalendarAlt, FaPrint, 
    FaSave, FaPlus, FaCheck, FaInfoCircle, FaTimes, FaCalendarWeek,
    FaRegLightbulb
} from 'react-icons/fa';
import { CircleData, CircleSchedule, DaySchedule, ScheduleType } from '../types';

interface StudyScheduleProps {
    activeCircle: CircleData;
    onSaveSchedule: (schedule: CircleSchedule) => void;
    onBack: () => void;
    addToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const DEFAULT_DAYS: DaySchedule[] = [
    { dayKey: 'saturday', dayName: 'السبت', type: 'تسميع', notes: '' },
    { dayKey: 'sunday', dayName: 'الأحد', type: 'تسميع', notes: '' },
    { dayKey: 'monday', dayName: 'الاثنين', type: 'تسميع', notes: '' },
    { dayKey: 'tuesday', dayName: 'الثلاثاء', type: 'تسميع', notes: '' },
    { dayKey: 'wednesday', dayName: 'الأربعاء', type: 'تسميع', notes: '' },
    { dayKey: 'thursday', dayName: 'الخميس', type: 'تسميع', notes: '' },
    { dayKey: 'friday', dayName: 'الجمعة', type: 'إجازة', notes: '' },
];

const pageVariants = {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -12 }
};

const StudySchedule: React.FC<StudyScheduleProps> = ({
    activeCircle,
    onSaveSchedule,
    onBack,
    addToast
}) => {
    // Check if circle already has a schedule initialized
    const existingSchedule = activeCircle.studySchedule;
    const [isInitialized, setIsInitialized] = useState<boolean>(!!(existingSchedule && existingSchedule.isInitialized));
    
    // Days state
    const [days, setDays] = useState<DaySchedule[]>(() => {
        if (existingSchedule && existingSchedule.days && existingSchedule.days.length === 7) {
            return existingSchedule.days;
        }
        return DEFAULT_DAYS;
    });

    // Modals & UI States
    const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
    const [isSavedRecently, setIsSavedRecently] = useState<boolean>(false);

    // Sync with props if activeCircle updates
    useEffect(() => {
        if (activeCircle.studySchedule) {
            setIsInitialized(!!activeCircle.studySchedule.isInitialized);
            if (activeCircle.studySchedule.days && activeCircle.studySchedule.days.length === 7) {
                setDays(activeCircle.studySchedule.days);
            }
        }
    }, [activeCircle.studySchedule]);

    // Current Day of the Week calculation
    const currentDayKey = (() => {
        const dayIdx = new Date().getDay();
        const map: Record<number, string> = {
            0: 'sunday',
            1: 'monday',
            2: 'tuesday',
            3: 'wednesday',
            4: 'thursday',
            5: 'friday',
            6: 'saturday'
        };
        return map[dayIdx];
    })();

    // Auto-save whenever days change (if initialized)
    const handleUpdateDay = (index: number, field: 'type' | 'notes', value: any) => {
        const newDays = [...days];
        newDays[index] = { ...newDays[index], [field]: value };
        setDays(newDays);

        if (isInitialized) {
            const updatedSchedule: CircleSchedule = {
                id: existingSchedule?.id || `sched_${activeCircle.id}`,
                createdAt: existingSchedule?.createdAt || Date.now(),
                updatedAt: Date.now(),
                isInitialized: true,
                days: newDays
            };
            onSaveSchedule(updatedSchedule);
            setIsSavedRecently(true);
            setTimeout(() => setIsSavedRecently(false), 2000);
        }
    };

    // Manual Create New Schedule
    const handleCreateNewSchedule = () => {
        const newSchedule: CircleSchedule = {
            id: `sched_${activeCircle.id}`,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            isInitialized: true,
            days: days.length === 7 ? days : DEFAULT_DAYS
        };
        setIsInitialized(true);
        onSaveSchedule(newSchedule);
        addToast('تم إنشاء الجدول الدراسي للحلقة بنجاح', 'success');
    };

    // Manual Save Button
    const handleManualSave = () => {
        const updatedSchedule: CircleSchedule = {
            id: existingSchedule?.id || `sched_${activeCircle.id}`,
            createdAt: existingSchedule?.createdAt || Date.now(),
            updatedAt: Date.now(),
            isInitialized: true,
            days: days
        };
        onSaveSchedule(updatedSchedule);
        addToast('تم حفظ الجدول الدراسي للحلقة بنجاح', 'success');
        setIsSavedRecently(true);
        setTimeout(() => setIsSavedRecently(false), 2500);
    };

    // PDF / Print Handler
    const handlePrintPDF = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            addToast('يرجى السماح بالنوافذ المنبثقة للطباعة', 'error');
            return;
        }

        const printDate = new Date().toLocaleDateString('ar-SA', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const htmlContent = `
          <!DOCTYPE html>
          <html dir="rtl" lang="ar">
          <head>
            <meta charset="utf-8">
            <title>الجدول الدراسي - ${activeCircle.circle || 'الحلقة'}</title>
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800;900&display=swap');
              * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Tajawal', sans-serif; }
              body { padding: 28px; background: #ffffff; color: #1e293b; direction: rtl; }
              .header { text-align: center; border-bottom: 2px solid #105541; padding-bottom: 16px; margin-bottom: 20px; }
              .header h1 { color: #105541; font-size: 22px; font-weight: 800; margin-bottom: 4px; }
              .header p { color: #64748b; font-size: 12px; }
              .meta-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px 16px; margin-bottom: 20px; font-size: 12px; }
              .meta-item { display: flex; align-items: center; gap: 6px; }
              .meta-label { font-weight: 700; color: #475569; }
              .meta-val { color: #0f172a; font-weight: 700; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; }
              th { background-color: #105541; color: #ffffff; font-weight: 700; padding: 10px 12px; text-align: right; border: 1px solid #105541; }
              td { padding: 10px 12px; border: 1px solid #cbd5e1; text-align: right; vertical-align: middle; }
              tr:nth-child(even) { background-color: #f8fafc; }
              .badge { display: inline-block; padding: 3px 10px; border-radius: 9999px; font-weight: 700; font-size: 11px; text-align: center; }
              .badge-tasmai { background-color: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; }
              .badge-dars { background-color: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }
              .badge-ejaza { background-color: #fef3c7; color: #b45309; border: 1px solid #fde68a; }
              .footer { margin-top: 24px; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 12px; }
              @media print {
                body { padding: 0; }
                @page { size: A4; margin: 12mm; }
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>الجدول الدراسي للحلقة</h1>
              <p>تطبيق حلقتي لمتابعة وتنظيم تحفيظ القرآن الكريم</p>
            </div>
            <div class="meta-grid">
              <div class="meta-item"><span class="meta-label">اسم الحلقة:</span> <span class="meta-val">${activeCircle.circle || 'غير محدد'}</span></div>
              <div class="meta-item"><span class="meta-label">المعلم:</span> <span class="meta-val">${activeCircle.teacher || 'غير محدد'}</span></div>
              <div class="meta-item"><span class="meta-label">المركز:</span> <span class="meta-val">${activeCircle.center || 'غير محدد'}</span></div>
              <div class="meta-item"><span class="meta-label">تاريخ الطباعة:</span> <span class="meta-val">${printDate}</span></div>
            </div>
            <table>
              <thead>
                <tr>
                  <th style="width: 25%;">اليوم</th>
                  <th style="width: 25%;">المقرر</th>
                  <th style="width: 50%;">الملاحظات</th>
                </tr>
              </thead>
              <tbody>
                ${days.map(d => {
                  const badgeClass = d.type === 'درس' ? 'badge-dars' : d.type === 'إجازة' ? 'badge-ejaza' : 'badge-tasmai';
                  return `
                    <tr>
                      <td style="font-weight: 800;">${d.dayName}</td>
                      <td><span class="badge ${badgeClass}">${d.type}</span></td>
                      <td>${d.notes || '—'}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
            <div class="footer">
              تم استخراج هذا التقرير من تطبيق حلقتي لتسهيل تنظيم ومتابعة الحلقة • ${printDate}
            </div>
            <script>
              window.onload = function() {
                setTimeout(function() {
                  window.print();
                }, 300);
              };
            </script>
          </body>
          </html>
        `;

        printWindow.document.write(htmlContent);
        printWindow.document.close();
    };

    return (
        <motion.div 
            variants={pageVariants} 
            initial="initial" 
            animate="animate" 
            exit="exit"
            className="space-y-4 max-w-2xl mx-auto pb-12"
            dir="rtl"
        >
            {/* Header Navigation Bar */}
            <div className="flex items-center justify-between bg-white dark:bg-gray-800 p-3.5 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-sm">
                <div className="flex items-center gap-2.5">
                    <button
                        onClick={onBack}
                        className="w-8 h-8 rounded-xl bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 flex items-center justify-center transition-colors"
                        title="رجوع للخدمات"
                    >
                        <FaArrowRight className="text-xs" />
                    </button>
                    <div>
                        <div className="flex items-center gap-1.5">
                            <h1 className="text-sm sm:text-base font-bold text-gray-800 dark:text-gray-100">الجدول الدراسي للحلقة</h1>
                            <button
                                onClick={() => setShowHelpModal(true)}
                                className="text-amber-500 hover:text-amber-600 transition-colors p-0.5"
                                title="شرح الميزة"
                            >
                                <FaQuestionCircle className="text-sm" />
                            </button>
                        </div>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500">تنظيم المقررات والملاحظات للأيام الدراسية</p>
                    </div>
                </div>

                {isInitialized && (
                    <div className="flex items-center gap-1.5 text-[10px]">
                        {isSavedRecently ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                                <FaCheck className="text-[9px]" /> تم الحفظ
                            </span>
                        ) : (
                            <span className="text-gray-400 dark:text-gray-500 font-medium bg-gray-50 dark:bg-gray-750 px-2 py-0.5 rounded-md">
                                حفظ تلقائي
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* FIRST TIME / UNINITIALIZED WELCOME SCREEN */}
            {!isInitialized ? (
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm text-center space-y-5">
                    <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-inner border border-emerald-100 dark:border-emerald-800/50">
                        <FaCalendarWeek className="text-2xl" />
                    </div>

                    <div className="space-y-2 max-w-md mx-auto">
                        <h2 className="text-base font-bold text-gray-800 dark:text-gray-100">جدول دراسي جديد للحلقة</h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                            تتيح لك هذه الميزة تنظيم الأيام الدراسية للحلقة، تحديد المقررات اليومية (تسميع، درس، أو إجازة)، وتدوين الملاحظات.
                        </p>
                    </div>

                    <div className="bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/30 rounded-xl p-3.5 text-right text-xs text-amber-800 dark:text-amber-300 space-y-1.5 max-w-md mx-auto">
                        <div className="flex items-center gap-1.5 font-bold text-[11px]">
                            <FaRegLightbulb className="text-amber-500 flex-shrink-0" />
                            <span>فوائد ومميزات الجدول الدراسي:</span>
                        </div>
                        <ul className="text-[11px] text-amber-700 dark:text-amber-400 space-y-1 pr-4 list-disc">
                            <li>تفعيل "وضع الدرس" تلقائياً للجلسات الجديدة في الأيام المحددة كدرس.</li>
                            <li>تنظيم وتدوين ملاحظات المعلم اليومية بصورة دقيقة.</li>
                            <li>طباعة وتصدير الجدول الدراسي كتقرير رسمي ببيانات الحلقة.</li>
                        </ul>
                    </div>

                    <button
                        onClick={handleCreateNewSchedule}
                        className="w-full sm:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 mx-auto active:scale-95 cursor-pointer"
                    >
                        <FaPlus className="text-xs" />
                        <span>إنشاء جدول دراسي جديد</span>
                    </button>
                </div>
            ) : (
                /* INTERACTIVE EXCEL-LIKE TABLE SCREEN */
                <div className="space-y-4">
                    {/* Compact Schedule Table */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700/70 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-right border-collapse text-xs">
                                <thead>
                                    <tr className="bg-gray-50 dark:bg-gray-750/70 border-b border-gray-150 dark:border-gray-700 text-gray-600 dark:text-gray-300 font-bold">
                                        <th className="py-2.5 px-3 w-28 text-center border-l dark:border-gray-700">اليوم</th>
                                        <th className="py-2.5 px-3 w-48 text-center border-l dark:border-gray-700">المقرر</th>
                                        <th className="py-2.5 px-3">الملاحظات</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                                    {days.map((dayItem, index) => {
                                        const isToday = dayItem.dayKey === currentDayKey;

                                        return (
                                            <tr 
                                                key={dayItem.dayKey}
                                                className={`transition-colors ${
                                                    isToday 
                                                        ? 'bg-emerald-50/30 dark:bg-emerald-950/15' 
                                                        : 'hover:bg-gray-50/50 dark:hover:bg-gray-750/30'
                                                }`}
                                            >
                                                {/* Day Column */}
                                                <td className="py-2 px-2.5 font-bold border-l dark:border-gray-700 text-center align-middle whitespace-nowrap">
                                                    <div className="flex flex-col items-center justify-center gap-0.5">
                                                        <span className="text-gray-800 dark:text-gray-200">{dayItem.dayName}</span>
                                                        {isToday && (
                                                            <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/50 px-1.5 py-0.2 rounded-full">
                                                                اليوم
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* Schedule Type Selector Column (Strictly: تسميع / درس / إجازة) */}
                                                <td className="py-2 px-2 border-l dark:border-gray-700 align-middle">
                                                    <div className="grid grid-cols-3 gap-1 bg-gray-100 dark:bg-gray-900/60 p-1 rounded-xl border border-gray-200/50 dark:border-gray-700/50">
                                                        {(['تسميع', 'درس', 'إجازة'] as ScheduleType[]).map((typeOpt) => {
                                                            const isSelected = dayItem.type === typeOpt;
                                                            let activeClass = '';
                                                            if (isSelected) {
                                                                if (typeOpt === 'تسميع') activeClass = 'bg-emerald-600 text-white shadow-sm font-black';
                                                                else if (typeOpt === 'درس') activeClass = 'bg-blue-600 text-white shadow-sm font-black';
                                                                else if (typeOpt === 'إجازة') activeClass = 'bg-amber-600 text-white shadow-sm font-black';
                                                            } else {
                                                                activeClass = 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 font-medium';
                                                            }

                                                            return (
                                                                <button
                                                                    key={typeOpt}
                                                                    type="button"
                                                                    onClick={() => handleUpdateDay(index, 'type', typeOpt)}
                                                                    className={`py-1 px-1 rounded-lg text-[10px] sm:text-[11px] transition-all text-center cursor-pointer ${activeClass}`}
                                                                >
                                                                    {typeOpt}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </td>

                                                {/* Notes Column */}
                                                <td className="py-1.5 px-2 align-middle">
                                                    <input
                                                        type="text"
                                                        value={dayItem.notes || ''}
                                                        onChange={(e) => handleUpdateDay(index, 'notes', e.target.value)}
                                                        placeholder="مثال: مراجعة الجزء الثلاثون، درس أحكام النون..."
                                                        className="w-full text-xs p-1.5 bg-transparent border border-transparent focus:border-emerald-500/40 focus:bg-white dark:focus:bg-gray-900 rounded-lg outline-none transition-all text-gray-800 dark:text-gray-200 placeholder:text-gray-300 dark:placeholder:text-gray-600"
                                                    />
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Bottom Action Buttons (Strictly 2 buttons as requested) */}
                    <div className="grid grid-cols-2 gap-3 pt-1">
                        <button
                            onClick={handleManualSave}
                            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                        >
                            <FaSave className="text-xs" />
                            <span>حفظ الجدول الدراسي</span>
                        </button>

                        <button
                            onClick={handlePrintPDF}
                            className="w-full py-2.5 px-4 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 text-gray-700 dark:text-gray-200 font-bold text-xs rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                        >
                            <FaPrint className="text-xs text-amber-500" />
                            <span>طباعة / تصدير PDF</span>
                        </button>
                    </div>
                </div>
            )}

            {/* HELP / INFO MODAL */}
            <AnimatePresence>
                {showHelpModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-5 border border-gray-100 dark:border-gray-700 shadow-xl space-y-4 text-right"
                            dir="rtl"
                        >
                            <div className="flex items-center justify-between border-b dark:border-gray-700 pb-3">
                                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                                    <FaInfoCircle className="text-base" />
                                    <span>عن ميزة الجدول الدراسي</span>
                                </div>
                                <button
                                    onClick={() => setShowHelpModal(false)}
                                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-lg"
                                >
                                    <FaTimes />
                                </button>
                            </div>

                            <div className="space-y-3 text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                                <div className="p-3 bg-gray-50 dark:bg-gray-750 rounded-xl border border-gray-100 dark:border-gray-700 space-y-1">
                                    <h4 className="font-bold text-gray-800 dark:text-gray-100">1. تحديد المقررات اليومية:</h4>
                                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                                        يمكنك تحديد نوع المقرر لكل يوم من أيام الأسبوع (تسميع، درس، إجازة) وتدوين أي ملاحظات مخصصة.
                                    </p>
                                </div>

                                <div className="p-3 bg-gray-50 dark:bg-gray-750 rounded-xl border border-gray-100 dark:border-gray-700 space-y-1">
                                    <h4 className="font-bold text-gray-800 dark:text-gray-100">2. التكامل التلقائي مع الجلسات:</h4>
                                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                                        عند تحديد يوم كـ "درس"، سيتم تفعيل زر (وضع الدرس) تلقائياً عند فتح جلسة جديدة في هذا اليوم لتسهيل تسجيل الحضور.
                                    </p>
                                </div>

                                <div className="p-3 bg-gray-50 dark:bg-gray-750 rounded-xl border border-gray-100 dark:border-gray-700 space-y-1">
                                    <h4 className="font-bold text-gray-800 dark:text-gray-100">3. الطباعة والتصدير:</h4>
                                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                                        يمكنك طباعة الجدول في أي وقت لتصدير وثيقة رسمية تتضمن اسم الحلقة والمعلم والمركز وتاريخ الطباعة.
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={() => setShowHelpModal(false)}
                                className="w-full py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl hover:bg-emerald-700 transition-colors cursor-pointer"
                            >
                                فهمت ذلك
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default StudySchedule;

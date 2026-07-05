


import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes } from 'react-icons/fa';

interface SupervisorReportGeneratorModalProps {
    onClose: () => void;
    onGenerate: (options: { period: string, customStart?: string, customEnd?: string, content: { [key: string]: boolean } }) => void;
    setAlert: (data: { isOpen: boolean; title: string; message: string }) => void;
}

const modalVariants = {
    initial: { scale: 0.9, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0.9, opacity: 0 },
};

const periodOptions = [
    { key: 'today', label: 'اليوم' },
    { key: 'this_week', label: 'هذا الأسبوع' }, { key: 'last_week', label: 'الأسبوع السابق' },
    { key: 'this_month', label: 'هذا الشهر' }, { key: 'last_month', label: 'الشهر السابق' },
    { key: 'this_year', label: 'هذه السنة' }, { key: 'last_year', label: 'السنة السابقة' },
];

const contentOptions = [
    { key: 'summary', label: 'ملخص الحلقة' }, 
    { key: 'attendance', label: 'الحضور' }, { key: 'absence', label: 'الغياب' },
    { key: 'lateness', label: 'التأخر' }, { key: 'excused', label: 'الاستئذان' },
    { key: 'lessons', label: 'جلسات الدروس' }, 
    { key: 'studentDetails', label: 'تفاصيل الطلاب' },
];


const SupervisorReportGeneratorModal: React.FC<SupervisorReportGeneratorModalProps> = ({ onClose, onGenerate, setAlert }) => {
    const [period, setPeriod] = useState('this_week');
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');
    const [content, setContent] = useState(contentOptions.reduce((acc, opt) => ({ ...acc, [opt.key]: true }), {} as {[key:string]: boolean}));

    const handleContentChange = (key: string) => {
        setContent(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleGenerate = () => {
        if (Object.values(content).every(v => !v)) {
            setAlert({ isOpen: true, title: "محتوى التقرير فارغ", message: "يرجى اختيار عنصر واحد على الأقل من محتوى التقرير."});
            return;
        }
        if (period === 'custom' && (!customStart || !customEnd)) {
            setAlert({ isOpen: true, title: "فترة غير محددة", message: "يرجى تحديد تاريخ البداية والنهاية للفترة المخصصة."});
            return;
        }
        onGenerate({ period, customStart, customEnd, content });
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[170] p-4">
            <motion.div variants={modalVariants} initial="initial" animate="animate" exit="exit" className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md flex flex-col h-[90vh]">
                <div className="flex justify-between items-center mb-4 flex-shrink-0">
                    <h2 className="text-xl font-bold text-primary dark:text-accent">تقرير المشرف</h2>
                    <button onClick={onClose}><FaTimes /></button>
                </div>

                <div className="flex-grow overflow-y-auto space-y-5 pr-2">
                    <div>
                        <h3 className="font-semibold mb-2">1. اختيار الفترة الزمنية</h3>
                        <div className="grid grid-cols-2 gap-2">
                            {periodOptions.map(opt => (
                                <button key={opt.key} onClick={() => setPeriod(opt.key)} className={`p-2 rounded-lg text-sm ${period === opt.key ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-700'}`}>
                                    {opt.label}
                                </button>
                            ))}
                            <button onClick={() => setPeriod('custom')} className={`p-2 rounded-lg text-sm col-span-2 ${period === 'custom' ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-700'}`}>
                                فترة مخصصة
                            </button>
                        </div>
                         <AnimatePresence>
                         {period === 'custom' && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="grid grid-cols-2 gap-2 mt-2 overflow-hidden">
                                <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="p-2 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600 w-full text-sm" placeholder="من" />
                                <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="p-2 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600 w-full text-sm" placeholder="إلى" />
                            </motion.div>
                        )}
                        </AnimatePresence>
                    </div>

                    <div>
                        <h3 className="font-semibold mb-2">2. اختيار محتوى التقرير</h3>
                        <div className="grid grid-cols-2 gap-2">
                            {contentOptions.map(opt => (
                                <label key={opt.key} className="flex items-center gap-2 p-2 bg-gray-100 dark:bg-gray-700 rounded-lg cursor-pointer">
                                    <input type="checkbox" checked={content[opt.key]} onChange={() => handleContentChange(opt.key)} className="w-4 h-4 accent-primary" />
                                    <span className="text-sm">{opt.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex-shrink-0 pt-4">
                    <button onClick={handleGenerate} className="w-full px-4 py-3 rounded-lg bg-primary text-white font-bold">إنشاء التقرير</button>
                </div>
            </motion.div>
        </div>
    );
};

export default SupervisorReportGeneratorModal;
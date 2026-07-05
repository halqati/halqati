import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Check, Users, Calendar, FileText, MapPin, Award, BookOpen } from 'lucide-react';
import { CircleData } from '../types';

interface BackupReviewModalProps {
    isOpen: boolean;
    importedData: CircleData | null;
    onClose: () => void;
    onConfirm: (updatedCircleName: string) => void;
}

const modalVariants = {
    initial: { scale: 0.95, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0.95, opacity: 0 },
};

const BackupReviewModal: React.FC<BackupReviewModalProps> = ({ isOpen, importedData, onClose, onConfirm }) => {
    const [circleName, setCircleName] = useState('');

    useEffect(() => {
        if (isOpen && importedData) {
            setCircleName(importedData.circle || '');
        }
    }, [isOpen, importedData]);

    if (!isOpen || !importedData) return null;

    const studentCount = importedData.students?.length || 0;
    const sessionCount = importedData.sessions?.length || 0;
    const planCount = importedData.plans?.length || 0;
    const testCount = importedData.tests?.length || 0;
    const activityCount = importedData.activities?.length || 0;

    const handleImport = () => {
        if (!circleName.trim()) return;
        onConfirm(circleName.trim());
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[250] p-4 font-sans" dir="rtl">
            <motion.div 
                variants={modalVariants} 
                initial="initial" 
                animate="animate" 
                exit="exit" 
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto border border-gray-100 dark:border-gray-700 flex flex-col"
            >
                {/* Header */}
                <div className="flex justify-between items-center pb-4 border-b border-gray-100 dark:border-gray-700 mb-4 flex-shrink-0">
                    <h2 className="text-xl font-bold text-[#105541] dark:text-accent">مراجعة النسخة الاحتياطية قبل الاستيراد</h2>
                    <button 
                        onClick={onClose}
                        className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body Content */}
                <div className="flex-grow space-y-5 overflow-y-auto pr-1">
                    <div className="p-4 bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 rounded-xl text-sm leading-relaxed border border-amber-200/50 dark:border-amber-900/40">
                        <span className="font-bold text-base block mb-1">ℹ️ تنبيه الأمان والاستقلالية:</span>
                        سيتم استيراد هذه النسخة كحلقة <strong className="underline decoration-amber-500 font-extrabold text-amber-900 dark:text-amber-200">جديدة مستقلة تماماً</strong> ببيانات جديدة، ولن ترتبط بالحلقة الأصلية أو تؤثر عليها لمنع تضارب البيانات.
                    </div>

                    {/* Circle Name Input (Editable before import) */}
                    <div className="space-y-2">
                        <label className="block text-sm font-extrabold text-[#105541] dark:text-gray-300">
                            اسم الحلقة الجديد (يمكنك تعديله الآن):
                        </label>
                        <input
                            type="text"
                            value={circleName}
                            onChange={(e) => setCircleName(e.target.value)}
                            placeholder="أدخل اسم حلقة التحفيظ..."
                            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#105541] focus:border-transparent outline-none transition-all font-bold text-lg"
                        />
                    </div>

                    {/* Info Card Grid */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400">ملخص محتويات النسخة الاحتياطية:</h3>
                        
                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl flex items-center gap-3 border border-gray-100 dark:border-gray-700">
                                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-lg">
                                    <Users size={18} />
                                </div>
                                <div>
                                    <span className="block text-xs text-gray-500 dark:text-gray-400">عدد الطلاب</span>
                                    <span className="font-bold text-gray-800 dark:text-white text-base">{studentCount} طالباً</span>
                                </div>
                            </div>

                            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl flex items-center gap-3 border border-gray-100 dark:border-gray-700">
                                <div className="p-2 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-lg">
                                    <Calendar size={18} />
                                </div>
                                <div>
                                    <span className="block text-xs text-gray-500 dark:text-gray-400">عدد الجلسات</span>
                                    <span className="font-bold text-gray-800 dark:text-white text-base">{sessionCount} جلسة</span>
                                </div>
                            </div>

                            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl flex items-center gap-3 border border-gray-100 dark:border-gray-700">
                                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-lg">
                                    <FileText size={18} />
                                </div>
                                <div>
                                    <span className="block text-xs text-gray-500 dark:text-gray-400">الخطط الدراسية</span>
                                    <span className="font-bold text-gray-800 dark:text-white text-base">{planCount} خطة</span>
                                </div>
                            </div>

                            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl flex items-center gap-3 border border-gray-100 dark:border-gray-700">
                                <div className="p-2 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-lg">
                                    <Award size={18} />
                                </div>
                                <div>
                                    <span className="block text-xs text-gray-500 dark:text-gray-400">الاختبارات</span>
                                    <span className="font-bold text-gray-800 dark:text-white text-base">{testCount} اختباراً</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Basic Meta Details */}
                    <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-100 dark:border-gray-700 space-y-3">
                        <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">البيانات الأساسية المستوردة:</h4>
                        
                        <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                            <div className="flex items-center gap-2">
                                <MapPin size={16} className="text-gray-400" />
                                <span><strong>اسم المركز:</strong> {importedData.center || 'غير محدد'}</span>
                            </div>
                            {importedData.town && (
                                <div className="flex items-center gap-2">
                                    <MapPin size={16} className="text-gray-400" />
                                    <span><strong>البلد/المدينة:</strong> {importedData.town}</span>
                                </div>
                            )}
                            <div className="flex items-center gap-2">
                                <BookOpen size={16} className="text-gray-400" />
                                <span><strong>تاريخ بدء الدراسة:</strong> {importedData.studyStartDate || 'غير محدد'}</span>
                            </div>
                            {importedData.lessonTypes && importedData.lessonTypes.length > 0 && (
                                <div className="text-xs bg-white dark:bg-gray-800 p-2.5 rounded-lg border border-gray-100 dark:border-gray-700 flex flex-wrap gap-1">
                                    <strong className="text-gray-500 block w-full mb-1">أنواع الدروس المستوردة:</strong>
                                    {importedData.lessonTypes.map((type, idx) => (
                                        <span key={idx} className="bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-gray-600 dark:text-gray-300 text-[11px] font-semibold">{type}</span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer buttons */}
                <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center gap-4 flex-shrink-0">
                    <button 
                        onClick={onClose} 
                        className="px-5 py-3 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 font-bold transition-all"
                    >
                        إلغاء
                    </button>
                    <button 
                        onClick={handleImport} 
                        disabled={!circleName.trim()}
                        className="flex-grow px-5 py-3 rounded-xl bg-[#105541] hover:bg-[#0c4031] text-white disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed font-bold shadow-lg shadow-green-900/10 dark:shadow-none flex items-center justify-center gap-2 transition-all"
                    >
                        <Check size={18} />
                        استيراد كحلقة جديدة ومستقلة
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default BackupReviewModal;

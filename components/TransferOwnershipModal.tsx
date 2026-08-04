import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, User, ArrowRight, X, AlertTriangle } from 'lucide-react';

interface TransferTeacher {
    uid: string;
    name: string;
    role?: string;
    photo?: string;
}

interface TransferOwnershipModalProps {
    isOpen: boolean;
    circleName: string;
    teachers: TransferTeacher[];
    onConfirm: (selectedUid: string) => Promise<void>;
    onClose: () => void;
}

export const TransferOwnershipModal: React.FC<TransferOwnershipModalProps> = ({
    isOpen,
    circleName,
    teachers,
    onConfirm,
    onClose,
}) => {
    const [selectedUid, setSelectedUid] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUid) return;
        setIsSubmitting(true);
        try {
            await onConfirm(selectedUid);
            onClose();
        } catch (error) {
            console.error("Failed to transfer ownership:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" dir="rtl">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    className="w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden"
                >
                    {/* Header */}
                    <div className="p-6 bg-amber-500/10 dark:bg-amber-500/20 border-b border-amber-500/20 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/20">
                                <ShieldCheck size={20} />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-gray-900 dark:text-white">نقل ملكية الحلقة</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">حلقة: {circleName}</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-all"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Form Body */}
                    <form onSubmit={handleSubmit} className="p-6 space-y-4">
                        <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-amber-800 dark:text-amber-300 text-xs leading-relaxed flex items-start gap-2.5">
                            <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                            <span>
                                قبل خروجك من الحلقة، يجب تحديد معلم جديد لمنحه <strong>الملكية الكاملة والصلاحيات التامة</strong> لإدارة الحلقة.
                            </span>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                                اختر المعلم الذي تنتقل له الملكية:
                            </label>
                            
                            <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar p-1">
                                {teachers.map((teacher) => {
                                    const isSelected = selectedUid === teacher.uid;
                                    return (
                                        <div
                                            key={teacher.uid}
                                            onClick={() => setSelectedUid(teacher.uid)}
                                            className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                                                isSelected
                                                    ? 'bg-emerald-500/10 border-emerald-500 text-emerald-900 dark:text-emerald-300 ring-2 ring-emerald-500/30'
                                                    : 'bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-800 hover:border-gray-300 text-gray-800 dark:text-gray-200'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                {teacher.photo ? (
                                                    <img src={teacher.photo} alt="" className="w-8 h-8 rounded-full object-cover border" />
                                                ) : (
                                                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center text-xs">
                                                        {(teacher.name || 'م')[0]}
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="text-xs font-bold">{teacher.name}</p>
                                                    <p className="text-[10px] text-gray-400">
                                                        {teacher.role === 'supervisor' ? 'مشرف' : teacher.role === 'assistant' ? 'مساعد' : 'معلم'}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center text-[10px] ${
                                                isSelected ? 'bg-emerald-500 border-emerald-500 text-white font-bold' : 'border-gray-300'
                                            }`}>
                                                {isSelected && '✓'}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="pt-3 flex items-center gap-3">
                            <button
                                type="submit"
                                disabled={!selectedUid || isSubmitting}
                                className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-2xl shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? (
                                    <span>جاري نقل الملكية والخروج...</span>
                                ) : (
                                    <>
                                        <span>تأكيد نقل الملكية والخروج</span>
                                        <ArrowRight size={14} className="rotate-180" />
                                    </>
                                )}
                            </button>
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={isSubmitting}
                                className="py-3 px-4 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold text-xs rounded-2xl transition-all"
                            >
                                إلغاء
                            </button>
                        </div>
                    </form>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

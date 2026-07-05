
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SupervisorReportSettings } from '../types';
import { FaUserShield, FaWhatsapp, FaChartBar, FaSave, FaTimes } from 'react-icons/fa';

interface SupervisorSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    settings?: SupervisorReportSettings;
    onSave: (settings: SupervisorReportSettings) => void;
}

const SupervisorSettingsModal: React.FC<SupervisorSettingsModalProps> = ({ isOpen, onClose, settings, onSave }) => {
    const [name, setName] = useState(settings?.name || '');
    const [whatsappNumber, setWhatsappNumber] = useState(settings?.whatsappNumber || '');
    const [isSummaryEnabled, setIsSummaryEnabled] = useState(settings?.isSummaryEnabled ?? true);

    const handleSave = () => {
        onSave({
            name,
            whatsappNumber,
            isSummaryEnabled
        });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden border border-gray-100 dark:border-gray-700"
            >
                <div className="p-6 bg-gradient-to-r from-primary to-primary/80 dark:from-accent dark:to-accent/80 text-white text-center">
                    <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <FaUserShield size={30} />
                    </div>
                    <h2 className="text-xl font-bold">إعدادات المشرف</h2>
                    <p className="text-white/80 text-xs mt-1">تخصيص تقارير المتابعة للمشرف</p>
                </div>

                <div className="p-6 space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 mr-1">اسم المشرف</label>
                        <div className="relative">
                            <input 
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="ادخل اسم المشرف..."
                                className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-600 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-primary dark:focus:ring-accent transition-all text-sm"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 mr-1">رقم واتساب المشرف</label>
                        <div className="relative">
                            <FaWhatsapp className="absolute left-3 top-1/2 -translate-y-1/2 text-green-500" />
                            <input 
                                type="tel"
                                value={whatsappNumber}
                                onChange={(e) => setWhatsappNumber(e.target.value)}
                                placeholder="مثال: 966500000000"
                                className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-600 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-primary dark:focus:ring-accent transition-all text-sm text-left dir-ltr"
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white dark:bg-gray-700 rounded-xl flex items-center justify-center shadow-sm text-primary dark:text-accent">
                                <FaChartBar size={18} />
                            </div>
                            <div>
                                <p className="font-bold text-sm text-gray-800 dark:text-gray-100">ملخص الجلسة</p>
                                <p className="text-[10px] text-gray-500 dark:text-gray-400">إضافة إحصائيات سريعة للتقرير</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => setIsSummaryEnabled(!isSummaryEnabled)}
                            className={`w-12 h-6 rounded-full transition-all relative ${isSummaryEnabled ? 'bg-primary dark:bg-accent' : 'bg-gray-300 dark:bg-gray-600'}`}
                        >
                            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${isSummaryEnabled ? 'right-7' : 'right-1'}`} />
                        </button>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button 
                            onClick={handleSave}
                            className="flex-1 bg-primary dark:bg-accent text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                        >
                            <FaSave /> حفظ الإعدادات
                        </button>
                        <button 
                            onClick={onClose}
                            className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                        >
                            <FaTimes /> إلغاء
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default SupervisorSettingsModal;

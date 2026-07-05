
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes, FaHistory, FaWhatsapp, FaCopy, FaSearch, FaCheckCircle, FaExclamationTriangle, FaFileAlt } from 'react-icons/fa';
import { SentReportLog } from '../types';
import { formatDateTime } from '../utils/helpers';

interface SentReportsHistoryModalProps {
    history: SentReportLog[];
    onClose: () => void;
}

const modalVariants = {
    initial: { scale: 0.9, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0.9, opacity: 0 },
};

const SentReportsHistoryModal: React.FC<SentReportsHistoryModalProps> = ({ history, onClose }) => {
    const [selectedLog, setSelectedLog] = useState<SentReportLog | null>(null);

    const getIcon = (type: string) => {
        switch (type) {
            case 'absence': return <FaExclamationTriangle className="text-red-500" />;
            case 'lateness': return <FaExclamationTriangle className="text-yellow-500" />;
            case 'performance_memo': return <FaExclamationTriangle className="text-orange-500" />;
            case 'general': return <FaFileAlt className="text-blue-500" />;
            case 'suspension_warning': return <FaExclamationTriangle className="text-red-600" />;
            default: return <FaFileAlt className="text-gray-500" />;
        }
    };

    const getTypeLabel = (type: string) => {
        switch (type) {
            case 'absence': return 'تنبيه غياب';
            case 'lateness': return 'تنبيه تأخر';
            case 'performance_memo': return 'تنبيه تقصير';
            case 'general': return 'تقرير دوري';
            case 'suspension_warning': return 'إنذار فصل';
            case 'final_expulsion': return 'قرار فصل';
            default: return 'تقرير';
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[260] p-4" onClick={onClose}>
            <motion.div 
                variants={modalVariants} 
                initial="initial" 
                animate="animate" 
                exit="exit" 
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md h-[80vh] flex flex-col overflow-hidden"
            >
                <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
                    <h3 className="font-bold text-lg text-primary dark:text-accent flex items-center gap-2">
                        <FaHistory /> سجل المراسلات
                    </h3>
                    <button onClick={onClose}><FaTimes /></button>
                </div>

                {selectedLog ? (
                    <div className="flex-grow flex flex-col p-4 overflow-hidden">
                        <button onClick={() => setSelectedLog(null)} className="text-sm text-gray-500 hover:text-primary mb-2 self-start flex items-center gap-1">
                            &rarr; عودة للقائمة
                        </button>
                        <div className="flex items-center justify-between mb-4 border-b dark:border-gray-700 pb-2">
                            <div>
                                <span className="font-bold text-sm block">{getTypeLabel(selectedLog.type)}</span>
                                <span className="text-xs text-gray-400">{formatDateTime(selectedLog.timestamp)}</span>
                            </div>
                            {getIcon(selectedLog.type)}
                        </div>
                        <div className="flex-grow overflow-y-auto bg-gray-50 dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700 text-sm whitespace-pre-wrap leading-relaxed">
                            {selectedLog.content || "لا يتوفر نص الرسالة لهذا السجل."}
                        </div>
                    </div>
                ) : (
                    <div className="flex-grow overflow-y-auto p-4 space-y-3">
                        {history.length === 0 ? (
                            <div className="text-center text-gray-500 py-10">
                                <p>لا توجد مراسلات مسجلة.</p>
                            </div>
                        ) : (
                            history.sort((a,b) => b.timestamp - a.timestamp).map(log => (
                                <div 
                                    key={log.id} 
                                    onClick={() => setSelectedLog(log)}
                                    className="p-3 bg-white dark:bg-gray-700/30 border border-gray-100 dark:border-gray-700 rounded-lg flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full">
                                            {getIcon(log.type)}
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm text-gray-800 dark:text-gray-200">{getTypeLabel(log.type)}</p>
                                            <p className="text-[10px] text-gray-500 dark:text-gray-400">{formatDateTime(log.timestamp)}</p>
                                        </div>
                                    </div>
                                    <span className="text-[10px] bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-1 rounded-full">
                                        تم الإرسال
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </motion.div>
        </div>
    );
};

export default SentReportsHistoryModal;
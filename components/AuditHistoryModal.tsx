
import React from 'react';
import { motion } from 'framer-motion';
import { FaTimes, FaHistory } from 'react-icons/fa';
import { PointHistoryEntry } from '../types';
import { formatDateTime } from '../utils/helpers';

interface AuditHistoryModalProps {
    history: PointHistoryEntry[];
    onClose: () => void;
}

const modalVariants = {
    initial: { scale: 0.9, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0.9, opacity: 0 },
};

const AuditHistoryModal: React.FC<AuditHistoryModalProps> = ({ history, onClose }) => {
    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[250] p-4" onClick={onClose}>
            <motion.div 
                variants={modalVariants} 
                initial="initial" 
                animate="animate" 
                exit="exit" 
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-5 w-full max-w-sm"
            >
                <div className="flex justify-between items-center mb-4 border-b dark:border-gray-700 pb-2">
                    <h3 className="font-bold text-lg flex items-center gap-2 text-primary dark:text-accent">
                        <FaHistory /> سجل التعديلات
                    </h3>
                    <button onClick={onClose}><FaTimes /></button>
                </div>
                
                <div className="max-h-60 overflow-y-auto space-y-3">
                    {history.length === 0 ? (
                        <p className="text-gray-500 text-center text-sm">لا توجد تعديلات سابقة.</p>
                    ) : (
                        history.sort((a,b) => b.date - a.date).map((entry, idx) => (
                            <div key={idx} className="bg-gray-50 dark:bg-gray-700/30 p-3 rounded-lg text-sm border-r-4 border-yellow-400">
                                <p className="text-xs text-gray-400 mb-2">{formatDateTime(entry.date)}</p>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div>
                                        <span className="font-bold block text-gray-500">قبل التعديل:</span>
                                        <span className={entry.oldAmount > 0 ? 'text-green-600' : 'text-red-600'}>{entry.oldAmount} نقطة</span>
                                        {entry.oldReason && <p className="text-gray-400 truncate">{entry.oldReason}</p>}
                                    </div>
                                    <div>
                                        <span className="font-bold block text-gray-500">بعد التعديل:</span>
                                        <span className={entry.newAmount > 0 ? 'text-green-600' : 'text-red-600'}>{entry.newAmount} نقطة</span>
                                        {entry.newReason && <p className="text-gray-400 truncate">{entry.newReason}</p>}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
                
                <button onClick={onClose} className="w-full mt-4 bg-gray-200 dark:bg-gray-700 p-2 rounded-lg text-sm font-bold">
                    إغلاق
                </button>
            </motion.div>
        </div>
    );
};

export default AuditHistoryModal;

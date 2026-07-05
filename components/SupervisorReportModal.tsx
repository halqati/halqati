


import React from 'react';
import { motion } from 'framer-motion';
import { FaTimes, FaCopy, FaShareAlt, FaWhatsapp, FaSave } from 'react-icons/fa';
import { ShareModalData } from '../types';

interface SupervisorReportModalProps {
    reportContent: string;
    periodLabel: string;
    onClose: () => void;
    onSave: (reportContent: string, periodLabel: string) => void;
    addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
    onOpenShare: (data: Omit<ShareModalData, 'isOpen'>) => void;
}

const modalVariants = {
  initial: { scale: 0.9, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  exit: { scale: 0.9, opacity: 0 },
};

const SupervisorReportModal: React.FC<SupervisorReportModalProps> = ({ reportContent, periodLabel, onClose, onSave, addToast, onOpenShare }) => {

    const handleShare = () => {
        onOpenShare({
            title: `تقرير المشرف: ${periodLabel}`,
            text: reportContent,
        });
    };

    const handleSaveClick = () => {
        onSave(reportContent, periodLabel);
        onClose(); // Close after save
    }

    const whatsappMessage = encodeURIComponent(reportContent);

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[190] p-4">
            <motion.div variants={modalVariants} initial="initial" animate="animate" exit="exit" className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md flex flex-col h-[90vh]">
                <div className="flex justify-between items-center mb-4 flex-shrink-0">
                    <h2 className="text-xl font-bold text-primary dark:text-accent">تقرير المشرف</h2>
                    <button onClick={onClose}><FaTimes /></button>
                </div>
                <textarea
                    value={reportContent}
                    readOnly
                    className="w-full flex-grow p-2 border rounded-lg bg-gray-50 dark:bg-gray-900 dark:border-gray-700 font-mono text-sm"
                />
                <div className="mt-4 flex-shrink-0 space-y-3">
                    <button onClick={handleSaveClick} className="w-full p-3 bg-teal-500 text-white rounded-lg flex items-center justify-center gap-2 font-semibold">
                        <FaSave /> حفظ التقرير
                    </button>
                    <div className="grid grid-cols-3 gap-3">
                        <button onClick={() => { navigator.clipboard.writeText(reportContent); addToast('تم النسخ إلى الحافظة', 'info'); }} className="p-3 bg-blue-500 text-white rounded-lg flex items-center justify-center gap-2"><FaCopy /> نسخ</button>
                        <a href={`https://wa.me/?text=${whatsappMessage}`} target="_blank" rel="noopener noreferrer" className='p-3 bg-yellow-500 text-white rounded-lg flex items-center justify-center gap-2'>
                            <FaWhatsapp /> واتساب
                        </a>
                        <button onClick={handleShare} className="p-3 bg-green-500 text-white rounded-lg flex items-center justify-center gap-2"><FaShareAlt /> مشاركة</button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default SupervisorReportModal;
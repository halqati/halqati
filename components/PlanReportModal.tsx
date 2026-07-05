import React from 'react';
import { motion } from 'framer-motion';
import { Plan, CircleData, ShareModalData } from '../types';
import { FaTimes, FaCopy, FaWhatsapp, FaShareAlt } from 'react-icons/fa';
import { generatePlanCollectiveReport } from '../utils/helpers';

interface PlanReportModalProps {
    plan: Plan;
    circleData: CircleData;
    onClose: () => void;
    onNotify: () => void;
    addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
    onOpenShare: (data: Omit<ShareModalData, 'isOpen'>) => void;
}

const modalVariants = {
  initial: { scale: 0.9, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  exit: { scale: 0.9, opacity: 0 },
};

const PlanReportModal: React.FC<PlanReportModalProps> = ({ plan, circleData, onClose, onNotify, addToast, onOpenShare }) => {
    const reportText = generatePlanCollectiveReport(plan, circleData);
    
    const handleCopy = () => {
        navigator.clipboard.writeText(reportText);
        addToast('تم النسخ إلى الحافظة', 'info');
    };

    const handleShare = () => {
        onOpenShare({
            title: `تقرير الخطة: ${plan.name}`,
            text: reportText,
        });
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div variants={modalVariants} initial="initial" animate="animate" exit="exit" className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md transition-colors duration-300 h-[80vh] flex flex-col">
                <div className="flex justify-between items-center mb-4 flex-shrink-0">
                    <h2 className="text-xl font-bold text-primary dark:text-accent">تقرير الخطة</h2>
                    <button onClick={onClose}><FaTimes /></button>
                </div>
                <textarea
                    value={reportText}
                    readOnly
                    className="w-full h-full flex-grow p-2 border rounded-lg bg-gray-50 dark:bg-gray-900 dark:border-gray-700 font-mono text-sm"
                />
                <div className="mt-4 space-y-3 flex-shrink-0">
                    <div className="grid grid-cols-3 gap-3">
                        <button onClick={handleCopy} className="p-2 bg-blue-500 text-white rounded-lg flex items-center justify-center gap-2"><FaCopy /> نسخ</button>
                        <button onClick={onNotify} className="p-2 bg-yellow-500 text-white rounded-lg flex items-center justify-center gap-2"><FaWhatsapp /> إعلام الأولياء</button>
                        <button onClick={handleShare} className="p-2 bg-green-500 text-white rounded-lg flex items-center justify-center gap-2"><FaShareAlt /> مشاركة</button>
                    </div>
                    <button onClick={onClose} className="w-full p-2 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg">إغلاق</button>
                </div>
            </motion.div>
        </div>
    );
};

export default PlanReportModal;
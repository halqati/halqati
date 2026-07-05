
import React from 'react';
import { motion } from 'framer-motion';
import { StudentReport, SupervisorReport, CircleData, Student, ShareModalData } from '../types';
import { FaTimes, FaCopy, FaShareAlt, FaWhatsapp, FaTrash } from 'react-icons/fa';

interface ViewReportModalProps {
    report: StudentReport | SupervisorReport;
    type: 'student' | 'supervisor';
    circleData: CircleData;
    student?: Student;
    onClose: () => void;
    addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
    onOpenShare: (data: Omit<ShareModalData, 'isOpen'>) => void;
}

const modalVariants = {
  initial: { scale: 0.9, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  exit: { scale: 0.9, opacity: 0 },
};

const ViewReportModal: React.FC<ViewReportModalProps> = ({ report, type, circleData, student, onClose, addToast, onOpenShare }) => {

    const reportContent = report.content;
    const periodLabel = type === 'student' ? (report as StudentReport).period : (report as SupervisorReport).periodLabel;
    
    const handleShare = () => {
        onOpenShare({
            title: `تقرير: ${periodLabel}`,
            text: reportContent,
        });
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(reportContent);
        addToast('تم النسخ إلى الحافظة', 'info');
    };

    const whatsappMessage = encodeURIComponent(reportContent);
    const studentPhone = student?.parentPhone;
    const whatsappLink = type === 'student' && studentPhone ? `https://wa.me/${studentPhone}?text=${whatsappMessage}` : `https://wa.me/?text=${whatsappMessage}`;


    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[220] p-4">
            <motion.div variants={modalVariants} initial="initial" animate="animate" exit="exit" className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md flex flex-col h-[90vh]">
                <div className="flex justify-between items-center mb-4 flex-shrink-0">
                    <h2 className="text-xl font-bold text-primary dark:text-accent">عرض التقرير</h2>
                    <button onClick={onClose}><FaTimes /></button>
                </div>
                <textarea
                    value={reportContent}
                    readOnly
                    className="w-full flex-grow p-2 border rounded-lg bg-gray-50 dark:bg-gray-900 dark:border-gray-700 font-mono text-sm"
                />
                <div className="grid grid-cols-3 gap-3 mt-4 flex-shrink-0">
                    <button onClick={handleCopy} className="p-3 bg-blue-500 text-white rounded-lg flex items-center justify-center gap-2"><FaCopy /> نسخ</button>
                    <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className={`p-3 rounded-lg flex items-center justify-center gap-2 ${type === 'student' && !studentPhone ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 cursor-not-allowed' : 'bg-yellow-500 text-white'}`}>
                        <FaWhatsapp /> واتساب
                    </a>
                    <button onClick={handleShare} className="p-3 bg-green-500 text-white rounded-lg flex items-center justify-center gap-2"><FaShareAlt /> مشاركة</button>
                </div>
            </motion.div>
        </div>
    );
};

export default ViewReportModal;
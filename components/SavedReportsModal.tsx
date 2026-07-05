
import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { SupervisorReport } from '../types';
import { FaTimes, FaFileAlt, FaTrash } from 'react-icons/fa';
import { formatDate } from '../utils/helpers';

interface SavedReportsModalProps {
    reports: SupervisorReport[];
    onClose: () => void;
    onView: (report: SupervisorReport) => void;
    onDelete: (reportId: number) => void;
}

const modalVariants = {
    initial: { y: '100%' },
    animate: { y: 0 },
    exit: { y: '100%' },
};

const SavedReportsModal: React.FC<SavedReportsModalProps> = ({ reports, onClose, onView, onDelete }) => {
    
    const sortedReports = useMemo(() => 
        [...(reports || [])].sort((a, b) => b.generatedAt - a.generatedAt),
    [reports]);


    return (
        <motion.div variants={modalVariants} initial="initial" animate="animate" exit="exit" transition={{ type: 'spring', stiffness: 300, damping: 30 }} className="fixed inset-0 bg-gray-100 dark:bg-gray-900 z-[200] flex flex-col p-4 max-w-md mx-auto">
            <div className="flex items-center justify-between mb-4 pb-4 border-b dark:border-gray-700 flex-shrink-0">
                <h2 className="text-xl font-bold text-primary dark:text-accent">التقارير المحفوظة</h2>
                <button onClick={onClose}><FaTimes size={20} /></button>
            </div>
            <div className="flex-grow overflow-y-auto space-y-3">
                {sortedReports.length === 0 ? (
                    <p className="text-center text-gray-500 py-10">لا توجد تقارير محفوظة.</p>
                ) : (
                    sortedReports.map(report => (
                        <div key={report.id} className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow flex items-center justify-between">
                            <button onClick={() => onView(report)} className="flex-grow text-right">
                                <p className="font-bold">{report.periodLabel}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {formatDate(new Date(report.generatedAt).toISOString().split('T')[0])}
                                </p>
                            </button>
                             <button onClick={() => onDelete(report.id)} className="text-red-500 hover:text-red-700 p-2 ml-2 flex-shrink-0">
                                <FaTrash />
                            </button>
                        </div>
                    ))
                )}
            </div>
        </motion.div>
    );
};

export default SavedReportsModal;

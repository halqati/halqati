import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { StudentReport } from '../types';
import { FaTimes, FaFileAlt, FaTrash } from 'react-icons/fa';
import { formatDate } from '../utils/helpers';

interface SavedStudentReportsModalProps {
    reports: StudentReport[];
    onClose: () => void;
    onShowReport: (report: StudentReport) => void;
    onDelete: (reportId: number) => void;
}

const modalVariants = {
    initial: { scale: 0.9, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0.9, opacity: 0 },
};

const SavedStudentReportsModal: React.FC<SavedStudentReportsModalProps> = ({ reports, onClose, onShowReport, onDelete }) => {
    
    const sortedReports = useMemo(() =>
        [...(reports || [])].sort((a, b) => b.generatedAt - a.generatedAt),
    [reports]);

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <motion.div variants={modalVariants} initial="initial" animate="animate" exit="exit" className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md h-[70vh] flex flex-col">
                <div className="flex justify-between items-center mb-4 flex-shrink-0">
                    <h2 className="text-xl font-bold text-primary dark:text-accent">التقارير المحفوظة</h2>
                    <button onClick={onClose}><FaTimes /></button>
                </div>
                <div className="flex-grow overflow-y-auto space-y-2">
                    {sortedReports.map(report => (
                        <div
                            key={report.id}
                            className="w-full text-right flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/40 rounded-lg"
                        >
                            <button
                                onClick={() => onShowReport(report)}
                                className="flex-grow flex items-center gap-3 text-right"
                            >
                                <FaFileAlt className="text-blue-500" />
                                <div>
                                    <span className="font-semibold">{report.period}</span>
                                    <span className="block text-xs text-gray-500">{formatDate(new Date(report.generatedAt).toISOString().split('T')[0])}</span>
                                </div>
                            </button>
                            <button
                                onClick={() => onDelete(report.id)}
                                className="text-red-500 hover:text-red-700 p-2 ml-2 flex-shrink-0"
                            >
                                <FaTrash />
                            </button>
                        </div>
                    ))}
                </div>
            </motion.div>
        </div>
    );
};

export default SavedStudentReportsModal;
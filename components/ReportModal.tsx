import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Session, CircleData, ShareModalData, SupervisorReportSettings } from '../types';
import { FaTimes, FaCopy, FaShareAlt, FaWhatsapp, FaUserShield } from 'react-icons/fa';
import { generateCollectiveReport, generateSessionSummary } from '../utils/helpers';
import SupervisorSettingsModal from './SupervisorSettingsModal';

interface ReportModalProps {
    session: Session;
    data: CircleData;
    onClose: () => void;
    onNotifyParents: () => void;
    addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
    onOpenShare: (data: Omit<ShareModalData, 'isOpen'>) => void;
    onUpdateSupervisorSettings: (settings: SupervisorReportSettings) => void;
}

const modalVariants = {
  initial: { scale: 0.9, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  exit: { scale: 0.9, opacity: 0 },
};

const ReportModal: React.FC<ReportModalProps> = ({ session, data, onClose, onNotifyParents, addToast, onOpenShare, onUpdateSupervisorSettings }) => {
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const reportText = generateCollectiveReport(session, data);
    const summaryText = generateSessionSummary(session, data);
    
    const getFinalText = () => {
        if (!data.supervisorSettings?.isSummaryEnabled) return reportText;
        
        const dateMarker = "`اليوم";
        const markerIndex = reportText.indexOf(dateMarker);
        if (markerIndex !== -1) {
            const afterMarkerLine = reportText.indexOf('\n', markerIndex);
            if (afterMarkerLine !== -1) {
                return reportText.slice(0, afterMarkerLine + 1) + 
                       summaryText + "\n" + 
                       reportText.slice(afterMarkerLine + 1);
            }
        }
        return `${summaryText}\n${reportText}`;
    };

    const finalReportText = getFinalText();
    
    const handleShare = () => {
        onOpenShare({
            title: `تقرير حلقة ${data.circle}`,
            text: finalReportText,
            supervisorSettings: data.supervisorSettings,
            onSendToSupervisor: (text) => {
                addToast('تم التحويل لواتساب المشرف', 'success');
            }
        });
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div variants={modalVariants} initial="initial" animate="animate" exit="exit" className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md transition-colors duration-300">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-primary dark:text-accent">تقرير الجلسة</h2>
                    <button 
                        onClick={() => setIsSettingsOpen(true)}
                        className="p-2 text-gray-400 hover:text-primary dark:hover:text-accent transition-colors"
                        title="إعدادات المشرف"
                    >
                        <FaUserShield />
                    </button>
                </div>
                <textarea
                    value={finalReportText}
                    readOnly
                    className="w-full h-64 p-2 border rounded-lg bg-gray-50 dark:bg-gray-900 dark:border-gray-700 font-mono text-sm"
                />
                <div className="mt-4 space-y-3">
                    <div className="grid grid-cols-3 gap-3">
                        <button onClick={() => { 
                            navigator.clipboard.writeText(finalReportText); 
                            addToast('تم النسخ إلى الحافظة', 'info'); 
                        }} className="p-2 bg-blue-500 text-white rounded-lg flex items-center justify-center gap-2 text-sm"><FaCopy /> نسخ</button>
                        <button onClick={onNotifyParents} className="p-2 bg-yellow-500 text-white rounded-lg flex items-center justify-center gap-2 text-sm"><FaWhatsapp /> إعلام</button>
                        <button 
                            onClick={handleShare}
                            className="p-2 bg-green-500 text-white rounded-lg flex items-center justify-center gap-2 text-sm"
                        >
                            <FaShareAlt /> مشاركة
                        </button>
                    </div>
                    <button onClick={onClose} className="w-full p-2 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg">إغلاق</button>
                </div>

                <AnimatePresence>
                    {isSettingsOpen && (
                        <SupervisorSettingsModal 
                            isOpen={isSettingsOpen}
                            onClose={() => setIsSettingsOpen(false)}
                            settings={data.supervisorSettings}
                            onSave={onUpdateSupervisorSettings}
                        />
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
};

export default ReportModal;

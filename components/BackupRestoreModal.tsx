
import React from 'react';
import { motion } from 'framer-motion';
import { FaTimes, FaUpload, FaDownload, FaFileAlt } from 'react-icons/fa';

interface BackupRestoreModalProps {
    onClose: () => void;
    onCreateBackup: () => void;
    onImportBackup: () => void;
    onOpenTextBackup?: () => void;
    onOpenTextRestore?: () => void;
}

const modalVariants = {
    initial: { y: '100%' },
    animate: { y: 0 },
    exit: { y: '100%' },
};

const BackupRestoreModal: React.FC<BackupRestoreModalProps> = ({ onClose, onCreateBackup, onImportBackup, onOpenTextBackup, onOpenTextRestore }) => {
    return (
        <motion.div
            variants={modalVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed inset-0 bg-gray-50 dark:bg-gray-900 z-40 flex flex-col p-4 max-w-md mx-auto"
        >
            <div className="flex items-center justify-between mb-4 pb-4 border-b dark:border-gray-700 flex-shrink-0">
                <h2 className="text-xl font-bold text-primary dark:text-accent">النسخة الاحتياطية والاستعادة</h2>
                <button onClick={onClose}><FaTimes size={20} /></button>
            </div>
            <div className="flex-grow overflow-y-auto space-y-6 pt-4">
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow space-y-3">
                    <p className="text-xs font-bold text-yellow-600 dark:text-yellow-400 mb-2 flex items-center gap-1">
                        <span className="text-lg">⚠️</span> ملاحظة: ميزة حفظ الملف قد لا تعمل على بعض الهواتف بسبب قيود النظام.
                    </p>
                    
                    {onOpenTextBackup && (
                        <button 
                            onClick={onOpenTextBackup} 
                            className="w-full p-2 text-sm text-blue-500 dark:text-blue-400 hover:underline font-semibold bg-blue-50 dark:bg-blue-900/20 rounded-lg mb-2"
                        >
                            حل بديل مؤقت (نسخ النص)
                        </button>
                    )}

                    <button 
                        onClick={() => {
                            onCreateBackup();
                            onClose();
                        }} 
                        className="w-full bg-blue-500 text-white p-4 rounded-lg font-bold flex items-center justify-center gap-3 text-lg"
                    >
                        <FaDownload /> إنشاء ملف نسخة احتياطية
                    </button>
                </div>

                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow space-y-3">
                    <button 
                        onClick={() => {
                            onImportBackup();
                            onClose();
                        }} 
                        className="w-full bg-green-500 text-white p-4 rounded-lg font-bold flex items-center justify-center gap-3 text-lg"
                    >
                        <FaUpload /> استيراد ملف نسخة احتياطية
                    </button>
                    
                    {onOpenTextRestore && (
                        <button 
                            onClick={onOpenTextRestore}
                            className="w-full p-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 font-semibold flex items-center justify-center gap-2"
                        >
                            <FaFileAlt /> استيراد من نص
                        </button>
                    )}
                </div>
            </div>
        </motion.div>
    );
};

export default BackupRestoreModal;

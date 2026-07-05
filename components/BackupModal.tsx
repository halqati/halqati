import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FaTimes } from 'react-icons/fa';
import { CircleData, AlertModalData } from '../types';

// FIX: Add type definitions for the File System Access API to resolve the "not callable" error.
// `window.showSaveFilePicker` is a newer browser API and may not be in the default TypeScript lib.
declare global {
    interface Window {
        showSaveFilePicker(options?: {
            suggestedName?: string;
            types?: {
                description?: string;
                accept?: { [key: string]: string[] };
            }[];
        }): Promise<{
            createWritable(): Promise<{
                write(data: Blob): Promise<void>;
                close(): Promise<void>;
            }>;
        }>;
    }
}


interface BackupModalProps {
    activeCircle: CircleData;
    onClose: () => void;
    addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
    setAlertModal: (data: AlertModalData) => void;
}

const modalVariants = {
    initial: { scale: 0.9, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0.9, opacity: 0 },
};

const BackupModal: React.FC<BackupModalProps> = ({ activeCircle, onClose, addToast, setAlertModal }) => {
    const [filename, setFilename] = useState(`backup_${activeCircle.circle.replace(/\s/g, '_')}`);

    const handleSave = async () => {
        if (!filename.trim()) {
            setAlertModal({ isOpen: true, title: 'خطأ', message: 'يرجى إدخال اسم للملف.' });
            return;
        }

        const dataStr = JSON.stringify(activeCircle, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const fullFilename = `${filename.trim()}.json`;

        // Modern API: File System Access (for desktop browsers that are not in a cross-origin iframe)
        if ('showSaveFilePicker' in window) {
            try {
                const handle = await window.showSaveFilePicker({
                    suggestedName: fullFilename,
                    types: [{
                        description: 'JSON Files',
                        accept: { 'application/json': ['.json'] },
                    }],
                });
                const writable = await handle.createWritable();
                await writable.write(blob);
                await writable.close();
                onClose();
                addToast('✅ تم حفظ النسخة الاحتياطية بنجاح.');
                return;
            } catch (error: any) {
                if (error.name === 'AbortError') {
                    console.log('User cancelled save dialog.');
                    return;
                }
                console.warn("showSaveFilePicker failed, falling back to legacy download.", error);
            }
        }

        // Fallback for mobile/Cordova using a data URI, which is more reliable in WebViews.
        try {
            const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
            const link = document.createElement('a');
            link.href = dataUri;
            link.download = fullFilename;
            
            document.body.appendChild(link);
            link.click();
            
            document.body.removeChild(link);

            onClose();
            addToast('✅ تم إنشاء النسخة الاحتياطية بنجاح.');
        } catch (error) {
            console.error("Backup fallback failed:", error);
            setAlertModal({ isOpen: true, title: 'فشل الحفظ', message: 'لم يتمكن المتصفح من حفظ الملف. قد تحتاج إلى استخدام متصفح آخر أو جهاز كمبيوتر.' });
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <motion.div variants={modalVariants} initial="initial" animate="animate" exit="exit" className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-sm">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-primary dark:text-accent">إنشاء نسخة احتياطية</h2>
                    <button onClick={onClose}><FaTimes /></button>
                </div>
                <div className="space-y-4">
                    <label htmlFor="backup-filename" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        اسم ملف النسخة الاحتياطية:
                    </label>
                    <input
                        id="backup-filename"
                        type="text"
                        value={filename}
                        onChange={(e) => setFilename(e.target.value)}
                        className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600"
                    />
                </div>
                <div className="flex justify-end gap-3 mt-6">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-600">إلغاء</button>
                    <button onClick={handleSave} className="px-4 py-2 rounded-lg bg-primary text-white">حفظ</button>
                </div>
            </motion.div>
        </div>
    );
};

export default BackupModal;
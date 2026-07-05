
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FaTimes, FaUpload } from 'react-icons/fa';

interface TextRestoreModalProps {
    onClose: () => void;
    onRestore: (text: string) => void;
}

const modalVariants = {
    initial: { scale: 0.9, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0.9, opacity: 0 },
};

const TextRestoreModal: React.FC<TextRestoreModalProps> = ({ onClose, onRestore }) => {
    const [text, setText] = useState('');

    const handleRestore = () => {
        if (text.trim()) {
            onRestore(text.trim());
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[260] p-4">
            <motion.div variants={modalVariants} initial="initial" animate="animate" exit="exit" className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md h-[90vh] flex flex-col">
                 <div className="flex justify-between items-center mb-4 flex-shrink-0">
                    <h2 className="text-xl font-bold text-primary dark:text-accent">استيراد من نص</h2>
                    <button onClick={onClose}><FaTimes /></button>
                </div>
                <div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-lg text-sm mb-4 flex-shrink-0">
                    <p className="font-bold mb-1">تعليمات:</p>
                    <p>ألصق نص النسخة الاحتياطية الذي قمت بنسخه مسبقًا في الحقل أدناه، ثم اضغط استيراد.</p>
                </div>
                <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="ألصق النص هنا..."
                    className="w-full flex-grow p-3 border rounded-lg bg-gray-50 dark:bg-gray-900 dark:border-gray-700 font-mono text-xs"
                />
                <div className="mt-4 flex flex-col gap-2 flex-shrink-0">
                     <button onClick={handleRestore} disabled={!text.trim()} className="w-full p-3 bg-primary text-white rounded-lg flex items-center justify-center gap-2 disabled:bg-gray-400 font-bold shadow-md">
                        <FaUpload /> استيراد
                    </button>
                    <button onClick={onClose} className="w-full p-2 bg-gray-200 dark:bg-gray-600 rounded-lg">إلغاء</button>
                </div>
            </motion.div>
        </div>
    );
};

export default TextRestoreModal;

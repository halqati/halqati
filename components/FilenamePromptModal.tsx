import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaTimes } from 'react-icons/fa';

interface FilenamePromptModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (filename: string) => void;
    title: string;
    label: string;
    initialValue: string;
    description?: string;
}

const modalVariants = {
    initial: { scale: 0.9, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0.9, opacity: 0 },
};

const FilenamePromptModal: React.FC<FilenamePromptModalProps> = ({ isOpen, onClose, onConfirm, title, label, initialValue, description }) => {
    const [filename, setFilename] = useState(initialValue);

    useEffect(() => {
        if (isOpen) {
            setFilename(initialValue);
        }
    }, [isOpen, initialValue]);

    const handleConfirm = () => {
        if (filename.trim()) {
            onConfirm(filename.trim());
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4">
            <motion.div variants={modalVariants} initial="initial" animate="animate" exit="exit" className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-sm">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-primary dark:text-accent">{title}</h2>
                    <button onClick={onClose}><FaTimes /></button>
                </div>
                <div className="space-y-4">
                     {description && (
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 rounded-md text-sm">
                            {description}
                        </div>
                    )}
                    <label htmlFor="filename-input" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        {label}
                    </label>
                    <input
                        id="filename-input"
                        type="text"
                        value={filename}
                        onChange={(e) => setFilename(e.target.value)}
                        className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600"
                    />
                </div>
                <div className="flex justify-between items-center mt-6">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-600">إلغاء</button>
                    <div className="flex items-center gap-3">
                        <button onClick={handleConfirm} className="px-4 py-2 rounded-lg bg-primary text-white">تأكيد</button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default FilenamePromptModal;
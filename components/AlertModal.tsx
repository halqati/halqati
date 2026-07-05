
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertModalData } from '../types';

interface AlertModalProps extends AlertModalData {
    onClose: () => void;
}

const modalVariants = {
  initial: { scale: 0.9, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  exit: { scale: 0.9, opacity: 0 },
};

const AlertModal: React.FC<AlertModalProps> = ({ title, message, onClose }) => {
    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4">
            <motion.div variants={modalVariants} initial="initial" animate="animate" exit="exit" className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-sm text-center transition-colors duration-300">
                <h2 className="text-xl font-bold mb-3 text-red-500">{title}</h2>
                <p className="text-gray-600 dark:text-gray-300 mb-6 whitespace-pre-wrap">{message}</p>
                <div className="flex justify-center">
                    <button onClick={onClose} className="px-8 py-2 rounded-lg bg-primary text-white">حسنًا</button>
                </div>
            </motion.div>
        </div>
    );
};

export default AlertModal;


import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ConfirmationModalData } from '../types';

interface ConfirmationModalProps extends Omit<ConfirmationModalData, 'isOpen'> {
    onCancel: () => void;
}

const modalVariants = {
  initial: { scale: 0.9, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  exit: { scale: 0.9, opacity: 0 },
};

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ title, message, onConfirm, onCancel, delay }) => {
    const [countdown, setCountdown] = useState(delay || 0);

    useEffect(() => {
        if (delay && delay > 0) {
            const timer = window.setInterval(() => {
                setCountdown(prev => (prev > 0 ? prev - 1 : 0));
            }, 1000);
            return () => window.clearInterval(timer);
        }
    }, [delay]);

    const isButtonDisabled = countdown > 0;

    const handleConfirm = () => {
        onCancel();
        setTimeout(() => {
            try {
                onConfirm();
            } catch (error) {
                console.error("Error executing onConfirm:", error);
            }
        }, 0);
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200] p-4">
            <motion.div variants={modalVariants} initial="initial" animate="animate" exit="exit" className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-sm text-center transition-colors duration-300">
                <h2 className="text-xl font-bold mb-3">{title}</h2>
                <p className="text-gray-600 dark:text-gray-300 mb-6">{message}</p>
                <div className="flex justify-center gap-4">
                    <button onClick={onCancel} className="px-6 py-2 rounded-lg bg-gray-200 dark:bg-gray-600">إلغاء</button>
                    <button 
                        onClick={handleConfirm} 
                        disabled={isButtonDisabled}
                        className="px-6 py-2 rounded-lg bg-red-500 text-white disabled:bg-gray-400 dark:disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"
                    >
                        {isButtonDisabled ? `تأكيد (${countdown})` : 'تأكيد'}
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default ConfirmationModal;
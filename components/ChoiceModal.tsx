import React from 'react';
import { motion } from 'framer-motion';
import { ChoiceModalData } from '../types';

interface ChoiceModalProps extends Omit<ChoiceModalData, 'isOpen'> {}

const modalVariants = {
  initial: { scale: 0.9, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  exit: { scale: 0.9, opacity: 0 },
};

const ChoiceModal: React.FC<ChoiceModalProps> = ({ title, message, actions, onCancel }) => {
    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <motion.div variants={modalVariants} initial="initial" animate="animate" exit="exit" className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-sm text-center">
                <h2 className="text-xl font-bold mb-3">{title}</h2>
                <p className="text-gray-600 dark:text-gray-300 mb-6">{message}</p>
                <div className="flex flex-col space-y-3">
                    {actions.map((action, index) => (
                        <button
                            key={index}
                            onClick={action.onClick}
                            className={`px-6 py-3 rounded-lg font-bold ${action.className || 'bg-primary text-white'}`}
                        >
                            {action.text}
                        </button>
                    ))}
                    <button onClick={onCancel} className="px-6 py-2 rounded-lg bg-gray-200 dark:bg-gray-600 mt-2">
                        إلغاء
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default ChoiceModal;

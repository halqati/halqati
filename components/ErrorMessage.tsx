import React from 'react';
import { FaExclamationTriangle } from 'react-icons/fa';
import { motion } from 'framer-motion';

interface ErrorMessageProps {
    message: string;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({ message }) => {
    if (!message) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-red-100 dark:bg-red-900/40 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-300 px-4 py-3 rounded-md relative flex items-center gap-3"
            role="alert"
        >
            <FaExclamationTriangle className="text-red-500" />
            <span className="block sm:inline text-sm font-semibold">{message}</span>
        </motion.div>
    );
};

export default ErrorMessage;

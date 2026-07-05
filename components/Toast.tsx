
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Toast } from '../types';

interface ToastContainerProps {
    toasts: Toast[];
}

const toastVariants = {
    initial: { opacity: 0, y: -20, scale: 0.8 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: -20, scale: 0.8 },
};

const toastColors = {
    success: 'bg-emerald-600 text-white',
    error: 'bg-rose-600 text-white',
    info: 'bg-slate-800 text-white',
};

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts }) => {
    return (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col items-center gap-2 pointer-events-none">
            <AnimatePresence>
                {toasts.map(toast => (
                    <motion.div
                        key={toast.id}
                        layout
                        variants={toastVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                        className={`flex items-center gap-2 px-4 py-1.5 rounded-full shadow-xl backdrop-blur-sm ${toastColors[toast.type]} text-xs font-bold pointer-events-auto min-w-[120px] justify-center`}
                    >
                        <toast.icon className="text-sm"/>
                        <span>{toast.message}</span>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
};

export default ToastContainer;

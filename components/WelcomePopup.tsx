
import React from 'react';
import { motion } from 'framer-motion';
import { FaHeart } from 'react-icons/fa';

const modalVariants = {
  initial: { scale: 0.9, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  exit: { scale: 0.9, opacity: 0 },
};

interface WelcomePopupProps {
    onClose: () => void;
    gender: 'male' | 'female';
}

const WelcomePopup: React.FC<WelcomePopupProps> = ({ onClose, gender }) => {
    const title = gender === 'female' 
        ? "مرحبًا بكِ يا معلمة القرآن الكريم" 
        : "مرحبًا بك يا معلم القرآن الكريم";

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[999] p-4">
            <motion.div 
                variants={modalVariants} 
                initial="initial" 
                animate="animate" 
                exit="exit" 
                className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-sm text-center transition-colors duration-300"
            >
                <FaHeart className="text-primary dark:text-accent mx-auto text-4xl mb-4" />
                <h2 className="text-2xl font-bold mb-3 text-primary dark:text-accent">{title}</h2>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                    يسعدنا انضمامك! هذا التطبيق هو رفيقك لتنظيم حلقتك ومتابعة طلابك بكل سهولة.
                </p>
                <p className="text-sm font-semibold italic text-gray-500 dark:text-gray-400 mb-6">
                    قال ﷺ: "خيركم من تعلم القرآن وعلمه"
                </p>
                <button 
                    onClick={onClose} 
                    className="w-full px-8 py-3 rounded-lg bg-primary text-white font-bold"
                >
                    ابدأ الآن
                </button>
            </motion.div>
        </div>
    );
};

export default WelcomePopup;



import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FaTimes } from 'react-icons/fa';

interface TermsOfServiceModalProps {
    onAgree: () => void;
    onClose: () => void;
}

const modalVariants = {
    initial: { scale: 0.9, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0.9, opacity: 0 },
};

const terms = [
    "هذا المجتمع مخصص لمناقشة أمور التطبيق واقتراح التحسينات والميزات الجديدة.",
    "يُمنع منعاً باتاً نشر الإعلانات أو الروابط الخارجية التي لا تتعلق بالتطبيق.",
    "يرجى الالتزام بالاحترام المتبادل بين الأعضاء وتجنب إرسال رسائل خاصة مزعجة.",
    "سيتم إزالة أي عضو يخالف هذه الشروط دون سابق إنذار.",
];

const TermsOfServiceModal: React.FC<TermsOfServiceModalProps> = ({ onAgree, onClose }) => {
    const [isChecked, setIsChecked] = useState(false);

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[999] p-4">
            <motion.div
                variants={modalVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md flex flex-col h-[90vh]"
            >
                <div className="flex justify-between items-center mb-4 flex-shrink-0">
                    <h2 className="text-xl font-bold text-primary dark:text-accent">شروط الانضمام للمجتمع</h2>
                    <button onClick={onClose}><FaTimes /></button>
                </div>

                <div className="flex-grow overflow-y-auto space-y-4 pr-2">
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                        أهلاً بك! للانضمام إلى مجتمع التطبيق، يرجى قراءة والموافقة على القواعد التالية لضمان بيئة تفاعلية ومفيدة للجميع.
                    </p>
                    <ul className="space-y-3 list-disc list-inside text-sm">
                        {terms.map((term, index) => (
                            <li key={index} className="text-gray-700 dark:text-gray-300">{term}</li>
                        ))}
                    </ul>
                </div>

                <div className="mt-6 flex-shrink-0">
                    <label className="flex items-center gap-3 p-3 bg-gray-100 dark:bg-gray-700/50 rounded-lg cursor-pointer">
                        <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => setIsChecked(!isChecked)}
                            className="w-5 h-5 accent-primary"
                        />
                        <span className="text-sm font-semibold">قرأت وأوافق على جميع الشروط</span>
                    </label>
                    <button
                        onClick={onAgree}
                        disabled={!isChecked}
                        className="w-full mt-4 px-8 py-3 rounded-lg bg-primary text-white font-bold disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                        موافقة والانضمام
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default TermsOfServiceModal;
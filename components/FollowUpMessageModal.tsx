
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaTimes, FaWhatsapp, FaCopy, FaCheck } from 'react-icons/fa';

interface FollowUpMessageModalProps {
    isOpen: boolean;
    onClose: () => void;
    studentName: string;
    parentPhone?: string;
    initialMessage: string;
    onConfirm: (finalMessage: string, actionType: 'copy' | 'whatsapp') => void;
}

const modalVariants = {
    initial: { scale: 0.9, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0.9, opacity: 0 },
};

const FollowUpMessageModal: React.FC<FollowUpMessageModalProps> = ({ isOpen, onClose, studentName, parentPhone, initialMessage, onConfirm }) => {
    const [message, setMessage] = useState(initialMessage);

    useEffect(() => {
        setMessage(initialMessage);
    }, [initialMessage]);

    if (!isOpen) return null;

    const handleCopy = () => {
        navigator.clipboard.writeText(message);
        onConfirm(message, 'copy');
    };

    const handleSendWhatsApp = () => {
        const whatsappLink = `https://wa.me/${parentPhone || ''}?text=${encodeURIComponent(message)}`;
        window.open(whatsappLink, '_blank');
        onConfirm(message, 'whatsapp');
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[250] p-4" onClick={onClose}>
            <motion.div 
                variants={modalVariants} 
                initial="initial" 
                animate="animate" 
                exit="exit" 
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-5 w-full max-w-md flex flex-col h-[90vh]"
            >
                <div className="flex justify-between items-center mb-4 border-b dark:border-gray-700 pb-3 flex-shrink-0">
                    <h3 className="font-bold text-lg text-primary dark:text-accent">إخطار ولي أمر: {studentName}</h3>
                    <button onClick={onClose}><FaTimes /></button>
                </div>

                <div className="flex-grow mb-4 overflow-hidden">
                    <label className="block text-xs font-bold text-gray-500 mb-1">نص الرسالة (قابل للتعديل):</label>
                    <textarea 
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        className="w-full h-full p-3 text-sm border rounded-lg bg-gray-50 dark:bg-gray-900 dark:border-gray-700 resize-none focus:ring-2 focus:ring-primary outline-none leading-relaxed"
                    />
                </div>

                <div className="flex gap-3 flex-shrink-0">
                    <button onClick={handleCopy} className="flex-1 bg-blue-100 text-blue-700 p-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 hover:bg-blue-200 transition-colors">
                        <FaCopy /> نسخ (وحفظ)
                    </button>
                    {parentPhone ? (
                        <button 
                            onClick={handleSendWhatsApp}
                            className="flex-1 bg-green-500 text-white p-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 hover:bg-green-600 transition-colors"
                        >
                            <FaWhatsapp size={18} /> إرسال واتساب
                        </button>
                    ) : (
                        <button disabled className="flex-1 bg-gray-300 text-gray-500 p-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 cursor-not-allowed">
                            لا يوجد رقم
                        </button>
                    )}
                </div>
                <p className="text-[10px] text-gray-400 text-center mt-2">
                    * الضغط على نسخ أو إرسال يقوم بحفظ العملية في سجل الطالب.
                </p>
            </motion.div>
        </div>
    );
};

export default FollowUpMessageModal;
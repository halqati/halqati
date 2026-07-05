
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaTimes, FaCopy, FaCheckCircle, FaLock } from 'react-icons/fa';
import { Session } from '../types';
import { formatDate } from '../utils/helpers';

interface ShareSessionCodeModalProps {
    session: Session;
    onClose: () => void;
    addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const modalVariants = {
    initial: { scale: 0.9, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0.9, opacity: 0 },
};

const ShareSessionCodeModal: React.FC<ShareSessionCodeModalProps> = ({ session, onClose, addToast }) => {
    const [code, setCode] = useState('');

    useEffect(() => {
        if (session) {
            try {
                // Create a lightweight version of the session for sharing
                const shareableData = {
                    date: session.date,
                    time: session.time,
                    isLesson: session.isLesson,
                    lessonType: session.lessonType,
                    lessonTitle: session.lessonTitle,
                    students: session.students.map(s => ({
                        id: s.id, // Critical for matching
                        attendance: s.attendance,
                        excuse: s.excuse,
                        memorization: s.memorization,
                        review: s.review,
                        note: s.note,
                        isKhatim: s.isKhatim,
                        khatimRecitesReview: s.khatimRecitesReview,
                        suspendedMemorization: s.suspendedMemorization,
                        suspendedReview: s.suspendedReview
                    }))
                };

                // Encode to Base64 to look like a "Code" and prevent casual editing
                // UTF-8 compatible encoding
                const jsonString = JSON.stringify(shareableData);
                const utf8Bytes = new TextEncoder().encode(jsonString);
                const binaryString = String.fromCodePoint(...utf8Bytes);
                const base64 = btoa(binaryString);
                
                setCode(base64);
            } catch (error) {
                console.error("Error generating code", error);
                addToast("حدث خطأ أثناء إنشاء الكود", "error");
            }
        }
    }, [session, addToast]);

    const handleCopy = () => {
        navigator.clipboard.writeText(code);
        addToast('✅ تم نسخ كود الجلسة بنجاح.', 'success');
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[300] p-4 backdrop-blur-sm">
            <motion.div 
                variants={modalVariants} 
                initial="initial" 
                animate="animate" 
                exit="exit" 
                className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-md flex flex-col"
            >
                <div className="flex justify-between items-center mb-4 border-b dark:border-gray-700 pb-3">
                    <h2 className="text-xl font-bold text-primary dark:text-accent flex items-center gap-2">
                        <FaLock /> مشاركة الجلسة 
                    </h2>
                    <button onClick={onClose}><FaTimes /></button>
                </div>

                <div className="space-y-4 mb-6">
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800 text-sm text-yellow-800 dark:text-yellow-200">
                        <p className="font-bold mb-1">⚠️ تعليمات هامة:</p>
                        <ul className="list-disc list-inside space-y-1 text-xs opacity-90">
                            <li>هذا الكود ينقل تفاصيل الجلسة (الحضور، التسميع، الملاحظات) <strong>بالكامل</strong>.</li>
                            <li>أرسل هذا الكود للأستاذ الآخر ليقوم باستيراده.</li>
                            <li><strong>شرط الاستيراد:</strong> يجب أن يكون لدى الأستاذ الآخر <strong>نفس قائمة الطلاب</strong> بنفس المعرفات (نسخة احتياطية).</li>
<li><strong>طريقة الاستيراد:</strong> إضغط 3 ثواني على زر <strong>جلسة جديدة</strong> ثم ضع فيه الكود.</li>
                        </ul>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                            كود الجلسة ({formatDate(session.date)})
                        </label>
                        <textarea
                            readOnly
                            value={code}
                            className="w-full h-32 p-3 text-[10px] font-mono bg-gray-100 dark:bg-gray-900 border dark:border-gray-700 rounded-lg resize-none focus:ring-2 focus:ring-primary outline-none text-gray-600 dark:text-gray-400 break-all"
                            onClick={(e) => e.currentTarget.select()}
                        />
                    </div>
                </div>

                <button 
                    onClick={handleCopy} 
                    className="w-full py-3 bg-primary text-white rounded-lg font-bold flex items-center justify-center gap-2 shadow-lg hover:bg-primary-dark transition-all"
                >
                    <FaCopy /> نسخ الكود وإرساله
                </button>
            </motion.div>
        </div>
    );
};

export default ShareSessionCodeModal;

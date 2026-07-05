
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FaTimes, FaDownload, FaExclamationTriangle, FaCheckCircle, FaSpinner } from 'react-icons/fa';
import { Student } from '../types';

interface ImportSessionCodeModalProps {
    onClose: () => void;
    onImport: (sessionData: any) => void;
    currentStudents: Student[];
    addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const modalVariants = {
    initial: { scale: 0.9, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0.9, opacity: 0 },
};

const ImportSessionCodeModal: React.FC<ImportSessionCodeModalProps> = ({ onClose, onImport, currentStudents, addToast }) => {
    const [code, setCode] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleVerifyAndImport = () => {
        setError(null);
        if (!code.trim()) return;

        setIsVerifying(true);

        // Simulate a small delay for UX
        setTimeout(() => {
            try {
                // Decode
                const binaryString = atob(code.trim());
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.codePointAt(i)!;
                }
                const jsonString = new TextDecoder().decode(bytes);
                const sessionData = JSON.parse(jsonString);

                // Validation 1: Structure check
                if (!sessionData.date || !Array.isArray(sessionData.students)) {
                    throw new Error("كود غير صالح: صيغة البيانات غير صحيحة.");
                }

                // Validation 2: Student Matching
                const currentStudentIds = new Set(currentStudents.map(s => s.id));
                const missingStudents: string[] = [];

                sessionData.students.forEach((s: any) => {
                    if (!currentStudentIds.has(s.id)) {
                        // We can't identify the name easily if we don't have the ID locally, 
                        // but usually the export doesn't carry the name to save space, or it might.
                        // Based on the export logic, we didn't export names. 
                        missingStudents.push(`معرف الطالب: ${s.id}`);
                    }
                });

                if (missingStudents.length > 0) {
                    throw new Error(`لا يمكن الاستيراد. هناك طلاب في الجلسة غير موجودين في حلقتك.\n\nيجب أن تكون قائمة الطلاب متطابقة تماماً (عن طريق استيراد نسخة احتياطية).`);
                }

                // Success
                onImport(sessionData);
                onClose();

            } catch (err: any) {
                console.error(err);
                setError(err.message || "كود غير صالح أو تالف.");
                addToast("فشل التحقق من الكود", "error");
            } finally {
                setIsVerifying(false);
            }
        }, 800);
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
                        <FaDownload /> استيراد جلسة
                    </h2>
                    <button onClick={onClose}><FaTimes /></button>
                </div>

                <div className="space-y-4 mb-6">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800 text-sm text-blue-800 dark:text-blue-200">
                        <p className="font-bold mb-1 flex items-center gap-2"><FaExclamationTriangle /> شروط الاستيراد الصارمة:</p>
                        <ul className="list-disc list-inside space-y-1 text-xs opacity-90">
                            <li>يجب أن تكون قد قمت باستيراد <strong>نفس النسخة الاحتياطية</strong> للطلاب التي لدى المُرسل.</li>
                            <li>لن يتم الاستيراد إذا كان هناك طالب واحد مفقود أو مختلف.</li>
                            <li>سيتم احتساب النقاط بناءً على إعداداتك الحالية، وليس إعدادات المُرسل.</li>
                        </ul>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                            أدخل كود الجلسة هنا:
                        </label>
                        <textarea
                            value={code}
                            onChange={(e) => { setCode(e.target.value); setError(null); }}
                            placeholder="ألصق الكود الطويل هنا..."
                            className="w-full h-32 p-3 text-[10px] font-mono bg-gray-100 dark:bg-gray-900 border dark:border-gray-700 rounded-lg resize-none focus:ring-2 focus:ring-primary outline-none text-gray-600 dark:text-gray-400"
                        />
                    </div>

                    {error && (
                        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 p-3 rounded-lg text-xs font-bold whitespace-pre-wrap border border-red-200 dark:border-red-800">
                            {error}
                        </div>
                    )}
                </div>

                <button 
                    onClick={handleVerifyAndImport} 
                    disabled={!code.trim() || isVerifying}
                    className="w-full py-3 bg-primary text-white rounded-lg font-bold flex items-center justify-center gap-2 shadow-lg hover:bg-primary-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isVerifying ? <FaSpinner className="animate-spin" /> : <FaCheckCircle />}
                    {isVerifying ? 'جاري التحقق...' : 'تحقق واستيراد الجلسة'}
                </button>
            </motion.div>
        </div>
    );
};

export default ImportSessionCodeModal;


import React from 'react';
import { motion } from 'framer-motion';
import { LastRecordModalData, MemorizationRecord, ReviewRecord, HomeworkRecord } from '../types';
import { formatDate, formatSurahAyah, sanitizeToEnglishNumber } from '../utils/helpers';
import { FaTimes, FaHistory, FaBook, FaPlus } from 'react-icons/fa';

const modalVariants = {
    initial: { scale: 0.9, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0.9, opacity: 0 },
};

interface LastRecordModalProps extends LastRecordModalData {
    onClose: () => void;
    onAddRecord: (studentId: number, recordType: 'memorization' | 'review', record: MemorizationRecord | ReviewRecord) => void;
    currentMaxGrade?: number;
}


const LastRecordModal: React.FC<LastRecordModalProps> = ({
    isOpen, studentId, studentName, recordType, lastRecord, lastHomework, onClose, onAddRecord, currentMaxGrade
}) => {
    if (!isOpen) return null;

    const handleAdd = () => {
        if (studentId && recordType && lastRecord?.record) {
            const typeKey = recordType === 'الحفظ' ? 'memorization' : 'review';
            
            // Ensure numbers are in English format
            const sanitizedRecord = {
                ...lastRecord.record,
                fromAyah: sanitizeToEnglishNumber(lastRecord.record.fromAyah),
                toAyah: sanitizeToEnglishNumber(lastRecord.record.toAyah),
            };

            onAddRecord(studentId, typeKey, sanitizedRecord);
        }
    };

    const handleAddHomework = () => {
        if (studentId && recordType && lastHomework?.record) {
            const typeKey = recordType === 'الحفظ' ? 'memorization' : 'review';
            const hwPart = recordType === 'الحفظ' ? lastHomework.record.memorization : lastHomework.record.review;
            
            if (hwPart) {
                const newRecord = {
                    fromSurah: hwPart.fromSurah,
                    fromAyah: sanitizeToEnglishNumber(hwPart.fromAyah),
                    toSurah: hwPart.toSurah,
                    toAyah: sanitizeToEnglishNumber(hwPart.toAyah),
                    rating: currentMaxGrade ?? 10,
                    [typeKey === 'memorization' ? 'hasMemorization' : 'hasReview']: true
                };
                onAddRecord(studentId, typeKey, newRecord as any);
            }
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4">
            <motion.div
                variants={modalVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-sm"
            >
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-bold text-primary dark:text-accent flex items-center gap-2">
                        <FaHistory />
                        آخر تسميع لـ {studentName}
                    </h2>
                    <button onClick={onClose}><FaTimes /></button>
                </div>

                {lastRecord ? (
                    <div className="space-y-2 text-sm">
                        <p><strong>نوع التسميع:</strong> {recordType}</p>
                        <p><strong>التاريخ:</strong> {formatDate(lastRecord.date)}</p>
                        <p><strong>الوقت:</strong> {lastRecord.time}</p>
                        <p className="font-semibold text-lg bg-primary/10 dark:bg-accent/10 p-3 rounded-md text-center mt-2">
                            {formatSurahAyah(lastRecord.record)}
                        </p>
                        {lastRecord.record.rating !== undefined && (
                            <p className="text-center font-bold text-lg text-primary dark:text-accent mt-2">
                                التقييم: {lastRecord.record.rating}/{lastRecord.maxGrade ?? 10}
                            </p>
                        )}
                    </div>
                ) : (
                    <p className="text-center text-gray-500 py-4">لا يوجد تسميع سابق لهذا الطالب في هذه الخانة.</p>
                )}

                {/* Last Homework Section */}
                {lastHomework && (
                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <h3 className="text-xs font-bold text-gray-500 mb-2 flex items-center gap-1">
                            <FaBook size={10} />
                            آخر واجب ({recordType}):
                        </h3>
                        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-2 rounded border border-indigo-100 dark:border-indigo-900/30">
                             <p className="text-xs text-indigo-700 dark:text-indigo-300 font-medium text-center">
                                {formatSurahAyah((recordType === 'الحفظ' ? lastHomework.record.memorization! : lastHomework.record.review!) as any)}
                             </p>
                             <p className="text-[10px] text-gray-400 text-center mt-1">
                                بتاريخ: {formatDate(lastHomework.date)}
                             </p>
                             <button 
                                onClick={handleAddHomework}
                                className="w-full mt-2 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded transition-colors flex items-center justify-center gap-1"
                             >
                                <FaPlus size={10} />
                                إضافة الواجب
                             </button>
                        </div>
                    </div>
                )}

                <div className="flex justify-end gap-3 mt-6">
                     <button 
                        onClick={handleAdd}
                        disabled={!lastRecord || !studentId || !recordType}
                        className="px-4 py-2 rounded-lg bg-primary text-white disabled:bg-gray-400"
                    >
                        إضافة نفس التسميع
                    </button>
                    <button onClick={onClose} className="px-6 py-2 rounded-lg bg-gray-200 dark:bg-gray-600">
                        إغلاق
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default LastRecordModal;

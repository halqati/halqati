import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaArchive, FaArrowLeft, FaInfoCircle, FaUndo, FaSearch, FaTimes, FaUserClock, FaPhone, FaVenusMars } from 'react-icons/fa';
import { Student, ConfirmationModalData } from '../types';
import StudentAvatar from '../components/StudentAvatar';

interface ArchiveProps {
    students: Student[];
    onRestoreStudent: (studentId: number) => void;
    onBack: () => void;
    hasCircleSettingsPermission: boolean;
    setConfirmationModal: (data: Omit<ConfirmationModalData, 'isOpen'> & { isOpen: boolean }) => void;
    addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const pageVariants = {
    initial: { opacity: 0, x: '100%' },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: '100%' }
};

const Archive: React.FC<ArchiveProps> = ({
    students,
    onRestoreStudent,
    onBack,
    hasCircleSettingsPermission,
    setConfirmationModal,
    addToast
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [showInfoModal, setShowInfoModal] = useState(false);

    // Filter archived students
    const archivedStudents = students.filter(s => s.isArchived);

    // Filter by search term
    const filteredStudents = archivedStudents.filter(s => 
        s.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleRestoreClick = (student: Student) => {
        if (!hasCircleSettingsPermission) {
            addToast('عذراً، لا تمتلك الصلاحية الكافية لتعديل إعدادات الحلقة.', 'error');
            return;
        }

        setConfirmationModal({
            isOpen: true,
            title: 'تأكيد استعادة الطالب',
            message: `هل أنت متأكد من استعادة الطالب "${student.name}"؟ سيتم إرجاعه إلى قائمة الطلاب النشطين، ويمكنه المشاركة في الحلقات والجلسات بشكل طبيعي كما كان سابقًا دون فقدان أي من بياناته.`,
            onConfirm: () => {
                onRestoreStudent(student.id);
                setConfirmationModal({ isOpen: false, title: '', message: '', onConfirm: () => {} });
            }
        });
    };

    return (
        <motion.div
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="space-y-6 max-w-lg mx-auto bg-gray-50 dark:bg-gray-900 min-h-screen pb-12"
            dir="rtl"
        >
            {/* Header section */}
            <div className="flex items-center justify-between px-4 py-4 bg-white dark:bg-gray-800 shadow-sm rounded-b-2xl border-b border-gray-100 dark:border-gray-700 transition-colors">
                <button 
                    onClick={onBack}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors cursor-pointer text-gray-700 dark:text-gray-200"
                >
                    <FaArrowLeft size={18} />
                </button>

                <div className="flex items-center gap-2">
                    <FaArchive className="text-[#8d7056] dark:text-[#d4bca4]" size={20} />
                    <h1 className="text-lg font-bold text-gray-800 dark:text-gray-100">أرشيف الطلاب</h1>
                </div>

                <button 
                    onClick={() => setShowInfoModal(true)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-blue-500 hover:text-blue-600 transition-colors cursor-pointer"
                    title="شرح عن الأرشيف"
                >
                    <FaInfoCircle size={20} />
                </button>
            </div>

            {/* Main content */}
            <div className="px-4 space-y-4">
                {archivedStudents.length > 0 && (
                    <div className="relative">
                        <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-gray-400">
                            <FaSearch size={14} />
                        </div>
                        <input
                            type="text"
                            placeholder="البحث عن طالب في الأرشيف..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-3 pr-9 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#8d7056]/30 focus:border-[#8d7056] dark:text-gray-200 text-right transition-colors"
                        />
                        {searchTerm && (
                            <button 
                                onClick={() => setSearchTerm('')}
                                className="absolute inset-y-0 left-3 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
                            >
                                <FaTimes size={14} />
                            </button>
                        )}
                    </div>
                )}

                {/* Students list */}
                <div className="space-y-3">
                    {archivedStudents.length === 0 ? (
                        <div className="text-center py-12 px-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 transition-colors shadow-sm">
                            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400 dark:text-gray-500">
                                <FaArchive size={28} />
                            </div>
                            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200">الأرشيف فارغ حالياً</h3>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 max-w-xs mx-auto leading-relaxed">
                                لم تقم بأرشفة أي طالب حتى الآن. يمكنك أرشفة الطلاب الذين تم إيقافهم مؤقتاً لتنظيف قائمتك النشطة.
                            </p>
                        </div>
                    ) : filteredStudents.length === 0 ? (
                        <div className="text-center py-10 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 transition-colors shadow-sm">
                            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">لم يتم العثور على نتائج للبحث "{searchTerm}"</p>
                        </div>
                    ) : (
                        filteredStudents.map((student) => (
                            <div 
                                key={student.id}
                                className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm transition-all hover:shadow-md"
                            >
                                <div className="flex items-center gap-3">
                                    <StudentAvatar 
                                        photo={student.photo}
                                        name={student.name}
                                        id={student.id}
                                        className="w-11 h-11 rounded-full text-base font-bold flex-shrink-0"
                                    />
                                    <div className="text-right">
                                        <h4 className="text-sm font-bold text-gray-800 dark:text-gray-100">{student.name}</h4>
                                        <div className="flex flex-wrap items-center gap-y-1 gap-x-2.5 mt-1 text-[11px] text-gray-400 dark:text-gray-500">
                                            <span className="flex items-center gap-1">
                                                <FaVenusMars size={10} />
                                                {student.gender === 'female' ? 'أنثى' : 'ذكر'}
                                            </span>
                                            {student.parentPhone && (
                                                <span className="flex items-center gap-1">
                                                    <FaPhone size={10} />
                                                    {student.parentPhone}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={() => handleRestoreClick(student)}
                                    className="px-3 py-1.5 rounded-xl bg-green-500 hover:bg-green-600 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm shadow-green-100 dark:shadow-none cursor-pointer"
                                >
                                    <FaUndo size={11} />
                                    <span>استعادة</span>
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Info modal */}
            <AnimatePresence>
                {showInfoModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[250] p-4">
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-sm text-center shadow-xl border border-gray-100 dark:border-gray-700 transition-colors"
                        >
                            <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                <FaInfoCircle size={24} />
                            </div>
                            <h2 className="text-base font-bold text-gray-800 dark:text-gray-100 mb-3">حول قسم الأرشيف</h2>
                            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed text-right mb-6">
                                الأرشيف مخصص للاحتفاظ بالطلاب الذين تم إيقافهم أو انتقالهم أو سفرهم أو خروجهم من الحلقة، مع الاحتفاظ بجميع بياناتهم. ويمكن استعادة أي طالب في أي وقت دون فقدان أي بيانات.
                            </p>
                            <button 
                                onClick={() => setShowInfoModal(false)}
                                className="w-full py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold text-sm transition-colors cursor-pointer"
                            >
                                موافق
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default Archive;

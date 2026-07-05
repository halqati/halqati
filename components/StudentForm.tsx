
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Student, ConfirmationModalData, PointsSettings } from '../types';
import { FaTimes, FaShareAlt, FaCamera, FaTrash, FaExchangeAlt, FaArchive, FaIdCard } from 'react-icons/fa';
import StudentAvatar from './StudentAvatar';
import ErrorMessage from './ErrorMessage';
import { formatStudentId } from '../utils/helpers';

interface StudentFormProps {
    student: Student | null;
    onSave: (student: Student) => void;
    onClose: () => void;
    onTransferStudent?: (student: Student) => void;
    onArchiveStudent?: (studentId: number) => void;
    circleCount?: number;
    setConfirmationModal: (data: Omit<ConfirmationModalData, 'isOpen'> & { isOpen: boolean }) => void;
    pointsSettings: PointsSettings;
    addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const modalVariants = {
  initial: { scale: 0.9, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  exit: { scale: 0.9, opacity: 0 },
};

const StudentForm: React.FC<StudentFormProps> = ({ student, onSave, onClose, onTransferStudent, onArchiveStudent, circleCount, setConfirmationModal, pointsSettings, addToast }) => {
    const [formData, setFormData] = useState({
        name: '',
        gender: 'male' as 'male' | 'female',
        photo: undefined as string | undefined,
        parentPhone: '',
        notes: '',
        suspendedMemorization: false,
        suspendedReview: false,
        isKhatim: false,
        khatimRecitesReview: true,
    });
    const [error, setError] = useState('');

    useEffect(() => {
        if (student) {
            setFormData({
                name: student.name,
                gender: student.gender,
                photo: student.photo,
                parentPhone: student.parentPhone || '',
                notes: student.notes || '',
                suspendedMemorization: student.suspendedMemorization,
                suspendedReview: student.suspendedReview,
                isKhatim: student.isKhatim ?? false,
                khatimRecitesReview: student.khatimRecitesReview ?? true,
            });
        } else {
            // Reset for new student
            setFormData({
                name: '',
                gender: 'male',
                photo: undefined,
                parentPhone: '',
                notes: '',
                suspendedMemorization: false,
                suspendedReview: false,
                isKhatim: false,
                khatimRecitesReview: true,
            });
        }
    }, [student]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleGenderChange = (gender: 'male' | 'female') => {
        setFormData(prev => ({ ...prev, gender }));
    };

    const handleToggle = (field: 'suspendedMemorization' | 'suspendedReview' | 'isKhatim' | 'khatimRecitesReview') => {
        setFormData(prev => ({ ...prev, [field]: !prev[field] }));
    };

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({ ...prev, photo: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleDeletePhoto = () => {
        setConfirmationModal({
            isOpen: true,
            title: 'حذف صورة الطالب',
            message: 'هل أنت متأكد من حذف الصورة؟ سيتم استعادة الصورة الرمزية الافتراضية.',
            onConfirm: () => {
                setFormData(prev => ({ ...prev, photo: undefined }));
                setConfirmationModal({ isOpen: false, title: '', message: '', onConfirm: () => {} });
            }
        });
    };

    const handleSave = () => {
        if (!formData.name.trim()) {
            setError('اسم الطالب مطلوب.');
            return;
        }
        setError('');
        onSave({
            id: student?.id ?? 0,
            order: student?.order ?? 0,
            joinDate: student?.joinDate ?? '',
            manualPoints: student?.manualPoints ?? [],
            isArchived: student?.isArchived ?? false,
            ...formData,
        });
    };

    const handleTransferClick = () => {
        if (!student || !onTransferStudent) return;
        if ((circleCount ?? 0) <= 1) {
            addToast('لا يمكنك نقل الطالب لأنه لا توجد حلقات أخرى. أنشئ حلقة جديدة أولاً.', 'error');
        } else {
            onTransferStudent(student);
        }
    };

    const handleArchiveClick = () => {
        if (!student || !onArchiveStudent) return;
        setConfirmationModal({
            isOpen: true,
            title: 'إخفاء الطالب (أرشفة)',
            message: 'هل تريد إخفاء هذا الطالب مؤقتًا من الحلقة؟ يمكن استرجاعه لاحقًا بكامل بياناته من قسم الإعدادات.',
            onConfirm: () => {
                onArchiveStudent(student.id);
                setConfirmationModal({ isOpen: false, title: '', message: '', onConfirm: () => {} });
            }
        });
    };

    const getModalTitle = () => {
        if (student) {
            return formData.gender === 'female' ? 'تعديل بيانات الطالبة' : 'تعديل بيانات الطالب';
        }
        return formData.gender === 'female' ? 'إضافة طالبة جديدة' : 'إضافة طالب جديد';
    };

    const getKhatimMessage = () => {
        const recitesReview = formData.khatimRecitesReview;
        const attPoints = pointsSettings.khatimRecitesAttendance ?? 1;
        const reviewPoints = pointsSettings.khatimRecitesHasReview ?? 2;
        const bonusPoints = pointsSettings.khatimNoRecitesAttendanceBonus ?? 3;
        
        const genderSuffix = formData.gender === 'female' ? 'ت' : '';
        const pronoun = formData.gender === 'female' ? 'ها' : 'ه';

        if (recitesReview) {
            const total = attPoints + reviewPoints;
            return `إذا راجع${genderSuffix} ستحصل على ${total} نقاط (${attPoints} حضور + ${reviewPoints} مراجعة)، وإذا لم تراجع سيحصل على ${attPoints} ${attPoints === 1 || attPoints === 2 ? 'نقطة' : 'نقاط'} فقط.`;
        } else {
            return `سيحصل ال${formData.gender === 'female' ? 'طالبة' : 'طالب'} على ${bonusPoints} نقاط بمجرد حضور${pronoun} لأن${pronoun} لا يراجع.`;
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <motion.div variants={modalVariants} initial="initial" animate="animate" exit="exit" className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md h-[90vh] flex flex-col">
                <div className="flex justify-between items-center mb-4 flex-shrink-0">
                    <div className="flex flex-col">
                        <h2 className="text-xl font-bold text-primary dark:text-accent">{getModalTitle()}</h2>
                        {student && (
                            <span className="text-[9px] font-mono text-gray-400 opacity-50 mt-0.5">ID: {formatStudentId(student.id)}</span>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        {student && (
                            <>
                                <button onClick={handleTransferClick} className="text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors p-1" title="نقل الطالب">
                                    <FaExchangeAlt size={14} />
                                </button>
                                <button onClick={handleArchiveClick} className="text-gray-400 hover:text-yellow-500 dark:hover:text-yellow-400 transition-colors p-1" title="إخفاء (أرشفة)">
                                    <FaArchive size={14} />
                                </button>
                            </>
                        )}
                        <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"><FaTimes /></button>
                    </div>
                </div>

                <div className="flex-grow overflow-y-auto space-y-4 pr-2">
                    {error && <ErrorMessage message={error} />}
                    <div className="relative w-24 h-24 mx-auto">
                        <StudentAvatar photo={formData.photo} name={formData.name} id={student?.id || 0} className="w-24 h-24 rounded-full object-cover border-4 border-gray-200 dark:border-gray-700" />
                        
                        {/* Subtle ID Display */}
                        {student && (
                            <div className="absolute -top-1 -left-4 bg-white dark:bg-gray-800 px-2 py-0.5 rounded-full border dark:border-gray-700 shadow-sm flex items-center gap-1 opacity-60">
                                <FaIdCard size={10} className="text-gray-400" />
                                <span className="text-[9px] font-mono font-bold text-gray-500">{formatStudentId(student.id)}</span>
                            </div>
                        )}

                        <label htmlFor="photo-upload" className="absolute -bottom-1 -right-1 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center cursor-pointer hover:bg-primary-dark shadow-md">
                            <FaCamera/>
                        </label>
                        <input type="file" id="photo-upload" onChange={handlePhotoChange} className="hidden" accept="image/*" />
                        {formData.photo && (
                            <button
                                type="button"
                                onClick={handleDeletePhoto}
                                className="absolute -bottom-1 -left-1 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center cursor-pointer hover:bg-red-700 shadow-md"
                            >
                                <FaTrash size={12} />
                            </button>
                        )}
                    </div>

                    <div>
                        <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">الاسم</label>
                        <input type="text" name="name" value={formData.name} onChange={handleChange} className="w-full mt-1 p-3 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600" />
                    </div>
                    <div>
                        <div className="grid grid-cols-2 gap-3 mt-1">
                            <button onClick={() => handleGenderChange('male')} className={`p-3 rounded-lg border-2 transition-all ${formData.gender === 'male' ? 'bg-primary/10 border-primary' : 'border-gray-300 dark:border-gray-600'}`}>طالب</button>
                            <button onClick={() => handleGenderChange('female')} className={`p-3 rounded-lg border-2 transition-all ${formData.gender === 'female' ? 'bg-primary/10 border-primary' : 'border-gray-300 dark:border-gray-600'}`}>طالبة</button>
                        </div>
                    </div>
                    <div>
                        <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">رقم ولي الأمر (واتساب)</label>
                        <input type="tel" name="parentPhone" value={formData.parentPhone} onChange={handleChange} className="w-full mt-1 p-3 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600" dir="ltr" />
                    </div>
                     <div>
                        <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">ملاحظات (اختياري)</label>
                        <textarea name="notes" value={formData.notes} onChange={handleChange} className="w-full mt-1 p-3 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600 h-24" />
                    </div>

                    <div className="space-y-2 p-3 bg-gray-100 dark:bg-gray-700/50 rounded-lg">
                        <label htmlFor="isKhatim-toggle" className="flex items-center justify-between cursor-pointer">
                            <span className="font-semibold">هل {formData.gender === 'female' ? 'الطالبة خاتمة' : 'الطالب خاتم'}؟</span>
                             <input
                                id="isKhatim-toggle"
                                type="checkbox"
                                checked={formData.isKhatim}
                                onChange={() => handleToggle('isKhatim')}
                                className="w-5 h-5 accent-primary"
                            />
                        </label>
                        <AnimatePresence>
                            {formData.isKhatim && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="space-y-3 pt-3 border-t border-gray-200 dark:border-gray-600"
                                >
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {formData.gender === 'female' ? 'الطالبة الآن سيتم اعتبارها خاتمة. هل تريد إظهارها في الجلسات للمراجعة؟' : 'الطالب الآن سيتم اعتباره خاتماً. هل تريد إظهاره في الجلسات للمراجعة؟'}
                                    </p>
                                    <label htmlFor="khatimRecitesReview-toggle" className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded-lg cursor-pointer">
                                        <span>هل {formData.gender === 'female' ? 'ستسمّع مراجعة' : 'سيسمّع مراجعة'}؟</span>
                                        <input
                                            id="khatimRecitesReview-toggle"
                                            type="checkbox"
                                            checked={formData.khatimRecitesReview}
                                            onChange={() => handleToggle('khatimRecitesReview')}
                                            className="w-5 h-5 accent-primary"
                                        />
                                    </label>
                                    
                                    <p className={`text-xs p-2 rounded-md ${formData.khatimRecitesReview ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/40' : 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/40'}`}>
                                        {getKhatimMessage()}
                                    </p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <AnimatePresence>
                    {!formData.isKhatim && (
                        <motion.div 
                            initial={{ opacity: 1, height: 'auto' }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="space-y-2 overflow-hidden"
                        >
                            <label htmlFor="suspendedMemorization-toggle" className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-700/50 rounded-lg cursor-pointer">
                                <span>إيقاف الحفظ مؤقتاً</span>
                                <input
                                    id="suspendedMemorization-toggle"
                                    type="checkbox"
                                    checked={formData.suspendedMemorization}
                                    onChange={() => handleToggle('suspendedMemorization')}
                                    className="w-5 h-5 accent-primary"
                                />
                            </label>
                            <label htmlFor="suspendedReview-toggle" className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-700/50 rounded-lg cursor-pointer">
                                <span>إيقاف المراجعة مؤقتاً</span>
                                <input
                                    id="suspendedReview-toggle"
                                    type="checkbox"
                                    checked={formData.suspendedReview}
                                    onChange={() => handleToggle('suspendedReview')}
                                    className="w-5 h-5 accent-primary"
                                />
                            </label>
                        </motion.div>
                    )}
                    </AnimatePresence>

                </div>

                <div className="flex-shrink-0 pt-4">
                    <button onClick={handleSave} className="w-full bg-primary text-white p-3 rounded-lg font-bold">
                        {student ? 'حفظ التعديلات' : 'إضافة الطالب'}
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default StudentForm;

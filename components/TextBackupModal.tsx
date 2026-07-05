import React from 'react';
import { motion } from 'framer-motion';
import { CircleData } from '../types';
import { FaTimes, FaCopy, FaInfoCircle, FaExclamationTriangle, FaCheckCircle, FaLightbulb } from 'react-icons/fa';

interface TextBackupModalProps {
    activeCircle: CircleData;
    onClose: () => void;
    addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const modalVariants = {
    initial: { scale: 0.9, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0.9, opacity: 0 },
};

const TextBackupModal: React.FC<TextBackupModalProps> = ({ activeCircle, onClose, addToast }) => {
    
    // Identify the latest session to include
    const sessions = activeCircle.sessions || [];
    const latestSession = sessions.length > 0 
        ? sessions.reduce((prev, current) => (prev.createdAt > current.createdAt) ? prev : current) 
        : null;

    // Create a "Lite" version for text backup
    const liteBackupData = {
        // 1. Identity & Profile
        id: activeCircle.id,
        teacher: activeCircle.teacher,
        circle: activeCircle.circle,
        center: activeCircle.center,
        teacherGender: activeCircle.teacherGender,
        studyStartDate: activeCircle.studyStartDate,

        // 2. Full Settings & Configurations
        settings: activeCircle.settings,
        notificationSettings: activeCircle.notificationSettings,
        lessonTypes: activeCircle.lessonTypes,
        activityTypes: activeCircle.activityTypes,

        // 3. Students (Strip photos)
        students: activeCircle.students.map(s => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { photo, ...rest } = s; 
            return rest;
        }),

        // 4. Sessions (Include ONLY the latest session)
        sessions: latestSession ? [latestSession] : [],

        // 5. Exclusions (Heavy Data)
        logo: undefined,
        notifications: [],
        studentReports: [],
        supervisorReports: [],
        tests: [],
        plans: [],
        activities: [],
        announcements: [],
        draftTest: null,
        draftPlan: null,
        draftActivity: null,
        draftAnnouncement: null,
        draftSession: null,
        dismissedNotificationIds: [],
    };

    // Use minified JSON
    const backupText = JSON.stringify(liteBackupData);
    const charCount = new Intl.NumberFormat('ar-EG').format(backupText.length);

    const handleCopy = () => {
        navigator.clipboard.writeText(backupText).then(() => {
            addToast('✅ تم نسخ النص بنجاح.', 'success');
        }).catch(() => {
            addToast('❌ فشل النسخ، النص كبير جداً.', 'error');
        });
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[250] p-4">
            <motion.div variants={modalVariants} initial="initial" animate="animate" exit="exit" className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md h-[90vh] flex flex-col">
                <div className="flex justify-between items-center mb-4 flex-shrink-0">
                    <h2 className="text-xl font-bold text-primary dark:text-accent">نسخة احتياطية (نص خفيف)</h2>
                    <button onClick={onClose}><FaTimes /></button>
                </div>
                
                 <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg text-sm mb-4 flex-shrink-0 border border-gray-200 dark:border-gray-600 overflow-y-auto max-h-60 space-y-4">
                    <div>
                        <p className="font-bold mb-1 text-base text-green-600 dark:text-green-400 flex items-center gap-2">
                            <FaCheckCircle /> ماذا تشمل هذه النسخة؟
                        </p>
                        <ul className="list-disc list-inside opacity-90 pr-2 text-xs">
                            <li><strong>بيانات الطلاب:</strong> (الأسماء، الهواتف، الملاحظات، النقاط اليدوية).</li>
                            <li><strong>إعدادات الحلقة:</strong> (نظام النقاط، الإشعارات، أنواع الدروس).</li>
                            <li><strong>آخر جلسة فقط:</strong> (سيتم حفظ بيانات الحضور والتسميع لآخر جلسة قمت بها).</li>
                        </ul>
                    </div>

                    <div>
                        <p className="font-bold mb-1 text-base text-red-600 dark:text-red-400 flex items-center gap-2">
                            <FaExclamationTriangle /> ماذا تم استبعاده ولماذا؟
                        </p>
                        <p className="leading-relaxed opacity-90 text-xs pr-1 text-justify">
                            تم استبعاد <strong>(أرشيف الجلسات القديمة، الصور، التقارير)</strong> وحفظ <strong>آخر جلسة فقط</strong>؛ لأن حفظ كامل السجل التاريخي يجعل النص هائلاً (بالملايين)، ولا تستطيع الهواتف نسخ نصوص بهذا الحجم.
                        </p>
                    </div>

                    <div>
                        <p className="font-bold mb-1 text-base text-blue-600 dark:text-blue-400 flex items-center gap-2">
                            <FaLightbulb /> الفائدة وطريقة الاستخدام:
                        </p>
                        <ul className="list-disc list-inside opacity-90 text-xs pr-2 space-y-1">
                            <li>هذا <strong>حل بديل</strong> لنقل الحلقة إذا لم يعمل زر "حفظ الملف".</li>
                            <li>احفظ هذا النص في مكان آمن (ملاحظات، واتساب).</li>
                            <li>عند الاستعادة، ستعود بيانات الطلاب ووضع الحلقة كما كان في <strong>آخر يوم</strong>، لكن سيتم تصفير الرسوم البيانية القديمة.</li>
                        </ul>
                    </div>
                    
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded border border-yellow-200 dark:border-yellow-800 text-center">
                        <p className="text-xs font-bold text-yellow-800 dark:text-yellow-200">
                            ⛔ هام جداً: لا تقم بتغيير أي حرف في النص المنسوخ.
                        </p>
                    </div>
                </div>

                <div className="relative flex-grow mb-2">
                    <textarea
                        value={backupText}
                        readOnly
                        className="w-full h-full p-3 border rounded-lg bg-gray-100 dark:bg-gray-900 dark:border-gray-700 font-mono text-[10px] text-gray-500 dark:text-gray-400 select-all resize-none focus:ring-2 focus:ring-primary"
                        onClick={(e) => e.currentTarget.select()}
                    />
                    <div className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] px-2 py-1 rounded-full backdrop-blur-sm">
                        {charCount} حرف
                    </div>
                </div>

                <div className="flex flex-col gap-2 flex-shrink-0">
                    <button onClick={handleCopy} className="w-full p-3 bg-primary text-white rounded-lg flex items-center justify-center gap-2 font-bold shadow-md hover:bg-primary-dark transition-colors">
                        <FaCopy /> نسخ النص
                    </button>
                    <button onClick={onClose} className="w-full p-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors">
                        إغلاق
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default TextBackupModal;
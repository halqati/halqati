
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { PointsSettings } from '../types';
import { FaTimes, FaSave, FaUserCheck, FaUserClock, FaUserTimes, FaUserGraduate, FaBook, FaBookOpen, FaPauseCircle, FaExclamationCircle, FaInfoCircle, FaMedal, FaChalkboardTeacher, FaGift } from 'react-icons/fa';
import { sanitizeToEnglishNumber } from '../utils/helpers';

interface PointsSettingsModalProps {
    settings: PointsSettings;
    onSave: (newSettings: PointsSettings) => void;
    onClose: () => void;
    onOpenRewardsManager: () => void;
}

const modalVariants = {
    initial: { y: '100%' },
    animate: { y: 0 },
    exit: { y: '100%' },
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <h3 className="text-lg font-bold text-primary dark:text-accent mb-3">{title}</h3>
        <div className="space-y-3">{children}</div>
    </div>
);

const SettingRow: React.FC<{ label: string; icon: React.ElementType; value: number; onChange: (value: number) => void; min?: number; max?: number; }> = ({ label, icon: Icon, value, onChange, min, max }) => {
    const [inputValue, setInputValue] = useState<string>(value.toString());

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const sanitizedVal = sanitizeToEnglishNumber(e.target.value);
        setInputValue(sanitizedVal);
        
        if (sanitizedVal === '' || sanitizedVal === '-') {
             return; 
        }

        let num = parseInt(sanitizedVal, 10);
        if (!isNaN(num)) {
            if (min !== undefined && num < min) num = min;
            if (max !== undefined && num > max) num = max;
            onChange(num);
        }
    };
    
    React.useEffect(() => {
        setInputValue(value.toString());
    }, [value]);

    return (
        <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <label className="flex items-center gap-2 text-sm font-semibold">
                <Icon className="text-gray-500" />
                {label}
            </label>
            <input
                type="text"
                inputMode="numeric"
                dir="ltr"
                value={inputValue}
                onChange={handleChange}
                onBlur={() => setInputValue(value.toString())}
                className="w-20 p-1 text-center border rounded-md bg-white dark:bg-gray-800 dark:border-gray-600 font-sans"
            />
        </div>
    );
};


const PointsSettingsModal: React.FC<PointsSettingsModalProps> = ({ settings, onSave, onClose, onOpenRewardsManager }) => {
    const [localSettings, setLocalSettings] = useState<PointsSettings>({
        ...settings,
        maxMemorizationGrade: settings.maxMemorizationGrade ?? 10,
        maxReviewGrade: settings.maxReviewGrade ?? 10
    });

    const handleSettingChange = <K extends keyof PointsSettings>(key: K, value: PointsSettings[K]) => {
        setLocalSettings(prev => ({ ...prev, [key]: value }));
    };

    const summary = [
        { label: 'حاضر + راجع و حفظ', score: localSettings.present + localSettings.hasMemorization + localSettings.hasReview },
        { label: 'حاضر + لم يراجع ولم يحفظ', score: localSettings.present + localSettings.noMemorization + localSettings.noReview },
        { label: 'متأخر + راجع وحفظ', score: localSettings.late + localSettings.hasMemorization + localSettings.hasReview },
        { label: 'غائب', score: localSettings.absent },
        { label: 'خاتم (مراجعة)', score: (localSettings.khatimRecitesAttendance ?? 1) + (localSettings.khatimRecitesHasReview ?? 2) },
        { label: 'خاتم (حضور فقط)', score: localSettings.khatimNoRecitesAttendanceBonus ?? 3 },
        { label: 'درس (حضور)', score: localSettings.lessonPresent ?? 3 },
    ];

    return (
        <motion.div
            variants={modalVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed inset-0 bg-gray-50 dark:bg-gray-900 z-[160] flex flex-col p-4 max-w-md mx-auto"
        >
            <div className="flex items-center justify-between mb-4 pb-4 border-b dark:border-gray-700 flex-shrink-0">
                <h2 className="text-xl font-bold text-primary dark:text-accent">إعدادات النقاط</h2>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={onOpenRewardsManager}
                        className="text-xs bg-purple-500 text-white px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 hover:bg-purple-600 transition-colors"
                    >
                        <FaGift /> إدارة المكافآت
                    </button>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"><FaTimes size={20} /></button>
                </div>
            </div>

            <div className="flex-grow overflow-y-auto space-y-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                    <h3 className="text-sm font-bold text-blue-800 dark:text-blue-300 mb-2 flex items-center gap-2">
                        <FaInfoCircle /> ملخص النقاط (بناءً على الإعدادات الحالية)
                    </h3>
                    <div className="grid grid-cols-1 gap-1 text-xs text-blue-900 dark:text-blue-100">
                        {summary.map((item, idx) => (
                             <div key={idx} className="flex justify-between px-2 py-1 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded">
                                 <span>{item.label}</span>
                                 <span className="font-bold ltr">{item.score}</span>
                             </div>
                        ))}
                    </div>
                </div>

                <Section title="نقاط الحضور والغياب">
                    <SettingRow label="حضور" icon={FaUserCheck} value={localSettings.present} onChange={v => handleSettingChange('present', v)} />
                    <SettingRow label="تأخر" icon={FaUserClock} value={localSettings.late} onChange={v => handleSettingChange('late', v)} />
                    <SettingRow label="غياب" icon={FaUserTimes} value={localSettings.absent} onChange={v => handleSettingChange('absent', v)} />
                    <SettingRow label="استئذان" icon={FaUserGraduate} value={localSettings.excused} onChange={v => handleSettingChange('excused', v)} />
                </Section>
                 <Section title="نقاط الدروس">
                     <p className="text-xs text-gray-500 mb-2">يتم تطبيق هذه النقاط عند تفعيل خيار "جلسة درس" بدلاً من نقاط الحضور العادية.</p>
                    <SettingRow label="حضور الدرس" icon={FaChalkboardTeacher} value={localSettings.lessonPresent ?? 3} onChange={v => handleSettingChange('lessonPresent', v)} />
                    <SettingRow label="تأخر عن الدرس" icon={FaUserClock} value={localSettings.lessonLate ?? 3} onChange={v => handleSettingChange('lessonLate', v)} />
                    <SettingRow label="استئذان من الدرس" icon={FaUserGraduate} value={localSettings.lessonExcused ?? 3} onChange={v => handleSettingChange('lessonExcused', v)} />
                </Section>
                <Section title="نقاط الحفظ">
                    <SettingRow label="سمّع" icon={FaBook} value={localSettings.hasMemorization} onChange={v => handleSettingChange('hasMemorization', v)} />
                    <SettingRow label="لم يسمّع" icon={FaExclamationCircle} value={localSettings.noMemorization} onChange={v => handleSettingChange('noMemorization', v)} />
                    <SettingRow label="موقوف" icon={FaPauseCircle} value={localSettings.suspendedMemorization} onChange={v => handleSettingChange('suspendedMemorization', v)} />
                </Section>
                 <Section title="نقاط المراجعة">
                    <SettingRow label="راجع" icon={FaBookOpen} value={localSettings.hasReview} onChange={v => handleSettingChange('hasReview', v)} />
                    <SettingRow label="لم يراجع" icon={FaExclamationCircle} value={localSettings.noReview} onChange={v => handleSettingChange('noReview', v)} />
                    <SettingRow label="موقوف" icon={FaPauseCircle} value={localSettings.suspendedReview} onChange={v => handleSettingChange('suspendedReview', v)} />
                </Section>

                <Section title="نظام الدرجات (الدرجة الكاملة)">
                    <p className="text-xs text-gray-500 mb-2">حدد أقصى درجة يمكن إعطاؤها للطالب في نظام التقييم (بين 1 و 10).</p>
                    <SettingRow label="الدرجة الكاملة للحفظ" icon={FaBook} value={localSettings.maxMemorizationGrade ?? 10} onChange={v => handleSettingChange('maxMemorizationGrade', v)} min={1} max={10} />
                    <SettingRow label="الدرجة الكاملة للمراجعة" icon={FaBookOpen} value={localSettings.maxReviewGrade ?? 10} onChange={v => handleSettingChange('maxReviewGrade', v)} min={1} max={10} />
                </Section>
                
                <Section title="نقاط الطالب الخاتم">
                    <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg space-y-3">
                        <h4 className="font-semibold text-sm">في حال يسمّع مراجعة:</h4>
                        <SettingRow label="نقاط الحضور" icon={FaUserCheck} value={localSettings.khatimRecitesAttendance ?? 1} onChange={v => handleSettingChange('khatimRecitesAttendance', v)} />
                        <SettingRow label="نقاط المراجعة" icon={FaBookOpen} value={localSettings.khatimRecitesHasReview ?? 2} onChange={v => handleSettingChange('khatimRecitesHasReview', v)} />
                    </div>
                    <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg space-y-3">
                        <h4 className="font-semibold text-sm">في حال لا يسمّع مراجعة:</h4>
                        <SettingRow label="مكافأة الحضور" icon={FaMedal} value={localSettings.khatimNoRecitesAttendanceBonus ?? 3} onChange={v => handleSettingChange('khatimNoRecitesAttendanceBonus', v)} />
                    </div>
                </Section>

                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <p className="text-xs text-yellow-800 dark:text-yellow-200 font-semibold flex items-start gap-2">
                        <FaExclamationCircle className="mt-0.5 flex-shrink-0" />
                        <span>
                            ملاحظة مهمة: أي تعديل على إعدادات النقاط سيطبق فقط على الجلسات الجديدة. الجلسات السابقة ستحتفظ بنظامها لضمان دقة السجلات.
                        </span>
                    </p>
                </div>
            </div>

            <div className="flex-shrink-0 pt-4">
                <button 
                    onClick={() => {
                        onSave(localSettings);
                        onClose();
                    }} 
                    className="w-full bg-primary text-white p-3 rounded-lg font-bold flex items-center justify-center gap-2"
                >
                    <FaSave /> حفظ الإعدادات
                </button>
            </div>
        </motion.div>
    );
};

export default PointsSettingsModal;

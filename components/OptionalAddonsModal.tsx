import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Settings, Student } from '../types';
import { FaTimes, FaPalette, FaHistory, FaList, FaPen, FaSave, FaStar, FaBell, FaSync, FaChartPie, FaArchive, FaUndo } from 'react-icons/fa';
import StudentAvatar from './StudentAvatar';

interface OptionalAddonsModalProps {
    settings: Settings;
    onSave: (newSettings: Partial<Settings>) => void;
    onClose: () => void;
    onOpenPointsSettings: () => void;
    onOpenNotificationSettings: () => void;
    archivedStudents?: Student[];
    onRestoreStudent?: (id: number) => void;
    hasCircleSettingsPermission?: boolean;
    addToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const modalVariants = {
    initial: { y: '100%' },
    animate: { y: 0 },
    exit: { y: '100%' },
};

const Section: React.FC<{ title: string, icon: React.ElementType, children: React.ReactNode, disabled?: boolean }> = ({ title, icon: Icon, children, disabled }) => (
    <div className={`bg-white dark:bg-gray-800 p-4 rounded-lg shadow ${disabled ? 'opacity-60' : ''}`}>
        <h3 className="text-lg font-bold text-primary dark:text-accent mb-3 flex items-center gap-2"><Icon /> {title}</h3>
        {children}
    </div>
);

const OptionalAddonsModal: React.FC<OptionalAddonsModalProps> = ({ settings, onSave, onClose, onOpenPointsSettings, onOpenNotificationSettings, archivedStudents = [], onRestoreStudent, hasCircleSettingsPermission = true, addToast }) => {
    
    // Manage local theme state so it toggles instantly even if the user has no cloud save permission
    const [localTheme, setLocalTheme] = useState<'light' | 'dark'>(() => {
        return (localStorage.getItem('localTheme') as 'light' | 'dark') || settings.theme || 'dark';
    });

    const handleSettingChange = <K extends keyof Settings>(key: K, value: Settings[K]) => {
        if (key === 'theme') {
            const themeVal = value as 'light' | 'dark';
            setLocalTheme(themeVal);
            localStorage.setItem('localTheme', themeVal);
            document.documentElement.classList.toggle('dark', themeVal === 'dark');
            
            if (hasCircleSettingsPermission) {
                onSave({ [key]: value });
            } else {
                addToast?.('تم تغيير المظهر محلياً على جهازك بنجاح 🎨', 'success');
            }
        } else {
            if (!hasCircleSettingsPermission) {
                addToast?.('عذراً، لا تمتلك الصلاحية الكافية لتعديل إعدادات الحلقة.', 'error');
                return;
            }
            onSave({ [key]: value });
        }
    };

    return (
        <motion.div
            variants={modalVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed inset-0 bg-gray-50 dark:bg-gray-900 z-40 flex flex-col p-4 max-w-md mx-auto"
        >
            <div className="flex items-center justify-between mb-4 pb-4 border-b dark:border-gray-700 flex-shrink-0">
                <h2 className="text-xl font-bold text-primary dark:text-accent">الإضافات والمظهر</h2>
                <button onClick={onClose}><FaTimes size={20} /></button>
            </div>

            <div className="flex-grow overflow-y-auto space-y-4">
                
                <Section title="المظهر" icon={FaPalette}>
                    <div className="grid grid-cols-2 gap-3">
                        <button onClick={() => handleSettingChange('theme', 'light')} className={`p-3 rounded-lg border-2 transition-all cursor-pointer ${localTheme === 'light' ? 'bg-primary/10 border-primary' : 'border-gray-300 dark:border-gray-600'}`}>الوضع الفاتح</button>
                        <button onClick={() => handleSettingChange('theme', 'dark')} className={`p-3 rounded-lg border-2 transition-all cursor-pointer ${localTheme === 'dark' ? 'bg-primary/10 border-primary' : 'border-gray-300 dark:border-gray-600'}`}>الوضع الغامق</button>
                    </div>
                </Section>

                <Section title="ميزة آخر تسميع" icon={FaHistory} disabled={!hasCircleSettingsPermission}>
                    <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg cursor-pointer" onClick={() => handleSettingChange('showLastRecordFeature', !(settings.showLastRecordFeature ?? true))}>
                         <span className="font-semibold">إظهار زر "آخر تسميع" في الجلسة</span>
                        <div className={`w-12 h-6 rounded-full flex items-center transition-colors p-1 ${(settings.showLastRecordFeature ?? true) ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'}`}>
                            <motion.div layout transition={{type: 'spring', stiffness: 700, damping: 30}} className={`w-4 h-4 bg-white rounded-full ${(settings.showLastRecordFeature ?? true) ? 'ml-6' : 'mr-6'}`} />
                        </div>
                    </div>
                </Section>
                
                <Section title="حفظ المسودات" icon={FaSave} disabled={!hasCircleSettingsPermission}>
                    <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg cursor-pointer" onClick={() => handleSettingChange('autoSaveDrafts', !(settings.autoSaveDrafts ?? false))}>
                        <div className="flex-1 pr-4">
                            <span className="font-semibold">حفظ الجلسات تلقائياً كمسودات</span>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                عند الخروج من جلسة غير محفوظة، سيتم حفظها كمسودة لاستعادتها لاحقاً.
                            </p>
                        </div>
                        <div className={`w-12 h-6 rounded-full flex items-center transition-colors p-1 flex-shrink-0 ${(settings.autoSaveDrafts ?? false) ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'}`}>
                            <motion.div layout transition={{type: 'spring', stiffness: 700, damping: 30}} className={`w-4 h-4 bg-white rounded-full ${(settings.autoSaveDrafts ?? false) ? 'ml-6' : 'mr-6'}`} />
                        </div>
                    </div>
                </Section>

                <Section title="طريقة اختيار السور" icon={FaList} disabled={!hasCircleSettingsPermission}>
                     <div className="grid grid-cols-2 gap-3">
                        <button onClick={() => handleSettingChange('surahSelectionMethod', 'list')} className={`p-3 rounded-lg border-2 flex flex-col items-center justify-center gap-2 transition-all cursor-pointer ${ (settings.surahSelectionMethod || 'list') === 'list' ? 'bg-primary/10 border-primary' : 'border-gray-300 dark:border-gray-600'}`}>
                            <FaList size={20}/>
                            <span>قائمة</span>
                        </button>
                        <button onClick={() => handleSettingChange('surahSelectionMethod', 'manual')} className={`p-3 rounded-lg border-2 flex flex-col items-center justify-center gap-2 transition-all cursor-pointer ${(settings.surahSelectionMethod || 'list') === 'manual' ? 'bg-primary/10 border-primary' : 'border-gray-300 dark:border-gray-600'}`}>
                            <FaPen size={20}/>
                            <span>كتابة</span>
                        </button>
                    </div>

                    {(settings.surahSelectionMethod === undefined || settings.surahSelectionMethod === 'list') && (
                         <motion.div initial={{opacity:0, y:-10}} animate={{opacity:1, y:0}} className="mt-4">
                             <h4 className="font-semibold text-sm mb-2">ترتيب السور في القائمة:</h4>
                              <div className="grid grid-cols-2 gap-3">
                                <button onClick={() => handleSettingChange('surahOrder', 'quranic')} className={`p-3 text-sm rounded-lg border-2 transition-all cursor-pointer ${(settings.surahOrder || 'quranic') === 'quranic' ? 'bg-primary/10 border-primary' : 'border-gray-300 dark:border-gray-600'}`}>من الفاتحة ← الناس</button>
                                <button onClick={() => handleSettingChange('surahOrder', 'reverse')} className={`p-3 text-sm rounded-lg border-2 transition-all cursor-pointer ${(settings.surahOrder || 'quranic') === 'reverse' ? 'bg-primary/10 border-primary' : 'border-gray-300 dark:border-gray-600'}`}>من الناس ← الفاتحة</button>
                            </div>
                         </motion.div>
                    )}
                    <div className="mt-4 flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg cursor-pointer" onClick={() => handleSettingChange('syncSurahFields', !(settings.syncSurahFields ?? false))}>
                        <div className="flex-1 pr-4">
                            <span className="font-semibold text-sm">مزامنة حقول السور</span>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                عند تفعيلها، سيتم نسخ اسم السورة تلقائياً من حقل 'من' إلى حقل 'إلى'.
                            </p>
                        </div>
                        <div className={`w-12 h-6 rounded-full flex items-center transition-colors p-1 flex-shrink-0 ${(settings.syncSurahFields ?? false) ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'}`}>
                            <motion.div layout transition={{type: 'spring', stiffness: 700, damping: 30}} className={`w-4 h-4 bg-white rounded-full ${(settings.syncSurahFields ?? false) ? 'ml-6' : 'mr-6'}`} />
                        </div>
                    </div>
                </Section>

                <Section title="إعدادات نظرة عامة" icon={FaChartPie} disabled={!hasCircleSettingsPermission}>
                    <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg cursor-pointer" onClick={() => handleSettingChange('alwaysShowDashboard', !(settings.alwaysShowDashboard ?? false))}>
                        <div className="flex-1 pr-4">
                            <span className="font-semibold">إظهار نظرة عامة دائماً</span>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                تلقائياً، تختفي نظرة عامة عند إضافة جلسة جديدة لليوم. تفعيل هذا الخيار سيجعلها ظاهرة دائماً.
                            </p>
                        </div>
                        <div className={`w-12 h-6 rounded-full flex items-center transition-colors p-1 flex-shrink-0 ${(settings.alwaysShowDashboard ?? false) ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'}`}>
                            <motion.div layout transition={{type: 'spring', stiffness: 700, damping: 30}} className={`w-4 h-4 bg-white rounded-full ${(settings.alwaysShowDashboard ?? false) ? 'ml-6' : 'mr-6'}`} />
                        </div>
                    </div>
                </Section>

                <Section title="نظام النقاط" icon={FaStar} disabled={!hasCircleSettingsPermission}>
                    <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                            خصص نظام النقاط والمكافآت ليناسب أسلوب حلقتك وأهدافك التربوية.
                        </p>
                        <button 
                            onClick={() => {
                                if (!hasCircleSettingsPermission) {
                                    addToast?.('عذراً، لا تمتلك الصلاحية الكافية لتعديل إعدادات الحلقة.', 'error');
                                } else {
                                    onOpenPointsSettings();
                                }
                            }} 
                            className={`w-full bg-primary text-white p-2 rounded-lg font-semibold text-sm cursor-pointer hover:bg-primary-dark`}
                        >
                            فتح إعدادات النقاط
                        </button>
                    </div>
                </Section>

                <Section title="إعدادات الإشعارات" icon={FaBell} disabled={!hasCircleSettingsPermission}>
                    <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                            تحكم في أنواع التنبيهات التي تظهر لك، وحدد شروط ظهورها لتناسب أسلوبك.
                        </p>
                        <button 
                            onClick={() => {
                                if (!hasCircleSettingsPermission) {
                                    addToast?.('عذراً، لا تمتلك الصلاحية الكافية لتعديل إعدادات الحلقة.', 'error');
                                } else {
                                    onOpenNotificationSettings();
                                }
                            }} 
                            className={`w-full bg-primary text-white p-2 rounded-lg font-semibold text-sm cursor-pointer hover:bg-primary-dark`}
                        >
                            فتح إعدادات الإشعارات
                        </button>
                    </div>
                </Section>                
            </div>
        </motion.div>
    );
};

export default OptionalAddonsModal;

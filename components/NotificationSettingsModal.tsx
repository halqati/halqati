
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { NotificationSettings } from '../types';
import { FaTimes, FaSave, FaBell, FaBellSlash, FaWalking, FaRunning, FaBook, FaBookOpen, FaRegCalendarCheck, FaRegLightbulb, FaClock, FaMoon } from 'react-icons/fa';
import { sanitizeToEnglishNumber } from '../utils/helpers';

interface NotificationSettingsModalProps {
    settings: NotificationSettings;
    onSave: (newSettings: NotificationSettings) => void;
    onClose: () => void;
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

const SettingRow: React.FC<{ label: string; icon: React.ElementType; value: number; onChange: (value: number) => void; }> = ({ label, icon: Icon, value, onChange }) => {
    const [inputValue, setInputValue] = useState<string>(value.toString());

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const sanitizedVal = sanitizeToEnglishNumber(e.target.value);
        setInputValue(sanitizedVal);
        
        if (sanitizedVal === '') return;
        
        const num = parseInt(sanitizedVal, 10);
        if (!isNaN(num)) {
            onChange(num);
        }
    };

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

const ToggleRow: React.FC<{ label: string; icon: React.ElementType; checked: boolean; onChange: (checked: boolean) => void; description?: string; }> = ({ label, icon: Icon, checked, onChange, description }) => (
    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg cursor-pointer" onClick={() => onChange(!checked)}>
        <div className="flex-1 pr-4">
            <label className="flex items-center gap-2 text-sm font-semibold">
                <Icon className="text-gray-500" />
                {label}
            </label>
            {description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{description}</p>}
        </div>
        <div className={`w-12 h-6 rounded-full flex items-center transition-colors p-1 flex-shrink-0 ${checked ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'}`}>
            <motion.div layout transition={{ type: 'spring', stiffness: 700, damping: 30 }} className={`w-4 h-4 bg-white rounded-full ${checked ? 'ml-6' : 'mr-6'}`} />
        </div>
    </div>
);


const NotificationSettingsModal: React.FC<NotificationSettingsModalProps> = ({ settings, onSave, onClose }) => {
    const [localSettings, setLocalSettings] = useState<NotificationSettings>(settings);

    const handleSettingChange = <K extends keyof NotificationSettings>(key: K, value: NotificationSettings[K]) => {
        setLocalSettings(prev => ({ ...prev, [key]: value }));
    };

    return (
        <motion.div
            variants={modalVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed inset-0 bg-gray-50 dark:bg-gray-900 z-[60] flex flex-col p-4 max-w-md mx-auto"
        >
            <div className="flex items-center justify-between mb-4 pb-4 border-b dark:border-gray-700 flex-shrink-0">
                <h2 className="text-xl font-bold text-primary dark:text-accent">إعدادات الإشعارات</h2>
                <button onClick={onClose}><FaTimes size={20} /></button>
            </div>

            <div className="flex-grow overflow-y-auto space-y-4">
                <Section title="الإعداد العام">
                    <ToggleRow
                        label={localSettings.enabled ? "الإشعارات مفعلة" : "الإشعارات معطلة"}
                        icon={localSettings.enabled ? FaBell : FaBellSlash}
                        checked={localSettings.enabled}
                        onChange={v => handleSettingChange('enabled', v)}
                        description="التحكم في جميع إشعارات التطبيق."
                    />
                     <SettingRow 
                        label="حذف الإشعارات بعد (ساعة)" 
                        icon={FaClock} 
                        value={localSettings.retentionHours ?? 10} 
                        onChange={v => handleSettingChange('retentionHours', v)} 
                    />
                </Section>
                <AnimatePresence>
                    {localSettings.enabled && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                            <Section title="تنبيهات الحضور والأداء (بعد كم مرة)">
                                <SettingRow label="غياب متتالي" icon={FaWalking} value={localSettings.consecutiveAbsenceThreshold} onChange={v => handleSettingChange('consecutiveAbsenceThreshold', v)} />
                                <SettingRow label="تأخر متتالي" icon={FaRunning} value={localSettings.consecutiveLatenessThreshold} onChange={v => handleSettingChange('consecutiveLatenessThreshold', v)} />
                                <SettingRow label="تقصير في الحفظ" icon={FaBook} value={localSettings.consecutiveMemoThreshold} onChange={v => handleSettingChange('consecutiveMemoThreshold', v)} />
                                <SettingRow label="تقصير في المراجعة" icon={FaBookOpen} value={localSettings.consecutiveReviewThreshold} onChange={v => handleSettingChange('consecutiveReviewThreshold', v)} />
                                <p className="text-xs text-center text-gray-500 pt-2">ملاحظة: ضع القيمة 0 لإيقاف التنبيه.</p>
                            </Section>

                            <Section title="التذكيرات العامة">
                                <ToggleRow
                                    label="تذكيرات يوم الجمعة"
                                    icon={FaRegCalendarCheck}
                                    checked={localSettings.fridayReminders}
                                    onChange={v => handleSettingChange('fridayReminders', v)}
                                />
                                <ToggleRow
                                    label="تنبيهات تعريفية بالتطبيق"
                                    icon={FaRegLightbulb}
                                    checked={localSettings.rareReminders}
                                    onChange={v => handleSettingChange('rareReminders', v)}
                                />
                                <ToggleRow
                                    label="تنبيهات رمضان والمواسم"
                                    icon={FaMoon}
                                    checked={localSettings.seasonalReminders ?? true}
                                    onChange={v => handleSettingChange('seasonalReminders', v)}
                                />
                            </Section>
                        </motion.div>
                    )}
                </AnimatePresence>
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

export default NotificationSettingsModal;

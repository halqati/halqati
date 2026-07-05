
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FaTimes, FaSave, FaWalking, FaRunning, FaBook, FaBookOpen } from 'react-icons/fa';
import { FollowUpSettings } from '../types';
import { sanitizeToEnglishNumber } from '../utils/helpers';

interface FollowUpSettingsModalProps {
    settings: FollowUpSettings;
    onSave: (newSettings: FollowUpSettings) => void;
    onClose: () => void;
}

const modalVariants = {
    initial: { scale: 0.9, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0.9, opacity: 0 },
};

const SettingInput: React.FC<{ label: string; icon: React.ElementType; value: number; onChange: (val: number) => void }> = ({ label, icon: Icon, value, onChange }) => {
    const [inputValue, setInputValue] = useState(value.toString());

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const sanitized = sanitizeToEnglishNumber(e.target.value);
        setInputValue(sanitized);
        const num = parseInt(sanitized, 10);
        if (!isNaN(num) && num >= 0) {
            onChange(num);
        }
    };

    return (
        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div className="flex items-center gap-2">
                <Icon className="text-gray-500" />
                <span className="text-sm font-semibold">{label}</span>
            </div>
            <input
                type="text"
                inputMode="numeric"
                className="w-16 p-2 text-center border rounded-md bg-white dark:bg-gray-800 dark:border-gray-600 font-sans"
                value={inputValue}
                onChange={handleChange}
                onBlur={() => setInputValue(value.toString())}
            />
        </div>
    );
};

const FollowUpSettingsModal: React.FC<FollowUpSettingsModalProps> = ({ settings, onSave, onClose }) => {
    const [localSettings, setLocalSettings] = useState<FollowUpSettings>(settings);

    const handleSave = () => {
        onSave(localSettings);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[250] p-4" onClick={onClose}>
            <motion.div 
                variants={modalVariants} 
                initial="initial" 
                animate="animate" 
                exit="exit" 
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-md"
            >
                <div className="flex justify-between items-center mb-6 pb-3 border-b dark:border-gray-700">
                    <h2 className="text-lg font-bold text-primary dark:text-accent">إعدادات المتابعة (الحد الأقصى)</h2>
                    <button onClick={onClose}><FaTimes /></button>
                </div>

                <div className="space-y-3 mb-6">
                    <SettingInput 
                        label="حد الغياب المسموح" 
                        icon={FaWalking} 
                        value={localSettings.absentThreshold} 
                        onChange={(v) => setLocalSettings(prev => ({ ...prev, absentThreshold: v }))} 
                    />
                    <SettingInput 
                        label="حد التأخر المسموح" 
                        icon={FaRunning} 
                        value={localSettings.lateThreshold} 
                        onChange={(v) => setLocalSettings(prev => ({ ...prev, lateThreshold: v }))} 
                    />
                    <SettingInput 
                        label="حد تقصير الحفظ" 
                        icon={FaBook} 
                        value={localSettings.missedMemoThreshold} 
                        onChange={(v) => setLocalSettings(prev => ({ ...prev, missedMemoThreshold: v }))} 
                    />
                    <SettingInput 
                        label="حد تقصير المراجعة" 
                        icon={FaBookOpen} 
                        value={localSettings.missedReviewThreshold} 
                        onChange={(v) => setLocalSettings(prev => ({ ...prev, missedReviewThreshold: v }))} 
                    />
                </div>

                <button 
                    onClick={handleSave} 
                    className="w-full bg-primary text-white p-3 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-primary-dark transition-colors"
                >
                    <FaSave /> حفظ التغييرات
                </button>
            </motion.div>
        </div>
    );
};

export default FollowUpSettingsModal;

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CircleData } from '../types';
import { FaTimes } from 'react-icons/fa';

interface QuickSwitchSelectorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (ids: [string, string]) => void;
    allCircles: CircleData[];
    currentSelection: string[] | [string, string];
}

const modalVariants = {
    initial: { scale: 0.9, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0.9, opacity: 0 },
};

const QuickSwitchSelectorModal: React.FC<QuickSwitchSelectorModalProps> = ({ isOpen, onClose, onSave, allCircles, currentSelection }) => {
    const [selectedIds, setSelectedIds] = useState<string[]>(currentSelection);

    useEffect(() => {
        setSelectedIds(currentSelection);
    }, [currentSelection]);

    const handleSelect = (id: string) => {
        setSelectedIds(prev => {
            if (prev.includes(id)) {
                return prev.filter(selectedId => selectedId !== id);
            }
            if (prev.length < 2) {
                return [...prev, id];
            }
            // If 2 are already selected, replace the first one
            return [prev[1], id];
        });
    };
    
    const handleSave = () => {
        if (selectedIds.length === 2) {
            onSave(selectedIds as [string, string]);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4">
            <motion.div variants={modalVariants} initial="initial" animate="animate" exit="exit" className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-sm">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-primary dark:text-accent">تخصيص التنقل السريع</h2>
                    <button onClick={onClose}><FaTimes /></button>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">اختر حلقتين للتنقل السريع بينهما.</p>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                    {allCircles.map(circle => (
                        <label key={circle.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg cursor-pointer">
                            <input
                                type="checkbox"
                                checked={selectedIds.includes(circle.id)}
                                onChange={() => handleSelect(circle.id)}
                                className="w-5 h-5 accent-primary"
                            />
                            <span className="font-semibold">{circle.circle}</span>
                        </label>
                    ))}
                </div>
                <div className="flex justify-end gap-3 mt-6">
                    <button onClick={onClose} className="px-6 py-2 rounded-lg bg-gray-200 dark:bg-gray-600">إلغاء</button>
                    <button
                        onClick={handleSave}
                        disabled={selectedIds.length !== 2}
                        className="px-6 py-2 rounded-lg bg-primary text-white disabled:bg-gray-400 dark:disabled:bg-gray-500"
                    >
                        حفظ
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default QuickSwitchSelectorModal;

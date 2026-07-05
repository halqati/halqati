
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FaTimes, FaPlus, FaMinus, FaSave } from 'react-icons/fa';
import { Student, ManualPointAdjustment } from '../types';
import { sanitizeToEnglishNumber } from '../utils/helpers';

interface ManualPointAdjusterModalProps {
    student: Student;
    currentPoints: number;
    onClose: () => void;
    onAdjust: (adjustment: Omit<ManualPointAdjustment, 'id' | 'date'>) => void;
}

const modalVariants = {
    initial: { scale: 0.9, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0.9, opacity: 0 },
};

const ManualPointAdjusterModal: React.FC<ManualPointAdjusterModalProps> = ({ student, currentPoints, onClose, onAdjust }) => {
    const [amount, setAmount] = useState(1);
    const [inputValue, setInputValue] = useState('1');
    const [reason, setReason] = useState('');

    const handleSave = () => {
        if (amount !== 0 && reason.trim()) {
            onAdjust({ amount, reason: reason.trim() });
            onClose();
        }
    };
    
    const handleDecrement = () => {
        setAmount(prevAmount => {
            const newTotal = currentPoints + (prevAmount - 1);
            const newVal = (newTotal < 0) ? prevAmount : prevAmount - 1;
            setInputValue(newVal.toString());
            return newVal;
        });
    };

    const handleIncrement = () => {
        setAmount(prev => {
            const newVal = prev + 1;
            setInputValue(newVal.toString());
            return newVal;
        });
    };

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const sanitizedVal = sanitizeToEnglishNumber(e.target.value);
        setInputValue(sanitizedVal);
        
        if (sanitizedVal === '' || sanitizedVal === '-') return;

        const val = parseInt(sanitizedVal, 10);
        if (!isNaN(val)) {
             setAmount(val);
        }
    };


    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[220] p-4">
            <motion.div variants={modalVariants} initial="initial" animate="animate" exit="exit" className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-sm">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-primary dark:text-accent">إضافة يدوي</h2>
                    <button onClick={onClose}><FaTimes /></button>
                </div>
                <div className="space-y-4">
                    <div className="flex items-center justify-center gap-4 my-4">
                        <button onClick={handleDecrement} className="w-14 h-14 bg-red-500 text-white rounded-full flex items-center justify-center text-xl font-bold transition-transform hover:scale-110 shadow-md"><FaMinus /></button>
                        
                        <input 
                            type="text"
                            inputMode="numeric"
                            dir="ltr"
                            value={inputValue}
                            onChange={handleAmountChange}
                            className={`w-24 text-center text-5xl font-bold bg-transparent border-b-2 border-gray-200 dark:border-gray-700 focus:outline-none focus:border-primary font-sans ${amount > 0 ? 'text-green-500' : amount < 0 ? 'text-red-500' : 'text-gray-500'}`}
                        />

                        <button onClick={handleIncrement} className="w-14 h-14 bg-green-500 text-white rounded-full flex items-center justify-center text-xl font-bold transition-transform hover:scale-110 shadow-md"><FaPlus /></button>
                    </div>
                     <input
                        type="text"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="سبب الإضافة (مثال: تكريم، مكافأة...)"
                        className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600"
                    />
                     <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-700/50 rounded-lg text-sm space-y-1">
                        <div className="flex justify-between">
                            <span>المجموع الحالي:</span>
                            <span className="font-bold ltr">{currentPoints}</span>
                        </div>
                        <div className={`flex justify-between ${amount >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            <span>قيمة التعديل:</span>
                            <span className="font-bold ltr">{amount >= 0 ? `+${amount}` : amount}</span>
                        </div>
                        <div className="flex justify-between border-t pt-1 mt-1 dark:border-gray-600">
                            <span className="font-bold">المجموع الجديد:</span>
                            <span className="font-bold ltr">{currentPoints + amount}</span>
                        </div>
                    </div>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-600">إلغاء</button>
                    <button 
                        onClick={handleSave} 
                        disabled={amount === 0 || !reason.trim() || (currentPoints + amount < 0)}
                        className="px-4 py-2 rounded-lg bg-primary text-white flex items-center gap-2 disabled:bg-gray-400"
                    >
                        <FaSave /> حفظ
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default ManualPointAdjusterModal;
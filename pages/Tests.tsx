
import React from 'react';
import { motion } from 'framer-motion';
import { Test } from '../types';
import { FaArrowLeft, FaPlus, FaEdit, FaTrash, FaEye } from 'react-icons/fa';
import { formatDate } from '../utils/helpers';

interface TestsProps {
    tests: Test[];
    isDraft: boolean;
    onBack: () => void;
    onNew: () => void;
    onEdit: (test: Test) => void;
    onDelete: (testId: number) => void;
    onView: (test: Test) => void;
}

const pageVariants = {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 }
};

const Tests: React.FC<TestsProps> = ({ tests, isDraft, onBack, onNew, onEdit, onDelete, onView }) => {

    const sortedTests = [...tests].sort((a, b) => b.createdAt - a.createdAt);

    const getLabels = (test: Test) => {
        const keys = Object.keys(test.content).filter(k => test.content[k]);
        return keys.map(key => {
            if (test.customLabels && test.customLabels[key]) return test.customLabels[key];
            if (key === 'memorization') return 'حفظ';
            if (key === 'review') return 'مراجعة';
            if (key === 'recitation') return 'تلاوة';
            return key;
        });
    };

    return (
        <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
            <div className="flex items-center justify-between mb-6 pb-4 border-b dark:border-gray-700">
                <div className="flex items-center gap-3">
                    <button onClick={onBack}><FaArrowLeft /></button>
                    <h2 className="text-xl font-bold text-primary dark:text-accent">الاختبارات</h2>
                </div>
                <button onClick={onNew} className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm">
                    <FaPlus /> {isDraft ? 'إكمال الاختبار' : 'اختبار جديد'}
                </button>
            </div>
            <div className="space-y-3">
                {sortedTests.length > 0 ? (
                    sortedTests.map(test => (
                        <div key={test.id} className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow flex items-center justify-between">
                            <div>
                                <p className="font-bold">{test.name}</p>
                                <div className="flex flex-wrap gap-1 mt-1">
                                    {getLabels(test).map((label, idx) => (
                                        <span key={idx} className="text-[10px] px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded border border-gray-200 dark:border-gray-600">
                                            {label}
                                        </span>
                                    ))}
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    {new Date(test.createdAt).toLocaleDateString('en-CA')}
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <button onClick={() => onView(test)} className="text-green-500"><FaEye /></button>
                                <button onClick={() => onEdit(test)} className="text-blue-500"><FaEdit /></button>
                                <button onClick={() => onDelete(test.id)} className="text-red-500"><FaTrash /></button>
                            </div>
                        </div>
                    ))
                ) : (
                    <p className="text-center text-gray-500 py-10">لا توجد اختبارات محفوظة.</p>
                )}
            </div>
        </motion.div>
    );
};

export default Tests;

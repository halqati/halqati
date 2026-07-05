import React from 'react';
import { motion } from 'framer-motion';
import { Plan } from '../types';
import { FaArrowLeft, FaPlus, FaEdit, FaTrash, FaEye } from 'react-icons/fa';

interface PlansProps {
    plans: Plan[];
    isDraft: boolean;
    onBack: () => void;
    onNew: () => void;
    onEdit: (plan: Plan) => void;
    onDelete: (planId: number) => void;
    onView: (plan: Plan) => void;
}

const pageVariants = {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 }
};

const Plans: React.FC<PlansProps> = ({ plans, isDraft, onBack, onNew, onEdit, onDelete, onView }) => {

    const sortedPlans = [...plans].sort((a, b) => b.createdAt - a.createdAt);

    return (
        <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
            <div className="flex items-center justify-between mb-6 pb-4 border-b dark:border-gray-700">
                <div className="flex items-center gap-3">
                    <button onClick={onBack}><FaArrowLeft /></button>
                    <h2 className="text-xl font-bold text-primary dark:text-accent">الخطط الدراسية</h2>
                </div>
                <button onClick={onNew} className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm">
                    <FaPlus /> {isDraft ? 'إكمال الخطة' : 'خطة جديدة'}
                </button>
            </div>
            <div className="space-y-3">
                {sortedPlans.length > 0 ? (
                    sortedPlans.map(plan => (
                        <div key={plan.id} className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow flex items-center justify-between">
                            <div>
                                <p className="font-bold">{plan.name}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {new Date(plan.createdAt).toLocaleDateString('en-CA')}
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <button onClick={() => onView(plan)} className="text-green-500"><FaEye /></button>
                                <button onClick={() => onEdit(plan)} className="text-blue-500"><FaEdit /></button>
                                <button onClick={() => onDelete(plan.id)} className="text-red-500"><FaTrash /></button>
                            </div>
                        </div>
                    ))
                ) : (
                    <p className="text-center text-gray-500 py-10">لا توجد خطط محفوظة.</p>
                )}
            </div>
        </motion.div>
    );
};

export default Plans;
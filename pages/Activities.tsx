import React from 'react';
import { motion } from 'framer-motion';
import { Activity } from '../types';
import { FaArrowLeft, FaPlus, FaEdit, FaTrash, FaEye, FaCalendarCheck } from 'react-icons/fa';
import { formatDate } from '../utils/helpers';

interface ActivitiesProps {
    activities: Activity[];
    isDraft: boolean;
    onBack: () => void;
    onNew: () => void;
    onEdit: (activity: Activity) => void;
    onDelete: (activityId: number) => void;
    onView: (activity: Activity) => void;
}

const pageVariants = {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 }
};

const Activities: React.FC<ActivitiesProps> = ({ activities, isDraft, onBack, onNew, onEdit, onDelete, onView }) => {

    const sortedActivities = [...activities].sort((a, b) => b.createdAt - a.createdAt);

    return (
        <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
            <div className="flex items-center justify-between mb-6 pb-4 border-b dark:border-gray-700">
                <div className="flex items-center gap-3">
                    <button onClick={onBack}><FaArrowLeft /></button>
                    <h2 className="text-xl font-bold text-primary dark:text-accent">النشاطات</h2>
                </div>
                <button onClick={onNew} className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm">
                    <FaPlus /> {isDraft ? 'إكمال النشاط' : 'نشاط جديد'}
                </button>
            </div>
            <div className="space-y-3">
                {sortedActivities.length > 0 ? (
                    sortedActivities.map(activity => (
                        <div key={activity.id} className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow flex items-center justify-between">
                            <div>
                                <p className="font-bold">{activity.name || `نشاط: ${activity.type}`}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {formatDate(activity.startDate)}
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <button onClick={() => onView(activity)} className="text-green-500"><FaEye /></button>
                                <button onClick={() => onEdit(activity)} className="text-blue-500"><FaEdit /></button>
                                <button onClick={() => onDelete(activity.id)} className="text-red-500"><FaTrash /></button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center text-gray-500 py-10">
                        <FaCalendarCheck className="mx-auto text-4xl mb-2 text-gray-400" />
                        <p>لا توجد نشاطات محفوظة.</p>
                        <p className="text-sm">ابدأ بإضافة نشاط جديد من الزر أعلاه.</p>
                    </div>
                )}
            </div>
        </motion.div>
    );
};

export default Activities;
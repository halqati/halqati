
import React from 'react';
import { motion } from 'framer-motion';
import { FaArrowLeft, FaClipboardCheck, FaTasks, FaChevronLeft, FaCalendarCheck, FaBullhorn, FaUserCheck, FaChartLine } from 'react-icons/fa';

interface TestsAndPlansProps {
    onBack: () => void;
    onNavigate: (page: 'tests' | 'plans' | 'activities' | 'announcements' | 'parentFollowUp') => void;
}

const pageVariants = {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 }
};

const ActionCard: React.FC<{ title: string; icon: React.ElementType; onClick: () => void; color?: string }> = ({ title, icon: Icon, onClick, color }) => (
    <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onClick}
        className="w-full text-right p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md flex items-center justify-between group"
    >
        <div className="flex items-center gap-4">
            <div className={`p-3 rounded-lg ${color ? color : 'bg-primary/10 dark:bg-accent/10'}`}>
                <Icon className={`${color ? 'text-white' : 'text-primary dark:text-accent'} text-2xl`} />
            </div>
            <span className="text-lg font-bold group-hover:text-primary dark:group-hover:text-accent transition-colors">{title}</span>
        </div>
        <FaChevronLeft className="text-gray-400 group-hover:text-primary dark:group-hover:text-accent transition-colors" />
    </motion.button>
);


const TestsAndPlans: React.FC<TestsAndPlansProps> = ({ onBack, onNavigate }) => {
    return (
        <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b dark:border-gray-700">
                <button onClick={onBack}><FaArrowLeft /></button>
                <h2 className="text-xl font-bold text-primary dark:text-accent">الاختبارات والخطط والنشاطات</h2>
            </div>
            <div className="space-y-4">
                <ActionCard title="قسم المتابعة" icon={FaChartLine} onClick={() => onNavigate('parentFollowUp')} color="bg-indigo-500" />
                <ActionCard title="الاختبارات" icon={FaClipboardCheck} onClick={() => onNavigate('tests')} />
                <ActionCard title="الخطط الدراسية" icon={FaTasks} onClick={() => onNavigate('plans')} />
                <ActionCard title="النشاطات" icon={FaCalendarCheck} onClick={() => onNavigate('activities')} />
                <ActionCard title="الإعلانات العامة" icon={FaBullhorn} onClick={() => onNavigate('announcements')} />
            </div>
        </motion.div>
    );
};

export default TestsAndPlans;

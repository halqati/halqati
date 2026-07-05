
import React from 'react';
import { motion } from 'framer-motion';
import { FaShieldAlt, FaUserLock, FaHistory, FaBell, FaPalette, FaGlobe } from 'react-icons/fa';

const AdminSettings: React.FC = () => {
    const sections = [
        {
            title: 'الصلاحيات والأدوار',
            icon: <FaShieldAlt />,
            description: 'إدارة صلاحيات المعلمين والمشرفين وتوزيع الأدوار',
            items: ['تعديل صلاحيات المعلمين', 'إضافة مشرف جديد', 'سجل العمليات الإدارية']
        },
        {
            title: 'إعدادات المركز',
            icon: <FaPalette />,
            description: 'تخصيص هوية المركز، الشعار، والألوان الرسمية',
            items: ['تغيير الشعار', 'الألوان الرسمية', 'معلومات التواصل']
        },
        {
            title: 'نظام التنبيهات',
            icon: <FaBell />,
            description: 'إعداد رسائل الواتساب التلقائية وتقارير أولياء الأمور',
            items: ['قوالب الرسائل', 'توقيت الإرسال التلقائي', 'تنبيهات الغياب']
        },
    ];

    return (
        <div className="max-w-4xl space-y-4 md:space-y-8">
            <div className="grid grid-cols-1 gap-4 md:gap-6">
                {sections.map((section, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="bg-white dark:bg-gray-900 rounded-xl md:rounded-2xl border dark:border-gray-800 p-4 md:p-8 shadow-sm hover:shadow-md transition-shadow"
                    >
                        <div className="flex flex-col sm:flex-row items-start gap-4 md:gap-6">
                            <div className="w-10 h-10 md:w-14 md:h-14 bg-primary/10 rounded-lg md:rounded-2xl flex items-center justify-center text-primary text-lg md:text-2xl flex-shrink-0">
                                {section.icon}
                            </div>
                            <div className="flex-grow w-full">
                                <h3 className="text-base md:text-xl font-bold text-gray-800 dark:text-white mb-1 md:mb-2">{section.title}</h3>
                                <p className="text-gray-500 dark:text-gray-400 text-xs md:text-sm mb-4 md:mb-6">{section.description}</p>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3">
                                    {section.items.map((item, j) => (
                                        <button 
                                            key={j}
                                            className="flex items-center justify-between p-3 md:p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg md:rounded-xl hover:bg-primary/5 hover:text-primary transition-all text-right text-xs md:text-sm font-medium group"
                                        >
                                            {item}
                                            <FaHistory className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] md:text-sm" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-xl md:rounded-2xl p-4 md:p-8">
                <h3 className="text-base md:text-lg font-bold text-red-600 mb-1 md:mb-2 flex items-center gap-2">
                    <FaUserLock /> منطقة الخطر
                </h3>
                <p className="text-xs md:text-sm text-red-500 mb-4 md:mb-6">هذه الإجراءات لا يمكن التراجع عنها، يرجى توخي الحذر.</p>
                <div className="flex flex-wrap gap-2 md:gap-4">
                    <button className="flex-1 sm:flex-none px-4 md:px-6 py-2 md:py-3 bg-red-600 text-white rounded-lg md:rounded-xl text-xs md:text-sm font-bold hover:bg-red-700 transition-colors">
                        نقل الملكية
                    </button>
                    <button className="flex-1 sm:flex-none px-4 md:px-6 py-2 md:py-3 border border-red-600 text-red-600 rounded-lg md:rounded-xl text-xs md:text-sm font-bold hover:bg-red-50 transition-colors">
                        إيقاف مؤقت
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AdminSettings;

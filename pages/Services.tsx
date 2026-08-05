import React from 'react';
import { motion } from 'framer-motion';
import { FaBook, FaBookOpen, FaChartLine, FaClipboardCheck, FaTasks, FaCalendarCheck, FaBullhorn, FaFileAlt, FaGift, FaArchive, FaCommentDots, FaCalendarAlt, FaThLarge } from 'react-icons/fa';

interface ServicesProps {
    onNavigate: (page: string) => void;
    hasFullManagement: boolean;
    hasUnreadFeedbackReply?: boolean;
}

const pageVariants = {
    initial: { opacity: 0, y: 15 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -15 }
};

interface ServiceItem {
    id: string;
    title: string;
    icon: React.ElementType;
    requiresManagement: boolean;
    hasBadge?: boolean;
}

const Services: React.FC<ServicesProps> = ({ onNavigate, hasFullManagement, hasUnreadFeedbackReply }) => {
    // Circle Organization & Management Tools section
    const organizationTools: ServiceItem[] = [
        {
            id: 'studySchedule',
            title: 'الجدول الدراسي',
            icon: FaCalendarAlt,
            requiresManagement: false
        }
    ];

    const servicesList: ServiceItem[] = [
        {
            id: 'quran',
            title: 'المصحف الشريف',
            icon: FaBookOpen,
            requiresManagement: false
        },
        {
            id: 'records',
            title: 'السجل',
            icon: FaBook,
            requiresManagement: false
        },
        {
            id: 'parentFollowUp',
            title: 'المتابعة',
            icon: FaChartLine,
            requiresManagement: true
        },
        {
            id: 'tests',
            title: 'الاختبارات',
            icon: FaClipboardCheck,
            requiresManagement: true
        },
        {
            id: 'plans',
            title: 'الخطط',
            icon: FaTasks,
            requiresManagement: true
        },
        {
            id: 'activities',
            title: 'النشاطات',
            icon: FaCalendarCheck,
            requiresManagement: true
        },
        {
            id: 'announcements',
            title: 'الأخبار',
            icon: FaBullhorn,
            requiresManagement: true
        },
        {
            id: 'reports',
            title: 'التقارير',
            icon: FaFileAlt,
            requiresManagement: false
        },
        {
            id: 'rewards',
            title: 'إدارة المكافآت',
            icon: FaGift,
            requiresManagement: true
        },
        {
            id: 'teacherFeedback',
            title: 'اقتراحات وملاحظات',
            icon: FaCommentDots,
            requiresManagement: false,
            hasBadge: hasUnreadFeedbackReply
        },
        {
            id: 'archive',
            title: 'الأرشيف',
            icon: FaArchive,
            requiresManagement: true
        }
    ];

    // Ensure scrolling to top when changing views
    const handleServiceClick = (id: string) => {
        onNavigate(id);
        window.scrollTo({ top: 0, behavior: 'instant' as any });
    };

    return (
        <motion.div 
            variants={pageVariants} 
            initial="initial" 
            animate="animate" 
            exit="exit"
            className="space-y-6 max-w-lg mx-auto"
            dir="rtl"
        >
            <div className="px-1 text-center sm:text-right">
                <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">الأقسام والخدمات</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">تصفح لوحة الخدمات المتكاملة لإدارة ومتابعة شؤون الحلقة</p>
            </div>

            {/* SECTION 1: Circle Organization & Management Tools (أدوات تنظيم وإدارة الحلقة) */}
            <div className="space-y-2.5">
                <div className="flex items-center gap-2 px-1">
                    <div className="w-2 h-4 bg-emerald-600 rounded-full"></div>
                    <h2 className="text-sm font-bold text-gray-800 dark:text-gray-200">أدوات تنظيم وإدارة الحلقة</h2>
                </div>

                <div className="grid grid-cols-3 gap-3 md:gap-4">
                    {organizationTools.map((tool) => {
                        const isDisabled = tool.requiresManagement && !hasFullManagement;

                        return (
                            <motion.button
                                key={tool.id}
                                whileHover={isDisabled ? {} : { scale: 1.04 }}
                                whileTap={isDisabled ? {} : { scale: 0.96 }}
                                onClick={() => !isDisabled && handleServiceClick(tool.id)}
                                disabled={isDisabled}
                                className={`w-full aspect-square p-3 rounded-2xl bg-white dark:bg-gray-800 transition-all duration-200 flex flex-col items-center justify-center text-center relative border border-emerald-100/80 dark:border-emerald-800/40 shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)]`}
                            >
                                <div className="w-12 h-12 rounded-full flex items-center justify-center transition-colors flex-shrink-0 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                                    <tool.icon size={20} />
                                </div>
                                <span className="text-[11px] sm:text-xs font-bold mt-2.5 text-gray-800 dark:text-gray-100 line-clamp-1">
                                    {tool.title}
                                </span>
                            </motion.button>
                        );
                    })}
                </div>
            </div>

            {/* SECTION 2: General Services */}
            <div className="space-y-2.5">
                <div className="flex items-center gap-2 px-1">
                    <div className="w-2 h-4 bg-amber-600 rounded-full"></div>
                    <h2 className="text-sm font-bold text-gray-800 dark:text-gray-200">الخدمات والمتابعة العامة</h2>
                </div>

                <div className="grid grid-cols-3 gap-3 md:gap-4">
                    {servicesList.map((service) => {
                        const isDisabled = service.requiresManagement && !hasFullManagement;
                        
                        return (
                            <motion.button
                                key={service.id}
                                whileHover={isDisabled ? {} : { scale: 1.04 }}
                                whileTap={isDisabled ? {} : { scale: 0.96 }}
                                onClick={() => !isDisabled && handleServiceClick(service.id)}
                                disabled={isDisabled}
                                className={`w-full aspect-square p-3 rounded-2xl bg-white dark:bg-gray-800 transition-all duration-200 flex flex-col items-center justify-center text-center relative ${
                                    isDisabled 
                                        ? 'opacity-30 cursor-not-allowed border border-dashed border-gray-200 dark:border-gray-700' 
                                        : 'border border-gray-100/70 dark:border-gray-700/50 shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)]'
                                }`}
                            >
                                {service.hasBadge && (
                                    <span className="absolute top-2 left-2 w-3 h-3 bg-red-500 rounded-full border-2 border-white dark:border-gray-800 animate-pulse" />
                                )}
                                {/* Circular Icon Container */}
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors flex-shrink-0 ${
                                    isDisabled
                                        ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
                                        : 'bg-[#f5ebe0] dark:bg-[#3d3025] text-[#8d7056] dark:text-[#d4bca4]'
                                }`}>
                                    <service.icon size={20} />
                                </div>
                                
                                {/* Title */}
                                <span className={`text-[11px] sm:text-xs font-bold mt-2.5 transition-colors line-clamp-1 ${
                                    isDisabled ? 'text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-200'
                                }`}>
                                    {service.title}
                                </span>
                            </motion.button>
                        );
                    })}
                </div>
            </div>
        </motion.div>
    );
};

export default Services;


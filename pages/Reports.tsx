import React from 'react';
import { motion } from 'framer-motion';
import { FaArrowLeft, FaChartBar, FaFileAlt, FaInfoCircle } from 'react-icons/fa';

interface ReportsProps {
    onBack: () => void;
}

const pageVariants = {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 }
};

const Reports: React.FC<ReportsProps> = ({ onBack }) => {
    return (
        <motion.div 
            variants={pageVariants} 
            initial="initial" 
            animate="animate" 
            exit="exit"
            className="space-y-6"
            dir="rtl"
        >
            {/* Header */}
            <div className="flex items-center gap-3 pb-4 border-b dark:border-gray-700">
                <button 
                    onClick={onBack}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all active:scale-95 text-gray-500 dark:text-gray-400"
                    aria-label="رجوع"
                >
                    <FaArrowLeft />
                </button>
                <div>
                    <h1 className="text-xl font-bold text-primary dark:text-accent">التقارير</h1>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 font-medium">لوحة تحليل البيانات وإحصائيات الطلاب</p>
                </div>
            </div>

            {/* Template Body */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center text-center space-y-6 shadow-sm min-h-[450px]">
                {/* Visual Accent */}
                <div className="w-24 h-24 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-[2rem] flex items-center justify-center border border-emerald-100 dark:border-emerald-900/30 shadow-sm animate-pulse">
                    <FaChartBar size={40} />
                </div>

                <div className="space-y-2 max-w-sm">
                    <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">قريباً: ميزة التقارير المتقدمة 📊</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                        نعمل حالياً على تطوير نظام إحصائي متكامل يقدم لكم رسومات بيانية ذكية، وإحصائيات مخصصة لكل طالب لمتابعة تقدم الحفظ والمراجعة بشكل تلقائي وبأعلى دقة.
                    </p>
                </div>

                {/* Features Highlights */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-md pt-4 text-right">
                    <div className="p-3 bg-gray-50 dark:bg-gray-900/40 rounded-2xl border border-gray-100 dark:border-gray-800 flex items-start gap-3">
                        <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg mt-0.5">
                            <FaFileAlt size={12} />
                        </div>
                        <div>
                            <h4 className="text-xs font-bold text-gray-700 dark:text-gray-200">تصدير PDF ذكي</h4>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400">تقارير جاهزة للطباعة والمشاركة بلمسة واحدة</p>
                        </div>
                    </div>

                    <div className="p-3 bg-gray-50 dark:bg-gray-900/40 rounded-2xl border border-gray-100 dark:border-gray-800 flex items-start gap-3">
                        <div className="p-2 bg-amber-500/10 text-amber-500 rounded-lg mt-0.5">
                            <FaInfoCircle size={12} />
                        </div>
                        <div>
                            <h4 className="text-xs font-bold text-gray-700 dark:text-gray-200">تتبع بياني للتقدم</h4>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400">منحنيات بيانية توضح مستويات الحفظ اليومي والشهري</p>
                        </div>
                    </div>
                </div>

                <button
                    onClick={onBack}
                    className="px-6 py-2.5 bg-primary dark:bg-accent text-white text-xs font-bold rounded-xl shadow-md hover:opacity-95 transition-all active:scale-95"
                >
                    العودة للخدمات
                </button>
            </div>
        </motion.div>
    );
};

export default Reports;

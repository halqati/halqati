
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FaPlus, FaSearch, FaEllipsisV, FaUsers, FaChalkboardTeacher, FaMapMarkerAlt, FaClock, FaLayerGroup, FaFileImport } from 'react-icons/fa';
import AdminImportModal from './AdminImportModal';

const AdminCircles: React.FC = () => {
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const circles = [
        { id: 1, name: 'حلقة الإيمان', teacher: 'أحمد محمد', students: 15, maxStudents: 20, time: '04:00 م', location: 'القاعة الكبرى' },
        { id: 2, name: 'حلقة النور', teacher: 'سارة علي', students: 12, maxStudents: 15, time: '05:30 م', location: 'المصلى الصغير' },
        { id: 3, name: 'حلقة الفرقان', teacher: 'خالد عبدالله', students: 18, maxStudents: 20, time: '04:00 م', location: 'القاعة 3' },
        { id: 4, name: 'حلقة التوحيد', teacher: 'فاطمة حسن', students: 10, maxStudents: 12, time: '07:00 م', location: 'أونلاين' },
    ];

    return (
        <div className="space-y-4 md:space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4">
                <div className="relative flex-grow max-w-md flex items-center gap-2">
                    <div className="relative flex-grow">
                        <FaSearch className="absolute right-3 md:right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm md:text-base" />
                        <input 
                            type="text" 
                            placeholder="البحث عن حلقة أو معلم..." 
                            className="w-full bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-lg md:rounded-xl py-2 md:py-3 pr-10 md:pr-12 pl-4 outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                        />
                    </div>
                    <button 
                        onClick={() => setIsImportModalOpen(true)}
                        className="p-2 md:p-3 text-gray-300 hover:text-primary transition-colors"
                        title="استيراد من نسخة قديمة"
                    >
                        <FaFileImport size={14} />
                    </button>
                </div>
                <button className="bg-primary text-white px-4 md:px-6 py-2 md:py-3 rounded-lg md:rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:scale-105 transition-transform text-sm">
                    <FaPlus /> إنشاء حلقة جديدة
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
                {circles.map((circle, i) => (
                    <motion.div
                        key={circle.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.05 }}
                        className="bg-white dark:bg-gray-900 rounded-xl md:rounded-2xl border dark:border-gray-800 p-4 md:p-6 hover:shadow-xl transition-all group"
                    >
                        <div className="flex justify-between items-start mb-4 md:mb-6">
                            <div className="w-10 h-10 md:w-12 md:h-12 bg-primary/10 rounded-lg md:rounded-xl flex items-center justify-center text-primary text-lg md:text-xl">
                                <FaLayerGroup />
                            </div>
                            <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                                <FaEllipsisV size={14} />
                            </button>
                        </div>

                        <h3 className="text-base md:text-xl font-bold text-gray-800 dark:text-white mb-3 md:mb-4">{circle.name}</h3>
                        
                        <div className="space-y-2 md:space-y-3 mb-4 md:mb-6">
                            <div className="flex items-center gap-2 md:gap-3 text-xs md:text-sm text-gray-500 dark:text-gray-400">
                                <FaChalkboardTeacher className="text-primary flex-shrink-0" />
                                <span className="truncate">المعلم: <span className="text-gray-800 dark:text-gray-200 font-medium">{circle.teacher}</span></span>
                            </div>
                            <div className="flex items-center gap-2 md:gap-3 text-xs md:text-sm text-gray-500 dark:text-gray-400">
                                <FaUsers className="text-primary flex-shrink-0" />
                                <span>الطلاب: <span className="text-gray-800 dark:text-gray-200 font-medium">{circle.students} / {circle.maxStudents}</span></span>
                            </div>
                            <div className="flex items-center gap-2 md:gap-3 text-xs md:text-sm text-gray-500 dark:text-gray-400">
                                <FaClock className="text-primary flex-shrink-0" />
                                <span>الوقت: <span className="text-gray-800 dark:text-gray-200 font-medium">{circle.time}</span></span>
                            </div>
                            <div className="flex items-center gap-2 md:gap-3 text-xs md:text-sm text-gray-500 dark:text-gray-400">
                                <FaMapMarkerAlt className="text-primary flex-shrink-0" />
                                <span className="truncate">المكان: <span className="text-gray-800 dark:text-gray-200 font-medium">{circle.location}</span></span>
                            </div>
                        </div>

                        <div className="w-full bg-gray-100 dark:bg-gray-800 h-1.5 md:h-2 rounded-full overflow-hidden mb-4 md:mb-6">
                            <div 
                                className="bg-primary h-full rounded-full transition-all duration-1000" 
                                style={{ width: `${(circle.students / circle.maxStudents) * 100}%` }}
                            />
                        </div>

                        <div className="flex gap-2">
                            <button className="flex-grow py-2 md:py-2.5 text-xs md:text-sm font-bold text-primary bg-primary/5 hover:bg-primary/10 rounded-lg transition-colors">
                                إدارة الطلاب
                            </button>
                            <button className="flex-grow py-2 md:py-2.5 text-xs md:text-sm font-bold text-gray-500 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 rounded-lg transition-colors">
                                الإعدادات
                            </button>
                        </div>
                    </motion.div>
                ))}
            </div>

            <AdminImportModal 
                isOpen={isImportModalOpen} 
                onClose={() => setIsImportModalOpen(false)} 
            />
        </div>
    );
};

export default AdminCircles;

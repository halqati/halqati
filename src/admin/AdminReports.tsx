
import React from 'react';
import { motion } from 'framer-motion';
import { FaFileAlt, FaDownload, FaChartBar, FaUserGraduate, FaChalkboardTeacher, FaCalendarAlt } from 'react-icons/fa';

const AdminReports: React.FC = () => {
    const reportTypes = [
        { id: 1, title: 'تقرير الحضور العام', description: 'إحصائيات الحضور والغياب لجميع الحلقات', icon: <FaCalendarAlt />, color: 'text-blue-500' },
        { id: 2, title: 'تقرير تقدم الطلاب', description: 'معدلات الحفظ والمراجعة الشهرية للطلاب', icon: <FaUserGraduate />, color: 'text-green-500' },
        { id: 3, title: 'أداء المعلمين', description: 'تقييم أداء المعلمين ونشاط حلقاتهم', icon: <FaChalkboardTeacher />, color: 'text-purple-500' },
        { id: 4, title: 'الإحصائيات المالية', description: 'تقرير الرسوم والاشتراكات والمصروفات', icon: <FaChartBar />, color: 'text-orange-500' },
    ];

    return (
        <div className="space-y-6 md:space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                {reportTypes.map((report, i) => (
                    <motion.div
                        key={report.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="bg-white dark:bg-gray-900 p-4 md:p-6 rounded-xl md:rounded-2xl border dark:border-gray-800 shadow-sm hover:shadow-md transition-all group cursor-pointer"
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className={`w-10 h-10 md:w-12 md:h-12 rounded-lg md:rounded-xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-xl md:text-2xl ${report.color}`}>
                                {report.icon}
                            </div>
                            <button className="p-2 text-gray-400 hover:text-primary transition-colors">
                                <FaDownload size={16} />
                            </button>
                        </div>
                        <h3 className="text-base md:text-lg font-bold text-gray-800 dark:text-white mb-1 md:mb-2">{report.title}</h3>
                        <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">{report.description}</p>
                        
                        <div className="mt-6 pt-4 border-t dark:border-gray-800 flex items-center justify-between">
                            <span className="text-[10px] md:text-xs text-gray-400">آخر تحديث: اليوم 09:00 ص</span>
                            <button className="text-xs md:text-sm font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                                إنشاء التقرير ←
                            </button>
                        </div>
                    </motion.div>
                ))}
            </div>

            <div className="bg-white dark:bg-gray-900 p-4 md:p-6 rounded-xl md:rounded-2xl border dark:border-gray-800 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                        <FaFileAlt />
                    </div>
                    <h3 className="text-base md:text-lg font-bold text-gray-800 dark:text-white">التقارير المجدولة</h3>
                </div>
                
                <div className="space-y-3">
                    {[1, 2].map((_, i) => (
                        <div key={i} className="flex items-center justify-between p-3 md:p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border dark:border-gray-800">
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                <div>
                                    <p className="text-xs md:text-sm font-bold text-gray-800 dark:text-white">التقرير الشهري الشامل</p>
                                    <p className="text-[10px] md:text-xs text-gray-500">يتم إرساله تلقائياً كل أول شهر</p>
                                </div>
                            </div>
                            <button className="text-[10px] md:text-xs font-bold text-primary bg-primary/5 px-3 py-1.5 rounded-lg">
                                تعديل الجدول
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default AdminReports;

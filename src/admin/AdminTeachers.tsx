
import React from 'react';
import { motion } from 'framer-motion';
import { FaPlus, FaSearch, FaEnvelope, FaPhone, FaCircle, FaEllipsisH, FaUserShield } from 'react-icons/fa';

const AdminTeachers: React.FC = () => {
    const teachers = [
        { id: 1, name: 'أحمد محمد علي', email: 'ahmed@example.com', phone: '0501234567', circles: 2, students: 35, status: 'active', role: 'معلم' },
        { id: 2, name: 'سارة علي حسن', email: 'sara@example.com', phone: '0507654321', circles: 1, students: 12, status: 'active', role: 'معلمة' },
        { id: 3, name: 'خالد عبدالله', email: 'khaled@example.com', phone: '0551122334', circles: 3, students: 48, status: 'away', role: 'مشرف' },
        { id: 4, name: 'فاطمة حسن', email: 'fatima@example.com', phone: '0569988776', circles: 1, students: 10, status: 'active', role: 'معلمة' },
    ];

    return (
        <div className="space-y-4 md:space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4">
                <div className="relative flex-grow max-w-md">
                    <FaSearch className="absolute right-3 md:right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm md:text-base" />
                    <input 
                        type="text" 
                        placeholder="البحث عن معلم..." 
                        className="w-full bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-lg md:rounded-xl py-2 md:py-3 pr-10 md:pr-12 pl-4 outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                    />
                </div>
                <button className="bg-primary text-white px-4 md:px-6 py-2 md:py-3 rounded-lg md:rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:scale-105 transition-transform text-sm">
                    <FaPlus /> إضافة معلم جديد
                </button>
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block bg-white dark:bg-gray-900 rounded-2xl border dark:border-gray-800 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-right">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 text-sm border-b dark:border-gray-800">
                                <th className="p-4 font-bold">المعلم</th>
                                <th className="p-4 font-bold">الدور</th>
                                <th className="p-4 font-bold">الحلقات</th>
                                <th className="p-4 font-bold">إجمالي الطلاب</th>
                                <th className="p-4 font-bold">الحالة</th>
                                <th className="p-4 font-bold">الإجراءات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y dark:divide-gray-800">
                            {teachers.map((teacher, i) => (
                                <motion.tr 
                                    key={teacher.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
                                >
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                                {teacher.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-800 dark:text-white">{teacher.name}</p>
                                                <p className="text-xs text-gray-500">{teacher.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <span className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                                            <FaUserShield className="text-accent" />
                                            {teacher.role}
                                        </span>
                                    </td>
                                    <td className="p-4 text-sm font-medium">{teacher.circles} حلقات</td>
                                    <td className="p-4 text-sm font-medium">{teacher.students} طالب</td>
                                    <td className="p-4">
                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                                            teacher.status === 'active' ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'
                                        }`}>
                                            <FaCircle size={8} />
                                            {teacher.status === 'active' ? 'نشط' : 'غير متصل'}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex gap-2">
                                            <button className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors">
                                                تعديل
                                            </button>
                                            <button className="p-2 text-gray-400 hover:text-gray-600">
                                                <FaEllipsisH />
                                            </button>
                                        </div>
                                    </td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
                {teachers.map((teacher, i) => (
                    <motion.div
                        key={teacher.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="bg-white dark:bg-gray-900 p-4 rounded-xl border dark:border-gray-800 shadow-sm"
                    >
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                    {teacher.name.charAt(0)}
                                </div>
                                <div>
                                    <p className="font-bold text-sm text-gray-800 dark:text-white">{teacher.name}</p>
                                    <p className="text-[10px] text-gray-500">{teacher.email}</p>
                                </div>
                            </div>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                teacher.status === 'active' ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'
                            }`}>
                                <FaCircle size={6} />
                                {teacher.status === 'active' ? 'نشط' : 'بعيد'}
                            </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 py-3 border-y dark:border-gray-800 mb-3">
                            <div className="text-center">
                                <p className="text-[10px] text-gray-500 mb-0.5">الدور</p>
                                <p className="text-xs font-bold text-gray-800 dark:text-white">{teacher.role}</p>
                            </div>
                            <div className="text-center border-x dark:border-gray-800">
                                <p className="text-[10px] text-gray-500 mb-0.5">الحلقات</p>
                                <p className="text-xs font-bold text-gray-800 dark:text-white">{teacher.circles}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-[10px] text-gray-500 mb-0.5">الطلاب</p>
                                <p className="text-xs font-bold text-gray-800 dark:text-white">{teacher.students}</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button className="flex-grow py-2 text-xs font-bold text-blue-500 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                تعديل البيانات
                            </button>
                            <button className="p-2 text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                <FaEllipsisH />
                            </button>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

export default AdminTeachers;


import React from 'react';
import { motion } from 'framer-motion';
import { FaPlus, FaSearch, FaFilter, FaDownload, FaEllipsisV, FaUserGraduate } from 'react-icons/fa';

const AdminStudents: React.FC = () => {
    const students = [
        { id: 1, name: 'محمد أحمد علي', age: 12, circle: 'حلقة الإيمان', level: 'الجزء 15', status: 'نشط', phone: '0501112223' },
        { id: 2, name: 'عبدالله خالد', age: 10, circle: 'حلقة النور', level: 'الجزء 5', status: 'نشط', phone: '0504445556' },
        { id: 3, name: 'يوسف عمر', age: 14, circle: 'حلقة الفرقان', level: 'خاتم', status: 'نشط', phone: '0557778889' },
        { id: 4, name: 'علي حسن', age: 11, circle: 'حلقة الإيمان', level: 'الجزء 20', status: 'متوقف', phone: '0560001112' },
        { id: 5, name: 'إبراهيم فهد', age: 13, circle: 'حلقة التوحيد', level: 'الجزء 2', status: 'نشط', phone: '0543332221' },
    ];

    return (
        <div className="space-y-4 md:space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 md:gap-4">
                <div className="flex flex-grow gap-2 max-w-2xl">
                    <div className="relative flex-grow">
                        <FaSearch className="absolute right-3 md:right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm md:text-base" />
                        <input 
                            type="text" 
                            placeholder="البحث عن طالب..." 
                            className="w-full bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-lg md:rounded-xl py-2 md:py-3 pr-10 md:pr-12 pl-4 outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                        />
                    </div>
                    <button className="bg-white dark:bg-gray-900 border dark:border-gray-800 p-2 md:p-3 rounded-lg md:rounded-xl text-gray-500 hover:text-primary transition-colors">
                        <FaFilter size={14} />
                    </button>
                </div>
                <div className="flex gap-2 md:gap-3">
                    <button className="flex-1 md:flex-none bg-white dark:bg-gray-900 border dark:border-gray-800 px-3 md:px-4 py-2 md:py-3 rounded-lg md:rounded-xl font-bold flex items-center justify-center gap-2 text-gray-600 hover:bg-gray-50 transition-colors text-xs md:text-sm">
                        <FaDownload /> تصدير
                    </button>
                    <button className="flex-1 md:flex-none bg-primary text-white px-4 md:px-6 py-2 md:py-3 rounded-lg md:rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:scale-105 transition-transform text-xs md:text-sm">
                        <FaPlus /> إضافة طالب
                    </button>
                </div>
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block bg-white dark:bg-gray-900 rounded-2xl border dark:border-gray-800 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-right">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 text-sm border-b dark:border-gray-800">
                                <th className="p-4 font-bold">الطالب</th>
                                <th className="p-4 font-bold">العمر</th>
                                <th className="p-4 font-bold">الحلقة</th>
                                <th className="p-4 font-bold">مستوى الحفظ</th>
                                <th className="p-4 font-bold">الحالة</th>
                                <th className="p-4 font-bold">الإجراءات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y dark:divide-gray-800">
                            {students.map((student, i) => (
                                <motion.tr 
                                    key={student.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.03 }}
                                    className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors group"
                                >
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent">
                                                <FaUserGraduate />
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-800 dark:text-white">{student.name}</p>
                                                <p className="text-xs text-gray-500">{student.phone}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4 text-sm">{student.age} سنة</td>
                                    <td className="p-4">
                                        <span className="text-sm font-medium bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-lg">
                                            {student.circle}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <span className={`text-sm font-bold ${student.level === 'خاتم' ? 'text-accent' : 'text-primary'}`}>
                                            {student.level}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${
                                            student.status === 'نشط' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                                        }`}>
                                            {student.status}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                                            <FaEllipsisV />
                                        </button>
                                    </td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
                {students.map((student, i) => (
                    <motion.div
                        key={student.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="bg-white dark:bg-gray-900 p-4 rounded-xl border dark:border-gray-800 shadow-sm"
                    >
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent">
                                    <FaUserGraduate />
                                </div>
                                <div>
                                    <p className="font-bold text-sm text-gray-800 dark:text-white">{student.name}</p>
                                    <p className="text-[10px] text-gray-500">{student.phone}</p>
                                </div>
                            </div>
                            <button className="p-1 text-gray-400">
                                <FaEllipsisV size={12} />
                            </button>
                        </div>
                        <div className="grid grid-cols-2 gap-3 py-3 border-y dark:border-gray-800 mb-3">
                            <div>
                                <p className="text-[10px] text-gray-500 mb-0.5">الحلقة</p>
                                <p className="text-xs font-bold text-gray-800 dark:text-white truncate">{student.circle}</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-gray-500 mb-0.5">المستوى</p>
                                <p className={`text-xs font-bold ${student.level === 'خاتم' ? 'text-accent' : 'text-primary'}`}>{student.level}</p>
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] text-gray-500">{student.age} سنة</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                student.status === 'نشط' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                            }`}>
                                {student.status}
                            </span>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

export default AdminStudents;

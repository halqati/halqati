
import React from 'react';
import { motion } from 'framer-motion';
import { FaUsers, FaLayerGroup, FaCalendarCheck, FaChartLine, FaCheckCircle, FaClock } from 'react-icons/fa';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

const data = [
    { name: 'السبت', value: 400 },
    { name: 'الأحد', value: 300 },
    { name: 'الاثنين', value: 600 },
    { name: 'الثلاثاء', value: 800 },
    { name: 'الأربعاء', value: 500 },
    { name: 'الخميس', value: 900 },
];

const AdminDashboard: React.FC = () => {
    const stats = [
        { label: 'إجمالي الطلاب', value: '1,284', icon: <FaUsers />, color: 'bg-blue-500', trend: '+12%' },
        { label: 'إجمالي الحلقات', value: '42', icon: <FaLayerGroup />, color: 'bg-green-500', trend: '+3' },
        { label: 'الحضور اليومي', value: '94%', icon: <FaCalendarCheck />, color: 'bg-purple-500', trend: '-2%' },
        { label: 'معدل الإنجاز', value: '88%', icon: <FaChartLine />, color: 'bg-orange-500', trend: '+5%' },
    ];

    return (
        <div className="space-y-4 md:space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
                {stats.map((stat, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="bg-white dark:bg-gray-900 p-3 md:p-6 rounded-xl md:rounded-2xl shadow-sm border dark:border-gray-800 flex items-center justify-between"
                    >
                        <div className="min-w-0">
                            <p className="text-[10px] md:text-sm text-gray-500 dark:text-gray-400 mb-0.5 md:mb-1 truncate">{stat.label}</p>
                            <h3 className="text-lg md:text-2xl font-bold text-gray-800 dark:text-white truncate">{stat.value}</h3>
                            <span className={`text-[8px] md:text-xs font-medium ${stat.trend.startsWith('+') ? 'text-green-500' : 'text-red-500'}`}>
                                {stat.trend}
                            </span>
                        </div>
                        <div className={`w-8 h-8 md:w-12 md:h-12 ${stat.color} rounded-lg md:rounded-xl flex items-center justify-center text-white shadow-lg flex-shrink-0 ml-2`}>
                            <span className="text-sm md:text-base">{stat.icon}</span>
                        </div>
                    </motion.div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8">
                {/* Chart Section */}
                <div className="lg:col-span-2 bg-white dark:bg-gray-900 p-4 md:p-6 rounded-xl md:rounded-2xl shadow-sm border dark:border-gray-800">
                    <div className="flex items-center justify-between mb-4 md:mb-8">
                        <div>
                            <h3 className="text-base md:text-lg font-bold text-gray-800 dark:text-white">تقدم الحفظ الشهري</h3>
                            <p className="text-[10px] md:text-sm text-gray-500">معدل الصفحات المحفوظة يومياً</p>
                        </div>
                        <select className="bg-gray-50 dark:bg-gray-800 border-none rounded-lg text-[10px] md:text-sm p-1.5 md:p-2 outline-none">
                            <option>آخر 7 أيام</option>
                            <option>آخر 30 يوم</option>
                        </select>
                    </div>
                    <div className="h-[200px] md:h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data}>
                                <defs>
                                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#9ca3af'}} />
                                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#9ca3af'}} />
                                <Tooltip 
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '12px' }}
                                />
                                <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorValue)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-white dark:bg-gray-900 p-4 md:p-6 rounded-xl md:rounded-2xl shadow-sm border dark:border-gray-800">
                    <h3 className="text-base md:text-lg font-bold text-gray-800 dark:text-white mb-4 md:mb-6">آخر النشاطات</h3>
                    <div className="space-y-4 md:space-y-6">
                        {[1, 2, 3, 4, 5].map((_, i) => (
                            <div key={i} className="flex gap-3 md:gap-4">
                                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                                    <FaCheckCircle className="text-green-500 text-sm md:text-base" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs md:text-sm font-medium text-gray-800 dark:text-white truncate">
                                        أتم الطالب <span className="text-primary">محمد أحمد</span> حفظ سورة البقرة
                                    </p>
                                    <div className="flex items-center gap-2 text-[9px] md:text-[10px] text-gray-500 mt-1">
                                        <FaClock />
                                        <span>منذ 5 دقائق</span>
                                        <span>•</span>
                                        <span className="truncate">حلقة الإيمان</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <button className="w-full mt-6 md:mt-8 py-2 md:py-3 text-xs md:text-sm font-bold text-primary hover:bg-primary/5 rounded-lg md:rounded-xl transition-colors">
                        عرض جميع النشاطات
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;

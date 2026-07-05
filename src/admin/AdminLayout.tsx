
import React from 'react';
import { motion } from 'framer-motion';
import { FaChartPie, FaUsers, FaChalkboardTeacher, FaLayerGroup, FaFileAlt, FaCog, FaSignOutAlt, FaChevronRight, FaChevronLeft } from 'react-icons/fa';

interface AdminLayoutProps {
    children: React.ReactNode;
    activeTab: string;
    setActiveTab: (tab: string) => void;
    onLogout: () => void;
    onSwitchToTeacher: () => void;
    centerName: string;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children, activeTab, setActiveTab, onLogout, onSwitchToTeacher, centerName }) => {
    const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);

    const menuItems = [
        { id: 'dashboard', label: 'الرئيسية', icon: <FaChartPie />, shortLabel: 'الرئيسية' },
        { id: 'circles', label: 'الحلقات', icon: <FaLayerGroup />, shortLabel: 'الحلقات' },
        { id: 'teachers', label: 'المعلمون', icon: <FaChalkboardTeacher />, shortLabel: 'المعلمون' },
        { id: 'students', label: 'الطلاب', icon: <FaUsers />, shortLabel: 'الطلاب' },
        { id: 'reports', label: 'التقارير', icon: <FaFileAlt />, shortLabel: 'التقارير' },
        { id: 'settings', label: 'الإعدادات', icon: <FaCog />, shortLabel: 'الإعدادات' },
    ];

    return (
        <div className="flex h-screen bg-[#f8f9fa] dark:bg-gray-950 font-cairo overflow-hidden rtl" dir="rtl">
            {/* Sidebar - Desktop Only */}
            <motion.aside 
                initial={false}
                animate={{ width: isSidebarOpen ? 280 : 80 }}
                className="hidden md:flex bg-white dark:bg-gray-900 border-l dark:border-gray-800 flex-col z-30 shadow-xl"
            >
                <div className="p-6 flex items-center justify-between border-b dark:border-gray-800">
                    {isSidebarOpen && (
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex items-center gap-3"
                        >
                            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                                <FaLayerGroup size={20} />
                            </div>
                            <div className="overflow-hidden">
                                <h1 className="font-bold text-lg text-gray-800 dark:text-white truncate">{centerName}</h1>
                                <p className="text-[10px] text-primary font-medium uppercase tracking-wider">لوحة الإدارة</p>
                            </div>
                        </motion.div>
                    )}
                    <button 
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500 transition-colors"
                    >
                        {isSidebarOpen ? <FaChevronRight /> : <FaChevronLeft />}
                    </button>
                </div>

                <nav className="flex-grow p-4 space-y-2 overflow-y-auto">
                    {menuItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={`w-full flex items-center gap-4 p-3 rounded-xl transition-all duration-200 group ${
                                activeTab === item.id 
                                ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                                : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-primary'
                            }`}
                        >
                            <span className={`text-xl ${activeTab === item.id ? 'text-white' : 'group-hover:scale-110 transition-transform'}`}>
                                {item.icon}
                            </span>
                            {isSidebarOpen && (
                                <motion.span 
                                    initial={{ opacity: 0, x: 10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="font-medium"
                                >
                                    {item.label}
                                </motion.span>
                            )}
                        </button>
                    ))}
                </nav>

                <div className="p-4 border-t dark:border-gray-800 space-y-2">
                    <button
                        onClick={onSwitchToTeacher}
                        className="w-full flex items-center gap-4 p-3 rounded-xl text-primary hover:bg-primary/5 transition-colors"
                    >
                        <span className="text-xl"><FaChalkboardTeacher /></span>
                        {isSidebarOpen && <span className="font-medium">واجهة المعلم</span>}
                    </button>
                    <button
                        onClick={onLogout}
                        className="w-full flex items-center gap-4 p-3 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                        <span className="text-xl"><FaSignOutAlt /></span>
                        {isSidebarOpen && <span className="font-medium">تسجيل الخروج</span>}
                    </button>
                </div>
            </motion.aside>

            {/* Main Content */}
            <main className="flex-grow overflow-y-auto relative pb-20 md:pb-0">
                <header className="sticky top-0 z-20 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b dark:border-gray-800 p-3 md:p-4 px-4 md:px-8 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <h2 className="text-lg md:text-xl font-bold text-gray-800 dark:text-white">
                            {menuItems.find(i => i.id === activeTab)?.label}
                        </h2>
                    </div>
                    <div className="flex items-center gap-3 md:gap-4">
                        <div className="text-left hidden sm:block">
                            <p className="text-xs md:text-sm font-bold text-gray-800 dark:text-white">مدير المركز</p>
                            <p className="text-[9px] md:text-[10px] text-gray-500">متصل الآن</p>
                        </div>
                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-accent/20 border-2 border-accent flex items-center justify-center text-accent font-bold text-sm md:text-base">
                            M
                        </div>
                        <button 
                            onClick={onSwitchToTeacher}
                            className="md:hidden p-2 text-primary hover:bg-primary/10 rounded-lg"
                            title="واجهة المعلم"
                        >
                            <FaChalkboardTeacher size={20} />
                        </button>
                    </div>
                </header>

                <div className="p-4 md:p-8 max-w-7xl mx-auto">
                    {children}
                </div>
            </main>

            {/* Mobile Bottom Navigation */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t dark:border-gray-800 px-2 py-1 flex items-center justify-around z-40 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
                {menuItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
                            activeTab === item.id 
                            ? 'text-primary' 
                            : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                        }`}
                    >
                        <span className={`text-xl ${activeTab === item.id ? 'scale-110' : ''}`}>
                            {item.icon}
                        </span>
                        <span className="text-[10px] font-bold">{item.shortLabel}</span>
                        {activeTab === item.id && (
                            <motion.div 
                                layoutId="activeTab"
                                className="w-1 h-1 bg-primary rounded-full"
                            />
                        )}
                    </button>
                ))}
            </nav>
        </div>
    );
};

export default AdminLayout;

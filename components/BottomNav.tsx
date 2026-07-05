
import React from 'react';
import { FaHome, FaUsers, FaCalendarAlt, FaBook, FaCog } from 'react-icons/fa';

interface BottomNavProps {
    activePage: string;
    setActivePage: (page: string) => void;
}

const navItems = [
    { id: 'home', icon: FaHome, label: 'الرئيسية' },
    { id: 'students', icon: FaUsers, label: 'الطلاب' },
    { id: 'sessions', icon: FaCalendarAlt, label: 'الجلسات' },
    { id: 'records', icon: FaBook, label: 'السجل' },
    { id: 'settings', icon: FaCog, label: 'الإعدادات' },
];

const BottomNav: React.FC<BottomNavProps> = ({ activePage, setActivePage }) => {
    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-30">
            <div className="max-w-6xl mx-auto grid grid-cols-5">
                {navItems.map(item => (
                    <button
                        key={item.id}
                        id={`${item.id}-nav-button`}
                        onClick={() => setActivePage(item.id)}
                        className={`flex flex-col items-center justify-center p-2 text-sm transition-colors ${
                            activePage === item.id || (activePage === 'about' && item.id === 'settings')
                                ? 'text-primary dark:text-accent' 
                                : 'text-gray-500 dark:text-gray-400'
                        }`}
                    >
                        <item.icon className="text-xl mb-1" />
                        <span>{item.label}</span>
                    </button>
                ))}
            </div>
        </nav>
    );
};

export default BottomNav;

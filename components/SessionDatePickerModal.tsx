import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { FaTimes, FaChevronLeft, FaChevronRight } from 'react-icons/fa';

interface SessionDatePickerModalProps {
    isOpen: boolean;
    onClose: () => void;
    dates: string[];
    onSelectDate: (date: string) => void;
}

const modalVariants = {
  initial: { scale: 0.95, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  exit: { scale: 0.95, opacity: 0 },
};

const SessionDatePickerModal: React.FC<SessionDatePickerModalProps> = ({ isOpen, onClose, dates, onSelectDate }) => {
    
    const getTodayAtUTCMidnight = () => {
        const today = new Date();
        return new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
    };

    const [viewDate, setViewDate] = useState(getTodayAtUTCMidnight());
    const sessionDatesSet = useMemo(() => new Set(dates), [dates]);

    const calendarGrid = useMemo(() => {
        const year = viewDate.getUTCFullYear();
        const month = viewDate.getUTCMonth();

        const firstDayOfMonth = new Date(Date.UTC(year, month, 1));
        const lastDayOfMonth = new Date(Date.UTC(year, month + 1, 0));

        const daysInMonth = lastDayOfMonth.getUTCDate();
        const startDayOfWeek = (firstDayOfMonth.getUTCDay() + 1) % 7; // 0=Sat, 1=Sun...

        const grid = [];

        // Days from previous month
        const prevMonthLastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
        for (let i = startDayOfWeek - 1; i >= 0; i--) {
            const date = new Date(Date.UTC(year, month - 1, prevMonthLastDay - i));
            grid.push({
                day: prevMonthLastDay - i,
                date,
                isCurrentMonth: false,
            });
        }

        // Days of current month
        for (let i = 1; i <= daysInMonth; i++) {
            const date = new Date(Date.UTC(year, month, i));
            grid.push({
                day: i,
                date,
                isCurrentMonth: true,
            });
        }

        // Days from next month
        const remainingCells = 42 - grid.length; // 6 rows * 7 days
        for (let i = 1; i <= remainingCells; i++) {
            const date = new Date(Date.UTC(year, month + 1, i));
            grid.push({
                day: i,
                date,
                isCurrentMonth: false,
            });
        }
        
        return grid;
    }, [viewDate]);
    
    const handlePrevMonth = () => {
        setViewDate(current => new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth() - 1, 1)));
    };

    const handleNextMonth = () => {
        setViewDate(current => new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth() + 1, 1)));
    };
    
    const todayUTC = getTodayAtUTCMidnight();

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <motion.div 
                variants={modalVariants} 
                initial="initial" 
                animate="animate" 
                exit="exit" 
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md flex flex-col"
            >
                <header className="flex-shrink-0 flex items-center justify-between p-4 border-b dark:border-gray-700">
                    <button onClick={handlePrevMonth} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"><FaChevronRight /></button>
                    <h2 className="text-lg font-bold text-primary dark:text-accent">
                        {new Intl.DateTimeFormat('ar', { year: 'numeric', month: 'long', calendar: 'gregory', timeZone: 'UTC' }).format(viewDate)}
                    </h2>
                    <button onClick={handleNextMonth} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"><FaChevronLeft /></button>
                </header>

                <main className="p-3">
                    <div className="grid grid-cols-7 text-center text-xs text-gray-500 dark:text-gray-400 mb-2">
                        {['س', 'ح', 'ن', 'ث', 'ر', 'خ', 'ج'].map(day => <div key={day}>{day}</div>)}
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                        {calendarGrid.map(({ day, date, isCurrentMonth }, index) => {
                            const dateString = date.toISOString().split('T')[0];
                            const isToday = date.getTime() === todayUTC.getTime();
                            const hasSession = sessionDatesSet.has(dateString);

                            return (
                                <button 
                                    key={index}
                                    onClick={() => onSelectDate(dateString)}
                                    className={`relative aspect-square flex items-center justify-center rounded-full text-sm transition-colors
                                        ${!isCurrentMonth ? 'text-gray-300 dark:text-gray-600' : ''}
                                        ${isToday ? 'bg-primary text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}
                                    `}
                                >
                                    <span>{new Intl.NumberFormat('ar-EG').format(day)}</span>
                                    {hasSession && <div className="absolute bottom-1.5 w-1.5 h-1.5 bg-accent rounded-full"></div>}
                                </button>
                            );
                        })}
                    </div>
                </main>
                 <button onClick={onClose} className="p-3 bg-gray-100 dark:bg-gray-700/50 rounded-b-xl text-sm font-semibold">
                    إغلاق
                </button>
            </motion.div>
        </div>
    );
};

export default SessionDatePickerModal;

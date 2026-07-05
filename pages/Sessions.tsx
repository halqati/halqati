
import React, { useMemo, useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaPlus, FaEdit, FaTrash, FaShareAlt, FaWhatsapp, FaCheck, FaSearch, FaArrowUp } from 'react-icons/fa';
import { Session } from '../types';
import { formatDate } from '../utils/helpers';
import SessionDatePickerModal from '../components/SessionDatePickerModal';

interface SessionsProps {
    sessions: Session[];
    draftSession?: Session | null;
    onNew: () => void;
    onEdit: (id: number) => void;
    onDelete: (id: number) => void;
    onReport: (session: Session) => void;
    onNotify: (session: Session) => void;
    addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
    onShareSessionCode: (session: Session) => void;
    onImportSessionCode: () => void;
    currentUserUid?: string;
}

const NotifyButton: React.FC<{session: Session, onClick: () => void}> = ({ session, onClick }) => {
    const allNotified = useMemo(() => {
        const studentsWithPhones = session.students.filter(s => s.parentPhone);
        if (studentsWithPhones.length === 0) return false; // No one to notify
        return studentsWithPhones.every(s => session.parentNotifications[s.id]);
    }, [session]);

    return (
         <button onClick={onClick} className="relative z-0 text-yellow-500 hover:text-yellow-700" title="إعلام أولياء الأمور">
            <FaWhatsapp size={18} />
            {allNotified && (
                <div className="absolute -top-1 -right-1 bg-green-500 rounded-full w-3 h-3 flex items-center justify-center border border-white dark:border-gray-800">
                    <FaCheck className="text-white" size={8} />
                </div>
            )}
        </button>
    )
};

// Reusable Long Press Handler Hook
const useLongPress = (callback: () => void, ms = 3000) => {
    const timerRef = useRef<number | null>(null);

    const start = (e: React.PointerEvent) => {
        // Prevent default to stop scrolling interference if possible, 
        // though on touch devices scrolling is handled by browser. 
        // We generally don't preventDefault on touchstart for scrolling, 
        // but pointer down is okay.
        timerRef.current = window.setTimeout(() => {
            if(navigator.vibrate) navigator.vibrate(100);
            callback();
        }, ms);
    };

    const stop = () => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
    };

    return {
        onPointerDown: start,
        onPointerUp: stop,
        onPointerLeave: stop,
        onPointerCancel: stop, // Important for scrolling
    };
};


const Sessions: React.FC<SessionsProps> = ({ sessions, draftSession, onNew, onEdit, onDelete, onReport, onNotify, addToast, onShareSessionCode, onImportSessionCode, currentUserUid }) => {
    
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [highlightedDate, setHighlightedDate] = useState<string | null>(null);
    const [showScrollTop, setShowScrollTop] = useState(false);

    // New Session Long Press
    const newSessionLongPress = useLongPress(onImportSessionCode, 3000);

    const newestSessionId = useMemo(() => {
        if (sessions.length === 0) return null;
        
        const newestSession = sessions.reduce((latest, current) => 
            current.createdAt > latest.createdAt ? current : latest
        );

        // Animate only if created within the last 15 seconds to avoid re-animation on navigation.
        if (Date.now() - newestSession.createdAt < 15000) {
            return newestSession.id;
        }
        return null;
    }, [sessions]);

    const groupedSessions = useMemo(() => {
        return sessions.reduce((acc, session) => {
            const date = session.date;
            if (!acc[date]) {
                acc[date] = [];
            }
            acc[date].push(session);
            acc[date].sort((a, b) => b.createdAt - a.createdAt);
            return acc;
        }, {} as { [date: string]: Session[] });
    }, [sessions]);

    const sortedDates = useMemo(() => Object.keys(groupedSessions).sort((a,b) => new Date(b).getTime() - new Date(a).getTime()), [groupedSessions]);

    // Scroll detection logic
    useEffect(() => {
        const mainElement = document.querySelector('main');
        if (!mainElement) return;

        const handleScroll = () => {
            setShowScrollTop(mainElement.scrollTop > 300);
        };

        mainElement.addEventListener('scroll', handleScroll);
        return () => mainElement.removeEventListener('scroll', handleScroll);
    }, []);

    const handleDateSelect = (selectedDate: string) => {
        if (sortedDates.includes(selectedDate)) {
            const element = document.getElementById(`date-group-${selectedDate}`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                setHighlightedDate(selectedDate);
                setTimeout(() => setHighlightedDate(null), 1500);
            }
        } else {
            addToast('لا توجد جلسة في هذا اليوم.', 'info');
        }
        setIsDatePickerOpen(false);
    };

    const handleScrollToTop = () => {
        const mainElement = document.querySelector('main');
        if (mainElement) {
            mainElement.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    // Only check the NEW session draft (draftSession), ignore drafts for existing sessions here
    const hasDraftForNewSession = useMemo(() => {
        return !!draftSession;
    }, [draftSession]);

    return (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow relative min-h-[calc(100vh-160px)]">
            <div className="flex justify-between items-center mb-4 sticky top-0 bg-white dark:bg-gray-800 z-20 py-2 border-b dark:border-gray-700">
                <h2 className="text-xl font-bold text-primary dark:text-accent">الجلسات ({sessions.length})</h2>
                <div className="flex items-center gap-2">
                    {sessions.length > 5 && (
                        <button
                            onClick={() => setIsDatePickerOpen(true)}
                            className="p-2 text-gray-500 dark:text-gray-400 opacity-20 hover:opacity-100 transition-all duration-300"
                            aria-label="بحث عن تاريخ"
                            title="بحث عن تاريخ"
                        >
                            <FaSearch size={18} />
                        </button>
                    )}
                    <button 
                        onClick={onNew} 
                        {...newSessionLongPress}
                        className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 active:scale-95 transition-transform select-none"
                    >
                        <FaPlus /> {hasDraftForNewSession ? "إكمال الجلسة" : "جلسة جديدة"}
                    </button>
                </div>
            </div>
            <div className="space-y-4">
                {sessions.length === 0 && <p className="text-center text-gray-500 py-8">لا توجد جلسات مسجلة بعد.</p>}
                {sortedDates.map(date => (
                    <div key={date} className={highlightedDate === date ? 'highlight-session rounded-lg' : ''}>
                        <h3 id={`date-group-${date}`} className="font-bold text-lg p-2 bg-gray-100 dark:bg-gray-700 rounded-md my-2 sticky top-14 z-10 shadow-sm">{formatDate(date)}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {groupedSessions[date].map(session => {
                            const isNewest = session.id === newestSessionId;
                            // Creating the Share Button with Long Press logic directly inside the map
                            // We use a wrapper component or direct logic to capture the specific session
                            const ShareButton = () => {
                                const timerRef = useRef<number | null>(null);
                                const handleDown = (e: React.PointerEvent) => {
                                    timerRef.current = window.setTimeout(() => {
                                        if(navigator.vibrate) navigator.vibrate(100);
                                        onShareSessionCode(session);
                                    }, 3000);
                                };
                                const handleUp = () => {
                                    if(timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
                                };
                                return (
                                    <button 
                                        onClick={() => onReport(session)} 
                                        onPointerDown={handleDown}
                                        onPointerUp={handleUp}
                                        onPointerLeave={handleUp}
                                        onPointerCancel={handleUp}
                                        className="text-green-500 hover:text-green-700 active:scale-90 transition-transform select-none" 
                                        title="تقرير جماعي (اضغط مطولاً للمشاركة)"
                                    >
                                        <FaShareAlt size={18} />
                                    </button>
                                );
                            };

                            return (
                                <div
                                    key={session.id}
                                    className={`p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg transition-all duration-500 ${isNewest ? 'new-session-highlight' : ''}`}
                                >
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <p className="font-bold">{session.isLesson ? "درس الساعة:" : "جلسة الساعة:"} {session.time}</p>
                                            <div className="flex items-center gap-1 mt-0.5 min-w-0">
                                                <p className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">عدد الطلاب: {session.students.length}</p>
                                                {session.createdBy && session.creatorUid !== currentUserUid && (
                                                    // Also hide if name matches and UID is missing (legacy)
                                                    // We'll use a conservative approach: if we have a UID, trust it.
                                                    // If we don't have a creatorUid, we show the name.
                                                    <div className="flex items-center gap-1 text-[8px] text-gray-400 dark:text-gray-500 opacity-40 min-w-0">
                                                        <span className="flex-shrink-0">•</span>
                                                        <p className="truncate" title={session.createdBy}>
                                                            أ/ {session.createdBy.split(/\s+/).slice(0, 2).join(' ')}{session.createdBy.split(/\s+/).length > 2 ? '...' : ''}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex gap-3">
                                            <NotifyButton session={session} onClick={() => onNotify(session)} />
                                            <ShareButton />
                                            <button onClick={() => onEdit(session.id)} className="text-blue-500 hover:text-blue-700" title="تعديل"><FaEdit size={18} /></button>
                                            <button onClick={() => onDelete(session.id)} className="text-red-500 hover:text-red-700" title="حذف"><FaTrash size={18} /></button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        </div>
                    </div>
                ))}
            </div>
            <AnimatePresence>
                {isDatePickerOpen && (
                    <SessionDatePickerModal
                        isOpen={isDatePickerOpen}
                        onClose={() => setIsDatePickerOpen(false)}
                        dates={sortedDates}
                        onSelectDate={handleDateSelect}
                    />
                )}
                {showScrollTop && (
                    <motion.div
                        initial={{ y: 50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 50, opacity: 0 }}
                        className="fixed bottom-20 left-4 z-30"
                    >
                        <button
                            onClick={handleScrollToTop}
                            className="w-10 h-10 flex items-center justify-center bg-gray-500/30 backdrop-blur-sm text-white rounded-full shadow-sm opacity-30 hover:opacity-100 transition-all duration-300"
                            aria-label="الرجوع إلى الأعلى"
                            title="الرجوع إلى الأعلى"
                        >
                            <FaArrowUp />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Sessions;

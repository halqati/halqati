
import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Student, Session, PointsSettings, PointHistoryEntry } from '../types';
import { FaTimes, FaUserEdit, FaCalendarCheck, FaChalkboardTeacher, FaCog, FaGift, FaExclamationTriangle, FaPen, FaExclamationCircle, FaRedo } from 'react-icons/fa';
import { formatDate, calculatePointsForSession, formatDateTime } from '../utils/helpers';
import AuditHistoryModal from './AuditHistoryModal';

interface StudentPointsLogModalProps {
    student: Student;
    sessions: Session[];
    pointsSettings: PointsSettings;
    onClose: () => void;
    onOpenAdjuster: (currentPoints: number) => void;
    onDismissResetAlert?: (studentId: number) => void;
}

const modalVariants = {
    initial: { y: '100%' },
    animate: { y: 0 },
    exit: { y: '100%' },
};

const StudentPointsLogModal: React.FC<StudentPointsLogModalProps> = ({ student, sessions, pointsSettings, onClose, onOpenAdjuster, onDismissResetAlert }) => {
    const [auditHistory, setAuditHistory] = useState<PointHistoryEntry[] | null>(null);

    const pointHistory = useMemo(() => {
        const history: { 
            timestamp: number, 
            dateStr: string, // Store date string separately
            displayDate: string,
            points: number, 
            reason: string, 
            subReason?: string, 
            icon: React.ElementType, 
            isLesson: boolean, 
            snapshot?: PointsSettings,
            isReward?: boolean,
            originalAmount?: number,
            updatedAt?: number,
            history?: PointHistoryEntry[]
        }[] = [];

        const resetTime = student.lastPointResetDate ? new Date(student.lastPointResetDate).getTime() : 0;

        // From sessions
        sessions.forEach(session => {
            // Filter out sessions before reset
            if (session.createdAt <= resetTime) return;

            const studentData = session.students.find(s => s.id === student.id);
            if (studentData) {
                const sessionPoints = calculatePointsForSession(studentData, pointsSettings, session.isLesson, session);
                if (sessionPoints !== 0 || studentData.attendance === 'absent' || session.isLesson) { 
                    
                    let reason = session.isLesson ? 'جلسة درس' : 'جلسة تسميع';
                    let subReason = '';

                    if (session.isLesson) {
                        if (session.lessonTitle) subReason = session.lessonTitle;
                        else if (session.lessonType) subReason = session.lessonType;
                    }

                    // For sessions, we construct a rough timestamp if needed, but display using formatDate
                    // We use session.createdAt for sorting
                    const display = `${formatDate(session.date)} (${session.time})`;

                    history.push({
                        timestamp: session.createdAt, 
                        dateStr: session.date,
                        displayDate: display,
                        points: sessionPoints,
                        reason: reason,
                        subReason: subReason,
                        icon: session.isLesson ? FaChalkboardTeacher : FaCalendarCheck,
                        isLesson: session.isLesson,
                        snapshot: session.pointsSettingsSnapshot
                    });
                }
            }
        });

        // From manual adjustments / rewards
        (student.manualPoints || []).forEach(adj => {
            // Filter out adjustments before reset
            if (new Date(adj.date).getTime() <= resetTime) return;

            const isDeduct = adj.amount < 0;
            const mainLabel = isDeduct ? 'خصم' : 'منح';
            
            history.push({
                timestamp: adj.id, 
                dateStr: adj.date,
                displayDate: formatDateTime(adj.date),
                points: adj.amount,
                reason: adj.rewardId ? mainLabel : (isDeduct ? 'خصم يدوي' : 'إضافة يدوي'),
                subReason: adj.reason,
                icon: adj.rewardId ? FaGift : FaUserEdit,
                isLesson: false,
                snapshot: undefined,
                isReward: !!adj.rewardId,
                originalAmount: adj.originalAmount,
                updatedAt: adj.updatedAt,
                history: adj.history
            });
        });
        
        // Sort Chronologically (Newest Timestamp to Oldest)
        return history.sort((a, b) => b.timestamp - a.timestamp);
    }, [student, sessions, pointsSettings]);

    const totalPoints = useMemo(() => pointHistory.reduce((sum, item) => sum + item.points, 0), [pointHistory]);

    // Helper to compare snapshots roughly
    const areSettingsDifferent = (s1?: PointsSettings, s2?: PointsSettings) => {
        if (!s1 || !s2) return false;
        return JSON.stringify(s1) !== JSON.stringify(s2);
    };

    const handleDismissAlert = () => {
        if (onDismissResetAlert) {
            onDismissResetAlert(student.id);
        }
    };

    return (
        <motion.div
            variants={modalVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed inset-0 bg-gray-50 dark:bg-gray-900 z-[210] flex flex-col p-4 max-w-md mx-auto"
        >
            <header className="flex-shrink-0 flex items-center justify-between mb-4 pb-4 border-b dark:border-gray-700">
                <div>
                    <h2 className="text-xl font-bold text-primary dark:text-accent">سجل نقاط {student.name}</h2>
                    <p className="text-sm font-bold">المجموع: {totalPoints} نقطة</p>
                </div>
                 <div className="flex-shrink-0 flex items-center gap-4">
                    <button onClick={() => onOpenAdjuster(totalPoints)} className="text-sm bg-blue-500 text-white px-3 py-1.5 rounded-lg flex items-center gap-2">
                        <FaUserEdit /> إضافة يدوي
                    </button>
                    <button onClick={onClose}><FaTimes size={20} /></button>
                </div>
            </header>

            <main className="flex-grow overflow-y-auto space-y-2 pr-2">
                {pointHistory.length > 0 ? pointHistory.map((item, index) => {
                    // Check for settings change separation
                    let showSeparator = false;
                    
                    if (index > 0) {
                        const newerItem = pointHistory[index - 1];
                        if (item.snapshot && newerItem.snapshot && areSettingsDifferent(item.snapshot, newerItem.snapshot)) {
                            showSeparator = true;
                        }
                    }

                    const isCapped = item.originalAmount !== undefined && item.originalAmount !== item.points;

                    return (
                        <React.Fragment key={item.timestamp}>
                             {showSeparator && (
                                <div className="flex items-center gap-2 my-3 justify-center">
                                    <div className="w-10 h-[1px] bg-gray-300 dark:bg-gray-600"></div>
                                    <div className="flex items-center gap-1 text-[10px] text-gray-400 dark:text-gray-500 px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded-full border border-gray-200 dark:border-gray-700">
                                        <FaCog size={10} /> تم تعديل نظام النقاط
                                    </div>
                                    <div className="w-10 h-[1px] bg-gray-300 dark:bg-gray-600"></div>
                                </div>
                            )}
                            <div className="flex items-center gap-4 relative">
                                {/* Timeline line */}
                                <div className="absolute top-5 left-[13px] w-0.5 h-full bg-gray-200 dark:bg-gray-700 -z-10"></div>
                                
                                <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center z-10 ${item.isReward ? 'bg-purple-100 dark:bg-purple-900' : item.isLesson ? 'bg-blue-100 dark:bg-blue-900' : 'bg-gray-100 dark:bg-gray-700'}`}>
                                    <item.icon className={`text-sm ${item.isReward ? 'text-purple-500' : item.isLesson ? 'text-blue-500' : 'text-gray-500'}`} />
                                </div>

                                <div className="flex-grow bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="font-semibold text-sm">{item.reason}</p>
                                                {item.updatedAt && (
                                                    <button onClick={() => setAuditHistory(item.history || [])} className="text-yellow-500 hover:text-yellow-600 transition-colors" title="عرض سجل التعديلات">
                                                        <FaExclamationCircle size={14} />
                                                    </button>
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-2">
                                                {item.displayDate}
                                            </p>
                                            {item.subReason && <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 font-medium">{item.subReason}</p>}
                                            
                                            {isCapped && item.originalAmount !== undefined && (
                                                <div className="mt-1 text-[10px] text-orange-600 dark:text-orange-400 flex items-start gap-1 bg-orange-50 dark:bg-orange-900/10 p-1 rounded">
                                                    <FaExclamationTriangle size={10} className="mt-0.5 flex-shrink-0" />
                                                    <p>تم خصم {Math.abs(item.points)} نقطة فقط، لأن الرصيد لا يسمح بخصم {Math.abs(item.originalAmount)}.</p>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className={`font-bold text-lg ltr ${item.points > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                {item.points > 0 ? `+${item.points}` : item.points}
                                            </span>
                                        </div>
                                    </div>
                                    {item.updatedAt && (
                                        <div className="flex items-center gap-1 mt-1">
                                            <span className="text-[9px] bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400 px-1.5 rounded flex items-center gap-1">
                                                <FaPen size={8} /> معدل: {formatDateTime(item.updatedAt)}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </React.Fragment>
                    );
                }) : (
                    <p className="text-center text-gray-500 py-10">لا يوجد سجل نقاط جديد.</p>
                )}

                <AnimatePresence>
                    {student.lastPointResetDate && !student.pointResetAlertDismissed && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            drag="x"
                            dragConstraints={{ left: 0, right: 0 }}
                            onDragEnd={(e, { offset, velocity }) => {
                                if (offset.x > 100 || velocity.x > 500) {
                                    handleDismissAlert();
                                }
                            }}
                            className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-lg p-3 mt-4 flex items-center justify-between shadow-sm cursor-grab active:cursor-grabbing"
                        >
                            <div className="flex items-center gap-3">
                                <div className="bg-yellow-100 dark:bg-yellow-800 p-2 rounded-full text-yellow-600 dark:text-yellow-300">
                                    <FaRedo size={14} />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-yellow-800 dark:text-yellow-200">تم تصفير النقاط</p>
                                    <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-0.5">
                                        بتاريخ: {formatDateTime(student.lastPointResetDate)}
                                    </p>
                                </div>
                            </div>
                            <button onClick={handleDismissAlert} className="text-yellow-500 hover:text-yellow-700 dark:hover:text-yellow-300 p-1">
                                <FaTimes />
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>
            
            {auditHistory && (
                <AuditHistoryModal history={auditHistory} onClose={() => setAuditHistory(null)} />
            )}
        </motion.div>
    );
};

export default StudentPointsLogModal;
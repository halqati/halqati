
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CircleData, SessionStudent, Notification, Student, PointsSettings, ConfirmationModalData, Broadcast, TeacherPermissions } from '../types';
import { INSPIRATIONAL_TIPS, WELCOME_TIP } from '../constants';
import { FaCalendarAlt, FaChartBar, FaUsers, FaExclamationTriangle, FaTrophy, FaCopy, FaWhatsapp, FaChevronDown, FaTrash, FaBullhorn, FaCheck, FaTimes, FaUserAlt } from 'react-icons/fa';
import StudentAvatar from '../components/StudentAvatar';
import HomeDashboard from '../components/HomeDashboard';
import { db, collection, query, where, onSnapshot } from '../firebase';

interface HomeProps {
    data: CircleData;
    onNavigate: (page: string) => void;
    onDeleteNotification: (id: string) => void;
    onStatClick: (title: string, students: any[], suspendedStudents?: any[]) => void;
    onOpenStats: () => void;
    setData: (updater: (draft: CircleData) => CircleData) => void;
    onAutoDismissNotification: (id: string) => void;
    addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
    onViewProfile: (studentId: number) => void;
    onUpdateSupervisor?: (uid: string, updates: Partial<TeacherPermissions>) => void;
    setConfirmationModal: (data: Omit<ConfirmationModalData, 'isOpen'> & { isOpen: boolean }) => void;
}

const defaultPointsSettings: PointsSettings = {
    present: 1,
    late: 1,
    absent: 0,
    excused: 1,
    hasMemorization: 1,
    noMemorization: 0,
    suspendedMemorization: 1,
    hasReview: 1,
    noReview: 0,
    suspendedReview: 1,
    khatimBonus: 3,
    khatimRecitesAttendance: 1,
    khatimRecitesHasReview: 2,
    khatimNoRecitesAttendanceBonus: 3,
    lessonPresent: 3,
    lessonLate: 3,
    lessonExcused: 3,
};

const StatPill: React.FC<{label: string, value: number, onClick?: () => void, disabled?: boolean}> = ({ label, value, onClick, disabled }) => (
    <button onClick={onClick} disabled={disabled || value === 0} className={`p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50 ${disabled || value === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors'}`}>
        <p className="font-bold text-lg text-primary dark:text-accent">{value}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
    </button>
);

const ActionButton: React.FC<{icon: React.ElementType, title: string, onClick: () => void, id?: string}> = ({ icon: Icon, title, onClick, id }) => (
    <button id={id} onClick={onClick} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow text-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-all transform hover:scale-105">
        <Icon className="text-3xl text-primary dark:text-accent mx-auto mb-2" />
        <span className="font-semibold">{title}</span>
    </button>
);

interface StudentListCardProps {
    title: string;
    icon: React.ElementType;
    iconColor: string;
    students: ({id: number, name: string, detail: string, photo?: string})[];
    onViewMore: (title: string, students: any[]) => void;
}

const StudentListCard: React.FC<StudentListCardProps> = ({ title, icon: Icon, iconColor, students, onViewMore }) => {
    const displayedStudents = students.slice(0, 3);
    const hasMore = students.length > 3;

    return (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <h2 className={`font-bold mb-3 flex items-center gap-2 ${iconColor}`}>
                <Icon />{title}
            </h2>
            {students.length === 0 ? (
                <p className="text-sm text-center text-gray-400 py-3">لا يوجد طلاب</p>
            ) : (
                <ul className="space-y-3">
                    {displayedStudents.map((s, index) => (
                        <li key={`${s.id}-${index}`} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded-md">
                            <div className="flex items-center gap-3">
                                <StudentAvatar photo={s.photo} name={s.name} id={s.id} className="w-8 h-8 rounded-full object-cover" />
                                <span className="font-semibold text-sm">{s.name}</span>
                            </div>
                            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">{s.detail}</span>
                        </li>
                    ))}
                </ul>
            )}
            {hasMore && (
                <button
                    onClick={() => onViewMore(title, students)}
                    className="w-full mt-3 text-center text-sm text-primary dark:text-accent font-semibold hover:underline"
                >
                    عرض المزيد ({students.length - 3}+)
                </button>
            )}
        </div>
    );
};

const tipVariants = { initial: {opacity: 0}, animate: {opacity: 1}, exit: {opacity: 0} };
const notificationVariants = { initial: { opacity: 0, height: 0 }, animate: { opacity: 1, height: "auto" }, exit: { x: '100%', opacity: 0, transition: { duration: 0.2 } }};

const notificationColors: Record<Notification['type'], string> = {
    warning: 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700',
    danger: 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300 border-red-300 dark:border-red-700',
    info: 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-700',
    success: 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300 border-green-300 dark:border-green-700',
    special: 'bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-700',
    special_white: 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-primary dark:border-accent shadow-md',
    seasonal: 'bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 border-amber-400 dark:border-amber-600 shadow-sm',
    update: 'bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-700',
    maintenance: 'bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700',
    announcement: 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700',
    alert: 'bg-sky-100 dark:bg-sky-900/50 text-sky-800 dark:text-sky-300 border-sky-300 dark:border-sky-700',
    note: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 border-gray-300 dark:border-gray-700',
};


const Home: React.FC<HomeProps> = ({ data, onNavigate, onDeleteNotification, onStatClick, onOpenStats, setData, onAutoDismissNotification, addToast, onViewProfile, onUpdateSupervisor, setConfirmationModal }) => {
    const [showAllNotifications, setShowAllNotifications] = useState(false);
    const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
    const tipRef = React.useRef<string[]>([]);
    const [currentTip, setCurrentTip] = useState('');

    useEffect(() => {
        if (!data.managementId) return;

        const q = query(collection(db, 'broadcasts'), where('managementId', '==', data.managementId));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setBroadcasts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Broadcast)).sort((a, b) => b.createdAt - a.createdAt));
        });

        return () => unsubscribe();
    }, [data.managementId]);

    const getNextTip = useCallback(() => {
        if (tipRef.current.length === 0) {
            tipRef.current = [...INSPIRATIONAL_TIPS].sort(() => Math.random() - 0.5);
            const now = Date.now();
            const ONE_WEEK_MS = 10080 * 60 * 1000;
            if (now - data.lastWelcomeTipShow > ONE_WEEK_MS) {
                setData(d => ({ ...d, lastWelcomeTipShow: now }));
                tipRef.current.unshift(WELCOME_TIP);
            }
        }
        return tipRef.current.shift() || WELCOME_TIP;
    }, [data.lastWelcomeTipShow, setData]);

    useEffect(() => {
        setCurrentTip(getNextTip());
        const interval = window.setInterval(() => {
            setCurrentTip(getNextTip());
        }, 18000);
        return () => window.clearInterval(interval);
    }, [getNextTip]);
    
    useEffect(() => {
        const timers = new Map<string, number>();

        (data.notifications || []).forEach(n => {
            if (timers.has(n.id)) return;

            let delay = 0;
            if (n.id.startsWith('initial_welcome_')) {
                delay = 60000; // 1 minute
            } else if (n.type === 'special' || n.type === 'special_white') {
                 if (n.id === 'feedback_request') {
                    delay = 0; 
                 } else {
                    delay = 10000;
                 }
            }

            if (delay > 0) {
                const timer = window.setTimeout(() => {
                    onAutoDismissNotification(n.id);
                    timers.delete(n.id);
                }, delay);
                timers.set(n.id, timer);
            }
        });

        return () => {
            for (const timer of timers.values()) {
                window.clearTimeout(timer);
            }
        };
    }, [data.notifications, onAutoDismissNotification]);

    const latestSession = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];
        const todaySessions = data.sessions.filter(s => s.date === today).sort((a,b) => b.createdAt - a.createdAt);
        if (todaySessions.length > 0) return todaySessions[0];
        return null;
    }, [data.sessions]);
    
    // Helper to get strict status string
    const getStudentDetail = useCallback((student: SessionStudent, isLesson: boolean) => {
        const isFemale = student.gender === 'female';
        
        if (student.attendance === 'absent') return isFemale ? 'غائبة' : 'غائب';
        if (student.attendance === 'excused') return `مستأذن${isFemale ? 'ة' : ''} (${student.excuse || 'لا يوجد سبب'})`;
    
        if (isLesson) {
            return student.attendance === 'late' 
                ? (isFemale ? 'تأخرت عن الدرس' : 'تأخر عن الدرس') 
                : (isFemale ? 'حضرت الدرس' : 'حضر الدرس');
        }
        
        if (student.isKhatim) {
            if (student.khatimRecitesReview) {
                if (student.review?.hasReview) return isFemale ? 'راجعت' : 'راجع';
                return isFemale ? 'لم تراجع' : 'لم يراجع';
            }
            return isFemale ? 'خاتمة (حضور فقط)' : 'خاتم (حضور فقط)';
        }

        const hasMemo = student.memorization?.hasMemorization;
        const hasRev = student.review?.hasReview;
        const suspendedMemo = student.suspendedMemorization;
        const suspendedRev = student.suspendedReview;
    
        if (suspendedMemo && suspendedRev) return isFemale ? "موقوفة" : "موقوف";
    
        // Performance Strings
        if (hasMemo && hasRev) return isFemale ? "حفظت وراجعت" : "حفظ وراجع";
        if (hasMemo && !hasRev) return isFemale ? "حفظت فقط" : "حفظ فقط";
        if (!hasMemo && hasRev) return isFemale ? "راجعت فقط" : "راجع فقط";
        
        // Negative Status
        if (suspendedMemo && !hasRev) return isFemale ? "لم تراجع (حفظ موقوف)" : "لم يراجع (حفظ موقوف)";
        if (suspendedRev && !hasMemo) return isFemale ? "لم تحفظ (مراجعة موقوفة)" : "لم يحفظ (مراجعة موقوفة)";
        
        return isFemale ? "لم تحفظ ولم تراجع" : "لم يحفظ ولم يراجع";
    }, []);

    const stats = useMemo(() => {
        if (!latestSession) return null;
        const isLesson = latestSession.isLesson;
        const presentStudents = latestSession.students.filter(s => s.attendance === 'present' || s.attendance === 'late');
        const absentStudents = latestSession.students.filter(s => s.attendance === 'absent');
        const excusedStudents = latestSession.students.filter(s => s.attendance === 'excused');

        if (isLesson) {
             return {
                stats: { present: presentStudents, heard: [], notHeard: [], absent: absentStudents, excused: excusedStudents, suspended: [] },
                isLesson: true,
                excellentStudents: presentStudents.map(s => ({...s, detail: getStudentDetail(s, true)})),
                underperformingStudents: absentStudents.map(s => ({...s, detail: getStudentDetail(s, true)})),
            }
        }

        const heardStudents = presentStudents.filter(s => s.memorization?.hasMemorization || s.review?.hasReview);
        const notHeardStudents = presentStudents.filter(s => {
            if (s.isKhatim && !s.khatimRecitesReview) return false;
            
            const missedMemo = !s.suspendedMemorization && !s.memorization?.hasMemorization && !s.isKhatim;
            const missedReview = !s.suspendedReview && !s.review?.hasReview;
            
            if (s.suspendedMemorization && s.suspendedReview) return false;
            return missedMemo || missedReview;
        });
        
        const suspendedStudents = presentStudents.filter(s => s.suspendedMemorization && s.suspendedReview);

        // Logic for Excellent and Underperforming Lists
        const excellentList: any[] = [];
        const underperformingList: any[] = [];

        // Process Absent Students (Always Underperforming)
        absentStudents.forEach(s => {
            underperformingList.push({ ...s, detail: s.gender === 'female' ? 'غائبة' : 'غائب' });
        });

        // Process Present Students
        presentStudents.forEach(s => {
            const isFemale = s.gender === 'female';
            
            // KHATIM LOGIC
            if (s.isKhatim) {
                if (s.khatimRecitesReview) {
                    if (s.review?.hasReview) {
                        excellentList.push({ ...s, detail: isFemale ? 'راجعت' : 'راجع' });
                    } else {
                        underperformingList.push({ ...s, detail: isFemale ? 'لم تراجع' : 'لم يراجع' });
                    }
                } else {
                    excellentList.push({ ...s, detail: isFemale ? 'خاتمة (حضور)' : 'خاتم (حضور)' });
                }
                return;
            }

            // REGULAR STUDENT LOGIC
            const hasMemo = s.memorization?.hasMemorization;
            const hasRev = s.review?.hasReview;
            const suspMemo = s.suspendedMemorization;
            const suspRev = s.suspendedReview;

            // Excellent Logic
            if (hasMemo && hasRev) {
                excellentList.push({ ...s, detail: isFemale ? 'حفظت وراجعت' : 'حفظ وراجع' });
            } else if (hasMemo) {
                excellentList.push({ ...s, detail: isFemale ? 'حفظت فقط' : 'حفظ فقط' });
            } else if (hasRev) {
                excellentList.push({ ...s, detail: isFemale ? 'راجعت فقط' : 'راجع فقط' });
            } else if (suspMemo && suspRev) {
                excellentList.push({ ...s, detail: isFemale ? 'موقوفة' : 'موقوف' });
            }

            // Underperforming Logic
            if (!suspMemo && !hasMemo && !suspRev && !hasRev) {
                underperformingList.push({ ...s, detail: isFemale ? 'لم تحفظ ولم تراجع' : 'لم يحفظ ولم يراجع' });
            } else {
                if (!suspMemo && !hasMemo) {
                    underperformingList.push({ ...s, detail: isFemale ? 'لم تحفظ' : 'لم يحفظ' });
                }
                if (!suspRev && !hasRev) {
                    underperformingList.push({ ...s, detail: isFemale ? 'لم تراجع' : 'لم يراجع' });
                }
            }
        });

        const statsData = { present: presentStudents, heard: heardStudents, notHeard: notHeardStudents, absent: absentStudents, excused: excusedStudents, suspended: suspendedStudents };

        return { 
            stats: statsData, 
            isLesson: false, 
            excellentStudents: excellentList, 
            underperformingStudents: underperformingList 
        };
    }, [latestSession, getStudentDetail]);
    
    const showExcellent = stats && stats.excellentStudents.length > 0;
    const showUnderperforming = stats && stats.underperformingStudents.length > 0;

    const handleCopyTip = () => {
        navigator.clipboard.writeText(currentTip);
        addToast('تم النسخ إلى الحافظة', 'info');
    };

    const handleClearAllNotifications = () => {
        setConfirmationModal({
            isOpen: true,
            title: 'حذف جميع الإشعارات',
            message: 'هل أنت متأكد من حذف جميع الإشعارات؟',
            onConfirm: () => {
                // We update dismissed IDs AND clear the notifications array immediately for visual feedback
                setData(d => ({ 
                    ...d, 
                    notifications: [],
                    dismissedNotificationIds: [...(d.dismissedNotificationIds || []), ...(data.notifications || []).map(n => n.id)] 
                }));
                addToast('تم حذف جميع الإشعارات', 'success');
                setConfirmationModal({ isOpen: false, title: '', message: '', onConfirm: () => {} });
            }
        });
    };
    
    const filteredNotifications = useMemo(() => {
        let list = (data.notifications || []).filter(n => 
            n.category !== 'system' && 
            n.category !== 'management' && 
            n.metadata?.actionType !== 'join_request' &&
            !n.id.startsWith('status_') && 
            !n.id.startsWith('level_') && 
            !n.id.startsWith('approved_') &&
            !n.id.startsWith('approval_') &&
            !(data.dismissedNotificationIds || []).includes(n.id)
        );
        return list;
    }, [data.notifications, data.dismissedNotificationIds]);

    const notificationsToShow = showAllNotifications ? filteredNotifications : filteredNotifications.slice(0, 5);
    const hasMoreNotifications = filteredNotifications.length > 5;

    return (
        <div className="space-y-4">
            <div className="bg-primary-light/20 dark:bg-primary-dark/50 p-4 rounded-lg text-center overflow-hidden relative h-28 flex items-center justify-center">
                 <AnimatePresence mode="wait">
                    <motion.p
                        key={currentTip}
                        variants={tipVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        transition={{ duration: 0.7 }}
                        className="text-primary dark:text-accent font-medium absolute px-2"
                    >
                        {currentTip}
                    </motion.p>
                </AnimatePresence>
                <button
                    onClick={handleCopyTip}
                    className="absolute bottom-2 left-2 bg-black/10 text-white/50 p-2 rounded-full opacity-50 hover:opacity-100 transition-opacity"
                    aria-label="نسخ النصيحة"
                    title="نسخ النصيحة"
                >
                    <FaCopy />
                </button>
            </div>

            <div className="grid grid-cols-3 gap-4">
                <ActionButton id="students-action-button" icon={FaUsers} title="الطلاب" onClick={() => onNavigate('students')} />
                <ActionButton id="sessions-action-button" icon={FaCalendarAlt} title="الجلسات" onClick={() => onNavigate('sessions')} />
                <ActionButton id="stats-action-button" icon={FaChartBar} title="الإحصائيات" onClick={onOpenStats} />
            </div>

            {/* Management Broadcasts */}
            {broadcasts.length > 0 && (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-900/30">
                    <h3 className="font-bold text-blue-800 dark:text-blue-300 flex items-center gap-2 mb-3">
                        <FaBullhorn /> رسائل الإدارة
                    </h3>
                    <div className="space-y-3">
                        {broadcasts.slice(0, 2).map(broadcast => (
                            <div key={broadcast.id} className="bg-white dark:bg-gray-800 p-3 rounded-md shadow-sm">
                                <h4 className="font-bold text-sm text-gray-800 dark:text-gray-200">{broadcast.title}</h4>
                                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{broadcast.content}</p>
                                <span className="text-[9px] text-gray-400 mt-2 block">{new Date(broadcast.createdAt).toLocaleDateString('ar-SA')}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Show Dashboard if no session today OR if setting is enabled */}
            {(!latestSession || data.settings.alwaysShowDashboard) && (
                <HomeDashboard
                    students={data.students as Student[]}
                    sessions={data.sessions}
                    studyStartDate={data.studyStartDate}
                    settings={data.settings}
                    pointsSettings={data.settings?.pointsSettings || defaultPointsSettings}
                    onViewProfile={onViewProfile}
                />
            )}

            {/* Show Daily Stats if session exists (Standard behavior) */}
            {latestSession && (
                <>
                    {stats && (
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                            <div className="text-center mb-3">
                                <h2 className="font-bold text-primary dark:text-accent">{stats.isLesson ? 'إحصائيات الدرس' : 'إحصائيات اليوم'}</h2>
                                <p className="text-xs text-gray-400 dark:text-gray-500 opacity-75">لآخر جلسة</p>
                            </div>
                            <div className="grid grid-cols-5 gap-2 text-center">
                                <StatPill label="الحضور" value={stats.stats.present.length} onClick={() => onStatClick('الحضور', stats.stats.present.map(s => ({...s, detail: getStudentDetail(s, !!stats?.isLesson)})))} />
                                <StatPill label="سمعوا" value={stats.isLesson ? 0 : stats.stats.heard.length} onClick={stats.isLesson ? undefined : () => onStatClick('الذين سمعوا', stats.stats.heard.map(s => ({...s, detail: getStudentDetail(s, false)})))} disabled={stats.isLesson} />
                                <StatPill label="لم يسمعوا" value={stats.isLesson ? 0 : stats.stats.notHeard.length} onClick={stats.isLesson ? undefined : () => onStatClick('الذين لم يسمعوا', stats.stats.notHeard.map(s => ({...s, detail: getStudentDetail(s, false)})), stats.stats.suspended)} disabled={stats.isLesson} />
                                <StatPill label="الغياب" value={stats.stats.absent.length} onClick={() => onStatClick('الغياب', stats.stats.absent.map(s => ({...s, detail: getStudentDetail(s, !!stats?.isLesson)})))} />
                                <StatPill label="استئذان" value={stats.stats.excused.length} onClick={() => onStatClick('المستأذنين', stats.stats.excused.map(s => ({...s, detail: getStudentDetail(s, !!stats?.isLesson)})))} />
                            </div>
                        </div>
                    )}

                    {(showExcellent || showUnderperforming) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {showExcellent && (
                                <StudentListCard 
                                    title={stats.isLesson ? "الطلاب الحاضرون" : "الطلاب المتفوقون اليوم"}
                                    icon={FaTrophy}
                                    iconColor="text-yellow-500"
                                    students={stats.excellentStudents}
                                    onViewMore={onStatClick}
                                />
                            )}
                            {showUnderperforming && (
                                <StudentListCard 
                                    title={stats.isLesson ? "الطلاب الغائبون" : "الطلاب المقصرون اليوم"}
                                    icon={FaExclamationTriangle}
                                    iconColor="text-red-500"
                                    students={stats.underperformingStudents}
                                    onViewMore={onStatClick}
                                />
                            )}
                        </div>
                    )}
                </>
            )}
            
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow relative overflow-hidden">
                 <div className="flex justify-between items-center mb-2">
                     <h2 className="font-bold text-primary dark:text-accent">آخر الإشعارات</h2>
                 </div>
                 <div className="space-y-2">
                    {(data.notifications || []).length > 0 ? (
                        <AnimatePresence initial={false} mode="popLayout">
                        {notificationsToShow.map((n, index) => (
                            <motion.div 
                              key={`${n.id}-${n.createdAt}-${index}`}
                              layout
                              variants={notificationVariants}
                              initial="initial"
                              animate="animate"
                              exit="exit"
                              drag="x"
                              dragConstraints={{left: 0, right: 0}}
                              dragElastic={0.2}
                              dragSnapToOrigin={true}
                              onDragEnd={(e, { offset, velocity }) => {
                                if (offset.x > 100 || velocity.x > 500) { 
                                    onDeleteNotification(n.id); 
                                }
                              }}
                              className={`text-sm p-3 rounded-md overflow-hidden cursor-grab active:cursor-grabbing border-r-4 flex flex-col gap-2 ${notificationColors[n.type] || notificationColors.info}`}
                              whileDrag={{ scale: 1.02, zIndex: 10 }}
                            >
                                {n.metadata?.actionType === 'join_request' ? (
                                    <div className="flex flex-col gap-3">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${n.metadata.userPhoto ? '' : 'bg-primary/10 text-primary'}`}>
                                                {n.metadata.userPhoto ? (
                                                    <img src={n.metadata.userPhoto} alt="" className="w-full h-full rounded-full object-cover" referrerPolicy="no-referrer" />
                                                ) : (
                                                    <FaUserAlt size={16} />
                                                )}
                                            </div>
                                            <div className="flex-grow min-w-0">
                                                <p className="font-bold text-xs truncate">{n.metadata.userName}</p>
                                                <p className="text-[10px] opacity-70">يطلب الانضمام كمعلم مساعد</p>
                                            </div>
                                            <div className="text-[10px] opacity-50 whitespace-nowrap">
                                                {new Date(n.createdAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </div>
                                        
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (onUpdateSupervisor && n.metadata?.uid) {
                                                        onUpdateSupervisor(n.metadata.uid, { status: 'active' });
                                                    }
                                                }}
                                                className="flex-1 bg-green-500 text-white py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 hover:bg-green-600 transition-colors shadow-sm"
                                            >
                                                <FaCheck size={10} /> قبول
                                            </button>
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (onUpdateSupervisor && n.metadata?.uid) {
                                                        onUpdateSupervisor(n.metadata.uid, { isDeleteAction: true } as any);
                                                    }
                                                }}
                                                className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                                            >
                                                <FaTimes size={10} /> رفض
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        {n.message}
                                        {n.id === 'feedback_request' && (
                                            <a 
                                                href="https://wa.me/779516077?text=%D8%A7%D9%84%D8%B3%D9%84%D8%A7%D9%85%20%D8%B9%D9%84%D9%8A%D9%83%D9%85%20%D9%8A%D8%A7%20%D9%85%D8%B7%D9%88%D8%B1%20%D8%A7%D9%84%D8%AA%D8%B7%D8%A8%D9%8A%D9%82%D8%8C%20%D8%B9%D9%86%D8%AF%D9%8I%20%D8%A7%D9%82%D8%AA%D8%B1%D8%A7%D8%AD%2F%D8%B1%D8%A3%D9%8A%20%D8%A8%D8%AE%D8%B5%D9%88%D8%B5%20%D8%A7%D9%84%D8%AA%D8%B7%D8%A8%D9%8A%D9%82..." 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="self-end bg-green-500 text-white px-3 py-1.5 rounded-md flex items-center gap-2 text-xs font-bold w-fit mt-1"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <FaWhatsapp />
                                                تواصل مع المطور
                                            </a>
                                        )}
                                    </>
                                )}
                            </motion.div>
                        ))}
                        </AnimatePresence>
                    ) : (
                        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">لا توجد إشعارات جديدة.</p>
                    )}
                 </div>
                 
                 <div className="mt-3 flex flex-col items-center gap-2">
                     {hasMoreNotifications && (
                        <button 
                            onClick={() => setShowAllNotifications(p => !p)} 
                            className="text-xs font-bold text-gray-500 dark:text-gray-400 flex items-center justify-center gap-1 hover:text-primary dark:hover:text-accent transition-colors"
                        >
                            {showAllNotifications ? 'إخفاء' : 'عرض المزيد'} <FaChevronDown className={`transition-transform ${showAllNotifications ? 'rotate-180' : ''}`} />
                        </button>
                     )}
                     
                     {showAllNotifications && filteredNotifications.length > 0 && (
                        <button 
                            onClick={handleClearAllNotifications} 
                            className="text-xs text-red-500 opacity-50 hover:opacity-100 transition-all flex items-center gap-1 p-2 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 mt-2"
                            title="حذف الكل"
                        >
                            <FaTrash size={10} /> حذف جميع الإشعارات
                        </button>
                     )}
                 </div>
            </div>
        </div>
    );
};

export default Home;


import React, { useState, useMemo, useEffect, useRef } from 'react';
import { generateUniqueId } from '../utils/helpers';
import { motion, AnimatePresence } from 'framer-motion';
import { Student, Session, CircleData, SentReportLog, FollowUpSettings, Settings } from '../types';
import { FaArrowLeft, FaSearch, FaEllipsisV, FaEnvelope, FaTimes, FaBan, FaExclamationTriangle, FaSortAmountDown, FaCog, FaUserClock, FaUserTimes, FaBook, FaBookOpen, FaCheckCircle, FaCalendarAlt, FaFilter, FaInfoCircle, FaWhatsapp, FaPauseCircle, FaCrown, FaFileAlt, FaSignOutAlt, FaBullhorn, FaHistory } from 'react-icons/fa';
import StudentAvatar from '../components/StudentAvatar';
import { normalizeText, formatDate, getGenderedTerm, formatDateFull } from '../utils/helpers';
import FollowUpMessageModal from '../components/FollowUpMessageModal';
import FollowUpSettingsModal from '../components/FollowUpSettingsModal';
import SentReportsHistoryModal from '../components/SentReportsHistoryModal';
import useLocalStorage from '../hooks/useLocalStorage';

interface ParentFollowUpProps {
    students: Student[];
    sessions: Session[];
    circleData: CircleData;
    onBack: () => void;
    onUpdateStudent: (student: Student) => void;
    onUpdateSettings: (settings: Partial<Settings>) => void;
    addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

type SortOption = 'default' | 'most_absent' | 'most_present' | 'most_committed' | 'needs_followup' | 'excellent';
type TimeframeOption = 'all_time' | 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'custom';

const defaultFollowUpSettings: FollowUpSettings = {
    absentThreshold: 3,
    lateThreshold: 5,
    missedMemoThreshold: 4,
    missedReviewThreshold: 4
};

// --- Helper Components ---

const DetailRow: React.FC<{ icon: React.ElementType, label: string, count: number, dates: string[], colorClass: string, emptyLabel?: string }> = ({ icon: Icon, label, count, dates, colorClass, emptyLabel }) => {
    if (count === 0 && !emptyLabel) return null;
    
    // Extract bg color from text color class for the container
    const bgClass = colorClass.replace('text-', 'bg-').replace('500', '50').replace('600', '50').replace('700', '50') + ' dark:bg-opacity-10';
    const borderClass = colorClass.replace('text-', 'border-').replace('500', '200').replace('600', '200') + ' dark:border-opacity-20';

    return (
        <div className={`p-3 rounded-lg border ${count > 0 ? `${bgClass} ${borderClass}` : 'bg-gray-50 dark:bg-gray-800 border-gray-100 dark:border-gray-700'}`}>
            <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                    <Icon className={count > 0 ? colorClass : 'text-gray-400'} />
                    <span className="font-bold text-sm text-gray-700 dark:text-gray-200">{label}</span>
                </div>
                <span className={`font-bold text-sm ${count > 0 ? colorClass : 'text-gray-400'}`}>{count}</span>
            </div>
            
            {count > 0 && dates.length > 0 && (
                <div className="space-y-1 mt-2 border-t border-gray-200/50 dark:border-gray-700/50 pt-2">
                    {dates.map((date, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-[11px] text-gray-600 dark:text-gray-300">
                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${colorClass.replace('text-', 'bg-')}`}></span>
                            <span>{date}</span>
                        </div>
                    ))}
                </div>
            )}
            
            {count === 0 && emptyLabel && (
                <p className="text-[10px] text-green-600 dark:text-green-400 mt-1 flex items-center gap-1">
                    <FaCheckCircle size={10} /> {emptyLabel}
                </p>
            )}
        </div>
    );
};

const StudentStatusBadge: React.FC<{ status: 'regular' | 'warning' | 'critical', student: Student }> = ({ status, student }) => {
    const isFemale = student.gender === 'female';
    
    if (student.isKhatim) {
        return (
            <span className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 font-bold border border-amber-200 dark:border-amber-800">
                <FaCrown size={10} /> {isFemale ? 'خاتمة' : 'خاتم'}
            </span>
        );
    }
    if (student.suspendedMemorization && student.suspendedReview) {
        return (
            <span className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 font-bold border border-gray-200 dark:border-gray-600">
                <FaPauseCircle size={10} /> {isFemale ? 'موقوفة' : 'موقوف'}
            </span>
        );
    }

    switch (status) {
        case 'critical':
            return <span className="text-[10px] px-2 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 font-bold border border-red-200 dark:border-red-800">يحتاج متابعة</span>;
        case 'warning':
            return <span className="text-[10px] px-2 py-1 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 font-bold border border-yellow-200 dark:border-yellow-800">تنبيه</span>;
        default:
            return <span className="text-[10px] px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 font-bold border border-green-200 dark:border-green-800">منتظم</span>;
    }
};

const ActionMenu: React.FC<{ 
    isOpen: boolean; 
    onClose: () => void; 
    onAction: (type: string) => void; 
    student: Student;
}> = ({ isOpen, onClose, onAction, student }) => {
    
    // Dropdown animation
    const menuVariants = {
        hidden: { opacity: 0, scale: 0.95, y: -10 },
        visible: { opacity: 1, scale: 1, y: 0 },
        exit: { opacity: 0, scale: 0.95, y: -10 }
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 z-[40]" onClick={(e) => { e.stopPropagation(); onClose(); }}></div>
            <motion.div 
                variants={menuVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="absolute left-4 top-8 z-[50] w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden text-right"
                onClick={(e) => e.stopPropagation()} 
            >
                <div className="py-1">
                    <button onClick={(e) => { e.stopPropagation(); onAction('general'); }} className="w-full px-4 py-2 text-xs hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-700 dark:text-gray-200">
                        <FaFileAlt className="text-blue-500" /> تقرير شامل
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); onAction('absence'); }} className="w-full px-4 py-2 text-xs hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-700 dark:text-gray-200">
                        <FaUserTimes className="text-red-500" /> تنبيه غياب
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); onAction('performance_memo'); }} className="w-full px-4 py-2 text-xs hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-700 dark:text-gray-200">
                        <FaBook className="text-orange-500" /> تنبيه تقصير تسميع
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); onAction('lateness'); }} className="w-full px-4 py-2 text-xs hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-700 dark:text-gray-200">
                        <FaUserClock className="text-yellow-500" /> تنبيه تأخر
                    </button>
                    <div className="border-t border-gray-100 dark:border-gray-700 my-1"></div>
                    <button onClick={(e) => { e.stopPropagation(); onAction('suspension_warning'); }} className="w-full px-4 py-2 text-xs hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 text-red-600 font-bold">
                        <FaExclamationTriangle /> تحذير فصل
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); onAction('final_expulsion'); }} className="w-full px-4 py-2 text-xs hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 text-red-700 font-bold">
                        <FaBan /> إبلاغ فصل نهائي
                    </button>
                </div>
            </motion.div>
        </>
    );
};

// --- Bottom Sheet for Details ---
const StudentFollowUpDetailsModal: React.FC<{ 
    isOpen: boolean; 
    onClose: () => void; 
    student: any; 
    periodLabel: string;
    dateRange: { startDate: Date, endDate: Date };
    totalSessionsInPeriod: number;
    onAction: (type: string) => void;
    onOpenHistory: () => void;
}> = ({ isOpen, onClose, student, periodLabel, dateRange, totalSessionsInPeriod, onAction, onOpenHistory }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    if (!isOpen || !student) return null;

    const isFemale = student.gender === 'female';
    const isCleanRecord = student.status === 'regular' && student.stats.absentCount === 0 && student.stats.lateCount === 0 && student.stats.missedMemoCount === 0 && student.stats.missedReviewCount === 0;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-end justify-center z-[250] p-0 backdrop-blur-sm" onClick={onClose}>
            <motion.div 
                initial={{ y: '100%' }} 
                animate={{ y: 0 }} 
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                onClick={e => e.stopPropagation()}
                className="bg-white dark:bg-gray-900 w-full max-w-md h-[90vh] rounded-t-3xl shadow-2xl flex flex-col overflow-hidden"
            >
                {/* Header */}
                <div className="bg-gray-50 dark:bg-gray-800 p-5 border-b dark:border-gray-700 flex justify-between items-start relative">
                    <div className="flex items-center gap-3">
                        <StudentAvatar {...student} className="w-14 h-14 rounded-full border-4 border-white dark:border-gray-700 shadow-md" />
                        <div>
                            <h3 className="font-bold text-xl text-gray-800 dark:text-white">{student.name}</h3>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full font-bold">
                                    {periodLabel}
                                </span>
                                <StudentStatusBadge status={student.status} student={student} />
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 bg-white dark:bg-gray-700 rounded-full shadow-sm text-gray-500 hover:text-primary transition-colors border border-gray-200 dark:border-gray-600">
                                <FaEllipsisV />
                            </button>
                            <ActionMenu 
                                isOpen={isMenuOpen} 
                                onClose={() => setIsMenuOpen(false)} 
                                onAction={(t) => { setIsMenuOpen(false); onAction(t); }} 
                                student={student} 
                            />
                        </div>
                        <button onClick={onClose} className="p-2 bg-gray-200 dark:bg-gray-700 rounded-full hover:bg-gray-300 transition-colors"><FaTimes /></button>
                    </div>
                </div>

                {/* Context Info */}
                <div className="px-5 py-3 bg-blue-50 dark:bg-blue-900/10 border-b border-blue-100 dark:border-blue-900/30 flex justify-between items-center text-xs text-blue-800 dark:text-blue-200">
                    <div className="flex flex-col">
                        <span className="font-bold opacity-70">الفترة المحددة:</span>
                        <span>{formatDate(dateRange.startDate.toISOString().split('T')[0])} - {formatDate(dateRange.endDate.toISOString().split('T')[0])}</span>
                    </div>
                    <div className="text-left">
                        <span className="font-bold opacity-70 block">إجمالي الجلسات:</span>
                        <span className="font-bold text-lg">{totalSessionsInPeriod}</span>
                    </div>
                </div>

                {/* Body */}
                <div className="p-5 overflow-y-auto space-y-4 bg-white dark:bg-gray-900 flex-grow">
                    
                    {/* Status Banner */}
                    <div className={`p-4 rounded-xl flex items-start gap-3 ${
                        isCleanRecord ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' :
                        student.status === 'critical' ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800' :
                        'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'
                    }`}>
                        {isCleanRecord ? <FaCheckCircle className="text-green-500 text-2xl mt-1" /> : 
                         student.status === 'critical' ? <FaExclamationTriangle className="text-red-500 text-2xl mt-1" /> :
                         <FaInfoCircle className="text-yellow-500 text-2xl mt-1" />}
                        <div>
                            <p className={`font-bold text-base ${
                                isCleanRecord ? 'text-green-700 dark:text-green-300' :
                                student.status === 'critical' ? 'text-red-700 dark:text-red-300' :
                                'text-yellow-700 dark:text-yellow-300'
                            }`}>
                                {isCleanRecord ? (isFemale ? 'طالبة متميزة ومنتظمة' : 'طالب متميز ومنتظم') :
                                 student.status === 'critical' ? (isFemale ? 'تحتاج إلى متابعة ولي الأمر' : 'يحتاج إلى متابعة ولي الأمر') :
                                 'يوجد بعض الملاحظات'}
                            </p>
                            <p className="text-xs opacity-80 mt-1 leading-relaxed">
                                {isCleanRecord 
                                    ? `ما شاء الله، ${isFemale ? 'الطالبة' : 'الطالب'} ${student.name} لم ${isFemale ? 'تسجل' : 'يسجل'} أي مخالفة خلال هذه الفترة.` 
                                    : `سجل المتابعة يظهر ${student.stats.absentCount} غياب و ${student.stats.missedMemoCount + student.stats.missedReviewCount} تقصير في التسميع.`}
                            </p>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 gap-3">
                        <DetailRow 
                            icon={FaUserTimes} 
                            label="أيام الغياب" 
                            count={student.stats.absentCount} 
                            dates={student.stats.absentDetails} 
                            colorClass="text-red-500" 
                            emptyLabel="حضور كامل 100%"
                        />
                        <DetailRow 
                            icon={FaUserClock} 
                            label="أيام التأخر" 
                            count={student.stats.lateCount} 
                            dates={student.stats.lateDetails} 
                            colorClass="text-yellow-500"
                            emptyLabel="دائم التبكير"
                        />
                        {!student.suspendedMemorization && !student.isKhatim && (
                            <DetailRow 
                                icon={FaBook} 
                                label="تقصير في الحفظ" 
                                count={student.stats.missedMemoCount} 
                                dates={student.stats.memoDetails} 
                                colorClass="text-orange-500"
                                emptyLabel="حفظ متقن ومستمر"
                            />
                        )}
                        {!student.suspendedReview && !(student.isKhatim && !student.khatimRecitesReview) && (
                            <DetailRow 
                                icon={FaBookOpen} 
                                label="تقصير في المراجعة" 
                                count={student.stats.missedReviewCount} 
                                dates={student.stats.reviewDetails} 
                                colorClass="text-blue-500"
                                emptyLabel="مراجعة ممتازة"
                            />
                        )}
                    </div>
                    
                    {/* Special Status Info */}
                    {(student.suspendedMemorization || student.suspendedReview || student.isKhatim) && (
                        <div className="text-xs text-gray-400 text-center pt-4 border-t dark:border-gray-700">
                            {student.isKhatim && <span className="block">• {isFemale ? 'الطالبة خاتمة' : 'الطالب خاتم'}</span>}
                            {student.suspendedMemorization && <span className="block">• {isFemale ? 'موقوفة' : 'موقوف'} عن الحفظ</span>}
                            {student.suspendedReview && <span className="block">• {isFemale ? 'موقوفة' : 'موقوف'} عن المراجعة</span>}
                        </div>
                    )}

                </div>

                {/* Actions Footer */}
                <div className="p-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex gap-3">
                    <button onClick={onOpenHistory} className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors shadow-sm">
                        <FaHistory /> سجل المراسلات
                    </button>
                    <button onClick={() => onAction('general')} className="flex-1 bg-primary text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-primary-dark transition-colors shadow-sm">
                        <FaWhatsapp size={18} /> إرسال تقرير شامل
                    </button>
                </div>
            </motion.div>
        </div>
    );
};


const ParentFollowUp: React.FC<ParentFollowUpProps> = ({ students, sessions, circleData, onBack, onUpdateStudent, onUpdateSettings, addToast }) => {
    const [searchTerm, setSearchTerm] = useState('');
    
    // Persistent State
    const [sortBy, setSortBy] = useLocalStorage<SortOption>('followup_sortBy', 'default');
    const [timeframe, setTimeframe] = useLocalStorage<TimeframeOption>('followup_timeframe', 'this_month');
    
    // Custom date state (not persistent for now to keep simple)
    const [customRange, setCustomRange] = useState({ start: '', end: '' });

    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [showSortMenu, setShowSortMenu] = useState(false);
    const [openMenuId, setOpenMenuId] = useState<number | null>(null);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [selectedHistoryStudent, setSelectedHistoryStudent] = useState<any>(null);
    
    // Detail Modal State
    const [selectedStudentForDetails, setSelectedStudentForDetails] = useState<any | null>(null);

    // Message Preview Modal State
    const [modalData, setModalData] = useState<{ isOpen: boolean; student: any; message: string; type: string }>({ isOpen: false, student: null, message: '', type: 'general' });

    const settings = circleData.settings.followUpSettings || defaultFollowUpSettings;

    // --- Date Calculation Logic ---
    const dateRange = useMemo(() => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        let startDate: Date;
        let endDate: Date = new Date(now);

        switch (timeframe) {
            case 'this_week':
                startDate = new Date(today);
                startDate.setDate(today.getDate() - (today.getDay() + 1) % 7);
                break;
            case 'last_week':
                startDate = new Date(today);
                startDate.setDate(today.getDate() - (today.getDay() + 1) % 7 - 7);
                endDate = new Date(startDate);
                endDate.setDate(endDate.getDate() + 6);
                break;
            case 'this_month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            case 'last_month':
                startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                endDate = new Date(now.getFullYear(), now.getMonth(), 0);
                break;
            case 'custom':
                startDate = customRange.start ? new Date(customRange.start) : new Date(today);
                endDate = customRange.end ? new Date(customRange.end) : new Date(today);
                break;
            default: // all_time
                startDate = new Date(circleData.studyStartDate);
                break;
        }
        
        startDate.setHours(0,0,0,0);
        endDate.setHours(23,59,59,999);
        return { startDate, endDate };
    }, [timeframe, circleData.studyStartDate, customRange]);

    const formattedDateRange = useMemo(() => {
        if (timeframe === 'all_time') return 'جميع الأوقات';
        return `(${dateRange.startDate.toLocaleDateString('en-CA').slice(5).replace('-','/')} - ${dateRange.endDate.toLocaleDateString('en-CA').slice(5).replace('-','/')})`;
    }, [dateRange, timeframe]);

    const periodLabel = useMemo(() => {
        switch (timeframe) {
            case 'all_time': return 'منذ بداية الدراسة';
            case 'this_week': return 'هذا الأسبوع';
            case 'last_week': return 'الأسبوع الماضي';
            case 'this_month': return 'هذا الشهر';
            case 'last_month': return 'الشهر السابق';
            case 'custom': return 'الفترة المخصصة';
            default: return 'منذ بداية الدراسة';
        }
    }, [timeframe]);


    // --- Stats Logic ---
    const { studentStats, totalSessionsInPeriod } = useMemo(() => {
        // Filter sessions by date range first
        const filteredSessions = sessions.filter(s => {
            const d = new Date(s.date);
            return d >= dateRange.startDate && d <= dateRange.endDate;
        }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        const stats = students.map(student => {
            let absentCount = 0, lateCount = 0, missedMemoCount = 0, missedReviewCount = 0, presentCount = 0;
            let committedCount = 0;
            const absentDetails: string[] = [];
            const lateDetails: string[] = [];
            const memoDetails: string[] = [];
            const reviewDetails: string[] = [];

            filteredSessions.forEach(session => {
                const sData = session.students.find(s => s.id === student.id);
                if (!sData) return;

                // Format date for details (Day DD/MM) using custom helper
                const dateStr = formatDateFull(session.date);

                if (sData.attendance === 'absent') {
                    absentCount++;
                    absentDetails.push(dateStr);
                } else if (sData.attendance === 'late') {
                    lateCount++;
                    lateDetails.push(dateStr);
                    presentCount++;
                } else if (sData.attendance === 'present') {
                    presentCount++;
                }

                if (!session.isLesson && (sData.attendance === 'present' || sData.attendance === 'late')) {
                    let hasMemo = sData.memorization?.hasMemorization || sData.isKhatim;
                    let hasReview = sData.review?.hasReview || (sData.isKhatim && !sData.khatimRecitesReview);

                    if (!hasMemo && !sData.suspendedMemorization) {
                        missedMemoCount++;
                        memoDetails.push(dateStr);
                    }
                    if (!hasReview && !sData.suspendedReview) {
                        missedReviewCount++;
                        reviewDetails.push(dateStr);
                    }
                    if (hasMemo && hasReview) committedCount++;
                }
            });

            let status: 'regular' | 'warning' | 'critical' = 'regular';
            if (absentCount >= settings.absentThreshold || 
                lateCount >= settings.lateThreshold || 
                missedMemoCount >= settings.missedMemoThreshold ||
                missedReviewCount >= settings.missedReviewThreshold) {
                status = 'critical';
            } else if (
                absentCount > 0 || missedMemoCount > 0 || missedReviewCount > 0
            ) {
                if (absentCount >= Math.ceil(settings.absentThreshold / 2) || 
                    missedMemoCount >= Math.ceil(settings.missedMemoThreshold / 2)) {
                    status = 'warning';
                }
            }

            return {
                ...student,
                stats: { absentCount, lateCount, missedMemoCount, missedReviewCount, presentCount, committedCount, absentDetails, lateDetails, memoDetails, reviewDetails },
                status
            };
        });
        
        return { studentStats: stats, totalSessionsInPeriod: filteredSessions.length };
    }, [students, sessions, settings, dateRange]);

    // --- Filtering ---
    const displayStudents = useMemo(() => {
        let filtered = [...studentStats];
        
        if (searchTerm) {
            const term = normalizeText(searchTerm);
            filtered = filtered.filter(s => normalizeText(s.name).includes(term));
        }

        switch (sortBy) {
            case 'most_absent': filtered.sort((a, b) => b.stats.absentCount - a.stats.absentCount); break;
            case 'most_present': filtered.sort((a, b) => b.stats.presentCount - a.stats.presentCount); break;
            case 'most_committed': filtered.sort((a, b) => b.stats.committedCount - a.stats.committedCount); break;
            case 'needs_followup': 
                filtered.sort((a, b) => {
                    const rank = { critical: 3, warning: 2, regular: 1 };
                    return rank[b.status] - rank[a.status];
                });
                break;
            case 'excellent':
                filtered = filtered.filter(s => s.status === 'regular' && s.stats.absentCount === 0 && s.stats.missedMemoCount === 0);
                filtered.sort((a, b) => b.stats.committedCount - a.stats.committedCount);
                break;
            default: filtered.sort((a, b) => a.order - b.order); break;
        }
        return filtered;
    }, [studentStats, searchTerm, sortBy]);

    // --- Message Generation ---
    const generateMessage = (student: typeof studentStats[0], type: string) => {
        const isFemale = student.gender === 'female';
        const term = isFemale ? 'الطالبة' : 'الطالب';
        const pronoun = isFemale ? 'ها' : 'ه';
        const verbAbsent = isFemale ? 'تغيبت' : 'تغيب';
        const verbLate = isFemale ? 'تأخرت' : 'تأخر';
        const verbShort = isFemale ? 'قصرت' : 'قصر';
        
        let subject = '';
        let details = '';

        if (type === 'suspension_warning') {
            subject = 'إنذار بالفصل النهائي';
            details = `نود إشعاركم بأن ${term} قد تجاوز${isFemale ? 'ت' : ''} الحد المسموح به من المخالفات في الحلقة، ونفيدكم بأنه في حال عدم الالتزام في الأيام القادمة، سيضطرنا ذلك آسفين لاتخاذ قرار الفصل.\n\nتفاصيل المخالفات خلال ${periodLabel}:`;
            if (student.stats.absentCount > 0) details += `\n❌ الغياب (${student.stats.absentCount})`;
            if (student.stats.missedMemoCount > 0) details += `\n⚠️ تقصير الحفظ (${student.stats.missedMemoCount})`;
        
        } else if (type === 'final_expulsion') {
            subject = 'قرار فصل نهائي';
            details = `يؤسفنا إبلاغكم بصدور قرار فصل ${term} من الحلقة نظراً لعدم الانتظام وتكرار المخالفات رغم التنبيهات السابقة.\n\nنرجو ل${pronoun} التوفيق في مكان آخر.`;

        } else if (type === 'absence') {
            subject = 'تنبيه غياب';
            details = `نود تنبيهكم بأن ${term} ${verbAbsent} عن الحلقة ${student.stats.absentCount} أيام خلال ${periodLabel}، في التواريخ التالية:\n\n${student.stats.absentDetails.join('\n')}\n\nنرجو الحرص على الحضور.`;

        } else if (type === 'lateness') {
            subject = 'تنبيه تأخر';
            details = `نود تنبيهكم بأن ${term} ${verbLate} عن موعد الحلقة ${student.stats.lateCount} مرات خلال ${periodLabel}، في التواريخ التالية:\n\n${student.stats.lateDetails.join('\n')}\n\nنرجو الالتزام بالوقت.`;

        } else if (type === 'performance_memo') {
            subject = 'تنبيه تقصير في التسميع';
            details = `نود إشعاركم بأن ${term} ${verbShort} في تسميع الحفظ ${student.stats.missedMemoCount} مرات خلال ${periodLabel}، في التواريخ التالية:\n\n${student.stats.memoDetails.join('\n')}\n\nنأمل المتابعة والاهتمام.`;

        } else { // general
            const sections: string[] = [];
            
            if (student.stats.absentCount > 0) sections.push(`❌ الغياب (${student.stats.absentCount}):\n${student.stats.absentDetails.join('\n')}`);
            if (student.stats.lateCount > 0) sections.push(`🟡 التأخر (${student.stats.lateCount}):\n${student.stats.lateDetails.join('\n')}`);
            if (student.stats.missedMemoCount > 0) sections.push(`📖 عدم الحفظ (${student.stats.missedMemoCount}):\n${student.stats.memoDetails.join('\n')}`);
            if (student.stats.missedReviewCount > 0) sections.push(`🔁 عدم المراجعة (${student.stats.missedReviewCount}):\n${student.stats.reviewDetails.join('\n')}`);

            if (sections.length === 0) {
                return `السلام عليكم ورحمة الله وبركاته
المكرم ولي أمر ${term}: *${student.name}*

يسعدنا إفادتكم بأن ${term} في حالة انتظام وتميز خلال ${periodLabel}، ولم يتم تسجيل أي مخالفات.

شكراً لحرصكم ومتابعتكم.
إدارة ${circleData.center}`;
            }

            subject = `تقرير متابعة (${periodLabel})`;
            details = `إليكم تفاصيل المتابعة لـ ${periodLabel}:\n\n${sections.join('\n\n')}`;
        }

        return `السلام عليكم ورحمة الله وبركاته
المكرم ولي أمر ${term}: *${student.name}*

الموضوع: ${subject}

${details}

إدارة ${circleData.center}`;
    };

    const handleAction = (type: string, student?: any) => {
        const targetStudent = student || selectedStudentForDetails;
        if (!targetStudent) return;
        
        // Strict Validation
        if (type === 'absence' && targetStudent.stats.absentCount === 0) {
            addToast(`لا يوجد غياب للطالب في ${periodLabel}.`, 'info');
            return;
        }
        if (type === 'performance_memo' && targetStudent.stats.missedMemoCount === 0) {
            addToast(`لا يوجد تقصير في الحفظ للطالب في ${periodLabel}.`, 'info');
            return;
        }
        if (type === 'lateness' && targetStudent.stats.lateCount === 0) {
            addToast(`لا يوجد تأخر للطالب في ${periodLabel}.`, 'info');
            return;
        }

        const msg = generateMessage(targetStudent, type);
        
        // Use the modal to preview/send. Note: We do NOT set selectedStudentForDetails here, 
        // to avoid opening details if called from menu.
        setModalData({ isOpen: true, student: targetStudent, message: msg, type: type });
    };

    const handleSendMessage = (finalMessage: string, actionType: 'copy' | 'whatsapp') => {
        if (modalData.student) {
            const newLog: SentReportLog = {
                id: Date.now(),
                timestamp: Date.now(),
                type: modalData.type as any,
                summary: modalData.type === 'general' ? 'تقرير دوري' : 'تنبيه',
                content: finalMessage // Save the exact message sent
            };
            const updatedStudent = {
                ...modalData.student,
                sentReports: [newLog, ...(modalData.student.sentReports || [])]
            };
            
            const { stats, status, ...cleanStudent } = updatedStudent;
            onUpdateStudent(cleanStudent);
            
            addToast(actionType === 'copy' ? 'تم نسخ الرسالة وحفظها في السجل' : 'تم فتح واتساب وحفظ الرسالة في السجل', 'success');
        }
        setModalData(prev => ({ ...prev, isOpen: false }));
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20 relative">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-20">
                <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <button onClick={onBack}><FaArrowLeft className="text-gray-600 dark:text-gray-200" /></button>
                        <h1 className="text-lg font-bold text-primary dark:text-accent">لوحة المتابعة</h1>
                    </div>
                    <button onClick={() => setShowSettingsModal(true)} className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-500 hover:text-primary transition-colors">
                        <FaCog />
                    </button>
                </div>
                
                {/* Timeframe Selector */}
                <div className="flex overflow-x-auto p-2 gap-2 no-scrollbar border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                    {[
                        { k: 'all_time', l: 'الكل' },
                        { k: 'this_week', l: 'هذا الأسبوع' },
                        { k: 'last_week', l: 'الأسبوع السابق' },
                        { k: 'this_month', l: 'هذا الشهر' },
                        { k: 'last_month', l: 'الشهر السابق' },
                        { k: 'custom', l: 'فترة مخصصة' }
                    ].map(opt => (
                        <button
                            key={opt.k}
                            onClick={() => setTimeframe(opt.k as TimeframeOption)}
                            className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
                                timeframe === opt.k 
                                ? 'bg-primary text-white shadow-md' 
                                : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600'
                            }`}
                        >
                            {opt.l}
                        </button>
                    ))}
                </div>
                
                {timeframe === 'custom' && (
                    <div className="p-2 bg-gray-100 dark:bg-gray-900/50 border-b dark:border-gray-700 flex gap-2">
                        <input type="date" value={customRange.start} onChange={e => setCustomRange({...customRange, start: e.target.value})} className="p-1 text-xs border rounded bg-white dark:bg-gray-800" />
                        <input type="date" value={customRange.end} onChange={e => setCustomRange({...customRange, end: e.target.value})} className="p-1 text-xs border rounded bg-white dark:bg-gray-800" />
                    </div>
                )}

                {/* Date Range Display */}
                {timeframe !== 'all_time' && timeframe !== 'custom' && (
                    <div className="px-4 py-1 text-center bg-gray-50 dark:bg-gray-900 border-b dark:border-gray-700">
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium tracking-wide">
                            {formattedDateRange}
                        </p>
                    </div>
                )}

                {/* Filters Row */}
                <div className="p-2 flex gap-2">
                    <div className="relative flex-grow">
                        <input
                            type="text"
                            placeholder="بحث..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full p-2 pr-8 text-xs border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-700"
                        />
                        <FaSearch className="absolute right-2.5 top-2.5 text-gray-400 text-xs" />
                    </div>
                    <div className="relative">
                        <button onClick={() => setShowSortMenu(!showSortMenu)} className="bg-white dark:bg-gray-800 border dark:border-gray-700 p-2 rounded-lg text-gray-500 hover:text-primary transition-colors">
                            <FaSortAmountDown size={14} />
                        </button>
                        <AnimatePresence>
                            {showSortMenu && (
                                <>
                                <div className="fixed inset-0 z-30" onClick={() => setShowSortMenu(false)}></div>
                                <motion.div initial={{opacity:0, y:-10}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-10}} className="absolute left-0 top-10 w-40 bg-white dark:bg-gray-800 shadow-xl rounded-lg border dark:border-gray-700 z-40 overflow-hidden">
                                    {[
                                        { k: 'default', l: 'افتراضي' },
                                        { k: 'needs_followup', l: '⚠️ يحتاج لمتابعة' },
                                        { k: 'most_absent', l: '🔻 الأكثر غياباً' },
                                        { k: 'excellent', l: '⭐ المتميزون' },
                                    ].map(o => (
                                        <button key={o.k} onClick={() => { setSortBy(o.k as SortOption); setShowSortMenu(false); }} className={`w-full text-right px-4 py-2 text-xs hover:bg-gray-50 dark:hover:bg-gray-700 ${sortBy === o.k ? 'font-bold text-primary' : ''}`}>
                                            {o.l}
                                        </button>
                                    ))}
                                </motion.div>
                                </>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            {/* List */}
            <div className="p-3 space-y-3">
                {displayStudents.map(student => (
                    <motion.div 
                        layout
                        key={student.id} 
                        onClick={() => setSelectedStudentForDetails(student)}
                        className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 relative overflow-visible cursor-pointer hover:shadow-md transition-shadow group"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <StudentAvatar {...student} className="w-12 h-12 rounded-full border-2 border-gray-100 dark:border-gray-700" />
                                <div>
                                    <h3 className="font-bold text-sm text-gray-800 dark:text-gray-100">{student.name}</h3>
                                    <div className="mt-1">
                                        <StudentStatusBadge status={student.status} student={student} />
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="flex flex-col items-end gap-1">
                                    {(student.stats.absentCount > 0 || student.stats.missedMemoCount > 0) ? (
                                        <>
                                            {student.stats.absentCount > 0 && <span className="text-[10px] text-red-500 font-bold bg-red-50 dark:bg-red-900/10 px-1.5 py-0.5 rounded">{student.stats.absentCount} غياب</span>}
                                            {student.stats.missedMemoCount > 0 && <span className="text-[10px] text-orange-500 font-bold bg-orange-50 dark:bg-orange-900/10 px-1.5 py-0.5 rounded">{student.stats.missedMemoCount} تقصير</span>}
                                        </>
                                    ) : (
                                        <FaCheckCircle className="text-green-200 dark:text-green-800 text-3xl opacity-50" />
                                    )}
                                </div>
                                <div className="relative">
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setOpenMenuId(student.id === openMenuId ? null : student.id); }} 
                                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                                    >
                                        <FaEllipsisV />
                                    </button>
                                    <ActionMenu 
                                        isOpen={openMenuId === student.id}
                                        onClose={() => setOpenMenuId(null)}
                                        student={student}
                                        onAction={(t) => { setOpenMenuId(null); handleAction(t, student); }}
                                    />
                                </div>
                            </div>
                        </div>
                    </motion.div>
                ))}
                
                {displayStudents.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-10 opacity-50">
                        <FaFilter size={40} className="mb-2 text-gray-300" />
                        <p className="text-sm text-gray-500">لا توجد نتائج للعرض.</p>
                    </div>
                )}
            </div>

            {/* Modals */}
            <AnimatePresence>
                {selectedStudentForDetails && (
                    <StudentFollowUpDetailsModal 
                        key="modal-followup-details"
                        isOpen={!!selectedStudentForDetails} 
                        onClose={() => setSelectedStudentForDetails(null)} 
                        student={selectedStudentForDetails} 
                        periodLabel={periodLabel}
                        dateRange={dateRange}
                        totalSessionsInPeriod={totalSessionsInPeriod}
                        onAction={(type) => handleAction(type, selectedStudentForDetails)}
                        onOpenHistory={() => { setSelectedStudentForDetails(null); setSelectedHistoryStudent(selectedStudentForDetails); setShowHistoryModal(true); }}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {modalData.isOpen && (
                    <FollowUpMessageModal
                        key="modal-followup-message"
                        isOpen={modalData.isOpen}
                        onClose={() => setModalData(prev => ({ ...prev, isOpen: false }))}
                        studentName={modalData.student?.name || ''}
                        parentPhone={modalData.student?.parentPhone}
                        initialMessage={modalData.message}
                        onConfirm={handleSendMessage}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showSettingsModal && (
                    <FollowUpSettingsModal 
                        key="modal-followup-settings"
                        settings={settings}
                        onClose={() => setShowSettingsModal(false)}
                        onSave={(newSettings) => onUpdateSettings({ followUpSettings: newSettings })}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showHistoryModal && selectedHistoryStudent && (
                    <SentReportsHistoryModal 
                        key="modal-followup-history"
                        history={selectedHistoryStudent.sentReports || []}
                        onClose={() => { setShowHistoryModal(false); setSelectedHistoryStudent(null); }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default ParentFollowUp;
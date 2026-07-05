
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Student, Session, MemorizationRecord, ReviewRecord, Settings, ShareModalData, PointsSettings, ManualPointAdjustment, Test } from '../types';
import { FaArrowLeft, FaShareAlt, FaCalendarAlt, FaChevronDown, FaCheckCircle, FaExclamationTriangle, FaTimesCircle, FaClock, FaMedal, FaChartLine, FaPauseCircle, FaStar, FaClipboardCheck, FaChevronUp, FaTimes, FaListAlt, FaUserGraduate, FaFileAlt } from 'react-icons/fa';
import StudentAvatar from './StudentAvatar';
import { formatSurahAyah, formatDate, generateStudentProfileText, calculatePointsForSession, formatStudentId } from '../utils/helpers';
import { Chart, LineController, LineElement, PointElement, LinearScale, Title, CategoryScale, Tooltip, Legend, Filler } from 'chart.js';
import StudentRankModal from './StudentRankModal';

// Register ChartJS components
Chart.register(LineController, LineElement, PointElement, LinearScale, Title, CategoryScale, Tooltip, Legend, Filler);

const modalVariants = {
    initial: { opacity: 0, scale: 0.95, y: 20 },
    animate: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 30 } },
    exit: { opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.2 } },
};

const detailListVariants = {
    initial: { opacity: 0, y: 50 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 50 },
};

const Card: React.FC<{ children: React.ReactNode, className?: string, onClick?: () => void }> = ({ children, className, onClick }) => (
    <div className={`bg-white dark:bg-gray-800 rounded-xl p-4 shadow ${className} ${onClick ? 'cursor-pointer active:scale-98 transition-transform' : ''}`} onClick={onClick}>
        {children}
    </div>
);

const StatCard: React.FC<{ label: string; value: string | number; icon: React.ElementType; onClick?: () => void; colorClass?: string }> = ({ label, value, icon: Icon, onClick, colorClass }) => (
    <Card className={`text-center relative overflow-hidden group ${onClick ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors' : ''}`} onClick={onClick}>
        <div className={`absolute top-0 left-0 w-full h-1 ${colorClass || 'bg-primary dark:bg-accent'}`}></div>
        <Icon className={`mx-auto text-xl mb-2 ${colorClass ? colorClass.replace('bg-', 'text-') : 'text-primary dark:text-accent'}`} />
        <p className="font-bold text-lg">{value}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
        {onClick && <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity" />}
    </Card>
);

// --- Detailed List Modal ---
interface DetailItem {
    id: number;
    date: string;
    title: string;
    subtitle?: string;
    statusColor: string;
    icon: React.ElementType;
}

const DetailedListModal: React.FC<{ title: string; items: DetailItem[]; onClose: () => void }> = ({ title, items, onClose }) => (
    <div className="fixed inset-0 bg-black/60 flex items-end justify-center z-[250]" onClick={onClose}>
        <motion.div 
            variants={detailListVariants} 
            initial="initial" 
            animate="animate" 
            exit="exit"
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-gray-800 w-full max-w-md rounded-t-2xl h-[70vh] flex flex-col shadow-2xl"
        >
            <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center flex-shrink-0">
                <h3 className="font-bold text-lg text-primary dark:text-accent flex items-center gap-2">
                    <FaListAlt /> {title}
                </h3>
                <button onClick={onClose} className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full"><FaTimes /></button>
            </div>
            <div className="flex-grow overflow-y-auto p-4 space-y-3">
                {items.length === 0 ? (
                    <p className="text-center text-gray-500 py-10">لا توجد بيانات لعرضها.</p>
                ) : (
                    items.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg border-r-4" style={{ borderRightColor: item.statusColor }}>
                            <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-white dark:bg-gray-800 shadow-sm" style={{ color: item.statusColor }}>
                                <item.icon size={18} />
                            </div>
                            <div className="flex-grow">
                                <div className="flex justify-between items-start">
                                    <p className="font-bold text-sm text-gray-800 dark:text-gray-200">{item.title}</p>
                                    <span className="text-[10px] text-gray-400">{formatDate(item.date)}</span>
                                </div>
                                {item.subtitle && <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed whitespace-pre-wrap">{item.subtitle}</div>}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </motion.div>
    </div>
);


const useStudentStats = (studentId: number, allStudents: Student[], sessions: Session[], studyStartDate: string, timeframe: string, customRange: { start: string, end: string }, pointsSettings: PointsSettings) => {
    
    return useMemo(() => {
        const student = allStudents.find(s => s.id === studentId);
        if (!student) return null;

        const isFemale = student.gender === 'female';
        const resetTime = student.lastPointResetDate ? new Date(student.lastPointResetDate).getTime() : 0;

        const getPeriodRange = (tf: string, cr: { start: string, end: string }) => {
            const now = new Date();
            let startDate: Date;
            let endDate: Date = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

            switch (tf) {
                case 'today': startDate = new Date(today); endDate = new Date(today); break;
                case 'week': startDate = new Date(today); startDate.setDate(startDate.getDate() - (startDate.getDay() + 1) % 7); endDate = new Date(now); break;
                case 'last_week': startDate = new Date(today); startDate.setDate(startDate.getDate() - (startDate.getDay() + 1) % 7 - 7); endDate = new Date(startDate); endDate.setDate(endDate.getDate() + 6); break;
                case 'month': startDate = new Date(now.getFullYear(), now.getMonth(), 1); endDate = new Date(now); break;
                case 'last_month': startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1); endDate = new Date(now.getFullYear(), now.getMonth(), 0); break;
                case 'year': startDate = new Date(now.getFullYear(), 0, 1); endDate = new Date(now); break;
                case 'last_year': startDate = new Date(now.getFullYear() - 1, 0, 1); endDate = new Date(now.getFullYear() - 1, 11, 31); break;
                case 'custom': startDate = cr.start ? new Date(`${cr.start}T00:00:00Z`) : new Date(studyStartDate); endDate = cr.end ? new Date(`${cr.end}T00:00:00Z`) : new Date(); break;
                default: startDate = new Date(studyStartDate); endDate = new Date(now); break;
            }
            startDate.setHours(0, 0, 0, 0);
            endDate.setHours(23, 59, 59, 999);
            return { startDate, endDate };
        };

        const { startDate, endDate } = getPeriodRange(timeframe, customRange);

        const relevantSessions = sessions.filter(s => {
            const sessionDate = new Date(s.date);
            return sessionDate >= startDate && sessionDate <= endDate;
        });

        // Sort NEWEST FIRST based on createdAt timestamp to be precise
        const studentSessions = relevantSessions
            .map(s => ({ date: s.date, isLesson: s.isLesson, data: s.students.find(ss => ss.id === studentId), session: s }))
            .filter(item => !!item.data)
            .sort((a,b) => b.session.createdAt - a.session.createdAt);

        // ---- KPIs & Lists ----
        const attendanceList: DetailItem[] = [];
        const commitmentList: DetailItem[] = [];
        
        let presentCount = 0, lateCount = 0, absentCount = 0, excusedCount = 0;
        let totalPossibleCommitment = 0, totalCommitted = 0;
        const ratings: number[] = [];

        studentSessions.forEach(s => {
            if(!s.data) return;
            
            // Attendance Logic
            const status = s.data.attendance;
            if(status === 'present') presentCount++;
            else if(status === 'late') lateCount++;
            else if(status === 'absent') absentCount++;
            else if(status === 'excused') excusedCount++;

            let attTitle = status === 'present' ? 'حاضر' : status === 'late' ? 'متأخر' : status === 'absent' ? 'غائب' : 'مستأذن';
            let attColor = status === 'present' ? '#10B981' : status === 'late' ? '#FBBF24' : status === 'absent' ? '#EF4444' : '#3B82F6';
            let attIcon = status === 'present' ? FaCheckCircle : status === 'late' ? FaClock : status === 'absent' ? FaTimesCircle : FaUserGraduate;
            
            attendanceList.push({
                id: s.session.id,
                date: s.date,
                title: s.isLesson ? `${attTitle} (درس: ${s.session.lessonType || ''})` : attTitle,
                subtitle: s.session.time,
                statusColor: attColor,
                icon: attIcon
            });

            // Commitment Logic (Only for present/late non-lesson sessions)
            if (!s.isLesson && (status === 'present' || status === 'late')) {
                let detailsParts = [];
                let hasShortcoming = false;
                let ratingVal = 0;

                // Memo Logic - Use s.data (Snapshot) instead of student (Current Status)
                // IMPORTANT: Only checking 's.data' ensures historical accuracy.
                if (!s.data.suspendedMemorization && !s.data.isKhatim) {
                    totalPossibleCommitment++;
                    if (s.data.memorization?.hasMemorization) {
                        totalCommitted++;
                        detailsParts.push(`✅ حفظ: ${formatSurahAyah(s.data.memorization)}`);
                        if (s.data.memorization.rating) {
                            ratings.push(s.data.memorization.rating);
                            ratingVal += s.data.memorization.rating;
                        } else {
                            ratingVal += 10;
                        }
                    } else {
                        detailsParts.push(`❌ لم ${isFemale ? 'تحفظ' : 'يحفظ'}`);
                        hasShortcoming = true;
                    }
                } else if (s.data.suspendedMemorization) {
                     // It was suspended AT THAT TIME.
                     // Optionally add to list if you want to show "Suspended" status in history
                     detailsParts.push(`⏸️ حفظ موقوف`);
                }

                // Review Logic - Use s.data (Snapshot)
                if (!s.data.suspendedReview && !(s.data.isKhatim && !s.data.khatimRecitesReview)) {
                    totalPossibleCommitment++;
                    if (s.data.review?.hasReview) {
                        totalCommitted++;
                        detailsParts.push(`✅ مراجعة: ${formatSurahAyah(s.data.review)}`);
                        if (s.data.review.rating) {
                            ratings.push(s.data.review.rating);
                            ratingVal += s.data.review.rating;
                        } else {
                            ratingVal += 10;
                        }
                    } else {
                        detailsParts.push(`❌ لم ${isFemale ? 'تراجع' : 'يراجع'}`);
                        hasShortcoming = true;
                    }
                } else if (s.data.suspendedReview) {
                     detailsParts.push(`⏸️ مراجعة موقوفة`);
                }
                
                // Add to list if there is any info to show
                if (detailsParts.length > 0) {
                     commitmentList.push({
                        id: s.session.id,
                        date: s.date,
                        title: !hasShortcoming ? 'سجل التسميع' : 'تقصير',
                        subtitle: detailsParts.join('\n'),
                        statusColor: !hasShortcoming ? '#10B981' : '#EF4444', // Green if no shortcoming, Red if missed something
                        icon: !hasShortcoming ? FaCheckCircle : FaExclamationTriangle
                    });
                }
            }
        });

        const totalPossibleAttendance = studentSessions.filter(s => s.data?.attendance !== 'excused').length;
        const attendancePercentage = totalPossibleAttendance > 0 ? ((presentCount + lateCount) / totalPossibleAttendance) * 100 : 0;
        const commitmentRate = totalPossibleCommitment > 0 ? (totalCommitted / totalPossibleCommitment) * 100 : (totalPossibleAttendance > 0 ? 100 : 0);
        const avgRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
        
        // Points & Rank
        let totalPoints = 0;
        relevantSessions.forEach(session => {
            // Apply reset logic
            if (session.createdAt <= resetTime) return;

            const studentData = session.students.find(s => s.id === studentId);
            if (studentData) totalPoints += calculatePointsForSession(studentData, pointsSettings, session.isLesson, session);
        });
        (student.manualPoints || []).forEach(adj => {
            const adjDate = new Date(adj.date);
            // Apply reset logic
            if (new Date(adj.date).getTime() <= resetTime) return;

            if (adjDate >= startDate && adjDate <= endDate) totalPoints += adj.amount;
        });

        const allStudentScores = allStudents.map(s => {
            const sResetTime = s.lastPointResetDate ? new Date(s.lastPointResetDate).getTime() : 0;
            let score = 0;
            relevantSessions.forEach(session => {
                if (session.createdAt <= sResetTime) return;
                const sd = session.students.find(rs => rs.id === s.id);
                if (sd) score += calculatePointsForSession(sd, pointsSettings, session.isLesson, session);
            });
            (s.manualPoints || []).forEach(adj => {
                if (new Date(adj.date).getTime() <= sResetTime) return;
                const d = new Date(adj.date);
                if (d >= startDate && d <= endDate) score += adj.amount;
            });
            return { id: s.id, score };
        }).sort((a,b) => b.score - a.score);

        const rank = allStudentScores.findIndex(s => s.id === studentId) + 1;
        const totalStudents = allStudentScores.length;

        // --- Detailed Chart Data (Line Path) ---
        // For Chart: Reverse array to show Oldest -> Newest (Left to Right)
        const chartSessions = [...studentSessions].reverse();
        
        const chartData = {
            labels: chartSessions.map(s => formatDate(s.date).split('·')[1].trim()),
            datasets: [{
                label: 'مسار الأداء',
                data: chartSessions.map(s => {
                    if (!s.data) return 0;
                    if (s.data.attendance === 'absent') return 10;
                    if (s.data.attendance === 'excused') return null; // Skip
                    if (s.data.attendance === 'late') return 60;
                    if (s.isLesson) return 70; 

                    const hasMemo = s.data.memorization?.hasMemorization;
                    const hasReview = s.data.review?.hasReview;
                    
                    if (hasMemo && hasReview) return 100;
                    if (hasMemo || hasReview) return 80;
                    return 30; // Present but no recitation
                }), 
                borderColor: '#10B981',
                backgroundColor: 'rgba(16, 185, 129, 0.2)',
                fill: true,
                tension: 0.3,
                pointRadius: 3,
                pointHoverRadius: 6,
                spanGaps: true
            }],
            meta: chartSessions.map(s => ({
                fullDate: formatDate(s.date),
                type: s.isLesson ? `درس: ${s.session.lessonType}` : 'حلقة تسميع',
                details: !s.data ? '' : s.data.attendance === 'absent' ? 'غائب' : s.isLesson ? 'حضور درس' : 
                         (s.data.memorization?.hasMemorization && s.data.review?.hasReview) ? 'أتم الحفظ والمراجعة' :
                         (s.data.memorization?.hasMemorization) ? 'أتم الحفظ فقط' :
                         (s.data.review?.hasReview) ? 'أتم المراجعة فقط' : 'لم يسمع'
            })),
            periodRange: { startDate, endDate }
        };

        const recitationSessions = studentSessions.filter(s => !s.isLesson && s.data && (s.data.attendance === 'present' || s.data.attendance === 'late'));
        const lastMemoSession = recitationSessions.find(s => s.data?.memorization?.hasMemorization);
        const lastMemo = lastMemoSession ? { record: lastMemoSession.data!.memorization, date: lastMemoSession.date } : null;
        
        const lastReviewSession = recitationSessions.find(s => s.data?.review?.hasReview);
        const lastReview = lastReviewSession ? { record: lastReviewSession.data!.review, date: lastReviewSession.date } : null;

        return {
            student, 
            kpis: { attendancePercentage, commitmentRate, avgRating, rank, totalStudents, totalPoints }, 
            counts: { present: presentCount, late: lateCount, absent: absentCount, excused: excusedCount },
            lastMemo, lastReview, chartData,
            lists: { attendance: attendanceList, commitment: commitmentList }
        };

    }, [studentId, allStudents, sessions, studyStartDate, timeframe, customRange, pointsSettings]);
};

interface StudentProfileCardProps {
    studentId: number;
    allStudents: Student[];
    sessions: Session[];
    tests: Test[];
    studyStartDate: string;
    onClose: () => void;
    circleName: string;
    addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
    settings: Settings;
    pointsSettings: PointsSettings;
    onOpenShare: (data: Omit<ShareModalData, 'isOpen'>) => void;
    onOpenReportGenerator: (studentId: number) => void;
    onAdjustPoints: (studentId: number, adjustment: Omit<ManualPointAdjustment, 'id' | 'date'>) => void;
    onOpenPointsLog: (student: Student) => void;
    isSubModalOpen?: boolean;
    onSubModalOpen?: () => void;
    onSubModalClose?: () => void;
}

const StudentProfileCard: React.FC<StudentProfileCardProps> = ({ studentId, allStudents, sessions, tests, studyStartDate, onClose, circleName, addToast, settings, pointsSettings, onOpenShare, onOpenReportGenerator, onAdjustPoints, onOpenPointsLog, isSubModalOpen, onSubModalOpen, onSubModalClose }) => {
    const [timeframe, setTimeframe] = useState('all');
    const [customRange, setCustomRange] = useState({ start: '', end: '' });
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [showTestHistory, setShowTestHistory] = useState(false);
    
    // Modal State
    const [detailModal, setDetailModal] = useState<{ isOpen: boolean; title: string; items: DetailItem[] }>({ isOpen: false, title: '', items: [] });
    const [showRankModal, setShowRankModal] = useState(false);

    // Effect to close sub-modals when the parent (App) signals a back press
    useEffect(() => {
        if (!isSubModalOpen) {
            setDetailModal(prev => ({...prev, isOpen: false}));
            setShowRankModal(false);
        }
    }, [isSubModalOpen]);

    const filterRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<HTMLCanvasElement>(null);

    const stats = useStudentStats(studentId, allStudents, sessions, studyStartDate, timeframe, customRange, pointsSettings);

    const studentTests = useMemo(() => {
        if (!tests) return [];
        return tests
            .filter(t => t.targetStudentIds.includes(studentId))
            .map(t => {
                const result = t.results.find(r => r.studentId === studentId);
                let score = 0;
                let max = 0;
                let hasEntry = false;
                const details: {label: string, val: number | undefined, max: number}[] = [];
                
                if (result) {
                    Object.keys(t.content).forEach(key => {
                        if (t.content[key]) {
                            const val = result.grades[key];
                            const maxVal = t.maxScores?.[key] ?? 100;
                            const label = t.customLabels?.[key] || (key === 'memorization' ? 'حفظ' : key === 'review' ? 'مراجعة' : key === 'recitation' ? 'تلاوة' : key);
                            if (val !== undefined) { score += val; max += maxVal; hasEntry = true; }
                            details.push({label, val, max: maxVal});
                        }
                    });
                }
                return { ...t, score, max, details, percentage: max > 0 ? (score / max) * 100 : 0, hasRecordedGrades: hasEntry };
            })
            .sort((a, b) => b.createdAt - a.createdAt);
    }, [tests, studentId]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
                setIsFilterOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // --- Stable Chart Implementation ---
    useEffect(() => {
        const chartInstanceRef = React.createRef<Chart>();
        const canvas = chartRef.current;
        
        if (!canvas || !stats || stats.chartData.datasets[0].data.length === 0) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const isDark = document.documentElement.classList.contains('dark');
        const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
        const textColor = isDark ? '#9ca3af' : '#6b7280';

        const chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: stats.chartData.labels,
                datasets: stats.chartData.datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false, // Crucial for fixed height
                layout: { padding: { top: 10, left: 0, right: 0, bottom: 0 } },
                scales: {
                    x: { 
                        grid: { display: false },
                        ticks: { font: { size: 10, family: 'Tajawal' }, color: textColor, maxRotation: 0, autoSkip: true, maxTicksLimit: 7 }
                    },
                    y: { 
                        display: true, 
                        min: 0,
                        max: 105,
                        grid: { color: gridColor },
                        ticks: { display: false } // Hide Y labels for cleaner look
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        enabled: true,
                        backgroundColor: isDark ? 'rgba(31, 41, 55, 0.9)' : 'rgba(255, 255, 255, 0.9)',
                        titleColor: isDark ? '#bed3fd' : '#1f2937',
                        bodyColor: isDark ? '#d1d5db' : '#374151',
                        titleFont: { family: 'Tajawal', size: 12, weight: 'bold' },
                        bodyFont: { family: 'Tajawal', size: 12 },
                        borderColor: gridColor,
                        borderWidth: 1,
                        displayColors: false,
                        callbacks: {
                            title: (items) => {
                                const idx = items[0].dataIndex;
                                return stats.chartData.meta[idx].fullDate;
                            },
                            label: (item) => {
                                const idx = item.dataIndex;
                                const meta = stats.chartData.meta[idx];
                                return [`${meta.type}`, `${meta.details}`];
                            }
                        }
                    }
                }
            }
        });
        (chartInstanceRef as any).current = chartInstance;

        return () => {
             if ((chartInstanceRef as any).current) {
                (chartInstanceRef as any).current.destroy();
            }
        };
    }, [stats, settings.theme]);

    if (!stats) return null;

    const { student, kpis, counts, lastMemo, lastReview } = stats;
    const { attendancePercentage, commitmentRate, rank, totalStudents, totalPoints } = kpis;
    
    const timeframesList = [
        { key: 'all', label: 'منذ البداية' }, { key: 'year', label: 'هذه السنة' }, { key: 'last_year', label: 'السنة السابقة' },
        { key: 'month', label: 'هذا الشهر' }, { key: 'last_month', label: 'الشهر السابق' },
        { key: 'week', label: 'هذا الأسبوع' }, { key: 'last_week', label: 'الأسبوع السابق' },
        { key: 'today', label: 'اليوم' }, { key: 'custom', label: 'فترة مخصصة' },
    ];
    
    const selectedTimeframeLabel = timeframesList.find(t => t.key === timeframe)?.label || `فترة مخصصة`;

    const handleShareProfile = () => {
        const reportText = generateStudentProfileText(student, kpis, circleName, selectedTimeframeLabel);
        onOpenShare({ title: `بطاقة أداء: ${student.name}`, text: reportText });
    };

    const getStudentStatus = (s: Student): { text: string | null; colorClass: string } => {
        if (s.isKhatim) {
            const text = s.khatimRecitesReview ? "خاتم – مراجعة" : "خاتم";
            return { text, colorClass: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' };
        }
        return { text: null, colorClass: '' };
    };

    const status = getStudentStatus(student);
    const avgTestScore = studentTests.filter(t => t.hasRecordedGrades).length > 0 
        ? (studentTests.filter(t => t.hasRecordedGrades).reduce((acc, t) => acc + t.percentage, 0) / studentTests.filter(t => t.hasRecordedGrades).length).toFixed(1) 
        : 0;

    const openDetailList = (type: 'attendance' | 'commitment' | 'subset', subsetFilter?: string) => {
        if(onSubModalOpen) onSubModalOpen();
        if (type === 'attendance') {
            setDetailModal({ isOpen: true, title: 'تفاصيل الحضور', items: stats.lists.attendance });
        } else if (type === 'commitment') {
            setDetailModal({ isOpen: true, title: 'تفاصيل الالتزام', items: stats.lists.commitment });
        } else if (type === 'subset' && subsetFilter) {
            // Filter attendance list based on status for the small cards
            const filtered = stats.lists.attendance.filter(i => i.title.startsWith(subsetFilter));
            setDetailModal({ isOpen: true, title: `سجل: ${subsetFilter}`, items: filtered });
        }
    };
    
    const handleOpenRankModal = () => {
        if(onSubModalOpen) onSubModalOpen();
        setShowRankModal(true);
    }

    return (
        <>
        <motion.div variants={modalVariants} initial="initial" animate="animate" exit="exit"
            className="fixed inset-0 bg-gray-50 dark:bg-gray-900 z-[200] flex flex-col p-4 max-w-md mx-auto" onClick={(e) => e.stopPropagation()}>

            <header className="flex-shrink-0 flex justify-between items-center mb-4">
                <button onClick={onClose}><FaArrowLeft size={20} /></button>
                <h1 className="font-bold text-lg">{student.gender === 'female' ? 'بطاقة الطالبة' : 'بطاقة الطالب'}</h1>
                <div className="flex items-center gap-4">
                    <button onClick={() => onOpenReportGenerator(studentId)} title="إنشاء تقرير للوالدين"><FaFileAlt size={18} className="text-primary dark:text-accent" /></button>
                    <button onClick={handleShareProfile}><FaShareAlt size={18} /></button>
                </div>
            </header>

            <main className="flex-grow overflow-y-auto space-y-4 no-scrollbar pb-8">
                {/* Profile Header */}
                <Card className={`flex items-center gap-4 ${status.text ? status.colorClass.replace('text-', 'bg-').split(' ')[0] : ''}`}>
                    <StudentAvatar {...student} className="w-16 h-16 rounded-full object-cover border-4 border-gray-200 dark:border-gray-700 flex-shrink-0" />
                    <div className="flex-grow min-w-0 flex flex-col">
                        <div className="flex justify-between items-start">
                            <h2 className="text-xl font-bold">{student.name}</h2>
                            <span className="text-[9px] font-mono font-bold text-gray-400 opacity-30 ml-2 select-none" title={`معرف الطالب: ST-${studentId}`}>
                                {formatStudentId(studentId)}
                            </span>
                        </div>
                        {status.text && (
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full mt-1 self-start ${status.colorClass}`}>{status.text}</span>
                        )}
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                           انضم: {new Date(`${student.joinDate}T00:00:00Z`).toLocaleDateString('ar', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })}
                        </p>
                    </div>
                     <div className="relative flex-shrink-0" ref={filterRef}>
                        <button onClick={() => setIsFilterOpen(p => !p)} className="flex items-center gap-2 text-xs bg-gray-100 dark:bg-gray-700/50 px-3 py-2 rounded-lg">
                           <FaCalendarAlt /> <span>{timeframesList.find(t => t.key === timeframe)?.label}</span> <FaChevronDown size={10} />
                        </button>
                        <AnimatePresence>
                        {isFilterOpen && <motion.div initial={{opacity:0, y:-5}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-5}}
                            className="absolute top-full left-0 mt-1 w-full bg-white dark:bg-gray-800 rounded-md shadow-lg z-[60] border dark:border-gray-700">
                           {timeframesList.map(t => <button key={t.key} onClick={()=>{setTimeframe(t.key); setIsFilterOpen(false);}} className="block w-full text-right text-xs p-2 hover:bg-gray-100 dark:hover:bg-gray-700">{t.label}</button>)}
                        </motion.div>}
                        </AnimatePresence>
                    </div>
                </Card>
                
                {timeframe === 'custom' && (
                    <motion.div initial={{height:0, opacity:0}} animate={{height:'auto', opacity:1}} className="grid grid-cols-2 gap-2">
                        <input type="date" value={customRange.start} onChange={e => setCustomRange(p => ({...p, start: e.target.value}))} className="p-2 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600 w-full text-sm" />
                        <input type="date" value={customRange.end} onChange={e => setCustomRange(p => ({...p, end: e.target.value}))} className="p-2 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600 w-full text-sm" />
                    </motion.div>
                )}

                {/* Main Stats Grid - Clickable */}
                <div className="grid grid-cols-4 gap-3">
                    <StatCard label="الحضور" value={`${attendancePercentage.toFixed(0)}%`} icon={FaCheckCircle} colorClass="bg-green-500" onClick={() => openDetailList('attendance')} />
                    <StatCard label="الالتزام" value={`${commitmentRate.toFixed(0)}%`} icon={FaChartLine} colorClass="bg-blue-500" onClick={() => openDetailList('commitment')} />
                    <StatCard label="الترتيب" value={`${rank}/${totalStudents}`} icon={FaMedal} colorClass="bg-yellow-500" onClick={handleOpenRankModal} />
                    <StatCard label="النقاط" value={totalPoints} icon={FaStar} colorClass="bg-purple-500" onClick={() => onOpenPointsLog(student)} />
                </div>

                {/* Attendance Details - Clickable breakdown */}
                <Card>
                    <h3 className="text-sm font-semibold mb-3">تفاصيل الحضور</h3>
                    <div className="grid grid-cols-4 gap-2 text-center text-xs">
                        <div onClick={() => openDetailList('subset', 'حاضر')} className="p-2 bg-green-50 dark:bg-green-900/40 rounded-lg cursor-pointer hover:bg-green-100 transition-colors">
                            <p className="font-bold text-lg text-green-600 dark:text-green-400">{counts.present}</p> <p>حضور</p>
                        </div>
                        <div onClick={() => openDetailList('subset', 'متأخر')} className="p-2 bg-yellow-50 dark:bg-yellow-900/40 rounded-lg cursor-pointer hover:bg-yellow-100 transition-colors">
                            <p className="font-bold text-lg text-yellow-600 dark:text-yellow-400">{counts.late}</p> <p>تأخر</p>
                        </div>
                        <div onClick={() => openDetailList('subset', 'مستأذن')} className="p-2 bg-blue-50 dark:bg-blue-900/40 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors">
                             <p className="font-bold text-lg text-blue-600 dark:text-blue-400">{counts.excused}</p> <p>استئذان</p>
                        </div>
                        <div onClick={() => openDetailList('subset', 'غائب')} className="p-2 bg-red-50 dark:bg-red-900/40 rounded-lg cursor-pointer hover:bg-red-100 transition-colors">
                            <p className="font-bold text-lg text-red-600 dark:text-red-400">{counts.absent}</p> <p>غياب</p>
                        </div>
                    </div>
                </Card>
                
                {/* Chart Card - Fixed Height for Stability */}
                <Card>
                    <h3 className="text-sm font-semibold mb-2 flex items-center gap-2"><FaChartLine /> مسار الأداء ({selectedTimeframeLabel})</h3>
                    
                    {/* Container with explicit height to prevent jumping */}
                    <div className="h-56 w-full relative bg-gray-50 dark:bg-gray-900/30 rounded-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
                        {stats.chartData.datasets[0].data.length > 0 ? (
                             <canvas ref={chartRef}></canvas>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center">
                                <div className="p-3 bg-gray-100 dark:bg-gray-600 rounded-full mb-2">
                                    <FaChartLine className="text-2xl text-gray-400 dark:text-gray-500" />
                                </div>
                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">لا توجد بيانات كافية للفترة المحددة</p>
                            </div>
                        )}
                    </div>
                </Card>
                
                <div className="grid grid-cols-2 gap-4">
                     <Card>
                        <h3 className="text-sm font-semibold mb-2">آخر حفظ</h3>
                        {lastMemo ? (
                            <div className="min-h-[3.5rem]">
                                <p className="font-bold text-sm text-center bg-gray-100 dark:bg-gray-700/50 p-2 rounded-md">
                                    {formatSurahAyah(lastMemo.record)}
                                </p>
                                <p className="text-xs text-gray-400 text-center mt-1">{formatDate(lastMemo.date).split('·')[1].trim()}</p>
                            </div>
                        ) : (
                            <p className="font-bold text-sm text-center bg-gray-100 dark:bg-gray-700/50 p-2 rounded-md text-gray-400 min-h-[3.5rem] flex items-center justify-center">
                                {student.isKhatim ? 'خاتم' : 'لم يسجل'}
                            </p>
                        )}
                    </Card>
                     <Card>
                        <h3 className="text-sm font-semibold mb-2">آخر مراجعة</h3>
                        {lastReview ? (
                            <div className="min-h-[3.5rem]">
                                <p className="font-bold text-sm text-center bg-gray-100 dark:bg-gray-700/50 p-2 rounded-md">
                                    {formatSurahAyah(lastReview.record)}
                                </p>
                                <p className="text-xs text-gray-400 text-center mt-1">{formatDate(lastReview.date).split('·')[1].trim()}</p>
                            </div>
                        ) : (
                            <p className="font-bold text-sm text-center bg-gray-100 dark:bg-gray-700/50 p-2 rounded-md text-gray-400 min-h-[3.5rem] flex items-center justify-center">
                                لم يسجل
                            </p>
                        )}
                    </Card>
                </div>
                
                {/* Test History Section */}
                <Card>
                    <div className="flex justify-between items-center cursor-pointer" onClick={() => setShowTestHistory(!showTestHistory)}>
                        <div>
                            <h3 className="text-sm font-semibold flex items-center gap-2">
                                <FaClipboardCheck className="text-blue-500" /> سجل الاختبارات
                            </h3>
                            <p className="text-xs text-gray-500 mt-1">
                                عدد الاختبارات: {studentTests.length} | المتوسط: {avgTestScore}%
                            </p>
                        </div>
                        <FaChevronDown className={`text-gray-400 transition-transform ${showTestHistory ? 'rotate-180' : ''}`} />
                    </div>
                    <AnimatePresence>
                        {showTestHistory && (
                            <motion.div 
                                initial={{ height: 0, opacity: 0 }} 
                                animate={{ height: 'auto', opacity: 1 }} 
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="mt-3 space-y-2 border-t dark:border-gray-700 pt-3">
                                    {studentTests.length === 0 ? (
                                        <p className="text-center text-xs text-gray-400">لا توجد اختبارات مسجلة</p>
                                    ) : (
                                        studentTests.map(t => (
                                            <div key={t.id} className="bg-gray-50 dark:bg-gray-700/30 p-2 rounded-lg border border-gray-100 dark:border-gray-700">
                                                <div className="flex justify-between items-start mb-1">
                                                    <div>
                                                        <p className="font-bold text-sm">{t.name}</p>
                                                        <p className="text-[10px] text-gray-500">{new Date(t.createdAt).toLocaleDateString('ar-EG')}</p>
                                                    </div>
                                                    <div className="text-left">
                                                        <span className={`text-sm font-bold ${!t.hasRecordedGrades ? 'text-gray-400' : t.percentage >= 90 ? 'text-green-500' : t.percentage >= 75 ? 'text-blue-500' : 'text-orange-500'}`}>
                                                            {t.hasRecordedGrades ? `${t.percentage.toFixed(0)}%` : '-'}
                                                        </span>
                                                        <p className="text-[10px] text-gray-400">{t.hasRecordedGrades ? `${t.score}/${t.max}` : 'لم يرصد'}</p>
                                                    </div>
                                                </div>
                                                <div className="flex flex-wrap gap-2 mt-2">
                                                    {t.details.map((d, i) => (
                                                        <span key={i} className="text-[10px] bg-white dark:bg-gray-800 px-1.5 py-0.5 rounded border dark:border-gray-600 text-gray-600 dark:text-gray-300">
                                                            {d.label}: {d.val !== undefined ? `${d.val}/${d.max}` : '-'}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </Card>

            </main>
        </motion.div>
        
        <AnimatePresence>
            {detailModal.isOpen && (
                <DetailedListModal 
                    title={detailModal.title} 
                    items={detailModal.items} 
                    onClose={() => {
                        setDetailModal(prev => ({...prev, isOpen: false}));
                        if(onSubModalClose) onSubModalClose();
                    }} 
                />
            )}
            {showRankModal && (
                <StudentRankModal
                    student={student}
                    allStudents={allStudents}
                    sessions={sessions}
                    pointsSettings={pointsSettings}
                    startDate={stats.chartData.periodRange.startDate}
                    endDate={stats.chartData.periodRange.endDate}
                    periodLabel={selectedTimeframeLabel}
                    onClose={() => {
                        setShowRankModal(false);
                        if(onSubModalClose) onSubModalClose();
                    }}
                />
            )}
        </AnimatePresence>
        </>
    );
};

export default StudentProfileCard;
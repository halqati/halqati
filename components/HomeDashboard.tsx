
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Student, Session, Settings, PointsSettings } from '../types';
import { FaChartPie, FaStar, FaWalking, FaSadTear, FaChevronDown, FaCalendarAlt, FaTrophy, FaBookOpen, FaTimes, FaCheckCircle, FaUserClock, FaUserTimes, FaUserGraduate, FaChalkboardTeacher, FaChartLine, FaEye, FaEyeSlash, FaListAlt, FaInfoCircle } from 'react-icons/fa';
import StudentAvatar from './StudentAvatar';
import { Chart, ArcElement, DoughnutController, Tooltip, Legend } from 'chart.js';
import { calculatePointsForSession, formatDate, formatSurahAyah } from '../utils/helpers';

// Register Chart.js components locally for this component
Chart.register(ArcElement, DoughnutController, Tooltip, Legend);

interface HomeDashboardProps {
    students: Student[];
    sessions: Session[];
    studyStartDate: string;
    settings: Settings;
    pointsSettings: PointsSettings;
    onViewProfile: (studentId: number) => void;
}

const timeframes = [
    { key: 'this_week', label: 'هذا الأسبوع' },
    { key: 'last_week', label: 'الأسبوع السابق' },
    { key: 'this_month', label: 'هذا الشهر' },
    { key: 'last_month', label: 'الشهر السابق' },
    { key: 'all_time', label: 'منذ البداية' },
    { key: 'custom', label: 'فترة مخصصة' },
];

// --- Helper Components ---

const KPICard: React.FC<{ label: string; value: string; icon: React.ElementType; color: string; onClick?: () => void }> = ({ label, value, icon: Icon, color, onClick }) => (
    <div 
        onClick={onClick}
        className="bg-white dark:bg-gray-800 p-2 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center gap-1 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
    >
        <div className={`p-1.5 rounded-full ${color.replace('text-', 'bg-').replace('500', '100')} dark:bg-opacity-20`}>
            <Icon className={`${color} text-sm`} />
        </div>
        <span className="font-bold text-gray-800 dark:text-gray-100 text-sm">{value}</span>
        <span className="text-[9px] text-gray-500 dark:text-gray-400 font-medium text-center leading-tight">{label}</span>
    </div>
);

const StudentCircleList: React.FC<{ title: string; students: any[]; icon: React.ElementType; color: string; onClick: () => void }> = ({ title, students, icon: Icon, color, onClick }) => {
    const displayStudents = students.slice(0, 3); // Show max 3
    const remaining = students.length - 3;

    return (
        <div 
            onClick={onClick}
            className="bg-white dark:bg-gray-800 p-2.5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 cursor-pointer hover:shadow-md transition-all group h-full flex flex-col justify-between"
        >
            <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold text-[10px] text-gray-700 dark:text-gray-200 flex items-center gap-1.5">
                    <Icon className={`${color} text-xs`} />
                    {title}
                </h3>
                <span className="text-[9px] text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded-full">{students.length}</span>
            </div>
            
            {students.length === 0 ? (
                <div className="text-center py-2 text-gray-300 text-[9px]">لا يوجد</div>
            ) : (
                <div className="flex justify-center -space-x-2 rtl:space-x-reverse">
                    {displayStudents.map((s) => (
                        <div key={s.id} className="relative w-8 h-8 rounded-full border-2 border-white dark:border-gray-800 z-10">
                            <StudentAvatar {...s} className="w-full h-full rounded-full object-cover" />
                        </div>
                    ))}
                    {remaining > 0 && (
                        <div className="relative w-8 h-8 rounded-full border-2 border-white dark:border-gray-800 bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-[9px] text-gray-500 dark:text-gray-300 font-bold z-0">
                            +{remaining}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// --- Detailed Pages Components ---

const ModalWrapper: React.FC<{ children: React.ReactNode; onClose: () => void }> = ({ children, onClose }) => {
    return (
        <div 
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-[250] p-4 backdrop-blur-sm"
            onClick={onClose}
        >
            <motion.div 
                initial={{ opacity: 0, scale: 0.9 }} 
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden relative"
            >
                {children}
            </motion.div>
        </div>
    );
};

const DetailedPageHeader: React.FC<{ title: string; onClose: () => void; periodLabel?: string }> = ({ title, onClose, periodLabel }) => (
    <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50 flex-shrink-0">
        <div>
            <h2 className="text-lg font-bold text-primary dark:text-accent">{title}</h2>
            {periodLabel && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">الفترة: {periodLabel}</p>}
        </div>
        <button onClick={onClose} className="p-2 bg-white dark:bg-gray-700 rounded-full text-gray-500 hover:text-red-500 transition-colors"><FaTimes /></button>
    </div>
);

const CommitmentPage: React.FC<{ data: any[]; onClose: () => void; periodLabel: string }> = ({ data, onClose, periodLabel }) => (
    <ModalWrapper onClose={onClose}>
        <DetailedPageHeader title="معدل الالتزام" onClose={onClose} periodLabel={periodLabel} />
        <div className="flex-grow overflow-y-auto p-0">
            {data.length === 0 ? (
                <p className="text-center text-gray-500 py-10 text-sm">لا يوجد بيانات.</p>
            ) : (
                <table className="w-full text-xs text-right">
                    <thead className="bg-gray-100 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 sticky top-0 z-10">
                        <tr>
                            <th className="p-3">الطالب</th>
                            <th className="p-3 text-center">النسبة</th>
                            <th className="p-3 text-center">إنجاز/مطلوب</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {data.sort((a,b) => b.commitment - a.commitment).map((row) => (
                            <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                                <td className="p-3">
                                    <div className="flex items-center gap-2">
                                        <StudentAvatar {...row} className="w-8 h-8 rounded-full object-cover" />
                                        <span className="font-bold">{row.name}</span>
                                    </div>
                                </td>
                                <td className="p-3 text-center align-middle">
                                    <div className="flex items-center gap-2 justify-center">
                                        <div className="w-10 bg-gray-200 dark:bg-gray-600 rounded-full h-1.5">
                                            <div className={`h-1.5 rounded-full ${row.commitment >= 80 ? 'bg-green-500' : row.commitment >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${row.commitment}%` }}></div>
                                        </div>
                                        <span className="font-bold">{row.commitment}%</span>
                                    </div>
                                </td>
                                <td className="p-3 text-center">
                                    <span className="text-green-600 font-bold">{row.doneTasks}</span> / {row.totalTasks}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    </ModalWrapper>
);

const RecitationPage: React.FC<{ data: any[]; onClose: () => void; periodLabel: string }> = ({ data, onClose, periodLabel }) => (
    <ModalWrapper onClose={onClose}>
        <DetailedPageHeader title="سجل المتابعة والتسميع" onClose={onClose} periodLabel={periodLabel} />
        <div className="flex-grow overflow-y-auto p-0">
            {data.length === 0 ? (
                <p className="text-center text-gray-500 py-10 text-sm">لا يوجد بيانات.</p>
            ) : (
                <>
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-[10px] text-blue-800 dark:text-blue-200 border-b dark:border-blue-900/30 flex items-start gap-2">
                    <FaInfoCircle className="mt-0.5 flex-shrink-0"/>
                    <p>يتم احتساب "تسميع" لكل مرة قام فيها الطالب بالحفظ أو المراجعة.</p>
                </div>
                <table className="w-full text-xs text-right">
                    <thead className="bg-gray-100 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 sticky top-0 z-10">
                        <tr>
                            <th className="p-3">الطالب</th>
                            <th className="p-3 text-center">حفظ</th>
                            <th className="p-3 text-center">مراجعة</th>
                            <th className="p-3 text-center">غياب/تقصير</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {data.sort((a,b) => (b.heardMemo + b.heardReview) - (a.heardMemo + a.heardReview)).map((row) => {
                            const isSuspended = row.suspendedMemorization && row.suspendedReview;
                            const hasActivity = row.heardMemo > 0 || row.heardReview > 0 || row.missedMemo > 0 || row.missedReview > 0;
                            
                            return (
                            <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                                <td className="p-3">
                                    <div className="flex items-center gap-2">
                                        <StudentAvatar {...row} className="w-7 h-7 rounded-full object-cover" />
                                        <span className="font-bold">{row.name}</span>
                                    </div>
                                </td>
                                <td className="p-3 text-center font-bold text-green-600 dark:text-green-400">
                                    {(isSuspended && !hasActivity) ? <span className="text-gray-400 text-[10px]">-</span> : (row.isKhatim && row.heardMemo === 0) ? <span className="text-yellow-500 text-[10px]">خاتم</span> : row.heardMemo}
                                </td>
                                <td className="p-3 text-center font-bold text-blue-600 dark:text-blue-400">
                                    {(isSuspended && !hasActivity) ? <span className="text-gray-400 text-[10px]">-</span> : (row.isKhatim && !row.khatimRecitesReview) ? <span className="text-gray-400 text-[10px]">-</span> : row.heardReview}
                                </td>
                                <td className="p-3 text-center">
                                    <div className="flex flex-col items-center gap-0.5">
                                        {row.absent > 0 && <span className="text-red-500 font-bold">{row.absent} غياب</span>}
                                        {(row.missedMemo > 0 || row.missedReview > 0) && <span className="text-orange-500">{row.missedMemo + row.missedReview} تقصير</span>}
                                        {row.absent === 0 && row.missedMemo === 0 && row.missedReview === 0 && !hasActivity && isSuspended && <span className="text-gray-400 font-bold">موقوف</span>}
                                        {row.absent === 0 && row.missedMemo === 0 && row.missedReview === 0 && hasActivity && <span className="text-green-500">ممتاز</span>}
                                    </div>
                                </td>
                            </tr>
                        )})}
                    </tbody>
                </table>
                </>
            )}
        </div>
    </ModalWrapper>
);

const LessonsPage: React.FC<{ sessions: Session[]; onClose: () => void; periodLabel: string }> = ({ sessions, onClose, periodLabel }) => {
    const lessons = sessions.filter(s => s.isLesson).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return (
        <ModalWrapper onClose={onClose}>
            <DetailedPageHeader title="جلسات الدروس" onClose={onClose} periodLabel={periodLabel} />
            <div className="flex-grow overflow-y-auto p-4 space-y-3">
                {lessons.length === 0 ? (
                    <div className="text-center text-gray-500 py-10 flex flex-col items-center">
                        <FaChalkboardTeacher size={40} className="mb-2 opacity-20"/>
                        <p className="text-sm">لا توجد جلسات دروس في هذه الفترة.</p>
                    </div>
                ) : (
                    lessons.map(lesson => {
                        const attendanceCount = lesson.students.filter(s => s.attendance === 'present' || s.attendance === 'late').length;
                        return (
                            <div key={lesson.id} className="bg-gray-50 dark:bg-gray-700/30 border border-gray-200 dark:border-gray-700 rounded-xl p-3">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <h3 className="font-bold text-sm text-primary dark:text-accent">{lesson.lessonType || 'درس عام'}</h3>
                                        {lesson.lessonTitle && <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">{lesson.lessonTitle}</p>}
                                    </div>
                                    <span className="text-[10px] bg-white dark:bg-gray-800 px-2 py-1 rounded border border-gray-200 dark:border-gray-600 text-gray-500">{formatDate(lesson.date)}</span>
                                </div>
                                <div className="flex items-center justify-between text-[10px] text-gray-500 dark:text-gray-400 pt-2 border-t dark:border-gray-700">
                                    <span className="flex items-center gap-1"><FaUserClock/> الوقت: {lesson.time}</span>
                                    <span className="flex items-center gap-1"><FaCheckCircle className="text-green-500"/> الحضور: {attendanceCount}</span>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </ModalWrapper>
    );
};

const PointsPage: React.FC<{ data: any[]; onClose: () => void; periodLabel: string }> = ({ data, onClose, periodLabel }) => (
    <ModalWrapper onClose={onClose}>
        <DetailedPageHeader title="مجموع النقاط" onClose={onClose} periodLabel={periodLabel} />
        <div className="flex-grow overflow-y-auto p-0">
            <table className="w-full text-xs text-right">
                <thead className="bg-gray-100 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 sticky top-0 z-10">
                    <tr>
                        <th className="p-3 w-12 text-center">#</th>
                        <th className="p-3">الطالب</th>
                        <th className="p-3 text-center">النقاط</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {data.sort((a,b) => b.totalPoints - a.totalPoints).map((row, idx) => (
                        <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                            <td className="p-3 font-bold w-12 text-center text-gray-400">
                                {idx + 1}
                            </td>
                            <td className="p-3">
                                <div className="flex items-center gap-2">
                                    <StudentAvatar {...row} className="w-8 h-8 rounded-full object-cover" />
                                    <span className="font-bold">{row.name}</span>
                                </div>
                            </td>
                            <td className="p-3 text-center">
                                <span className="inline-block bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400 px-2 py-1 rounded-md font-bold min-w-[3rem]">
                                    {row.totalPoints}
                                </span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </ModalWrapper>
);

const DetailedChartPage: React.FC<{ stats: any; onClose: () => void; periodLabel: string }> = ({ stats, onClose, periodLabel }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const chartRef = useRef<Chart | null>(null);

    useEffect(() => {
        if (canvasRef.current && stats) {
            const ctx = canvasRef.current.getContext('2d');
            if (ctx) {
                if (chartRef.current) chartRef.current.destroy();
                
                const { present, late, excused, absent } = stats.attendance;
                const total = present + late + excused + absent;

                chartRef.current = new Chart(ctx, {
                    type: 'doughnut',
                    data: {
                        labels: ['حضور', 'تأخر', 'استئذان', 'غياب'],
                        datasets: [{
                            data: [present, late, excused, absent],
                            backgroundColor: ['#10B981', '#F59E0B', '#3B82F6', '#EF4444'],
                            borderWidth: 2,
                            borderColor: document.documentElement.classList.contains('dark') ? '#1f2937' : '#ffffff'
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { position: 'bottom', labels: { font: { family: 'Tajawal', size: 12 }, color: document.documentElement.classList.contains('dark') ? '#d1d5db' : '#374151' } },
                            tooltip: {
                                callbacks: {
                                    label: (item) => ` ${item.label}: ${item.raw} (${total > 0 ? Math.round((item.raw as number / total) * 100) : 0}%)`
                                }
                            }
                        }
                    }
                });
            }
        }
        return () => { if (chartRef.current) chartRef.current.destroy(); };
    }, [stats]);

    return (
        <ModalWrapper onClose={onClose}>
            <DetailedPageHeader title="تفاصيل الرسم البياني" onClose={onClose} periodLabel={periodLabel} />
            <div className="flex-grow p-4 flex flex-col items-center justify-center relative h-full">
                <div className="w-full flex-grow min-h-[300px] relative">
                    <canvas ref={canvasRef} />
                </div>
                <div className="grid grid-cols-2 gap-3 w-full mt-6 text-sm flex-shrink-0">
                    <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded text-center"><span className="font-bold text-green-600 text-lg">{stats.attendance.present}</span> <br/> حضور</div>
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded text-center"><span className="font-bold text-yellow-600 text-lg">{stats.attendance.late}</span> <br/> تأخر</div>
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded text-center"><span className="font-bold text-blue-600 text-lg">{stats.attendance.excused}</span> <br/> استئذان</div>
                    <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded text-center"><span className="font-bold text-red-600 text-lg">{stats.attendance.absent}</span> <br/> غياب</div>
                </div>
            </div>
        </ModalWrapper>
    );
};


const HomeDashboard: React.FC<HomeDashboardProps> = ({ students, sessions, studyStartDate, settings, pointsSettings, onViewProfile }) => {
    const [timeframe, setTimeframe] = useState(() => localStorage.getItem('hd_timeframe') || 'this_week');
    const [customRange, setCustomRange] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('hd_custom_range') || '{"start":"", "end":""}');
        } catch {
            return { start: '', end: '' };
        }
    });
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [isExpanded, setIsExpanded] = useState(() => {
        try {
            const saved = localStorage.getItem('home_dashboard_expanded');
            return saved !== null ? JSON.parse(saved) : true;
        } catch { return true; }
    });
    
    const [activeView, setActiveView] = useState<'none' | 'commitment' | 'recitation' | 'lessons' | 'points' | 'chart'>('none');
    const [targetList, setTargetList] = useState<any[] | null>(null);

    const filterRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<HTMLCanvasElement>(null);
    const chartInstanceRef = useRef<Chart | null>(null);

    useEffect(() => {
        localStorage.setItem('home_dashboard_expanded', JSON.stringify(isExpanded));
    }, [isExpanded]);

    useEffect(() => {
        localStorage.setItem('hd_timeframe', timeframe);
    }, [timeframe]);

    useEffect(() => {
        localStorage.setItem('hd_custom_range', JSON.stringify(customRange));
    }, [customRange]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
                setIsFilterOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // --- Data Logic ---
    const filteredSessions = useMemo(() => {
        const now = new Date();
        let startDate: Date;
        let endDate: Date = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        switch (timeframe) {
            case 'this_week': startDate = new Date(today); startDate.setDate(today.getDate() - (today.getDay() + 1) % 7); break;
            case 'last_week': startDate = new Date(today); startDate.setDate(today.getDate() - (today.getDay() + 1) % 7 - 7); endDate = new Date(startDate); endDate.setDate(endDate.getDate() + 6); break;
            case 'this_month': startDate = new Date(now.getFullYear(), now.getMonth(), 1); break;
            case 'last_month': startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1); endDate = new Date(now.getFullYear(), now.getMonth(), 0); break;
            case 'all_time': startDate = new Date(studyStartDate); break;
            case 'custom': startDate = new Date(customRange.start || studyStartDate); endDate = new Date(customRange.end || now); break;
            default: startDate = new Date(now.getFullYear(), now.getMonth(), 1); break;
        }

        if (timeframe !== 'last_week' && timeframe !== 'last_month' && timeframe !== 'custom') { endDate = new Date(now); }
        startDate.setHours(0, 0, 0, 0); endDate.setHours(23, 59, 59, 999);

        return sessions.filter(s => { const d = new Date(s.date); return d >= startDate && d <= endDate; });
    }, [sessions, timeframe, studyStartDate, customRange]);

    const stats = useMemo(() => {
        if (filteredSessions.length === 0) return null;

        const studentStatsMap = new Map<number, any>();
        students.forEach(s => {
            studentStatsMap.set(s.id, {
                ...s, present: 0, late: 0, absent: 0, excused: 0, heardMemo: 0, missedMemo: 0, heardReview: 0, missedReview: 0, totalPoints: 0, ratingSum: 0, ratingCount: 0, totalSessions: 0
            });
        });

        let lessonCount = 0;
        filteredSessions.forEach(session => {
            if (session.isLesson) lessonCount++;
            session.students.forEach(ss => {
                const stat = studentStatsMap.get(ss.id);
                if (!stat) return;
                
                // Only count points if the session is after reset date
                const resetTime = stat.lastPointResetDate ? new Date(stat.lastPointResetDate).getTime() : 0;
                
                stat.totalSessions++;
                stat[ss.attendance]++;
                
                if (session.createdAt > resetTime) {
                    stat.totalPoints += calculatePointsForSession(ss, pointsSettings, session.isLesson, session);
                }

                if (!session.isLesson && (ss.attendance === 'present' || ss.attendance === 'late')) {
                    if (!ss.suspendedMemorization && !ss.isKhatim) { ss.memorization?.hasMemorization ? stat.heardMemo++ : stat.missedMemo++; }
                    if (!ss.suspendedReview && !(ss.isKhatim && !ss.khatimRecitesReview)) { ss.review?.hasReview ? stat.heardReview++ : stat.missedReview++; }
                }
            });
        });

        const studentList = Array.from(studentStatsMap.values()).map(s => {
            const totalTasks = (s.heardMemo + s.missedMemo + s.heardReview + s.missedReview) || 1;
            const doneTasks = s.heardMemo + s.heardReview;
            const commitment = Math.round((doneTasks / totalTasks) * 100);
            return { ...s, commitment, doneTasks, totalTasks };
        });

        const att = studentList.reduce((acc, s) => ({
            present: acc.present + s.present, late: acc.late + s.late, excused: acc.excused + s.excused, absent: acc.absent + s.absent
        }), { present: 0, late: 0, excused: 0, absent: 0 });

        const topStudents = [...studentList].filter(s => s.totalPoints > 0).sort((a, b) => b.totalPoints - a.totalPoints).map((s, i) => ({ ...s, rank: i + 1 }));
        const needsFollowUp = [...studentList].filter(s => (s.missedMemo > 0 || s.missedReview > 0 || s.absent > 2)).sort((a, b) => (b.missedMemo + b.missedReview + b.absent) - (a.missedMemo + a.missedReview + a.absent));
        const topCommitted = [...studentList].sort((a,b) => b.commitment - a.commitment).filter(s => s.commitment >= 80);

        const totalHearings = studentList.reduce((sum, s) => sum + s.heardMemo + s.heardReview, 0);
        const totalPossibleHearings = studentList.reduce((sum, s) => sum + s.totalTasks, 0);
        const overallCommitment = totalPossibleHearings > 0 ? Math.round((totalHearings / totalPossibleHearings) * 100) : 0;
        const avgPoints = studentList.length > 0 ? Math.round(studentList.reduce((sum, s) => sum + s.totalPoints, 0) / studentList.length) : 0;

        return { attendance: att, kpis: { commitment: overallCommitment, lessons: lessonCount, avgPoints, totalRecitations: totalHearings }, lists: { topStudents, needsFollowUp, topCommitted, all: studentList } };
    }, [filteredSessions, students, pointsSettings]);

    // --- Mini Chart Render ---
    useEffect(() => {
        if (chartInstanceRef.current) chartInstanceRef.current.destroy();
        if (chartRef.current && stats) {
            const ctx = chartRef.current.getContext('2d');
            if (!ctx) return;
            const { present, late, excused, absent } = stats.attendance;
            chartInstanceRef.current = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: [],
                    datasets: [{
                        data: [present, late, excused, absent],
                        backgroundColor: ['#10B981', '#F59E0B', '#3B82F6', '#EF4444'],
                        borderWidth: 0,
                        hoverOffset: 0
                    }]
                },
                options: { cutout: '80%', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { enabled: false } } }
            });
        }
        return () => { if (chartInstanceRef.current) chartInstanceRef.current.destroy(); };
    }, [stats, settings.theme, isExpanded]);

    const periodLabel = timeframes.find(t => t.key === timeframe)?.label || 'فترة مخصصة';

    const DashboardHeader = () => (
        <div className="flex justify-between items-center px-2 mb-3">
            <div className="flex items-center gap-2 flex-grow">
                <h2 className="text-lg font-bold text-primary dark:text-accent flex items-center gap-2">
                    نظرة عامة
                    {stats && (
                        <button onClick={() => setIsExpanded(!isExpanded)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors text-sm opacity-70">
                            {isExpanded ? <FaEye /> : <FaEyeSlash />}
                        </button>
                    )}
                </h2>
                {stats && !isExpanded && (stats.attendance.present + stats.attendance.late + stats.attendance.excused + stats.attendance.absent) > 0 && (
                    <div className="flex-grow h-2.5 flex rounded-full overflow-hidden mx-3 bg-gray-100 dark:bg-gray-700/50">
                        {stats.attendance.present > 0 && <div style={{width: `${(stats.attendance.present / (stats.attendance.present + stats.attendance.late + stats.attendance.excused + stats.attendance.absent)) * 100}%`}} className="bg-green-500 h-full" />}
                        {stats.attendance.late > 0 && <div style={{width: `${(stats.attendance.late / (stats.attendance.present + stats.attendance.late + stats.attendance.excused + stats.attendance.absent)) * 100}%`}} className="bg-yellow-500 h-full" />}
                        {stats.attendance.excused > 0 && <div style={{width: `${(stats.attendance.excused / (stats.attendance.present + stats.attendance.late + stats.attendance.excused + stats.attendance.absent)) * 100}%`}} className="bg-blue-500 h-full" />}
                        {stats.attendance.absent > 0 && <div style={{width: `${(stats.attendance.absent / (stats.attendance.present + stats.attendance.late + stats.attendance.excused + stats.attendance.absent)) * 100}%`}} className="bg-red-500 h-full" />}
                    </div>
                )}
            </div>
            
            {/* Filter Control (Visible only when expanded) */}
            {isExpanded && (
                <div className="relative" ref={filterRef}>
                    <button onClick={() => setIsFilterOpen(p => !p)} className="flex items-center gap-1 text-[10px] bg-white dark:bg-gray-800 px-2 py-1 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all">
                        <FaCalendarAlt className="text-primary dark:text-accent" />
                        <span className="font-bold">{periodLabel}</span> 
                        <FaChevronDown size={8} />
                    </button>
                    <AnimatePresence>
                        {isFilterOpen && (
                            <motion.div initial={{opacity:0, y:-5}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-5}} className="absolute top-full left-0 mt-1 w-32 bg-white dark:bg-gray-800 rounded-lg shadow-xl z-50 border dark:border-gray-700 overflow-hidden">
                                {timeframes.map(t => <button key={t.key} onClick={()=>{setTimeframe(t.key); setIsFilterOpen(false);}} className="block w-full text-right text-[10px] p-2 hover:bg-gray-50 dark:hover:bg-gray-700 border-b dark:border-gray-700/50 last:border-0">{t.label}</button>)}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );

    if (!stats) {
        return (
            <div className="transition-all duration-300 ease-in-out">
                <DashboardHeader />
                
                {timeframe === 'custom' && isExpanded && (
                    <div className="grid grid-cols-2 gap-2 px-1 mb-3 text-[10px]">
                        <input type="date" value={customRange.start} onChange={e => setCustomRange(p => ({...p, start: e.target.value}))} className="p-1 border rounded bg-white dark:bg-gray-800 dark:border-gray-600" />
                        <input type="date" value={customRange.end} onChange={e => setCustomRange(p => ({...p, end: e.target.value}))} className="p-1 border rounded bg-white dark:bg-gray-800 dark:border-gray-600" />
                    </div>
                )}

                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 text-center shadow-sm border border-gray-100 dark:border-gray-700 mx-1">
                    <FaCalendarAlt className="mx-auto text-gray-300 dark:text-gray-600 text-3xl mb-2" />
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">لا توجد بيانات للفترة المحددة</p>
                </div>
            </div>
        );
    }

    return (
        <div className="transition-all duration-300 ease-in-out">
            <DashboardHeader />

            <AnimatePresence>
                {isExpanded && (
                    <motion.div 
                        initial={{ opacity: 0, height: 0 }} 
                        animate={{ opacity: 1, height: 'auto' }} 
                        exit={{ opacity: 0, height: 0 }} 
                        className="space-y-3 overflow-hidden"
                    >
                        {timeframe === 'custom' && (
                            <div className="grid grid-cols-2 gap-2 px-1 text-[10px]">
                                <input type="date" value={customRange.start} onChange={e => setCustomRange(p => ({...p, start: e.target.value}))} className="p-1 border rounded bg-white dark:bg-gray-800 dark:border-gray-600" />
                                <input type="date" value={customRange.end} onChange={e => setCustomRange(p => ({...p, end: e.target.value}))} className="p-1 border rounded bg-white dark:bg-gray-800 dark:border-gray-600" />
                            </div>
                        )}

                        {/* Chart Compact */}
                        <div className="flex justify-center py-1">
                            <div 
                                className="relative w-24 h-24 cursor-pointer group"
                                onClick={() => { setTargetList(null); setActiveView('chart'); }}
                            >
                                <canvas ref={chartRef}></canvas>
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none group-hover:scale-110 transition-transform">
                                    <span className="text-xs font-bold text-gray-400 dark:text-gray-500">نظرة عامة</span>
                                </div>
                            </div>
                        </div>

                        {/* KPIs Compact Grid */}
                        <div className="grid grid-cols-4 md:grid-cols-4 lg:grid-cols-4 gap-2 px-1">
                            <KPICard label="معدل الالتزام" value={`${stats.kpis.commitment}%`} icon={FaChartLine} color="text-blue-500" onClick={() => { setTargetList(null); setActiveView('commitment'); }} />
                            <KPICard label="إجمالي التسميع" value={stats.kpis.totalRecitations.toString()} icon={FaBookOpen} color="text-green-500" onClick={() => { setTargetList(null); setActiveView('recitation'); }} />
                            <KPICard label="جلسات الدروس" value={stats.kpis.lessons.toString()} icon={FaChalkboardTeacher} color="text-purple-500" onClick={() => { setTargetList(null); setActiveView('lessons'); }} />
                            <KPICard label="متوسط النقاط" value={stats.kpis.avgPoints.toString()} icon={FaStar} color="text-yellow-500" onClick={() => { setTargetList(null); setActiveView('points'); }} />
                        </div>

                        {/* Compact Lists */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 px-1 h-auto min-h-[7rem]">
                            <StudentCircleList 
                                title="الأكثر التزاماً" 
                                icon={FaTrophy} 
                                color="text-yellow-500" 
                                students={stats.lists.topCommitted} 
                                onClick={() => { setTargetList(stats.lists.topCommitted); setActiveView('commitment'); }}
                            />
                            <StudentCircleList 
                                title="بحاجة لمتابعة" 
                                icon={FaSadTear} 
                                color="text-red-500" 
                                students={stats.lists.needsFollowUp} 
                                onClick={() => { setTargetList(stats.lists.needsFollowUp); setActiveView('recitation'); }}
                            />
                            {/* We can add more here for desktop if needed */}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {activeView === 'commitment' && <CommitmentPage key="commitment-page" data={targetList || stats.lists.all} onClose={() => setActiveView('none')} periodLabel={periodLabel} />}
                {activeView === 'recitation' && <RecitationPage key="recitation-page" data={targetList || stats.lists.all} onClose={() => setActiveView('none')} periodLabel={periodLabel} />}
                {activeView === 'lessons' && <LessonsPage key="lessons-page" sessions={filteredSessions} onClose={() => setActiveView('none')} periodLabel={periodLabel} />}
                {activeView === 'points' && <PointsPage key="points-page" data={targetList || stats.lists.all} onClose={() => setActiveView('none')} periodLabel={periodLabel} />}
                {activeView === 'chart' && <DetailedChartPage key="chart-page" stats={stats} onClose={() => setActiveView('none')} periodLabel={periodLabel} />}
            </AnimatePresence>
        </div>
    );
};

export default HomeDashboard;
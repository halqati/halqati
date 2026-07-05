
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Session, Student, CircleData, Test } from '../types';
import { Chart, CategoryScale, LinearScale, Tooltip, Legend, PointElement, LineElement, Filler } from 'chart.js';
import { FaTimes, FaCalendarAlt, FaTrophy, FaUsers, FaWalking, FaRunning, FaStar, FaSadTear, FaChartLine, FaClipboardList, FaFileAlt, FaChevronDown, FaClipboardCheck, FaPercentage, FaSearch } from 'react-icons/fa';
import StudentAvatar from './StudentAvatar';
import { normalizeText } from '../utils/helpers';

Chart.register(CategoryScale, LinearScale, Tooltip, Legend, PointElement, LineElement, Filler);

const modalVariants = {
  initial: { y: '100%' },
  animate: { y: 0 },
  exit: { y: '100%' },
};

const timeframes = [
    { key: 'today', label: 'اليوم' },
    { key: 'this_week', label: 'هذا الأسبوع' },
    { key: 'this_month', label: 'هذا الشهر' },
    { key: 'last_week', label: 'الأسبوع السابق' },
    { key: 'last_month', label: 'الشهر السابق' },
    { key: 'all_time', label: 'منذ البداية' },
    { key: 'custom', label: 'فترة مخصصة' },
];

export const DetailedStatsModal: React.FC<{ title: string; students: any[], suspendedStudents?: any[], onClose: () => void }> = ({ title, students, suspendedStudents, onClose }) => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[160] p-4">
        <motion.div variants={{ initial: { scale: 0.9, opacity: 0 }, animate: { scale: 1, opacity: 1 }, exit: { scale: 0.9, opacity: 0 } }} initial="initial" animate="animate" exit="exit" className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md h-[70vh] flex flex-col transition-colors duration-300">
            <div className="flex justify-between items-center mb-4 flex-shrink-0">
                <h2 className="text-xl font-bold text-primary dark:text-accent">{title} ({students.length})</h2>
                <button onClick={onClose}><FaTimes /></button>
            </div>
            <div className="flex-grow overflow-y-auto space-y-2">
                {students.map(s => (
                    <div key={s.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <div className="flex items-center gap-2">
                           <StudentAvatar {...s} className="w-8 h-8 rounded-full object-cover" />
                           <p className="font-semibold">{s.name}</p>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{s.detail}</p>
                    </div>
                ))}
                {suspendedStudents && suspendedStudents.length > 0 && (
                    <div className="mt-4 pt-4 border-t dark:border-gray-600">
                        <h3 className="font-bold mb-2">ملاحظة: الطلاب الموقوفون</h3>
                        <div className="space-y-2">
                          {suspendedStudents.map(s => (
                            <div key={s.id} className="flex items-center justify-between p-2 bg-yellow-50 dark:bg-yellow-900/40 rounded-lg">
                                 <div className="flex items-center gap-2">
                                    <StudentAvatar {...s} className="w-8 h-8 rounded-full object-cover" />
                                    <p className="font-semibold">{s.name}</p>
                                </div>
                                <p className="text-sm text-yellow-600 dark:text-yellow-400">{s.detail}</p>
                            </div>
                          ))}
                        </div>
                    </div>
                )}
            </div>
        </motion.div>
    </div>
);

const TabButton: React.FC<{ label: string; active: boolean; onClick: () => void }> = ({ label, active, onClick }) => (
    <button onClick={onClick} className={`relative px-4 py-2 text-sm font-semibold transition-colors ${active ? 'text-primary dark:text-accent' : 'text-gray-500 dark:text-gray-400'}`}>
        {label}
        {active && <motion.div layoutId="stats-tab-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary dark:bg-accent rounded-full" />}
    </button>
);

const StatCard: React.FC<{ label: string; value: string; onClick?: () => void }> = ({ label, value, onClick }) => (
    <div onClick={onClick} className={`bg-gray-50 dark:bg-gray-800 p-3 rounded-lg text-center ${onClick ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50' : ''}`}>
        <p className="font-bold text-2xl text-primary dark:text-accent">{value}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
    </div>
);

const StudentListCard: React.FC<{ title: string; icon: React.ElementType; students: any[]; onClick?: (id: number) => void }> = ({ title, icon: Icon, students, onClick }) => (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <h3 className="font-semibold mb-3 flex items-center gap-2"><Icon /> {title}</h3>
        {students.length > 0 ? (
            <div className="space-y-2">
                {students.map(s => (
                    <div key={s.id} className={`flex items-center justify-between text-sm ${onClick ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 p-1 rounded' : ''}`} onClick={onClick ? () => onClick(s.id) : undefined}>
                        <div className="flex items-center gap-2">
                            <StudentAvatar {...s} className="w-6 h-6 rounded-full object-cover" />
                            <span>{s.name}</span>
                        </div>
                        <span className="text-gray-400">{s.detail}</span>
                    </div>
                ))}
            </div>
        ) : <p className="text-sm text-center text-gray-400 py-3">لا يوجد</p>}
    </div>
);

const StatsModal: React.FC<{ students: Student[]; sessions: Session[]; onClose: () => void; data: CircleData, onOpenSupervisorReportGenerator: () => void, onOpenSavedReports: () => void, onOpenLeaderboard: () => void, onViewProfile: (id: number) => void }> = ({ students, sessions, onClose, data, onOpenSupervisorReportGenerator, onOpenSavedReports, onOpenLeaderboard, onViewProfile }) => {
    const [timeframe, setTimeframe] = useState('this_month');
    const [customRange, setCustomRange] = useState({ start: '', end: '' });
    const [showPicker, setShowPicker] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');
    const [testResultSearchTerm, setTestResultSearchTerm] = useState('');
    
    const chartRef = useRef<HTMLCanvasElement>(null);
    const chartInstanceRef = useRef<Chart | null>(null);

    const dateRange = useMemo(() => {
        const now = new Date();
        let startDate: Date;
        let endDate: Date = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        switch (timeframe) {
            case 'today':
                startDate = new Date(today);
                break;
            case 'this_week':
                startDate = new Date(today);
                startDate.setDate(today.getDate() - (today.getDay() + 1) % 7);
                break;
            case 'this_month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            case 'last_week':
                startDate = new Date(today);
                startDate.setDate(today.getDate() - (today.getDay() + 1) % 7 - 7);
                endDate = new Date(startDate);
                endDate.setDate(endDate.getDate() + 6);
                break;
            case 'last_month':
                startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                endDate = new Date(now.getFullYear(), now.getMonth(), 0);
                break;
            case 'all_time':
                startDate = new Date(data.studyStartDate);
                break;
            case 'custom':
                startDate = new Date(customRange.start || data.studyStartDate);
                endDate = new Date(customRange.end || now);
                break;
            default:
                startDate = new Date(today);
                break;
        }

        if (timeframe !== 'last_week' && timeframe !== 'last_month' && timeframe !== 'custom') {
            endDate = new Date(now);
        }
        
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        
        return { startDate, endDate };
    }, [timeframe, customRange, data.studyStartDate]);

    const filteredSessions = useMemo(() => {
        return sessions.filter(s => {
            const sessionDate = new Date(s.date);
            return sessionDate >= dateRange.startDate && sessionDate <= dateRange.endDate;
        });
    }, [sessions, dateRange]);

    const filteredTests = useMemo(() => {
        return (data.tests || []).filter(t => {
            const testDate = new Date(t.createdAt);
            return testDate >= dateRange.startDate && testDate <= dateRange.endDate;
        });
    }, [data.tests, dateRange]);
    
    const stats = useMemo(() => {
        if (filteredSessions.length === 0 || students.length === 0) return null;

        const studentStatsMap = new Map<number, Student & { present: number; late: number; absent: number; excused: number; heardMemo: number; missedMemo: number; heardReview: number; missedReview: number; }>(students.map(s => [s.id, {
            ...s, present: 0, late: 0, absent: 0, excused: 0,
            heardMemo: 0, missedMemo: 0, heardReview: 0, missedReview: 0
        }]));

        const chartPoints = new Map<string, { attended: number, possibleAttendance: number, performance: number, possiblePerformance: number }>();

        let totalPossibleHearings = 0;

        filteredSessions.forEach(session => {
            if (!chartPoints.has(session.date)) {
                chartPoints.set(session.date, { attended: 0, possibleAttendance: 0, performance: 0, possiblePerformance: 0 });
            }
            const point = chartPoints.get(session.date)!;

            session.students.forEach(ss => {
                const studentStat = studentStatsMap.get(ss.id);
                if (!studentStat) return;
                
                point.possibleAttendance++;
                studentStat[ss.attendance]++;
                
                if (ss.attendance === 'present' || ss.attendance === 'late') {
                    point.attended++;
                    if (!session.isLesson) {
                        if (!ss.suspendedMemorization && (!ss.isKhatim)) {
                            point.possiblePerformance++;
                            totalPossibleHearings++;
                            ss.memorization.hasMemorization ? (studentStat.heardMemo++, point.performance++) : studentStat.missedMemo++;
                        }
                        if (!ss.suspendedReview && !(ss.isKhatim && !ss.khatimRecitesReview)) {
                            point.possiblePerformance++;
                            totalPossibleHearings++;
                            ss.review.hasReview ? (studentStat.heardReview++, point.performance++) : studentStat.missedReview++;
                        }
                    }
                }
            });
        });

        const studentList = Array.from(studentStatsMap.values());
        const totalAttended = studentList.reduce((acc, s) => acc + s.present + s.late, 0);
        const totalPossibleAttendance = studentList.reduce((acc, s) => acc + s.present + s.late + s.absent + s.excused, 0);
        
        const attendance = {
            present: studentList.reduce((sum, s) => sum + s.present, 0),
            late: studentList.reduce((sum, s) => sum + s.late, 0),
            absent: studentList.reduce((sum, s) => sum + s.absent, 0),
            excused: studentList.reduce((sum, s) => sum + s.excused, 0),
        };
        const performance = {
            heardMemo: studentList.reduce((sum, s) => sum + s.heardMemo, 0),
            missedMemo: studentList.reduce((sum, s) => sum + s.missedMemo, 0),
            heardReview: studentList.reduce((sum, s) => sum + s.heardReview, 0),
            missedReview: studentList.reduce((sum, s) => sum + s.missedReview, 0),
        };

        const sortedDates = Array.from(chartPoints.keys()).sort((a,b) => new Date(a).getTime() - new Date(b).getTime());
        
        return {
            kpis: {
                avgAttendance: totalPossibleAttendance > 0 ? (totalAttended / totalPossibleAttendance) * 100 : 0,
                performanceCommitment: totalPossibleHearings > 0 ? ((performance.heardMemo + performance.heardReview) / totalPossibleHearings) * 100 : 0,
                totalSessions: filteredSessions.length,
            },
            attendance,
            performance,
            lists: {
                mostAbsent: [...studentList].sort((a,b) => b.absent - a.absent).filter(s=>s.absent > 0).slice(0,5).map(s => ({...s, detail: `${s.absent} أيام`})),
                mostLate: [...studentList].sort((a,b) => b.late - a.late).filter(s=>s.late > 0).slice(0,5).map(s => ({...s, detail: `${s.late} أيام`})),
                topPerformers: [...studentList].sort((a,b) => (b.heardMemo+b.heardReview) - (a.heardMemo+a.heardReview)).filter(s=> (s.heardMemo+s.heardReview)>0).slice(0,5).map(s => ({...s, detail: `${s.heardMemo+s.heardReview} تسميع`})),
                needsFollowUp: [...studentList].sort((a,b) => (b.missedMemo+b.missedReview) - (a.missedMemo+a.missedReview)).filter(s=>(s.missedMemo+s.missedReview)>0).slice(0,5).map(s => ({...s, detail: `${s.missedMemo+s.missedReview} تقصير`})),
            },
            allStudents: studentList.map(s => ({...s, totalHearings: s.heardMemo + s.heardReview})).sort((a,b) => a.order - b.order), // Keep original order for list or by order
            chart: {
                labels: sortedDates.map(date => new Date(date).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' })),
                attendanceData: sortedDates.map(date => {
                    const p = chartPoints.get(date)!;
                    return p.possibleAttendance > 0 ? (p.attended / p.possibleAttendance * 100) : 0;
                }),
                performanceData: sortedDates.map(date => {
                    const p = chartPoints.get(date)!;
                    return p.possiblePerformance > 0 ? (p.performance / p.possiblePerformance * 100) : 0;
                }),
            },
        };
    }, [filteredSessions, students]);

    const testStats = useMemo(() => {
        if (filteredTests.length === 0) return null;

        const studentTestMap = new Map<number, { 
            studentId: number, 
            totalScore: number, 
            totalMaxScore: number, 
            testsTaken: number,
            details: { name: string, type: string, breakdown: string }[] 
        }>();

        students.forEach(s => {
            studentTestMap.set(s.id, { studentId: s.id, totalScore: 0, totalMaxScore: 0, testsTaken: 0, details: [] });
        });

        filteredTests.forEach(test => {
            test.results.forEach(result => {
                const studentData = studentTestMap.get(result.studentId);
                if (!studentData) return;

                let score = 0;
                let max = 0;
                let hasEntry = false;
                let breakdownParts: string[] = [];

                Object.keys(test.content).forEach(key => {
                    if (test.content[key]) {
                        const val = result.grades[key];
                        const maxVal = test.maxScores?.[key] ?? 100;
                        const label = test.customLabels?.[key] || (key === 'memorization' ? 'حفظ' : key === 'review' ? 'مراجعة' : key === 'recitation' ? 'تلاوة' : key);
                        
                        if (val !== undefined) {
                            score += val;
                            max += maxVal;
                            hasEntry = true;
                            breakdownParts.push(`${label}: ${val}/${maxVal}`);
                        } else {
                            breakdownParts.push(`${label}: -`);
                        }
                    }
                });

                if (hasEntry) {
                    studentData.totalScore += score;
                    studentData.totalMaxScore += max;
                    studentData.testsTaken++;
                }
                
                const testTypeLabel = test.testType === 'monthly' ? 'شهري' : test.testType === 'weekly' ? 'أسبوعي' : 'سنوي';
                
                studentData.details.push({
                    name: test.name,
                    type: testTypeLabel,
                    breakdown: hasEntry ? breakdownParts.join('، ') : 'لم يتم الرصد'
                });
            });
        });

        const studentList = Array.from(studentTestMap.values())
            .filter(s => s.details.length > 0) // Include students if they were part of any test, even if score is 0
            .map(s => ({
                ...s,
                percentage: s.totalMaxScore > 0 ? (s.totalScore / s.totalMaxScore) * 100 : 0,
                name: students.find(st => st.id === s.studentId)?.name || '',
                hasRecordedGrades: s.totalMaxScore > 0
            }))
            .sort((a, b) => b.percentage - a.percentage);

        const avgScore = studentList.filter(s => s.hasRecordedGrades).length > 0 
            ? studentList.filter(s => s.hasRecordedGrades).reduce((acc, s) => acc + s.percentage, 0) / studentList.filter(s => s.hasRecordedGrades).length 
            : 0;

        return {
            totalTests: filteredTests.length,
            avgScore,
            topPerformers: studentList.filter(s => s.hasRecordedGrades).slice(0, 5).map(s => ({...s, id: s.studentId, detail: `${s.percentage.toFixed(1)}%`})),
            allStudents: studentList
        };

    }, [filteredTests, students]);
    
    // Filtered students logic for test results
    const filteredTestResultsStudents = useMemo(() => {
        if (!testStats) return [];
        if (!testResultSearchTerm) return testStats.allStudents;
        const normalizedSearch = normalizeText(testResultSearchTerm);
        return testStats.allStudents.filter(s => normalizeText(s.name).includes(normalizedSearch));
    }, [testStats, testResultSearchTerm]);

    useEffect(() => {
        if (chartInstanceRef.current) {
            chartInstanceRef.current.destroy();
            chartInstanceRef.current = null;
        }

        if (activeTab === 'overview' && chartRef.current && stats?.chart && stats.chart.labels.length > 0) {
            const ctx = chartRef.current.getContext('2d');
            if (!ctx) return;
    
            const isDark = document.documentElement.classList.contains('dark');
            const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)';
            const textColor = isDark ? '#9ca3af' : '#6b7280';
            const fontFamily = 'Tajawal';
    
            const performanceColor = '#FFC107';
            const attendanceColor = '#4CAF50';
    
            const performanceGradient = ctx.createLinearGradient(0, 0, 0, 200);
            performanceGradient.addColorStop(0, 'rgba(255, 193, 7, 0.3)');
            performanceGradient.addColorStop(1, 'rgba(255, 193, 7, 0)');
    
            const attendanceGradient = ctx.createLinearGradient(0, 0, 0, 200);
            attendanceGradient.addColorStop(0, 'rgba(76, 175, 80, 0.3)');
            attendanceGradient.addColorStop(1, 'rgba(76, 175, 80, 0)');
    
    
            chartInstanceRef.current = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: stats.chart.labels,
                    datasets: [
                        {
                            label: 'مؤشر الأداء',
                            data: stats.chart.performanceData,
                            borderColor: performanceColor,
                            backgroundColor: performanceGradient,
                            tension: 0.4,
                            fill: true,
                            borderWidth: 2,
                            pointRadius: 0,
                            pointHoverRadius: 5,
                            pointBackgroundColor: performanceColor,
                        },
                        {
                            label: 'نسبة الحضور',
                            data: stats.chart.attendanceData,
                            borderColor: attendanceColor,
                            backgroundColor: attendanceGradient,
                            tension: 0.4,
                            fill: true,
                            borderWidth: 2,
                            pointRadius: 0,
                            pointHoverRadius: 5,
                            pointBackgroundColor: attendanceColor,
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                        intersect: false,
                        mode: 'index',
                    },
                    scales: {
                        x: {
                            ticks: { color: textColor, font: { family: fontFamily } },
                            grid: { color: gridColor, drawOnChartArea: false }
                        },
                        y: {
                            beginAtZero: true,
                            max: 100,
                            ticks: { color: textColor, font: { family: fontFamily }, callback: v => `${v}%` },
                            grid: { color: gridColor }
                        }
                    },
                    plugins: {
                        legend: {
                            display: false 
                        },
                        tooltip: {
                            enabled: true,
                            backgroundColor: isDark ? 'rgba(31, 41, 55, 0.85)' : 'rgba(255, 255, 255, 0.85)',
                            titleColor: isDark ? '#e5e7eb' : '#1f2937',
                            bodyColor: isDark ? '#d1d5db' : '#374151',
                            titleFont: { family: fontFamily, weight: 'bold' },
                            bodyFont: { family: fontFamily },
                            borderColor: gridColor,
                            borderWidth: 1,
                            padding: 10,
                            displayColors: true,
                            boxPadding: 4,
                            rtl: true,
                            callbacks: {
                                label: function(context) {
                                    let label = context.dataset.label || '';
                                    if (label) {
                                        label += ': ';
                                    }
                                    if (context.parsed.y !== null) {
                                        label += `${context.parsed.y.toFixed(1)}%`;
                                    }
                                    return label;
                                }
                            }
                        }
                    }
                }
            });
        }
        
        return () => {
            if (chartInstanceRef.current) {
                chartInstanceRef.current.destroy();
                chartInstanceRef.current = null;
            }
        };
    }, [stats, data.settings.theme, activeTab]); 
    
    return (
        <motion.div variants={modalVariants} initial="initial" animate="animate" exit="exit" transition={{type:'spring', stiffness: 300, damping: 30}} className="fixed inset-0 bg-gray-100 dark:bg-gray-900 z-[150] flex flex-col max-w-md mx-auto transition-colors duration-300">
            <header className="flex-shrink-0 p-4">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-primary dark:text-accent">الإحصائيات الشاملة</h2>
                    <button onClick={onClose}><FaTimes size={22} /></button>
                </div>
                <div className="relative flex gap-2">
                    <div className="relative flex-grow" ref={useRef<HTMLDivElement>(null)}>
                        <button onClick={() => setShowPicker(p => !p)} className="w-full flex justify-between items-center p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                           <span>{timeframes.find(t => t.key === timeframe)?.label || 'فترة مخصصة'}</span> <FaChevronDown size={12} />
                        </button>
                        <AnimatePresence>
                        {showPicker && <motion.div initial={{opacity:0, y:-5}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-5}} className="absolute top-full left-0 mt-1 w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg z-10 border dark:border-gray-700">
                           {timeframes.map(t => <button key={t.key} onClick={()=>{setTimeframe(t.key); setShowPicker(false);}} className="block w-full text-right p-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700">{t.label}</button>)}
                           <button onClick={() => {setTimeframe('custom'); setShowPicker(false);}} className="block w-full text-right p-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700">فترة مخصصة</button>
                        </motion.div>}
                        </AnimatePresence>
                    </div>
                </div>
                 {timeframe === 'custom' && (
                  <motion.div initial={{height: 0, opacity: 0}} animate={{height: 'auto', opacity: 1}} className="grid grid-cols-2 gap-2 mt-2 overflow-hidden">
                    <input type="date" value={customRange.start} onChange={e => setCustomRange(p => ({...p, start: e.target.value}))} className="p-2 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600 w-full text-sm" />
                    <input type="date" value={customRange.end} onChange={e => setCustomRange(p => ({...p, end: e.target.value}))} className="p-2 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600 w-full text-sm" />
                  </motion.div>
                )}
            </header>
            
            <div className="flex-shrink-0 flex justify-around border-b dark:border-gray-700 bg-white dark:bg-gray-800/30">
                <TabButton label="نظرة عامة" active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} />
                <TabButton label="الحضور" active={activeTab === 'attendance'} onClick={() => setActiveTab('attendance')} />
                <TabButton label="الأداء" active={activeTab === 'performance'} onClick={() => setActiveTab('performance')} />
                <TabButton label="الطلاب" active={activeTab === 'students'} onClick={() => setActiveTab('students')} />
                <TabButton label="الاختبارات" active={activeTab === 'tests'} onClick={() => setActiveTab('tests')} />
            </div>

            <main className="flex-grow overflow-y-auto p-4">
                {!stats ? (
                     <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
                        <FaCalendarAlt className="text-4xl text-gray-300 dark:text-gray-600" />
                        <p className="text-gray-500">لا توجد بيانات لهذه الفترة.</p>
                    </div>
                ) : (
                    <AnimatePresence mode="wait">
                    <motion.div key={activeTab} initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-10}} className="space-y-4 h-full flex flex-col">
                        {activeTab === 'overview' && (
                            <div className="space-y-4 flex flex-col h-full">
                                <div className="grid grid-cols-3 gap-3 flex-shrink-0">
                                    <StatCard label="متوسط الحضور" value={`${stats.kpis.avgAttendance.toFixed(0)}%`} />
                                    <StatCard label="الالتزام بالتسميع" value={`${stats.kpis.performanceCommitment.toFixed(0)}%`} />
                                    <StatCard label="عدد الجلسات" value={stats.kpis.totalSessions.toString()} />
                                </div>
                                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow h-64 flex flex-col flex-shrink-0">
                                    <h3 className="font-semibold mb-2 text-sm flex items-center gap-2 flex-shrink-0"><FaChartLine/> منحنى الأداء</h3>
                                    
                                    <div className="relative flex-grow">
                                        {stats.chart.labels.length > 0 ? (
                                            <canvas ref={chartRef}></canvas>
                                        ) : (
                                            <div className="h-full flex flex-col items-center justify-center text-center space-y-3 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-700/30 m-1">
                                                <div className="bg-gray-100 dark:bg-gray-600 p-3 rounded-full">
                                                    <FaChartLine className="text-2xl text-gray-400 dark:text-gray-500" />
                                                </div>
                                                <div>
                                                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">البيانات غير كافية للرسم</p>
                                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 px-4">أضف المزيد من الجلسات لتتمكن من رؤية المؤشر البياني.</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {stats.chart.labels.length > 0 && (
                                        <div className="flex justify-center items-center gap-4 text-xs mt-2 text-gray-600 dark:text-gray-400 flex-shrink-0">
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-2.5 h-2.5 rounded-full bg-primary"></div>
                                                <span>نسبة الحضور</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-2.5 h-2.5 rounded-full bg-accent"></div>
                                                <span>مؤشر الأداء</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                
                                <div className="mt-auto pt-4 border-t dark:border-gray-700 flex gap-2 items-center justify-between">
                                    <button onClick={onOpenLeaderboard} className="flex-1 p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center text-yellow-800 dark:text-yellow-300 font-bold text-xs gap-2 hover:bg-yellow-200 dark:hover:bg-yellow-900/50 transition-colors">
                                        <FaTrophy size={14} /> لوحة الشرف
                                    </button>
                                    <button onClick={onOpenSupervisorReportGenerator} className="flex-1 p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-800 dark:text-blue-300 font-bold text-xs flex items-center justify-center gap-2 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors">
                                        <FaClipboardList size={14} /> تقرير للمشرف
                                    </button>
                                    {(data.supervisorReports || []).length > 0 && (
                                        <button onClick={onOpenSavedReports} className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors" title="التقارير المحفوظة">
                                            <FaFileAlt size={14} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                        {activeTab === 'attendance' && (
                             <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <StatCard label="حضور" value={stats.attendance.present.toString()} /> 
                                    <StatCard label="تأخر" value={stats.attendance.late.toString()} />
                                    <StatCard label="غياب" value={stats.attendance.absent.toString()} />
                                    <StatCard label="استئذان" value={stats.attendance.excused.toString()} />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <StudentListCard title="الأكثر غياباً" icon={FaWalking} students={stats.lists.mostAbsent} onClick={onViewProfile} />
                                    <StudentListCard title="الأكثر تأخراً" icon={FaRunning} students={stats.lists.mostLate} onClick={onViewProfile} />
                                </div>
                            </div>
                        )}
                        {activeTab === 'performance' && (
                            <div className="space-y-4">
                                 <div className="grid grid-cols-2 gap-3">
                                    <StatCard label="سمّعوا" value={(stats.performance.heardMemo + stats.performance.heardReview).toString()} />
                                    <StatCard label="لم يسمّعوا" value={(stats.performance.missedMemo + stats.performance.missedReview).toString()} />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <StudentListCard title="الأكثر حفظاً" icon={FaStar} students={stats.lists.topPerformers} onClick={onViewProfile} />
                                    <StudentListCard title="بحاجة لمتابعة" icon={FaSadTear} students={stats.lists.needsFollowUp} onClick={onViewProfile} />
                                </div>
                            </div>
                        )}
                        {activeTab === 'tests' && (
                            <div className="space-y-4 h-full flex flex-col">
                                {testStats ? (
                                    <>
                                        <div className="grid grid-cols-2 gap-3 flex-shrink-0">
                                            <StatCard label="عدد الاختبارات" value={testStats.totalTests.toString()} />
                                            <StatCard label="متوسط درجات الطلاب" value={`${testStats.avgScore.toFixed(1)}%`} />
                                        </div>
                                        
                                        <StudentListCard title="المتفوقون في الاختبارات" icon={FaTrophy} students={testStats.topPerformers} onClick={onViewProfile} />

                                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 flex-grow flex flex-col">
                                            <div className="p-3 border-b dark:border-gray-700 flex items-center justify-between flex-shrink-0">
                                                <div className="flex items-center gap-2">
                                                    <FaClipboardCheck className="text-primary dark:text-accent"/>
                                                    <h3 className="font-semibold text-sm">تفاصيل نتائج الطلاب</h3>
                                                </div>
                                                {/* Search Input */}
                                                <div className="relative w-32">
                                                    <input
                                                        type="text"
                                                        placeholder="بحث..."
                                                        value={testResultSearchTerm}
                                                        onChange={(e) => setTestResultSearchTerm(e.target.value)}
                                                        className="w-full py-1 px-2 pr-6 text-xs border rounded-full bg-gray-50 dark:bg-gray-900 dark:border-gray-600"
                                                    />
                                                    {testResultSearchTerm ? (
                                                        <button onClick={() => setTestResultSearchTerm('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500">
                                                            <FaTimes size={10} />
                                                        </button>
                                                    ) : (
                                                        <FaSearch className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
                                                    )}
                                                </div>
                                            </div>
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-right table-auto">
                                                    <thead className="bg-gray-100 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 font-bold text-xs sticky top-0">
                                                        <tr>
                                                            <th className="p-2 whitespace-nowrap">الطالب</th>
                                                            <th className="p-2 text-center whitespace-nowrap">المجموع</th>
                                                            <th className="p-2 text-center whitespace-nowrap">النسبة</th>
                                                            <th className="p-2 whitespace-nowrap">التفاصيل</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700 text-xs">
                                                        {filteredTestResultsStudents.length > 0 ? (
                                                            filteredTestResultsStudents.map(s => (
                                                                <tr key={s.studentId} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                                                    <td className="p-2 font-semibold">{s.name}</td>
                                                                    <td className="p-2 text-center ltr">
                                                                        {s.hasRecordedGrades ? `${s.totalScore} / ${s.totalMaxScore}` : '-'}
                                                                    </td>
                                                                    <td className="p-2 text-center font-bold text-primary dark:text-accent ltr">
                                                                        {s.hasRecordedGrades ? `${s.percentage.toFixed(1)}%` : '-'}
                                                                    </td>
                                                                    <td className="p-2 text-gray-500 dark:text-gray-400 text-[10px]">
                                                                        {s.details.map((d, i) => (
                                                                            <div key={i} className="mb-1.5 pb-1.5 border-b border-gray-100 dark:border-gray-700/50 last:border-0 last:mb-0 last:pb-0">
                                                                                <div className="font-bold text-gray-700 dark:text-gray-300">{d.name} <span className="text-[9px] font-normal opacity-70">({d.type})</span></div>
                                                                                <div className="mt-0.5 leading-relaxed">{d.breakdown}</div>
                                                                            </div>
                                                                        ))}
                                                                    </td>
                                                                </tr>
                                                            ))
                                                        ) : (
                                                            <tr>
                                                                <td colSpan={4} className="p-4 text-center text-gray-500">لا توجد نتائج.</td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-10 text-center space-y-3">
                                        <FaClipboardCheck className="text-4xl text-gray-300 dark:text-gray-600" />
                                        <p className="text-gray-500">لا توجد اختبارات مسجلة في هذه الفترة.</p>
                                    </div>
                                )}
                            </div>
                        )}
                         {activeTab === 'students' && (
                            <div className="space-y-2">
                                <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden border border-gray-200 dark:border-gray-700">
                                    <table className="w-full text-right table-fixed">
                                        <thead className="bg-gray-100 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 font-bold border-b dark:border-gray-700 text-xs">
                                            <tr>
                                                <th className="p-2 w-5/12">الطالب</th>
                                                <th className="p-2 w-auto text-center text-green-600 dark:text-green-400">حضور</th>
                                                <th className="p-2 w-auto text-center text-yellow-600 dark:text-yellow-400">تأخر</th>
                                                <th className="p-2 w-auto text-center text-blue-600 dark:text-blue-400">عذر</th>
                                                <th className="p-2 w-auto text-center text-red-600 dark:text-red-400">غياب</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700 text-xs">
                                            {stats.allStudents.map(s => (
                                                <tr key={s.id} onClick={() => onViewProfile(s.id)} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors">
                                                    <td className="p-2 font-semibold break-words">
                                                        <div className="flex items-center gap-2">
                                                            <StudentAvatar {...s} className="w-5 h-5 rounded-full object-cover flex-shrink-0" />
                                                            <span>{s.name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-2 text-center font-bold">{s.present}</td>
                                                    <td className="p-2 text-center font-bold">{s.late}</td>
                                                    <td className="p-2 text-center font-bold">{s.excused}</td>
                                                    <td className="p-2 text-center font-bold">{s.absent}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </motion.div>
                    </AnimatePresence>
                )}
            </main>
        </motion.div>
    );
};

export default StatsModal;

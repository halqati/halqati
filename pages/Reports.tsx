import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    FaArrowLeft, FaCalendarAlt, FaPrint, FaFilePdf, FaUndo, FaTrophy, 
    FaUser, FaBook, FaCheck, FaQrcode, FaSlidersH, 
    FaInfoCircle, FaFileAlt, FaCheckCircle, FaAward,
    FaStar, FaBuilding, FaUserTie, FaChevronDown, FaTimes
} from 'react-icons/fa';
import { 
    Share2, FileText, Image as ImageIcon, RotateCcw, ZoomIn, ZoomOut, Printer,
    Loader2, ChevronDown as ChevronDownLucide, Check as CheckLucide, Info as InfoLucide, 
    Calendar as CalendarLucide, Trophy as TrophyLucide, Book as BookLucide, 
    Award as AwardLucide, Star as StarLucide, RefreshCw, X as XLucide
} from 'lucide-react';
import { CircleData, Student, Session, Test } from '../types';
import { formatDate } from '../utils/helpers';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import SmartRecitationFormModal from '../components/SmartRecitationFormModal';

interface ReportsProps {
    onBack: () => void;
    activeCircle: CircleData;
}

type ReportType = 'comprehensive' | 'attendance' | 'points' | 'memorization' | 'tests';

const defaultPointsSettings = {
    present: 10,
    late: 5,
    absent: 0,
    excused: 0,
    hasMemorization: 15,
    noMemorization: 0,
    suspendedMemorization: 0,
    hasReview: 10,
    noReview: 0,
    suspendedReview: 0,
    maxMemorizationGrade: 10,
    maxReviewGrade: 10,
    khatimBonus: 20,
    khatimRecitesAttendance: 10,
    khatimRecitesHasReview: 15,
    khatimNoRecitesAttendanceBonus: 5
};

const Reports: React.FC<ReportsProps> = ({ onBack, activeCircle }) => {
    // Phase 1, 2, 3 Navigation state
    const [view, setView] = useState<'select' | 'setup' | 'preview'>('select');
    const [reportType, setReportType] = useState<ReportType>('comprehensive');
    const [showSmartFormModal, setShowSmartFormModal] = useState(false);

    // Setup configuration state
    const [period, setPeriod] = useState<'last7' | 'last30' | 'currentMonth' | 'lastMonth' | 'allTime' | 'custom'>('last30');
    
    // Default custom date ranges (last 30 days)
    const todayStr = new Date().toISOString().split('T')[0];
    const thirtyDaysAgoStr = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const [customStartDate, setCustomStartDate] = useState(thirtyDaysAgoStr);
    const [customEndDate, setCustomEndDate] = useState(todayStr);

    // Toggle options (locked and auto-activated by default)
    const [includeLessons, setIncludeLessons] = useState(true);
    const [includeHomework, setIncludeHomework] = useState(true);
    const [includeSignatures, setIncludeSignatures] = useState(true);
    const [showPrintDate, setShowPrintDate] = useState(true);
    const [showPageNumbers, setShowPageNumbers] = useState(true);
    const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('landscape');
    
    // Editable title
    const [customTitle, setCustomTitle] = useState('');

    // Zoom, Pan and Export states
    const [zoom, setZoom] = useState(0.8);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [activePageIndex, setActivePageIndex] = useState(0);

    const containerRef = useRef<HTMLDivElement>(null);
    const dragStart = useRef({ x: 0, y: 0 });
    const initialTouchDist = useRef<number | null>(null);
    const initialTouchZoom = useRef<number>(1);
    const lastClickTime = useRef(0);

    const [isShareDropdownOpen, setIsShareDropdownOpen] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [exportProgress, setExportProgress] = useState('');
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

    // Helper to get logged in user's name
    const getLoggedInUserName = () => {
        try {
            const profileStr = localStorage.getItem('tahfeezUserProfile_v1');
            if (profileStr) {
                const profile = JSON.parse(profileStr);
                if (profile && profile.displayName) {
                    return profile.displayName;
                }
            }
        } catch (e) {
            console.error("Error reading user profile from localStorage", e);
        }
        return activeCircle.teacher || 'المعلم';
    };

    // Load Tajawal font dynamically for exact PDF matching
    useEffect(() => {
        const link = document.createElement('link');
        link.href = 'https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800;900&display=swap';
        link.rel = 'stylesheet';
        document.head.appendChild(link);
        return () => {
            try {
                document.head.removeChild(link);
            } catch (err) {
                // Ignore if already removed
            }
        };
    }, []);

    const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3500);
    };

    // Active students in the circle (ignoring archived)
    const activeStudents = useMemo(() => {
        return (activeCircle.students || []).filter(s => !s.isArchived);
    }, [activeCircle.students]);

    // Compute Date Boundaries based on Selection
    const dateRange = useMemo(() => {
        const today = new Date();
        let start = '';
        let end = todayStr;

        switch (period) {
            case 'last7': {
                const d = new Date();
                d.setDate(today.getDate() - 7);
                start = d.toISOString().split('T')[0];
                break;
            }
            case 'last30': {
                const d = new Date();
                d.setDate(today.getDate() - 30);
                start = d.toISOString().split('T')[0];
                break;
            }
            case 'currentMonth': {
                const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
                // Adjust to avoid local timezone offset shifting the date
                const offset = firstDay.getTimezoneOffset();
                const adjusted = new Date(firstDay.getTime() - (offset * 60 * 1000));
                start = adjusted.toISOString().split('T')[0];
                break;
            }
            case 'lastMonth': {
                const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);
                const offsetStart = firstDay.getTimezoneOffset();
                const adjustedStart = new Date(firstDay.getTime() - (offsetStart * 60 * 1000));
                start = adjustedStart.toISOString().split('T')[0];
                const offsetEnd = lastDay.getTimezoneOffset();
                const adjustedEnd = new Date(lastDay.getTime() - (offsetEnd * 60 * 1000));
                end = adjustedEnd.toISOString().split('T')[0];
                break;
            }
            case 'allTime':
                start = '1970-01-01';
                break;
            case 'custom':
                start = customStartDate;
                end = customEndDate;
                break;
        }

        return { start, end };
    }, [period, customStartDate, customEndDate, todayStr]);

    // Filtered Sessions
    const filteredSessions = useMemo(() => {
        const list = activeCircle.sessions || [];
        return list.filter(s => {
            const dateMatch = s.date >= dateRange.start && s.date <= dateRange.end;
            const typeMatch = includeLessons ? true : !s.isLesson;
            return dateMatch && typeMatch;
        });
    }, [activeCircle.sessions, dateRange, includeLessons]);

    // Handle Title Autofill
    const periodLabel = useMemo(() => {
        switch (period) {
            case 'last7': return 'لآخر 7 أيام';
            case 'last30': return 'لآخر 30 يوماً';
            case 'currentMonth': return 'للشهر الحالي';
            case 'lastMonth': return 'للشهر السابق';
            case 'allTime': return 'لكامل الفترة';
            case 'custom': return `للفترة من ${dateRange.start} إلى ${dateRange.end}`;
            default: return '';
        }
    }, [period, dateRange]);

    const defaultTitle = useMemo(() => {
        let name = 'التقرير الشامل للحلقة';
        if (reportType === 'attendance') name = 'تقرير حضور وغياب الطلاب';
        if (reportType === 'points') name = 'تقرير نقاط وتحفيز الطلاب';
        if (reportType === 'memorization') name = 'تقرير مستويات الحفظ والمراجعة';
        if (reportType === 'tests') name = 'تقرير نتائج الاختبارات والخطط';
        return `${name} - حلقة ${activeCircle.circle} (${periodLabel})`;
    }, [reportType, activeCircle.circle, periodLabel]);

    // Reset Title when ReportType or Period changes
    React.useEffect(() => {
        setCustomTitle(defaultTitle);
    }, [defaultTitle]);

    // Aggregate statistics for students in the filtered period
    const studentsStats = useMemo(() => {
        const statsMap: {
            [studentId: number]: {
                attendanceRate: number;
                present: number;
                late: number;
                absent: number;
                excused: number;
                totalSessions: number;
                memorizedPages: number;
                reviewedPages: number;
                pointsGained: number;
                testAverage: number;
                testCount: number;
                testsTaken: number;
                lastMemoSurah: string;
                lastMemoAyah: string;
                lastReviewSurah: string;
                lastReviewAyah: string;
                highestTestScore: number;
            }
        } = {};

        // Initialize mapping for active students
        activeStudents.forEach(s => {
            statsMap[s.id] = {
                attendanceRate: 100,
                present: 0,
                late: 0,
                absent: 0,
                excused: 0,
                totalSessions: 0,
                memorizedPages: 0,
                reviewedPages: 0,
                pointsGained: 0,
                testAverage: 0,
                testCount: 0,
                testsTaken: 0,
                lastMemoSurah: '',
                lastMemoAyah: '',
                lastReviewSurah: '',
                lastReviewAyah: '',
                highestTestScore: 0
            };
        });

        // 1. Calculate Attendance, Memo, Review stats from sessions
        filteredSessions.forEach(session => {
            session.students.forEach(ss => {
                const sStat = statsMap[ss.id];
                if (!sStat) return; // Student might have been deleted or archived

                sStat.totalSessions += 1;
                if (ss.attendance === 'present') sStat.present += 1;
                else if (ss.attendance === 'late') sStat.late += 1;
                else if (ss.attendance === 'absent') sStat.absent += 1;
                else if (ss.attendance === 'excused') sStat.excused += 1;

                // Sum up Pages
                if (ss.memorization && ss.memorization.hasMemorization) {
                    sStat.memorizedPages += ss.memorization.pages_count || 0;
                    if (ss.memorization.fromSurah) {
                        sStat.lastMemoSurah = ss.memorization.toSurah || ss.memorization.fromSurah;
                        sStat.lastMemoAyah = ss.memorization.toAyah || ss.memorization.fromAyah;
                    }
                }
                if (ss.review && ss.review.hasReview) {
                    sStat.reviewedPages += ss.review.pages_count || 0;
                    if (ss.review.fromSurah) {
                        sStat.lastReviewSurah = ss.review.toSurah || ss.review.fromSurah;
                        sStat.lastReviewAyah = ss.review.toAyah || ss.review.fromAyah;
                    }
                }

                // Points calculation for this session
                const ps = session.pointsSettingsSnapshot || activeCircle.settings.pointsSettings || defaultPointsSettings;
                let sessionPoints = 0;
                
                if (ss.attendance === 'present') sessionPoints += ps.present || 0;
                else if (ss.attendance === 'late') sessionPoints += ps.late || 0;
                else if (ss.attendance === 'absent') sessionPoints += ps.absent || 0;
                else if (ss.attendance === 'excused') sessionPoints += ps.excused || 0;

                if (ss.memorization?.hasMemorization) {
                    sessionPoints += ps.hasMemorization || 0;
                } else {
                    sessionPoints += ps.noMemorization || 0;
                }

                if (ss.review?.hasReview) {
                    sessionPoints += ps.hasReview || 0;
                } else {
                    sessionPoints += ps.noReview || 0;
                }

                sStat.pointsGained += sessionPoints;
            });
        });

        // Compute Attendance Rates
        activeStudents.forEach(s => {
            const sStat = statsMap[s.id];
            if (sStat && sStat.totalSessions > 0) {
                // Rate = (Present + 0.5 * Late) / Total
                sStat.attendanceRate = Math.round(((sStat.present + (sStat.late * 0.5)) / sStat.totalSessions) * 100);
            }
        });

        // 2. Sum up manual points adjustments recorded in this period
        activeStudents.forEach(s => {
            const sStat = statsMap[s.id];
            if (!sStat) return;

            const manualPoints = s.manualPoints || [];
            manualPoints.forEach(adj => {
                const adjDate = adj.date ? adj.date.split('T')[0] : '';
                if (adjDate >= dateRange.start && adjDate <= dateRange.end) {
                    sStat.pointsGained += adj.amount || 0;
                }
            });
        });

        // 3. Tests stats
        const testList = (activeCircle.tests || []) as Test[];
        testList.forEach(test => {
            const testDate = new Date(test.createdAt).toISOString().split('T')[0];
            if (testDate >= dateRange.start && testDate <= dateRange.end) {
                test.results.forEach(res => {
                    const sStat = statsMap[res.studentId];
                    if (!sStat) return;

                    // Calculate test percentage
                    let totalScore = 0;
                    let maxPossible = 0;

                    const contents = Object.keys(test.content).filter(k => test.content[k]);
                    contents.forEach(cat => {
                        const score = res.grades[cat];
                        const max = test.maxScores?.[cat] || 10;
                        if (score !== undefined) {
                            totalScore += score;
                            maxPossible += max;
                        }
                    });

                    if (maxPossible > 0) {
                        const pct = (totalScore / maxPossible) * 100;
                        sStat.testAverage += pct;
                        sStat.testsTaken += 1;
                        if (pct > sStat.highestTestScore) {
                            sStat.highestTestScore = Math.round(pct);
                        }
                    }
                });
            }
        });

        activeStudents.forEach(s => {
            const sStat = statsMap[s.id];
            if (sStat && sStat.testsTaken > 0) {
                sStat.testAverage = Math.round(sStat.testAverage / sStat.testsTaken);
            }
        });

        return statsMap;
    }, [activeStudents, filteredSessions, dateRange, includeLessons, activeCircle.tests, activeCircle.settings.pointsSettings]);

    // Circle Overall Statistics
    const overallStats = useMemo(() => {
        let totalAttendanceRateSum = 0;
        let totalMemoPagesSum = 0;
        let totalReviewPagesSum = 0;
        let totalPointsSum = 0;
        let totalTestsScoreSum = 0;
        let testTakersCount = 0;

        activeStudents.forEach(s => {
            const stat = studentsStats[s.id];
            if (stat) {
                totalAttendanceRateSum += stat.attendanceRate;
                totalMemoPagesSum += stat.memorizedPages;
                totalReviewPagesSum += stat.reviewedPages;
                totalPointsSum += stat.pointsGained;
                if (stat.testsTaken > 0) {
                    totalTestsScoreSum += stat.testAverage;
                    testTakersCount += 1;
                }
            }
        });

        const activeCount = activeStudents.length;
        return {
            avgAttendanceRate: activeCount > 0 ? Math.round(totalAttendanceRateSum / activeCount) : 100,
            totalMemoPages: totalMemoPagesSum,
            totalReviewPages: totalReviewPagesSum,
            totalPoints: totalPointsSum,
            avgTestScore: testTakersCount > 0 ? Math.round(totalTestsScoreSum / testTakersCount) : 0,
            activeCount,
            sessionsCount: filteredSessions.length
        };
    }, [activeStudents, studentsStats, filteredSessions.length]);

    // Dynamic Period-Specific Attendance Metrics
    const periodAttendanceStats = useMemo(() => {
        let totalSlots = 0;
        let totalPresent = 0;
        let totalLate = 0;
        let totalAbsent = 0;
        let totalExcused = 0;

        filteredSessions.forEach(session => {
            session.students.forEach(ss => {
                // Only active students
                const isActive = activeStudents.some(s => s.id === ss.id);
                if (!isActive) return;

                totalSlots += 1;
                if (ss.attendance === 'present') totalPresent += 1;
                else if (ss.attendance === 'late') totalLate += 1;
                else if (ss.attendance === 'absent') totalAbsent += 1;
                else if (ss.attendance === 'excused') totalExcused += 1;
            });
        });

        const presentRate = totalSlots > 0 ? Math.round((totalPresent / totalSlots) * 100) : 100;
        const lateRate = totalSlots > 0 ? Math.round((totalLate / totalSlots) * 100) : 0;
        const absentRate = totalSlots > 0 ? Math.round((totalAbsent / totalSlots) * 100) : 0;
        const excusedRate = totalSlots > 0 ? Math.round((totalExcused / totalSlots) * 100) : 0;

        // Commitment Index: (Present + 0.5 * Late) / Total slots
        const commitmentIndex = totalSlots > 0 
            ? Math.round(((totalPresent + (totalLate * 0.5)) / totalSlots) * 100) 
            : 100;

        return {
            totalSlots,
            present: totalPresent,
            late: totalLate,
            absent: totalAbsent,
            excused: totalExcused,
            presentRate,
            lateRate,
            absentRate,
            excusedRate,
            commitmentIndex
        };
    }, [filteredSessions, activeStudents]);

    // Overall Evaluation Helper (Calculated strictly based on real metrics, no stars)
    const getOverallEvaluation = (stat: any) => {
        const attendanceScore = stat.attendanceRate || 0;
        const memoScore = Math.min(100, ((stat.memorizedPages || 0) / 10) * 100);
        const reviewScore = Math.min(100, ((stat.reviewedPages || 0) / 15) * 100);
        const studyScore = (memoScore + reviewScore) / 2;
        const testScore = stat.testsTaken > 0 ? stat.testAverage : attendanceScore;

        const totalScore = (attendanceScore * 0.4) + (studyScore * 0.3) + (testScore * 0.3);

        if (totalScore >= 90) return { text: 'ممتاز', color: 'text-emerald-700 bg-emerald-50 font-black' };
        if (totalScore >= 80) return { text: 'جيد جداً', color: 'text-blue-700 bg-blue-50 font-bold' };
        if (totalScore >= 70) return { text: 'جيد', color: 'text-amber-700 bg-amber-50 font-medium' };
        if (totalScore >= 50) return { text: 'مقبول', color: 'text-orange-700 bg-[#FFFBEB] font-normal' };
        return { text: 'يحتاج متابعة', color: 'text-red-700 bg-[#FEF2F2] font-black' };
    };

    // Sort Students by name or order
    const sortedStudentsForReport = useMemo(() => {
        return [...activeStudents].sort((a, b) => a.order - b.order);
    }, [activeStudents]);

    // Split students into pages (chunks) to fit perfectly on A4 pages without overflow
    const studentChunks = useMemo(() => {
        const chunks: Student[][] = [];
        const firstPageSize = orientation === 'landscape' ? 8 : 10;
        const otherPageSize = orientation === 'landscape' ? 14 : 20;
        
        let remaining = [...sortedStudentsForReport];
        if (remaining.length === 0) {
            return [[]]; // At least one empty page to prevent rendering crashes
        }
        
        // Take first page chunk (smaller capacity due to large header and KPIs)
        const firstPage = remaining.splice(0, firstPageSize);
        chunks.push(firstPage);
        
        // Take subsequent pages chunks (larger capacity as there are no header banners)
        while (remaining.length > 0) {
            chunks.push(remaining.splice(0, otherPageSize));
        }
        
        return chunks;
    }, [sortedStudentsForReport, orientation]);

    // Fit to Screen (automatic zoom based on viewport)
    const fitToScreen = () => {
        if (!containerRef.current) return;
        const containerWidth = containerRef.current.clientWidth - 48; // padding
        const pageTargetWidth = orientation === 'landscape' ? 1122 : 794; // approx px
        const scale = containerWidth / pageTargetWidth;
        setZoom(Math.max(0.3, Math.min(scale, 1.25)));
        setPan({ x: 0, y: 0 });
    };

    // Auto fit on view preview or orientation change
    useEffect(() => {
        if (view === 'preview') {
            const timer = setTimeout(() => {
                fitToScreen();
            }, 150);
            return () => clearTimeout(timer);
        }
    }, [view, orientation]);

    // Mouse Panning handlers
    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsDragging(true);
        dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging) return;
        const x = e.clientX - dragStart.current.x;
        const y = e.clientY - dragStart.current.y;
        setPan({ x, y });
    };

    const handleMouseUpOrLeave = () => {
        setIsDragging(false);
    };

    const handleDoubleClick = () => {
        fitToScreen();
    };

    // Touch Support for Mobile (Pinch zoom and drag pan)
    const handleTouchStart = (e: React.TouchEvent) => {
        if (e.touches.length === 1) {
            setIsDragging(true);
            const touch = e.touches[0];
            dragStart.current = { x: touch.clientX - pan.x, y: touch.clientY - pan.y };
        } else if (e.touches.length === 2) {
            setIsDragging(false);
            const t1 = e.touches[0];
            const t2 = e.touches[1];
            const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
            initialTouchDist.current = dist;
            initialTouchZoom.current = zoom;
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (e.touches.length === 1 && isDragging) {
            const touch = e.touches[0];
            const x = touch.clientX - dragStart.current.x;
            const y = touch.clientY - dragStart.current.y;
            setPan({ x, y });
        } else if (e.touches.length === 2 && initialTouchDist.current !== null) {
            const t1 = e.touches[0];
            const t2 = e.touches[1];
            const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
            const factor = dist / initialTouchDist.current;
            const nextZoom = initialTouchZoom.current * factor;
            setZoom(Math.max(0.3, Math.min(nextZoom, 2.5)));
        }
    };

    const handleTouchEnd = () => {
        setIsDragging(false);
        initialTouchDist.current = null;
    };

    // Main Page Content Renderer (Reusable between preview and offscreen export canvas)
    const renderReportPage = (chunk: Student[], pageIndex: number) => {
        const isLandscape = orientation === 'landscape';
        const firstPageSize = isLandscape ? 8 : 10;
        const otherPageSize = isLandscape ? 14 : 20;

        return (
            <>
                {/* Decorative Islamic Frame */}
                <div className="absolute inset-3.5 border border-emerald-800/15 rounded-2xl print:border-emerald-800/20 pointer-events-none"></div>
                <div className="absolute inset-4.5 border-2 border-double border-emerald-800/25 rounded-2xl print:border-emerald-800/30 pointer-events-none"></div>

                {/* Inner corner arabesques */}
                <div className="absolute top-6 right-6 w-6 h-6 border-t-[1.5px] border-r-[1.5px] border-emerald-800/35 rounded-tr-md pointer-events-none"></div>
                <div className="absolute top-6 left-6 w-6 h-6 border-t-[1.5px] border-l-[1.5px] border-emerald-800/35 rounded-tl-md pointer-events-none"></div>
                <div className="absolute bottom-6 right-6 w-6 h-6 border-b-[1.5px] border-r-[1.5px] border-emerald-800/35 rounded-br-md pointer-events-none"></div>
                <div className="absolute bottom-6 left-6 w-6 h-6 border-b-[1.5px] border-l-[1.5px] border-emerald-800/35 rounded-tl-md pointer-events-none"></div>

                <div className="relative z-10 flex flex-col h-full text-black">
                    
                    {/* PAGE 1 ONLY: FULL HERITAGE HEADER & BANNER */}
                    {pageIndex === 0 ? (
                        <>
                            {/* Elegant Header Block */}
                            <div className="flex items-center justify-between pb-3 border-b border-emerald-800/15 gap-4">
                                {/* Right Side: Center Info */}
                                <div className="text-right space-y-0.5 text-[10px] text-gray-600 min-w-[70mm]">
                                    <div className="font-black text-[#105541] text-[13px] leading-tight">{activeCircle.center || 'المركز الرئيسي لتحفيظ القرآن'}</div>
                                    <div className="font-bold text-[9.5px]">مُعدّ التقرير: <span className="text-gray-950 font-black">{getLoggedInUserName() || activeCircle.teacher}</span></div>
                                </div>

                                {/* Center: System Emblem / Circle Logo */}
                                <div className="flex flex-col items-center">
                                    {activeCircle.logo ? (
                                        <div className="relative flex flex-col items-center">
                                            <img 
                                                src={activeCircle.logo} 
                                                alt="Logo" 
                                                className="w-11 h-11 object-contain rounded-xl border border-emerald-800/20 p-0.5 bg-white shadow-sm"
                                                referrerPolicy="no-referrer"
                                            />
                                            <span className="text-[9px] font-black tracking-widest text-emerald-800 mt-1">{activeCircle.circle}</span>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center">
                                            <div className="w-11 h-11 bg-emerald-50 border border-double border-emerald-800/40 text-emerald-800 rounded-xl flex items-center justify-center shadow-inner">
                                                <svg className="w-6 h-6 text-emerald-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                                    <path d="M12 3L1 9L12 15L23 9L12 3Z" strokeLinecap="round" strokeLinejoin="round" />
                                                    <path d="M12 15V21" strokeLinecap="round" strokeLinejoin="round" />
                                                    <path d="M17 17.5V21" strokeLinecap="round" strokeLinejoin="round" />
                                                    <path d="M7 17.5V21" strokeLinecap="round" strokeLinejoin="round" />
                                                    <path d="M12 21H22M12 21H2" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                            </div>
                                            <span className="text-[9px] font-black tracking-widest text-emerald-800 mt-1">{activeCircle.circle}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Left Side: Metadata */}
                                <div className="text-left space-y-0.5 text-[10px] text-gray-600 min-w-[70mm]">
                                    <div>تاريخ الإصدار: <span className="font-mono font-bold text-gray-900">{todayStr}</span></div>
                                    <div>تغطية الفترة: <span className="font-bold text-[#105541]">{periodLabel}</span></div>
                                    <div>عدد الجلسات: <span className="font-mono font-bold text-gray-900">{overallStats.sessionsCount} جلسة</span></div>
                                </div>
                            </div>

                            {/* Report Title Banner */}
                            <div className="text-center space-y-1 my-3">
                                <h2 className="text-[15px] font-black text-[#105541] border-b-[1.5px] border-emerald-800/10 pb-1 inline-block">
                                    {customTitle || defaultTitle}
                                </h2>
                                <p className="text-[9px] text-gray-500 font-medium leading-relaxed max-w-xl mx-auto">
                                    تم توليد هذا التقرير إلكترونياً من قواعد بيانات النظام لرصد وتحليل مستويات الطلاب التعليمية والإدارية للفترة المعنية بدقة وموثوقية عالية.
                                </p>
                            </div>

                            {/* ERP KPI Metrics Panel */}
                            <div className="grid grid-cols-4 gap-3 mb-3">
                                <div className="bg-emerald-50/30 p-2.5 rounded-xl border border-emerald-800/10 text-center space-y-0.5">
                                    <span className="text-[8.5px] font-black text-emerald-800 block">الطلاب المقيدين</span>
                                    <div className="text-lg font-black text-emerald-900 font-mono leading-none">{overallStats.activeCount}</div>
                                    <span className="text-[7.5px] text-gray-500 block">طلاب فاعلين</span>
                                </div>

                                <div className="bg-emerald-50/30 p-2.5 rounded-xl border border-emerald-800/10 text-center space-y-0.5">
                                    <span className="text-[8.5px] font-black text-emerald-800 block">مؤشر الالتزام بالحضور</span>
                                    <div className="text-lg font-black text-[#105541] font-mono leading-none">{periodAttendanceStats.commitmentIndex}%</div>
                                    <div className="w-12 h-1 bg-gray-200 mx-auto rounded-full overflow-hidden mt-0.5">
                                        <div className="bg-[#105541] h-full" style={{ width: `${periodAttendanceStats.commitmentIndex}%` }}></div>
                                    </div>
                                </div>

                                <div className="bg-emerald-50/30 p-2.5 rounded-xl border border-emerald-800/10 text-center space-y-0.5">
                                    <span className="text-[8.5px] font-black text-emerald-800 block">الإنجاز القرآني بالفترة</span>
                                    <div className="text-lg font-black text-emerald-900 font-mono leading-none">
                                        {reportType === 'memorization' || reportType === 'comprehensive' 
                                            ? `${overallStats.totalMemoPages} ص` 
                                            : `${overallStats.totalPoints} ن`
                                        }
                                    </div>
                                    <span className="text-[7.5px] text-gray-500 block truncate">
                                        {reportType === 'memorization' || reportType === 'comprehensive'
                                            ? `مراجعة: ${overallStats.totalReviewPages} صفحة`
                                            : 'نقطة مكتسبة'
                                        }
                                    </span>
                                </div>

                                <div className="bg-emerald-50/30 p-2.5 rounded-xl border border-emerald-800/10 text-center space-y-0.5">
                                    <span className="text-[8.5px] font-black text-emerald-800 block">متوسط درجات الاختبارات</span>
                                    <div className="text-lg font-black text-emerald-900 font-mono leading-none">{overallStats.avgTestScore}%</div>
                                    <span className="text-[7.5px] text-gray-500 block">معدل التحصيل العلمي العام</span>
                                </div>
                            </div>

                            {/* Comparative Visual Attendance Stats Panel (100% Real Period Data) */}
                            <div className="bg-gray-50/50 p-2.5 rounded-xl border border-gray-150 text-[9px] mb-3 text-right" dir="rtl">
                                <div className="flex flex-col space-y-1.5">
                                    <h4 className="font-black text-[9.5px] text-[#105541] border-b pb-1">📊 مؤشر الالتزام والانتظام بالفترة الزمنية المحددة</h4>
                                    <div className="grid grid-cols-4 gap-4 pt-1 text-center">
                                        <div className="space-y-1">
                                            <span className="text-[8.5px] font-bold text-gray-400 block">الحضور الفعلي</span>
                                            <div className="flex items-center justify-center gap-1">
                                                <span className="font-mono font-black text-emerald-700 text-sm">{periodAttendanceStats.presentRate}%</span>
                                                <span className="text-[7.5px] text-gray-400">({periodAttendanceStats.present} ح)</span>
                                            </div>
                                            <div className="w-full h-1.5 bg-gray-200/50 rounded-full overflow-hidden">
                                                <div className="bg-emerald-600 h-full" style={{ width: `${periodAttendanceStats.presentRate}%` }}></div>
                                            </div>
                                        </div>
                                        
                                        <div className="space-y-1">
                                            <span className="text-[8.5px] font-bold text-gray-400 block">الغياب</span>
                                            <div className="flex items-center justify-center gap-1">
                                                <span className="font-mono font-black text-red-600 text-sm">{periodAttendanceStats.absentRate}%</span>
                                                <span className="text-[7.5px] text-gray-400">({periodAttendanceStats.absent} غ)</span>
                                            </div>
                                            <div className="w-full h-1.5 bg-gray-200/50 rounded-full overflow-hidden">
                                                <div className="bg-red-600 h-full" style={{ width: `${periodAttendanceStats.absentRate}%` }}></div>
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            <span className="text-[8.5px] font-bold text-gray-400 block">التأخير</span>
                                            <div className="flex items-center justify-center gap-1">
                                                <span className="font-mono font-black text-amber-600 text-sm">{periodAttendanceStats.lateRate}%</span>
                                                <span className="text-[7.5px] text-gray-400">({periodAttendanceStats.late} ت)</span>
                                            </div>
                                            <div className="w-full h-1.5 bg-gray-200/50 rounded-full overflow-hidden">
                                                <div className="bg-amber-500 h-full" style={{ width: `${periodAttendanceStats.lateRate}%` }}></div>
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            <span className="text-[8.5px] font-bold text-gray-400 block">الاستئذان الموثق</span>
                                            <div className="flex items-center justify-center gap-1">
                                                <span className="font-mono font-black text-blue-600 text-sm">{periodAttendanceStats.excusedRate}%</span>
                                                <span className="text-[7.5px] text-gray-400">({periodAttendanceStats.excused} ع)</span>
                                            </div>
                                            <div className="w-full h-1.5 bg-gray-200/50 rounded-full overflow-hidden">
                                                <div className="bg-blue-500 h-full" style={{ width: `${periodAttendanceStats.excusedRate}%` }}></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        /* RUNNING HEADER FOR SUBSEQUENT PAGES */
                        <div className="flex justify-between items-center pb-1.5 border-b border-gray-200 text-[9px] text-gray-400 font-bold mb-4 text-right" dir="rtl">
                            <span>{customTitle || defaultTitle}</span>
                            <span>الرقم المرجعي: REF-{activeCircle.numericId || '1024'} | الصفحة {pageIndex + 1} من {studentChunks.length}</span>
                        </div>
                    )}

                    {/* STATISTICAL TABLE */}
                    <div className="flex-grow text-right" dir="rtl">
                        <table className="w-full text-right border-collapse text-[10px] border border-gray-900 text-black">
                            <thead>
                                <tr className="bg-gray-100 text-[9px] font-black h-8 text-gray-800">
                                    <th className="border border-gray-900 w-[5%] text-center">م</th>
                                    <th className="border border-gray-900 w-[27%] px-2">اسم الطالب</th>
                                    <th className="border border-gray-900 w-[9%] text-center text-emerald-800">حضور</th>
                                    <th className="border border-gray-900 w-[9%] text-center text-red-600">غياب</th>
                                    <th className="border border-gray-900 w-[9%] text-center text-amber-600">تأخر</th>
                                    <th className="border border-gray-900 w-[9%] text-center text-blue-500">استئذان</th>
                                    <th className="border border-gray-900 w-[11%] text-center">الالتزام</th>
                                    
                                    {/* Dynamic Headers based on type */}
                                    {(reportType === 'comprehensive' || reportType === 'memorization') && (
                                        <>
                                            <th className="border border-gray-900 w-[11%] text-center">الحفظ</th>
                                            <th className="border border-gray-900 w-[11%] text-center">المراجعة</th>
                                        </>
                                    )}

                                    {reportType === 'points' && (
                                        <>
                                            <th className="border border-gray-900 w-[11%] text-center">النقاط</th>
                                            <th className="border border-gray-900 w-[11%] text-center">التميز</th>
                                        </>
                                    )}

                                    {reportType === 'tests' && (
                                        <>
                                            <th className="border border-gray-900 w-[7%] text-center">اختبارات</th>
                                            <th className="border border-gray-900 w-[7%] text-center">أعلى علامة</th>
                                            <th className="border border-gray-900 w-[8%] text-center">المعدل</th>
                                        </>
                                    )}

                                    <th className="border border-gray-900 px-2 text-center w-[15%]">التقييم العام</th>
                                </tr>
                            </thead>
                            <tbody>
                                {chunk.map((student, idx) => {
                                    const absoluteIndex = pageIndex === 0 
                                        ? idx + 1 
                                        : firstPageSize + (pageIndex - 1) * otherPageSize + idx + 1;
                                    
                                    const stat = studentsStats[student.id] || {
                                        attendanceRate: 100, present: 0, late: 0, absent: 0, excused: 0, totalSessions: 0,
                                        memorizedPages: 0, reviewedPages: 0, pointsGained: 0, testAverage: 0, testsTaken: 0, highestTestScore: 0
                                    };
                                    
                                    const evalData = getOverallEvaluation(stat);

                                    return (
                                        <tr key={student.id} className="h-7 text-[9.5px] hover:bg-gray-50 transition-colors">
                                            <td className="border border-gray-900 text-center font-bold bg-gray-50/50">{absoluteIndex}</td>
                                            <td className="border border-gray-900 px-2 font-black text-gray-900">{student.name}</td>
                                            <td className="border border-gray-900 text-center font-mono font-bold text-emerald-800 bg-emerald-50/5">{stat.present}</td>
                                            <td className="border border-gray-900 text-center font-mono font-bold text-red-700 bg-red-50/5">{stat.absent}</td>
                                            <td className="border border-gray-900 text-center font-mono font-bold text-amber-700 bg-amber-50/5">{stat.late}</td>
                                            <td className="border border-gray-900 text-center font-mono font-bold text-blue-700 bg-blue-50/5">{stat.excused}</td>
                                            <td className="border border-gray-900 text-center font-mono font-black text-gray-900">{stat.attendanceRate}%</td>

                                            {/* Dynamic Columns */}
                                            {(reportType === 'comprehensive' || reportType === 'memorization') && (
                                                <>
                                                    <td className="border border-gray-900 text-center font-mono font-extrabold text-[#105541] bg-emerald-50/10">{stat.memorizedPages} ص</td>
                                                    <td className="border border-gray-900 text-center font-mono font-bold text-gray-600 bg-gray-50/10">{stat.reviewedPages} ص</td>
                                                </>
                                            )}

                                            {reportType === 'points' && (
                                                <>
                                                    <td className="border border-gray-900 text-center font-mono font-extrabold text-amber-700 bg-amber-50/10">{stat.pointsGained} ن</td>
                                                    <td className="border border-gray-900 text-center text-[8.5px] font-black text-amber-800 bg-amber-50/20 px-1 py-0.5 truncate">
                                                        {stat.pointsGained >= 200 ? '💎 ماسي' : stat.pointsGained >= 120 ? '🥇 ذهبي' : stat.pointsGained >= 60 ? '🥈 فضي' : '🥉 برونزي'}
                                                    </td>
                                                </>
                                            )}

                                            {reportType === 'tests' && (
                                                <>
                                                    <td className="border border-gray-900 text-center font-mono">{stat.testsTaken}</td>
                                                    <td className="border border-gray-900 text-center font-mono font-bold text-emerald-800">{stat.highestTestScore}%</td>
                                                    <td className="border border-gray-900 text-center font-mono font-extrabold text-emerald-700 bg-emerald-50/10">{stat.testAverage}%</td>
                                                </>
                                            )}

                                            <td className={`border border-gray-900 text-center text-[8.5px] px-1.5 font-bold ${evalData.color}`}>
                                                {evalData.text}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* PAGE 1 OR LAST PAGE SPECIFIC ATTACHMENTS */}
                    {pageIndex === studentChunks.length - 1 && (
                        <>
                            {/* Signature Block */}
                            {includeSignatures && (
                                <div className="grid grid-cols-3 gap-4 text-center text-[9px] text-gray-600 font-bold border-t border-gray-150 pt-2.5 mt-4 text-right" dir="rtl">
                                    <div className="space-y-3">
                                        <div>معلم الحلقة</div>
                                        <div className="h-[0.5px] w-20 bg-gray-300 mx-auto"></div>
                                        <div className="text-[8px] text-gray-400 font-medium">التوقيع: ..........................</div>
                                    </div>
                                    <div className="space-y-3">
                                        <div>المشرف التربوي</div>
                                        <div className="h-[0.5px] w-20 bg-gray-350 mx-auto"></div>
                                        <div className="text-[8px] text-gray-400 font-medium">التوقيع: ..........................</div>
                                    </div>
                                    <div className="space-y-3">
                                        <div>إدارة المركز</div>
                                        <div className="h-[0.5px] w-20 bg-gray-350 mx-auto"></div>
                                        <div className="text-[8px] text-gray-400 font-medium">الختم والتوقيع: ....................</div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {/* ABSOLUTE DOCUMENT FOOTER */}
                    <div className="absolute left-0 right-0 bottom-0 pt-2 border-t border-gray-200 flex items-center justify-between text-[8px] text-gray-500 pb-0.5 font-bold text-right" dir="rtl">
                        <div>
                            {showPrintDate && (
                                <span>تم إصدار هذا التقرير في: {new Date().toLocaleString('ar', { dateStyle: 'long', timeStyle: 'short' })}</span>
                            )}
                        </div>

                        <div className="flex items-center gap-2 bg-gray-50/50 p-1 px-3 rounded-lg border border-gray-150 shadow-sm leading-tight text-right">
                            <div className="flex flex-col text-right">
                                <span className="font-extrabold text-[7.5px] text-[#105541]">نظام حلقة الموثق والمقيد برمز الاستجابة السريع</span>
                                <span className="text-[6.5px] text-gray-400 font-normal">لمتابعة أداء الطلاب الفوري واللحظي</span>
                            </div>
                            <img 
                                src="https://api.qrserver.com/v1/create-qr-code/?size=60x60&data=https://hlqt.vercel.app" 
                                alt="QR Code" 
                                className="w-6 h-6 border p-0.5 rounded bg-white shadow-sm" 
                                referrerPolicy="no-referrer"
                            />
                        </div>

                        <div>
                            {showPageNumbers && (
                                <span>صفحة {pageIndex + 1} من {studentChunks.length}</span>
                            )}
                        </div>
                    </div>

                </div>
            </>
        );
    };

    return (
        <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6 pb-20 max-w-7xl mx-auto"
            dir="rtl"
        >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b dark:border-gray-700 no-print">
                <div className="flex items-center gap-3">
                    <button 
                        onClick={view === 'select' ? onBack : view === 'setup' ? () => setView('select') : () => setView('setup')}
                        className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-2xl transition-all active:scale-95 text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-gray-800 shadow-sm"
                        aria-label="رجوع"
                    >
                        <FaArrowLeft />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-primary dark:text-accent">نظام التقارير المتقدم</h1>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 font-medium">لوحة تحليل البيانات والتقارير الإدارية الجاهزة للطباعة</p>
                    </div>
                </div>
                {view === 'preview' && (
                    <div className="relative">
                        <button
                            onClick={() => setIsShareDropdownOpen(!isShareDropdownOpen)}
                            className="flex items-center gap-2 px-5 py-2.5 bg-[#105541] hover:bg-[#105541]/95 text-white font-bold rounded-2xl shadow-lg hover:shadow-emerald-600/10 transition-all active:scale-95 text-xs cursor-pointer z-50 relative"
                        >
                            <Share2 size={13} />
                            <span>مشاركة التقرير 📥</span>
                            <ChevronDownLucide size={11} className={`transition-transform duration-300 ${isShareDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>
                        
                        <AnimatePresence>
                            {isShareDropdownOpen && (
                                <>
                                    <div className="fixed inset-0 z-45" onClick={() => setIsShareDropdownOpen(false)} />
                                    <motion.div
                                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 8, scale: 0.95 }}
                                        className="absolute left-0 mt-2 w-56 rounded-2xl bg-white dark:bg-gray-800 border border-gray-150 dark:border-gray-700 shadow-xl z-50 overflow-hidden text-right origin-top-left"
                                    >
                                        <button
                                            onClick={async () => {
                                                setIsShareDropdownOpen(false);
                                                setIsExporting(true);
                                                setExportProgress('جاري قراءة وتجميع صفحات المستند...');
                                                try {
                                                    const pages = document.querySelectorAll('#export-target-container .report-page-element');
                                                    if (pages.length === 0) {
                                                        showToast('خطأ: لا توجد صفحات للتصدير', 'error');
                                                        setIsExporting(false);
                                                        return;
                                                    }

                                                    const pdf = new jsPDF({
                                                        orientation: orientation === 'landscape' ? 'landscape' : 'portrait',
                                                        unit: 'mm',
                                                        format: 'a4'
                                                    });

                                                    const pageWidth = pdf.internal.pageSize.getWidth();
                                                    const pageHeight = pdf.internal.pageSize.getHeight();

                                                    for (let i = 0; i < pages.length; i++) {
                                                        setExportProgress(`جاري معالجة الصفحة ${i + 1} من ${pages.length}...`);
                                                        
                                                        const canvas = await html2canvas(pages[i] as HTMLElement, {
                                                            scale: 2.5, // Crisp high density
                                                            useCORS: true,
                                                            logging: false,
                                                            backgroundColor: '#ffffff',
                                                            windowWidth: orientation === 'landscape' ? 1122 : 794
                                                        });

                                                        const imgData = canvas.toDataURL('image/jpeg', 0.95);
                                                        if (i > 0) pdf.addPage();
                                                        pdf.addImage(imgData, 'JPEG', 0, 0, pageWidth, pageHeight);
                                                    }

                                                    setExportProgress('جاري حفظ وتصدير ملف PDF...');
                                                    pdf.save(`${customTitle || defaultTitle}.pdf`);
                                                    showToast('تم تصدير ملف PDF بنجاح 📋', 'success');
                                                } catch (err) {
                                                    console.error(err);
                                                    showToast('حدث خطأ أثناء توليد ملف PDF', 'error');
                                                } finally {
                                                    setIsExporting(false);
                                                }
                                            }}
                                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 text-xs text-gray-750 dark:text-gray-200 transition-colors border-b border-gray-100 dark:border-gray-700 font-bold cursor-pointer"
                                        >
                                            <FileText size={15} className="text-emerald-600" />
                                            <div className="flex flex-col text-right">
                                                <span>تصدير كملف PDF</span>
                                                <span className="text-[8px] text-gray-400 font-normal">جاهز للطباعة والتحميل بنسبة تطابق 100%</span>
                                            </div>
                                        </button>

                                        <button
                                            onClick={async () => {
                                                setIsShareDropdownOpen(false);
                                                setIsExporting(true);
                                                setExportProgress('جاري تصوير صفحات التقرير...');
                                                try {
                                                    const pages = document.querySelectorAll('#export-target-container .report-page-element');
                                                    if (pages.length === 0) {
                                                        showToast('خطأ: لا توجد صفحات للتصدير', 'error');
                                                        setIsExporting(false);
                                                        return;
                                                    }

                                                    for (let i = 0; i < pages.length; i++) {
                                                        setExportProgress(`جاري تصوير الصفحة ${i + 1} من ${pages.length}...`);
                                                        
                                                        const canvas = await html2canvas(pages[i] as HTMLElement, {
                                                            scale: 2.5,
                                                            useCORS: true,
                                                            logging: false,
                                                            backgroundColor: '#ffffff',
                                                            windowWidth: orientation === 'landscape' ? 1122 : 794
                                                        });

                                                        const imgData = canvas.toDataURL('image/png');
                                                        const link = document.createElement('a');
                                                        link.href = imgData;
                                                        link.download = `${customTitle || defaultTitle}_صفحة_${i + 1}.png`;
                                                        link.click();
                                                    }

                                                    showToast('تم تصدير صور التقرير بنجاح 🖼️', 'success');
                                                } catch (err) {
                                                    console.error(err);
                                                    showToast('حدث خطأ أثناء تصدير الصور', 'error');
                                                } finally {
                                                    setIsExporting(false);
                                                }
                                            }}
                                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 text-xs text-gray-750 dark:text-gray-200 transition-colors font-bold cursor-pointer"
                                        >
                                            <ImageIcon size={15} className="text-blue-500" />
                                            <div className="flex flex-col text-right">
                                                <span>تصدير كصور عالية الدقة</span>
                                                <span className="text-[8px] text-gray-400 font-normal">حفظ كل صفحة كصورة PNG منفصلة</span>
                                            </div>
                                        </button>
                                    </motion.div>
                                </>
                            )}
                        </AnimatePresence>
                    </div>
                )}
            </div>

            {/* View Switching Router */}
            <AnimatePresence mode="wait">
                {/* 1. SELECT REPORT TYPE */}
                {view === 'select' && (
                    <motion.div
                        key="select-view"
                        initial={{ opacity: 0, x: 15 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -15 }}
                        className="space-y-6"
                    >
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {/* Card 1: Comprehensive */}
                            <button
                                onClick={() => { setReportType('comprehensive'); setView('setup'); }}
                                className="p-6 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 text-right hover:border-emerald-500 dark:hover:border-accent shadow-sm hover:shadow-md transition-all group flex flex-col justify-between h-[180px]"
                            >
                                <div className="space-y-2">
                                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-100 dark:border-emerald-900/30 group-hover:scale-110 transition-transform">
                                        <FaFileAlt size={20} />
                                    </div>
                                    <h3 className="font-bold text-sm text-gray-800 dark:text-white mt-1">التقرير الشامل للحلقة</h3>
                                    <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-2">ملخص أداء الحلقة الشامل الذي يحتوي على الإحصائيات العامة ومستوى حضور وحفظ الطلاب.</p>
                                </div>
                                <span className="text-[10px] text-emerald-600 dark:text-accent font-bold mt-2 flex items-center gap-1 self-start">ابدأ الإعداد ←</span>
                            </button>

                            {/* Card 2: Attendance */}
                            <button
                                onClick={() => { setReportType('attendance'); setView('setup'); }}
                                className="p-6 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 text-right hover:border-blue-500 dark:hover:border-accent shadow-sm hover:shadow-md transition-all group flex flex-col justify-between h-[180px]"
                            >
                                <div className="space-y-2">
                                    <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-100 dark:border-blue-900/30 group-hover:scale-110 transition-transform">
                                        <FaCalendarAlt size={20} />
                                    </div>
                                    <h3 className="font-bold text-sm text-gray-800 dark:text-white mt-1">تقرير الحضور والغياب</h3>
                                    <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-2">تحليل دقيق لالتزام الطلاب، نسب الغياب، التأخير، والأعطال المرصودة في الفترة.</p>
                                </div>
                                <span className="text-[10px] text-blue-600 dark:text-accent font-bold mt-2 flex items-center gap-1 self-start">ابدأ الإعداد ←</span>
                            </button>

                            {/* Card 3: Points */}
                            <button
                                onClick={() => { setReportType('points'); setView('setup'); }}
                                className="p-6 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 text-right hover:border-amber-500 dark:hover:border-accent shadow-sm hover:shadow-md transition-all group flex flex-col justify-between h-[180px]"
                            >
                                <div className="space-y-2">
                                    <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-100 dark:border-amber-900/30 group-hover:scale-110 transition-transform">
                                        <FaTrophy size={20} />
                                    </div>
                                    <h3 className="font-bold text-sm text-gray-800 dark:text-white mt-1">تقرير النقاط والتحفيز</h3>
                                    <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-2">قائمة الشرف، مجموع النقاط المكتسبة، والمكافآت الإضافية لتشجيع التنافس.</p>
                                </div>
                                <span className="text-[10px] text-amber-600 dark:text-accent font-bold mt-2 flex items-center gap-1 self-start">ابدأ الإعداد ←</span>
                            </button>

                            {/* Card 4: Memorization */}
                            <button
                                onClick={() => { setReportType('memorization'); setView('setup'); }}
                                className="p-6 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 text-right hover:border-purple-500 dark:hover:border-accent shadow-sm hover:shadow-md transition-all group flex flex-col justify-between h-[180px]"
                            >
                                <div className="space-y-2">
                                    <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-100 dark:border-purple-900/30 group-hover:scale-110 transition-transform">
                                        <FaBook size={20} />
                                    </div>
                                    <h3 className="font-bold text-sm text-gray-800 dark:text-white mt-1">تقرير مستويات الحفظ والمراجعة</h3>
                                    <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-2">متابعة دقيقة لكميات الصفحات المحفوظة والمراجعة ومعدل التقدم اليومي لكل طالب.</p>
                                </div>
                                <span className="text-[10px] text-purple-600 dark:text-accent font-bold mt-2 flex items-center gap-1 self-start">ابدأ الإعداد ←</span>
                            </button>

                            {/* Card 5: Tests */}
                            <button
                                onClick={() => { setReportType('tests'); setView('setup'); }}
                                className="p-6 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 text-right hover:border-rose-500 dark:hover:border-accent shadow-sm hover:shadow-md transition-all group flex flex-col justify-between h-[180px]"
                            >
                                <div className="space-y-2">
                                    <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-100 dark:border-rose-900/30 group-hover:scale-110 transition-transform">
                                        <FaAward size={20} />
                                    </div>
                                    <h3 className="font-bold text-sm text-gray-800 dark:text-white mt-1">تقرير الاختبارات والخطط</h3>
                                    <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-2">ملخص شامل لنتائج الاختبارات الدورية ومستوى تقدم الطلاب مقارنة بالخطط المقررة.</p>
                                </div>
                                <span className="text-[10px] text-rose-600 dark:text-accent font-bold mt-2 flex items-center gap-1 self-start">ابدأ الإعداد ←</span>
                            </button>

                            {/* Card 6: Smart Recitation */}
                            <button
                                onClick={() => { setShowSmartFormModal(true); }}
                                className="p-6 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 text-right hover:border-emerald-500 dark:hover:border-accent shadow-sm hover:shadow-md transition-all group flex flex-col justify-between h-[180px]"
                            >
                                <div className="space-y-2">
                                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-100 dark:border-emerald-900/30 group-hover:scale-110 transition-transform">
                                        <FaFilePdf size={20} />
                                    </div>
                                    <h3 className="font-bold text-sm text-gray-800 dark:text-white mt-1">كشف التسميع</h3>
                                    <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-2">توليد كشف تسميع ذكي للطباعة الورقية والإدخال التلقائي للبيانات وحفظ التقدم عبر الكاميرا.</p>
                                </div>
                                <span className="text-[10px] text-emerald-600 dark:text-accent font-bold mt-2 flex items-center gap-1 self-start">فتح الأداة ←</span>
                            </button>
                        </div>
                    </motion.div>
                )}

                {/* 2. REPORT SETUP SCREEN */}
                {view === 'setup' && (
                    <motion.div
                        key="setup-view"
                        initial={{ opacity: 0, x: 15 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -15 }}
                        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
                    >
                        {/* Settings Form */}
                        <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-6">
                            <div>
                                <h2 className="text-sm font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                    <FaSlidersH className="text-emerald-600" />
                                    <span>إعدادات التقرير المخصص</span>
                                </h2>
                                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">قم بتعديل خيارات العرض والفلترة لاستخراج التقرير المطلوب</p>
                            </div>

                            {/* Period Selection (Google Analytics Style) */}
                            <div className="space-y-2.5">
                                <label className="text-[11px] font-bold text-gray-700 dark:text-gray-300">حدد الفترة الزمنية لتغطية التقرير:</label>
                                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                                    {[
                                        { id: 'last7', label: 'آخر 7 أيام' },
                                        { id: 'last30', label: 'آخر 30 يوماً' },
                                        { id: 'currentMonth', label: 'الشهر الحالي' },
                                        { id: 'lastMonth', label: 'الشهر السابق' },
                                        { id: 'allTime', label: 'كامل الفترة' },
                                        { id: 'custom', label: 'مخصص...' }
                                    ].map(item => (
                                        <button
                                            key={item.id}
                                            onClick={() => setPeriod(item.id as any)}
                                            className={`py-2 px-1 text-center rounded-xl text-[10px] font-bold transition-all ${
                                                period === item.id 
                                                ? 'bg-[#105541] text-white shadow-sm' 
                                                : 'bg-gray-50 hover:bg-gray-100 dark:bg-gray-900/50 dark:hover:bg-gray-900 text-gray-600 dark:text-gray-400 border border-gray-100 dark:border-gray-800'
                                            }`}
                                        >
                                            {item.label}
                                        </button>
                                    ))}
                                </div>

                                {period === 'custom' && (
                                    <div className="grid grid-cols-2 gap-3 pt-2">
                                        <div className="space-y-1">
                                            <span className="text-[9px] font-bold text-gray-400">تاريخ البدء</span>
                                            <input 
                                                type="date" 
                                                value={customStartDate}
                                                onChange={(e) => setCustomStartDate(e.target.value)}
                                                className="w-full text-xs p-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 outline-none text-gray-800 dark:text-white"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <span className="text-[9px] font-bold text-gray-400">تاريخ الانتهاء</span>
                                            <input 
                                                type="date" 
                                                value={customEndDate}
                                                onChange={(e) => setCustomEndDate(e.target.value)}
                                                className="w-full text-xs p-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 outline-none text-gray-800 dark:text-white"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Edit Report Title */}
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-gray-700 dark:text-gray-300">عنوان التقرير (يظهر في الهيدر):</label>
                                <input 
                                    type="text" 
                                    value={customTitle}
                                    onChange={(e) => setCustomTitle(e.target.value)}
                                    className="w-full text-xs p-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 outline-none font-semibold text-gray-800 dark:text-white focus:border-[#105541]"
                                    placeholder="أدخل عنواناً مخصصاً للتقرير"
                                />
                            </div>

                            {/* Options are auto-configured for premium presentation */}

                            {/* Action Buttons */}
                            <div className="flex gap-3 pt-4 border-t dark:border-gray-700">
                                <button
                                    onClick={() => setView('preview')}
                                    className="flex-1 py-3 bg-[#105541] hover:bg-[#105541]/95 text-white font-bold rounded-2xl shadow-lg hover:shadow-emerald-600/10 transition-all text-xs"
                                >
                                    توليد ومعاينة التقرير 📊
                                </button>
                                <button
                                    onClick={() => setView('select')}
                                    className="px-6 py-3 bg-gray-50 hover:bg-gray-100 dark:bg-gray-900/50 dark:hover:bg-gray-900 text-gray-600 dark:text-gray-400 border border-gray-100 dark:border-gray-800 font-bold rounded-2xl transition-all text-xs"
                                >
                                    إلغاء
                                </button>
                            </div>
                        </div>

                        {/* Summary Side Widget */}
                        <div className="bg-emerald-50/50 dark:bg-gray-900/30 p-6 rounded-3xl border border-emerald-100/30 dark:border-gray-800 shadow-sm flex flex-col justify-between h-fit space-y-6">
                            <div className="space-y-4">
                                <div>
                                    <h3 className="font-extrabold text-xs text-emerald-800 dark:text-emerald-400 uppercase tracking-wider">نظرة عامة على البيانات</h3>
                                    <p className="text-[10px] text-gray-500 mt-0.5">البيانات التي سيتم تضمينها بناءً على الفلترة الحالية</p>
                                </div>

                                <div className="space-y-2 text-xs">
                                    <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
                                        <span className="text-gray-500 dark:text-gray-400">الحلقة المستهدفة:</span>
                                        <span className="font-bold text-gray-800 dark:text-gray-200">{activeCircle.circle}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
                                        <span className="text-gray-500 dark:text-gray-400">إجمالي الطلاب الفاعلين:</span>
                                        <span className="font-bold text-gray-800 dark:text-gray-200">{overallStats.activeCount} طالب</span>
                                    </div>
                                    <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
                                        <span className="text-gray-500 dark:text-gray-400">الجلسات المكتشفة في الفترة:</span>
                                        <span className="font-bold text-gray-800 dark:text-gray-200">{overallStats.sessionsCount} جلسة</span>
                                    </div>
                                    <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
                                        <span className="text-gray-500 dark:text-gray-400">نسبة الحضور المتوقعة:</span>
                                        <span className="font-bold text-emerald-600 dark:text-accent">{overallStats.avgAttendanceRate}%</span>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-400 text-[10px] leading-relaxed">
                                <FaInfoCircle className="inline ml-1 mb-0.5 text-emerald-600" />
                                <strong>نصيحة المعاينة:</strong> ننصح بترك تخطيط الصفحة على الوضع <strong>الأفقي (Landscape)</strong> عند التصدير لملف PDF ليتم تمثيل البيانات وجداول الموازنة والرسوم البيانية بشكل احترافي وأكثر اتساعاً.
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* 3. REPORT PREVIEW & PRINT MODULE */}
                {view === 'preview' && (
                    <motion.div
                        key="preview-view"
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        className="space-y-6"
                    >
                        {/* Control Panel (Not Printed) */}
                        <div className="no-print p-4 bg-white dark:bg-gray-800 rounded-3xl border border-gray-150 dark:border-gray-700 shadow-sm flex flex-wrap items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setView('setup')}
                                    className="flex items-center gap-1.5 px-4 py-2 bg-gray-50 hover:bg-gray-100 dark:bg-gray-900 dark:hover:bg-gray-950 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-750 font-bold rounded-xl transition-all active:scale-95 text-xs cursor-pointer"
                                >
                                    <RotateCcw size={12} />
                                    <span>تعديل الإعدادات</span>
                                </button>
                                
                                <div className="h-5 w-[1px] bg-gray-200 dark:bg-gray-700" />
                                
                                {/* Zoom Controls */}
                                <div className="flex items-center gap-1 bg-gray-50 dark:bg-gray-900 p-1 rounded-xl border border-gray-150 dark:border-gray-750">
                                    <button 
                                        onClick={() => setZoom(z => Math.max(0.3, z - 0.05))} 
                                        className="p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors cursor-pointer"
                                        title="تصغير"
                                    >
                                        <ZoomOut size={13} />
                                    </button>
                                    <span className="text-[10px] font-mono font-bold text-gray-600 dark:text-gray-300 min-w-[40px] text-center">
                                        {Math.round(zoom * 100)}%
                                    </span>
                                    <button 
                                        onClick={() => setZoom(z => Math.min(2.0, z + 0.05))} 
                                        className="p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors cursor-pointer"
                                        title="تكبير"
                                    >
                                        <ZoomIn size={13} />
                                    </button>
                                    <button
                                        onClick={fitToScreen}
                                        className="p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors border-r border-gray-200 dark:border-gray-700 mr-0.5 cursor-pointer"
                                        title="ملاءمة العرض"
                                    >
                                        <RefreshCw size={11} />
                                    </button>
                                </div>
                            </div>

                            {/* Page Navigation */}
                            <div className="flex items-center gap-2">
                                <button
                                    disabled={activePageIndex === 0}
                                    onClick={() => {
                                        setActivePageIndex(p => Math.max(0, p - 1));
                                        setPan({ x: 0, y: 0 }); // reset pan on page change
                                    }}
                                    className="p-2 bg-gray-50 hover:bg-gray-100 dark:bg-gray-900 hover:text-gray-900 dark:hover:text-white disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-xs font-bold transition-all border border-gray-200 dark:border-gray-750 flex items-center gap-1 cursor-pointer"
                                >
                                    <span>←</span>
                                    <span>الصفحة السابقة</span>
                                </button>
                                
                                <span className="text-xs font-bold text-gray-600 dark:text-gray-300 px-2">
                                    الصفحة <span className="font-mono text-emerald-600">{activePageIndex + 1}</span> من <span className="font-mono">{studentChunks.length}</span>
                                </span>

                                <button
                                    disabled={activePageIndex === studentChunks.length - 1}
                                    onClick={() => {
                                        setActivePageIndex(p => Math.min(studentChunks.length - 1, p + 1));
                                        setPan({ x: 0, y: 0 }); // reset pan on page change
                                    }}
                                    className="p-2 bg-gray-50 hover:bg-gray-100 dark:bg-gray-900 hover:text-gray-900 dark:hover:text-white disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-xs font-bold transition-all border border-gray-200 dark:border-gray-750 flex items-center gap-1 cursor-pointer"
                                >
                                    <span>الصفحة التالية</span>
                                    <span>→</span>
                                </button>
                            </div>
                        </div>

                        {/* Floating User Hint Info (Remains on screen, tells user they can pan and pinch) */}
                        <div className="no-print flex items-center justify-between px-4 py-2 bg-emerald-50/45 dark:bg-emerald-950/10 border border-emerald-100/30 rounded-2xl text-[10px] text-emerald-800 dark:text-emerald-400 font-semibold shadow-inner">
                            <span>💡 يمكنك سحب الصفحة بالماوس أو التمرير بإصبعين للتنقل بحرية والتكبير داخل شاشة المعاينة. انقر مرتين لإعادة الضبط.</span>
                            <span className="font-mono text-[9px] bg-emerald-100/55 dark:bg-emerald-900/30 px-2 py-0.5 rounded-lg border border-emerald-200/20">تخطيط A4 ثابت</span>
                        </div>

                        {/* Interactive Printable A4 Canvas Container */}
                        <div 
                            ref={containerRef}
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUpOrLeave}
                            onMouseLeave={handleMouseUpOrLeave}
                            onTouchStart={handleTouchStart}
                            onTouchMove={handleTouchMove}
                            onTouchEnd={handleTouchEnd}
                            className={`bg-gray-150/50 dark:bg-gray-950/75 rounded-[2rem] p-4 sm:p-6 border border-gray-200 dark:border-gray-800 flex flex-col items-center justify-start overflow-hidden min-h-[75vh] relative custom-scrollbar print:bg-white print:p-0 print:border-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                        >
                            {/* Viewport for scaling */}
                            <div 
                                className="transition-transform duration-100 ease-out select-none"
                                style={{ 
                                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                                    transformOrigin: 'center top',
                                    width: orientation === 'landscape' ? '297mm' : '210mm',
                                    height: orientation === 'landscape' ? '210mm' : '297mm',
                                }}
                            >
                                <div 
                                    className="report-page-element bg-white text-black shadow-2xl relative flex flex-col overflow-hidden shrink-0 border border-gray-250/30"
                                    style={{
                                        width: orientation === 'landscape' ? '297mm' : '210mm',
                                        height: orientation === 'landscape' ? '210mm' : '297mm',
                                        padding: orientation === 'landscape' ? '12mm 15mm' : '15mm 15mm',
                                        boxSizing: 'border-box',
                                        fontFamily: '"Tajawal", "Inter", sans-serif',
                                    }}
                                    onDoubleClick={handleDoubleClick}
                                >
                                    {renderReportPage(studentChunks[activePageIndex] || [], activePageIndex)}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Offscreen Target Container for Perfect 100% High-Fidelity Exports */}
            <div 
                id="export-target-container" 
                className="absolute left-[-9999px] top-[-9999px] no-print"
                style={{ 
                    position: 'absolute', 
                    left: '-9999px', 
                    top: '-9999px',
                    width: orientation === 'landscape' ? '297mm' : '210mm',
                }}
            >
                {studentChunks.map((chunk, pageIndex) => (
                    <div 
                        key={`export-page-${pageIndex}`}
                        className="report-page-element bg-white text-black shadow-none relative flex flex-col overflow-hidden shrink-0"
                        style={{
                            width: orientation === 'landscape' ? '297mm' : '210mm',
                            height: orientation === 'landscape' ? '210mm' : '297mm',
                            padding: orientation === 'landscape' ? '12mm 15mm' : '15mm 15mm',
                            boxSizing: 'border-box',
                            fontFamily: '"Tajawal", "Inter", sans-serif',
                            backgroundColor: '#ffffff'
                        }}
                    >
                        {renderReportPage(chunk, pageIndex)}
                    </div>
                ))}
            </div>

            {/* Global Self-Contained Toast Render */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[300] flex items-center gap-2 px-5 py-2.5 rounded-full shadow-2xl backdrop-blur-md text-xs font-bold text-white ${
                            toast.type === 'success' ? 'bg-emerald-600/95 border border-emerald-500/30' :
                            toast.type === 'error' ? 'bg-red-600/95 border border-red-500/30' :
                            'bg-blue-600/95 border border-blue-500/30'
                        }`}
                    >
                        <span>{toast.message}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Premium Progress / Loading Overlay for High-Quality PDF Render */}
            <AnimatePresence>
                {isExporting && (
                    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[500] flex flex-col items-center justify-center p-6 text-center select-none" dir="rtl">
                        <motion.div 
                            initial={{ scale: 0.92, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.92, opacity: 0 }}
                            className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-8 max-w-sm w-full shadow-2xl space-y-6"
                        >
                            <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
                                <RefreshCw className="text-[#105541] animate-spin" size={32} />
                            </div>
                            <div className="space-y-2">
                                <h3 className="font-extrabold text-sm text-gray-800 dark:text-white">جاري معالجة المستند الموثق</h3>
                                <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-relaxed">
                                    يرجى عدم إغلاق هذه الصفحة أو إلغاء المعالجة. نقوم بالتقاط صفحات A4 وبناء المستند بجودة طباعة كاملة.
                                </p>
                            </div>
                            <div className="bg-emerald-50 dark:bg-emerald-950/20 px-4 py-2.5 rounded-xl border border-emerald-100/35 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-400 text-[10px] font-mono font-bold">
                                {exportProgress}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <SmartRecitationFormModal
                isOpen={showSmartFormModal}
                onClose={() => setShowSmartFormModal(false)}
                circleData={activeCircle}
                addToast={showToast}
            />
        </motion.div>
    );
};

export default Reports;

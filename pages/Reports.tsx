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
    Award as AwardLucide, Star as StarLucide, RefreshCw, X as XLucide,
    Users, Upload, Trash2, Filter, CheckSquare, Square, Eye, EyeOff, Layout,
    ArrowUpDown, SlidersHorizontal, Layers, Search, FileCheck
} from 'lucide-react';
import { CircleData, Student, Session, Test } from '../types';
import { formatDate, formatPagesCount, calculatePagesCount, getPeriodSurahStats, getStudentSurahSummaryForPeriod } from '../utils/helpers';
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
    const [period, setPeriod] = useState<'today' | 'last7' | 'last30' | 'currentMonth' | 'lastMonth' | 'allTime' | 'custom'>('last30');
    
    // Default custom date ranges (last 30 days)
    const todayStr = new Date().toISOString().split('T')[0];
    const thirtyDaysAgoStr = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const [customStartDate, setCustomStartDate] = useState(thirtyDaysAgoStr);
    const [customEndDate, setCustomEndDate] = useState(todayStr);

    // Show/Hide stats in report
    const [showStatsInReport, setShowStatsInReport] = useState<boolean>(true);

    // Student selection state
    const [studentSelectionType, setStudentSelectionType] = useState<'all' | 'level' | 'manual'>('all');
    const [selectedLevel, setSelectedLevel] = useState<string>('all');
    const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
    const [studentSearchQuery, setStudentSearchQuery] = useState<string>('');

    // Student sorting state
    const [sortBy, setSortBy] = useState<'default' | 'performance' | 'name' | 'attendance' | 'memorization'>('default');

    // Custom report logo state
    const [customReportLogo, setCustomReportLogo] = useState<string>('');
    const logoFileInputRef = useRef<HTMLInputElement>(null);

    // Custom teacher name in report header (saved to localStorage)
    const [customTeacherName, setCustomTeacherName] = useState<string>(() => {
        try {
            return localStorage.getItem('tahfeez_custom_report_teacher_text') || '';
        } catch {
            return '';
        }
    });

    useEffect(() => {
        try {
            if (customTeacherName !== undefined) {
                localStorage.setItem('tahfeez_custom_report_teacher_text', customTeacherName);
            }
        } catch (e) {
            console.error("Error saving custom teacher text to localStorage", e);
        }
    }, [customTeacherName]);

    // Format 12-hour time with Arabic AM/PM
    const formatTime12 = (date: Date = new Date()) => {
        let hours = date.getHours();
        const minutes = date.getMinutes().toString().padStart(2, '0');
        const ampm = hours >= 12 ? 'م' : 'ص';
        hours = hours % 12;
        hours = hours ? hours : 12;
        return `${hours}:${minutes} ${ampm}`;
    };

    // Toggle options
    const [includeLessons, setIncludeLessons] = useState(true);
    const [includeHomework, setIncludeHomework] = useState(true);
    const [includeSignatures, setIncludeSignatures] = useState(true);
    const [showPrintDate, setShowPrintDate] = useState(true);
    const [showPageNumbers, setShowPageNumbers] = useState(true);
    const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('landscape');
    
    // Editable title
    const [customTitle, setCustomTitle] = useState('');

    // Collapsible section for additional settings in setup view
    const [showAdditionalSettings, setShowAdditionalSettings] = useState(false);

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
        link.href = './fonts/google-fonts.css';
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

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const result = event.target?.result as string;
                if (result) {
                    setCustomReportLogo(result);
                    showToast('تم تحديث شعار التقرير بنجاح 🖼️', 'success');
                }
            };
            reader.readAsDataURL(file);
        }
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
            case 'today': {
                start = todayStr;
                end = todayStr;
                break;
            }
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

    // Format date string to Arabic with day name
    const formatDateWithDay = (dateStr: string) => {
        if (!dateStr) return '';
        if (dateStr === '1970-01-01') return 'بداية التأسيس';
        try {
            const parts = dateStr.split('-');
            if (parts.length === 3) {
                const year = parseInt(parts[0], 10);
                const month = parseInt(parts[1], 10) - 1;
                const day = parseInt(parts[2], 10);
                const d = new Date(year, month, day);
                
                const dayNames = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
                const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
                
                const dayName = dayNames[d.getDay()];
                const monthName = monthNames[d.getMonth()];
                
                return `${dayName} ${day} ${monthName} ${year}`;
            }
            return dateStr;
        } catch {
            return dateStr;
        }
    };

    // Filtered Sessions
    const filteredSessions = useMemo(() => {
        const list = activeCircle.sessions || [];
        return list.filter(s => {
            const dateMatch = s.date >= dateRange.start && s.date <= dateRange.end;
            const typeMatch = includeLessons ? true : !s.isLesson;
            return dateMatch && typeMatch;
        });
    }, [activeCircle.sessions, dateRange, includeLessons]);

    // Calculate unique study days (number of days with at least 1 session)
    const studyDaysCount = useMemo(() => {
        const datesSet = new Set<string>();
        filteredSessions.forEach(s => {
            if (s.date) datesSet.add(s.date);
        });
        return datesSet.size;
    }, [filteredSessions]);

    // Auto select all active students by default
    useEffect(() => {
        if (activeStudents.length > 0 && selectedStudentIds.length === 0) {
            setSelectedStudentIds(activeStudents.map(s => s.id));
        }
    }, [activeStudents]);

    // Get available levels/groups from active students
    const availableLevels = useMemo(() => {
        const set = new Set<string>();
        activeStudents.forEach(s => {
            if (s.level) set.add(s.level);
        });
        return Array.from(set);
    }, [activeStudents]);

    // Filter students based on selection mode
    const filteredStudentsBySelection = useMemo(() => {
        if (studentSelectionType === 'level') {
            if (selectedLevel === 'all') return activeStudents;
            if (selectedLevel === 'khatim') return activeStudents.filter(s => s.isKhatim);
            if (selectedLevel === 'non-khatim') return activeStudents.filter(s => !s.isKhatim);
            return activeStudents.filter(s => s.level === selectedLevel);
        }
        if (studentSelectionType === 'manual') {
            return activeStudents.filter(s => selectedStudentIds.includes(s.id));
        }
        return activeStudents; // 'all'
    }, [activeStudents, studentSelectionType, selectedLevel, selectedStudentIds]);

    // Handle Title Autofill
    const periodLabel = useMemo(() => {
        switch (period) {
            case 'today': return 'اليوم';
            case 'last7': return 'لآخر 7 أيام';
            case 'last30': return 'لآخر 30 يوماً';
            case 'currentMonth': return 'للشهر الحالي';
            case 'lastMonth': return 'للشهر السابق';
            case 'allTime': return 'لكامل الفترة';
            case 'custom': return `للفترة من ${formatDateWithDay(dateRange.start)} إلى ${formatDateWithDay(dateRange.end)}`;
            default: return '';
        }
    }, [period, dateRange]);

    const defaultTitle = useMemo(() => {
        let name = 'التقرير الشامل للحلقة';
        if (reportType === 'attendance') name = 'تقرير حضور وغياب الطلاب';
        if (reportType === 'points') name = 'تقرير نقاط وتحفيز الطلاب';
        if (reportType === 'memorization') name = 'تقرير مستويات الحفظ والمراجعة';
        if (reportType === 'tests') name = 'تقرير نتائج الاختبارات والخطط';
        
        // If period is custom, do not display duration in parentheses in the default title
        if (period === 'custom') {
            return `${name} - حلقة ${activeCircle.circle}`;
        }
        return `${name} - حلقة ${activeCircle.circle} (${periodLabel})`;
    }, [reportType, activeCircle.circle, periodLabel, period]);

    // Title formatter helper to keep title on a single line and render parenthesized period in smaller font
    const renderTitle = (title: string) => {
        if (period === 'custom') {
            const cleanedTitle = title.replace(/\s*\([^)]*\)\s*$/, '');
            return <span className="whitespace-nowrap">{cleanedTitle}</span>;
        }

        const match = title.match(/^(.*?)\s*(\([^)]+\))\s*$/);
        if (match) {
            return (
                <span className="whitespace-nowrap inline-block">
                    {match[1]}{' '}
                    <span className="text-[11px] sm:text-[13px] font-bold opacity-90 inline-block">
                        {match[2]}
                    </span>
                </span>
            );
        }
        return <span className="whitespace-nowrap">{title}</span>;
    };

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

                // Sum up Pages (Main + Extra Recitations)
                const getItemPages = (rec: any): number => {
                    if (!rec) return 0;
                    if (typeof rec.pages_count === 'number') {
                        return rec.pages_count;
                    }
                    if (rec.fromSurah) {
                        return calculatePagesCount(
                            rec.fromSurah,
                            rec.fromAyah,
                            rec.toSurah || rec.fromSurah,
                            rec.toAyah
                        );
                    }
                    return 0;
                };

                let sessionMemoPages = 0;
                if (ss.memorization && ss.memorization.hasMemorization !== false && ss.memorization.fromSurah) {
                    sessionMemoPages += getItemPages(ss.memorization);
                    sStat.lastMemoSurah = ss.memorization.toSurah || ss.memorization.fromSurah;
                    sStat.lastMemoAyah = ss.memorization.toAyah || ss.memorization.fromAyah;
                }
                if (Array.isArray(ss.extraMemorizations)) {
                    ss.extraMemorizations.forEach((em: any) => {
                        if (em && em.hasMemorization !== false && em.fromSurah) {
                            sessionMemoPages += getItemPages(em);
                            if (em.toSurah || em.fromSurah) {
                                sStat.lastMemoSurah = em.toSurah || em.fromSurah;
                                sStat.lastMemoAyah = em.toAyah || em.fromAyah;
                            }
                        }
                    });
                }
                sStat.memorizedPages += sessionMemoPages;

                let sessionReviewPages = 0;
                if (ss.review && ss.review.hasReview !== false && ss.review.fromSurah) {
                    sessionReviewPages += getItemPages(ss.review);
                    sStat.lastReviewSurah = ss.review.toSurah || ss.review.fromSurah;
                    sStat.lastReviewAyah = ss.review.toAyah || ss.review.fromAyah;
                }
                if (Array.isArray(ss.extraReviews)) {
                    ss.extraReviews.forEach((er: any) => {
                        if (er && er.hasReview !== false && er.fromSurah) {
                            sessionReviewPages += getItemPages(er);
                            if (er.toSurah || er.fromSurah) {
                                sStat.lastReviewSurah = er.toSurah || er.fromSurah;
                                sStat.lastReviewAyah = er.toAyah || er.fromAyah;
                            }
                        }
                    });
                }
                sStat.reviewedPages += sessionReviewPages;

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

    // Dynamic Period-Specific Surah Statistics
    const periodSurahStats = useMemo(() => {
        return getPeriodSurahStats(filteredSessions);
    }, [filteredSessions]);

    // Helper for teacher name formatting (single vs multiple teachers)
    const teachersInfo = useMemo(() => {
        const list: string[] = [];
        if (activeCircle.teachers && Object.keys(activeCircle.teachers).length > 0) {
            Object.values(activeCircle.teachers).forEach((t: any) => {
                if (t.status === 'active' && t.role !== 'assistant' && t.role !== 'member') {
                    if (t.name && !list.includes(t.name)) {
                        list.push(t.name);
                    }
                }
            });
        }
        if (list.length === 0 && activeCircle.teacher) {
            list.push(activeCircle.teacher);
        }
        
        const isMultiple = list.length > 1;
        const label = isMultiple ? 'المعلمين' : 'اسم المعلم';
        const names = list.map(n => n.startsWith('أ/') ? n : `أ/ ${n}`).join(' - ');
        
        return { label, names: names || activeCircle.teacher };
    }, [activeCircle]);

    // Companion Curriculum / Lesson sessions display
    const accompanimentCurriculumText = useMemo(() => {
        const lessonSessions = filteredSessions.filter(s => s.isLesson);
        
        if (availableLevels.length > 1) {
            const groupParts: string[] = [];
            availableLevels.forEach(lvl => {
                const countForLevel = lessonSessions.filter(sess => {
                    return sess.students.some(st => {
                        const studentData = activeStudents.find(s => s.id === st.id);
                        return studentData?.level === lvl && (st.attendance === 'present' || st.attendance === 'late');
                    });
                }).length;

                groupParts.push(`${lvl} (${countForLevel} جلسة دروس)`);
            });
            return groupParts.join('، ');
        } else if (availableLevels.length === 1) {
            const lvl = availableLevels[0];
            return `${lvl} (${lessonSessions.length} جلسة دروس)`;
        }
        
        return `${lessonSessions.length} جلسة دروس`;
    }, [filteredSessions, availableLevels, activeStudents]);

    // Average recitation (tasmie) grade across all memorization and review records
    const avgTasmieScoreText = useMemo(() => {
        let totalScore = 0;
        let count = 0;

        filteredSessions.forEach(session => {
            session.students.forEach(ss => {
                if (ss.attendance === 'present' || ss.attendance === 'late') {
                    if (ss.memorization && ss.memorization.hasMemorization && typeof ss.memorization.rating === 'number' && ss.memorization.rating > 0) {
                        totalScore += ss.memorization.rating;
                        count += 1;
                    }
                    if (ss.review && ss.review.hasReview && typeof ss.review.rating === 'number' && ss.review.rating > 0) {
                        totalScore += ss.review.rating;
                        count += 1;
                    }
                    if (Array.isArray(ss.extraMemorizations)) {
                        ss.extraMemorizations.forEach((em: any) => {
                            if (em && em.hasMemorization && typeof em.rating === 'number' && em.rating > 0) {
                                totalScore += em.rating;
                                count += 1;
                            }
                        });
                    }
                    if (Array.isArray(ss.extraReviews)) {
                        ss.extraReviews.forEach((er: any) => {
                            if (er && er.hasReview && typeof er.rating === 'number' && er.rating > 0) {
                                totalScore += er.rating;
                                count += 1;
                            }
                        });
                    }
                    if (Array.isArray(ss.otherRecitations)) {
                        ss.otherRecitations.forEach((or: any) => {
                            if (or && typeof or.rating === 'number' && or.rating > 0) {
                                totalScore += or.rating;
                                count += 1;
                            }
                        });
                    }
                }
            });
        });

        if (count > 0) {
            const avg = (totalScore / count).toFixed(1);
            return `${avg} / 10`;
        }
        
        return '10 / 10';
    }, [filteredSessions]);

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

    // Sort Students by selected criteria and filters
    const sortedStudentsForReport = useMemo(() => {
        const list = [...filteredStudentsBySelection];
        switch (sortBy) {
            case 'name':
                return list.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
            case 'performance':
                return list.sort((a, b) => {
                    const statA = studentsStats[a.id]?.pointsGained || 0;
                    const statB = studentsStats[b.id]?.pointsGained || 0;
                    return statB - statA;
                });
            case 'attendance':
                return list.sort((a, b) => {
                    const statA = studentsStats[a.id]?.attendanceRate || 0;
                    const statB = studentsStats[b.id]?.attendanceRate || 0;
                    return statB - statA;
                });
            case 'memorization':
                return list.sort((a, b) => {
                    const statA = studentsStats[a.id]?.memorizedPages || 0;
                    const statB = studentsStats[b.id]?.memorizedPages || 0;
                    return statB - statA;
                });
            case 'default':
            default:
                return list.sort((a, b) => a.order - b.order);
        }
    }, [filteredStudentsBySelection, sortBy, studentsStats]);

    // Split students into pages (chunks) dynamically to fit perfectly on A4 pages without leaving large empty spaces
    const studentChunks = useMemo(() => {
        const isLandscape = orientation === 'landscape';
        let firstPageSize = 14;
        let otherPageSize = 25;

        if (isLandscape) {
            firstPageSize = showStatsInReport ? 10 : 14;
            otherPageSize = 18;
        } else {
            firstPageSize = showStatsInReport ? 14 : 18;
            otherPageSize = 25;
        }

        const chunks: Student[][] = [];
        let remaining = [...sortedStudentsForReport];
        if (remaining.length === 0) {
            return [[]]; // At least one empty page to prevent rendering crashes
        }
        
        // Take first page chunk (smaller capacity due to header and summary stats)
        const firstPage = remaining.splice(0, firstPageSize);
        chunks.push(firstPage);
        
        // Take subsequent pages chunks (larger capacity as there are no header summary banners)
        while (remaining.length > 0) {
            chunks.push(remaining.splice(0, otherPageSize));
        }
        
        return chunks;
    }, [sortedStudentsForReport, orientation, showStatsInReport]);

    // Fit to Screen (automatic zoom based on viewport, perfectly fitted for mobile & desktop)
    const fitToScreen = () => {
        const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 800;
        const containerWidth = containerRef.current ? containerRef.current.clientWidth : screenWidth;
        const availableWidth = Math.max(260, Math.min(screenWidth - 20, containerWidth - 20));
        const pageTargetWidth = orientation === 'landscape' ? 1122 : 794; // approx px
        const scale = availableWidth / pageTargetWidth;
        // Allow zoom scale down to 0.18 for narrow mobile screens to guarantee complete document visibility
        setZoom(Math.max(0.18, Math.min(scale, 1.25)));
        setPan({ x: 0, y: 0 });
    };

    // Auto scroll to top and fit to screen when entering preview or changing orientation
    useEffect(() => {
        if (view === 'preview') {
            window.scrollTo({ top: 0, behavior: 'auto' });
            const timer = setTimeout(() => {
                fitToScreen();
                window.scrollTo({ top: 0, behavior: 'auto' });
            }, 80);
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

        const totalMemoAjzaa = (overallStats.totalMemoPages / 20).toFixed(1);
        const totalReviewAjzaa = (overallStats.totalReviewPages / 20).toFixed(1);

        return (
            <>
                {/* Decorative Frame */}
                <div className="absolute top-1 bottom-1 left-1.5 right-1.5 border-2 border-[#105541]/30 rounded-xl print:border-[#105541]/40 pointer-events-none"></div>

                <style>{`
                    .report-page-element th, 
                    .report-page-element td {
                        vertical-align: middle !important;
                        padding-top: 0px !important;
                        padding-bottom: 6px !important;
                        line-height: 1.1 !important;
                    }
                `}</style>

                <div className="relative z-10 flex flex-col h-full text-black font-sans mt-0 pt-0">
                    
                    {/* PAGE 1 ONLY: OFFICIAL EXECUTIVE HEADER & SUMMARY */}
                    {pageIndex === 0 ? (
                        <>
                            {/* Top Title & Logo Header */}
                            <table className="w-full table-fixed border-b-2 border-[#105541]/20 mb-1 pb-0.5 text-right mt-0 pt-0" dir="rtl">
                                <tbody>
                                    <tr>
                                        {/* Right Side: Logo / Center info */}
                                        <td className="w-1/3 text-right align-top pt-0">
                                            <div className="flex items-center justify-start gap-2.5 overflow-visible pt-0">
                                                {(customReportLogo || activeCircle.logo) ? (
                                                    <>
                                                        <img 
                                                            src={customReportLogo || activeCircle.logo} 
                                                            alt="شعار التقرير" 
                                                            className="w-12 h-12 object-contain flex-shrink-0"
                                                            referrerPolicy="no-referrer"
                                                        />
                                                        <div className="text-right overflow-visible -mt-0.5">
                                                            <div className="font-black text-[#105541] text-xs sm:text-[13px] leading-snug m-0 p-0">{activeCircle.circle}</div>
                                                            <div className="text-[9.5px] text-gray-600 font-bold leading-snug m-0 p-0">{activeCircle.center || 'المركز الرئيسي لتحفيظ القرآن'}</div>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div className="text-right overflow-visible -mt-0.5">
                                                        <div className="font-black text-[#105541] text-xs sm:text-[13px] leading-snug m-0 p-0">
                                                            {activeCircle.circle}
                                                        </div>
                                                        <div className="text-[9.5px] font-bold text-gray-600 leading-snug m-0 p-0">
                                                            {activeCircle.center || 'المركز الرئيسي لتحفيظ القرآن'}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </td>

                                        {/* Center Side: Main Title */}
                                        <td className="w-1/3 text-center align-middle px-1">
                                            <h1 className="text-base sm:text-lg font-black text-[#105541] leading-tight text-center break-words max-w-full m-0 p-0">
                                                {renderTitle(customTitle || defaultTitle)}
                                            </h1>
                                        </td>

                                        {/* Left Side: Metadata */}
                                        <td className="w-1/3 text-left align-middle">
                                            <div className="flex flex-col items-end justify-center space-y-0.5 text-[8.5px] text-gray-600" dir="rtl">
                                                <div className="whitespace-nowrap"><span className="font-bold text-gray-800">المدة المحددة للتقرير:</span> <span className="font-bold text-[#105541]">من {formatDateWithDay(dateRange.start)} إلى {formatDateWithDay(dateRange.end)}</span></div>
                                                <div className="whitespace-nowrap"><span className="font-bold text-gray-800">مُعد التقرير:</span> <span className="font-bold text-gray-900">{getLoggedInUserName() || activeCircle.teacher}</span></div>
                                            </div>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>

                            {/* Executive Header Box Table (شبكة معلومات التقرير الرئيسية) */}
                            <div className="border-2 border-[#105541] rounded-xl overflow-hidden mb-1.5 bg-white shadow-2xs shrink-0">
                                <table className="w-full table-fixed border-collapse text-[9.5px] text-center" dir="rtl">
                                    <thead>
                                        <tr className="bg-[#105541] text-white font-bold text-[9px] h-[22px]">
                                            <th className="w-1/4 py-0.5 border-l border-[#105541]/40 font-bold text-center align-middle">اسم المركز / المدرسة</th>
                                            <th className="w-1/4 py-0.5 border-l border-[#105541]/40 font-bold text-center align-middle">اسم الحلقة</th>
                                            <th className="w-1/4 py-0.5 border-l border-[#105541]/40 font-bold text-center align-middle">{teachersInfo.label}</th>
                                            <th className="w-1/4 py-0.5 font-bold text-center align-middle">فئة التقرير</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr className="border-b border-[#105541] h-[24px]">
                                            <td className="w-1/4 py-0.5 px-1 border-l border-gray-300 font-extrabold text-gray-900 truncate align-middle">{activeCircle.center || 'المدرسة المتميزة'}</td>
                                            <td className="w-1/4 py-0.5 px-1 border-l border-gray-300 font-extrabold text-gray-900 truncate align-middle">{activeCircle.circle}</td>
                                            <td className="w-1/4 py-0.5 px-1 border-l border-gray-300 font-extrabold text-gray-900 truncate align-middle">{customTeacherName.trim() ? customTeacherName : teachersInfo.names}</td>
                                            <td className="w-1/4 py-0.5 px-1 font-extrabold text-gray-900 truncate align-middle">{periodLabel}</td>
                                        </tr>
                                        <tr className="text-[9px] h-[22px]">
                                            <td className="w-1/4 bg-[#8c591b] text-white font-bold py-0.5 border-l border-[#784c17] text-center align-middle">فترة التقرير</td>
                                            <td colSpan={3} className="bg-[#fcf8f2] text-[#543810] font-extrabold py-0.5 px-2 text-center align-middle">
                                                <span><strong>الفترة الفعلية للتقرير:</strong> من {formatDateWithDay(dateRange.start)} إلى {formatDateWithDay(dateRange.end)} ({overallStats.sessionsCount} جلسة | {studyDaysCount} أيام دراسة)</span>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            {/* ERP KPI Metrics Panel (التقرير الإجمالي) */}
                            {showStatsInReport && (
                                <div className="border-2 border-[#105541] rounded-xl overflow-hidden mb-1.5 bg-white shadow-2xs shrink-0">
                                    <div className="bg-[#105541] text-white font-black text-[10px] py-0.5 text-center tracking-wider leading-none h-[20px] flex items-center justify-center overflow-hidden">
                                        <span className="inline-block -mt-1.5 font-black">التقرير الإجمالي</span>
                                    </div>
                                    <table className="w-full table-fixed border-collapse text-[9px] text-center" dir="rtl">
                                        <tbody>
                                            {/* Row 1 Headers */}
                                            <tr className="bg-[#156e55] text-white font-bold text-[8.5px] h-[18px]">
                                                <td className="w-1/4 py-0.5 border-l border-emerald-900/30 align-middle">عدد طلاب الحلقة</td>
                                                <td className="w-1/4 py-0.5 border-l border-emerald-900/30 align-middle">أيام الدراسة</td>
                                                <td className="w-1/4 py-0.5 border-l border-emerald-900/30 align-middle">إجمالي الحفظ (أجزاء/صفحات)</td>
                                                <td className="w-1/4 py-0.5 align-middle">إجمالي المراجعة (أجزاء/صفحات)</td>
                                            </tr>
                                            {/* Row 1 Values */}
                                            <tr className="border-b border-gray-300 h-[22px]">
                                                <td className="py-0.5 font-black text-gray-900 font-mono border-l border-gray-300 align-middle">{overallStats.activeCount} طالب</td>
                                                <td className="py-0.5 font-black text-gray-900 font-mono border-l border-gray-300 align-middle">{studyDaysCount} أيام</td>
                                                <td className="py-0.5 font-black text-gray-900 font-mono border-l border-gray-300 align-middle">{formatPagesCount(overallStats.totalMemoPages)} ص ({totalMemoAjzaa} جزء)</td>
                                                <td className="py-0.5 font-black text-gray-900 font-mono align-middle">{formatPagesCount(overallStats.totalReviewPages)} ص ({totalReviewAjzaa} جزء)</td>
                                            </tr>
                                            {/* Row 2 Headers */}
                                            <tr className="bg-[#156e55] text-white font-bold text-[8.5px] h-[18px]">
                                                <td className="py-0.5 border-l border-emerald-900/30 align-middle">مؤشر الالتزام بالحضور</td>
                                                <td className="py-0.5 border-l border-emerald-900/30 align-middle">المنهج المصاحب</td>
                                                <td className="py-0.5 border-l border-emerald-900/30 align-middle">معدل درجات التسميع</td>
                                                <td className="py-0.5 align-middle">مجموع نقاط التميز</td>
                                            </tr>
                                            {/* Row 2 Values */}
                                            <tr className="h-[22px]">
                                                <td className="py-0.5 font-black text-gray-900 font-mono border-l border-gray-300 align-middle">{periodAttendanceStats.commitmentIndex}%</td>
                                                <td className="py-0.5 font-black text-gray-900 font-mono border-l border-gray-300 text-[8.5px] px-1 truncate align-middle">{accompanimentCurriculumText}</td>
                                                <td className="py-0.5 font-black text-gray-900 font-mono border-l border-gray-300 align-middle">{avgTasmieScoreText}</td>
                                                <td className="py-0.5 font-black text-gray-900 font-mono align-middle">{overallStats.totalPoints} نقطة</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </>
                    ) : (
                        /* RUNNING HEADER FOR SUBSEQUENT PAGES */
                        <div className="flex justify-between items-center pb-1 border-b-2 border-[#105541] text-[9.5px] text-gray-700 font-bold mb-2 text-right shrink-0" dir="rtl">
                            <span className="text-[#105541] font-black">{renderTitle(customTitle || defaultTitle)} — {activeCircle.circle}</span>
                            <span>الصفحة {pageIndex + 1} من {studentChunks.length}</span>
                        </div>
                    )}

                    {/* DETAILED STUDENT TABLE (التقرير التفصيلي) */}
                    <div className="border-2 border-[#105541] rounded-xl overflow-hidden mb-1.5 bg-white shadow-2xs flex-grow flex flex-col">
                        <div className="bg-[#105541] text-white font-black text-[10px] py-0.5 text-center tracking-wide leading-none shrink-0 h-[20px] flex items-center justify-center overflow-hidden">
                            <span className="inline-block -mt-1.5 font-black">التقرير التفصيلي</span>
                        </div>
                        <table className="w-full text-right border-collapse text-[9.5px] text-black table-fixed flex-grow" dir="rtl">
                            <colgroup>
                                <col style={{ width: '3.5%' }} />
                                <col style={{ width: reportType === 'tests' ? '15%' : '16%' }} />
                                <col style={{ width: '4%' }} />
                                <col style={{ width: '4%' }} />
                                <col style={{ width: '4%' }} />
                                <col style={{ width: '4%' }} />
                                <col style={{ width: reportType === 'tests' ? '5%' : '5.5%' }} />
                                
                                {(reportType === 'comprehensive' || reportType === 'memorization') && (
                                    <>
                                        <col style={{ width: '6.5%' }} />
                                        <col style={{ width: '6.5%' }} />
                                    </>
                                )}
                                {reportType === 'points' && (
                                    <>
                                        <col style={{ width: '6.5%' }} />
                                        <col style={{ width: '6.5%' }} />
                                    </>
                                )}
                                {reportType === 'tests' && (
                                    <>
                                        <col style={{ width: '4.5%' }} />
                                        <col style={{ width: '4.5%' }} />
                                        <col style={{ width: '4.5%' }} />
                                    </>
                                )}
                                
                                <col style={{ width: '34.5%' }} />
                                <col style={{ width: reportType === 'tests' ? '12%' : '11%' }} />
                            </colgroup>
                            <thead>
                                {/* Header Row 1: Groups */}
                                <tr className="bg-[#0d4a39] text-white text-[9px] font-black text-center h-[23px]">
                                    <th rowSpan={2} className="border border-emerald-800 text-center align-middle bg-[#0d4a39] text-white relative z-10">م</th>
                                    <th rowSpan={2} className="border border-emerald-800 px-1.5 text-right align-middle bg-[#0d4a39] text-white relative z-10">اسم الطالب</th>
                                    
                                    {/* Attendance Group Header */}
                                    <th colSpan={5} className="border border-emerald-800 py-0.5 text-center bg-[#0d4a39] align-middle">الحضور والالتزام</th>
                                    
                                    {/* Dynamic Category Group Header */}
                                    {(reportType === 'comprehensive' || reportType === 'memorization') && (
                                        <th colSpan={2} className="border border-emerald-800 py-0.5 text-center bg-[#0d4a39] align-middle">إنجاز الحفظ والمراجعة</th>
                                    )}

                                    {reportType === 'points' && (
                                        <th colSpan={2} className="border border-emerald-800 py-0.5 text-center bg-[#0d4a39] align-middle">نقاط التميز</th>
                                    )}

                                    {reportType === 'tests' && (
                                        <th colSpan={3} className="border border-emerald-800 py-0.5 text-center bg-[#0d4a39] align-middle">نتائج الاختبارات</th>
                                    )}

                                    <th rowSpan={2} className="border border-emerald-800 px-1.5 text-right align-middle bg-[#0d4a39] text-white relative z-10">السور والآيات المسمعة بالفترة</th>
                                    <th rowSpan={2} className="border border-emerald-800 px-1 text-center align-middle bg-[#0d4a39] text-white relative z-10">التقييم العام</th>
                                </tr>

                                {/* Header Row 2: Sub-headers */}
                                <tr className="text-white text-[8.5px] font-bold text-center h-[22px]">
                                    <th className="border border-emerald-800 py-0.5 bg-[#156e55] text-emerald-100 align-middle">حضور</th>
                                    <th className="border border-emerald-800 py-0.5 bg-[#156e55] text-red-200 align-middle">غياب</th>
                                    <th className="border border-emerald-800 py-0.5 bg-[#156e55] text-amber-200 align-middle">تأخر</th>
                                    <th className="border border-emerald-800 py-0.5 bg-[#156e55] text-blue-200 align-middle">استئذان</th>
                                    <th className="border border-emerald-800 py-0.5 bg-[#156e55] text-white align-middle">النسبة</th>

                                    {(reportType === 'comprehensive' || reportType === 'memorization') && (
                                        <>
                                            <th className="border border-emerald-800 py-0.5 bg-[#156e55] align-middle">الحفظ</th>
                                            <th className="border border-emerald-800 py-0.5 bg-[#156e55] align-middle">المراجعة</th>
                                        </>
                                    )}

                                    {reportType === 'points' && (
                                        <>
                                            <th className="border border-emerald-800 py-0.5 bg-[#156e55] align-middle">النقاط</th>
                                            <th className="border border-emerald-800 py-0.5 bg-[#156e55] align-middle">التميز</th>
                                        </>
                                    )}

                                    {reportType === 'tests' && (
                                        <>
                                            <th className="border border-emerald-800 py-0.5 bg-[#156e55] align-middle">عدد</th>
                                            <th className="border border-emerald-800 py-0.5 bg-[#156e55] align-middle">أعلى</th>
                                            <th className="border border-emerald-800 py-0.5 bg-[#156e55] align-middle">المعدل</th>
                                        </>
                                    )}
                                </tr>
                            </thead>
                        <tbody>
                            {chunk.map((student, idx) => {
                                // Calculate overall absolute index across all chunks
                                let previousItemsCount = 0;
                                for (let c = 0; c < pageIndex; c++) {
                                    previousItemsCount += studentChunks[c]?.length || 0;
                                }
                                const absoluteIndex = previousItemsCount + idx + 1;
                                
                                const stat = studentsStats[student.id] || {
                                    attendanceRate: 100, present: 0, late: 0, absent: 0, excused: 0, totalSessions: 0,
                                    memorizedPages: 0, reviewedPages: 0, pointsGained: 0, testAverage: 0, testsTaken: 0, highestTestScore: 0
                                };
                                
                                const evalData = getOverallEvaluation(stat);

                                return (
                                    <tr 
                                        key={student.id} 
                                        className={`h-7 text-[9px] align-middle transition-colors ${
                                            idx % 2 === 0 ? 'bg-white' : 'bg-[#f2f8f5]'
                                        }`}
                                    >
                                        <td className="border border-emerald-950/25 text-center font-bold text-gray-900 align-middle">{absoluteIndex}</td>
                                        <td className="border border-emerald-950/25 px-1.5 font-black text-gray-950 align-middle text-right text-[10.5px] leading-tight break-words">{student.name}</td>
                                        <td className="border border-emerald-950/25 text-center font-mono font-bold text-emerald-800 align-middle">{stat.present}</td>
                                        <td className="border border-emerald-950/25 text-center font-mono font-bold text-red-700 align-middle">{stat.absent}</td>
                                        <td className="border border-emerald-950/25 text-center font-mono font-bold text-amber-700 align-middle">{stat.late}</td>
                                        <td className="border border-emerald-950/25 text-center font-mono font-bold text-blue-700 align-middle">{stat.excused}</td>
                                        <td className="border border-emerald-950/25 text-center font-mono font-black text-gray-900 align-middle">{stat.attendanceRate}%</td>

                                        {/* Dynamic Columns */}
                                        {(reportType === 'comprehensive' || reportType === 'memorization') && (
                                            <>
                                                <td className="border border-emerald-950/25 text-center font-mono font-extrabold text-[#105541] align-middle">{formatPagesCount(stat.memorizedPages)} ص</td>
                                                <td className="border border-emerald-950/25 text-center font-mono font-bold text-gray-700 align-middle">{formatPagesCount(stat.reviewedPages)} ص</td>
                                            </>
                                        )}

                                        {reportType === 'points' && (
                                            <>
                                                <td className="border border-emerald-950/25 text-center font-mono font-extrabold text-amber-700 align-middle">{stat.pointsGained} ن</td>
                                                <td className="border border-emerald-950/25 text-center text-[8.5px] font-black text-amber-800 px-1 py-0.5 align-middle">
                                                    {stat.pointsGained >= 200 ? '💎 ماسي' : stat.pointsGained >= 120 ? '🥇 ذهبي' : stat.pointsGained >= 60 ? '🥈 فضي' : '🥉 برونزي'}
                                                </td>
                                            </>
                                        )}

                                        {reportType === 'tests' && (
                                            <>
                                                <td className="border border-emerald-950/25 text-center font-mono align-middle">{stat.testsTaken}</td>
                                                <td className="border border-emerald-950/25 text-center font-mono font-bold text-emerald-800 align-middle">{stat.highestTestScore}%</td>
                                                <td className="border border-emerald-950/25 text-center font-mono font-extrabold text-emerald-700 align-middle">{stat.testAverage}%</td>
                                            </>
                                        )}

                                        {/* Recited Surahs in Period (Penultimate column) */}
                                        {(() => {
                                            const surahSummary = getStudentSurahSummaryForPeriod(filteredSessions, student.id);
                                            return (
                                                <td className="border border-emerald-950/25 px-1.5 py-0.5 text-[8.5px] leading-tight text-right font-medium align-middle break-words">
                                                    {surahSummary.memoText && (
                                                        <div className="text-emerald-950 font-medium">
                                                            <span className="font-extrabold text-[#105541]">حفظ: </span>
                                                            {surahSummary.memoText}
                                                        </div>
                                                    )}
                                                    {surahSummary.reviewText && (
                                                        <div className="text-blue-950 font-medium mt-0.5">
                                                            <span className="font-extrabold text-blue-800">مراجعة: </span>
                                                            {surahSummary.reviewText}
                                                        </div>
                                                    )}
                                                    {!surahSummary.memoText && !surahSummary.reviewText && (
                                                        <span className="text-gray-400 font-bold block text-center">—</span>
                                                    )}
                                                </td>
                                            );
                                        })()}

                                        {/* Overall Evaluation (Last column) */}
                                        <td className={`border border-emerald-950/25 text-center text-[8.5px] px-1 font-bold align-middle ${evalData.color}`}>
                                            {evalData.text}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                    {/* SIGNATURES & BOTTOM FOOTER - ON EVERY PAGE */}
                    <div className="mt-auto pt-2">
                        <div className="flex items-center justify-between text-[8.5px] text-gray-900 font-bold border-t-2 border-[#105541]/30 pt-1.5 px-2" dir="rtl">
                            <div className="text-right">
                                توقيع المعلم المربّي: <span className="font-normal text-gray-400">............................</span>
                            </div>
                            <div className="text-center text-[8px] text-gray-600 font-bold">
                                {showPageNumbers && (
                                    <span>صفحة {pageIndex + 1} من {studentChunks.length}</span>
                                )}
                            </div>
                            <div className="text-left" dir="rtl">
                                مصادقة إدارة المدرسة / الجمعية: <span className="font-normal text-gray-400">............................</span>
                            </div>
                        </div>

                        {/* SUBTLE SYSTEM FOOTER & TIMESTAMP */}
                        <div className="flex items-center justify-between text-[7.5px] pt-1 border-t border-gray-200 mt-1 px-2" dir="rtl">
                            <div className="w-1/4" />
                            <div className="w-2/4 text-center text-gray-400 font-medium text-[7.5px]">
                                تم توليد واستخراج هذا التقرير عبر نظام حلقتي لإدارة المدارس القرآنية. برمجة وتطوير: عبدالله مبارك المخلافي
                            </div>
                            <div className="w-1/4 text-left font-mono text-[7.5px] text-gray-500 font-bold whitespace-nowrap" dir="rtl">
                                {todayStr} - {formatTime12()}
                            </div>
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
                                                            scale: 3, // High density pixel-perfect output
                                                            useCORS: true,
                                                            allowTaint: true,
                                                            logging: false,
                                                            backgroundColor: '#ffffff',
                                                            windowWidth: orientation === 'landscape' ? 1122 : 794,
                                                            onclone: (clonedDoc) => {
                                                                const style = clonedDoc.createElement('style');
                                                                style.innerHTML = `
                                                                    * { 
                                                                        box-sizing: border-box !important; 
                                                                        -webkit-print-color-adjust: exact !important; 
                                                                        print-color-adjust: exact !important; 
                                                                        letter-spacing: normal !important;
                                                                        transform: none !important;
                                                                        animation: none !important;
                                                                        transition: none !important;
                                                                        margin-top: 0 !important;
                                                                    }
                                                                    h1, h2, h3, h4, h5, h6, p, span, div, label {
                                                                        margin-top: 0 !important;
                                                                        padding-top: 0 !important;
                                                                    }
                                                                    html, body { 
                                                                        direction: rtl !important; 
                                                                        font-family: 'Tajawal', 'Inter', system-ui, -apple-system, sans-serif !important;
                                                                        background-color: #ffffff !important;
                                                                        margin: 0 !important;
                                                                        padding: 0 !important;
                                                                    }
                                                                    table { 
                                                                        border-collapse: collapse !important; 
                                                                        border-spacing: 0 !important; 
                                                                        width: 100% !important; 
                                                                        table-layout: fixed !important;
                                                                    }
                                                                    thead {
                                                                        display: table-header-group !important;
                                                                    }
                                                                    tbody {
                                                                        display: table-row-group !important;
                                                                    }
                                                                    tr {
                                                                        display: table-row !important;
                                                                    }
                                                                    th, td { 
                                                                        vertical-align: middle !important; 
                                                                        line-height: 1.05 !important; 
                                                                        box-sizing: border-box !important;
                                                                        padding-top: 0px !important;
                                                                        padding-bottom: 12px !important;
                                                                    }
                                                                    td > *, th > * {
                                                                        margin-top: 0 !important;
                                                                        padding-top: 0 !important;
                                                                        transform: translateY(-4px) !important;
                                                                    }
                                                                    th[rowspan], th[rowSpan] {
                                                                        background-color: #0d4a39 !important;
                                                                        color: #ffffff !important;
                                                                        position: relative !important;
                                                                        z-index: 10 !important;
                                                                    }
                                                                    div.bg-\[\#105541\] span {
                                                                        margin-top: -6px !important;
                                                                        padding-top: 0px !important;
                                                                        padding-bottom: 0px !important;
                                                                        display: inline-block !important;
                                                                        line-height: 1 !important;
                                                                        transform: translateY(-5px) !important;
                                                                    }
                                                                    div.bg-\[\#105541\] {
                                                                        padding-top: 0px !important;
                                                                        padding-bottom: 0px !important;
                                                                        margin-top: 0px !important;
                                                                        overflow: visible !important;
                                                                        height: 20px !important;
                                                                        display: flex !important;
                                                                        align-items: center !important;
                                                                        justify-content: center !important;
                                                                    }
                                                                    .report-page-element {
                                                                        transform: none !important;
                                                                        margin: 0 auto !important;
                                                                        box-shadow: none !important;
                                                                        position: relative !important;
                                                                        background-color: #ffffff !important;
                                                                    }
                                                                `;
                                                                clonedDoc.head.appendChild(style);
                                                                clonedDoc.documentElement.setAttribute('dir', 'rtl');
                                                                clonedDoc.body.setAttribute('dir', 'rtl');

                                                                const container = clonedDoc.querySelector('#export-target-container') as HTMLElement;
                                                                if (container) {
                                                                    container.style.position = 'static';
                                                                    container.style.left = '0';
                                                                    container.style.top = '0';
                                                                    container.style.transform = 'none';
                                                                    container.style.padding = '0';
                                                                    container.style.margin = '0 auto';
                                                                }
                                                            }
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
                                                            scale: 3,
                                                            useCORS: true,
                                                            allowTaint: true,
                                                            logging: false,
                                                            backgroundColor: '#ffffff',
                                                            windowWidth: orientation === 'landscape' ? 1122 : 794,
                                                            onclone: (clonedDoc) => {
                                                                const style = clonedDoc.createElement('style');
                                                                style.innerHTML = `
                                                                    * { 
                                                                        box-sizing: border-box !important; 
                                                                        -webkit-print-color-adjust: exact !important; 
                                                                        print-color-adjust: exact !important; 
                                                                        letter-spacing: normal !important;
                                                                        transform: none !important;
                                                                        animation: none !important;
                                                                        transition: none !important;
                                                                        margin-top: 0 !important;
                                                                    }
                                                                    h1, h2, h3, h4, h5, h6, p, span, div, label {
                                                                        margin-top: 0 !important;
                                                                        padding-top: 0 !important;
                                                                    }
                                                                    html, body { 
                                                                        direction: rtl !important; 
                                                                        font-family: 'Tajawal', 'Inter', system-ui, -apple-system, sans-serif !important;
                                                                        background-color: #ffffff !important;
                                                                        margin: 0 !important;
                                                                        padding: 0 !important;
                                                                    }
                                                                    table { 
                                                                        border-collapse: collapse !important; 
                                                                        border-spacing: 0 !important; 
                                                                        width: 100% !important; 
                                                                        table-layout: fixed !important;
                                                                    }
                                                                    thead {
                                                                        display: table-header-group !important;
                                                                    }
                                                                    tbody {
                                                                        display: table-row-group !important;
                                                                    }
                                                                    tr {
                                                                        display: table-row !important;
                                                                    }
                                                                    th, td { 
                                                                        vertical-align: middle !important; 
                                                                        line-height: 1.05 !important; 
                                                                        box-sizing: border-box !important;
                                                                        padding-top: 0px !important;
                                                                        padding-bottom: 12px !important;
                                                                    }
                                                                    td > *, th > * {
                                                                        margin-top: 0 !important;
                                                                        padding-top: 0 !important;
                                                                        transform: translateY(-4px) !important;
                                                                    }
                                                                    th[rowspan], th[rowSpan] {
                                                                        background-color: #0d4a39 !important;
                                                                        color: #ffffff !important;
                                                                        position: relative !important;
                                                                        z-index: 10 !important;
                                                                    }
                                                                    div.bg-\[\#105541\] span {
                                                                        margin-top: -6px !important;
                                                                        padding-top: 0px !important;
                                                                        padding-bottom: 0px !important;
                                                                        display: inline-block !important;
                                                                        line-height: 1 !important;
                                                                        transform: translateY(-5px) !important;
                                                                    }
                                                                    div.bg-\[\#105541\] {
                                                                        padding-top: 0px !important;
                                                                        padding-bottom: 0px !important;
                                                                        margin-top: 0px !important;
                                                                        overflow: visible !important;
                                                                        height: 20px !important;
                                                                        display: flex !important;
                                                                        align-items: center !important;
                                                                        justify-content: center !important;
                                                                    }
                                                                    .report-page-element {
                                                                        transform: none !important;
                                                                        margin: 0 auto !important;
                                                                        box-shadow: none !important;
                                                                        position: relative !important;
                                                                        background-color: #ffffff !important;
                                                                    }
                                                                `;
                                                                clonedDoc.head.appendChild(style);
                                                                clonedDoc.documentElement.setAttribute('dir', 'rtl');
                                                                clonedDoc.body.setAttribute('dir', 'rtl');

                                                                const container = clonedDoc.querySelector('#export-target-container') as HTMLElement;
                                                                if (container) {
                                                                    container.style.position = 'static';
                                                                    container.style.left = '0';
                                                                    container.style.top = '0';
                                                                    container.style.transform = 'none';
                                                                    container.style.padding = '0';
                                                                    container.style.margin = '0 auto';
                                                                }
                                                            }
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
                        className="space-y-4"
                    >
                        <div className="grid grid-cols-3 gap-2 sm:gap-4">
                            {/* Card 1: Comprehensive */}
                            <button
                                onClick={() => { setReportType('comprehensive'); setView('setup'); }}
                                className="p-3 sm:p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 text-center hover:border-emerald-500 dark:hover:border-emerald-400 shadow-2xs hover:shadow-md transition-all group flex flex-col items-center justify-center gap-2 cursor-pointer active:scale-95"
                            >
                                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-100 dark:border-emerald-900/40 group-hover:scale-105 transition-transform">
                                    <FaFileAlt className="text-base sm:text-xl" />
                                </div>
                                <h3 className="font-bold text-xs sm:text-sm text-gray-800 dark:text-gray-100 group-hover:text-emerald-700 dark:group-hover:text-emerald-400">التقرير الشامل</h3>
                            </button>

                            {/* Card 2: Attendance */}
                            <button
                                onClick={() => { setReportType('attendance'); setView('setup'); }}
                                className="p-3 sm:p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 text-center hover:border-blue-500 dark:hover:border-blue-400 shadow-2xs hover:shadow-md transition-all group flex flex-col items-center justify-center gap-2 cursor-pointer active:scale-95"
                            >
                                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-100 dark:border-blue-900/40 group-hover:scale-105 transition-transform">
                                    <FaCalendarAlt className="text-base sm:text-xl" />
                                </div>
                                <h3 className="font-bold text-xs sm:text-sm text-gray-800 dark:text-gray-100 group-hover:text-blue-700 dark:group-hover:text-blue-400">الحضور والغياب</h3>
                            </button>

                            {/* Card 3: Points */}
                            <button
                                onClick={() => { setReportType('points'); setView('setup'); }}
                                className="p-3 sm:p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 text-center hover:border-amber-500 dark:hover:border-amber-400 shadow-2xs hover:shadow-md transition-all group flex flex-col items-center justify-center gap-2 cursor-pointer active:scale-95"
                            >
                                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-100 dark:border-amber-900/40 group-hover:scale-105 transition-transform">
                                    <FaTrophy className="text-base sm:text-xl" />
                                </div>
                                <h3 className="font-bold text-xs sm:text-sm text-gray-800 dark:text-gray-100 group-hover:text-amber-700 dark:group-hover:text-amber-400">النقاط والتحفيز</h3>
                            </button>

                            {/* Card 4: Memorization */}
                            <button
                                onClick={() => { setReportType('memorization'); setView('setup'); }}
                                className="p-3 sm:p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 text-center hover:border-purple-500 dark:hover:border-purple-400 shadow-2xs hover:shadow-md transition-all group flex flex-col items-center justify-center gap-2 cursor-pointer active:scale-95"
                            >
                                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-100 dark:border-purple-900/40 group-hover:scale-105 transition-transform">
                                    <FaBook className="text-base sm:text-xl" />
                                </div>
                                <h3 className="font-bold text-xs sm:text-sm text-gray-800 dark:text-gray-100 group-hover:text-purple-700 dark:group-hover:text-purple-400">الحفظ والمراجعة</h3>
                            </button>

                            {/* Card 5: Tests */}
                            <button
                                onClick={() => { setReportType('tests'); setView('setup'); }}
                                className="p-3 sm:p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 text-center hover:border-rose-500 dark:hover:border-rose-400 shadow-2xs hover:shadow-md transition-all group flex flex-col items-center justify-center gap-2 cursor-pointer active:scale-95"
                            >
                                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-100 dark:border-rose-900/40 group-hover:scale-105 transition-transform">
                                    <FaAward className="text-base sm:text-xl" />
                                </div>
                                <h3 className="font-bold text-xs sm:text-sm text-gray-800 dark:text-gray-100 group-hover:text-rose-700 dark:group-hover:text-rose-400">الاختبارات والخطط</h3>
                            </button>

                            {/* Card 6: Smart Recitation */}
                            <button
                                onClick={() => { setShowSmartFormModal(true); }}
                                className="p-3 sm:p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 text-center hover:border-emerald-500 dark:hover:border-emerald-400 shadow-2xs hover:shadow-md transition-all group flex flex-col items-center justify-center gap-2 cursor-pointer active:scale-95"
                            >
                                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-100 dark:border-emerald-900/40 group-hover:scale-105 transition-transform">
                                    <FaFilePdf className="text-base sm:text-xl" />
                                </div>
                                <h3 className="font-bold text-xs sm:text-sm text-gray-800 dark:text-gray-100 group-hover:text-emerald-700 dark:group-hover:text-emerald-400">كشف التسميع</h3>
                            </button>
                        </div>
                    </motion.div>
                )}

                {/* 2. REPORT SETUP SCREEN */}
                {view === 'setup' && (
                    <motion.div
                        key="setup-view"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-3.5 max-w-4xl mx-auto pb-8"
                    >
                        {/* Top Header Card */}
                        <div className="bg-white dark:bg-gray-800 p-4 sm:p-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xs flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <button 
                                    onClick={() => setView('select')}
                                    className="p-2 text-gray-500 hover:text-gray-800 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all cursor-pointer"
                                    title="رجوع لاختيار التقرير"
                                >
                                    <FaArrowLeft className="rotate-180" size={14} />
                                </button>
                                <div>
                                    <h2 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                        <SlidersHorizontal className="w-4 h-4 text-emerald-600" />
                                        <span>إعداد التقرير</span>
                                    </h2>
                                    <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">خصّص البيانات والفترة والطلاب لاستخراج التقرير المطلوب</p>
                                </div>
                            </div>

                            <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl font-bold text-xs">
                                {reportType === 'comprehensive' && 'التقرير الشامل'}
                                {reportType === 'attendance' && 'الحضور والغياب'}
                                {reportType === 'points' && 'النقاط والتحفيز'}
                                {reportType === 'memorization' && 'الحفظ والمراجعة'}
                                {reportType === 'tests' && 'الاختبارات والخطط'}
                            </span>
                        </div>

                        {/* 1. Report Title (عنوان التقرير في البداية) */}
                        <div className="bg-white dark:bg-gray-800 p-4 sm:p-4.5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xs space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="font-bold text-xs sm:text-sm text-gray-800 dark:text-white flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-emerald-600" />
                                    <span>عنوان التقرير</span>
                                </label>
                                <span className="text-[10px] text-gray-400">معبأ تلقائياً ويمكنك تعديله</span>
                            </div>
                            <input 
                                type="text" 
                                value={customTitle}
                                onChange={(e) => setCustomTitle(e.target.value)}
                                className="w-full text-xs sm:text-sm p-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 outline-none font-bold text-gray-900 dark:text-white focus:border-emerald-600 focus:bg-white dark:focus:bg-gray-800 transition-all"
                                placeholder="أدخل عنوان التقرير..."
                            />
                        </div>

                        {/* 2. Report Period Section (قسم الفترة الزمنية بعد العنوان - مبسط ومقلل المساحة) */}
                        <div className="bg-white dark:bg-gray-800 p-3.5 sm:p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xs space-y-3">
                            <div className="flex items-center justify-between border-b pb-2.5 border-gray-100 dark:border-gray-700">
                                <h3 className="font-bold text-xs sm:text-sm text-gray-800 dark:text-white flex items-center gap-2">
                                    <CalendarLucide className="w-4 h-4 text-emerald-600" />
                                    <span>فترة التقرير (المناسبة)</span>
                                </h3>
                                <div className="flex items-center gap-2 text-[11px]">
                                    <span className="px-2 py-0.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-medium">
                                        الجلسات: <strong className="text-gray-900 dark:text-white">{filteredSessions.length}</strong>
                                    </span>
                                    <span className="px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-medium border border-emerald-100 dark:border-emerald-800/40">
                                        أيام الدراسة: <strong>{studyDaysCount}</strong> يوم
                                    </span>
                                </div>
                            </div>

                            {/* Compact Period Buttons */}
                            <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                                {[
                                    { id: 'today', label: 'اليوم' },
                                    { id: 'last7', label: 'آخر 7 أيام' },
                                    { id: 'last30', label: 'آخر 30 يوماً' },
                                    { id: 'currentMonth', label: 'الشهر الحالي' },
                                    { id: 'lastMonth', label: 'الشهر السابق' },
                                    { id: 'allTime', label: 'كامل الفترة' },
                                    { id: 'custom', label: 'مخصص...' }
                                ].map(item => (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => setPeriod(item.id as any)}
                                        className={`py-1.5 px-1 text-center rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                            period === item.id 
                                            ? 'bg-[#105541] text-white shadow-xs' 
                                            : 'bg-gray-50 hover:bg-gray-100 dark:bg-gray-900/50 dark:hover:bg-gray-900 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700'
                                        }`}
                                    >
                                        {item.label}
                                    </button>
                                ))}
                            </div>

                            {period === 'custom' && (
                                <div className="grid grid-cols-2 gap-2.5 pt-1">
                                    <div className="space-y-1">
                                        <span className="text-[10px] font-bold text-gray-500 block">من تاريخ</span>
                                        <input 
                                            type="date" 
                                            value={customStartDate}
                                            onChange={(e) => setCustomStartDate(e.target.value)}
                                            className="w-full text-xs p-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 outline-none text-gray-800 dark:text-white"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[10px] font-bold text-gray-500 block">إلى تاريخ</span>
                                        <input 
                                            type="date" 
                                            value={customEndDate}
                                            onChange={(e) => setCustomEndDate(e.target.value)}
                                            className="w-full text-xs p-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 outline-none text-gray-800 dark:text-white"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Formatted Date Range Display Banner */}
                            <div className="px-3 py-2 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-xl border border-emerald-100 dark:border-emerald-900/40 flex items-center justify-between text-[11px] text-emerald-900 dark:text-emerald-300">
                                <div className="flex items-center gap-1.5">
                                    <CalendarLucide className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                    <span>
                                        <strong>التاريخ الفعلي:</strong> {period === 'allTime' ? 'كامل الفترة المسجلة' : (
                                            dateRange.start === dateRange.end 
                                                ? formatDateWithDay(dateRange.start) 
                                                : `من ${formatDateWithDay(dateRange.start)} إلى ${formatDateWithDay(dateRange.end)}`
                                        )}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* 3. Additional Settings Collapsible Section (الإعدادات الإضافية - مغلق افتراضياً) */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xs overflow-hidden transition-all">
                            <button
                                type="button"
                                onClick={() => setShowAdditionalSettings(!showAdditionalSettings)}
                                className="w-full p-4 flex items-center justify-between bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors cursor-pointer select-none"
                            >
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-100 dark:border-emerald-900/40">
                                        <SlidersHorizontal size={15} />
                                    </div>
                                    <div className="text-right">
                                        <h3 className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white flex items-center gap-2">
                                            <span>الإعدادات الإضافية</span>
                                        </h3>
                                        <p className="text-[10px] text-gray-400">ملخص التقرير، اختيار وترتيب الطلاب، الشعار، اتجاه الورقة</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 text-gray-400">
                                    <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-100 dark:border-emerald-900/40">
                                        {showAdditionalSettings ? 'إخفاء الإعدادات' : 'توسيع الإعدادات'}
                                    </span>
                                    <ChevronDownLucide className={`w-4 h-4 transition-transform duration-200 text-gray-500 ${showAdditionalSettings ? 'rotate-180 text-emerald-600' : ''}`} />
                                </div>
                            </button>

                            {/* Collapsible Content */}
                            {showAdditionalSettings && (
                                <div className="p-4 sm:p-5 border-t border-gray-100 dark:border-gray-700 space-y-4 bg-gray-50/50 dark:bg-gray-900/30">
                                    
                                    {/* Option 1: Show/Hide Stats Summary */}
                                    <div className="p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <span className="text-xs font-bold text-gray-800 dark:text-white block">إظهار ملخص الإحصائيات بالتقرير</span>
                                            <span className="text-[10px] text-gray-400 block">عرض بطاقات الأداء الموحد وإحصائيات الحضور والحفظ في أعلا الورقة</span>
                                        </div>
                                        <label className="flex items-center gap-2 text-xs font-bold text-gray-700 dark:text-gray-300 cursor-pointer">
                                            <input 
                                                type="checkbox" 
                                                checked={showStatsInReport}
                                                onChange={(e) => setShowStatsInReport(e.target.checked)}
                                                className="w-4 h-4 text-emerald-600 rounded-md focus:ring-emerald-500 accent-emerald-600 cursor-pointer"
                                            />
                                        </label>
                                    </div>

                                    {/* Option 2: Student Selection & Filter */}
                                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 space-y-3">
                                        <div className="flex items-center justify-between border-b pb-2.5 border-gray-100 dark:border-gray-700">
                                            <div>
                                                <h4 className="font-bold text-xs sm:text-sm text-gray-800 dark:text-white flex items-center gap-2">
                                                    <Users className="w-4 h-4 text-emerald-600" />
                                                    <span>اختيار الطلاب في التقرير</span>
                                                </h4>
                                                <p className="text-[10px] text-gray-500 dark:text-gray-400">حدد نطاق الطلاب المطلوب تضمينهم في الكشف</p>
                                            </div>
                                            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-xl border border-emerald-100 dark:border-emerald-800/40">
                                                تحديد {sortedStudentsForReport.length} من {activeStudents.length} طالب
                                            </span>
                                        </div>

                                        {/* Selection Mode Pills */}
                                        <div className="grid grid-cols-3 gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setStudentSelectionType('all')}
                                                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${
                                                    studentSelectionType === 'all'
                                                    ? 'bg-[#105541] text-white shadow-xs'
                                                    : 'bg-gray-50 hover:bg-gray-100 dark:bg-gray-900/50 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700'
                                                }`}
                                            >
                                                جميع الطلاب ({activeStudents.length})
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setStudentSelectionType('level')}
                                                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${
                                                    studentSelectionType === 'level'
                                                    ? 'bg-[#105541] text-white shadow-xs'
                                                    : 'bg-gray-50 hover:bg-gray-100 dark:bg-gray-900/50 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700'
                                                }`}
                                            >
                                                حسب المستوى
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setStudentSelectionType('manual')}
                                                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${
                                                    studentSelectionType === 'manual'
                                                    ? 'bg-[#105541] text-white shadow-xs'
                                                    : 'bg-gray-50 hover:bg-gray-100 dark:bg-gray-900/50 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700'
                                                }`}
                                            >
                                                تحديد يدوي
                                            </button>
                                        </div>

                                        {/* Sub-Option 1: By Level / Category */}
                                        {studentSelectionType === 'level' && (
                                            <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700 space-y-2">
                                                <span className="text-xs font-bold text-gray-700 dark:text-gray-300 block">اختر فئة الطلاب:</span>
                                                <div className="flex flex-wrap gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedLevel('all')}
                                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                                            selectedLevel === 'all' ? 'bg-emerald-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
                                                        }`}
                                                    >
                                                        الكل ({activeStudents.length})
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedLevel('khatim')}
                                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                                            selectedLevel === 'khatim' ? 'bg-emerald-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
                                                        }`}
                                                    >
                                                        الخاتمون ({activeStudents.filter(s => s.isKhatim).length})
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedLevel('non-khatim')}
                                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                                            selectedLevel === 'non-khatim' ? 'bg-emerald-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
                                                        }`}
                                                    >
                                                        غير الخاتمين ({activeStudents.filter(s => !s.isKhatim).length})
                                                    </button>
                                                    {availableLevels.map(lvl => (
                                                        <button
                                                            key={lvl}
                                                            type="button"
                                                            onClick={() => setSelectedLevel(lvl)}
                                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                                                selectedLevel === lvl ? 'bg-emerald-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
                                                            }`}
                                                        >
                                                            مستوى {lvl} ({activeStudents.filter(s => s.level === lvl).length})
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Sub-Option 2: Manual Selection Checkboxes */}
                                        {studentSelectionType === 'manual' && (
                                            <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700 space-y-3">
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="relative flex-1">
                                                        <Search className="w-3.5 h-3.5 text-gray-400 absolute right-3 top-2.5" />
                                                        <input 
                                                            type="text" 
                                                            value={studentSearchQuery}
                                                            onChange={(e) => setStudentSearchQuery(e.target.value)}
                                                            placeholder="بحث باسم الطالب..."
                                                            className="w-full text-xs pr-8 pl-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-white outline-none"
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            type="button"
                                                            onClick={() => setSelectedStudentIds(activeStudents.map(s => s.id))}
                                                            className="px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-950/50 rounded-lg transition-colors cursor-pointer"
                                                        >
                                                            تحديد الكل
                                                        </button>
                                                        <span className="text-gray-300">|</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => setSelectedStudentIds([])}
                                                            className="px-2.5 py-1 text-[11px] font-bold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg transition-colors cursor-pointer"
                                                        >
                                                            إلغاء الكل
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-44 overflow-y-auto p-1">
                                                    {activeStudents
                                                        .filter(s => !studentSearchQuery || s.name.includes(studentSearchQuery))
                                                        .map(student => {
                                                            const isSelected = selectedStudentIds.includes(student.id);
                                                            return (
                                                                <label 
                                                                    key={student.id} 
                                                                    className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                                                                        isSelected 
                                                                        ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 font-bold text-emerald-900 dark:text-emerald-300' 
                                                                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'
                                                                    }`}
                                                                >
                                                                    <input 
                                                                        type="checkbox" 
                                                                        checked={isSelected}
                                                                        onChange={(e) => {
                                                                            if (e.target.checked) {
                                                                                setSelectedStudentIds([...selectedStudentIds, student.id]);
                                                                            } else {
                                                                                setSelectedStudentIds(selectedStudentIds.filter(id => id !== student.id));
                                                                            }
                                                                        }}
                                                                        className="w-3.5 h-3.5 text-emerald-600 rounded-md focus:ring-emerald-500 accent-emerald-600 cursor-pointer"
                                                                    />
                                                                    <span className="truncate">{student.name}</span>
                                                                </label>
                                                            );
                                                        })
                                                    }
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Option 3: Student Sorting */}
                                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 space-y-3">
                                        <h4 className="font-bold text-xs sm:text-sm text-gray-800 dark:text-white flex items-center gap-2 border-b pb-2.5 border-gray-100 dark:border-gray-700">
                                            <ArrowUpDown className="w-4 h-4 text-emerald-600" />
                                            <span>طريقة ترتيب الطلاب في التقرير</span>
                                        </h4>

                                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                                            {[
                                                { id: 'default', label: 'افتراضي (ترتيب الحلقة)' },
                                                { id: 'performance', label: 'الأفضل أداءً (النقاط)' },
                                                { id: 'name', label: 'أبجدياً (اسم الطالب)' },
                                                { id: 'attendance', label: 'نسبة الحضور' },
                                                { id: 'memorization', label: 'كمية الحفظ' },
                                            ].map(item => (
                                                <button
                                                    key={item.id}
                                                    type="button"
                                                    onClick={() => setSortBy(item.id as any)}
                                                    className={`py-2 px-2.5 rounded-xl text-xs font-bold text-center transition-all cursor-pointer ${
                                                        sortBy === item.id
                                                        ? 'bg-[#105541] text-white shadow-xs'
                                                        : 'bg-gray-50 hover:bg-gray-100 dark:bg-gray-900/50 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700'
                                                    }`}
                                                >
                                                    {item.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Option 3.5: Custom Teacher Name */}
                                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 space-y-3">
                                        <div className="flex items-center justify-between border-b pb-2.5 border-gray-100 dark:border-gray-700">
                                            <h4 className="font-bold text-xs sm:text-sm text-gray-800 dark:text-white flex items-center gap-2">
                                                <Users className="w-4 h-4 text-emerald-600" />
                                                <span>اسم المعلم / المعلمين في التقرير</span>
                                            </h4>
                                            {customTeacherName.trim() && (
                                                <button
                                                    type="button"
                                                    onClick={() => setCustomTeacherName('')}
                                                    className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline"
                                                >
                                                    استعادة التلقائي
                                                </button>
                                            )}
                                        </div>
                                        <div className="space-y-1 pt-0.5">
                                            <span className="text-[10px] text-gray-400 block">
                                                يمكنك تعديل النص الذي يظهر في خانة المعلمين بالتقرير، أو تركه فارغاً للتعبئة التلقائية ({teachersInfo.names})
                                            </span>
                                            <input 
                                                type="text"
                                                value={customTeacherName}
                                                onChange={(e) => setCustomTeacherName(e.target.value)}
                                                placeholder={`تلقائي: ${teachersInfo.names}`}
                                                className="w-full text-xs p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                                            />
                                        </div>
                                    </div>

                                    {/* Option 4: Custom Logo Upload */}
                                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 space-y-3">
                                        <h4 className="font-bold text-xs sm:text-sm text-gray-800 dark:text-white flex items-center gap-2 border-b pb-2.5 border-gray-100 dark:border-gray-700">
                                            <ImageIcon className="w-4 h-4 text-emerald-600" />
                                            <span>شعار التقرير والحلقة</span>
                                        </h4>

                                        <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900/40 rounded-xl border border-gray-200 dark:border-gray-700">
                                            <div className="w-12 h-12 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-center overflow-hidden p-1 shrink-0">
                                                {customReportLogo || activeCircle.logo ? (
                                                    <img 
                                                        src={customReportLogo || activeCircle.logo} 
                                                        alt="Logo Preview" 
                                                        className="w-full h-full object-contain"
                                                        referrerPolicy="no-referrer"
                                                    />
                                                ) : (
                                                    <ImageIcon className="w-5 h-5 text-gray-400" />
                                                )}
                                            </div>
                                            <div className="flex flex-col gap-1.5 flex-1">
                                                <input 
                                                    type="file" 
                                                    ref={logoFileInputRef}
                                                    onChange={handleLogoUpload}
                                                    accept="image/*"
                                                    className="hidden"
                                                />
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => logoFileInputRef.current?.click()}
                                                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 justify-center cursor-pointer transition-all"
                                                    >
                                                        <Upload size={13} />
                                                        <span>رفع شعار جديد للتقرير</span>
                                                    </button>
                                                    {customReportLogo && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setCustomReportLogo('')}
                                                            className="text-[11px] font-bold text-red-600 dark:text-red-400 hover:underline flex items-center gap-1 cursor-pointer"
                                                        >
                                                            <Trash2 size={11} />
                                                            <span>استعادة الشعار الأصلي</span>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Option 5: Paper Orientation */}
                                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 space-y-3">
                                        <h4 className="font-bold text-xs sm:text-sm text-gray-800 dark:text-white flex items-center gap-2 border-b pb-2.5 border-gray-100 dark:border-gray-700">
                                            <Layout className="w-4 h-4 text-emerald-600" />
                                            <span>اتجاه التقرير بالصفحة (A4)</span>
                                        </h4>
                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                type="button"
                                                onClick={() => setOrientation('landscape')}
                                                className={`p-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold cursor-pointer transition-all ${
                                                    orientation === 'landscape'
                                                    ? 'bg-[#105541] text-white border-[#105541] shadow-xs'
                                                    : 'bg-gray-50 dark:bg-gray-900/50 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-100'
                                                }`}
                                            >
                                                <span>A4 عرضي (Landscape)</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setOrientation('portrait')}
                                                className={`p-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold cursor-pointer transition-all ${
                                                    orientation === 'portrait'
                                                    ? 'bg-[#105541] text-white border-[#105541] shadow-xs'
                                                    : 'bg-gray-50 dark:bg-gray-900/50 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-100'
                                                }`}
                                            >
                                                <span>A4 طولي (Portrait)</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Option 6: Report Content Overview */}
                                    <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/40 space-y-2.5">
                                        <h4 className="font-bold text-xs sm:text-sm text-emerald-900 dark:text-emerald-300 flex items-center gap-2 border-b pb-2 border-emerald-200/60 dark:border-emerald-900/40">
                                            <FileCheck className="w-4 h-4 text-emerald-600" />
                                            <span>محتويات هذا التقرير:</span>
                                        </h4>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-emerald-950 dark:text-emerald-200">
                                            {reportType === 'comprehensive' && (
                                                <>
                                                    <div className="flex items-center gap-2">✓ جدول الحضور وإحصائيات الالتزام الموحدة</div>
                                                    <div className="flex items-center gap-2">✓ رصد كمية الصفحات المحفوظة والمراجعة</div>
                                                    <div className="flex items-center gap-2">✓ نتائج الاختبارات ومجموع النقاط المكتسبة</div>
                                                    <div className="flex items-center gap-2">✓ التقييم النهائي العام لكل طالب بالفترة</div>
                                                </>
                                            )}
                                            {reportType === 'attendance' && (
                                                <>
                                                    <div className="flex items-center gap-2">✓ تفاصيل أيام الحضور والتأخير والغياب</div>
                                                    <div className="flex items-center gap-2">✓ توثيق رصيد الأعذار المقبولة والملاحظات</div>
                                                    <div className="flex items-center gap-2">✓ مؤشرات نسبة الانتظام ومعدل الالتزام</div>
                                                    <div className="flex items-center gap-2">✓ تصنيف الطلاب حسب مستوى الانضباط</div>
                                                </>
                                            )}
                                            {reportType === 'points' && (
                                                <>
                                                    <div className="flex items-center gap-2">✓ قائمة الشرف ومجموع النقاط المكتسبة</div>
                                                    <div className="flex items-center gap-2">✓ سجل التعديلات اليدوية والمكافآت</div>
                                                    <div className="flex items-center gap-2">✓ الترتيب التنافسي لطلاب الحلقة بالفترة</div>
                                                    <div className="flex items-center gap-2">✓ تفاصيل نقاط الانضباط والحفظ والمراجعة</div>
                                                </>
                                            )}
                                            {reportType === 'memorization' && (
                                                <>
                                                    <div className="flex items-center gap-2">✓ عدد صفحات الحفظ والمراجعة الدقيقة</div>
                                                    <div className="flex items-center gap-2">✓ آخر سورة وآية تم الوصول إليها لكل طالب</div>
                                                    <div className="flex items-center gap-2">✓ متوسط معدل الإنجاز اليومي والقرآني</div>
                                                    <div className="flex items-center gap-2">✓ رصد التقديرات ونسبة إتقان التسميع</div>
                                                </>
                                            )}
                                            {reportType === 'tests' && (
                                                <>
                                                    <div className="flex items-center gap-2">✓ درجات ومعدلات الاختبارات الدورية</div>
                                                    <div className="flex items-center gap-2">✓ أعلى النتاجات والتقديرات المحققة</div>
                                                    <div className="flex items-center gap-2">✓ مقارنة نتائج الطلاب بالخطط المقرر تنفيذها</div>
                                                    <div className="flex items-center gap-2">✓ سجل التقييمات الشفهية والتحريرية</div>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                </div>
                            )}
                        </div>

                        {/* Bottom Action Bar */}
                        <div className="flex items-center gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setView('preview')}
                                className="flex-1 py-3.5 bg-[#105541] hover:bg-[#105541]/95 text-white font-bold rounded-xl shadow-md transition-all text-sm flex items-center justify-center gap-2 cursor-pointer"
                            >
                                <span>توليد ومعاينة التقرير 📊</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setView('select')}
                                className="px-6 py-3.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-bold rounded-xl transition-all text-xs cursor-pointer"
                            >
                                إلغاء
                            </button>
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
                                        padding: orientation === 'landscape' ? '3mm 8mm 5mm 8mm' : '3.5mm 8mm 5.5mm 8mm',
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
                            padding: orientation === 'landscape' ? '3mm 8mm 5mm 8mm' : '3.5mm 8mm 5.5mm 8mm',
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

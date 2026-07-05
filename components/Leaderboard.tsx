
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Student, Session, RankedStudent, PointsSettings } from '../types';
import { FaArrowLeft, FaChevronDown, FaCrown, FaMedal, FaArrowUp, FaArrowDown, FaMinus } from 'react-icons/fa';
import StudentAvatar from './StudentAvatar';
import { calculatePointsForSession } from '../utils/helpers';

const modalVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

const timeframes = [
      { key: 'week', label: 'الأسبوع' },
      { key: 'month', label: 'الشهر' },
      { key: 'year', label: 'السنة' },
      { key: 'all', label: 'منذ البداية' },
      { key: 'custom', label: 'فترة مخصصة' },
];

interface LeaderboardProps {
    students: Student[];
    sessions: Session[];
    studyStartDate: string;
    onClose: () => void;
    pointsSettings: PointsSettings;
    onStudentClick: (studentId: number) => void;
}

const Sparkline: React.FC<{ data: number[], trend: 'up' | 'down' | 'stable', width?: number, height?: number }> = ({ data, trend, width = 80, height = 30 }) => {
    if (!data || data.length < 2) {
        return <div style={{width, height}} className="flex items-center justify-center text-xs text-gray-500">---</div>;
    }

    const validData = data.map(d => isNaN(d) ? 0 : d);
    const max = Math.max(...validData);
    const min = Math.min(...validData);
    const range = max - min === 0 ? 1 : max - min;

    const points = validData.map((d, i) => {
        const x = (i / (validData.length - 1)) * width;
        const y = height - ((d - min) / range) * (height - 6) + 3;
        return `${x.toFixed(2)},${y.toFixed(2)}`;
    }).join(' ');

    const trendFill = trend === 'up' ? 'url(#leaderboardGreenGradient)' : trend === 'down' ? 'url(#leaderboardRedGradient)' : 'url(#leaderboardGrayGradient)';
    const trendStroke = trend === 'up' ? '#10B981' : trend === 'down' ? '#EF4444' : '#6b7280';

    return (
        <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} className="overflow-visible">
            <defs>
                <linearGradient id="leaderboardGreenGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" stopOpacity="0.4"/>
                    <stop offset="100%" stopColor="#10B981" stopOpacity="0"/>
                </linearGradient>
                <linearGradient id="leaderboardRedGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#EF4444" stopOpacity="0.4"/>
                    <stop offset="100%" stopColor="#EF4444" stopOpacity="0"/>
                </linearGradient>
                 <linearGradient id="leaderboardGrayGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6b7280" stopOpacity="0.4"/>
                    <stop offset="100%" stopColor="#6b7280" stopOpacity="0"/>
                </linearGradient>
            </defs>
            <path d={`M${points.split(' ')[0]} L${points.substring(points.indexOf(' ') + 1)} L${width},${height} L0,${height} Z`} fill={trendFill} />
            <polyline
                fill="none"
                stroke={trendStroke}
                strokeWidth="2"
                points={points}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
};

const TrendIcon: React.FC<{ trend: 'up' | 'down' | 'stable' }> = ({ trend }) => {
    switch(trend) {
        case 'up': return <FaArrowUp className="text-green-500" size={12} />;
        case 'down': return <FaArrowDown className="text-red-500" size={12} />;
        default: return <FaMinus className="text-gray-500" size={10} />;
    }
};

const PodiumCard: React.FC<{ student?: RankedStudent; rank: 1 | 2 | 3; onClick: (id: number) => void }> = ({ student, rank, onClick }) => {
    if (!student) return <div className="w-1/3" />;
    
    const rankConfig = {
        1: {
            container: 'w-1/3 relative z-10 transform scale-115 -translate-y-4',
            card: 'bg-yellow-400/20 p-3 rounded-xl border border-yellow-400 text-center shadow-[0_0_20px_rgba(250,204,21,0.5)]',
            avatar: 'w-20 h-20 border-yellow-400',
            medalIcon: <FaCrown size={32} />,
            medalContainer: 'absolute -top-5 left-1/2 -translate-x-1/2 text-yellow-400',
            scoreColor: 'text-yellow-300'
        },
        2: {
            container: 'w-1/3 relative',
            card: 'bg-slate-700/50 p-3 rounded-xl border border-slate-500 text-center',
            avatar: 'w-16 h-16 border-slate-300',
            medalIcon: <FaMedal size={24} />,
            medalContainer: 'absolute -top-3 -right-3 text-slate-300',
            scoreColor: 'text-slate-300'
        },
        3: {
            container: 'w-1/3 relative',
            card: 'bg-amber-600/20 p-3 rounded-xl border border-amber-600 text-center',
            avatar: 'w-16 h-16 border-amber-600',
            medalIcon: <FaMedal size={24} />,
            medalContainer: 'absolute -top-3 -left-3 text-amber-600',
            scoreColor: 'text-amber-500'
        }
    }[rank];

    return (
        <motion.div 
            initial={{ y: 50, opacity: 0 }} 
            animate={{ y: 0, opacity: 1 }} 
            transition={{ delay: 0.3 - (rank * 0.1) }} 
            className={rankConfig.container}
            onClick={() => onClick(student.id)}
        >
            <div className={`${rankConfig.card} cursor-pointer hover:bg-opacity-30 transition-colors h-full flex flex-col justify-between`}>
                <div className="relative inline-block mx-auto">
                    <StudentAvatar {...student} className={`${rankConfig.avatar} rounded-full object-cover border-4 shadow-lg`} />
                    <div className={rankConfig.medalContainer}>{rankConfig.medalIcon}</div>
                </div>
                <div className="mt-2">
                    <p className="font-bold text-sm text-white break-words leading-tight">{student.name}</p>
                    <p className={`font-bold text-xs ${rankConfig.scoreColor} mt-1`}>{student.score} نقطة</p>
                </div>
            </div>
        </motion.div>
    );
};


const calculateScores = (
    students: Student[], 
    sessions: Session[], 
    timeframe: string, 
    customRange: {start: string, end: string}, 
    studyStartDate: string, 
    pointsSettings: PointsSettings
): RankedStudent[] => {

    const getPeriodRange = (offset = 0) => {
        const now = new Date();
        let startDate: Date;
        let endDate: Date = new Date();

        switch (timeframe) {
            case 'week':
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (now.getDay() + 1) % 7 + offset * 7);
                endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (now.getDay() + 1) % 7 + 6 + offset * 7);
                break;
            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth() + offset, 1);
                endDate = new Date(now.getFullYear(), now.getMonth() + 1 + offset, 0);
                break;
            case 'year':
                startDate = new Date(now.getFullYear() + offset, 0, 1);
                endDate = new Date(now.getFullYear() + offset, 11, 31);
                break;
            case 'custom':
                 if (!customRange.start || !customRange.end) return { startDate: new Date(0), endDate: new Date(0) };
                 const start = new Date(customRange.start);
                 const end = new Date(customRange.end);
                 const diff = end.getTime() - start.getTime();
                 startDate = new Date(start.getTime() + offset * diff);
                 endDate = new Date(end.getTime() + offset * diff);
                 break;
            default: // 'all'
                startDate = new Date(studyStartDate);
                endDate = new Date();
                if(offset !== 0) return { startDate: new Date(0), endDate: new Date(0) };
                break;
        }

        startDate.setHours(0,0,0,0);
        endDate.setHours(23,59,59,999);
        return { startDate, endDate };
    };

    const calculateStudentDataForPeriod = (student: Student, relevantSessions: Session[], periodRange: {startDate: Date, endDate: Date}) => {
        let totalPoints = 0;
        const resetTime = student.lastPointResetDate ? new Date(student.lastPointResetDate).getTime() : 0;

        relevantSessions.forEach(session => {
            // Ignore points if session is before the reset date
            if (session.createdAt <= resetTime) return;

            const studentData = session.students.find(ss => ss.id === student.id);
            if (studentData) {
                // Pass session to use its snapshot if available
                totalPoints += calculatePointsForSession(studentData, pointsSettings, session.isLesson, session);
            }
        });

        (student.manualPoints || []).forEach(adj => {
            const adjDateObj = new Date(adj.date);
            const adjTime = adjDateObj.getTime();
            
            // Ignore if before reset
            if (adjTime <= resetTime) return;

            if (adjDateObj >= periodRange.startDate && adjDateObj <= periodRange.endDate) {
                totalPoints += adj.amount;
            }
        });

        const studentSessionsData = relevantSessions.map(s => s.students.find(ss => ss.id === student.id)).filter(Boolean);
        const totalSessionsInPeriod = studentSessionsData.length;
        const attendanceDays = studentSessionsData.filter(s => s!.attendance === 'present' || s!.attendance === 'late').length;

        return { totalPoints, attendanceDays, totalSessionsInPeriod };
    };
    
    const { startDate: mainStartDate, endDate: mainEndDate } = getPeriodRange(0);
    const { startDate: prevStartDate, endDate: prevEndDate } = getPeriodRange(-1);

    const prevPeriodSessions = sessions.filter(s => { const d = new Date(s.date); return d >= prevStartDate && d <= prevEndDate; });

    const NUM_INTERVALS = 10;
    const totalDuration = mainEndDate.getTime() - mainStartDate.getTime();
    const intervalDuration = totalDuration > (24*60*60*1000) ? totalDuration / NUM_INTERVALS : 0;
    
    const rankedStudents = students.map(student => {
        const progressData: number[] = [];
        let cumulativePoints = 0;

        if (intervalDuration > 0) {
            for (let i = 0; i < NUM_INTERVALS; i++) {
                const intervalStart = new Date(mainStartDate.getTime() + i * intervalDuration);
                const intervalEnd = new Date(mainStartDate.getTime() + (i + 1) * intervalDuration);
                const intervalSessions = sessions.filter(s => { const d = new Date(s.date); return d >= intervalStart && d < intervalEnd; });
                const intervalData = calculateStudentDataForPeriod(student, intervalSessions, {startDate: intervalStart, endDate: intervalEnd});
                cumulativePoints += intervalData.totalPoints;
                progressData.push(cumulativePoints);
            }
        } else {
            const singlePeriodSessions = sessions.filter(s => new Date(s.date).getTime() >= mainStartDate.getTime() && new Date(s.date).getTime() <= mainEndDate.getTime());
            const score = calculateStudentDataForPeriod(student, singlePeriodSessions, {startDate: mainStartDate, endDate: mainEndDate}).totalPoints;
            for (let i = 0; i < NUM_INTERVALS; i++) progressData.push(score);
        }

        const mainPeriodSessions = sessions.filter(s => { const d = new Date(s.date); return d >= mainStartDate && d <= mainEndDate; });
        const currentData = calculateStudentDataForPeriod(student, mainPeriodSessions, {startDate: mainStartDate, endDate: mainEndDate});
        
        const previousData = calculateStudentDataForPeriod(student, prevPeriodSessions, {startDate: prevStartDate, endDate: prevEndDate});
        
        let trend: 'up' | 'down' | 'stable' = 'stable';
        if(currentData.totalPoints > previousData.totalPoints) trend = 'up';
        else if (currentData.totalPoints < previousData.totalPoints) trend = 'down';

        return {
            ...student,
            score: currentData.totalPoints,
            attendanceDays: currentData.attendanceDays,
            totalSessionsInPeriod: currentData.totalSessionsInPeriod,
            progressData,
            trend
        };
    }).sort((a,b) => b.score - a.score)
      .map((s, i) => ({ ...s, rank: i + 1 }));

    return rankedStudents;
};


const Leaderboard: React.FC<LeaderboardProps> = ({ students, sessions, studyStartDate, onClose, pointsSettings, onStudentClick }) => {
    const [timeframe, setTimeframe] = useState('all');
    const [customRange, setCustomRange] = useState({ start: '', end: '' });
    const [isTimeframeOpen, setIsTimeframeOpen] = useState(false);
    
    const timeframeRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (timeframeRef.current && !timeframeRef.current.contains(event.target as Node)) setIsTimeframeOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const rankedStudents: RankedStudent[] = useMemo(() => {
        return calculateScores(students, sessions, timeframe, customRange, studyStartDate, pointsSettings);
    }, [students, sessions, timeframe, customRange, studyStartDate, pointsSettings]);

    const podiumStudents = rankedStudents.slice(0, 3);
    const restOfStudents = rankedStudents.slice(3);

    return (
        <motion.div variants={modalVariants} initial="initial" animate="animate" exit="exit" className="fixed inset-0 bg-gradient-to-br from-slate-800 to-slate-900 text-white z-[170] flex flex-col max-w-md mx-auto">
            <header className="flex-shrink-0 p-4 flex items-center justify-between border-b border-white/10">
                <button onClick={onClose}><FaArrowLeft size={20} /></button>
                <h1 className="text-xl font-bold tracking-wider">لوحة الشرف</h1>
                <div className="w-5 h-5"></div>
            </header>
            
            <div className="flex-shrink-0 p-3 space-y-2 bg-black/20 border-b border-white/10">
                <div className="flex gap-2 text-sm">
                    {/* Timeframe Dropdown */}
                    <div className="relative flex-1" ref={timeframeRef}>
                        <button onClick={() => setIsTimeframeOpen(p => !p)} className="w-full flex justify-between items-center p-2 bg-white/5 rounded-md text-sm">
                           <span>{timeframes.find(t => t.key === timeframe)?.label || 'مخصصة'}</span> <FaChevronDown size={12} />
                        </button>
                        <AnimatePresence>
                        {isTimeframeOpen && <motion.div initial={{opacity:0, y:-5}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-5}} className="absolute top-full right-0 mt-1 w-full bg-slate-800 rounded-md shadow-lg z-10 border border-slate-700">
                           {timeframes.map(t => <button key={t.key} onClick={()=>{setTimeframe(t.key); setIsTimeframeOpen(false);}} className="block w-full text-right p-2 hover:bg-slate-700">{t.label}</button>)}
                        </motion.div>}
                        </AnimatePresence>
                    </div>
                </div>
                {timeframe === 'custom' && <div className="grid grid-cols-2 gap-2 text-sm">
                    <input type="date" value={customRange.start} onChange={e => setCustomRange(p => ({...p, start: e.target.value}))} className="p-2 border rounded-lg bg-white/5 border-white/10 w-full" />
                    <input type="date" value={customRange.end} onChange={e => setCustomRange(p => ({...p, end: e.target.value}))} className="p-2 border rounded-lg bg-white/5 border-white/10 w-full" />
                </div>}
            </div>

            <main className="flex-grow overflow-y-auto p-4 space-y-4">
                {/* Podium */}
                <div className="relative flex justify-center items-end gap-2 px-4 pt-8 pb-12">
                    <PodiumCard student={podiumStudents.find(s => s.rank === 2)} rank={2} onClick={onStudentClick} />
                    <PodiumCard student={podiumStudents.find(s => s.rank === 1)} rank={1} onClick={onStudentClick} />
                    <PodiumCard student={podiumStudents.find(s => s.rank === 3)} rank={3} onClick={onStudentClick} />
                </div>

                {/* Rest of students list */}
                <div className="space-y-2">
                    {restOfStudents.map((student, index) => (
                        <motion.div key={student.id} initial={{x:50, opacity:0}} animate={{x:0, opacity:1}} transition={{delay: 0.3 + index * 0.05}} 
                            className="p-2 rounded-lg flex items-center justify-between bg-white/5 hover:bg-white/10 backdrop-blur-sm border border-white/5 cursor-pointer"
                            onClick={() => onStudentClick(student.id)}
                        >
                           
                           <div className="flex items-center gap-3 flex-1 min-w-0">
                                <span className="font-bold text-lg w-8 text-center text-gray-400 flex-shrink-0">{student.rank}</span>
                               <StudentAvatar {...student} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                               <div className="flex-grow min-w-0">
                                    <p className="font-semibold break-words leading-tight">{student.name}</p>
                               </div>
                           </div>
                           
                            <div className="flex items-center gap-3 flex-shrink-0">
                                <TrendIcon trend={student.trend} />
                                <Sparkline data={student.progressData} trend={student.trend} width={50} />
                                <span className="font-bold text-yellow-400 text-lg w-14 text-right">{student.score}</span>
                           </div>
                        </motion.div>
                    ))}
                </div>
            </main>
        </motion.div>
    );
};

export default Leaderboard;
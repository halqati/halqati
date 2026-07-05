
import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Student, Session, PointsSettings } from '../types';
import { FaTimes, FaTrophy, FaArrowUp, FaArrowDown, FaMedal, FaUserFriends, FaCrown, FaChartLine } from 'react-icons/fa';
import StudentAvatar from './StudentAvatar';
import { calculatePointsForSession, getGenderedTerm } from '../utils/helpers';

interface StudentRankModalProps {
    student: Student;
    allStudents: Student[];
    sessions: Session[];
    pointsSettings: PointsSettings;
    startDate: Date;
    endDate: Date;
    periodLabel: string;
    onClose: () => void;
}

const modalVariants = {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
};

const StudentRankModal: React.FC<StudentRankModalProps> = ({ student, allStudents, sessions, pointsSettings, startDate, endDate, periodLabel, onClose }) => {

    const isFemale = student.gender === 'female';
    const studentLabel = isFemale ? 'الطالبة' : 'الطالب';
    const verbBetter = isFemale ? 'تتفوق' : 'يتفوق';
    const verbKeep = isFemale ? 'حافظي' : 'حافظ';
    const suffix = isFemale ? 'ها' : 'ه';

    const rankingData = useMemo(() => {
        // 1. Calculate scores for ALL students in the specific period
        const scores = allStudents.map(s => {
            let score = 0;
            
            // Session Points
            sessions.forEach(session => {
                const sessionDate = new Date(session.date);
                if (sessionDate >= startDate && sessionDate <= endDate) {
                    const sData = session.students.find(ss => ss.id === s.id);
                    if (sData) {
                        score += calculatePointsForSession(sData, pointsSettings, session.isLesson, session);
                    }
                }
            });

            // Manual Points
            (s.manualPoints || []).forEach(adj => {
                const adjDate = new Date(adj.date);
                if (adjDate >= startDate && adjDate <= endDate) {
                    score += adj.amount;
                }
            });

            return { ...s, score };
        }).sort((a, b) => b.score - a.score); // Sort descending

        // 2. Find positions
        const myIndex = scores.findIndex(s => s.id === student.id);
        const myRank = myIndex + 1;
        const me = scores[myIndex];
        const above = myIndex > 0 ? scores[myIndex - 1] : null;
        const below = myIndex < scores.length - 1 ? scores[myIndex + 1] : null;

        // 3. Stats
        const totalStudents = scores.length;
        const superiority = totalStudents > 1 ? ((totalStudents - myRank) / (totalStudents - 1)) * 100 : 100;
        
        return { me, above, below, myRank, totalStudents, superiority };
    }, [allStudents, sessions, startDate, endDate, student.id, pointsSettings]);

    const { me, above, below, myRank, totalStudents, superiority } = rankingData;

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[250] p-4" onClick={onClose}>
            <motion.div 
                variants={modalVariants} 
                initial="initial" 
                animate="animate" 
                exit="exit" 
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]"
            >
                {/* Header Section */}
                <div className="bg-gradient-to-br from-primary to-primary-dark text-white p-5 text-center relative">
                    <button onClick={onClose} className="absolute top-4 left-4 bg-white/20 hover:bg-white/30 p-2 rounded-full transition-colors">
                        <FaTimes />
                    </button>
                    
                    <div className="mb-3 flex justify-center">
                        {myRank === 1 ? <FaCrown className="text-yellow-300 text-5xl drop-shadow-lg animate-bounce" /> : 
                         myRank === 2 ? <FaMedal className="text-gray-300 text-5xl drop-shadow-lg" /> :
                         myRank === 3 ? <FaMedal className="text-amber-600 text-5xl drop-shadow-lg" /> :
                         <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold border-4 border-white/30">{myRank}</div>}
                    </div>
                    
                    <h2 className="text-xl font-bold">{student.name}</h2>
                    <div className="flex items-center justify-center gap-2 mt-2 text-sm bg-black/20 w-fit mx-auto px-3 py-1 rounded-full">
                        <FaChartLine className="text-white/80" />
                        <span>الفترة: {periodLabel}</span>
                    </div>
                </div>

                {/* Body Section */}
                <div className="p-6 space-y-6 overflow-y-auto bg-gray-50 dark:bg-gray-900 flex-grow">
                    
                    {/* Superiority Bar */}
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-bold text-gray-500">نسبة التفوق</span>
                            <span className="text-sm font-bold text-primary dark:text-accent">{superiority.toFixed(0)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                            <motion.div 
                                initial={{ width: 0 }} 
                                animate={{ width: `${superiority}%` }} 
                                transition={{ duration: 1, delay: 0.2 }}
                                className="bg-primary h-2.5 rounded-full" 
                            />
                        </div>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-2 text-center leading-relaxed">
                            {studentLabel} <strong>{student.name}</strong> {verbBetter} على {superiority.toFixed(0)}% من أقران{suffix} في الحلقة خلال هذه الفترة.
                        </p>
                    </div>

                    {/* The Ladder (Comparison) */}
                    <div className="space-y-3 relative">
                        {/* Connecting Line */}
                        <div className="absolute top-4 bottom-4 right-[2.2rem] w-0.5 bg-gray-200 dark:bg-gray-700 -z-0"></div>

                        {above ? (
                            <div className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 opacity-70 scale-95">
                                <div className="flex items-center gap-3 z-10 bg-white dark:bg-gray-800 pr-2">
                                    <span className="text-gray-400 font-bold w-4 text-center">{myRank - 1}</span>
                                    <StudentAvatar {...above} className="w-8 h-8 rounded-full" />
                                    <span className="text-sm font-semibold truncate max-w-[100px]">{above.name}</span>
                                </div>
                                <div className="flex items-center gap-1 text-green-600 text-[10px] font-bold bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-full">
                                    <FaArrowUp size={10} />
                                    <span>الفارق: {above.score - me.score}</span>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center text-xs text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded-lg border border-yellow-200 dark:border-yellow-800">
                                <FaCrown className="inline mb-1"/> {studentLabel} في الصدارة!
                            </div>
                        )}

                        {/* Current Student */}
                        <div className="flex items-center justify-between p-4 rounded-xl bg-white dark:bg-gray-800 border-2 border-primary dark:border-accent shadow-md transform scale-105 z-10">
                            <div className="flex items-center gap-3">
                                <span className="text-primary dark:text-accent font-bold w-4 text-center text-lg">{myRank}</span>
                                <StudentAvatar {...student} className="w-10 h-10 rounded-full border-2 border-primary" />
                                <div>
                                    <span className="text-sm font-bold block">{student.name}</span>
                                    <span className="text-xs text-gray-500">{me.score} نقطة</span>
                                </div>
                            </div>
                            <div className="bg-primary text-white text-[10px] px-3 py-1 rounded-full">
                                {studentLabel}
                            </div>
                        </div>

                        {below ? (
                            <div className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 opacity-70 scale-95">
                                <div className="flex items-center gap-3 z-10 bg-white dark:bg-gray-800 pr-2">
                                    <span className="text-gray-400 font-bold w-4 text-center">{myRank + 1}</span>
                                    <StudentAvatar {...below} className="w-8 h-8 rounded-full" />
                                    <span className="text-sm font-semibold truncate max-w-[100px]">{below.name}</span>
                                </div>
                                <div className="flex items-center gap-1 text-red-500 text-[10px] font-bold bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded-full">
                                    <FaArrowDown size={10} />
                                    <span>الفارق: {me.score - below.score}</span>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center text-[10px] text-gray-400">
                                لا يوجد طلاب في مرتبة أدنى حالياً.
                            </div>
                        )}
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl text-center border border-blue-100 dark:border-blue-800">
                            <FaUserFriends className="mx-auto text-blue-500 mb-1" />
                            <p className="text-xl font-bold text-blue-700 dark:text-blue-300">{totalStudents}</p>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400">إجمالي الطلاب</p>
                        </div>
                        <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-xl text-center border border-purple-100 dark:border-purple-800">
                            <FaTrophy className="mx-auto text-purple-500 mb-1" />
                            <p className="text-xl font-bold text-purple-700 dark:text-purple-300">{me.score}</p>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400">نقاط الفترة</p>
                        </div>
                    </div>

                </div>
            </motion.div>
        </div>
    );
};

export default StudentRankModal;

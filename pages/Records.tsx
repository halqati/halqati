
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Student, Session, StudentReport } from '../types';
import { formatDate, formatSurahAyah, formatHomeworkRecord, normalizeText } from '../utils/helpers';
import { FaUserGraduate, FaUserClock, FaUserTimes, FaUserCheck, FaArrowLeft, FaFileAlt, FaBookOpen, FaStar, FaListAlt, FaBook, FaArrowUp, FaSearch, FaChevronLeft, FaStickyNote } from 'react-icons/fa';
import SavedStudentReportsModal from '../components/SavedStudentReportsModal';
import StudentAvatar from '../components/StudentAvatar';
import SessionDatePickerModal from '../components/SessionDatePickerModal';

interface RecordsProps {
    students: Student[];
    sessions: Session[];
    studentReports: StudentReport[];
    onOpenReportGenerator: (studentId: number) => void;
    onShowReport: (studentId: number, content: string, period: string) => void;
    onViewSavedReport: (report: StudentReport) => void;
    selectedStudentId: number | null;
    setSelectedStudentId: (id: number | null) => void;
    addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
    onDeleteSavedReport: (reportId: number) => void;
}

const Records: React.FC<RecordsProps> = ({ students, sessions, studentReports, onOpenReportGenerator, onShowReport, onViewSavedReport, selectedStudentId, setSelectedStudentId, addToast, onDeleteSavedReport }) => {
    const [showSavedReports, setShowSavedReports] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [showScrollButtons, setShowScrollButtons] = useState(false);
    const [highlightedDate, setHighlightedDate] = useState<string | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    
    const sortedStudents = useMemo(() => [...students].sort((a,b) => a.order - b.order), [students]);

    const studentLastActivity = useMemo(() => {
        const activityMap = new Map<number, string>();
        sessions
            .slice()
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .forEach(session => {
                session.students.forEach(sessionStudent => {
                    if (students.some(s => s.id === sessionStudent.id) && !activityMap.has(sessionStudent.id)) {
                        activityMap.set(sessionStudent.id, session.date);
                    }
                });
            });
        return activityMap;
    }, [sessions, students]);

    const filteredStudents = useMemo(() => {
        const normalizedSearch = normalizeText(searchTerm);
        return sortedStudents.filter(s =>
            normalizeText(s.name).includes(normalizedSearch)
        );
    }, [sortedStudents, searchTerm]);


    const studentHistory = useMemo(() => {
        if (!selectedStudentId) return null;
        return sessions
            .map(s => ({...s, studentData: s.students.find(st => st.id === selectedStudentId)}))
            .filter(s => !!s.studentData)
            .reduce((acc, session) => {
                const date = session.date;
                if (!acc[date]) acc[date] = [];
                acc[date].push(session);
                acc[date].sort((a,b) => b.createdAt - a.createdAt);
                return acc;
            }, {} as { [date: string]: any[] });
    }, [selectedStudentId, sessions]);
    
    const sortedDates = useMemo(() => studentHistory ? Object.keys(studentHistory).sort((a,b) => new Date(b).getTime() - new Date(a).getTime()) : [], [studentHistory]);
    
    const savedReportsForStudent = useMemo(() => {
        if (!selectedStudentId) return [];
        return (studentReports || []).filter(r => r.studentId === selectedStudentId)
            .sort((a,b) => b.generatedAt - a.generatedAt);
    }, [selectedStudentId, studentReports]);

    useEffect(() => {
        setShowScrollButtons(false);
        if (containerRef.current) {
            containerRef.current.scrollTop = 0;
        }
    }, [selectedStudentId]);
    
    useEffect(() => {
        if (!selectedStudentId) return;

        const container = containerRef.current;
        const handleScroll = () => {
            if (container) {
                setShowScrollButtons(container.scrollTop > 200);
            }
        };
        container?.addEventListener('scroll', handleScroll);
        return () => container?.removeEventListener('scroll', handleScroll);
    }, [selectedStudentId]);

    const handleDateSelect = (selectedDate: string) => {
        if (selectedDate && sortedDates.includes(selectedDate)) {
            const element = document.getElementById(`record-date-group-${selectedDate}`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                setHighlightedDate(selectedDate);
                setTimeout(() => setHighlightedDate(null), 1500);
            }
        } else {
            addToast('لا يوجد سجل في هذا اليوم.', 'info');
        }
        setIsDatePickerOpen(false);
    };

    const scrollToTop = () => {
        containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const AttendanceIcon = ({ attendance }: { attendance: string }) => {
        switch (attendance) {
            case 'present': return <FaUserCheck className="text-green-500" />;
            case 'late': return <FaUserClock className="text-yellow-500" />;
            case 'absent': return <FaUserTimes className="text-red-500" />;
            case 'excused': return <FaUserGraduate className="text-blue-500" />;
            default: return null;
        }
    };
    
    if (selectedStudentId) {
        const student = students.find(s => s.id === selectedStudentId);
        return (
             <div className="h-full flex flex-col relative">
                <div className="flex items-center justify-between gap-3 mb-4 pb-4 border-b dark:border-gray-700 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setSelectedStudentId(null)}><FaArrowLeft /></button>
                        <h2 className="text-lg font-bold">سجل {student ? (student.gender === 'male' ? 'الطالب' : 'الطالبة') : 'الطالب'}: {student?.name}</h2>
                    </div>
                    <div className="flex items-center gap-2">
                         {savedReportsForStudent.length > 0 && (
                            <button onClick={() => setShowSavedReports(true)} className="text-sm bg-blue-500 text-white p-2 rounded-full flex items-center justify-center" aria-label="التقارير المحفوظة">
                                <FaListAlt />
                            </button>
                        )}
                        {sortedDates.length > 5 && (
                            <button
                                onClick={() => setIsDatePickerOpen(true)}
                                className="p-2 text-gray-500 dark:text-gray-400 opacity-20 hover:opacity-100 transition-all duration-300"
                                aria-label="بحث عن تاريخ"
                                title="بحث عن تاريخ"
                            >
                                <FaSearch size={18}/>
                            </button>
                        )}
                        <button onClick={() => onOpenReportGenerator(selectedStudentId)} className="text-sm bg-primary text-white px-3 py-2 rounded-lg flex items-center gap-1">
                            <FaFileAlt /> تقرير
                        </button>
                    </div>
                </div>
                
                <div ref={containerRef} className="space-y-4 overflow-y-auto flex-grow pb-20">
                    {sortedDates.length === 0 ? (
                        <p className="text-center text-gray-500 py-4">لا يوجد سجل جلسات لهذا الطالب بعد.</p>
                    ) : (
                        sortedDates.map(date => (
                            <div key={date} className={highlightedDate === date ? 'highlight-session rounded-lg' : ''}>
                                <h3 id={`record-date-group-${date}`} className="font-bold text-lg p-2 bg-gray-100 dark:bg-gray-700 rounded-md my-2 sticky top-0 z-10">{formatDate(date)}</h3>
                                <div className="space-y-2">
                                    {studentHistory && studentHistory[date].map(session => {
                                        const { studentData } = session;
                                        if (!studentData) return null;
                                        return (
                                        <div key={session.id} className="p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
                                            <div className="flex justify-between items-center mb-2">
                                                <p className="font-bold">{session.isLesson ? "درس" : "جلسة"} الساعة: {session.time}</p>
                                                <div className="flex items-center gap-2">
                                                    <AttendanceIcon attendance={studentData.attendance} />
                                                    <span className="text-sm">
                                                        {studentData.attendance === 'excused' ? `مستأذن ${studentData.excuse ? `(${studentData.excuse})` : ''}` : 
                                                         studentData.attendance === 'present' ? 'حاضر' :
                                                         studentData.attendance === 'late' ? 'متأخر' : 'غائب'}
                                                    </span>
                                                </div>
                                            </div>
                                            
                                            {session.isLesson ? (
                                              <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                                                  <FaBookOpen className="text-primary dark:text-accent" />
                                                  <span>{session.lessonType}{session.lessonTitle && `: ${session.lessonTitle}`}</span>
                                              </div>
                                            ) : (studentData.attendance === 'present' || studentData.attendance === 'late') ? (
                                                studentData.isKhatim ? (
                                                    (studentData.khatimRecitesReview ?? true) ? (
                                                        <div className="space-y-2 pt-2 border-t dark:border-gray-600">
                                                            <div className="flex justify-between items-center text-sm">
                                                                <span className="font-semibold flex items-center gap-2"><FaBook className="text-green-500"/> الحفظ:</span>
                                                                <span className="font-semibold text-green-600 dark:text-green-400">خاتم ⭐</span>
                                                            </div>
                                                            <div className="flex justify-between items-center text-sm">
                                                                <span className="font-semibold flex items-center gap-2"><FaBookOpen className="text-blue-500"/> المراجعة:</span>
                                                                <span>{studentData.review?.hasReview ? formatSurahAyah(studentData.review) : <span className="text-gray-400">لم يسمّع مراجعة</span>}</span>
                                                                {studentData.review?.rating !== undefined && <span className="font-bold text-yellow-500 flex items-center gap-1"><FaStar /> {studentData.review.rating}</span>}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="pt-2 border-t dark:border-gray-600 text-sm text-center text-gray-500 dark:text-gray-400 font-semibold">
                                                            طالب خاتم
                                                        </div>
                                                    )
                                                ) : (
                                                    <div className="space-y-2 pt-2 border-t dark:border-gray-600">
                                                        <div className="flex justify-between items-center text-sm">
                                                            <span className="font-semibold flex items-center gap-2"><FaBook className="text-green-500"/> الحفظ:</span>
                                                            <span>{studentData.memorization?.hasMemorization ? formatSurahAyah(studentData.memorization) : <span className="text-gray-400">{studentData.suspendedMemorization ? "موقوف" : "لم يحفظ"}</span>}</span>
                                                            {studentData.memorization?.rating !== undefined && <span className="font-bold text-yellow-500 flex items-center gap-1"><FaStar /> {studentData.memorization.rating}</span>}
                                                        </div>
                                                        <div className="flex justify-between items-center text-sm">
                                                            <span className="font-semibold flex items-center gap-2"><FaBookOpen className="text-blue-500"/> المراجعة:</span>
                                                            <span>{studentData.review?.hasReview ? formatSurahAyah(studentData.review) : <span className="text-gray-400">{studentData.suspendedReview ? "موقوف" : "لم يراجع"}</span>}</span>
                                                            {studentData.review?.rating !== undefined && <span className="font-bold text-yellow-500 flex items-center gap-1"><FaStar /> {studentData.review.rating}</span>}
                                                        </div>
                                                    </div>
                                                )
                                            ) : null}

                                            {studentData.note && (
                                                <div className="mt-2 pt-2 border-t dark:border-gray-600 text-sm text-gray-600 dark:text-gray-300 flex items-start gap-2">
                                                    <FaStickyNote className="mt-1 text-yellow-500 flex-shrink-0" />
                                                    <p className="whitespace-pre-wrap">{studentData.note}</p>
                                                </div>
                                            )}
                                            {studentData.homeworks && studentData.homeworks.length > 0 && (
                                                <div className="mt-2 pt-2 border-t dark:border-gray-600 text-sm text-indigo-600 dark:text-indigo-400">
                                                    <div className="flex items-center gap-2 font-bold mb-1">
                                                        <FaBook size={12} />
                                                        <span>الواجب:</span>
                                                    </div>
                                                    <div className="pr-5 space-y-0.5">
                                                        {studentData.homeworks.map((hw: any, idx: number) => {
                                                            const hwText = formatHomeworkRecord(hw, true);
                                                            return hwText ? <p key={idx}>• {hwText}</p> : null;
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <AnimatePresence>
                    {showScrollButtons && (
                        <motion.div
                            initial={{ y: 50, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 50, opacity: 0 }}
                            className="fixed bottom-20 left-4 z-30"
                        >
                            <button
                                onClick={scrollToTop}
                                className="w-10 h-10 flex items-center justify-center bg-gray-500/30 backdrop-blur-sm text-white rounded-full shadow-sm opacity-30 hover:opacity-100 transition-all duration-300"
                                aria-label="الرجوع إلى الأعلى"
                                title="الرجوع إلى الأعلى"
                            >
                                <FaArrowUp />
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>

                <AnimatePresence>
                {showSavedReports && (
                    <SavedStudentReportsModal 
                        reports={savedReportsForStudent}
                        onClose={() => setShowSavedReports(false)}
                        onShowReport={(report) => {
                            setShowSavedReports(false);
                            onViewSavedReport(report);
                        }}
                        onDelete={onDeleteSavedReport}
                    />
                )}
                </AnimatePresence>
                <AnimatePresence>
                    {isDatePickerOpen && (
                        <SessionDatePickerModal
                            isOpen={isDatePickerOpen}
                            onClose={() => setIsDatePickerOpen(false)}
                            dates={sortedDates}
                            onSelectDate={handleDateSelect}
                        />
                    )}
                </AnimatePresence>
            </div>
        );
    }

    return (
        <div className="">
            <h2 className="text-xl font-bold text-primary dark:text-accent mb-4 px-1">سجل الطلاب</h2>
            <div className="relative mb-4">
                <input
                    type="text"
                    placeholder="ابحث عن طالب..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full p-2 pr-10 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-700 shadow-sm"
                />
                <FaSearch className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400" />
            </div>
            <div className="space-y-2 max-h-[70vh] overflow-y-auto">
                {filteredStudents.length > 0 ? (
                    filteredStudents.map(student => (
                        <button key={student.id} onClick={() => setSelectedStudentId(student.id)} className="w-full flex items-center justify-between gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg text-right shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                             <div className="flex items-center gap-3 min-w-0 flex-1">
                                <StudentAvatar photo={student.photo} name={student.name} id={student.id} className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
                                <div className="flex-grow min-w-0">
                                    <span className="font-semibold truncate block">{student.name}</span>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                        آخر نشاط: {studentLastActivity.get(student.id) ? formatDate(studentLastActivity.get(student.id)!) : 'لا يوجد'}
                                    </p>
                                </div>
                            </div>
                            <FaChevronLeft className="text-gray-400 flex-shrink-0" />
                        </button>
                    ))
                ) : (
                    <p className="text-center text-gray-500 py-8">لم يتم العثور على طلاب.</p>
                )}
            </div>
        </div>
    );
};

export default Records;

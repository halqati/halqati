
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Reorder, useDragControls, AnimatePresence, motion } from 'framer-motion';
import { FaPlus, FaSearch, FaEdit, FaTrash, FaCheck, FaGripVertical, FaIdCard } from 'react-icons/fa';
import { Student } from '../types';
import StudentAvatar from '../components/StudentAvatar';
import { normalizeText } from '../utils/helpers';

interface StudentItemProps {
    student: Student;
    onEdit: (student: Student) => void;
    onDelete: (id: number) => void;
    onViewProfile: (id: number) => void;
    isReorderMode: boolean;
    onLongPress: () => void;
    index: number;
}

const StudentItem: React.FC<StudentItemProps> = ({ student, onEdit, onDelete, onViewProfile, isReorderMode, onLongPress, index }) => {
    const dragControls = useDragControls();
    const pressTimeout = useRef<number | null>(null);

    const getStudentStatus = (s: Student): { text: string | null; colorClass: string } => {
        if (s.isKhatim) {
            const text = s.khatimRecitesReview ? "خاتم – مراجعة" : "خاتم";
            return { text, colorClass: 'text-green-600 dark:text-green-400' };
        }
        
        const studentTerm = s.gender === 'male' ? 'موقوف' : 'موقوفة';
        let text: string | null = null;
        if (s.suspendedMemorization && s.suspendedReview) text = `${studentTerm} حفظ ومراجعة`;
        else if (s.suspendedMemorization) text = `${studentTerm} حفظ`;
        else if (s.suspendedReview) text = `${studentTerm} مراجعة`;
        
        return { text, colorClass: 'text-yellow-600 dark:text-yellow-500' };
    };

    const handlePointerDownOnName = (event: React.PointerEvent) => {
        // Only trigger long press if NOT in reorder mode
        if (isReorderMode) return; 
        
        pressTimeout.current = window.setTimeout(() => {
            if (navigator.vibrate) navigator.vibrate(50);
            onLongPress();
        }, 700); 
    };

    const handlePointerUp = () => {
        if (pressTimeout.current) {
            clearTimeout(pressTimeout.current);
            pressTimeout.current = null;
        }
    };

    const handlePointerLeave = () => {
        if (pressTimeout.current) {
            clearTimeout(pressTimeout.current);
            pressTimeout.current = null;
        }
    };

    const status = getStudentStatus(student);

    const Content = (
        <div className="flex items-center justify-between p-3 relative">
            <AnimatePresence mode="popLayout">
                {isReorderMode && (
                    <motion.div 
                        initial={{ width: 0, opacity: 0, marginRight: 0 }}
                        animate={{ width: 'auto', opacity: 1, marginRight: 8 }}
                        exit={{ width: 0, opacity: 0, marginRight: 0 }}
                        className="flex items-center gap-2"
                    >
                        <div 
                            className="flex items-center justify-center text-gray-400 cursor-grab active:cursor-grabbing p-1 touch-none"
                            onPointerDown={(e) => dragControls.start(e)}
                        >
                            <FaGripVertical size={20} />
                        </div>
                        <span className="text-xs font-bold text-gray-400 w-5 text-center">{index + 1}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="flex items-center gap-3 flex-1 min-w-0">
                <StudentAvatar photo={student.photo} name={student.name} id={student.id} className="w-12 h-12 rounded-full object-cover pointer-events-none flex-shrink-0" />
                <div className="flex-grow overflow-hidden">
                    <span 
                        className={`font-semibold truncate block ${status.text ? 'text-gray-800 dark:text-gray-200' : ''} select-none cursor-pointer active:opacity-70`}
                        onPointerDown={handlePointerDownOnName}
                        onPointerUp={handlePointerUp}
                        onPointerLeave={handlePointerLeave}
                        onPointerCancel={handlePointerLeave}
                    >{student.name}</span>
                    {status.text && (
                        <span className={`block text-xs font-semibold ${status.colorClass}`}>{status.text}</span>
                    )}
                </div>
            </div>
            
            <AnimatePresence mode="popLayout">
                {!isReorderMode && (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="flex gap-1"
                    >
                        <button onClick={(e) => { e.stopPropagation(); onViewProfile(student.id); }} className="text-purple-500 p-2 transition-colors" title="بطاقة الطالب"><FaIdCard size={14} /></button>
                        <button onClick={(e) => { e.stopPropagation(); onEdit(student); }} className="text-blue-500 p-2 transition-colors" title="تعديل"><FaEdit size={14} /></button>
                        <button onClick={(e) => { e.stopPropagation(); onDelete(student.id); }} className="text-red-500 p-2 transition-colors" title="حذف"><FaTrash size={14} /></button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );

    if (isReorderMode) {
        return (
            <Reorder.Item
                key={student.id}
                value={student}
                dragListener={false}
                dragControls={dragControls}
                className="rounded-lg shadow-sm overflow-hidden transition-colors mb-2 bg-white border-2 border-primary/20 dark:bg-gray-700 dark:border-accent/20"
                whileDrag={{
                    scale: 1.03,
                    boxShadow: "0px 10px 20px rgba(0,0,0,0.2)",
                    cursor: 'grabbing',
                    zIndex: 50
                }}
                layout
            >
                {Content}
            </Reorder.Item>
        );
    }

    return (
        <div className="rounded-lg shadow-sm overflow-hidden transition-colors bg-white dark:bg-gray-800 h-full">
            {Content}
        </div>
    );
};

const Students: React.FC<{
    students: Student[];
    onAdd: () => void;
    onEdit: (student: Student) => void;
    onDelete: (id: number) => void;
    onReorder: (students: Student[]) => void;
    onViewProfile: (id: number) => void;
}> = ({ students, onAdd, onEdit, onDelete, onReorder, onViewProfile }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isReorderMode, setIsReorderMode] = useState(false);
    
    const sortedStudents = useMemo(() => [...students].sort((a,b) => a.order - b.order), [students]);

    const filteredStudents = useMemo(() => {
        const normalizedSearch = normalizeText(searchTerm);
        return sortedStudents.filter(s =>
            normalizeText(s.name).includes(normalizedSearch)
        );
    }, [sortedStudents, searchTerm]);
    
    const [localFilteredStudents, setLocalFilteredStudents] = useState(filteredStudents);

    useEffect(() => {
        setLocalFilteredStudents(filteredStudents);
    }, [filteredStudents]);

    const handleReorderComplete = () => {
        setIsReorderMode(false);
    };

    return (
        <div className={`transition-colors duration-300 ${isReorderMode ? 'bg-primary/5 dark:bg-accent/5 rounded-lg p-2' : ''}`}>
            <div className="flex justify-between items-center mb-4 px-1">
                <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-primary dark:text-accent">
                        {isReorderMode ? 'إعادة ترتيب الطلاب' : `قائمة الطلاب (${students.length})`}
                    </h2>
                </div>
                
                <AnimatePresence mode="wait">
                    {isReorderMode ? (
                        <motion.button
                            key="done-btn"
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            exit={{ scale: 0, rotate: 180 }}
                            onClick={handleReorderComplete}
                            className="bg-green-500 text-white px-4 py-2 rounded-full flex items-center gap-2 shadow-lg font-bold"
                        >
                            <FaCheck /> حفظ الترتيب
                        </motion.button>
                    ) : (
                        <motion.button
                            key="add-btn"
                            initial={{ scale: 0, rotate: 180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            exit={{ scale: 0, rotate: -180 }}
                            onClick={onAdd}
                            className="bg-blue-400 text-white w-12 h-12 rounded-full flex items-center justify-center shadow-lg transform hover:scale-110 transition-transform"
                        >
                            <FaPlus />
                        </motion.button>
                    )}
                </AnimatePresence>
            </div>
            
            <AnimatePresence>
                {!isReorderMode && (
                    <motion.div 
                        initial={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="relative mb-4 overflow-hidden"
                    >
                        <input
                            type="text"
                            placeholder="ابحث عن طالب..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full p-2 pr-10 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-700 shadow-sm"
                        />
                        <FaSearch className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400" />
                    </motion.div>
                )}
            </AnimatePresence>

            {isReorderMode ? (
                 <Reorder.Group axis="y" values={localFilteredStudents} onReorder={(newOrder) => {
                    setLocalFilteredStudents(newOrder);
                    onReorder(newOrder); 
                }} className="space-y-2">
                    {localFilteredStudents.map((student, index) => (
                        <StudentItem
                            key={student.id}
                            student={student}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            onViewProfile={onViewProfile}
                            isReorderMode={true}
                            onLongPress={() => {}}
                            index={index}
                        />
                    ))}
                </Reorder.Group>
            ) : (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {localFilteredStudents.map((student, index) => (
                        <StudentItem
                            key={student.id}
                            student={student}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            onViewProfile={onViewProfile}
                            isReorderMode={false}
                            onLongPress={() => setIsReorderMode(true)}
                            index={index}
                        />
                    ))}
                </div>
            )}
            
            {localFilteredStudents.length === 0 && (
                <p className="text-center text-gray-500 py-8">
                    {searchTerm ? 'لا توجد نتائج للبحث.' : 'لا يوجد طلاب مضافين.'}
                </p>
            )}
        </div>
    );
};

export default Students;
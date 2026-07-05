
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Student, ConfirmationModalData } from '../types';
import { FaArrowLeft, FaSave, FaUsers, FaInfoCircle, FaPlus, FaTimes, FaSearch } from 'react-icons/fa';
import StudentAvatar from './StudentAvatar';
import StudentGroupSelector from './StudentGroupSelector';
import { normalizeText } from '../utils/helpers';

interface ActivityFormProps {
    activity: Activity | null;
    setActivity: (activity: Activity | null) => void;
    students: Student[];
    onSave: (activity: Activity) => void;
    onBack: () => void;
    setConfirmationModal: (data: Omit<ConfirmationModalData, 'isOpen'> & { isOpen: boolean }) => void;
    activityTypes: string[];
    onAddActivityType: (type: string) => void;
    onDeleteActivityType: (type: string) => void;
    circleId: string | number;
}

const modalVariants = {
    initial: { x: '100%' },
    animate: { x: 0 },
    exit: { x: '100%' },
};

const Section: React.FC<{ title: string; children: React.ReactNode; rightContent?: React.ReactNode; }> = ({ title, children, rightContent }) => (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold">{title}</h3>
            {rightContent}
        </div>
        {children}
    </div>
);

const CustomActivityTypeSelector: React.FC<{
    value: string;
    onChange: (newValue: string) => void;
    options: string[];
    onAdd: (newType: string) => void;
    onDelete: (typeToDelete: string) => void;
    setConfirmationModal: (data: Omit<ConfirmationModalData, 'isOpen'> & { isOpen: boolean }) => void;

}> = ({ value, onChange, options, onAdd, onDelete, setConfirmationModal }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [showAddInput, setShowAddInput] = useState(false);
    const [newType, setNewType] = useState('');
    const wrapperRef = useRef<HTMLDivElement>(null);
    const timerRef = useRef<number | null>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) setIsOpen(false);
        }
        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
            return () => document.removeEventListener("mousedown", handleClickOutside);
        }
    }, [isOpen]);

    const handleAdd = () => {
        if (newType.trim() && !options.includes(newType.trim())) {
            onAdd(newType.trim());
            onChange(newType.trim());
            setNewType('');
            setShowAddInput(false);
        }
    };

    const handleDelete = (typeToDelete: string) => {
        setConfirmationModal({
            isOpen: true,
            title: 'حذف نوع النشاط',
            message: `هل أنت متأكد من حذف "${typeToDelete}"؟`,
            onConfirm: () => {
                onDelete(typeToDelete);
                if (value === typeToDelete) onChange('');
                setConfirmationModal({ isOpen: false, title: '', message: '', onConfirm: () => {} });
            }
        });
    };
    
    return (
        <div className="relative w-full" ref={wrapperRef}>
            <input
                type="text"
                value={value}
                onChange={e => onChange(e.target.value)}
                onFocus={() => setIsOpen(true)}
                placeholder="نوع النشاط"
                className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600"
            />
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="absolute top-full left-0 mt-1 w-full bg-white dark:bg-gray-800 border dark:border-gray-600 rounded-lg shadow-lg z-20 max-h-60 overflow-y-auto"
                    >
                        {options.filter(opt => opt.includes(value)).map(opt => (
                            <div key={opt} className="flex items-center justify-between p-2 hover:bg-gray-100 dark:hover:bg-gray-700">
                                <button type="button" onClick={() => { onChange(opt); setIsOpen(false); }} className="w-full text-right">{opt}</button>
                                <button type="button" onClick={() => handleDelete(opt)} className="text-red-500 px-2"><FaTimes size={12}/></button>
                            </div>
                        ))}
                         <div className="border-t dark:border-gray-600 p-2">
                            {showAddInput ? (
                                <div className="flex gap-2">
                                    <input type="text" value={newType} onChange={e => setNewType(e.target.value)} className="w-full p-1 text-sm border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-500" placeholder="اكتب النوع الجديد" />
                                    <button type="button" onClick={handleAdd} className="p-2 bg-primary text-white rounded-md text-xs"><FaPlus/></button>
                                </div>
                            ) : (
                                <button type="button" onClick={() => setShowAddInput(true)} className="w-full text-sm text-primary dark:text-accent p-1 text-center">
                                    + إضافة نوع جديد
                                </button>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const ActivityForm: React.FC<ActivityFormProps> = ({ activity, setActivity, students, onSave, onBack, setConfirmationModal, activityTypes, onAddActivityType, onDeleteActivityType, circleId }) => {
    const [isStudentSelectorOpen, setIsStudentSelectorOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (activity && activity.id) { 
            const currentTargetIds = new Set(activity.targetStudentIds);
            const allStudentIds = new Set(students.map(s => s.id));
            
            const syncedTargetIds = activity.targetStudentIds.filter(id => allStudentIds.has(id));

            if (syncedTargetIds.length !== activity.targetStudentIds.length) {
                setActivity({ ...activity, targetStudentIds: syncedTargetIds });
            }
        }
    }, [activity, students, setActivity]);


    const handleFieldChange = <K extends keyof Activity>(field: K, value: Activity[K]) => {
        if(activity) {
            setActivity({ ...activity, [field]: value });
        }
    };
    
    const handleStudentSelection = (studentId: number) => {
        if (!activity) return;
        const newTargetIds = activity.targetStudentIds.includes(studentId)
            ? activity.targetStudentIds.filter(id => id !== studentId)
            : [...activity.targetStudentIds, studentId];
        
        handleFieldChange('targetStudentIds', newTargetIds);
    };
    
    const handleSelectAllStudents = () => {
         if (!activity) return;
         if (activity.targetStudentIds.length === students.length) {
            handleFieldChange('targetStudentIds', []);
         } else {
            handleFieldChange('targetStudentIds', students.map(s => s.id));
         }
    }

    const handleBack = () => {
        if (!activity) {
            onBack();
            return;
        }
        const hasData = activity.name.trim() !== '';
        if (!hasData) {
            setActivity(null); // Discard empty draft
        }
        onBack();
    };

    if (!activity) return null;

    const dateTypes = [{key: 'single', label: 'يوم واحد'}, {key: 'range', label: 'فترة'}] as const;
    const filteredStudentsForSelection = students.filter(s => normalizeText(s.name).includes(normalizeText(searchTerm)));

    return (
        <motion.div variants={modalVariants} initial="initial" animate="animate" exit="exit" transition={{type:'spring', stiffness: 300, damping: 30}} className="fixed inset-0 bg-gray-50 dark:bg-gray-900 z-40 flex flex-col p-4 max-w-md mx-auto">
            <header className="flex items-center justify-between mb-4 pb-4 border-b dark:border-gray-700 flex-shrink-0">
                <div className="flex items-center gap-3">
                    <button onClick={handleBack}><FaArrowLeft /></button>
                    <h2 className="text-xl font-bold text-primary dark:text-accent">{activity.createdAt === activity.id ? 'نشاط جديد' : 'تعديل النشاط'}</h2>
                </div>
                <button onClick={() => onSave(activity)} className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm">
                    <FaSave /> حفظ
                </button>
            </header>

            <main className="flex-grow overflow-y-auto space-y-4 pb-16">
                <Section title="تفاصيل النشاط">
                    <div className="space-y-3">
                        <input type="text" value={activity.name} onChange={e => handleFieldChange('name', e.target.value)} placeholder="اسم النشاط" className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600" />
                        <CustomActivityTypeSelector
                            value={activity.type}
                            onChange={(val) => handleFieldChange('type', val)}
                            options={activityTypes}
                            onAdd={onAddActivityType}
                            onDelete={onDeleteActivityType}
                            setConfirmationModal={setConfirmationModal}
                        />
                         <div className="grid grid-cols-2 gap-2">
                            {dateTypes.map(d => (
                                <button key={d.key} onClick={() => handleFieldChange('dateType', d.key)} className={`p-2 rounded-lg text-sm ${activity.dateType === d.key ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-700'}`}>{d.label}</button>
                            ))}
                        </div>
                         <div className="grid grid-cols-2 gap-2">
                            <input type="date" value={activity.startDate} onChange={e => handleFieldChange('startDate', e.target.value)} className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600" />
                            <input type="time" value={activity.startTime} onChange={e => handleFieldChange('startTime', e.target.value)} className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600" />
                        </div>
                        {activity.dateType === 'range' && <div className="grid grid-cols-2 gap-2">
                            <input type="date" value={activity.endDate || ''} onChange={e => handleFieldChange('endDate', e.target.value)} className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600" />
                             <input type="time" value={activity.endTime || ''} onChange={e => handleFieldChange('endTime', e.target.value)} className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600" />
                        </div>}
                        <textarea value={activity.notes || ''} onChange={e => handleFieldChange('notes', e.target.value)} placeholder="ملاحظات (اختياري)..." className="w-full p-2 h-24 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600"></textarea>
                    </div>
                 </Section>

                <Section title={`الطلاب (${activity.targetStudentIds.length})`} rightContent={
                    <button onClick={() => setIsStudentSelectorOpen(p => !p)} className="text-sm text-primary dark:text-accent font-bold bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{isStudentSelectorOpen ? 'إخفاء' : 'تعديل القائمة'}</button>
                }>
                    <AnimatePresence>
                        {isStudentSelectorOpen && <motion.div initial={{height:0, opacity:0}} animate={{height:'auto', opacity:1}} exit={{height:0, opacity:0}} className="space-y-2 overflow-hidden mt-2">
                             <StudentGroupSelector 
                                students={students}
                                selectedIds={activity.targetStudentIds}
                                onSelectionChange={(ids) => handleFieldChange('targetStudentIds', ids)}
                                circleId={circleId}
                                contextKey="activity"
                            />
                            <div className="relative mb-2">
                                <input
                                    type="text"
                                    placeholder="بحث عن طالب..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full p-2 pr-8 text-sm border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600"
                                />
                                <FaSearch className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
                            </div>
                            <div className="max-h-48 overflow-y-auto pr-1 space-y-1">
                                <label className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors">
                                    <input type="checkbox" checked={activity.targetStudentIds.length === students.length && students.length > 0} onChange={handleSelectAllStudents} className="w-4 h-4 accent-primary" />
                                    <FaUsers className="text-blue-500" />
                                    <span className="font-bold text-blue-700 dark:text-blue-300">تحديد الجميع</span>
                                </label>
                                {filteredStudentsForSelection.map(s => <label key={s.id} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                    <input type="checkbox" checked={activity.targetStudentIds.includes(s.id)} onChange={() => handleStudentSelection(s.id)} className="w-4 h-4 accent-primary" />
                                    <StudentAvatar {...s} className="w-6 h-6 rounded-full object-cover" />
                                    <span>{s.name}</span>
                                </label>)}
                            </div>
                        </motion.div>}
                    </AnimatePresence>
                </Section>
                 <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 p-2 bg-gray-100 dark:bg-gray-700/50 rounded-lg">
                    <FaInfoCircle/>
                    <span>
                        في حال الخروج قبل الحفظ، ستبقى البيانات كمسودة مؤقتة فقط إذا كانت تحتوي على بيانات.
                    </span>
                </div>
            </main>
        </motion.div>
    );
};

export default ActivityForm;

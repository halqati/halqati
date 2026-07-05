
import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Test, Student, ConfirmationModalData, Settings } from '../types';
import { FaArrowLeft, FaSave, FaUndo, FaUsers, FaInfoCircle, FaPlus, FaTimes, FaEdit, FaTrash, FaSearch, FaPen, FaChevronDown, FaExclamationCircle } from 'react-icons/fa';
import StudentAvatar from './StudentAvatar';
import StudentGroupSelector from './StudentGroupSelector';
import { sanitizeToEnglishNumber, normalizeText } from '../utils/helpers';

interface TestFormProps {
    test: Test | null;
    setTest: (test: Test | null) => void;
    students: Student[];
    onSave: (test: Test) => void;
    onBack: () => void;
    setConfirmationModal: (data: Omit<ConfirmationModalData, 'isOpen'> & { isOpen: boolean }) => void;
    onUpdateSettings: (newSettings: Partial<Settings>) => void;
    settings: Settings;
    circleId: string | number;
}

const modalVariants = {
    initial: { x: '100%' },
    animate: { x: 0 },
    exit: { x: '100%' },
};

const Section: React.FC<{ title: string; children: React.ReactNode; rightContent?: React.ReactNode; }> = ({ title, children, rightContent }) => (
    <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow border border-gray-100 dark:border-gray-700">
        <div className="flex justify-between items-center mb-2 border-b dark:border-gray-700 pb-2">
            <h3 className="font-bold text-sm text-primary dark:text-accent">{title}</h3>
            {rightContent}
        </div>
        {children}
    </div>
);

const CustomContentItem: React.FC<{ 
    contentKey: string; 
    checked: boolean; 
    onChange: (checked: boolean) => void; 
    onEdit: () => void;
    label: string;
}> = ({ contentKey, checked, onChange, onEdit, label }) => {
    return (
        <div className={`flex items-center gap-2 p-2 rounded-lg border transition-all ${checked ? 'bg-primary/10 border-primary/30' : 'bg-gray-50 dark:bg-gray-700/50 border-transparent'}`}>
            <label className="flex items-center gap-2 cursor-pointer select-none flex-grow">
                <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="w-4 h-4 accent-primary" />
                <span className={`text-xs font-medium ${checked ? 'text-primary dark:text-accent' : 'text-gray-600 dark:text-gray-300'}`}>{label}</span>
            </label>
            <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="text-gray-400 hover:text-blue-500 px-1">
                <FaEdit size={10} />
            </button>
        </div>
    );
}

const TestForm: React.FC<TestFormProps> = ({ test, setTest, students, onSave, onBack, setConfirmationModal, onUpdateSettings, settings, circleId }) => {
    const [isStudentSelectorOpen, setIsStudentSelectorOpen] = useState(false);
    const [newContentType, setNewContentType] = useState('');
    const [showAddContent, setShowAddContent] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Grade Table Search
    const [gradeSearchTerm, setGradeSearchTerm] = useState('');
    
    // Editing Content State
    const [editingContentKey, setEditingContentKey] = useState<string | null>(null);
    const [editContentName, setEditContentName] = useState('');

    // Editing Max Score State
    const [editingMaxScoreKey, setEditingMaxScoreKey] = useState<string | null>(null);
    const [editMaxScoreValue, setEditMaxScoreValue] = useState('');

    useEffect(() => {
        if (test) {
            // Sync targetStudentIds with results array on mount/update
            const newResults = [...test.results];
            let updated = false;

            // Add missing results
            test.targetStudentIds.forEach(id => {
                if (!newResults.find(r => r.studentId === id)) {
                    newResults.push({ studentId: id, grades: {} });
                    updated = true;
                }
            });

            if (updated) {
                setTest({ ...test, results: newResults });
            }
        }
    }, [test?.targetStudentIds.length, test, setTest]);


    // Safe guard before rendering
    if (!test) return null;

    const handleFieldChange = <K extends keyof Test>(field: K, value: Test[K]) => {
        setTest({ ...test, [field]: value });
    };
    
    const handleStudentToggle = (studentId: number) => {
        const isSelected = test.targetStudentIds.includes(studentId);
        let newTargetIds: number[];
        let newResults = [...(test.results || [])];

        if (isSelected) {
            newTargetIds = test.targetStudentIds.filter(id => id !== studentId);
        } else {
            newTargetIds = [...test.targetStudentIds, studentId];
            if (!newResults.find(r => r.studentId === studentId)) {
                newResults.push({ studentId, grades: {} });
            }
        }
        setTest({ ...test, targetStudentIds: newTargetIds, results: newResults });
    };

    const handleSelectAllStudents = () => {
        if (test.targetStudentIds.length === students.length) {
            setTest({ ...test, targetStudentIds: [] });
        } else {
            const allIds = students.map(s => s.id);
            const newResults = [...(test.results || [])];
            allIds.forEach(id => {
                if (!newResults.find(r => r.studentId === id)) {
                    newResults.push({ studentId: id, grades: {} });
                }
            });
            setTest({ ...test, targetStudentIds: allIds, results: newResults });
        }
    };

    const getMaxScore = (key: string) => {
        return test.maxScores?.[key] ?? 100; // Default max score is 100
    };

    const handleGradeChange = (studentId: number, contentKey: string, value: string) => {
        const sanitizedValue = sanitizeToEnglishNumber(value);
        
        let numericValue: number | undefined = undefined;
        const maxScore = getMaxScore(contentKey);

        if (sanitizedValue !== '') {
            numericValue = parseInt(sanitizedValue, 10);
            if (isNaN(numericValue)) numericValue = undefined;
            else if (numericValue < 0) numericValue = 0;
            else if (numericValue > maxScore) return; // Prevent exceeding max score
        }

        let newResults = [...test.results];
        const resultIndex = newResults.findIndex(r => r.studentId === studentId);

        if (resultIndex > -1) {
            newResults[resultIndex] = {
                ...newResults[resultIndex],
                grades: { ...newResults[resultIndex].grades, [contentKey]: numericValue }
            };
        } else {
            newResults.push({
                studentId,
                grades: { [contentKey]: numericValue }
            });
        }

        handleFieldChange('results', newResults);
    };

    const handleSave = () => {
        const cleanResults = test.results.filter(r => test.targetStudentIds.includes(r.studentId));
        onSave({ ...test, results: cleanResults });
    };

    const handleBack = () => {
        const hasData = test.name.trim() !== '' || test.results.some(r => Object.keys(r.grades).length > 0);
        if (!hasData) {
            setTest(null);
        }
        onBack();
    };

    const handleReset = () => {
         setConfirmationModal({
            isOpen: true,
            title: "تصفير الدرجات",
            message: "هل أنت متأكد من تصفير جميع الدرجات المرصودة؟ لا يمكن التراجع عن هذا الإجراء.",
            onConfirm: () => {
                const resetResults = test.results.map(r => ({ ...r, grades: {} }));
                handleFieldChange('results', resetResults);
                setConfirmationModal({ isOpen: false, title: '', message: '', onConfirm: () => {} });
            }
        });
    }

    // --- Content & Label Management ---

    const getLabel = (key: string) => {
        if (test.customLabels && test.customLabels[key]) return test.customLabels[key];
        if (key === 'memorization') return 'الحفظ';
        if (key === 'review') return 'المراجعة';
        if (key === 'recitation') return 'التلاوة';
        return key;
    };

    const handleAddContent = () => {
        if (newContentType.trim()) {
            const rawName = newContentType.trim();
            const key = rawName; 
            
            if (!test.content[key]) {
                const savedDefault = settings.defaultTestMaxScores?.[key] ?? 20;
                
                // Perform ALL updates in a single setTest to avoid race conditions/overwrites
                setTest({
                    ...test,
                    content: { ...test.content, [key]: true },
                    customLabels: { ...test.customLabels, [key]: rawName },
                    maxScores: { ...test.maxScores, [key]: savedDefault }
                });

                // Save new type to global settings for future use
                const currentCustomTypes = settings.customTestContentTypes || [];
                if (!currentCustomTypes.includes(key)) {
                    onUpdateSettings({
                        customTestContentTypes: [...currentCustomTypes, key]
                    });
                }
            }
            setNewContentType('');
            setShowAddContent(false);
        }
    };

    const openEditContentModal = (key: string) => {
        setEditingContentKey(key);
        setEditContentName(getLabel(key)); // Load CURRENT label
    };

    const handleRenameContent = () => {
         if (!editingContentKey || !editContentName.trim()) return;
         
         const newLabels = { ...test.customLabels, [editingContentKey]: editContentName.trim() };
         handleFieldChange('customLabels', newLabels);
         
         setEditingContentKey(null);
    };

    const handleDeleteContent = () => {
        if (!editingContentKey) return;
        
        setConfirmationModal({
            isOpen: true,
            title: 'حذف محتوى',
            message: `هل أنت متأكد من حذف "${getLabel(editingContentKey)}" من الاختبار؟ سيتم حذف الدرجات المرتبطة به.`,
            onConfirm: () => {
                const newContent = { ...test.content };
                delete newContent[editingContentKey];
                
                const newResults = test.results.map(r => {
                    const newGrades = { ...r.grades };
                    delete newGrades[editingContentKey];
                    return { ...r, grades: newGrades };
                });
                
                setTest({ ...test, content: newContent, results: newResults });
                setEditingContentKey(null);
                setConfirmationModal({ isOpen: false, title: '', message: '', onConfirm: () => {} });
            }
        });
    };

    // --- Max Score Management ---

    const openMaxScoreModal = (key: string) => {
        setEditingMaxScoreKey(key);
        setEditMaxScoreValue(getMaxScore(key).toString());
    };

    const handleSaveMaxScore = () => {
        if (!editingMaxScoreKey) return;
        const val = parseInt(sanitizeToEnglishNumber(editMaxScoreValue), 10);
        if (!isNaN(val) && val > 0) {
            const newMaxScores = { ...test.maxScores, [editingMaxScoreKey]: val };
            handleFieldChange('maxScores', newMaxScores);

            const currentDefaults = settings.defaultTestMaxScores || {};
            onUpdateSettings({
                defaultTestMaxScores: { ...currentDefaults, [editingMaxScoreKey]: val }
            });
        }
        setEditingMaxScoreKey(null);
    };

    // --- Filtering Logic ---
    const targetedStudents = useMemo(() => {
        const targetIds = test.targetStudentIds || [];
        return students.filter(s => targetIds.includes(s.id)).sort((a,b) => a.order - b.order);
    }, [students, test.targetStudentIds]);

    const filteredTargetedStudents = useMemo(() => {
        if (!gradeSearchTerm) return targetedStudents;
        const normalizedTerm = normalizeText(gradeSearchTerm);
        return targetedStudents.filter(s => normalizeText(s.name).includes(normalizedTerm));
    }, [targetedStudents, gradeSearchTerm]);


    // --- Render Helpers ---

    const testTypes = [{key: 'monthly', label: 'شهري'}, {key: 'weekly', label: 'أسبوعي'}, {key: 'annual', label: 'سنوي'}] as const;
    
    const enabledContentKeys = Object.keys(test.content).filter(k => test.content[k]);
    
    const filteredStudentsForSelection = students.filter(s => normalizeText(s.name).includes(normalizeText(searchTerm)));

    const calculateTotal = (result: any) => {
        if (!result) return 0;
        let sum = 0;
        enabledContentKeys.forEach(key => {
            sum += (result.grades[key] || 0);
        });
        return sum;
    };

    const totalMaxScore = enabledContentKeys.reduce((acc, key) => acc + getMaxScore(key), 0);

    return (
        <motion.div variants={modalVariants} initial="initial" animate="animate" exit="exit" transition={{type:'spring', stiffness: 300, damping: 30}} className="fixed inset-0 bg-gray-50 dark:bg-gray-900 z-40 flex flex-col p-3 max-w-md mx-auto">
            <header className="flex items-center justify-between mb-3 pb-3 border-b dark:border-gray-700 flex-shrink-0">
                <div className="flex items-center gap-2">
                    <button onClick={handleBack}><FaArrowLeft /></button>
                    <h2 className="text-lg font-bold text-primary dark:text-accent">{test.createdAt === test.id ? 'اختبار جديد' : 'تعديل الاختبار'}</h2>
                </div>
                <button onClick={handleSave} className="bg-primary text-white px-3 py-1.5 rounded-lg flex items-center gap-1 text-xs font-bold shadow-sm">
                    <FaSave /> حفظ
                </button>
            </header>

            <main className="flex-grow overflow-y-auto space-y-3 pb-12 no-scrollbar">
                 <Section title="تفاصيل الاختبار">
                    <div className="space-y-2">
                        <input type="text" value={test.name} onChange={e => handleFieldChange('name', e.target.value)} placeholder="اسم الاختبار (مثال: اختبار جزء عم)" className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600 focus:ring-1 focus:ring-primary outline-none text-sm" />
                        <div className="grid grid-cols-3 gap-2">
                            {testTypes.map(t => (
                                <button key={t.key} onClick={() => handleFieldChange('testType', t.key)} className={`p-1.5 rounded-lg text-xs transition-colors ${test.testType === t.key ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>{t.label}</button>
                            ))}
                        </div>
                    </div>
                 </Section>

                <Section title={`الطلاب (${test.targetStudentIds.length})`} rightContent={
                    <button onClick={() => setIsStudentSelectorOpen(p => !p)} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs text-primary dark:text-accent font-bold hover:bg-gray-200 dark:hover:bg-gray-600">{isStudentSelectorOpen ? 'إخفاء' : 'تعديل القائمة'}</button>
                }>
                    <AnimatePresence>
                        {isStudentSelectorOpen && <motion.div initial={{height:0, opacity:0}} animate={{height:'auto', opacity:1}} exit={{height:0, opacity:0}} className="space-y-2 overflow-hidden mt-2">
                             <StudentGroupSelector 
                                students={students}
                                selectedIds={test.targetStudentIds}
                                onSelectionChange={(ids) => {
                                    // Special handling for TestForm to ensure results are correctly synced
                                    const newResults = [...(test.results || [])];
                                    ids.forEach(id => {
                                        if (!newResults.find(r => r.studentId === id)) {
                                            newResults.push({ studentId: id, grades: {} });
                                        }
                                    });
                                    setTest({ ...test, targetStudentIds: ids, results: newResults });
                                }}
                                circleId={circleId}
                                contextKey="test"
                            />
                             <div className="relative mb-2">
                                <input
                                    type="text"
                                    placeholder="بحث عن طالب..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full p-1.5 pr-7 text-xs border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600"
                                />
                                <FaSearch className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]" />
                            </div>
                             <div className="max-h-32 overflow-y-auto p-1 space-y-1 border rounded-lg dark:border-gray-700">
                                <label className="flex items-center gap-2 p-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors">
                                    <input type="checkbox" checked={test.targetStudentIds.length === students.length && students.length > 0} onChange={handleSelectAllStudents} className="w-3.5 h-3.5 accent-primary" />
                                    <FaUsers className="text-blue-500" size={14} />
                                    <span className="font-bold text-blue-700 dark:text-blue-300 text-xs">تحديد الجميع</span>
                                </label>
                                {filteredStudentsForSelection.map(s => <label key={s.id} className="flex items-center gap-2 p-1.5 bg-gray-50 dark:bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                    <input type="checkbox" checked={test.targetStudentIds.includes(s.id)} onChange={() => handleStudentToggle(s.id)} className="w-3.5 h-3.5 accent-primary" />
                                    <StudentAvatar {...s} className="w-5 h-5 rounded-full object-cover" />
                                    <span className="text-xs">{s.name}</span>
                                </label>)}
                             </div>
                        </motion.div>}
                    </AnimatePresence>
                </Section>

                <Section title="محتوى الاختبار" rightContent={
                    <button onClick={() => setShowAddContent(true)} className="text-xs flex items-center gap-1 text-green-600 dark:text-green-400 hover:underline font-bold"><FaPlus size={10}/> إضافة</button>
                }>
                    <div className="space-y-2">
                        <div className="flex flex-wrap gap-2">
                            {Object.keys(test.content).map(key => (
                                <CustomContentItem 
                                    key={key}
                                    contentKey={key}
                                    label={getLabel(key)}
                                    checked={test.content[key]}
                                    onChange={c => handleFieldChange('content', {...test.content, [key]: c})}
                                    onEdit={() => openEditContentModal(key)}
                                />
                            ))}
                        </div>
                        <AnimatePresence>
                            {showAddContent && (
                                <motion.div initial={{height:0, opacity:0}} animate={{height:'auto', opacity:1}} exit={{height:0, opacity:0}} className="flex gap-2 overflow-hidden pt-2">
                                    <input 
                                        type="text" 
                                        value={newContentType} 
                                        onChange={e => setNewContentType(e.target.value)} 
                                        placeholder="اسم الحقل (مثال: تجويد)" 
                                        className="flex-grow p-1.5 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600 text-xs"
                                    />
                                    <button onClick={handleAddContent} className="p-1.5 bg-primary text-white rounded-lg disabled:opacity-50 text-xs" disabled={!newContentType.trim()}>إضافة</button>
                                    <button onClick={() => setShowAddContent(false)} className="p-1.5 bg-gray-200 dark:bg-gray-600 rounded-lg text-gray-500"><FaTimes size={12}/></button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </Section>

                <div className="space-y-2">
                    <div className="flex justify-between items-end px-1 mb-2">
                         <h3 className="font-bold text-sm">جدول الدرجات</h3>
                         <div className="flex items-center gap-2">
                             {/* Search Input for Grades */}
                             {targetedStudents.length > 0 && (
                                <div className="relative w-32">
                                    <input
                                        type="text"
                                        placeholder="بحث في الجدول..."
                                        value={gradeSearchTerm}
                                        onChange={(e) => setGradeSearchTerm(e.target.value)}
                                        className="w-full py-1 px-2 pr-6 text-[10px] border rounded-full bg-white dark:bg-gray-800 dark:border-gray-700"
                                    />
                                    {gradeSearchTerm ? (
                                        <button onClick={() => setGradeSearchTerm('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500">
                                            <FaTimes size={8} />
                                        </button>
                                    ) : (
                                        <FaSearch className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-[8px]" />
                                    )}
                                </div>
                             )}
                             {targetedStudents.length > 0 && (
                                <button onClick={handleReset} className="text-[10px] text-red-500 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded hover:bg-red-100 dark:hover:bg-red-900/40 flex items-center gap-1">
                                    <FaTrash size={8} /> تصفير
                                </button>
                             )}
                         </div>
                    </div>
                    
                    {targetedStudents.length === 0 ? (
                        <div className="text-center py-6 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-500 text-xs">
                            <p>لم يتم تحديد طلاب.</p>
                        </div>
                    ) : (
                        <>
                            {filteredTargetedStudents.length === 0 ? (
                                <div className="text-center py-4 text-gray-500 text-xs">
                                    لا يوجد طلاب مطابقين للبحث.
                                </div>
                            ) : (
                                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden w-full">
                                    <table className="w-full table-fixed border-collapse text-right text-[10px]">
                                        <thead>
                                            <tr className="bg-gray-100 dark:bg-gray-700/50 border-b dark:border-gray-600 text-gray-600 dark:text-gray-300">
                                                <th className="p-1 w-[30%] font-bold sticky right-0 bg-gray-100 dark:bg-gray-800 z-10 border-l dark:border-gray-600 shadow-[1px_0_3px_-1px_rgba(0,0,0,0.1)] align-middle">
                                                    الاسم
                                                </th>
                                                {enabledContentKeys.map(key => (
                                                    <th key={key} className="p-0.5 border-l dark:border-gray-600 text-center align-bottom whitespace-normal break-words">
                                                        <div className="flex flex-col items-center justify-center gap-0.5 py-1">
                                                            <span className="w-full text-center font-semibold px-0.5">{getLabel(key)}</span>
                                                            <button 
                                                                onClick={() => openMaxScoreModal(key)} 
                                                                className="text-[9px] text-gray-400 hover:text-primary dark:hover:text-accent bg-white dark:bg-gray-700 px-1 rounded border border-dashed border-gray-300 dark:border-gray-500"
                                                            >
                                                                ({getMaxScore(key)})
                                                            </button>
                                                        </div>
                                                    </th>
                                                ))}
                                                <th className="p-1 w-[15%] font-bold text-center bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 border-r dark:border-gray-600 align-middle">
                                                    <div className="leading-tight">مجموع</div>
                                                    <div className="text-[8px] opacity-70">({totalMaxScore})</div>
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                            {filteredTargetedStudents.map(student => {
                                                const result = test.results.find(r => r.studentId === student.id);
                                                const total = calculateTotal(result);
                                                
                                                return (
                                                    <tr 
                                                        key={student.id} 
                                                        id={`grade-row-${student.id}`}
                                                        className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                                                    >
                                                        <td className="p-1 sticky right-0 bg-white dark:bg-gray-800 z-10 border-l dark:border-gray-600 shadow-[1px_0_3px_-1px_rgba(0,0,0,0.1)] align-middle">
                                                            <div className="flex items-center gap-1 py-1">
                                                                <StudentAvatar {...student} className="w-6 h-6 rounded-full object-cover border border-gray-200 dark:border-gray-600 flex-shrink-0" />
                                                                <span className="font-semibold text-[10px] leading-relaxed whitespace-normal break-words w-full">
                                                                    {student.name}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        {enabledContentKeys.map(key => (
                                                            <td key={key} className="p-0.5 border-l dark:border-gray-600 align-middle">
                                                                <input 
                                                                    type="text" 
                                                                    inputMode="numeric"
                                                                    placeholder="-"
                                                                    value={result?.grades[key] ?? ''} 
                                                                    onChange={e => handleGradeChange(student.id, key, e.target.value)} 
                                                                    className="w-full h-8 text-center font-bold border rounded bg-gray-50 dark:bg-gray-900 dark:border-gray-600 focus:ring-1 focus:ring-primary outline-none transition-all focus:bg-white dark:focus:bg-gray-800 text-[10px] p-0" 
                                                                />
                                                            </td>
                                                        ))}
                                                        <td className="p-0.5 text-center font-bold bg-blue-50/50 dark:bg-blue-900/10 text-blue-700 dark:text-blue-300 border-r dark:border-gray-600 text-[10px] align-middle">
                                                            {total}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                            
                            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 rounded-lg text-[10px] border border-blue-100 dark:border-blue-800/50 leading-relaxed">
                                <div className="flex items-center gap-1 font-bold mb-1 text-blue-900 dark:text-blue-100">
                                    <FaInfoCircle size={12} />
                                    <span>تنويه هام:</span>
                                </div>
                                <ul className="list-disc list-inside space-y-1 opacity-90">
                                    <li>إذا كنت لا تريد ظهور طالب معين في هذا الجدول، قم بإلغاء تحديده من قائمة "الطلاب" في الأعلى.</li>
                                    <li>الطلاب الموجودون في الجدول ولم ترصد لهم درجات (الخانات فارغة)، سيظهر في سجلاتهم <strong>"لم يرصد"</strong> ولن يُحتسب عليهم كصفر في المعدل.</li>
                                </ul>
                            </div>
                        </>
                    )}
                </div>
            </main>

            {/* Edit Content Name Modal */}
            <AnimatePresence>
                {editingContentKey && (
                    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
                        <motion.div initial={{scale:0.9, opacity:0}} animate={{scale:1, opacity:1}} exit={{scale:0.9, opacity:0}} className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-xl w-full max-w-sm border dark:border-gray-700">
                            <h3 className="font-bold mb-4 text-lg">تعديل: {getLabel(editingContentKey)}</h3>
                            <input 
                                type="text" 
                                value={editContentName} 
                                onChange={e => setEditContentName(e.target.value)} 
                                className="w-full p-3 border rounded-lg bg-gray-50 dark:bg-gray-900 dark:border-gray-600 mb-4 focus:ring-2 focus:ring-primary outline-none"
                                placeholder="الاسم الجديد"
                            />
                            <div className="flex flex-col gap-3">
                                <button onClick={handleRenameContent} className="bg-primary text-white p-3 rounded-lg flex items-center justify-center gap-2 font-bold"><FaPen size={12}/> حفظ الاسم الجديد</button>
                                <button onClick={handleDeleteContent} className="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-300 p-3 rounded-lg flex items-center justify-center gap-2 font-bold border border-red-200 dark:border-red-800"><FaTrash size={12}/> حذف هذا الحقل</button>
                                <button onClick={() => setEditingContentKey(null)} className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 p-3 rounded-lg font-bold mt-1">إلغاء</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Edit Max Score Modal */}
            <AnimatePresence>
                {editingMaxScoreKey && (
                    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
                        <motion.div initial={{scale:0.9, opacity:0}} animate={{scale:1, opacity:1}} exit={{scale:0.9, opacity:0}} className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-xl w-full max-w-xs border dark:border-gray-700 text-center">
                            <h3 className="font-bold mb-2 text-lg">الدرجة الكبرى لـ "{getLabel(editingMaxScoreKey)}"</h3>
                            <p className="text-xs text-gray-500 mb-4">أدخل الدرجة الكاملة لهذا العمود. سيتم حفظها للاختبارات القادمة.</p>
                            <input 
                                type="text" 
                                inputMode="numeric"
                                value={editMaxScoreValue} 
                                onChange={e => setEditMaxScoreValue(sanitizeToEnglishNumber(e.target.value))} 
                                className="w-24 p-3 text-center text-xl font-bold border rounded-lg bg-gray-50 dark:bg-gray-900 dark:border-gray-600 mb-6 focus:ring-2 focus:ring-primary outline-none mx-auto block"
                            />
                            <div className="flex gap-2 justify-center">
                                <button onClick={() => setEditingMaxScoreKey(null)} className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg font-bold">إلغاء</button>
                                <button onClick={handleSaveMaxScore} className="bg-primary text-white px-6 py-2 rounded-lg font-bold">حفظ وتطبيق</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default TestForm;


import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plan, Student, StudentPlan, PlanRecord, ConfirmationModalData, Settings, AlertModalData } from '../types';
import { FaArrowLeft, FaSave, FaUndo, FaUsers, FaInfoCircle, FaChevronDown, FaSearch, FaTimes } from 'react-icons/fa';
import StudentAvatar from './StudentAvatar';
import StudentGroupSelector from './StudentGroupSelector';
import { surahs } from '../constants';
import SurahSelectorModal from './SurahSelectorModal';
import { normalizeText } from '../utils/helpers';

interface PlanFormProps {
    plan: Plan | null;
    setPlan: (plan: Plan | null) => void;
    students: Student[];
    onSave: (plan: Plan) => void;
    onBack: () => void;
    setConfirmationModal: (data: Omit<ConfirmationModalData, 'isOpen'> & { isOpen: boolean }) => void;
    settings: Settings;
    setAlert: (data: AlertModalData) => void;
    isSubModalOpen: boolean;
    onSubModalOpen: () => void;
    onSubModalClose: () => void;
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

const PlanRecordInput: React.FC<{
    type: 'memorization' | 'review';
    planRecord: PlanRecord;
    onChange: (field: keyof PlanRecord, value: any) => void;
    settings: Settings;
    onOpenSelector: (onSelect: (value: string) => void, title: string) => void;
}> = ({ type, planRecord, onChange, settings, onOpenSelector }) => {
    
    const label = type === 'memorization' ? 'خطة الحفظ' : 'خطة المراجعة';
    
    // Forced List Selection as requested
    const handleFieldChange = (field: keyof PlanRecord, value: any) => {
        onChange(field, value);
    }

    return (
        <>
        <div className={`p-3 rounded-lg ${planRecord.hasPlan ? 'bg-primary-light/10 dark:bg-primary-dark/30' : 'bg-gray-50 dark:bg-gray-700/50'}`}>
            <label className="flex items-center gap-3 cursor-pointer">
                <input
                    type="checkbox"
                    checked={planRecord.hasPlan}
                    onChange={(e) => onChange('hasPlan', e.target.checked)}
                    className="w-5 h-5 accent-primary"
                />
                <span className="font-semibold text-gray-800 dark:text-white">{label}</span>
            </label>
            <AnimatePresence>
                {planRecord.hasPlan && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden space-y-2 mt-3"
                    >
                        <div className="grid grid-cols-2 gap-2">
                            <button type="button" onClick={() => onOpenSelector((value) => handleFieldChange('fromSurah', value), 'من سورة')} className="w-full p-1.5 border rounded-md text-sm bg-white dark:bg-gray-800 dark:border-gray-600 text-right truncate">
                                {planRecord.fromSurah || 'من سورة...'}
                            </button>
                            <input type="number" placeholder="آية" value={planRecord.fromAyah} onChange={e => onChange('fromAyah', e.target.value)} maxLength={4} className="w-full p-1 border rounded-md text-sm bg-white dark:bg-gray-800 dark:border-gray-600" />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <button type="button" onClick={() => onOpenSelector((value) => handleFieldChange('toSurah', value), 'إلى سورة')} className="w-full p-1.5 border rounded-md text-sm bg-white dark:bg-gray-800 dark:border-gray-600 text-right truncate">
                                {planRecord.toSurah || 'إلى سورة...'}
                            </button>
                            <input type="number" placeholder="آية" value={planRecord.toAyah} onChange={e => onChange('toAyah', e.target.value)} maxLength={4} className="w-full p-1 border rounded-md text-sm bg-white dark:bg-gray-800 dark:border-gray-600" />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
        </>
    );
};


const PlanForm: React.FC<PlanFormProps> = ({ plan, setPlan, students, onSave, onBack, setConfirmationModal, settings, setAlert, isSubModalOpen, onSubModalOpen, onSubModalClose, circleId }) => {
    const [isStudentSelectorOpen, setIsStudentSelectorOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [planSearchTerm, setPlanSearchTerm] = useState(''); // Search for the plan entry section
    const [surahSelector, setSurahSelector] = useState<{ isOpen: boolean; onSelect: (value: string) => void; title: string; }>({ isOpen: false, onSelect: () => {}, title: '' });

    // Effect to close sub-modals when the parent (App) signals a back press
    useEffect(() => {
        if (!isSubModalOpen) {
            setSurahSelector(prev => ({ ...prev, isOpen: false }));
        }
    }, [isSubModalOpen]);

    useEffect(() => {
        if (plan) {
            const defaultPlanRecord = { hasPlan: true, fromSurah: '', fromAyah: '', toSurah: '', toAyah: '' };
            const currentPlanIds = new Set(plan.studentPlans.map(p => p.studentId));
            
            const syncedPlans = [...plan.studentPlans];
            let updated = false;

            plan.targetStudentIds.forEach(id => {
                if (!currentPlanIds.has(id)) {
                    syncedPlans.push({
                        studentId: id,
                        memorization: { ...defaultPlanRecord },
                        review: { ...defaultPlanRecord },
                        notes: ''
                    });
                    updated = true;
                }
            });

            if (updated) {
                setPlan({ ...plan, studentPlans: syncedPlans });
            }
        }
    }, [plan?.targetStudentIds.length, plan, setPlan]);


    const handleFieldChange = <K extends keyof Plan>(field: K, value: Plan[K]) => {
        if(plan) {
            setPlan({ ...plan, [field]: value });
        }
    };

    const handleStudentSelection = (studentId: number) => {
        if (!plan) return;
        const newTargetIds = plan.targetStudentIds.includes(studentId)
            ? plan.targetStudentIds.filter(id => id !== studentId)
            : [...plan.targetStudentIds, studentId];
        
        // We update target IDs, the useEffect above will handle syncing the plan objects
        handleFieldChange('targetStudentIds', newTargetIds);
    };

    const handleSelectAllStudents = () => {
         if (!plan) return;
         if (plan.targetStudentIds.length === students.length) {
            handleFieldChange('targetStudentIds', []);
         } else {
            handleFieldChange('targetStudentIds', students.map(s => s.id));
         }
    }

    const handleStudentPlanChange = (studentId: number, type: 'memorization' | 'review' | 'notes', field: keyof PlanRecord | 'notes', value: any) => {
        if (!plan) return;

        const newStudentPlans = plan.studentPlans.map(p => {
            if (p.studentId === studentId) {
                if (type === 'notes') {
                    return { ...p, notes: value };
                }
                const updatedRecord = { ...p[type], [field as keyof PlanRecord]: value };
                return { ...p, [type]: updatedRecord };
            }
            return p;
        });

        handleFieldChange('studentPlans', newStudentPlans);
    };
    
    const normalizeSurahName = (name: string) => {
        if (!name) return '';
        return name.trim().replace(/ه$/, 'ة').replace(/[أإآ]/g, 'ا');
    };

    const checkAyahValidity = (planRecord: PlanRecord, studentName: string, type: 'memorization' | 'review') => {
        const recordTerm = type === 'memorization' ? "خطة الحفظ" : "خطة المراجعة";

        if (!planRecord || !planRecord.hasPlan) return '';

        const normalizedFromSurahName = normalizeSurahName(planRecord.fromSurah);
        const normalizedToSurahName = normalizeSurahName(planRecord.toSurah);

        const fromSurah = surahs.find(s => normalizeSurahName(s.name) === normalizedFromSurahName);
        const toSurah = surahs.find(s => normalizeSurahName(s.name) === normalizedToSurahName);

        let errorMsg = '';

        // Only validate if surah name is valid
        if (planRecord.fromAyah && fromSurah && parseInt(planRecord.fromAyah) > fromSurah.verses) {
            errorMsg += `${studentName}:\nآية البدء في ${recordTerm} (${planRecord.fromAyah}) أكبر من عدد آيات سورة ${fromSurah.name} (${fromSurah.verses}).\n\n`;
        }
        if (planRecord.toAyah && toSurah && parseInt(planRecord.toAyah) > toSurah.verses) {
            errorMsg += `${studentName}:\nآية الانتهاء في ${recordTerm} (${planRecord.toAyah}) أكبر من عدد آيات سورة ${toSurah.name} (${toSurah.verses}).\n\n`;
        }
        return errorMsg;
    };

    const handleSave = () => {
        if (plan) {
            let invalidAyahError = '';
            const studentMap = new Map<number, Student>(students.map(s => [s.id, s]));

            plan.studentPlans.forEach(p => {
                if (!plan.targetStudentIds.includes(p.studentId)) return;
                const studentName = studentMap.get(p.studentId)?.name || 'طالب غير معروف';
                
                invalidAyahError += checkAyahValidity(p.memorization, studentName, 'memorization');
                invalidAyahError += checkAyahValidity(p.review, studentName, 'review');
            });

            if (invalidAyahError) {
                setAlert({ isOpen: true, title: "❗ خطأ في إدخال الآيات", message: `يرجى تصحيح الأخطاء التالية:\n\n${invalidAyahError}` });
                return;
            }

            // Ensure we only save plans for currently targeted students
            const finalDraft = {
                ...plan,
                studentPlans: plan.studentPlans.filter(p => plan.targetStudentIds.includes(p.studentId))
            };
            onSave(finalDraft);
        }
    };

    const handleBack = () => {
         if (!plan) {
            onBack();
            return;
        }
        const hasData = plan.name.trim() !== '' || plan.studentPlans.some(p => (p.memorization.hasPlan && p.memorization.fromSurah) || (p.review.hasPlan && p.review.fromSurah) || p.notes);
        if (!hasData) {
            setPlan(null); // Discard empty draft
        }
        onBack();
    }
    
    const handleReset = () => {
        setConfirmationModal({
            isOpen: true,
            title: "تصفير الخطط",
            message: "هل أنت متأكد من تصفير جميع الخطط المدخلة للطلاب؟",
            onConfirm: () => {
                if (plan) {
                    const resetPlans = plan.studentPlans.map(p => ({ 
                        ...p, 
                        memorization: { ...p.memorization, fromSurah: '', fromAyah: '', toSurah: '', toAyah: '' },
                        review: { ...p.review, fromSurah: '', fromAyah: '', toSurah: '', toAyah: '' },
                        notes: '' 
                    }));
                    handleFieldChange('studentPlans', resetPlans);
                }
                setConfirmationModal({ isOpen: false, title: '', message: '', onConfirm: () => {} });
            }
        });
    }

    const targetedStudents = useMemo(() => {
        const targetIds = plan?.targetStudentIds || [];
        return students.filter(s => targetIds.includes(s.id)).sort((a,b) => a.order - b.order);
    }, [students, plan?.targetStudentIds]);

    const filteredTargetedStudents = useMemo(() => {
        const normalizedSearch = normalizeText(planSearchTerm);
        return targetedStudents.filter(s => normalizeText(s.name).includes(normalizedSearch));
    }, [targetedStudents, planSearchTerm]);
    
    if (!plan) return null;

    const durationTypes = [
        {key: 'week', label: 'أسبوع'}, {key: 'two_weeks', label: 'أسبوعين'}, 
        {key: 'month', label: 'شهر'}, {key: 'year', label: 'سنة'}, {key: 'custom', label: 'مخصصة'}
    ] as const;

    const filteredStudentsForSelection = students.filter(s => normalizeText(s.name).includes(normalizeText(searchTerm)));

    const handleOpenSelector = (onSelect: (value: string) => void, title: string) => {
        onSubModalOpen();
        setSurahSelector({
            isOpen: true,
            title,
            onSelect,
        });
    };

    return (
        <motion.div variants={modalVariants} initial="initial" animate="animate" exit="exit" transition={{type:'spring', stiffness: 300, damping: 30}} className="fixed inset-0 bg-gray-50 dark:bg-gray-900 z-40 flex flex-col p-4 max-w-md mx-auto">
            <header className="flex items-center justify-between mb-4 pb-4 border-b dark:border-gray-700 flex-shrink-0">
                <div className="flex items-center gap-3">
                    <button onClick={handleBack}><FaArrowLeft /></button>
                    <h2 className="text-xl font-bold text-primary dark:text-accent">{plan.createdAt === plan.id ? 'خطة جديدة' : 'تعديل الخطة'}</h2>
                </div>
                <button onClick={handleSave} className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm">
                    <FaSave /> حفظ
                </button>
            </header>

             <main className="flex-grow overflow-y-auto space-y-4 pb-16 no-scrollbar">
                 <Section title="تفاصيل الخطة">
                    <div className="space-y-3">
                        <input type="text" value={plan.name} onChange={e => handleFieldChange('name', e.target.value)} placeholder="اسم الخطة" className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600" />
                        <div className="grid grid-cols-3 gap-2">
                            {durationTypes.map(d => (
                                <button key={d.key} onClick={() => handleFieldChange('duration', d.key)} className={`p-2 rounded-lg text-sm ${plan.duration === d.key ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-700'}`}>{d.label}</button>
                            ))}
                        </div>
                        {plan.duration === 'custom' && <div className="grid grid-cols-2 gap-2">
                            <input type="date" value={plan.customStartDate || ''} onChange={e => handleFieldChange('customStartDate', e.target.value)} className="p-2 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600 w-full text-sm" />
                            <input type="date" value={plan.customEndDate || ''} onChange={e => handleFieldChange('customEndDate', e.target.value)} className="p-2 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600 w-full text-sm" />
                        </div>}
                    </div>
                 </Section>

                <Section title={`الطلاب (${plan.targetStudentIds.length})`} rightContent={
                    <button onClick={() => setIsStudentSelectorOpen(p => !p)} className="text-sm text-primary dark:text-accent font-bold bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{isStudentSelectorOpen ? 'إخفاء' : 'تعديل القائمة'}</button>
                }>
                    <AnimatePresence>
                        {isStudentSelectorOpen && <motion.div initial={{height:0, opacity:0}} animate={{height:'auto', opacity:1}} exit={{height:0, opacity:0}} className="space-y-2 overflow-hidden mt-2">
                             <StudentGroupSelector 
                                students={students}
                                selectedIds={plan.targetStudentIds}
                                onSelectionChange={(ids) => {
                                    // Special handling for PlanForm to ensure results are correctly synced
                                    const newStudentPlans: StudentPlan[] = [...plan.studentPlans];
                                    ids.forEach(id => {
                                        if (!newStudentPlans.find(s => s.studentId === id)) {
                                            newStudentPlans.push({
                                                studentId: id,
                                                memorization: { hasPlan: false, fromSurah: '', fromAyah: '', toSurah: '', toAyah: '' },
                                                review: { hasPlan: false, fromSurah: '', fromAyah: '', toSurah: '', toAyah: '' },
                                                notes: ''
                                            });
                                        }
                                    });
                                    setPlan({ ...plan, targetStudentIds: ids, studentPlans: newStudentPlans });
                                }}
                                circleId={circleId}
                                contextKey="plan"
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
                                    <input type="checkbox" checked={plan.targetStudentIds.length === students.length && students.length > 0} onChange={handleSelectAllStudents} className="w-4 h-4 accent-primary" />
                                    <FaUsers className="text-blue-500" />
                                    <span className="font-bold text-blue-700 dark:text-blue-300">تحديد الجميع</span>
                                </label>
                                {filteredStudentsForSelection.map(s => <label key={s.id} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                    <input type="checkbox" checked={plan.targetStudentIds.includes(s.id)} onChange={() => handleStudentSelection(s.id)} className="w-4 h-4 accent-primary" />
                                    <StudentAvatar {...s} className="w-6 h-6 rounded-full object-cover" />
                                    <span>{s.name}</span>
                                </label>)}
                            </div>
                        </motion.div>}
                    </AnimatePresence>
                </Section>
                <div className="space-y-3">
                    <div className="flex justify-between items-center px-2 flex-wrap gap-2">
                        <h3 className="font-bold">إدخال الخطط</h3>
                        <div className="flex items-center gap-3">
                             <button onClick={handleReset} className="text-xs text-gray-500 flex items-center gap-1 hover:text-red-500"><FaUndo/> تصفير الكل</button>
                        </div>
                    </div>
                    
                    {/* Search for Plan Entry */}
                    {targetedStudents.length > 0 && (
                        <div className="relative px-1">
                            <input
                                type="text"
                                placeholder="ابحث عن طالب لإدخال خطته..."
                                value={planSearchTerm}
                                onChange={(e) => setPlanSearchTerm(e.target.value)}
                                className="w-full p-2 pr-8 text-sm border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-700 shadow-sm"
                            />
                            <FaSearch className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
                        </div>
                    )}
                    
                    {targetedStudents.length === 0 ? (
                         <div className="text-center py-8 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-500">
                            <p>لم يتم تحديد طلاب لهذه الخطة بعد.</p>
                        </div>
                    ) : (
                        filteredTargetedStudents.length === 0 ? (
                             <div className="text-center py-8 text-gray-500">
                                <p>لا توجد نتائج للبحث.</p>
                            </div>
                        ) : (
                            filteredTargetedStudents.map(student => {
                                const studentPlan = plan.studentPlans.find(p => p.studentId === student.id);
                                if (!studentPlan) return null;
                                return (
                                    <div key={student.id} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                                        <div className="flex items-center gap-3 mb-3">
                                            <StudentAvatar {...student} className="w-10 h-10 rounded-full object-cover" />
                                            <span className="font-bold">{student.name}</span>
                                        </div>
                                        <div className="space-y-2">
                                            <PlanRecordInput
                                                type="memorization"
                                                planRecord={studentPlan.memorization}
                                                onChange={(field, value) => handleStudentPlanChange(student.id, 'memorization', field, value)}
                                                settings={settings}
                                                onOpenSelector={handleOpenSelector}
                                            />
                                            <PlanRecordInput
                                                type="review"
                                                planRecord={studentPlan.review}
                                                onChange={(field, value) => handleStudentPlanChange(student.id, 'review', field, value)}
                                                settings={settings}
                                                onOpenSelector={handleOpenSelector}
                                            />
                                            <textarea
                                                value={studentPlan.notes}
                                                onChange={e => handleStudentPlanChange(student.id, 'notes', 'notes', e.target.value)}
                                                placeholder="ملاحظات (اختياري)..."
                                                className="w-full p-2 h-16 text-sm border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600"
                                            />
                                        </div>
                                    </div>
                                );
                            })
                        )
                    )}
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 p-2 bg-gray-100 dark:bg-gray-700/50 rounded-lg">
                    <FaInfoCircle/>
                    <span>
                        في حال الخروج قبل الحفظ، ستبقى البيانات كمسودة مؤقتة فقط إذا كانت تحتوي على بيانات.
                    </span>
                </div>
            </main>
            <AnimatePresence>
            {surahSelector.isOpen && (
                <SurahSelectorModal
                    isOpen={surahSelector.isOpen}
                    onClose={() => {
                        setSurahSelector(prev => ({ ...prev, isOpen: false }));
                        onSubModalClose();
                    }}
                    onSelect={(value) => {
                        surahSelector.onSelect(value);
                        setSurahSelector(prev => ({ ...prev, isOpen: false }));
                        onSubModalClose();
                    }}
                    title={surahSelector.title}
                    surahOrder={settings.surahOrder || 'quranic'}
                />
            )}
            </AnimatePresence>
        </motion.div>
    );
};

export default PlanForm;
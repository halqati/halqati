
import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SessionStudent, Student, MemorizationRecord, ReviewRecord, HomeworkRecord, Settings, AppliedBulkAction } from '../types';
import { FaUsers, FaTimes, FaCheckCircle, FaPause, FaPlay, FaBook, FaStickyNote, FaPlusCircle, FaMinusCircle, FaCheck, FaExclamationTriangle, FaSearch, FaBookOpen, FaUserTimes, FaLayerGroup, FaTrashAlt, FaHistory, FaMagic } from 'react-icons/fa';
import StudentAvatar from './StudentAvatar';
import { normalizeText } from '../utils/helpers';
import SurahSelectorModal from './SurahSelectorModal';

interface BulkActionsModalProps {
    isOpen: boolean;
    onClose: () => void;
    students: SessionStudent[];
    onExecute: (targetStudentIds: number[], actionType: string, data: any) => void;
    settings: Settings;
    onOpenSurahSelector: (onSelect: (val: string) => void, title: string) => void;
    isLesson: boolean;
    appliedActions?: AppliedBulkAction[];
    onRemoveAction?: (id: number) => void;
    onOpenSmartScan?: () => void;
    addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

type ActionType = 'suspend_memo' | 'suspend_review' | 'add_homework' | 'add_note' | 'adjust_points' | 'mark_absent' | null;

const BulkActionsModal: React.FC<BulkActionsModalProps> = ({ isOpen, onClose, students, onExecute, settings, onOpenSurahSelector, isLesson, appliedActions = [], onRemoveAction, onOpenSmartScan, addToast }) => {
    const [selectedAction, setSelectedAction] = useState<ActionType>(null);
    const [targetStudentIds, setTargetStudentIds] = useState<Set<number>>(new Set());
    const [showHelp, setShowHelp] = useState(false);

    const actionHelp: Record<ActionType & string, string> = {
        suspend_memo: 'إيقاف الحفظ للطلاب المحددين. لن يظهر لهم حقل تسميع في الجلسات القادمة حتى يتم تفعيلهم مرة أخرى.',
        suspend_review: 'إيقاف المراجعة للطلاب المحددين. لن يظهر لهم حقل مراجعة في الجلسات القادمة حتى يتم تفعيلهم مرة أخرى.',
        add_homework: 'تكليف الطلاب المحددين بواجب معين (حفظ أو مراجعة أو نص مخصص) يظهر في تقاريرهم.',
        add_note: 'إضافة ملاحظة نصية سيتم تكرارها في سجل جميع الطلاب المحددين في هذه الجلسة.',
        adjust_points: 'إضافة أو خصم نقاط من الرصيد العام لكل الطلاب المحددين مع ذكر السبب لمتابعة سجل النقاط.',
        mark_absent: 'تحويل كافة الطلاب الذين لم يسجل لهم أي إنجاز في هذه الجلسة إلى غائبين تلقائياً لتسهيل عملية التحضير.'
    };
    
    // Correctly handle side effects of selectedAction changing
    useEffect(() => {
        if (selectedAction) {
            if (selectedAction === 'mark_absent') {
                const unrecorded = students.filter(s => 
                    s.attendance === 'present' && 
                    !s.memorization.hasMemorization && 
                    !s.review.hasReview &&
                    (s.extraMemorizations?.length || 0) === 0 &&
                    (s.extraReviews?.length || 0) === 0
                ).map(s => s.id);
                setTargetStudentIds(new Set(unrecorded));
            } else {
                setTargetStudentIds(new Set(students.map(s => s.id)));
            }
        }
    }, [selectedAction, students]);

    const [searchTerm, setSearchTerm] = useState('');
    
    // Action Specific States
    const [hwType, setHwType] = useState<'memo' | 'review' | 'both' | 'custom' | 'pages'>('memo');
    const [memoHw, setMemoHw] = useState({ fromSurah: '', fromAyah: '', toSurah: '', toAyah: '' });
    const [reviewHw, setReviewHw] = useState({ fromSurah: '', fromAyah: '', toSurah: '', toAyah: '' });
    const [fromPage, setFromPage] = useState('');
    const [toPage, setToPage] = useState('');
    const [customHw, setCustomHw] = useState('');
    const [note, setNote] = useState('');
    const [points, setPoints] = useState({ amount: 1, reason: '', type: 'add' as 'add' | 'subtract' });
    const [suspendType, setSuspendType] = useState({ memo: true, review: true, value: true });

    const filteredStudents = useMemo(() => {
        const norm = normalizeText(searchTerm);
        // Deduplicate locally just in case to prevent React warnings
        const uniqueStudents = students.filter((s, idx, self) => self.findIndex(t => t.id === s.id) === idx);
        return uniqueStudents.filter(s => normalizeText(s.name).includes(norm)).sort((a,b) => a.order - b.order);
    }, [students, searchTerm]);

    const handleToggleStudent = (id: number) => {
        setTargetStudentIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleSelectAll = () => setTargetStudentIds(new Set(students.map(s => s.id)));
    const handleDeselectAll = () => setTargetStudentIds(new Set());

    const handleExecuteAction = () => {
        if (targetStudentIds.size === 0) return;
        
        let data: any = {};
        if (selectedAction === 'add_homework') {
            data = { 
                hwType,
                memo: (hwType === 'memo' || hwType === 'both') ? memoHw : { fromSurah: '' }, 
                review: (hwType === 'review' || hwType === 'both') ? reviewHw : { fromSurah: '' }, 
                fromPage: (hwType === 'pages') ? fromPage : '',
                toPage: (hwType === 'pages') ? toPage : '',
                custom: (hwType === 'custom') ? customHw : '' 
            };
        } else if (selectedAction === 'add_note') {
            data = { note };
        } else if (selectedAction === 'adjust_points') {
            data = points;
        } else if (selectedAction === 'suspend_memo' || selectedAction === 'suspend_review') {
            data = { value: suspendType.value };
        } else if (selectedAction === 'mark_absent') {
            data = { attendance: 'absent' };
        }

        onExecute(Array.from(targetStudentIds), selectedAction!, data);
        onClose();
        setSelectedAction(null);
    };

    if (!isOpen) return null;

    const renderActionStep = () => {
        switch (selectedAction) {
            case 'suspend_memo':
            case 'suspend_review':
                const isMemo = selectedAction === 'suspend_memo';
                return (
                    <div className="space-y-4 text-center">
                        <div className={`p-4 rounded-2xl ${suspendType.value ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-green-50 dark:bg-green-900/20'} border-2 ${suspendType.value ? 'border-amber-200' : 'border-green-200'}`}>
                            <FaExclamationTriangle className={`mx-auto text-3xl mb-2 ${suspendType.value ? 'text-amber-500' : 'text-green-500'}`} />
                            <h4 className="font-bold dark:text-white">
                                {suspendType.value ? `إيقاف ${isMemo ? 'الحفظ' : 'المراجعة'}` : `تفعيل ${isMemo ? 'الحفظ' : 'المراجعة'}`}
                            </h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">سيتم {suspendType.value ? 'إيقاف' : 'إعادة تفعيل'} {isMemo ? 'الحفظ' : 'المراجعة'} للطلاب المحددين.</p>
                        </div>
                        <div className="flex gap-2 justify-center">
                            <button onClick={() => setSuspendType(p => ({...p, value: true}))} className={`px-4 py-2 rounded-xl border-2 transition-all ${suspendType.value ? 'bg-amber-500 border-amber-500 text-white' : 'border-gray-200 dark:border-gray-700 dark:text-gray-400'}`}>إيقاف</button>
                            <button onClick={() => setSuspendType(p => ({...p, value: false}))} className={`px-4 py-2 rounded-xl border-2 transition-all ${!suspendType.value ? 'bg-green-500 border-green-500 text-white' : 'border-gray-200 dark:border-gray-700 dark:text-gray-400'}`}>تفعيل</button>
                        </div>
                    </div>
                );
            case 'mark_absent':
                return (
                    <div className="space-y-4 text-center">
                        <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-900/20 border-2 border-red-200">
                            <FaUserTimes className="mx-auto text-3xl mb-2 text-red-500" />
                            <h4 className="font-bold dark:text-white">تحويل الغير مسمعين إلى (غائب)</h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">سيتم تغيير حالة الحضور للطلاب المحددين الذين لم يتم تسجيل تسميع أو مراجعة لهم إلى "غائب".</p>
                        </div>
                    </div>
                );
            case 'add_homework':
                return (
                    <div className="space-y-4">
                        <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-xl gap-1">
                            {(['memo', 'review', 'both', 'pages', 'custom'] as const).map(t => (
                                <button 
                                    key={t}
                                    onClick={() => setHwType(t)}
                                    className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all ${hwType === t ? 'bg-white dark:bg-gray-600 shadow-sm text-primary' : 'text-gray-500'}`}
                                >
                                    {t === 'memo' ? 'حفظ' : t === 'review' ? 'مراجعة' : t === 'both' ? 'كلاهما' : t === 'pages' ? 'صفحات' : 'مخطط'}
                                </button>
                            ))}
                        </div>

                        {(hwType === 'memo' || hwType === 'both') && (
                            <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border-r-4 border-indigo-500">
                                <h5 className="text-xs font-bold text-indigo-600 mb-2 flex items-center gap-1"><FaBook /> واجب الحفظ</h5>
                                <div className="grid grid-cols-2 gap-1">
                                    <button type="button" onClick={() => onOpenSurahSelector((v) => setMemoHw(p =>({...p, fromSurah: v, toSurah: v})), 'من سورة')} className="w-full p-2 text-[10px] border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-700 text-right truncate">
                                        {memoHw.fromSurah || 'من سورة...'}
                                    </button>
                                    <input type="text" placeholder="آية" value={memoHw.fromAyah} onChange={e => setMemoHw(p =>({...p, fromAyah: e.target.value}))} className="p-2 text-[10px] border rounded-lg dark:bg-gray-800 dark:border-gray-700 text-center" />
                                    <button type="button" onClick={() => onOpenSurahSelector((v) => setMemoHw(p =>({...p, toSurah: v})), 'إلى سورة')} className="w-full p-2 text-[10px] border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-700 text-right truncate">
                                        {memoHw.toSurah || 'إلى سورة...'}
                                    </button>
                                    <input type="text" placeholder="آية" value={memoHw.toAyah} onChange={e => setMemoHw(p =>({...p, toAyah: e.target.value}))} className="p-2 text-[10px] border rounded-lg dark:bg-gray-800 dark:border-gray-700 text-center" />
                                </div>
                            </div>
                        )}

                        {(hwType === 'review' || hwType === 'both') && (
                            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border-r-4 border-blue-500">
                                <h5 className="text-xs font-bold text-blue-600 mb-2 flex items-center gap-1"><FaBookOpen /> واجب المراجعة</h5>
                                <div className="grid grid-cols-2 gap-1">
                                    <button type="button" onClick={() => onOpenSurahSelector((v) => setReviewHw(p =>({...p, fromSurah: v, toSurah: v})), 'من سورة')} className="w-full p-2 text-[10px] border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-700 text-right truncate">
                                        {reviewHw.fromSurah || 'من سورة...'}
                                    </button>
                                    <input type="text" placeholder="آية" value={reviewHw.fromAyah} onChange={e => setReviewHw(p =>({...p, fromAyah: e.target.value}))} className="p-2 text-[10px] border rounded-lg dark:bg-gray-800 dark:border-gray-700 text-center" />
                                    <button type="button" onClick={() => onOpenSurahSelector((v) => setReviewHw(p =>({...p, toSurah: v})), 'إلى سورة')} className="w-full p-2 text-[10px] border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-700 text-right truncate">
                                        {reviewHw.toSurah || 'إلى سورة...'}
                                    </button>
                                    <input type="text" placeholder="آية" value={reviewHw.toAyah} onChange={e => setReviewHw(p =>({...p, toAyah: e.target.value}))} className="p-2 text-[10px] border rounded-lg dark:bg-gray-800 dark:border-gray-700 text-center" />
                                </div>
                            </div>
                        )}

                        {hwType === 'pages' && (
                            <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-2xl border-r-4 border-purple-500">
                                <h5 className="text-xs font-bold text-purple-600 mb-2 flex items-center gap-1"><FaLayerGroup /> تكليف بصور (صفحات)</h5>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-[10px] text-gray-400 mb-1 text-right">من صفحة</label>
                                        <input 
                                            type="text" 
                                            placeholder="مثال: 10" 
                                            className="w-full p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 text-center text-xs font-bold"
                                            value={fromPage}
                                            onChange={e => setFromPage(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-gray-400 mb-1 text-right">إلى صفحة</label>
                                        <input 
                                            type="text" 
                                            placeholder="مثال: 15" 
                                            className="w-full p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 text-center text-xs font-bold"
                                            value={toPage}
                                            onChange={e => setToPage(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {hwType === 'custom' && (
                            <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-2xl border-r-4 border-purple-500">
                                <h5 className="text-xs font-bold text-purple-600 mb-2 flex items-center gap-1"><FaStickyNote /> تفاصيل واجب مخصص</h5>
                                <textarea 
                                    className="w-full p-3 border rounded-xl bg-white dark:bg-gray-800 dark:border-gray-700 h-20 text-sm"
                                    placeholder="اكتب تفاصيل الواجب هنا..."
                                    value={customHw}
                                    onChange={e => setCustomHw(e.target.value)}
                                />
                            </div>
                        )}
                    </div>
                );
            case 'add_note':
                return (
                    <div className="space-y-3">
                        <label className="text-sm font-bold dark:text-white block">الملاحظة الجماعية:</label>
                        <textarea 
                            value={note} 
                            onChange={e => setNote(e.target.value)}
                            placeholder="اكتب ملاحظة سيتم إضافتها لكل الطلاب المحددين..."
                            className="w-full p-3 border rounded-2xl bg-gray-50 dark:bg-gray-800 dark:border-gray-700 h-24 text-sm"
                        />
                    </div>
                );
            case 'adjust_points':
                return (
                    <div className="space-y-6 p-1">
                        <div className="flex bg-gray-100 dark:bg-gray-700 p-1.5 rounded-2xl gap-1">
                            <button 
                                onClick={() => setPoints(p =>({...p, type: 'add'}))} 
                                className={`flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${points.type === 'add' ? 'bg-white dark:bg-gray-600 shadow-md text-emerald-600' : 'text-gray-400'}`}
                            >
                                <FaPlusCircle size={14} /> إضافة
                            </button>
                            <button 
                                onClick={() => setPoints(p =>({...p, type: 'subtract'}))} 
                                className={`flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${points.type === 'subtract' ? 'bg-white dark:bg-gray-600 shadow-md text-rose-600' : 'text-gray-400'}`}
                            >
                                <FaMinusCircle size={14} /> خصم
                            </button>
                        </div>
                        <div className="grid grid-cols-[1fr,2fr] gap-3">
                             <div className="relative">
                                 <label className="block text-[8px] font-bold text-gray-400 mb-1 text-right pr-2 uppercase">النقاط</label>
                                 <input 
                                    type="text" 
                                    inputMode="numeric"
                                    value={points.amount} 
                                    onChange={e => {
                                        const val = e.target.value;
                                        const sanitized = val.replace(/[٠-٩]/g, d => '0123456789'['٠١٢٣٤٥٦٧٨٩'.indexOf(d)]).replace(/[^0-9-]/g, '');
                                        setPoints(p =>({...p, amount: Number(sanitized) || 0}));
                                    }} 
                                    className="w-full py-3 border rounded-2xl dark:bg-gray-900 dark:border-gray-700 text-center text-2xl font-black font-sans text-primary dark:text-accent" 
                                    style={{ fontFeatureSettings: '"tnum"' }}
                                />
                             </div>
                             <div className="relative">
                                 <label className="block text-[8px] font-bold text-gray-400 mb-1 text-right pr-2 uppercase">السبب (إلزامي)</label>
                                 <input 
                                    type="text" 
                                    placeholder="مثال: تفاعل مميز..." 
                                    value={points.reason} 
                                    onChange={e => setPoints(p =>({...p, reason: e.target.value}))} 
                                    className="w-full py-4 px-4 border rounded-2xl dark:bg-gray-900 dark:border-gray-700 text-right text-xs focus:ring-2 focus:ring-primary/20 outline-none transition-all" 
                                />
                             </div>
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[300] flex flex-col justify-end">
            <motion.div 
                initial={{ y: '100%' }} 
                animate={{ y: 0 }} 
                exit={{ y: '100%' }}
                className="bg-white dark:bg-gray-800 w-full max-w-lg mx-auto h-[92vh] rounded-t-[2.5rem] shadow-2xl flex flex-col overflow-hidden relative"
            >
                {/* Header */}
                <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-primary/10 rounded-xl">
                            <FaUsers className="text-primary text-xl" />
                        </div>
                        <div>
                            <h3 className="font-bold dark:text-white">حقيبة الأدوات الجماعية</h3>
                            <p className="text-[10px] text-gray-500 italic">نفذ أوامرك على مجموعة من الطلاب بضغطة واحدة</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                        <FaTimes className="text-gray-400" />
                    </button>
                </div>

                <div className="flex-grow overflow-y-auto p-4 space-y-6">
                    {!selectedAction && appliedActions.length > 0 && (
                        <div className="bg-primary/5 dark:bg-primary-900/20 rounded-2xl p-3 border border-primary/10">
                            <h4 className="text-[10px] font-bold text-primary mb-2 flex items-center gap-1.5"><FaHistory /> العمليات المنفذة في هذه الجلسة</h4>
                            <div className="flex flex-wrap gap-2">
                                {appliedActions.map(action => (
                                    <div key={action.id} className="flex items-center gap-2 bg-white dark:bg-gray-800 p-1 px-2 rounded-lg border dark:border-gray-700 shadow-sm animate-in fade-in slide-in-from-bottom-1">
                                        <span className="text-[10px] font-medium text-gray-700 dark:text-gray-300">{action.label} ({action.targetIds.length})</span>
                                        <button 
                                            onClick={() => onRemoveAction?.(action.id)}
                                            className="text-red-400 hover:text-red-600 transition-colors"
                                            title="إزالة العملية"
                                        >
                                            <FaTimes size={10} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {!selectedAction ? (
                        <div className="grid grid-cols-3 gap-2">
                            <ToolCard key="tool-pause-memo" icon={<FaPause />} label="إيقاف الحفظ" color="amber" disabled={isLesson} onClick={() => { setSelectedAction('suspend_memo'); setSuspendType({ memo: true, review: false, value: true }); }} onShowHelp={() => { setSelectedAction('suspend_memo'); setShowHelp(true); }} />
                            <ToolCard key="tool-pause-review" icon={<FaPause />} label="إيقاف مراجعة" color="orange" disabled={isLesson} onClick={() => { setSelectedAction('suspend_review'); setSuspendType({ memo: false, review: true, value: true }); }} onShowHelp={() => { setSelectedAction('suspend_review'); setShowHelp(true); }} />
                            <ToolCard key="tool-mark-absent" icon={<FaUserTimes />} label="تحضير غائبين" color="rose" onClick={() => setSelectedAction('mark_absent')} onShowHelp={() => { setSelectedAction('mark_absent'); setShowHelp(true); }} />
                            <ToolCard key="tool-add-hw" icon={<FaBook />} label="تكليف واجب" color="indigo" onClick={() => setSelectedAction('add_homework')} onShowHelp={() => { setSelectedAction('add_homework'); setShowHelp(true); }} />
                            <ToolCard key="tool-add-note" icon={<FaStickyNote />} label="إضافة ملاحظة" color="blue" onClick={() => setSelectedAction('add_note')} onShowHelp={() => { setSelectedAction('add_note'); setShowHelp(true); }} />
                            <ToolCard key="tool-adj-points" icon={<FaPlusCircle />} label="تعديل نقاط" color="emerald" onClick={() => setSelectedAction('adjust_points')} onShowHelp={() => { setSelectedAction('adjust_points'); setShowHelp(true); }} />
                            <ToolCard key="tool-smart-scan" icon={<FaMagic />} label="فحص الكشف" color="teal" onClick={() => { onClose(); onOpenSmartScan?.(); }} onShowHelp={() => addToast('استخدم الكاميرا لمسح الكشف اليدوي وتعبئة البيانات تلقائياً لجميع الطلاب', 'info')} />
                        </div>
                    ) : (
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                            <div className="flex justify-between items-center mb-4">
                                <button onClick={() => { setSelectedAction(null); setShowHelp(false); }} className="text-xs text-primary flex items-center gap-1 font-bold">← العودة لقائمة الأدوات</button>
                                {selectedAction && actionHelp[selectedAction] && (
                                    <button onClick={() => setShowHelp(!showHelp)} className={`p-1.5 rounded-lg transition-colors ${showHelp ? 'bg-primary text-white' : 'bg-primary/10 text-primary'}`}>
                                        <FaLayerGroup size={12} />
                                    </button>
                                )}
                            </div>

                            <AnimatePresence>
                                {showHelp && selectedAction && (
                                    <motion.div 
                                        initial={{ height: 0, opacity: 0 }} 
                                        animate={{ height: 'auto', opacity: 1 }} 
                                        exit={{ height: 0, opacity: 0 }}
                                        className="mb-4 bg-primary/5 dark:bg-primary/20 p-3 rounded-2xl border border-primary/20 text-[10px] text-primary-dark dark:text-primary-light leading-relaxed relative overflow-hidden"
                                    >
                                        <FaLayerGroup className="absolute -right-2 -bottom-2 text-primary/10 text-4xl" />
                                        {actionHelp[selectedAction]}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                            
                            {/* Target Selection */}
                            <div className="bg-gray-50 dark:bg-gray-900/40 rounded-3xl p-4 mb-6 border dark:border-gray-700">
                                <h4 className="text-xs font-bold mb-3 flex justify-between items-center text-gray-700 dark:text-gray-300">
                                    <span>الطلاب المستهدفون ({targetStudentIds.size})</span>
                                    <div className="flex gap-3">
                                        <button onClick={handleSelectAll} className="text-[10px] text-blue-500 font-bold hover:underline">تحديد الكل</button>
                                        <button onClick={handleDeselectAll} className="text-[10px] text-red-400 font-bold hover:underline">إلغاء الكل</button>
                                    </div>
                                </h4>
                                
                                <div className="relative mb-3">
                                    <FaSearch className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
                                    <input 
                                        type="text" 
                                        placeholder="بحث عن طلاب..." 
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        className="w-full pr-8 pl-3 py-2 text-xs border rounded-xl bg-white dark:bg-gray-800 dark:border-gray-700 focus:ring-2 focus:ring-primary/20 outline-none"
                                    />
                                </div>

                                 <div className="max-h-36 overflow-y-auto space-y-1 py-1 px-1">
                                    {filteredStudents.map(s => {
                                        const isSelected = targetStudentIds.has(s.id);
                                        return (
                                            <button 
                                                key={`bulk-select-student-${s.id}`}
                                                onClick={() => handleToggleStudent(s.id)}
                                                className={`w-full flex items-center justify-between p-1.5 px-3 rounded-xl border transition-all ${isSelected ? 'border-primary bg-primary/5' : 'border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800'} shadow-sm`}
                                            >
                                                <div className="flex items-center gap-2 text-right overflow-hidden">
                                                     <StudentAvatar photo={s.photo} name={s.name} id={s.id} className="w-6 h-6 rounded-full flex-shrink-0" />
                                                     <span className="text-[11px] font-bold text-gray-700 dark:text-gray-200 truncate">{s.name}</span>
                                                </div>
                                                <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${isSelected ? 'bg-primary border-primary text-white' : 'border-gray-300 dark:border-gray-600'}`}>
                                                    {isSelected && <FaCheck size={8} />}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>


                            {/* Action Form */}
                            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm">
                                {renderActionStep()}
                            </div>
                        </motion.div>
                    )}
                </div>

                {/* Footer Actions */}
                <AnimatePresence>
                    {selectedAction && (
                        <motion.div initial={{ y: 50 }} animate={{ y: 0 }} exit={{ y: 50 }} className="p-4 border-t dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-md">
                            <div className="flex gap-3">
                                <button onClick={() => setSelectedAction(null)} className="flex-1 py-3 rounded-2xl bg-gray-200 dark:bg-gray-700 font-bold dark:text-white">إلغاء</button>
                                <button 
                                    onClick={handleExecuteAction}
                                    disabled={
                                        targetStudentIds.size === 0 || 
                                        (selectedAction === 'adjust_points' && (!points.reason.trim() || !points.amount)) ||
                                        (selectedAction === 'add_note' && !note.trim()) ||
                                        (selectedAction === 'add_homework' && hwType === 'custom' && !customHw.trim()) ||
                                        (selectedAction === 'add_homework' && hwType === 'pages' && (!fromPage || !toPage)) ||
                                        (selectedAction === 'add_homework' && (hwType === 'memo' || hwType === 'both') && !memoHw.fromSurah) ||
                                        (selectedAction === 'add_homework' && (hwType === 'review' || hwType === 'both') && !reviewHw.fromSurah)
                                    }
                                    className={`flex-[2] py-3 rounded-2xl font-bold text-white shadow-lg transition-all ${targetStudentIds.size > 0 ? 'bg-primary' : 'bg-gray-400 opacity-50 cursor-not-allowed'}`}
                                >
                                    تنفيذ الأمر على {targetStudentIds.size} طلاب
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
};

const ToolCard: React.FC<{ icon: React.ReactNode, label: string, color: string, onClick: () => void, onShowHelp?: () => void, disabled?: boolean }> = ({ icon, label, color, onClick, onShowHelp, disabled }) => {
    const colors: any = {
        amber: 'bg-amber-500 shadow-amber-200 dark:shadow-none',
        orange: 'bg-orange-500 shadow-orange-200 dark:shadow-none',
        rose: 'bg-rose-500 shadow-rose-200 dark:shadow-none',
        indigo: 'bg-indigo-500 shadow-indigo-200 dark:shadow-none',
        blue: 'bg-blue-500 shadow-blue-200 dark:shadow-none',
        emerald: 'bg-emerald-500 shadow-emerald-200 dark:shadow-none',
        green: 'bg-green-500 shadow-green-200 dark:shadow-none',
        teal: 'bg-teal-500 shadow-teal-200 dark:shadow-none'
    };
    
    return (
        <div className="relative">
            <button 
                onClick={onClick}
                disabled={disabled}
                className={`w-full flex flex-col items-center gap-2 p-2.5 rounded-2xl bg-white dark:bg-gray-700 border border-gray-100 dark:border-gray-600 hover:scale-95 transition-all shadow-sm ${disabled ? 'opacity-30 grayscale cursor-not-allowed' : ''}`}
            >
                <div className={`p-2.5 rounded-xl text-white text-lg ${colors[color] || 'bg-primary'}`}>
                    {icon}
                </div>
                <span className="font-bold text-[9px] text-gray-700 dark:text-gray-200 text-center leading-tight">{label}</span>
            </button>
            {onShowHelp && (
                <button 
                    onClick={(e) => { e.stopPropagation(); onShowHelp(); }}
                    className="absolute top-1 right-1 w-4 h-4 rounded-full bg-gray-200 dark:bg-gray-600 text-[8px] flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-primary/20 hover:text-primary transition-colors"
                >
                    ?
                </button>
            )}
        </div>
    );
};

export default BulkActionsModal;

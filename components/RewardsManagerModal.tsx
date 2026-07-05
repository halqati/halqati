
import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes, FaArrowLeft, FaGift, FaPlus, FaMinus, FaUsers, FaSearch, FaTrash, FaEdit, FaInfoCircle, FaExclamationTriangle, FaHistory, FaCheck, FaExclamationCircle } from 'react-icons/fa';
import { Student, BulkReward, ConfirmationModalData, Session, PointsSettings, PointHistoryEntry } from '../types';
import StudentAvatar from './StudentAvatar';
import { normalizeText, formatDateTime, calculateStudentTotalPoints, sanitizeToEnglishNumber, calculatePointsForSession } from '../utils/helpers';
import AuditHistoryModal from './AuditHistoryModal';

interface RewardsManagerModalProps {
    students: Student[];
    sessions: Session[];
    pointsSettings: PointsSettings;
    bulkRewards: BulkReward[];
    onClose: () => void;
    onSaveReward: (reward: Omit<BulkReward, 'id' | 'createdAt' | 'updatedAt'>, rewardId?: number) => void;
    onDeleteReward: (id: number) => void;
    onZeroPoints: (studentIds: number[]) => void;
    setConfirmationModal: (data: Omit<ConfirmationModalData, 'isOpen'> & { isOpen: boolean }) => void;
}

const modalVariants = {
    initial: { x: '100%' },
    animate: { x: 0 },
    exit: { x: '100%' },
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow mb-4">
        <h3 className="font-bold text-lg mb-3 border-b dark:border-gray-700 pb-2">{title}</h3>
        {children}
    </div>
);

const RewardsManagerModal: React.FC<RewardsManagerModalProps> = ({ students, sessions, pointsSettings, bulkRewards, onClose, onSaveReward, onDeleteReward, onZeroPoints, setConfirmationModal }) => {
    const [view, setView] = useState<'LIST' | 'ADD' | 'EDIT' | 'DETAILS' | 'ZERO'>('LIST');
    const [searchTerm, setSearchTerm] = useState('');
    
    // Form State
    const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
    const [reason, setReason] = useState('');
    const [amount, setAmount] = useState(1);
    const [type, setType] = useState<'grant' | 'deduct'>('grant');
    const [previewMode, setPreviewMode] = useState(false);
    
    // For Edit/Details
    const [activeReward, setActiveReward] = useState<BulkReward | null>(null);
    const [showInfo, setShowInfo] = useState(false);
    const [showAuditHistory, setShowAuditHistory] = useState<PointHistoryEntry[] | null>(null);

    // Calculate current points for all students (memoized for performance)
    const currentPointsMap = useMemo(() => {
        const map = new Map<number, number>();
        students.forEach(s => {
            map.set(s.id, calculateStudentTotalPoints(s, sessions, pointsSettings));
        });
        return map;
    }, [students, sessions, pointsSettings, bulkRewards]); 

    // Helper to calculate points *up to* a certain timestamp
    const getPointsAtTime = (studentId: number, timestamp: number) => {
        const student = students.find(s => s.id === studentId);
        if(!student) return 0;
        let total = 0;
        sessions.forEach(session => {
            if(session.createdAt < timestamp) {
                const sData = session.students.find(s => s.id === studentId);
                if(sData) total += calculatePointsForSession(sData, pointsSettings, session.isLesson, session);
            }
        });
        (student.manualPoints || []).forEach(adj => {
            if(adj.id < timestamp) total += adj.amount;
        });
        return total;
    };

    const filteredStudents = useMemo(() => {
        const term = normalizeText(searchTerm);
        return students.filter(s => normalizeText(s.name).includes(term)).sort((a,b) => a.order - b.order);
    }, [students, searchTerm]);

    const sortedRewards = useMemo(() => [...bulkRewards].sort((a, b) => b.createdAt - a.createdAt), [bulkRewards]);

    // Handlers
    const resetForm = () => {
        setSelectedStudentIds([]);
        setReason('');
        setAmount(1);
        setType('grant');
        setPreviewMode(false);
        setActiveReward(null);
    };

    const handleOpenAdd = () => {
        resetForm();
        setView('ADD');
    };

    const handleOpenEdit = (reward: BulkReward) => {
        setActiveReward(reward);
        setSelectedStudentIds(reward.studentIds);
        setReason(reward.reason);
        setAmount(Math.abs(reward.amount)); // Keep intended amount positive for input
        setType(reward.amount >= 0 ? 'grant' : 'deduct');
        setView('EDIT');
    };

    const handleSelectAll = () => {
        if (selectedStudentIds.length === students.length) setSelectedStudentIds([]);
        else setSelectedStudentIds(students.map(s => s.id));
    };

    const toggleStudent = (id: number) => {
        setSelectedStudentIds(prev => prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]);
    };

    const handleReview = () => {
        if (!reason.trim()) return;
        setPreviewMode(true);
    };

    const handleConfirmSave = () => {
        const finalAmount = type === 'grant' ? amount : -amount;
        onSaveReward({
            reason,
            amount: finalAmount, 
            studentIds: selectedStudentIds,
            type
        }, activeReward?.id);
        resetForm();
        setView('LIST');
    };

    const handleDeleteClick = (reward: BulkReward) => {
        setConfirmationModal({
            isOpen: true,
            title: 'حذف المكافأة',
            message: 'هل أنت متأكد من حذف هذه العملية؟ سيتم التراجع عن تأثيرها على نقاط الطلاب.',
            onConfirm: () => {
                onDeleteReward(reward.id);
                setConfirmationModal({ isOpen: false, title: '', message: '', onConfirm: () => {} });
                if (view === 'DETAILS') setView('LIST');
            }
        });
    };

    // Zero Points Logic
    const [zeroConfirmTimer, setZeroConfirmTimer] = useState(5);
    const [canConfirmZero, setCanConfirmZero] = useState(false);

    useEffect(() => {
        let timer: number;
        if (view === 'ZERO' && selectedStudentIds.length > 0 && !canConfirmZero) {
            setZeroConfirmTimer(5);
            timer = window.setInterval(() => {
                setZeroConfirmTimer(prev => {
                    if (prev <= 1) {
                        setCanConfirmZero(true);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [view, selectedStudentIds.length]); 

    const handleZeroConfirm = () => {
        onZeroPoints(selectedStudentIds);
        setView('LIST');
        resetForm();
    };

    // Render Logic for Preview Table
    const renderPreviewTable = () => {
        const effectiveAmount = type === 'grant' ? amount : -amount;
        
        return (
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                <table className="w-full text-sm text-right">
                    <thead className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs">
                        <tr>
                            <th className="p-2">الطالب</th>
                            <th className="p-2 text-center">النقاط الحالية</th>
                            <th className="p-2 text-center">بعد العملية</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {selectedStudentIds.map(id => {
                            const student = students.find(s => s.id === id);
                            if (!student) return null;
                            const current = currentPointsMap.get(id) || 0;
                            // Logic: Points cannot go below zero
                            let applied = effectiveAmount;
                            if (current + applied < 0) {
                                applied = -current; // Deduct only what they have
                            }
                            const next = current + applied;
                            const isCapped = applied !== effectiveAmount;

                            return (
                                <tr key={id}>
                                    <td className="p-2 font-medium">{student.name}</td>
                                    <td className="p-2 text-center font-bold">{current}</td>
                                    <td className="p-2 text-center">
                                        <span className={`font-bold ${next > current ? 'text-green-600' : next < current ? 'text-red-600' : 'text-gray-500'}`}>
                                            {next}
                                        </span>
                                        {isCapped && <span className="text-[10px] block text-orange-500">تم الخصم بحدود الرصيد</span>}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <motion.div variants={modalVariants} initial="initial" animate="animate" exit="exit" className="fixed inset-0 bg-gray-50 dark:bg-gray-900 z-[180] flex flex-col p-4 max-w-md mx-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-4 pb-4 border-b dark:border-gray-700 flex-shrink-0">
                <div className="flex items-center gap-3">
                    {view !== 'LIST' ? (
                        <button onClick={() => { 
                            if(previewMode) setPreviewMode(false); 
                            else { resetForm(); setView('LIST'); } 
                        }}><FaArrowLeft /></button>
                    ) : (
                        <button onClick={onClose}><FaTimes /></button>
                    )}
                    <h2 className="text-xl font-bold text-primary dark:text-accent">
                        {view === 'LIST' && 'إدارة المكافآت'}
                        {view === 'ADD' && 'إضافة مكافأة جديدة'}
                        {view === 'EDIT' && 'تعديل المكافأة'}
                        {view === 'DETAILS' && 'تفاصيل المكافأة'}
                        {view === 'ZERO' && 'تصفير النقاط'}
                    </h2>
                </div>
                {view === 'LIST' && (
                    <button onClick={() => setShowInfo(!showInfo)} className="text-gray-400 hover:text-primary transition-colors"><FaInfoCircle size={20} /></button>
                )}
            </div>

            {/* Info Box */}
            <AnimatePresence>
                {showInfo && view === 'LIST' && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mb-4 overflow-hidden">
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-sm text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800">
                            <p className="font-bold mb-1">نظام إدارة المكافآت:</p>
                            <ul className="list-disc list-inside text-xs space-y-1">
                                <li>يمكنك منح أو خصم نقاط لمجموعة من الطلاب دفعة واحدة.</li>
                                <li><strong>قاعدة الخصم:</strong> لا يمكن أن تصبح نقاط الطالب بالسالب. سيتم خصم ما يملكه فقط.</li>
                                <li>يمكنك تصفير نقاط الطلاب بالكامل عند الحاجة.</li>
                            </ul>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* View: LIST */}
            {view === 'LIST' && (
                <div className="flex-grow overflow-y-auto space-y-4 relative">
                    <button onClick={handleOpenAdd} className="w-full bg-primary text-white p-4 rounded-xl shadow-md flex items-center justify-center gap-2 font-bold text-lg mb-2 transform hover:scale-105 transition-transform">
                        <FaPlus /> إضافة مكافأة جديدة
                    </button>

                    <div className="space-y-3 pb-20">
                        {sortedRewards.length === 0 ? (
                            <p className="text-center text-gray-500 py-10">لا توجد عمليات سابقة.</p>
                        ) : (
                            sortedRewards.map(reward => (
                                <div key={reward.id} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow flex justify-between items-center border-l-4 border-l-primary dark:border-l-accent relative">
                                    <div className="flex-grow">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`text-xs font-bold px-2 py-0.5 rounded ${reward.amount > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {reward.amount > 0 ? 'منح' : 'خصم'} {Math.abs(reward.amount)}
                                            </span>
                                            <span className="text-sm font-bold text-gray-800 dark:text-gray-200">{reward.reason}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <p className="text-xs text-gray-500">{formatDateTime(reward.createdAt)}</p>
                                            {reward.updatedAt && (
                                                <button onClick={() => setShowAuditHistory(reward.history || [])} className="text-yellow-500 hover:text-yellow-600 transition-colors" title="عرض سجل التعديلات">
                                                    <FaExclamationCircle size={12} />
                                                </button>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-400 mt-1 flex items-center gap-1"><FaUsers size={10} /> {reward.studentIds.length} طالب</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => { setActiveReward(reward); setView('DETAILS'); }} className="p-2 bg-gray-100 dark:bg-gray-700 text-blue-500 rounded-full"><FaSearch /></button>
                                        <button onClick={() => handleOpenEdit(reward)} className="p-2 bg-gray-100 dark:bg-gray-700 text-green-500 rounded-full"><FaEdit /></button>
                                        <button onClick={() => handleDeleteClick(reward)} className="p-2 bg-gray-100 dark:bg-gray-700 text-red-500 rounded-full"><FaTrash /></button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                    
                    <div className="absolute bottom-4 left-0 right-0 flex justify-center pointer-events-none">
                        <button 
                            onClick={() => { resetForm(); setView('ZERO'); }} 
                            className="pointer-events-auto text-xs text-red-400 hover:text-red-600 bg-red-50/50 dark:bg-red-900/10 backdrop-blur-sm px-4 py-2 rounded-full flex items-center gap-2 transition-all opacity-50 hover:opacity-100 border border-red-200/50 dark:border-red-800/50"
                        >
                            <FaTrash size={10} /> تصفير النقاط
                        </button>
                    </div>
                </div>
            )}

            {/* View: ADD / EDIT / ZERO */}
            {(view === 'ADD' || view === 'EDIT' || view === 'ZERO') && (
                <div className="flex-grow overflow-y-auto flex flex-col h-full">
                    {!previewMode ? (
                        <>
                            {/* Step 1: Select Students */}
                            <Section title="1. اختيار الطلاب">
                                <div className="space-y-2">
                                    <div className="flex gap-2 mb-2">
                                        <button onClick={handleSelectAll} className="flex-1 bg-gray-200 dark:bg-gray-700 p-2 rounded text-xs font-bold">
                                            {selectedStudentIds.length === students.length ? 'إلغاء الجميع' : 'تحديد الجميع'}
                                        </button>
                                        <div className="flex-1 relative">
                                            <input type="text" placeholder="بحث..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full p-2 pr-7 text-xs border rounded bg-gray-50 dark:bg-gray-700" />
                                            <FaSearch className="absolute top-2.5 right-2 text-gray-400 text-xs" />
                                        </div>
                                    </div>
                                    <div className="max-h-48 overflow-y-auto pr-1 space-y-1">
                                        {filteredStudents.map(s => (
                                            <label key={s.id} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700/30 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700">
                                                <input type="checkbox" checked={selectedStudentIds.includes(s.id)} onChange={() => toggleStudent(s.id)} className="w-4 h-4 accent-primary" />
                                                <StudentAvatar {...s} className="w-6 h-6 rounded-full" />
                                                <span className="text-sm">{s.name}</span>
                                                <span className="mr-auto text-xs font-bold text-gray-400 ltr">{currentPointsMap.get(s.id)}</span>
                                            </label>
                                        ))}
                                    </div>
                                    <p className="text-xs text-primary font-bold mt-1 text-left">تم تحديد: {selectedStudentIds.length}</p>
                                </div>
                            </Section>

                            {/* Step 2: Details (Only for Add/Edit) */}
                            {view !== 'ZERO' && (
                                <Section title="2. تفاصيل المكافأة">
                                    <div className="space-y-3">
                                        <input 
                                            type="text" 
                                            placeholder="سبب المكافأة (مثال: تميز في الحلقة)" 
                                            value={reason} 
                                            onChange={e => setReason(e.target.value)} 
                                            className="w-full p-3 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-primary"
                                        />
                                        
                                        <div className="flex gap-2 items-center">
                                            <button onClick={() => setType('grant')} className={`flex-1 p-3 rounded-lg border-2 font-bold flex items-center justify-center gap-2 transition-all ${type === 'grant' ? 'border-green-500 bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'border-gray-200 dark:border-gray-700 opacity-60'}`}>
                                                <FaPlus /> منح نقاط
                                            </button>
                                            <button onClick={() => setType('deduct')} className={`flex-1 p-3 rounded-lg border-2 font-bold flex items-center justify-center gap-2 transition-all ${type === 'deduct' ? 'border-red-500 bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'border-gray-200 dark:border-gray-700 opacity-60'}`}>
                                                <FaMinus /> خصم نقاط
                                            </button>
                                        </div>

                                        <div className="flex items-center gap-3 bg-gray-100 dark:bg-gray-700 p-3 rounded-lg">
                                            <span className="font-bold text-sm">المقدار:</span>
                                            <div className="flex items-center gap-3 flex-grow justify-center">
                                                <button onClick={() => setAmount(p => Math.max(1, p - 1))} className="w-8 h-8 bg-white dark:bg-gray-600 rounded shadow text-lg font-bold">-</button>
                                                <input 
                                                    type="text" 
                                                    inputMode="numeric" 
                                                    value={amount} 
                                                    onChange={(e) => { const v = parseInt(sanitizeToEnglishNumber(e.target.value)); if(!isNaN(v)) setAmount(v); }}
                                                    className="w-16 text-center bg-transparent font-bold text-xl outline-none"
                                                />
                                                <button onClick={() => setAmount(p => p + 1)} className="w-8 h-8 bg-white dark:bg-gray-600 rounded shadow text-lg font-bold">+</button>
                                            </div>
                                        </div>
                                        
                                        {type === 'deduct' && (
                                            <div className="text-xs text-orange-600 bg-orange-50 dark:bg-orange-900/20 p-2 rounded flex items-start gap-2">
                                                <FaExclamationTriangle className="mt-0.5" />
                                                <p>تنبيه: إذا كان الخصم أكبر من نقاط الطالب الحالية، سيتم تصفير نقاطه فقط ولن تصبح بالسالب.</p>
                                            </div>
                                        )}
                                    </div>
                                </Section>
                            )}

                            {view === 'ZERO' && (
                                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-center my-4">
                                    <FaExclamationTriangle className="mx-auto text-3xl text-red-500 mb-2" />
                                    <h4 className="font-bold text-red-700 dark:text-red-400 mb-2">تحذير هام!</h4>
                                    <p className="text-sm text-red-600 dark:text-red-300">
                                        سيتم تصفير نقاط الطلاب المحددين ({selectedStudentIds.length}) وحذف جميع مكافآتهم السابقة.
                                        <br/>
                                        <strong>لا يمكن التراجع عن هذه العملية.</strong>
                                    </p>
                                </div>
                            )}

                            <div className="mt-auto pt-4 pb-2">
                                {view === 'ZERO' ? (
                                    <button 
                                        onClick={handleZeroConfirm}
                                        disabled={!canConfirmZero || selectedStudentIds.length === 0}
                                        className="w-full bg-red-600 text-white p-3 rounded-lg font-bold disabled:bg-gray-400 disabled:cursor-not-allowed transition-all"
                                    >
                                        {canConfirmZero ? 'تأكيد تصفير النقاط' : `انتظر (${zeroConfirmTimer})...`}
                                    </button>
                                ) : (
                                    <button 
                                        onClick={handleReview}
                                        disabled={selectedStudentIds.length === 0 || !reason.trim()}
                                        className="w-full bg-primary text-white p-3 rounded-lg font-bold disabled:bg-gray-400 disabled:cursor-not-allowed shadow-lg"
                                    >
                                        معاينة وحفظ
                                    </button>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col h-full">
                            <h3 className="font-bold text-lg mb-4 text-center">مراجعة العملية</h3>
                            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow mb-4 text-center">
                                <p className="text-gray-500 text-sm">السبب</p>
                                <p className="font-bold text-lg mb-2">{reason}</p>
                                <span className={`px-3 py-1 rounded-full text-sm font-bold ${type === 'grant' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {type === 'grant' ? `منح ${amount}` : `خصم ${amount}`}
                                </span>
                            </div>
                            
                            <h4 className="font-bold text-sm mb-2">التأثير على الطلاب ({selectedStudentIds.length}):</h4>
                            <div className="flex-grow overflow-y-auto mb-4">
                                {renderPreviewTable()}
                            </div>

                            <div className="mt-auto flex gap-3">
                                <button onClick={() => setPreviewMode(false)} className="flex-1 bg-gray-200 dark:bg-gray-700 p-3 rounded-lg font-bold">تعديل</button>
                                <button onClick={handleConfirmSave} className="flex-1 bg-green-600 text-white p-3 rounded-lg font-bold shadow-lg">تأكيد الحفظ</button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* View: DETAILS */}
            {view === 'DETAILS' && activeReward && (
                <div className="flex-grow overflow-y-auto">
                    <div className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow mb-4 text-center relative overflow-hidden">
                        <div className={`absolute top-0 left-0 w-full h-2 ${activeReward.amount > 0 ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <h2 className="text-2xl font-bold mt-2">{activeReward.reason}</h2>
                        <div className="flex justify-center items-center gap-2 mt-2">
                            <span className={`text-xl font-bold ${activeReward.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {activeReward.amount > 0 ? 'منح' : 'خصم'} {Math.abs(activeReward.amount)}
                            </span>
                        </div>
                        <div className="mt-4 text-xs text-gray-500 space-y-1">
                            <p className="flex items-center justify-center gap-1"><FaHistory /> أضيفت: {formatDateTime(activeReward.createdAt)}</p>
                            {activeReward.updatedAt && (
                                <div className="flex justify-center items-center gap-2 mt-1">
                                    <p className="text-yellow-600 dark:text-yellow-500 font-semibold bg-yellow-50 dark:bg-yellow-900/20 px-2 py-1 rounded">
                                        تم التعديل: {formatDateTime(activeReward.updatedAt)}
                                    </p>
                                    <button onClick={() => setShowAuditHistory(activeReward.history || [])} className="text-yellow-500 hover:text-yellow-600">
                                        <FaExclamationCircle size={14} />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    <Section title={`الطلاب المتأثرون (${activeReward.studentIds.length})`}>
                        <div className="max-h-[50vh] overflow-y-auto">
                            <table className="w-full text-sm text-right">
                                <thead className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs">
                                    <tr>
                                        <th className="p-2">الطالب</th>
                                        <th className="p-2 text-center">النقاط قبل</th>
                                        <th className="p-2 text-center">النقاط بعد</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {activeReward.studentIds.map(id => {
                                        const student = students.find(s => s.id === id);
                                        const adjustment = student?.manualPoints?.find(mp => mp.rewardId === activeReward.id);
                                        if (!student || !adjustment) return null;
                                        
                                        // Calculate points at time of reward
                                        const pointsAtTime = getPointsAtTime(id, activeReward.createdAt);
                                        // "Before" points are (Points at time - this adjustment)
                                        // BUT wait, `getPointsAtTime` already excludes adjustments AFTER this time, but includes THIS one if id <= timestamp.
                                        // To be precise: "Before" is sum of all points with timestamp < activeReward.createdAt
                                        const beforePoints = getPointsAtTime(id, activeReward.createdAt);
                                        const afterPoints = beforePoints + adjustment.amount;
                                        
                                        const isCapped = adjustment.originalAmount !== undefined && adjustment.amount !== adjustment.originalAmount;

                                        return (
                                            <tr key={id}>
                                                <td className="p-2 flex items-center gap-2">
                                                    <StudentAvatar {...student} className="w-6 h-6 rounded-full" />
                                                    <span>{student.name}</span>
                                                </td>
                                                <td className="p-2 text-center font-bold">{beforePoints}</td>
                                                <td className="p-2 text-center">
                                                    <span className={`font-bold ltr ${adjustment.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                        {afterPoints}
                                                    </span>
                                                    {isCapped && (
                                                        <span className="text-[10px] text-orange-500 block">
                                                            (محدود)
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </Section>
                    
                    <div className="flex justify-center gap-4 mt-4">
                        <button onClick={() => handleOpenEdit(activeReward)} className="flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-lg font-bold"><FaEdit /> تعديل</button>
                        <button onClick={() => handleDeleteClick(activeReward)} className="flex items-center gap-2 bg-red-100 text-red-700 px-4 py-2 rounded-lg font-bold"><FaTrash /> حذف</button>
                    </div>
                </div>
            )}
            
            {showAuditHistory && (
                <AuditHistoryModal history={showAuditHistory} onClose={() => setShowAuditHistory(null)} />
            )}
        </motion.div>
    );
};

export default RewardsManagerModal;

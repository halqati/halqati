
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Session, SessionStudent, MemorizationRecord, ReviewRecord, AlertModalData, ConfirmationModalData, LastRecordModalData, Settings, Student, HomeworkRecord, ManualPointAdjustment, AppliedBulkAction, PointsSettings } from '../types';
import { FaTimes, FaUserCheck, FaUserClock, FaUserTimes, FaUserGraduate, FaTrash, FaPlus, FaHistory, FaChevronDown, FaChevronUp, FaBook, FaSave, FaCheckCircle, FaSearch, FaUndo, FaRegCommentDots, FaCopy, FaUsers, FaCheckSquare, FaRegSquare, FaQuestionCircle, FaChartBar, FaBookOpen, FaExclamationTriangle, FaThLarge, FaEllipsisV, FaPlusCircle, FaMinusCircle, FaStickyNote, FaPause, FaPlay, FaMicrophone, FaTools, FaLayerGroup, FaRobot } from 'react-icons/fa';
import { IconType } from 'react-icons';
import { getGenderedTerm, formatDate, normalizeText, formatSurahAyah, sanitizeToEnglishNumber, generateUniqueId, calculatePagesCount, formatPagesCountArabic } from '../utils/helpers';
import StudentAvatar from './StudentAvatar';
import SurahSelectorModal from './SurahSelectorModal';
import StudentGroupSelector from './StudentGroupSelector';
import { surahs } from '../constants';
import SessionDatePickerModal from './SessionDatePickerModal';
import BulkActionsModal from './BulkActionsModal';
import SmartScanModal from './SmartScanModal';
import { MiniQuranModal } from './MiniQuranModal';

const modalVariants = {
    initial: { x: '100%' },
    animate: { x: 0 },
    exit: { x: '100%' },
};

const CustomLessonTypeSelector: React.FC<{
    value: string;
    onChange: (newValue: string) => void;
    options: string[];
    onAdd: (newType: string) => void;
    onDelete: (typeToDelete: string) => void;
}> = ({ value, onChange, options, onAdd, onDelete }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [showAddInput, setShowAddInput] = useState(false);
    const [newType, setNewType] = useState('');
    const wrapperRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const timerRef = useRef<number | null>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node) && dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
            return () => document.removeEventListener("mousedown", handleClickOutside);
        }
    }, [isOpen]);
    
    useEffect(() => {
        if (!isOpen) {
            setShowAddInput(false);
            setNewType('');
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

    const handleInteractionStart = (type: string) => {
        timerRef.current = window.setTimeout(() => {
            onDelete(type);
        }, 700);
    };

    const handleInteractionEnd = () => {
        if (timerRef.current) clearTimeout(timerRef.current);
    };

    return (
        <div className="relative w-full" ref={wrapperRef}>
            <button
                type="button"
                onClick={() => setIsOpen(p => !p)}
                className="w-full p-2 text-sm border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600 flex justify-between items-center text-right"
            >
                <span className={value ? '' : 'text-gray-400'}>{value || 'نوع الدرس'}</span>
                <FaChevronDown className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        ref={dropdownRef}
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="absolute top-full left-0 mt-1 w-full bg-white dark:bg-gray-800 border dark:border-gray-600 rounded-lg shadow-lg z-20 max-h-60 overflow-y-auto"
                    >
                        {options.map(opt => (
                            <button
                                key={opt}
                                type="button"
                                onClick={() => { onChange(opt); setIsOpen(false); }}
                                onMouseDown={() => handleInteractionStart(opt)}
                                onMouseUp={handleInteractionEnd}
                                onTouchStart={() => handleInteractionStart(opt)}
                                onTouchEnd={handleInteractionEnd}
                                onMouseLeave={handleInteractionEnd}
                                className="w-full text-right p-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                                {opt}
                            </button>
                        ))}
                        <div className="border-t dark:border-gray-600 p-2">
                            {showAddInput ? (
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newType}
                                        onChange={e => setNewType(e.target.value)}
                                        className="w-full p-1 text-sm border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-500"
                                        placeholder="اكتب النوع الجديد"
                                    />
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


interface SessionFormProps {
    session: Session;
    setSession: React.Dispatch<React.SetStateAction<Session | null>>;
    allStudents: Student[];
    onUpdateMasterStudents: (students: Student[]) => void;
    onSave: (session: Session) => void;
    onBack: () => void;
    setAlert: (data: AlertModalData) => void;
    lessonTypes: string[];
    onAddLessonType: (type: string) => void;
    onDeleteLessonType: (type: string) => void;
    setConfirmationModal: (data: Omit<ConfirmationModalData, 'isOpen'> & { isOpen: boolean }) => void;
    onShowLastRecord: (studentId: number, type: 'memorization' | 'review') => void;
    settings: Settings;
    onResetDraft: (date: string) => void;
    addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
    isSubModalOpen: boolean;
    onSubModalOpen: () => void;
    onSubModalClose: () => void;
    circleId: string | number;
}
interface RatingSelectorProps {
    value?: number;
    onChange: (newValue: number) => void;
    max?: number;
}

const RatingSelector: React.FC<RatingSelectorProps> = ({ value = 10, onChange, max = 10 }) => {
    const timerRef = useRef<number | null>(null);
    const longPressTriggered = useRef(false);

    const handlePointerDown = (ratingValue: number) => {
        longPressTriggered.current = false;
        
        // Clear any existing timer just in case
        if (timerRef.current) clearTimeout(timerRef.current);

        if (ratingValue === max) return; 

        timerRef.current = window.setTimeout(() => {
            longPressTriggered.current = true;
            if (navigator.vibrate) navigator.vibrate(50);
            onChange(ratingValue + 0.5);
        }, 500); 
    };

    const handlePointerUp = (ratingValue: number) => {
        if (timerRef.current) {
            window.clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        if (!longPressTriggered.current) {
            onChange(ratingValue);
        }
    };

    const handleCancel = () => {
         if (timerRef.current) {
            window.clearTimeout(timerRef.current);
            timerRef.current = null;
        }
    };

    useEffect(() => {
        return () => {
            if (timerRef.current) window.clearTimeout(timerRef.current);
        };
    }, []);

    // Ensure value doesn't exceed max when max changes
    useEffect(() => {
        if (value > max) {
            onChange(max);
        }
    }, [max, value, onChange]);

    return (
        <div className="mt-3">
            <p className="text-xs text-center text-gray-500 dark:text-gray-400 mb-2">التقييم: {value}/{max}</p>
            <div className="flex justify-center items-center gap-0.5 no-scrollbar py-2" dir="ltr">
                {Array.from({ length: max }, (_, i) => i + 1).map(num => {
                    const isSelected = Math.floor(value) === num;
                    
                    return (
                        <button
                            key={num}
                            type="button"
                            onPointerDown={() => handlePointerDown(num)}
                            onPointerUp={() => handlePointerUp(num)}
                            onPointerLeave={handleCancel}
                            onPointerCancel={handleCancel}
                            className={`relative w-[25px] h-[25px] sm:w-7 sm:h-7 flex-shrink-0 rounded-full text-[10px] sm:text-[11px] font-bold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 dark:focus:ring-offset-gray-800 focus:ring-primary select-none touch-manipulation
                                ${isSelected 
                                    ? 'bg-[#4CAF50] text-white scale-110 shadow-md z-10' 
                                    : 'bg-[#4B5563] text-white/90 hover:bg-[#6B7280]'}`
                            }
                            aria-label={`تقييم ${num}`}
                        >
                            {value === num + 0.5 && <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-accent rounded-full border border-white dark:border-gray-800"></span>}
                             {num}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};


interface RecordInputProps {
    type: 'memorization' | 'review';
    label: string;
    record: MemorizationRecord | ReviewRecord;
    isSuspended?: boolean;
    onChange: (newRecord: any) => void;
    onDelete?: () => void;
    onShowLastRecord?: () => void;
    settings: Settings;
    pointsSettings?: PointsSettings;
    onOpenSelector: (onSelect: (value: string) => void, title: string) => void;
    studentName?: string;
    recitationType?: string;
}

interface HomeworkInputProps {
    record: HomeworkRecord;
    onChange: (record: HomeworkRecord) => void;
    onDelete: () => void;
    settings: Settings;
    onOpenSelector: (onSelect: (value: string) => void, title: string) => void;
}

const HomeworkInput: React.FC<HomeworkInputProps> = ({ record, onChange, onDelete, settings, onOpenSelector }) => {
    const selectionMethod = settings.surahSelectionMethod || 'list';

    const handleFieldChange = (type: 'memorization' | 'review', field: 'fromSurah' | 'toSurah' | 'fromAyah' | 'toAyah', value: string) => {
        const newRecord = { ...record };
        if (!newRecord[type]) {
            newRecord[type] = { fromSurah: '', fromAyah: '', toSurah: '', toAyah: '' };
        }
        
        const target = { ...newRecord[type]! };
        if (field === 'fromAyah' || field === 'toAyah') {
            target[field] = sanitizeToEnglishNumber(value);
        } else {
            target[field] = value;
        }

        if (field === 'fromSurah' && settings.syncSurahFields) {
            target.toSurah = value;
        }
        
        newRecord[type] = target;
        onChange(newRecord);
    };

    return (
        <motion.div 
            initial={{ boxShadow: "0 0 0px rgba(99, 102, 241, 0)", scale: 0.95, opacity: 0 }}
            animate={{ 
                boxShadow: ["0 0 0px rgba(99, 102, 241, 0)", "0 0 20px rgba(99, 102, 241, 0.4)", "0 0 0px rgba(99, 102, 241, 0)"],
                scale: 1,
                opacity: 1
            }}
            transition={{ 
                boxShadow: { duration: 2, times: [0, 0.5, 1], repeat: 1 },
                scale: { duration: 0.3 },
                opacity: { duration: 0.3 }
            }}
            className="p-3 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border-r-4 border-indigo-500 space-y-3"
        >
            <div className="flex items-center justify-between">
                <span className="font-bold text-indigo-700 dark:text-indigo-300 text-sm">الواجب</span>
                <button type="button" onClick={onDelete} className="text-red-400 hover:text-red-600 transition-colors">
                    <FaTrash size={12} />
                </button>
            </div>
            
            {/* Memorization Section */}
            <div className="space-y-2">
                <div className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">واجب الحفظ:</div>
                <div className="grid grid-cols-2 gap-2">
                    {selectionMethod === 'manual' ? (
                        <input
                            type="text"
                            value={record.memorization?.fromSurah || ''}
                            onChange={(e) => handleFieldChange('memorization', 'fromSurah', e.target.value)}
                            placeholder="من سورة..."
                            className="w-full p-1 border rounded-md text-sm bg-white dark:bg-gray-800 dark:border-gray-600 text-right"
                        />
                    ) : (
                        <button type="button" onClick={() => onOpenSelector((val) => handleFieldChange('memorization', 'fromSurah', val), 'من سورة')} className="w-full p-1.5 border rounded-md text-sm bg-white dark:bg-gray-800 dark:border-gray-600 text-right truncate">
                            {record.memorization?.fromSurah || 'من سورة...'}
                        </button>
                    )}
                    <input 
                        type="text"
                        inputMode="numeric"
                        placeholder="آية" 
                        value={record.memorization?.fromAyah || ''} 
                        onChange={(e) => handleFieldChange('memorization', 'fromAyah', e.target.value)} 
                        className="w-full p-1 border rounded-md text-sm bg-white dark:bg-gray-800 dark:border-gray-600 text-right font-sans" 
                    />
                </div>
                <div className="grid grid-cols-2 gap-2">
                    {selectionMethod === 'manual' ? (
                        <input
                            type="text"
                            value={record.memorization?.toSurah || ''}
                            onChange={(e) => handleFieldChange('memorization', 'toSurah', e.target.value)}
                            placeholder="إلى سورة..."
                            className="w-full p-1 border rounded-md text-sm bg-white dark:bg-gray-800 dark:border-gray-600 text-right"
                        />
                    ) : (
                        <button type="button" onClick={() => onOpenSelector((val) => handleFieldChange('memorization', 'toSurah', val), 'إلى سورة')} className="w-full p-1.5 border rounded-md text-sm bg-white dark:bg-gray-800 dark:border-gray-600 text-right truncate">
                            {record.memorization?.toSurah || 'إلى سورة...'}
                        </button>
                    )}
                    <input 
                        type="text" 
                        inputMode="numeric"
                        placeholder="آية" 
                        value={record.memorization?.toAyah || ''} 
                        onChange={(e) => handleFieldChange('memorization', 'toAyah', e.target.value)} 
                        className="w-full p-1 border rounded-md text-sm bg-white dark:bg-gray-800 dark:border-gray-600 text-right font-sans" 
                    />
                </div>
            </div>

            {/* Review Section */}
            <div className="space-y-2 pt-2 border-t border-indigo-200 dark:border-indigo-800">
                <div className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">واجب المراجعة:</div>
                <div className="grid grid-cols-2 gap-2">
                    {selectionMethod === 'manual' ? (
                        <input
                            type="text"
                            value={record.review?.fromSurah || ''}
                            onChange={(e) => handleFieldChange('review', 'fromSurah', e.target.value)}
                            placeholder="من سورة..."
                            className="w-full p-1 border rounded-md text-sm bg-white dark:bg-gray-800 dark:border-gray-600 text-right"
                        />
                    ) : (
                        <button type="button" onClick={() => onOpenSelector((val) => handleFieldChange('review', 'fromSurah', val), 'من سورة')} className="w-full p-1.5 border rounded-md text-sm bg-white dark:bg-gray-800 dark:border-gray-600 text-right truncate">
                            {record.review?.fromSurah || 'من سورة...'}
                        </button>
                    )}
                    <input 
                        type="text"
                        inputMode="numeric"
                        placeholder="آية" 
                        value={record.review?.fromAyah || ''} 
                        onChange={(e) => handleFieldChange('review', 'fromAyah', e.target.value)} 
                        className="w-full p-1 border rounded-md text-sm bg-white dark:bg-gray-800 dark:border-gray-600 text-right font-sans" 
                    />
                </div>
                <div className="grid grid-cols-2 gap-2">
                    {selectionMethod === 'manual' ? (
                        <input
                            type="text"
                            value={record.review?.toSurah || ''}
                            onChange={(e) => handleFieldChange('review', 'toSurah', e.target.value)}
                            placeholder="إلى سورة..."
                            className="w-full p-1 border rounded-md text-sm bg-white dark:bg-gray-800 dark:border-gray-600 text-right"
                        />
                    ) : (
                        <button type="button" onClick={() => onOpenSelector((val) => handleFieldChange('review', 'toSurah', val), 'إلى سورة')} className="w-full p-1.5 border rounded-md text-sm bg-white dark:bg-gray-800 dark:border-gray-600 text-right truncate">
                            {record.review?.toSurah || 'إلى سورة...'}
                        </button>
                    )}
                    <input 
                        type="text" 
                        inputMode="numeric"
                        placeholder="آية" 
                        value={record.review?.toAyah || ''} 
                        onChange={(e) => handleFieldChange('review', 'toAyah', e.target.value)} 
                        className="w-full p-1 border rounded-md text-sm bg-white dark:bg-gray-800 dark:border-gray-600 text-right font-sans" 
                    />
                </div>
            </div>
        </motion.div>
    );
};

const RecordInput: React.FC<RecordInputProps> = ({ type, label, record, isSuspended, onChange, onDelete, onShowLastRecord, settings, pointsSettings, onOpenSelector, studentName, recitationType }) => {
    const [isViewerOpen, setIsViewerOpen] = useState(false);
    const hasRecordKey = type === 'memorization' ? 'hasMemorization' : 'hasReview';
    const hasRecord = (record as any)[hasRecordKey];

    const showLastRecord = settings.showLastRecordFeature ?? true;
    const selectionMethod = settings.surahSelectionMethod || 'list';

    const handleFieldChange = (field: keyof MemorizationRecord | keyof ReviewRecord, value: string | boolean) => {
        let newRecord = { ...record };
        
        if (field === 'fromAyah' || field === 'toAyah') {
             newRecord[field] = sanitizeToEnglishNumber(value as string);
        } else {
             newRecord[field] = value as any;
        }

        if (field === 'fromSurah' && settings.syncSurahFields) {
            newRecord.toSurah = value as string;
        }
        if (field === hasRecordKey) {
            if (value === true) {
                newRecord.rating = type === 'memorization' ? (pointsSettings?.maxMemorizationGrade ?? 10) : (pointsSettings?.maxReviewGrade ?? 10);
            } else {
                newRecord.rating = undefined;
            }
        }

        const isCurrentlyActive = (field === hasRecordKey) ? !!value : !!(newRecord as any)[hasRecordKey];
        if (isCurrentlyActive && newRecord.fromSurah) {
            newRecord.pages_count = calculatePagesCount(
                newRecord.fromSurah,
                newRecord.fromAyah || '',
                newRecord.toSurah || '',
                newRecord.toAyah || ''
            );
        } else {
            newRecord.pages_count = 0;
        }

        onChange(newRecord);
    };

    const handleToggleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isSuspended) return;
        handleFieldChange(hasRecordKey, !hasRecord);
    };

    return (
         <div 
            className={`p-3 rounded-lg text-right transition-all duration-200 ${hasRecord ? 'bg-primary-light/10 dark:bg-primary-dark/30 border-r-4 border-primary' : 'bg-gray-50 dark:bg-gray-700/50'}`}
         >
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-3 cursor-pointer p-1 -m-1" onClick={handleToggleClick}>
                    <input
                        type="checkbox"
                        checked={!!hasRecord}
                        disabled={isSuspended}
                        readOnly
                        className="w-5 h-5 accent-primary pointer-events-none"
                    />
                    <span className="font-semibold text-gray-800 dark:text-white select-none">{label}</span>
                </div>
                
                {hasRecord && record.pages_count !== undefined && record.pages_count > 0 && (
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setIsViewerOpen(true); }}
                        className="text-[10px] font-medium text-gray-400 dark:text-gray-500 hover:text-primary dark:hover:text-accent transition-colors duration-200 cursor-pointer flex items-center gap-1 select-none underline decoration-dashed underline-offset-2 bg-transparent border-none p-0 shadow-none hover:shadow-none focus:outline-hidden"
                    >
                        <FaBookOpen size={10} className="shrink-0 text-gray-400 dark:text-gray-500" />
                        <span>{formatPagesCountArabic(record.pages_count)}</span>
                    </button>
                )}
                
                <div className="mr-auto flex items-center gap-3">
                    {onShowLastRecord && hasRecord && (
                        <button type="button" onClick={(e) => { e.stopPropagation(); onShowLastRecord(); }} className="text-primary dark:text-accent">
                            <FaHistory size={16} />
                        </button>
                    )}
                    {onDelete && (
                        <button type="button" onClick={(e) => { e.stopPropagation(); onDelete(); }} className="text-red-400 hover:text-red-600 transition-colors">
                            <FaTrash size={14} />
                        </button>
                    )}
                    {isSuspended && (
                        <span className="text-xs text-yellow-500">(موقوف)</span>
                    )}
                </div>
            </div>
            <AnimatePresence>
                {hasRecord && !isSuspended && (
                    <motion.div
                        variants={{ initial: { height: 0, opacity: 0 }, animate: { height: 'auto', opacity: 1 } }}
                        initial="initial"
                        animate="animate"
                        className="overflow-hidden space-y-2 mt-3"
                    >
                        <div className="grid grid-cols-2 gap-2">
                             {selectionMethod === 'manual' ? (
                                <input
                                    type="text"
                                    value={record?.fromSurah}
                                    onChange={(e) => handleFieldChange('fromSurah', e.target.value)}
                                    placeholder="من سورة..."
                                    maxLength={12}
                                    className="w-full p-1 border rounded-md text-sm bg-white dark:bg-gray-800 dark:border-gray-600 text-gray-800 dark:text-white text-right"
                                />
                            ) : (
                                <button type="button" onClick={() => onOpenSelector((value) => handleFieldChange('fromSurah', value), 'من سورة')} className="w-full p-1.5 border rounded-md text-sm bg-white dark:bg-gray-800 dark:border-gray-600 text-right truncate">
                                    {record?.fromSurah || 'من سورة...'}
                                </button>
                            )}
                            <input 
                                type="text"
                                inputMode="numeric"
                                placeholder="آية" 
                                value={sanitizeToEnglishNumber(record?.fromAyah)} 
                                onChange={(e) => handleFieldChange('fromAyah', e.target.value)} 
                                maxLength={4} 
                                className="w-full p-1 border rounded-md text-sm bg-white dark:bg-gray-800 dark:border-gray-600 text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-gray-300 text-right font-sans" 
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            {selectionMethod === 'manual' ? (
                                 <input
                                    type="text"
                                    value={record?.toSurah}
                                    onChange={(e) => handleFieldChange('toSurah', e.target.value)}
                                    placeholder="إلى سورة..."
                                    maxLength={12}
                                    className="w-full p-1 border rounded-md text-sm bg-white dark:bg-gray-800 dark:border-gray-600 text-gray-800 dark:text-white text-right"
                                />
                            ) : (
                                <button type="button" onClick={() => onOpenSelector((value) => handleFieldChange('toSurah', value), 'إلى سورة')} className="w-full p-1.5 border rounded-md text-sm bg-white dark:bg-gray-800 dark:border-gray-600 text-right truncate">
                                    {record?.toSurah || 'إلى سورة...'}
                                </button>
                            )}
                            <input 
                                type="text" 
                                inputMode="numeric"
                                placeholder="آية" 
                                value={sanitizeToEnglishNumber(record?.toAyah)} 
                                onChange={(e) => handleFieldChange('toAyah', e.target.value)} 
                                maxLength={4} 
                                className="w-full p-1 border rounded-md text-sm bg-white dark:bg-gray-800 dark:border-gray-600 text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-gray-300 text-right font-sans" 
                            />
                        </div>
                        <RatingSelector
                            value={record.rating}
                            onChange={(newValue) => onChange({ ...record, rating: newValue })}
                            max={type === 'memorization' ? (pointsSettings?.maxMemorizationGrade ?? 10) : (pointsSettings?.maxReviewGrade ?? 10)}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
            {isViewerOpen && (
                <MiniQuranModal
                    isOpen={isViewerOpen}
                    onClose={() => setIsViewerOpen(false)}
                    fromSurahName={record.fromSurah || ''}
                    fromAyah={record.fromAyah || ''}
                    toSurahName={record.toSurah || ''}
                    toAyah={record.toAyah || ''}
                    pagesCount={record.pages_count || 0}
                    highlights={record.highlights}
                    onHighlightsChange={(newHighlights) => {
                        onChange({
                            ...record,
                            highlights: newHighlights
                        });
                    }}
                    studentName={studentName}
                    recitationType={recitationType}
                />
            )}
        </div>
    );
};

const LessonModeUI: React.FC<{
    session: Session;
    handleSessionChange: (field: keyof Session, value: any) => void;
    lessonTypes: string[];
    onAddLessonType: (type: string) => void;
    onDeleteLessonType: (type: string) => void;
    setConfirmationModal: (data: Omit<ConfirmationModalData, 'isOpen'> & { isOpen: boolean }) => void;
    sortedStudents: SessionStudent[];
    handleStudentChange: (studentId: number, field: string, value: any) => void;
}> = ({ session, handleSessionChange, lessonTypes, onAddLessonType, onDeleteLessonType, setConfirmationModal, sortedStudents, handleStudentChange }) => {

    const attendanceOptions: { key: SessionStudent['attendance']; label: string; color: string; icon: IconType }[] = [
        { key: 'present', label: 'حضور', color: 'radio-present', icon: FaUserCheck },
        { key: 'late', label: 'تأخر', color: 'radio-late', icon: FaUserClock },
        { key: 'excused', label: 'مستأذن', color: 'radio-excused', icon: FaUserGraduate },
        { key: 'absent', label: 'غياب', color: 'radio-absent', icon: FaUserTimes },
    ];
    
    const handleDeleteConfirmation = (type: string) => {
        setConfirmationModal({
            isOpen: true,
            title: 'حذف نوع الدرس',
            message: `هل أنت متأكد من حذف هذا النوع؟`,
            onConfirm: () => {
                onDeleteLessonType(type);
                if(session.lessonType === type) {
                    handleSessionChange('lessonType', '');
                }
                setConfirmationModal({ isOpen: false, title: '', message: '', onConfirm: () => {} });
            }
        });
    };

    return (
        <motion.div key="lesson-mode" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                 <div className="flex gap-2 items-center">
                    <CustomLessonTypeSelector
                        value={session.lessonType}
                        onChange={(val) => handleSessionChange('lessonType', val)}
                        options={lessonTypes.sort((a,b) => a.localeCompare(b, 'ar'))}
                        onAdd={onAddLessonType}
                        onDelete={handleDeleteConfirmation}
                    />
                    <input
                        type="text"
                        placeholder="عنوان الدرس (اختياري)"
                        value={session.lessonTitle}
                        onChange={(e) => handleSessionChange('lessonTitle', e.target.value)}
                        className="w-full p-2 text-sm border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600"
                    />
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden border border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-[2fr,1fr,1fr,1fr,1fr] text-center font-bold text-sm bg-primary/10 dark:bg-accent/10 text-primary dark:text-accent p-2">
                    <div className="text-right pr-2">اسم الطالب</div>
                    {attendanceOptions.map(opt => <div key={opt.key}>{opt.label}</div>)}
                </div>
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {sortedStudents.map(student => (
                        <div key={student.id}>
                            <div className="grid grid-cols-[2fr,1fr,1fr,1fr,1fr] items-center p-3">
                                <div className="font-semibold text-right pr-2 min-w-0">{student.name}</div>
                                {attendanceOptions.map(opt => (
                                    <div key={opt.key} className="flex justify-center items-center">
                                        <input
                                            type="radio"
                                            name={`attendance-${student.id}`}
                                            value={opt.key}
                                            checked={student.attendance === opt.key}
                                            onChange={(e) => handleStudentChange(student.id, 'attendance', e.target.value)}
                                            className={`custom-radio-input ${opt.color}`}
                                        />
                                    </div>
                                ))}
                            </div>
                            <AnimatePresence>
                                {student.attendance === 'excused' && (
                                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="px-3 pb-3">
                                        <input type="text" placeholder="العذر (اختياري)..." value={student.excuse} onChange={(e) => handleStudentChange(student.id, 'excuse', e.target.value)} className="w-full p-1 text-xs rounded-md bg-gray-50 dark:bg-gray-700 border dark:border-gray-600 placeholder-gray-400 dark:placeholder-gray-300" />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    ))}
                </div>
            </div>
        </motion.div>
    );
};

interface StudentSelectorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (selectedIds: number[]) => void;
    allStudents: Student[];
    selectedStudentIds: number[];
    circleId: string | number;
}

const studentSelectorModalVariants = {
    initial: { scale: 0.9, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0.9, opacity: 0 },
};

const StudentSelectorModal: React.FC<StudentSelectorModalProps> = ({ isOpen, onClose, onConfirm, allStudents, selectedStudentIds, circleId }) => {
    const [localSelectedIds, setLocalSelectedIds] = useState(new Set(selectedStudentIds));
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        setLocalSelectedIds(new Set(selectedStudentIds));
    }, [selectedStudentIds, isOpen]);

    const handleToggle = (id: number) => {
        setLocalSelectedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    const handleSelectAll = () => {
        setLocalSelectedIds(new Set(allStudents.map(s => s.id)));
    };

    const handleDeselectAll = () => {
        setLocalSelectedIds(new Set());
    };

    const handleConfirm = () => {
        onConfirm(Array.from(localSelectedIds));
    };

    const filteredStudents = useMemo(() => {
        const normalizedSearch = normalizeText(searchTerm);
        return allStudents.filter(s =>
            normalizeText(s.name).includes(normalizedSearch)
        ).sort((a, b) => a.order - b.order);
    }, [allStudents, searchTerm]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
            <motion.div variants={studentSelectorModalVariants} initial="initial" animate="animate" exit="exit" className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md h-[90vh] flex flex-col">
                <div className="flex justify-between items-center mb-4 flex-shrink-0">
                    <h2 className="text-xl font-bold text-primary dark:text-accent">تحديد الطلاب للجلسة</h2>
                    <button onClick={onClose}><FaTimes /></button>
                </div>

                <div className="flex-shrink-0 mb-4 space-y-3">
                    <StudentGroupSelector 
                        students={allStudents}
                        selectedIds={Array.from(localSelectedIds)}
                        onSelectionChange={(ids) => setLocalSelectedIds(new Set(ids))}
                        circleId={circleId}
                        contextKey="session"
                    />
                    <div className="flex gap-2">
                        <button onClick={handleSelectAll} className="flex-1 p-2 bg-blue-500 text-white rounded-lg text-sm">تحديد الكل</button>
                        <button onClick={handleDeselectAll} className="flex-1 p-2 bg-gray-200 dark:bg-gray-600 rounded-lg text-sm">إلغاء تحديد الكل</button>
                    </div>
                     <input
                        type="text"
                        placeholder="ابحث عن طالب..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600"
                    />
                </div>

                <div className="flex-grow overflow-y-auto space-y-2 pr-2">
                    {filteredStudents.map(student => (
                        <label key={student.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                            <div onClick={(e) => { e.preventDefault(); handleToggle(student.id); }}>
                                {localSelectedIds.has(student.id)
                                    ? <FaCheckSquare className="text-primary dark:text-accent" size={20} />
                                    : <FaRegSquare className="text-gray-400" size={20} />
                                }
                            </div>
                            <StudentAvatar {...student} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                            <span className="font-semibold">{student.name}</span>
                        </label>
                    ))}
                </div>

                <div className="flex justify-end gap-3 mt-6 flex-shrink-0">
                    <button onClick={onClose} className="px-6 py-2 rounded-lg bg-gray-200 dark:bg-gray-600">إلغاء</button>
                    <button onClick={handleConfirm} className="px-6 py-2 rounded-lg bg-primary text-white">
                        تأكيد ({localSelectedIds.size})
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

const SessionStatsModal: React.FC<{ session: Session; onClose: () => void; onStudentClick: (studentId: number) => void }> = ({ session, onClose, onStudentClick }) => {
    
    // Sort students by original order
    const allSessionStudents = [...session.students].sort((a, b) => a.order - b.order);

    const presentCount = session.students.filter(s => s.attendance === 'present' || s.attendance === 'late').length;
    const absentCount = session.students.filter(s => s.attendance === 'absent').length;
    const excusedCount = session.students.filter(s => s.attendance === 'excused').length;
    
    // Recitation Stats (Simple counts)
    const recitedMemo = session.students.filter(s => s.memorization?.hasMemorization).length;
    const recitedReview = session.students.filter(s => s.review?.hasReview).length;

    // Modal Style: Bottom Sheet
    const bottomSheetVariants = {
        initial: { y: '100%' },
        animate: { y: 0 },
        exit: { y: '100%' },
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-end justify-center z-[250] p-0" onClick={onClose}>
            <motion.div 
                variants={bottomSheetVariants}
                initial="initial" 
                animate="animate" 
                exit="exit"
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-gray-800 w-full max-w-md h-[90vh] rounded-t-3xl shadow-2xl flex flex-col overflow-hidden relative"
            >
                {/* Header */}
                <div className="bg-gray-50 dark:bg-gray-900/50 p-4 border-b dark:border-gray-700 flex justify-between items-center flex-shrink-0">
                    <div>
                        <h3 className="font-bold text-lg text-primary dark:text-accent flex items-center gap-2">
                            <FaChartBar /> إحصائيات الجلسة
                        </h3>
                        {session.isLesson && (
                            <div className="text-xs text-gray-500 mt-1 flex flex-col gap-0.5">
                                <span>{session.lessonType}</span>
                                {session.lessonTitle && <span className="font-semibold">{session.lessonTitle}</span>}
                            </div>
                        )}
                    </div>
                    <button onClick={onClose} className="p-2 bg-gray-200 dark:bg-gray-700 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600"><FaTimes /></button>
                </div>
                
                {/* Content */}
                <div className="flex-grow overflow-y-auto p-4 space-y-5">
                    
                    {/* Summary Cards */}
                    <div className="grid grid-cols-4 gap-2 text-center text-xs">
                        <div className="bg-green-50 dark:bg-green-900/30 p-2 rounded-xl border border-green-200 dark:border-green-800">
                            <span className="block font-bold text-xl text-green-700 dark:text-green-400">{presentCount}</span>
                            <span className="text-gray-500 dark:text-gray-400">حضور</span>
                        </div>
                        <div className="bg-red-50 dark:bg-red-900/30 p-2 rounded-xl border border-red-200 dark:border-red-800">
                            <span className="block font-bold text-xl text-red-700 dark:text-red-400">{absentCount}</span>
                            <span className="text-gray-500 dark:text-gray-400">غياب</span>
                        </div>
                        {session.isLesson ? (
                            <>
                                <div className="bg-yellow-50 dark:bg-yellow-900/30 p-2 rounded-xl border border-yellow-200 dark:border-yellow-800">
                                    <span className="block font-bold text-xl text-yellow-700 dark:text-yellow-400">{session.students.filter(s => s.attendance === 'late').length}</span>
                                    <span className="text-gray-500 dark:text-gray-400">تأخر</span>
                                </div>
                                <div className="bg-blue-50 dark:bg-blue-900/30 p-2 rounded-xl border border-blue-200 dark:border-blue-800">
                                    <span className="block font-bold text-xl text-blue-700 dark:text-blue-400">{excusedCount}</span>
                                    <span className="text-gray-500 dark:text-gray-400">عذر</span>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="bg-blue-50 dark:bg-blue-900/30 p-2 rounded-xl border border-blue-200 dark:border-blue-800">
                                    <span className="block font-bold text-xl text-blue-700 dark:text-blue-400">{recitedMemo + recitedReview}</span>
                                    <span className="text-gray-500 dark:text-gray-400">تسميع</span>
                                </div>
                                <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded-xl border border-gray-200 dark:border-gray-600">
                                    <span className="block font-bold text-xl text-gray-700 dark:text-gray-300">{allSessionStudents.length}</span>
                                    <span className="text-gray-500 dark:text-gray-400">الإجمالي</span>
                                </div>
                            </>
                        )}
                    </div>

                    {session.isLesson ? (
                        /* Lesson Mode Table */
                        <div className="border rounded-xl dark:border-gray-700 overflow-hidden shadow-sm">
                            <div className="bg-gray-100 dark:bg-gray-700/50 px-3 py-2 font-bold text-xs text-gray-700 dark:text-gray-300">📋 كشف الحضور</div>
                            <table className="w-full text-right text-[10px] table-fixed">
                                <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 border-b dark:border-gray-700">
                                    <tr>
                                        <th className="p-2 w-1/2">الطالب</th>
                                        <th className="p-2 w-1/2 text-center">الحالة</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-800">
                                    {allSessionStudents.map(s => {
                                        let statusText = '';
                                        let statusClass = '';
                                        
                                        switch (s.attendance) {
                                            case 'present': 
                                                statusText = 'حاضر ✅'; 
                                                statusClass = 'text-green-600 dark:text-green-400'; 
                                                break;
                                            case 'late': 
                                                statusText = 'متأخر 🟡'; 
                                                statusClass = 'text-yellow-600 dark:text-yellow-400'; 
                                                break;
                                            case 'excused': 
                                                statusText = `مستأذن 🔵${s.excuse ? ` (${s.excuse})` : ''}`; 
                                                statusClass = 'text-blue-600 dark:text-blue-400'; 
                                                break;
                                            case 'absent': 
                                                statusText = 'غائب ❌'; 
                                                statusClass = 'text-red-600 dark:text-red-400'; 
                                                break;
                                        }

                                        return (
                                            <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/20">
                                                <td className="p-2 flex items-center gap-2 overflow-hidden">
                                                    <StudentAvatar {...s} className="w-5 h-5 rounded-full flex-shrink-0" />
                                                    <div 
                                                        onClick={() => onStudentClick(s.id)}
                                                        className="font-semibold truncate cursor-pointer hover:text-primary dark:hover:text-accent transition-colors"
                                                    >
                                                        {s.name}
                                                    </div>
                                                </td>
                                                <td className={`p-2 text-center font-bold ${statusClass}`}>
                                                    {statusText}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        /* Unified Recitation Mode Table */
                        <div className="border rounded-xl dark:border-gray-700 overflow-hidden shadow-sm">
                            <div className="bg-gray-100 dark:bg-gray-700/50 px-3 py-2 font-bold text-xs text-gray-700 dark:text-gray-300">📋 سجل الجلسة الشامل</div>
                            <table className="w-full text-right text-[10px] table-fixed">
                                <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 border-b dark:border-gray-700">
                                    <tr>
                                        <th className="p-2 w-[35%]">الطالب</th>
                                        <th className="p-2 w-[32.5%] text-center">الحفظ</th>
                                        <th className="p-2 w-[32.5%] text-center">المراجعة</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-800">
                                    {allSessionStudents.map(s => {
                                        const isAbsent = s.attendance === 'absent';
                                        const isExcused = s.attendance === 'excused';
                                        const isLate = s.attendance === 'late';
                                        
                                        // --- Render Logic ---
                                        let nameContent = (
                                            <div className="flex flex-col min-w-0">
                                                <span className="font-semibold truncate">{s.name}</span>
                                                <div className="flex gap-1">
                                                    {isAbsent && <span className="text-[9px] text-red-500 font-bold">غائب</span>}
                                                    {isExcused && <span className="text-[9px] text-blue-500 font-bold">مستأذن</span>}
                                                    {isLate && <span className="text-[9px] text-yellow-600 font-bold">(متأخر)</span>}
                                                </div>
                                            </div>
                                        );

                                        let memoContent: React.ReactNode = "-";
                                        let reviewContent: React.ReactNode = "-";

                                        if (!isAbsent && !isExcused) {
                                            // Memorization Cell
                                            if (s.isKhatim) {
                                                memoContent = <span className="text-yellow-600 dark:text-yellow-400 font-bold">خاتم ⭐</span>;
                                            } else if (s.suspendedMemorization) {
                                                memoContent = <span className="text-gray-400 text-[9px]">موقوف</span>;
                                            } else if (s.memorization.hasMemorization) {
                                                memoContent = <span className="text-green-600 dark:text-green-400 font-medium break-words whitespace-normal leading-tight">{formatSurahAyah(s.memorization, true)}</span>;
                                            } else {
                                                memoContent = <span className="text-red-500 font-bold text-[9px]">لم يحفظ ❌</span>;
                                            }

                                            // Review Cell
                                            if (s.isKhatim && !(s.khatimRecitesReview ?? true)) {
                                                reviewContent = <span className="text-gray-400 text-[9px]">-</span>;
                                            } else if (s.suspendedReview) {
                                                reviewContent = <span className="text-gray-400 text-[9px]">موقوف</span>;
                                            } else if (s.review.hasReview) {
                                                reviewContent = <span className="text-blue-600 dark:text-blue-400 font-medium break-words whitespace-normal leading-tight">{formatSurahAyah(s.review, true)}</span>;
                                            } else {
                                                reviewContent = <span className="text-red-500 font-bold text-[9px]">لم يراجع ❌</span>;
                                            }
                                        } else if (isExcused) {
                                            memoContent = <span className="text-blue-400">-</span>;
                                            reviewContent = <span className="text-blue-400">-</span>;
                                        } else if (isAbsent) {
                                            memoContent = <span className="text-red-300">-</span>;
                                            reviewContent = <span className="text-red-300">-</span>;
                                        }

                                        return (
                                            <tr key={s.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/20 ${isAbsent ? 'bg-red-50/30 dark:bg-red-900/10' : ''} ${isExcused ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}`}>
                                                <td className="p-2 flex items-center gap-2 overflow-hidden align-top">
                                                    <StudentAvatar {...s} className="w-6 h-6 rounded-full flex-shrink-0 mt-0.5" />
                                                    <div 
                                                        onClick={() => onStudentClick(s.id)}
                                                        className="cursor-pointer hover:text-primary dark:hover:text-accent transition-colors w-full"
                                                    >
                                                        {nameContent}
                                                    </div>
                                                </td>
                                                <td className="p-2 text-center align-middle border-r border-gray-50 dark:border-gray-700/50">
                                                    {memoContent}
                                                </td>
                                                <td className="p-2 text-center align-middle border-r border-gray-50 dark:border-gray-700/50">
                                                    {reviewContent}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
};


const ToolButton: React.FC<{ onClick: () => void; icon: IconType; color: string; label: string }> = ({ onClick, icon: Icon, color, label }) => (
    <button 
        onClick={onClick} 
        className="flex flex-col items-center justify-center gap-1 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all group"
    >
        <div className={`p-2 rounded-lg bg-gray-50 dark:bg-gray-900 group-hover:scale-110 transition-transform`}>
            <Icon className={color} size={18} />
        </div>
        <span className="text-[10px] text-gray-600 dark:text-gray-400 font-medium text-center leading-tight">{label}</span>
    </button>
);
    
const SessionForm: React.FC<SessionFormProps> = ({ session, setSession, allStudents, onUpdateMasterStudents, onSave, onBack, setAlert, lessonTypes, onAddLessonType, onDeleteLessonType, setConfirmationModal, onShowLastRecord, settings, onResetDraft, addToast, isSubModalOpen, onSubModalOpen, onSubModalClose, circleId }) => {
    const [isDirty, setIsDirty] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [openNoteId, setOpenNoteId] = useState<number | null>(null);
    const [openToolsId, setOpenToolsId] = useState<number | null>(null);
    const [isStudentSelectorOpen, setIsStudentSelectorOpen] = useState(false);
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [surahSelector, setSurahSelector] = useState<{ isOpen: boolean; onSelect: (value: string) => void; title: string; }>({ isOpen: false, onSelect: () => {}, title: '' });
    const [showStatsModal, setShowStatsModal] = useState(false);
    const [isBulkActionsOpen, setIsBulkActionsOpen] = useState(false);
    const [isSmartScanOpen, setIsSmartScanOpen] = useState(false);

    const handleApplySmartScan = (scanResults: any[], adoptionMode: 'update_only' | 'rebuild_session' = 'update_only') => {
        setSession(currentSession => {
            if (!currentSession) return null;
            const now = Date.now();
            
            let updatedStudents: SessionStudent[] = [];

            if (adoptionMode === 'rebuild_session') {
                // Option 2: Rebuild session based on scanned images
                updatedStudents = scanResults.map(scanRes => {
                    const originalStudent = allStudents.find(as => as.id === scanRes.numericId);
                    if (!originalStudent) return null; 
                    
                    const existingInSession = currentSession.students.find(s => s.id === scanRes.numericId);
                    
                    const isSuspendedMemo = originalStudent.suspendedMemorization || existingInSession?.suspendedMemorization;
                    const isSuspendedRev = originalStudent.suspendedReview || existingInSession?.suspendedReview;

                    return {
                        id: originalStudent.id,
                        name: originalStudent.name,
                        gender: originalStudent.gender,
                        photo: originalStudent.photo,
                        order: originalStudent.order,
                        attendance: scanRes.attendance || (existingInSession?.attendance || 'present'),
                        excuse: scanRes.attendance === 'excused' ? (scanRes.excuse || '') : '',
                        memorization: (scanRes.memorization && scanRes.memorization.fromSurah && scanRes.memorization.fromSurah.trim() !== '' && !isSuspendedMemo) ? {
                            hasMemorization: true,
                            fromSurah: scanRes.memorization.fromSurah,
                            fromAyah: scanRes.memorization.fromAyah || '',
                            toSurah: scanRes.memorization.toSurah || '',
                            toAyah: scanRes.memorization.toAyah || '',
                            rating: scanRes.memorization.rating ?? (pointsSettings.maxMemorizationGrade ?? 10)
                        } : {
                            hasMemorization: false,
                            fromSurah: '',
                            fromAyah: '',
                            toSurah: '',
                            toAyah: ''
                        },
                        review: (scanRes.review && scanRes.review.fromSurah && scanRes.review.fromSurah.trim() !== '' && !isSuspendedRev) ? {
                            hasReview: true,
                            fromSurah: scanRes.review.fromSurah,
                            fromAyah: scanRes.review.fromAyah || '',
                            toSurah: scanRes.review.toSurah || '',
                            toAyah: scanRes.review.toAyah || '',
                            rating: scanRes.review.rating ?? (pointsSettings.maxReviewGrade ?? 10)
                        } : {
                            hasReview: false,
                            fromSurah: '',
                            fromAyah: '',
                            toSurah: '',
                            toAyah: ''
                        },
                        lastUpdated: now,
                        isKhatim: originalStudent.isKhatim,
                        parentPhone: originalStudent.parentPhone || existingInSession?.parentPhone
                    } as SessionStudent;
                }).filter(s => s !== null) as SessionStudent[];
            } else {
                // Option 1: Update only identified students
                updatedStudents = currentSession.students.map(s => {
                    const scanRes = scanResults.find(r => r.numericId === s.id);
                    if (scanRes) {
                        const isSuspendedMemo = s.suspendedMemorization;
                        const isSuspendedRev = s.suspendedReview;

                        return {
                            ...s,
                            attendance: scanRes.attendance || s.attendance,
                            excuse: scanRes.attendance === 'excused' ? (scanRes.excuse || s.excuse || '') : '',
                            memorization: (scanRes.memorization && scanRes.memorization.fromSurah && scanRes.memorization.fromSurah.trim() !== '' && !isSuspendedMemo) ? {
                                ...s.memorization,
                                hasMemorization: true,
                                fromSurah: scanRes.memorization.fromSurah,
                                fromAyah: scanRes.memorization.fromAyah || '',
                                toSurah: scanRes.memorization.toSurah || '',
                                toAyah: scanRes.memorization.toAyah || '',
                                rating: scanRes.memorization.rating ?? s.memorization.rating ?? (pointsSettings.maxMemorizationGrade ?? 10)
                            } : {
                                ...s.memorization,
                                hasMemorization: false,
                                fromSurah: '',
                                fromAyah: '',
                                toSurah: '',
                                toAyah: ''
                            },
                            review: (scanRes.review && scanRes.review.fromSurah && scanRes.review.fromSurah.trim() !== '' && !isSuspendedRev) ? {
                                ...s.review,
                                hasReview: true,
                                fromSurah: scanRes.review.fromSurah,
                                fromAyah: scanRes.review.fromAyah || '',
                                toSurah: scanRes.review.toSurah || '',
                                toAyah: scanRes.review.toAyah || '',
                                rating: scanRes.review.rating ?? s.review.rating ?? (pointsSettings.maxReviewGrade ?? 10)
                            } : {
                                ...s.review,
                                hasReview: false,
                                fromSurah: '',
                                fromAyah: '',
                                toSurah: '',
                                toAyah: ''
                            },
                            lastUpdated: now
                        };
                    }
                    return s;
                });
            }
            
            return { ...currentSession, students: updatedStudents, isDirty: true, lastUpdated: now };
        });
        if (!isDirty) setIsDirty(true);
        addToast('تم تطبيق بيانات المسح الذكي بنجاح', 'success');
    };
    const [adjustingPointsStudentId, setAdjustingPointsStudentId] = useState<number | null>(null);
    const [indivPointAmount, setIndivPointAmount] = useState<string>('5');
    const [indivPointReason, setIndivPointReason] = useState<string>('');
    const [indivPointType, setIndivPointType] = useState<'add' | 'subtract'>('add');

    const pointsSettings = session.pointsSettingsSnapshot || settings.pointsSettings || ({} as PointsSettings);

    // Track initial session state for accurate undos
    const initialStudentsRef = useRef<SessionStudent[]>(session.students);

    // Highlight logic for student jump
    const [highlightedStudentId, setHighlightedStudentId] = useState<number | null>(null);

    // Effect to close sub-modals when the parent (App) signals a back press
    useEffect(() => {
        if (!isSubModalOpen) {
            setSurahSelector(prev => ({ ...prev, isOpen: false }));
            setShowStatsModal(false);
        }
    }, [isSubModalOpen]);

    const handleStudentChange = (studentId: number, field: keyof Omit<SessionStudent, 'id' | 'name' | 'gender' | 'photo' | 'order' | 'suspendedMemorization' | 'suspendedReview' | 'notes' | 'parentPhone'> | 'memorization' | 'review', value: any, subField?: keyof MemorizationRecord | keyof ReviewRecord) => {
        setSession(currentSession => {
            if (!currentSession) return null;
            const now = Date.now();
            const newStudents = currentSession.students.map(s => {
                if (s.id === studentId) {
                    if (field === 'memorization' || field === 'review') {
                        const record = s[field];
                        return { ...s, [field]: { ...record, [subField!]: value }, lastUpdated: now };
                    }
                    return { ...s, [field]: value, lastUpdated: now };
                }
                return s;
            });
            return { ...currentSession, students: newStudents, isDirty: true, lastUpdated: now };
        });
        if (!isDirty) setIsDirty(true);
    };

    const handleExecuteBulkAction = (targetIds: number[], actionType: string, data: any) => {
        const now = Date.now();
        const updatedMasterStudents: Student[] = [];
        const actionId = Date.now();

        const actionLabels: any = {
            'suspend_memo': 'إيقاف الحفظ',
            'suspend_review': 'إيقاف المراجعة',
            'add_note': 'إضافة ملاحظة',
            'add_homework': 'تكليف واجب',
            'adjust_points': 'تعديل نقاط',
            'mark_absent': 'تحضير غائبين'
        };

        setSession(prev => {
            if (!prev) return null;
            
            // Handle global note if adding a note
            let updatedSessionNote = prev.note;
            if (actionType === 'add_note') {
                updatedSessionNote = (updatedSessionNote ? updatedSessionNote + '\n' : '') + data.note;
            }

            // State capture for precise revert
            const previousValues: Record<number, { memo: boolean, review: boolean }> = {};

            const updatedStudents = prev.students.map(s => {
                if (!targetIds.includes(s.id)) return s;

                // Record previous state for undo
                previousValues[s.id] = {
                    memo: !!s.suspendedMemorization,
                    review: !!s.suspendedReview
                };

                const updated = { ...s, lastUpdated: now };
                const master = allStudents.find(as => as.id === s.id);
                
                if (actionType === 'suspend_memo') {
                    updated.suspendedMemorization = data.value;
                } else if (actionType === 'suspend_review') {
                    updated.suspendedReview = data.value;
                } else if (actionType === 'add_note') {
                    updated.note = (updated.note ? updated.note + '\n' : '') + data.note;
                } else if (actionType === 'add_homework') {
                    if (data.hwType === 'memo' || data.hwType === 'review' || data.hwType === 'both' || data.hwType === 'pages') {
                        const newHw: HomeworkRecord = {
                            id: actionId, // Use same ID for bulk tracking undo
                            memorization: (data.memo && data.memo.fromSurah) ? {
                                fromSurah: data.memo.fromSurah,
                                fromAyah: data.memo.fromAyah,
                                toSurah: data.memo.toSurah,
                                toAyah: data.memo.toAyah
                            } : undefined,
                            review: (data.review && data.review.fromSurah) ? {
                                fromSurah: data.review.fromSurah,
                                fromAyah: data.review.fromAyah,
                                toSurah: data.review.toSurah,
                                toAyah: data.review.toAyah
                            } : undefined,
                            fromPage: data.fromPage,
                            toPage: data.toPage
                        };
                        updated.homeworks = [newHw, ...(updated.homeworks || [])];
                    }
                    if (data.custom) {
                        updated.extraHomework = (updated.extraHomework ? updated.extraHomework + '\n' : '') + data.custom;
                    }
                } else if (actionType === 'adjust_points') {
                    const adj: ManualPointAdjustment = {
                        id: actionId, // Use same ID for bulk tracking undo
                        amount: data.type === 'subtract' ? -Math.abs(data.amount) : Math.abs(data.amount),
                        reason: data.reason || 'تعديل جماعي',
                        date: new Date().toISOString().split('T')[0],
                        sessionId: session.id
                    };
                    updated.manualPoints = [...(updated.manualPoints || []), adj];
                } else if (actionType === 'mark_absent') {
                    updated.attendance = 'absent';
                }

                return updated as SessionStudent;
            });

            const newBulkAction: AppliedBulkAction = {
                id: actionId,
                type: actionType,
                label: actionLabels[actionType] || actionType,
                targetIds: targetIds,
                data: { ...data, previousValues },
                timestamp: now
            };

            return { 
                ...prev, 
                students: updatedStudents, 
                note: updatedSessionNote, 
                lastUpdated: now, 
                isDirty: true,
                appliedBulkActions: [...(prev.appliedBulkActions || []), newBulkAction]
            };
        });

        if (!isDirty) setIsDirty(true);
        addToast(`✅ تمت العملية داخل الجلسة: ${actionLabels[actionType] || actionType} لـ ${targetIds.length} طالب`, 'success');
    };

    const handleRemoveBulkAction = (actionId: number) => {
        const actionToRemove = session.appliedBulkActions?.find(a => a.id === actionId);
        if (!actionToRemove) return;

        setSession(prev => {
            if (!prev) return null;
            
            const remainingActions = (prev.appliedBulkActions || []).filter(a => a.id !== actionId);
            const updatedStudents = prev.students.map(s => {
                if (!actionToRemove.targetIds.includes(s.id)) return s;
                
                const updated = { ...s };
                if (actionToRemove.type === 'add_homework') {
                    updated.homeworks = (updated.homeworks || []).filter(hw => hw.id !== actionId);
                    if (actionToRemove.data.custom) {
                        updated.extraHomework = (updated.extraHomework || '').replace(actionToRemove.data.custom, '').trim();
                    }
                } else if (actionToRemove.type === 'add_note') {
                    updated.note = (updated.note || '').replace(actionToRemove.data.note, '').trim();
                } else if (actionToRemove.type === 'mark_absent') {
                    updated.attendance = 'present';
                } else if (actionToRemove.type === 'suspend_memo') {
                    const prevVal = actionToRemove.data.previousValues?.[s.id];
                    if (prevVal) {
                        updated.suspendedMemorization = prevVal.memo;
                    } else {
                        const initial = initialStudentsRef.current.find(ps => ps.id === s.id);
                        updated.suspendedMemorization = initial ? initial.suspendedMemorization : false;
                    }
                } else if (actionToRemove.type === 'suspend_review') {
                    const prevVal = actionToRemove.data.previousValues?.[s.id];
                    if (prevVal) {
                        updated.suspendedReview = prevVal.review;
                    } else {
                        const initial = initialStudentsRef.current.find(ps => ps.id === s.id);
                        updated.suspendedReview = initial ? initial.suspendedReview : false;
                    }
                } else if (actionToRemove.type === 'adjust_points') {
                    updated.manualPoints = (updated.manualPoints || []).filter(p => p.id !== actionId);
                }
                return updated;
            });

            return {
                ...prev,
                students: updatedStudents,
                appliedBulkActions: remainingActions,
                isDirty: true
            };
        });

        if (actionToRemove.type === 'adjust_points') {
            const updatedMasterStudents: Student[] = [];
            actionToRemove.targetIds.forEach(sid => {
                const master = allStudents.find(as => as.id === sid);
                if (master) {
                    updatedMasterStudents.push({
                        ...master,
                        manualPoints: (master.manualPoints || []).filter(p => p.id !== actionId)
                    });
                }
            });
            if (updatedMasterStudents.length > 0) onUpdateMasterStudents(updatedMasterStudents);
        }

        if (!isDirty) setIsDirty(true);
        addToast('🔄 تم التراجع عن العملية الجماعيه.');
    };

    const handleSessionChange = (field: keyof Session, value: any) => {
        setSession(currentSession => {
            if (!currentSession) return null;
            return { ...currentSession, [field]: value, isDirty: true, lastUpdated: Date.now() };
        });
         if (!isDirty) setIsDirty(true);
    };

    const handleRecordChange = (studentId: number, type: 'memorization' | 'review', newRecord: MemorizationRecord | ReviewRecord) => {
        setSession(currentSession => {
            if (!currentSession) return null;
            const now = Date.now();
            const newStudents = currentSession.students.map(s =>
                s.id === studentId ? { ...s, [type]: newRecord, lastUpdated: now } : s
            );
            return { ...currentSession, students: newStudents, isDirty: true, lastUpdated: now };
        });
        if (!isDirty) setIsDirty(true);
    }

    const handleExtraRecordChange = (studentId: number, type: 'memorization' | 'review', index: number, newRecord: any) => {
        setSession(currentSession => {
            if (!currentSession) return null;
            const now = Date.now();
            const newStudents = currentSession.students.map(s => {
                if (s.id === studentId) {
                    const field = type === 'memorization' ? 'extraMemorizations' : 'extraReviews';
                    const list = [...(s[field] || [])];
                    list[index] = newRecord;
                    return { ...s, [field]: list, lastUpdated: now };
                }
                return s;
            });
            return { ...currentSession, students: newStudents, isDirty: true, lastUpdated: now };
        });
        if (!isDirty) setIsDirty(true);
    };

    const handleOtherRecitationChange = (studentId: number, index: number, field: string, value: any) => {
        setSession(currentSession => {
            if (!currentSession) return null;
            const now = Date.now();
            const newStudents = currentSession.students.map(s => {
                if (s.id === studentId) {
                    const list = [...(s.otherRecitations || [])];
                    list[index] = { ...list[index], [field]: value };
                    return { ...s, otherRecitations: list, lastUpdated: now };
                }
                return s;
            });
            return { ...currentSession, students: newStudents, isDirty: true, lastUpdated: now };
        });
        if (!isDirty) setIsDirty(true);
    };

    const handleHomeworkChange = (studentId: number, index: number, newRecord: HomeworkRecord) => {
        setSession(currentSession => {
            if (!currentSession) return null;
            const now = Date.now();
            const newStudents = currentSession.students.map(s => {
                if (s.id === studentId) {
                    const list = [...(s.homeworks || [])];
                    list[index] = newRecord;
                    return { ...s, homeworks: list, lastUpdated: now };
                }
                return s;
            });
            return { ...currentSession, students: newStudents, isDirty: true, lastUpdated: now };
        });
        if (!isDirty) setIsDirty(true);
    };

    const addExtraRecord = (studentId: number, type: 'memorization' | 'review' | 'other' | 'homework', label?: string) => {
        setSession(currentSession => {
            if (!currentSession) return null;
            const newStudents = currentSession.students.map(s => {
                if (s.id === studentId) {
                    if (type === 'homework') {
                        const list = [...(s.homeworks || [])];
                        list.unshift({
                            id: Date.now(),
                            memorization: { fromSurah: '', fromAyah: '', toSurah: '', toAyah: '' },
                            review: { fromSurah: '', fromAyah: '', toSurah: '', toAyah: '' }
                        });
                        return { ...s, homeworks: list };
                    }
                    if (type === 'other') {
                        const list = [...(s.otherRecitations || [])];
                        list.push({ id: Date.now(), title: '', content: '', rating: 10 });
                        return { ...s, otherRecitations: list };
                    }
                    const field = type === 'memorization' ? 'extraMemorizations' : 'extraReviews';
                    const list = [...(s[field] || [])];
                    const newRecord = type === 'memorization' 
                        ? { id: Date.now() + Math.random(), hasMemorization: true, fromSurah: '', fromAyah: '', toSurah: '', toAyah: '', rating: 10 }
                        : { id: Date.now() + Math.random(), hasReview: true, fromSurah: '', fromAyah: '', toSurah: '', toAyah: '', rating: 10, label };
                    list.push(newRecord as any);
                    return { ...s, [field]: list };
                }
                return s;
            });
            return { ...currentSession, students: newStudents, isDirty: true };
        });
        setOpenToolsId(null);
        if (!isDirty) setIsDirty(true);
    };

    const removeExtraRecord = (studentId: number, type: 'memorization' | 'review' | 'other' | 'homework', index: number) => {
        setSession(currentSession => {
            if (!currentSession) return null;
            const newStudents = currentSession.students.map(s => {
                if (s.id === studentId) {
                    if (type === 'homework') {
                        const list = [...(s.homeworks || [])];
                        list.splice(index, 1);
                        return { ...s, homeworks: list };
                    }
                    if (type === 'other') {
                        const list = [...(s.otherRecitations || [])];
                        list.splice(index, 1);
                        return { ...s, otherRecitations: list };
                    }
                    const field = type === 'memorization' ? 'extraMemorizations' : 'extraReviews';
                    const list = [...(s[field] || [])];
                    list.splice(index, 1);
                    return { ...s, [field]: list };
                }
                return s;
            });
            return { ...currentSession, students: newStudents, isDirty: true };
        });
        if (!isDirty) setIsDirty(true);
    };

    const toggleSuspension = (studentId: number, type: 'memorization' | 'review') => {
        setSession(currentSession => {
            if (!currentSession) return null;
            const newStudents = currentSession.students.map(s => {
                if (s.id === studentId) {
                    const field = type === 'memorization' ? 'suspendedMemorization' : 'suspendedReview';
                    return { ...s, [field]: !s[field] };
                }
                return s;
            });
            return { ...currentSession, students: newStudents, isDirty: true };
        });
        setOpenToolsId(null);
        if (!isDirty) setIsDirty(true);
    };
    
    const normalizeSurahName = (name: string) => {
        if (!name) return '';
        return name.trim().replace(/ه$/, 'ة').replace(/[أإآ]/g, 'ا');
    };

    const checkAyahValidity = (student: SessionStudent, type: 'memorization' | 'review', record?: MemorizationRecord | ReviewRecord, label?: string) => {
        const currentRecord = record || (type === 'memorization' ? student.memorization : student.review);
        const recordTerm = label || (type === 'memorization' ? "الحفظ" : "المراجعة");

        if (!currentRecord || !(currentRecord as any)[type === 'memorization' ? 'hasMemorization' : 'hasReview']) return '';

        const normalizedFromSurahName = normalizeSurahName(currentRecord.fromSurah);
        const normalizedToSurahName = normalizeSurahName(currentRecord.toSurah);

        const fromSurah = surahs.find(s => normalizeSurahName(s.name) === normalizedFromSurahName);
        const toSurah = surahs.find(s => normalizeSurahName(s.name) === normalizedToSurahName);

        // Only validate if surah name is valid
        if (currentRecord.fromAyah && fromSurah && parseInt(currentRecord.fromAyah) > fromSurah.verses) {
            return `${student.name}:\nآية البدء في ${recordTerm} (${currentRecord.fromAyah}) أكبر من عدد آيات سورة ${fromSurah.name} (${fromSurah.verses}).\n\n`;
        }
        if (currentRecord.toAyah && toSurah && parseInt(currentRecord.toAyah) > toSurah.verses) {
            return `${student.name}:\nآية الانتهاء في ${recordTerm} (${currentRecord.toAyah}) أكبر من عدد آيات سورة ${toSurah.name} (${toSurah.verses}).\n\n`;
        }
        return '';
    };


    const handleSubmit = () => {
        if (!session.isLesson) {
            let missingDataError = '';
            let invalidAyahError = '';

            session.students.forEach(student => {
                if (student.attendance === 'present' || student.attendance === 'late') {
                    // Main records
                    if (student.memorization.hasMemorization && (!student.memorization.fromSurah)) {
                        missingDataError += `${student.name}: يرجى تحديد سورة البدء في الحفظ.\n`;
                    }
                    if (student.review.hasReview && (!student.review.fromSurah)) {
                        missingDataError += `${student.name}: يرجى تحديد سورة البدء في المراجعة.\n`;
                    }
                    invalidAyahError += checkAyahValidity(student, 'memorization');
                    invalidAyahError += checkAyahValidity(student, 'review');

                    // Extra records
                    student.extraMemorizations?.forEach((rec, idx) => {
                        if (rec.hasMemorization && !rec.fromSurah) {
                            missingDataError += `${student.name}: يرجى تحديد سورة البدء في الحفظ الإضافي ${idx + 1}.\n`;
                        }
                        invalidAyahError += checkAyahValidity(student, 'memorization', rec, `الحفظ الإضافي ${idx + 1}`);
                    });
                    student.extraReviews?.forEach((rec, idx) => {
                        const label = rec.label || `المراجعة الإضافية ${idx + 1}`;
                        if (rec.hasReview && !rec.fromSurah) {
                            missingDataError += `${student.name}: يرجى تحديد سورة البدء في ${label}.\n`;
                        }
                        invalidAyahError += checkAyahValidity(student, 'review', rec, label);
                    });
                }
            });
            
            if (missingDataError) {
                setAlert({ isOpen: true, title: "بيانات غير مكتملة", message: `يرجى تحديد السور من وإلى للطلاب المحددين قبل حفظ الجلسة:\n\n${missingDataError}` });
                return;
            }
            if (invalidAyahError) {
                setAlert({ isOpen: true, title: "❗ خطأ في إدخال الآيات", message: `يرجى تصحيح الأخطاء التالية:\n\n${invalidAyahError}` });
                return;
            }
        }

        // Cleanup empty homeworks
        const cleanedSession = {
            ...session,
            students: session.students.map(s => ({
                ...s,
                homeworks: s.homeworks?.filter(hw => 
                    (hw.memorization && hw.memorization.fromSurah) || 
                    (hw.review && hw.review.fromSurah)
                )
            }))
        };
        onSave(cleanedSession);
    };
    
    const sortedStudents = useMemo(() => {
        const normalizedSearch = normalizeText(searchTerm);
        // Ensure uniqueness by ID to prevent duplicate key warnings
        const uniqueStudents = session.students.filter((s, index, self) => 
            index === self.findIndex((t) => t.id === s.id)
        );
        return [...uniqueStudents]
            .sort((a, b) => a.order - b.order)
            .filter(s => normalizeText(s.name).includes(normalizedSearch));
    }, [session.students, searchTerm]);

    
    const hasEffectiveData = useMemo(() => {
        if (session.isLesson && (session.lessonType || session.lessonTitle)) return true;
        if (session && session.note && session.note.trim() !== '') return true;
        if (session && session.appliedBulkActions && session.appliedBulkActions.length > 0) return true;
        
        // Check if any meaningful data has been entered for any student
        return session.students.some(s => 
            s.attendance !== 'present' || 
            s.memorization.hasMemorization || 
            s.review.hasReview || 
            (s.extraMemorizations && s.extraMemorizations.some(m => m.hasMemorization)) ||
            (s.extraReviews && s.extraReviews.some(r => r.hasReview)) ||
            (s.note && s.note.trim() !== '') || 
            (s.excuse && s.excuse.trim() !== '') ||
            (s.manualPoints && s.manualPoints.length > 0) ||
            (s.otherRecitations && s.otherRecitations.length > 0)
        );
    }, [session]);

    const handleResetClick = () => {
        if (!hasEffectiveData) return; 
        setConfirmationModal({
            isOpen: true,
            title: 'تصفير المسودة',
            message: 'هل أنت متأكد من تصفير المسودة الحالية؟ سيتم مسح جميع البيانات والإضافات لتعود الجلسة فارغة تماماً.',
            onConfirm: () => {
                // Ensure modal is closed first
                setConfirmationModal({ isOpen: false, title: '', message: '', onConfirm: () => {} });
                
                const preservedDate = session.date;
                onResetDraft(preservedDate);
                
                // Also clear any sub-modals that might be open
                setShowStatsModal(false);
                setIsBulkActionsOpen(false);
                setIsStudentSelectorOpen(false);
            }
        });
    };


    const handleStudentSelectionConfirm = (newStudentIds: number[]) => {
        setSession(currentSession => {
            if (!currentSession) return null;

            const currentStudentDataMap = new Map(currentSession.students.map(s => [s.id, s]));
            
            const newStudentsForSession = allStudents
                .filter(s => newStudentIds.includes(s.id))
                .map(student => {
                    if (currentStudentDataMap.has(student.id)) {
                        return currentStudentDataMap.get(student.id)!;
                    }
                    return {
                        ...student,
                        attendance: 'present' as 'present',
                        excuse: '',
                        memorization: { hasMemorization: false, fromSurah: '', fromAyah: '', toSurah: '', toAyah: '' },
                        review: { hasReview: false, fromSurah: '', fromAyah: '', toSurah: '', toAyah: '' },
                        extraMemorizations: [],
                        extraReviews: [],
                        note: '',
                        extraHomework: ''
                    };
                });

            return { ...currentSession, students: newStudentsForSession, isDirty: true };
        });
        setIsStudentSelectorOpen(false);
    };

    const handleOpenSelector = (onSelect: (value: string) => void, title: string) => {
        onSubModalOpen();
        setSurahSelector({ isOpen: true, onSelect, title });
    };

    const handleOpenStats = () => {
        onSubModalOpen();
        setShowStatsModal(true);
    };
    
    // Function to handle clicking a student name in the stats modal
    const handleStudentClickFromStats = (studentId: number) => {
        setShowStatsModal(false);
        onSubModalClose();
        
        // Wait a tiny bit for modal close animation to start/finish
        setTimeout(() => {
            const element = document.getElementById(`student-row-${studentId}`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                setHighlightedStudentId(studentId);
                
                // Clear highlight after 2 seconds
                setTimeout(() => setHighlightedStudentId(null), 2000);
            }
        }, 300);
    };

    return (
        <motion.div variants={modalVariants} initial="initial" animate="animate" exit="exit" transition={{type:'spring', stiffness: 300, damping: 30}} className="fixed inset-0 bg-gray-50 dark:bg-gray-900 z-40 flex flex-col transition-colors duration-300">
            <div className="flex-grow flex flex-col max-w-6xl mx-auto w-full p-4 overflow-hidden relative">
            <div className="flex items-center justify-between mb-4 pb-4 border-b dark:border-gray-700 flex-shrink-0">
                <div>
                    <h2 className="text-xl font-bold text-primary dark:text-accent flex items-center gap-1">
                        تفاصيل الجلسة
                        {hasEffectiveData && (
                            <button onClick={handleOpenStats} className="text-[10px] text-primary dark:text-accent opacity-20 hover:opacity-100 transition-all p-0.5" title="إحصائيات الجلسة">
                                <FaQuestionCircle size={14} />
                            </button>
                        )}
                    </h2>
                     <div className="flex items-baseline gap-2">
                        <button 
                            type="button"
                            onClick={() => setIsDatePickerOpen(true)}
                            className="text-sm text-gray-500 dark:text-gray-200 hover:text-primary dark:hover:text-accent transition-colors cursor-pointer"
                            title="تغيير التاريخ"
                        >
                            {formatDate(session.date)}
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsStudentSelectorOpen(true)}
                            className="text-xs text-gray-400 dark:text-gray-500 opacity-60 hover:opacity-100 transition-opacity -mb-1"
                            title="تحديد الطلاب لهذه الجلسة"
                        >
                            الكل({session.students.length})
                        </button>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {hasEffectiveData && (
                        <button
                            type="button"
                            onClick={handleResetClick}
                            className="text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors p-1"
                            title="تصفير المسودة"
                        >
                            <FaUndo />
                        </button>
                    )}
                    <button onClick={onBack} className="text-gray-600 dark:text-gray-200"><FaTimes size={20} /></button>
                </div>
            </div>
            
            <div className="flex items-center justify-between gap-2 mb-4 flex-shrink-0">
                <div className="flex items-center gap-2">
                    <label htmlFor="lessonMode" className="text-sm font-medium">وضع الدرس</label>
                    <div onClick={() => handleSessionChange('isLesson', !session.isLesson)} className={`w-12 h-6 rounded-full flex items-center transition-colors p-1 cursor-pointer ${session.isLesson ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'}`}>
                        <motion.div layout transition={{ type: "spring", stiffness: 700, damping: 30 }} className={`w-4 h-4 bg-white rounded-full ${session.isLesson ? 'ml-6' : 'mr-6'}`} />
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => { setIsBulkActionsOpen(true); onSubModalOpen(); }}
                        className="p-1.5 rounded-xl bg-gray-500/5 text-gray-400 hover:bg-primary/10 hover:text-primary transition-all flex items-center justify-center opacity-40 hover:opacity-100"
                        title="أدوات جماعية"
                    >
                        <FaLayerGroup size={16} />
                    </button>

                    {session.students.length >= 3 && (
                        <div className="relative w-40">
                            <input
                                type="text"
                                placeholder="بحث..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full p-1 pr-7 pl-7 text-sm border rounded-full bg-gray-100 dark:bg-gray-700 dark:border-gray-600"
                            />
                            {searchTerm ? (
                                <button type="button" onClick={() => setSearchTerm('')} className="absolute top-1/2 left-2 -translate-y-1/2 text-gray-500">
                                    <FaTimes size={12}/>
                                </button>
                            ) : (
                                <FaSearch className="absolute top-1/2 right-2 -translate-y-1/2 text-gray-400" size={12}/>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className="flex-grow overflow-y-auto space-y-4 pb-20">
                <AnimatePresence mode="wait">
                    {session.isLesson ? (
                         <LessonModeUI 
                            session={session} 
                            handleSessionChange={handleSessionChange} 
                            lessonTypes={lessonTypes} 
                            onAddLessonType={onAddLessonType}
                            onDeleteLessonType={onDeleteLessonType}
                            setConfirmationModal={setConfirmationModal}
                            sortedStudents={sortedStudents}
                            handleStudentChange={handleStudentChange}
                         />
                    ) : (
                        <motion.div key="default-mode" initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}} className="space-y-4">
                            {sortedStudents.map(student => (
                                <div 
                                    key={student.id} 
                                    id={`student-row-${student.id}`}
                                    className={`bg-white dark:bg-gray-800 p-4 rounded-lg shadow transition-all duration-500 ${highlightedStudentId === student.id ? 'ring-2 ring-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 shadow-lg scale-[1.02] z-10' : ''}`}
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <StudentAvatar photo={student.photo} name={student.name} id={student.id} className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
                                            <div className="flex items-center gap-2 min-w-0">
                                                <span className="font-bold text-gray-800 dark:text-white whitespace-normal line-clamp-2 leading-tight">{student.name}</span>
                                                <div className="relative">
                                                    <button 
                                                        type="button" 
                                                        onClick={() => setOpenToolsId(openToolsId === student.id ? null : student.id)} 
                                                        className={`p-1 rounded-md transition-all flex-shrink-0 opacity-20 hover:opacity-100 ${openToolsId === student.id ? 'bg-gray-200 dark:bg-gray-700 opacity-100' : ''}`}
                                                        title="أدوات إضافية"
                                                    >
                                                        <FaThLarge size={14} className="text-gray-500 dark:text-gray-400" />
                                                    </button>
                                                    
                                                    <AnimatePresence>
                                                        {openToolsId === student.id && (
                                                            <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
                                                                <motion.div 
                                                                    initial={{ opacity: 0 }}
                                                                    animate={{ opacity: 1 }}
                                                                    exit={{ opacity: 0 }}
                                                                    className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                                                                    onClick={() => setOpenToolsId(null)}
                                                                />
                                                                <motion.div 
                                                                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                                                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                                                                    className="relative w-full max-w-[300px] bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-3xl shadow-2xl overflow-hidden"
                                                                >
                                                                    <div className="p-4 border-b dark:border-gray-700 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/50">
                                                                        <div className="flex items-center gap-2">
                                                                            <StudentAvatar photo={student.photo} name={student.name} id={student.id} className="w-6 h-6 rounded-full" />
                                                                            <span className="font-bold text-xs text-gray-700 dark:text-gray-200 truncate max-w-[150px]">{student.name}</span>
                                                                        </div>
                                                                        <button onClick={() => setOpenToolsId(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                                                                            <FaTimes size={14} />
                                                                        </button>
                                                                    </div>
                                                                    <div className="p-4 grid grid-cols-3 gap-3">
                                                                        <ToolButton onClick={() => addExtraRecord(student.id, 'memorization')} icon={FaPlusCircle} color="text-green-500" label="حفظ آخر" />
                                                                        <ToolButton onClick={() => addExtraRecord(student.id, 'review')} icon={FaPlusCircle} color="text-blue-500" label="مراجعة أخرى" />
                                                                        <ToolButton onClick={() => addExtraRecord(student.id, 'homework')} icon={FaBook} color="text-indigo-500" label="الواجب" />
                                                                        <ToolButton onClick={() => addExtraRecord(student.id, 'review', 'مراجعة كبرى')} icon={FaBookOpen} color="text-purple-500" label="مراجعة كبرى" />
                                                                        <ToolButton onClick={() => addExtraRecord(student.id, 'review', 'مراجعة صغرى')} icon={FaBook} color="text-orange-500" label="مراجعة صغرى" />
                                                                        <ToolButton onClick={() => addExtraRecord(student.id, 'other')} icon={FaMicrophone} color="text-pink-500" label="تسميع فراغ" />
                                                                        <ToolButton onClick={() => { setOpenNoteId(openNoteId === student.id ? null : student.id); setOpenToolsId(null); }} icon={FaStickyNote} color="text-yellow-500" label="ملاحظة" />
                                                                        <ToolButton onClick={() => { setAdjustingPointsStudentId(student.id); setOpenToolsId(null); onSubModalOpen(); }} icon={FaPlusCircle} color="text-emerald-500" label="نقاط مخصصة" />
                                                                        
                                                                        <div className="col-span-3 border-t dark:border-gray-700 my-1 pt-3">
                                                                            <div className="flex gap-2">
                                                                                <ToolButton 
                                                                                    onClick={() => toggleSuspension(student.id, 'memorization')} 
                                                                                    icon={student.suspendedMemorization ? FaPlay : FaPause} 
                                                                                    color={student.suspendedMemorization ? "text-green-500" : "text-red-500"} 
                                                                                    label={student.suspendedMemorization ? "فتح الحفظ" : "توقيف الحفظ"} 
                                                                                />
                                                                                <ToolButton 
                                                                                    onClick={() => toggleSuspension(student.id, 'review')} 
                                                                                    icon={student.suspendedReview ? FaPlay : FaPause} 
                                                                                    color={student.suspendedReview ? "text-green-500" : "text-red-500"} 
                                                                                    label={student.suspendedReview ? "فتح المراجعة" : "توقيف المراجعة"} 
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </motion.div>
                                                            </div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                            </div>
                                        </div>
                                        <select value={student.attendance} onChange={(e) => handleStudentChange(student.id, 'attendance', e.target.value)} className="p-1 rounded-md bg-gray-50 dark:bg-gray-700 border dark:border-gray-600 text-sm text-gray-800 dark:text-white flex-shrink-0 ml-2">
                                            <option value="present">حاضر</option>
                                            <option value="late">متأخر</option>
                                            <option value="absent">غائب</option>
                                            <option value="excused">مستأذن</option>
                                        </select>
                                    </div>
                                    <AnimatePresence>
                                        {openNoteId === student.id && (
                                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mb-2 relative">
                                                <textarea
                                                    value={student.note}
                                                    onChange={(e) => handleStudentChange(student.id, 'note', e.target.value)}
                                                    placeholder="أضف ملاحظة..."
                                                    className="w-full p-2 text-sm rounded-lg bg-gray-50 dark:bg-gray-700 border dark:border-gray-600 h-20"
                                                />
                                                {student.note && (
                                                    <button 
                                                        type="button" 
                                                        onClick={() => { navigator.clipboard.writeText(student.note); addToast('تم نسخ الملاحظة.', 'info'); }}
                                                        className="absolute bottom-2 left-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1"
                                                    >
                                                        <FaCopy size={12} />
                                                    </button>
                                                )}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                    {student.attendance === 'excused' && (
                                        <input type="text" placeholder="العذر (اختياري)..." value={student.excuse} onChange={(e) => handleStudentChange(student.id, 'excuse', e.target.value)} className="w-full p-2 text-sm rounded-lg bg-gray-50 dark:bg-gray-700 border dark:border-gray-600 mb-3 text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-gray-300" />
                                    )}
                                    {(student.attendance === 'present' || student.attendance === 'late') && (
                                        <div className="space-y-3">
                                            {student.isKhatim ? (
                                                <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/40 text-green-700 dark:text-green-300 font-semibold text-center">
                                                    ⭐ طالب خاتم ⭐
                                                </div>
                                            ) : (
                                                <RecordInput 
                                                    type="memorization" 
                                                    label="الحفظ"
                                                    record={student.memorization}
                                                    isSuspended={student.suspendedMemorization}
                                                    onChange={(newRec) => handleRecordChange(student.id, 'memorization', newRec)} 
                                                    onShowLastRecord={() => onShowLastRecord(student.id, 'memorization')} 
                                                    settings={settings} 
                                                    pointsSettings={pointsSettings}
                                                    onOpenSelector={handleOpenSelector} 
                                                    studentName={student.name}
                                                    recitationType="تسميع حفظ"
                                                />
                                            )}
                                            
                                            {/* Extra Memorizations */}
                                            {student.extraMemorizations?.map((rec, idx) => (
                                                <RecordInput 
                                                    key={`extra-memo-${idx}`}
                                                    type="memorization" 
                                                    label={`حفظ إضافي ${idx + 1}`}
                                                    record={rec}
                                                    onChange={(newRec) => handleExtraRecordChange(student.id, 'memorization', idx, newRec)} 
                                                    onDelete={() => removeExtraRecord(student.id, 'memorization', idx)}
                                                    settings={settings} 
                                                    pointsSettings={pointsSettings}
                                                    onOpenSelector={handleOpenSelector} 
                                                    studentName={student.name}
                                                    recitationType={`حفظ إضافي ${idx + 1}`}
                                                />
                                            ))}
                                            
                                            {(student.isKhatim && !(student.khatimRecitesReview ?? true)) ? (
                                                <div className="p-3 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 text-sm text-center">
                                                    لا يراجع (خاتم)
                                                </div>
                                            ) : (
                                                <RecordInput 
                                                    type="review" 
                                                    label="المراجعة"
                                                    record={student.review}
                                                    isSuspended={student.suspendedReview}
                                                    onChange={(newRec) => handleRecordChange(student.id, 'review', newRec)} 
                                                    onShowLastRecord={() => onShowLastRecord(student.id, 'review')} 
                                                    settings={settings} 
                                                    pointsSettings={pointsSettings}
                                                    onOpenSelector={handleOpenSelector} 
                                                    studentName={student.name}
                                                    recitationType="تسميع مراجعة"
                                                />
                                            )}

                                            {/* Extra Reviews */}
                                            {student.extraReviews?.map((rec, idx) => (
                                                <RecordInput 
                                                    key={`extra-review-${idx}`}
                                                    type="review" 
                                                    label={rec.label || `مراجعة إضافية ${idx + 1}`}
                                                    record={rec}
                                                    onChange={(newRec) => handleExtraRecordChange(student.id, 'review', idx, newRec)} 
                                                    onDelete={() => removeExtraRecord(student.id, 'review', idx)}
                                                    settings={settings} 
                                                    pointsSettings={pointsSettings}
                                                    onOpenSelector={handleOpenSelector} 
                                                    studentName={student.name}
                                                    recitationType={rec.label || `مراجعة إضافية ${idx + 1}`}
                                                />
                                            ))}

                                            {/* Other Recitations */}
                                            {student.otherRecitations?.map((rec, idx) => (
                                                <div key={`other-rec-${idx}`} className="p-3 rounded-lg bg-pink-50 dark:bg-pink-900/20 border-r-4 border-pink-500 space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-semibold text-pink-700 dark:text-pink-300 text-sm">تسميع فراغ</span>
                                                        <button type="button" onClick={() => removeExtraRecord(student.id, 'other', idx)} className="text-red-400 hover:text-red-600">
                                                            <FaTrash size={12} />
                                                        </button>
                                                    </div>
                                                    <input 
                                                        type="text" 
                                                        placeholder="العنوان (مثلاً: الجزرية)..." 
                                                        value={rec.title}
                                                        onChange={(e) => handleOtherRecitationChange(student.id, idx, 'title', e.target.value)}
                                                        className="w-full p-1.5 text-xs rounded border dark:bg-gray-800 dark:border-gray-700"
                                                    />
                                                    <textarea 
                                                        placeholder="المحتوى..." 
                                                        value={rec.content}
                                                        onChange={(e) => handleOtherRecitationChange(student.id, idx, 'content', e.target.value)}
                                                        className="w-full p-1.5 text-xs rounded border dark:bg-gray-800 dark:border-gray-700 h-12"
                                                    />
                                                    <RatingSelector 
                                                        value={rec.rating}
                                                        onChange={(val) => handleOtherRecitationChange(student.id, idx, 'rating', val)}
                                                        max={pointsSettings?.maxMemorizationGrade ?? 10}
                                                    />
                                                </div>
                                            ))}

                                            {/* Homeworks */}
                                            {student.homeworks?.map((hw, idx) => (
                                                <HomeworkInput 
                                                    key={`hw-${idx}`}
                                                    record={hw}
                                                    onChange={(newRec) => handleHomeworkChange(student.id, idx, newRec)}
                                                    onDelete={() => removeExtraRecord(student.id, 'homework', idx)}
                                                    settings={settings}
                                                    onOpenSelector={handleOpenSelector}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-full max-w-md px-4 z-50 flex items-center justify-center">
                <button onClick={handleSubmit} className="w-full bg-accent text-primary-dark font-bold p-3 rounded-lg shadow-lg flex items-center justify-center gap-2">
                    <FaSave /> حفظ الجلسة
                </button>
            </div>
            <AnimatePresence>
                {isStudentSelectorOpen && (
                    <StudentSelectorModal
                        isOpen={isStudentSelectorOpen}
                        onClose={() => setIsStudentSelectorOpen(false)}
                        onConfirm={handleStudentSelectionConfirm}
                        allStudents={allStudents}
                        selectedStudentIds={session.students.map(s => s.id)}
                        circleId={circleId}
                    />
                )}
                {surahSelector.isOpen && (
                    <SurahSelectorModal
                        isOpen
                        onClose={() => {
                            setSurahSelector(prev => ({...prev, isOpen: false}));
                            onSubModalClose();
                        }}
                        onSelect={(value) => {
                            surahSelector.onSelect(value);
                            setSurahSelector(prev => ({...prev, isOpen: false}));
                            onSubModalClose();
                        }}
                        title={surahSelector.title}
                        surahOrder={settings.surahOrder || 'quranic'}
                    />
                )}
                {isDatePickerOpen && (
                    <SessionDatePickerModal
                        isOpen={isDatePickerOpen}
                        onClose={() => setIsDatePickerOpen(false)}
                        dates={[]} 
                        onSelectDate={(date) => {
                             handleSessionChange('date', date);
                             setIsDatePickerOpen(false);
                        }}
                    />
                )}
                {showStatsModal && (
                    <SessionStatsModal session={session} onClose={() => { setShowStatsModal(false); onSubModalClose(); }} onStudentClick={handleStudentClickFromStats} />
                )}
                {isBulkActionsOpen && (
                    <BulkActionsModal 
                        key={`bulk-actions-modal-${session.id}`}
                        isOpen={isBulkActionsOpen}
                        onClose={() => { setIsBulkActionsOpen(false); onSubModalClose(); }}
                        students={session.students}
                        onExecute={handleExecuteBulkAction}
                        settings={settings}
                        isLesson={session.isLesson}
                        onOpenSurahSelector={(onSelect, title) => { onSubModalOpen(); setSurahSelector({ isOpen: true, onSelect, title }); }}
                        appliedActions={session.appliedBulkActions}
                        onRemoveAction={handleRemoveBulkAction}
                        onOpenSmartScan={() => setIsSmartScanOpen(true)}
                        addToast={addToast}
                    />
                )}
                {adjustingPointsStudentId && (
                    <div className="fixed inset-0 z-[500] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
                        <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} className="bg-white dark:bg-gray-800 rounded-[2rem] p-8 w-full max-w-sm shadow-2xl border dark:border-gray-700">
                             <div className="flex justify-between items-center mb-8">
                                <div className="p-3 bg-emerald-500/10 rounded-2xl">
                                    <FaPlusCircle className="text-emerald-500 text-2xl" />
                                </div>
                                <button onClick={() => { setAdjustingPointsStudentId(null); onSubModalClose(); }} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"><FaTimes className="text-gray-400" /></button>
                            </div>
                            
                            <h3 className="font-bold text-xl text-center mb-2 dark:text-white">تعديل نقاط الطالب</h3>
                            <p className="text-xs text-center text-gray-500 mb-8">
                                {session.students.find(s => s.id === adjustingPointsStudentId)?.name}
                            </p>

                            <div className="space-y-6">
                                <div className="flex bg-gray-100 dark:bg-gray-700 p-1.5 rounded-2xl gap-1">
                                    <button 
                                        onClick={() => setIndivPointType('add')} 
                                        className={`flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${indivPointType === 'add' ? 'bg-white dark:bg-gray-600 shadow-md text-emerald-600' : 'text-gray-400'}`}
                                    >
                                        <FaPlusCircle size={14} /> إضافة
                                    </button>
                                    <button 
                                        onClick={() => setIndivPointType('subtract')} 
                                        className={`flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${indivPointType === 'subtract' ? 'bg-white dark:bg-gray-600 shadow-md text-rose-600' : 'text-gray-400'}`}
                                    >
                                        <FaMinusCircle size={14} /> خصم
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 gap-4">
                                    <div>
                                        <label className="block text-[10px] uppercase tracking-wider font-bold mb-2 text-gray-400 text-right pr-2">مقدار النقاط</label>
                                        <input 
                                            type="text" 
                                            inputMode="numeric"
                                            value={indivPointAmount}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                const sanitized = val.replace(/[٠-٩]/g, d => '0123456789'['٠١٢٣٤٥٦٧٨٩'.indexOf(d)]).replace(/[^0-9-]/g, '');
                                                setIndivPointAmount(sanitized);
                                            }}
                                            placeholder="5"
                                            className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-gray-900 border dark:border-gray-700 text-center text-3xl font-black font-sans text-primary dark:text-accent"
                                            style={{ fontFeatureSettings: '"tnum"' }}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] uppercase tracking-wider font-bold mb-2 text-gray-400 text-right pr-2">سبب التعديل (إلزامي)</label>
                                        <textarea 
                                            value={indivPointReason}
                                            onChange={(e) => setIndivPointReason(e.target.value)}
                                            placeholder="مثال: تميز في التجويد، تفاعل مميز..."
                                            className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-gray-900 border dark:border-gray-700 text-right text-sm h-32 resize-none focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button 
                                        onClick={() => {
                                            const amount = parseInt(indivPointAmount) || 0;
                                            const finalAmount = indivPointType === 'add' ? Math.abs(amount) : -Math.abs(amount);
                                            
                                            if (finalAmount !== 0 && indivPointReason.trim() && adjustingPointsStudentId) {
                                                const student = session.students.find(s => s.id === adjustingPointsStudentId);
                                                if (student) {
                                                    const adj: ManualPointAdjustment = {
                                                        id: generateUniqueId(),
                                                        amount: finalAmount,
                                                        reason: indivPointReason.trim(),
                                                        date: new Date().toISOString().split('T')[0],
                                                        sessionId: session.id
                                                    };
                                                    
                                                    setSession(currentSession => {
                                                        if (!currentSession) return null;
                                                        return {
                                                            ...currentSession,
                                                            isDirty: true,
                                                            students: currentSession.students.map(s => {
                                                                if (s.id === adjustingPointsStudentId) {
                                                                    return { ...s, manualPoints: [...(s.manualPoints || []), adj] };
                                                                }
                                                                return s;
                                                            })
                                                        };
                                                    });
                                                    
                                                    if (!isDirty) setIsDirty(true);
                                                    addToast(`✅ تمت العملية بنجاح لـ ${student.name}`, 'success');
                                                    
                                                    // Reset and close
                                                    setIndivPointAmount('5');
                                                    setIndivPointReason('');
                                                    setAdjustingPointsStudentId(null);
                                                    onSubModalClose();
                                                }
                                            }
                                        }}
                                        disabled={!indivPointReason.trim() || !indivPointAmount || parseInt(indivPointAmount) === 0}
                                        className={`flex-1 py-4 rounded-2xl font-bold text-white shadow-lg transition-all ${(!indivPointReason.trim() || !indivPointAmount || parseInt(indivPointAmount) === 0) ? 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed' : 'bg-primary dark:bg-accent ring-4 ring-primary/10 hover:scale-105 active:scale-95'}`}
                                    >
                                        تأكيد الإضافة
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <SmartScanModal 
                isOpen={isSmartScanOpen}
                onClose={() => setIsSmartScanOpen(false)}
                currentSession={session}
                allStudents={allStudents}
                onApply={handleApplySmartScan}
                addToast={addToast}
            />
            </div>
        </motion.div>
    );
};

export default SessionForm;

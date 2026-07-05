import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    ArrowLeft, 
    CloudLightning,
    Clock, 
    CloudUpload, 
    CheckCircle2,
    Loader2,
    RefreshCw,
    ShieldCheck,
    Users,
    Database,
    AlertTriangle
} from 'lucide-react';
import { SyncJob } from '../types';

interface SyncEvent {
    id: string;
    timestamp: number;
    type: string;
    message: string;
    category: 'success' | 'info' | 'warning' | 'incoming';
}

interface SyncDiagnosticsProps {
    syncQueue: SyncJob[];
    isWorkerActive: boolean;
    currentlyUploadingItem: string | null;
    syncEvents: SyncEvent[];
    realTimeReceivedCount: number;
    lastSyncTimestamp: number | null;
    totalSynced: number;
    failedJobs: SyncJob[];
    onBack: () => void;
    onManualSync: () => Promise<void>;
    onRetryJob: (jobId: string) => Promise<boolean>;
    activeCircle?: any;
}

const pageVariants = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.3 } },
    exit: { opacity: 0, y: -10, transition: { duration: 0.2 } }
};

const QueueItemCard: React.FC<{
    job: SyncJob;
    onRetry: (jobId: string) => Promise<boolean>;
    isRetrying: boolean;
}> = ({ job, onRetry, isRetrying }) => {
    const timerRef = React.useRef<number | null>(null);
    const longPressFired = React.useRef(false);
    const [localRetrying, setLocalRetrying] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    const handlePointerDown = (e: React.PointerEvent) => {
        longPressFired.current = false;
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = window.setTimeout(async () => {
            longPressFired.current = true;
            timerRef.current = null;
            await triggerRetry();
        }, 800); // 800ms long press matching standard
    };

    const handlePointerUp = () => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
    };

    const handlePointerLeave = () => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
    };

    const triggerRetry = async () => {
        if (localRetrying || isRetrying) return;
        setLocalRetrying(true);
        const success = await onRetry(job.id);
        if (success) {
            setShowSuccess(true);
            setTimeout(() => {
                setShowSuccess(false);
                setLocalRetrying(false);
            }, 2000);
        } else {
            setLocalRetrying(false);
        }
    };

    const arabicCollection = {
        circles: 'بيانات الحلقة',
        students: 'طالب',
        sessions: 'جلسة',
        plans: 'خطة',
        tests: 'اختبار',
        activities: 'نشاط',
        announcements: 'إعلان',
        studentReports: 'تقرير طالب',
        supervisorReports: 'تقرير مشرف'
    }[job.collection] || job.collection;

    const itemName = job.data && (job.data.name || job.data.title || job.data.date || '');
    const label = itemName ? `${arabicCollection} (${itemName})` : arabicCollection;
    const isDelete = job.action === 'delete';

    return (
        <div
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerLeave}
            onPointerCancel={handlePointerLeave}
            className="flex items-center justify-between p-3 bg-gray-50/70 dark:bg-gray-800/40 hover:bg-gray-100/60 dark:hover:bg-gray-800/60 rounded-xl border border-gray-100 dark:border-gray-700/40 transition-all duration-200 select-none touch-none active:scale-99"
        >
            <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg ${isDelete ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-500'}`}>
                    <Clock className="w-3.5 h-3.5" />
                </div>
                <div className="text-right">
                    <span className="text-[11px] font-extrabold text-gray-700 dark:text-gray-300 block leading-tight">{label}</span>
                    <span className={`text-[8px] font-black px-1.5 py-0.2 rounded-full inline-block mt-0.5 ${isDelete ? 'bg-red-500/15 text-red-400' : 'bg-amber-500/15 text-amber-400'}`}>
                        {isDelete ? 'حذف' : 'إضافة/تعديل'}
                    </span>
                </div>
            </div>
            
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    triggerRetry();
                }}
                disabled={localRetrying || isRetrying}
                className={`p-1.5 px-2.5 rounded-lg border text-[10px] font-extrabold transition-all flex items-center gap-1 cursor-pointer ${
                    showSuccess 
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                    : localRetrying 
                    ? 'bg-gray-100 dark:bg-gray-800 border-gray-200 text-gray-400' 
                    : 'bg-white dark:bg-gray-700 hover:bg-primary/5 dark:hover:bg-accent/5 border-gray-200 dark:border-gray-600 text-primary dark:text-accent hover:border-primary/20'
                }`}
            >
                {localRetrying ? (
                    <Loader2 className="w-3 animate-spin" />
                ) : showSuccess ? (
                    <CheckCircle2 className="w-3 text-emerald-500" />
                ) : (
                    <RefreshCw className="w-3" />
                )}
                <span>{showSuccess ? 'تم' : localRetrying ? 'جاري...' : 'إعادة محاولة'}</span>
            </button>
        </div>
    );
};

const AnimatedNumber: React.FC<{ value: number | string; className?: string }> = ({ value, className }) => {
    return (
        <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
                key={value}
                initial={{ opacity: 0, y: -8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 500, damping: 24 }}
                className={`inline-block ${className}`}
            >
                {value}
            </motion.span>
        </AnimatePresence>
    );
};

const SyncDiagnostics: React.FC<SyncDiagnosticsProps> = ({
    syncQueue,
    isWorkerActive,
    currentlyUploadingItem,
    syncEvents,
    realTimeReceivedCount,
    lastSyncTimestamp,
    totalSynced,
    failedJobs,
    onBack,
    onManualSync,
    onRetryJob,
    activeCircle
}) => {
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncMessage, setSyncMessage] = useState<string | null>(null);

    // Reset scroll of parent main if possible
    useEffect(() => {
        const mainContentArea = document.querySelector('main');
        if (mainContentArea) {
            mainContentArea.scrollTop = 0;
        }
    }, []);

    const handleManualSyncClick = async () => {
        if (isSyncing) return;
        setIsSyncing(true);
        setSyncMessage('جاري مزامنة البيانات حالياً...');
        try {
            await onManualSync();
            setSyncMessage('اكتملت المزامنة بنجاح!');
            setTimeout(() => {
                setSyncMessage(null);
            }, 3000);
        } catch (error) {
            setSyncMessage('فشلت المزامنة، يرجى التحقق من اتصالك بالإنترنت');
            setTimeout(() => {
                setSyncMessage(null);
            }, 4000);
        } finally {
            setIsSyncing(false);
        }
    };

    // Mapping stats to requested short representations:
    const pendingCount = syncQueue.length;
    const uploadingStatus = currentlyUploadingItem ? 'جاري الرفع...' : (isWorkerActive ? 'نشط' : 'لا يوجد');
    const syncedCount = totalSynced;

    return (
        <motion.div 
            variants={pageVariants} 
            initial="initial" 
            animate="animate" 
            exit="exit"
            className="p-4 max-w-md mx-auto space-y-5 select-none flex flex-col h-full justify-center"
            dir="rtl"
        >
            {/* Simple Compact Header */}
            <div className="flex items-center gap-3 pb-3 border-b border-gray-100 dark:border-gray-800">
                <button 
                    onClick={onBack}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors text-gray-500 dark:text-gray-400"
                    title="رجوع"
                    id="sync-back-button"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="text-right">
                    <h2 className="text-base font-extrabold text-primary dark:text-accent">مزامنة البيانات</h2>
                    <p className="text-[11px] text-gray-400">تتبع مباشر وحالة مزامنة التطبيق مع السحابة</p>
                </div>
            </div>

            {/* Main Diagnostics Display - Exactly 3 Numbers */}
            <div className="grid grid-cols-1 gap-3">
                
                {/* 1. قيد الانتظار (Pending) */}
                <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-xs flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl">
                            <Clock className="w-5 h-5" />
                        </div>
                        <div className="text-right">
                            <span className="text-xs font-bold text-gray-400 block">قيد الانتظار</span>
                            <span className="text-[10px] text-gray-300">العمليات المتبقية للرفع</span>
                        </div>
                    </div>
                    <div className="flex items-baseline gap-1">
                        <AnimatedNumber value={pendingCount} className="text-2xl font-black text-amber-500 font-mono" />
                        <span className="text-xs text-gray-400">عملية</span>
                    </div>
                </div>

                {/* 2. يتم الرفع (Uploading) */}
                <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-xs flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-500/10 text-blue-500 rounded-xl">
                            <CloudUpload className="w-5 h-5" />
                        </div>
                        <div className="text-right">
                            <span className="text-xs font-bold text-gray-400 block">يتم الرفع</span>
                            <span className="text-[10px] text-gray-300">حالة عملية الإرسال الجارية</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {currentlyUploadingItem ? (
                            <div className="flex items-center gap-1.5 text-xs text-blue-500 font-bold bg-blue-500/10 px-2.5 py-1 rounded-full animate-pulse">
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>نشط الآن</span>
                            </div>
                        ) : (
                            <span className="text-sm font-black text-gray-500 dark:text-gray-400">{uploadingStatus}</span>
                        )}
                    </div>
                </div>

                {/* 3. تمت المزامنة (Synced) */}
                <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-xs flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
                            <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <div className="text-right">
                            <span className="text-xs font-bold text-gray-400 block">تمت المزامنة</span>
                            <span className="text-[10px] text-gray-300">إجمالي العمليات الناجحة حالياً</span>
                        </div>
                    </div>
                    <div className="flex items-baseline gap-1">
                        <AnimatedNumber value={syncedCount} className="text-2xl font-black text-emerald-500 font-mono" />
                        <span className="text-xs text-gray-400">عملية</span>
                    </div>
                </div>

            </div>

            {/* List of Pending/Stuck Items in Queue */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-xs space-y-3 flex flex-col min-h-0">
                <div className="flex items-center justify-between border-b border-gray-50 dark:border-gray-700/30 pb-2">
                    <span className="text-xs font-extrabold text-gray-500 dark:text-gray-400">قائمة الانتظار والمحاولات</span>
                    <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full font-mono">
                        {pendingCount} قيد الانتظار
                    </span>
                </div>
                
                {syncQueue.length === 0 ? (
                    <div className="text-center py-4 text-gray-300 dark:text-gray-500 flex flex-col items-center justify-center gap-1.5">
                        <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                        <span className="text-xs font-bold text-gray-500 dark:text-gray-400">كل البيانات متزامنة محلياً!</span>
                    </div>
                ) : (
                    <div className="space-y-2 overflow-y-auto max-h-[180px] pr-1">
                        {syncQueue.map(job => (
                            <QueueItemCard 
                                key={job.id} 
                                job={job} 
                                onRetry={onRetryJob} 
                                isRetrying={isSyncing} 
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Database & Teacher Permissions Section */}
            {activeCircle && (
                <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-xs space-y-3 flex flex-col min-h-0">
                    <div className="flex items-center justify-between border-b border-gray-50 dark:border-gray-700/30 pb-2">
                        <div className="flex items-center gap-1.5 text-primary dark:text-accent">
                            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-500" />
                            <span className="text-xs font-extrabold">صلاحيات المعلمين وقاعدة البيانات</span>
                        </div>
                        <span className="text-[9px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                            منظّم وآمن
                        </span>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-[11px] text-gray-400 bg-gray-50 dark:bg-gray-800/40 p-2.5 rounded-xl border border-gray-50 dark:border-gray-700/30">
                            <span className="font-bold">المشرفين والمعلمين المسجلين:</span>
                            <span className="font-extrabold text-gray-700 dark:text-gray-200">
                                {Object.keys(activeCircle.teachers || {}).length} أعضاء
                            </span>
                        </div>

                        <div className="space-y-1.5 overflow-y-auto max-h-[140px] pr-1">
                            {Object.entries(activeCircle.teachers || {}).map(([uid, t]: [string, any]) => {
                                const roleLabel = {
                                    owner: 'المالك / المنشئ',
                                    teacher: 'معلم معتمد',
                                    assistant: 'معلم مساعد',
                                    member: 'عضو حلقة'
                                }[t.role] || t.role;

                                const accessLabel = t.accessLevel === 'full' ? 'صلاحيات كاملة' : 'صلاحيات قياسية';
                                const isSuspended = t.status === 'suspended';

                                return (
                                    <div key={uid} className="flex items-center justify-between p-2 bg-gray-50/50 dark:bg-gray-800/20 rounded-xl border border-gray-100 dark:border-gray-700/40">
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                            <div className="text-right">
                                                <span className="text-[10px] font-bold text-gray-800 dark:text-gray-200 block">{t.name}</span>
                                                <span className="text-[8px] text-gray-400 font-semibold">{roleLabel} • {accessLabel}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${
                                                isSuspended 
                                                ? 'bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400' 
                                                : t.status === 'pending' 
                                                ? 'bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400' 
                                                : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
                                            }`}>
                                                {isSuspended ? 'موقوف' : t.status === 'pending' ? 'قيد الانتظار' : 'نشط'}
                                            </span>
                                            <span className="text-[8px] font-bold text-emerald-600 bg-emerald-500/15 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                                                <span>✓</span>
                                                <span>متزامن</span>
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Beautiful Large Manual Sync Button */}
            <div className="pt-2">
                <button
                    onClick={handleManualSyncClick}
                    disabled={isSyncing}
                    className={`w-full py-4 px-6 rounded-2xl font-extrabold text-sm flex items-center justify-center gap-2.5 shadow-md transition-all active:scale-98 ${
                        isSyncing 
                        ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed border border-gray-200 dark:border-gray-600' 
                        : 'bg-primary dark:bg-accent text-white hover:opacity-95'
                    }`}
                >
                    {isSyncing ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        <RefreshCw className="w-5 h-5" />
                    )}
                    <span>{isSyncing ? 'جاري بدء المزامنة اليدوية...' : 'مزامنة البيانات الآن يدويًا'}</span>
                </button>
                
                <AnimatePresence>
                    {syncMessage && (
                        <motion.p 
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            className={`text-center text-xs mt-3 font-semibold ${
                                syncMessage.includes('فشلت') ? 'text-red-500' : 'text-emerald-500 animate-pulse'
                            }`}
                        >
                            {syncMessage}
                        </motion.p>
                    )}
                </AnimatePresence>
            </div>

            {/* Subtle Footer Disclaimer */}
            <div className="text-center pt-2">
                <span className="text-[10px] text-gray-400 bg-gray-50 dark:bg-gray-800/40 px-3 py-1 rounded-full border border-gray-100 dark:border-gray-800/40 font-mono inline-block">
                    ⚡ تحديث ومزامنة تلقائية ذكية (Delta Sync)
                </span>
            </div>
        </motion.div>
    );
};

export default SyncDiagnostics;

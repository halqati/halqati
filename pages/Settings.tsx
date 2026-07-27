import React, { useState, useRef } from 'react';
import { CircleData, ConfirmationModalData, UserProfile } from '../types';
import { 
    FaInfoCircle, FaWhatsapp, FaTrash, FaChevronLeft, FaWrench, 
    FaUserCircle, FaClipboardList, FaSave, FaTelegram, FaUsers, 
    FaGlobe, FaSignInAlt, FaSignOutAlt, FaUser, FaUserShield, 
    FaBookOpen, FaExclamationTriangle, FaAward, FaChalkboardTeacher,
    FaYoutube, FaCode, FaExternalLinkAlt, FaTimes, FaLightbulb, FaCommentDots
} from 'react-icons/fa';
import { User } from '../firebase';

interface SettingsProps {
    data: CircleData;
    allCircles: CircleData[];
    user: User | null;
    userProfile: UserProfile | null;
    isSynced: boolean;
    isOnline: boolean;
    onLogin: () => void;
    onLogout: () => void;
    onToggleAdminMode: (isAdmin: boolean) => void;
    onOpenAddonsModal: () => void;
    onNavigateToAbout: () => void;
    onNavigateToSupport: () => void;
    onNavigateToProfile: () => void;
    onNavigateToTestsAndPlans: () => void;
    onNavigateToCircleInfo: () => void;
    onNavigateToFeedback?: () => void;
    hasUnreadFeedbackReply?: boolean;
    onSwitchCircle: (id: string) => void;
    onCreateNewCircle: () => void;
    onDeleteCircle: (id: string) => void;
    onOpenBackupRestore: () => void;
    onJoinCommunity: (link: string) => void;
    setConfirmationModal: (data: Omit<ConfirmationModalData, 'isOpen'> & { isOpen: boolean }) => void;
    onManualSync: () => void;
    onLinkCircles: () => void;
    onNavigateToSyncDiagnostics?: () => void;
    hasCircleSettingsPermission?: boolean;
    addToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const SettingCard: React.FC<{ title: string, children: React.ReactNode, icon?: React.ElementType }> = ({ title, children, icon: Icon }) => (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="px-4 py-2.5 border-b border-gray-50 dark:border-gray-700 flex items-center gap-2 bg-gray-50/30 dark:bg-gray-900/10">
            {Icon && <Icon className="text-primary dark:text-accent opacity-70" size={14} />}
            <h2 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{title}</h2>
        </div>
        <div className="p-2.5 space-y-1.5">{children}</div>
    </div>
);

const SettingButton: React.FC<{ label: string, icon: React.ElementType, onClick: () => void, variant?: 'default' | 'danger', disabled?: boolean, hasNotification?: boolean }> = ({ label, icon: Icon, onClick, variant = 'default', disabled = false, hasNotification = false }) => (
     <button 
        onClick={onClick} 
        className={`w-full text-right p-2.5 rounded-lg flex items-center justify-between transition-all group cursor-pointer ${
            disabled 
            ? 'opacity-60 bg-gray-50/50 dark:bg-gray-700/10'
            : variant === 'danger' 
            ? 'bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20' 
            : 'bg-gray-50 dark:bg-gray-700/30 hover:bg-gray-100 dark:hover:bg-gray-700'
        }`}
    >
        <div className="flex items-center gap-3">
            <div className={`p-1 rounded-md ${
                variant === 'danger' 
                ? 'text-red-500' 
                : 'text-gray-400 dark:text-gray-500'
            }`}>
                <Icon size={14} />
            </div>
            <span className={`text-sm font-bold ${variant === 'danger' ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-200'}`}>{label}</span>
            {hasNotification && (
                <span className="bg-red-500 text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full animate-pulse mr-2">
                    رد جديد
                </span>
            )}
        </div>
        {!disabled && <FaChevronLeft size={10} className={`text-gray-300 dark:text-gray-600 transition-transform group-hover:-translate-x-1`} />}
    </button>
);


const Settings: React.FC<SettingsProps> = ({ data, allCircles, user, userProfile, isSynced, isOnline, onLogin, onLogout, onToggleAdminMode, onOpenAddonsModal, onNavigateToAbout, onNavigateToSupport, onNavigateToProfile, onNavigateToTestsAndPlans, onNavigateToCircleInfo, onNavigateToFeedback, hasUnreadFeedbackReply, onSwitchCircle, onCreateNewCircle, onDeleteCircle, onOpenBackupRestore, onJoinCommunity, setConfirmationModal, onManualSync, onLinkCircles, onNavigateToSyncDiagnostics, hasCircleSettingsPermission = true, addToast }) => {
    if (!data) return null;

    const [showChannelsModal, setShowChannelsModal] = useState(false);
    const syncTimerRef = useRef<number | null>(null);
    const syncLongPressFired = useRef(false);
    const touchStartPos = useRef<{ x: number, y: number } | null>(null);

    const handleSyncPointerDown = (e: React.PointerEvent) => {
        syncLongPressFired.current = false;
        
        if (syncTimerRef.current) {
            clearTimeout(syncTimerRef.current);
        }
        
        touchStartPos.current = {
            x: e.clientX,
            y: e.clientY
        };

        syncTimerRef.current = window.setTimeout(() => {
            if (onNavigateToSyncDiagnostics) {
                onNavigateToSyncDiagnostics();
                syncLongPressFired.current = true;
                syncTimerRef.current = null;
            }
        }, 2000); // 2000ms (2 seconds) exactly as requested
    };

    const handleSyncPointerUp = (e: React.PointerEvent) => {
        if (syncTimerRef.current) {
            clearTimeout(syncTimerRef.current);
            syncTimerRef.current = null;
        }
        if (!syncLongPressFired.current) {
            if (isOnline) {
                onManualSync();
            }
        }
        syncLongPressFired.current = false;
        touchStartPos.current = null;
    };

    const handleSyncPointerMove = (e: React.PointerEvent) => {
        if (!touchStartPos.current || !syncTimerRef.current) return;
        const dx = e.clientX - touchStartPos.current.x;
        const dy = e.clientY - touchStartPos.current.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        // Only cancel if they dragged more than 20 pixels
        if (dist > 20) {
            if (syncTimerRef.current) {
                clearTimeout(syncTimerRef.current);
                syncTimerRef.current = null;
            }
        }
    };

    const handleSyncPointerLeave = () => {
        if (syncTimerRef.current) {
            clearTimeout(syncTimerRef.current);
            syncTimerRef.current = null;
        }
        syncLongPressFired.current = false;
        touchStartPos.current = null;
    };
    
    const isAdmin = userProfile?.role === 'admin' || userProfile?.role === 'superadmin';
    const isOwner = data.ownerId === user?.uid;
    const teacher = data.teachers?.[user?.uid || ''];
    const isFullAccess = teacher?.accessLevel === 'full';
    const hasFullManagement = isOwner || isFullAccess;
    const hasUnlinkedCircles = allCircles.some(c => !c.authorizedUserIds || c.authorizedUserIds.length === 0);
    const whatsappLink = "https://chat.whatsapp.com/H6cCssqCUsIIbWjICk6YDK";
    const telegramLink = "https://t.me/nur_alquran_q";
    const websiteLink = "https://abode2050.github.io/halaqti/"; 

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center px-1">
                <h1 className="text-xl font-bold text-primary dark:text-accent">الإعدادات</h1>
                <button 
                    onPointerDown={handleSyncPointerDown}
                    onPointerUp={handleSyncPointerUp}
                    onPointerMove={handleSyncPointerMove}
                    onPointerLeave={handleSyncPointerLeave}
                    onPointerCancel={handleSyncPointerLeave}
                    onContextMenu={(e) => e.preventDefault()}
                    disabled={false}
                    className={`flex items-center gap-2 px-2.5 py-1 rounded-full border text-[9px] font-bold transition-all active:scale-95 touch-none select-none cursor-pointer ${
                    !isOnline 
                    ? 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700' 
                    : isSynced 
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-900/40 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30' 
                    : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-100 dark:border-yellow-900/40 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-100 dark:hover:bg-yellow-900/30'
                }`}>
                    {!isOnline ? (
                        <>
                            <span>بانتظار الاتصال بالإنترنت</span>
                            <div className="w-1 h-1 bg-gray-400 rounded-full animate-pulse"></div>
                        </>
                    ) : isSynced ? (
                        <>
                            <span>مزامنة مكتملة</span>
                            <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse"></div>
                        </>
                    ) : (
                        <>
                            <span>جاري المزامنة</span>
                            <div className="w-1 h-1 bg-yellow-500 rounded-full animate-bounce"></div>
                        </>
                    )}
                </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                    <SettingCard title="حساب المستخدم" icon={FaUserCircle}>
                        {user ? (
                            <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/30 p-2 rounded-xl border border-gray-100 dark:border-gray-700">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="relative flex-shrink-0">
                                        {user.photoURL ? (
                                            <img src={user.photoURL} alt="user" className="w-8 h-8 rounded-lg object-cover border border-white dark:border-gray-700 shadow-sm" />
                                        ) : (
                                            <div className="w-8 h-8 bg-white dark:bg-gray-700 rounded-lg flex items-center justify-center border border-white dark:border-gray-700 shadow-sm">
                                                <FaUser className="text-primary dark:text-accent text-xs" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="font-bold text-xs text-gray-800 dark:text-gray-100 truncate">{userProfile?.displayName || user.displayName || user.email?.split('@')[0]}</p>
                                            <button 
                                                onClick={onNavigateToProfile}
                                                className="p-1 px-2 bg-gray-100 dark:bg-gray-700/50 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-400 hover:text-primary rounded-md transition-all active:scale-95"
                                                title="إعدادات الحساب"
                                            >
                                                <FaWrench size={9} />
                                            </button>
                                        </div>
                                        <p className="text-[9px] text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={onLogout}
                                    className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all active:scale-90 flex-shrink-0"
                                    title="تسجيل الخروج"
                                >
                                    <FaSignOutAlt size={16} />
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {allCircles.length > 0 && isOnline && (
                                    <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-100 dark:border-yellow-900/20 p-2.5 rounded-xl flex items-start gap-2 mb-1">
                                        <FaExclamationTriangle className="text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" size={12} />
                                        <p className="text-[10px] text-yellow-700 dark:text-yellow-300 leading-relaxed font-medium">
                                            لديك بيانات محلية غير مربوطة بحساب. قم بتسجيل الدخول لحماية بياناتك من المسح ومزامنتها سحابياً.
                                        </p>
                                    </div>
                                )}
                                <button 
                                    onClick={hasUnlinkedCircles ? onLinkCircles : onLogin}
                                    disabled={!isOnline}
                                    className={`w-full flex items-center justify-between p-2.5 rounded-xl border hover:opacity-90 transition-all group shadow-sm ${
                                        !isOnline
                                        ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                                        : hasUnlinkedCircles 
                                        ? 'bg-amber-500 border-amber-600 shadow-amber-200 text-white' 
                                        : 'bg-primary dark:bg-accent border-primary/20 dark:border-accent/20 shadow-primary/20 text-white'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-1 bg-white/20 rounded-lg text-white">
                                            <FaSignInAlt size={14} />
                                        </div>
                                        <span className="text-xs font-bold text-white">
                                            {hasUnlinkedCircles ? 'ربط الحلقات الحالية بحساب' : 'ربط الحلقات بحساب / تسجيل الدخول'}
                                        </span>
                                    </div>
                                    <FaChevronLeft size={10} className="text-white/70 group-hover:-translate-x-1 transition-transform" />
                                </button>
                            </div>
                        )}
                    </SettingCard>

                    <SettingCard title="الإعدادات الرئيسية" icon={FaWrench}>
                        {isAdmin && (
                            <button 
                                onClick={() => onToggleAdminMode(true)}
                                className="w-full flex items-center justify-between bg-accent/10 p-2.5 rounded-xl border border-accent/20 hover:bg-accent/20 transition-all group mb-2 cursor-pointer"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-1 bg-accent rounded-lg text-white">
                                        <FaUserShield size={14} />
                                    </div>
                                    <span className="text-xs font-bold text-accent">واجهة الإدارة (مدير المركز)</span>
                                </div>
                                <FaChevronLeft size={10} className="text-accent group-hover:-translate-x-1 transition-transform" />
                            </button>
                        )}
                        <SettingButton 
                            label="بيانات الحلقة" 
                            icon={FaBookOpen} 
                            onClick={() => {
                                if (!hasCircleSettingsPermission) {
                                    addToast?.("عذراً، لا تمتلك الصلاحية الكافية للدخول إلى بيانات الحلقة.", "error");
                                } else {
                                    onNavigateToCircleInfo();
                                }
                            }} 
                            disabled={!hasCircleSettingsPermission}
                        />
                        <SettingButton label="الإضافات والمظهر" icon={FaWrench} onClick={onOpenAddonsModal} />
                    </SettingCard>
                </div>

                <div className="space-y-4">
                    <SettingCard title="إدارة الحلقات" icon={FaUsers}>
                        <div className="space-y-1.5">
                            {allCircles.map(circle => (
                                <div 
                                    key={circle.id} 
                                    className={`flex items-center justify-between p-2 rounded-lg border transition-all ${
                                        circle.id === data.id 
                                        ? 'bg-primary/5 border-primary/20 dark:bg-accent/5 dark:border-accent/20' 
                                        : 'bg-gray-50 dark:bg-gray-700/20 border-transparent'
                                    }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <div className={`w-1 h-1 rounded-full ${circle.id === data.id ? 'bg-primary dark:bg-accent' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
                                        <span className={`text-xs font-bold ${circle.id === data.id ? 'text-primary dark:text-accent' : 'text-gray-700 dark:text-gray-200'}`}>{circle.circle}</span>
                                        {/* Role Indicators */}
                                        {circle.ownerId === user?.uid ? (
                                            <FaUserShield size={10} className="text-amber-500" title="أنت منشئ هذه الحلقة" />
                                        ) : circle.authorizedUserIds?.includes(user?.uid || '') ? (
                                            <FaChalkboardTeacher size={10} className="text-blue-500" title="أنت معلم في هذه الحلقة" />
                                        ) : null}
                                    </div>
                                    <div className="flex items-center gap-2">
                                    {circle.id !== data.id ? (
                                        <button 
                                            onClick={() => onSwitchCircle(circle.id)} 
                                            className="text-[9px] px-2 py-0.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-md shadow-sm border border-gray-200 dark:border-gray-600 font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                                        >
                                            تفعيل
                                        </button>
                                    ) : (
                                        <span className="text-[9px] px-1.5 py-0.5 bg-primary/10 dark:bg-accent/10 text-primary dark:text-accent rounded-md font-bold">الحالية</span>
                                    )}
                                    {allCircles.length > 1 && (
                                        <button 
                                            onClick={() => {
                                                if (!hasCircleSettingsPermission) {
                                                    addToast?.("عذراً، لا تمتلك الصلاحية الكافية لحذف هذه الحلقة.", "error");
                                                } else {
                                                    onDeleteCircle(circle.id);
                                                }
                                            }} 
                                            className={`p-1 text-gray-400 hover:text-red-500 transition-colors cursor-pointer ${!hasCircleSettingsPermission ? 'opacity-50' : ''}`}
                                        >
                                            <FaTrash size={10} />
                                        </button>
                                    )}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button 
                            onClick={() => {
                                if (!hasCircleSettingsPermission) {
                                    addToast?.("عذراً، لا تمتلك الصلاحية الكافية لإنشاء حلقة جديدة.", "error");
                                } else {
                                    onCreateNewCircle();
                                }
                            }} 
                            className={`w-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 p-1.5 rounded-lg font-bold mt-1 text-[10px] transition-all active:scale-[0.98] cursor-pointer ${!hasCircleSettingsPermission ? 'opacity-60' : ''}`}
                        >
                            + إنشاء حلقة جديدة
                        </button>
                    </SettingCard>

                    <SettingCard title="التواصل والتطوير" icon={FaLightbulb}>
                        <SettingButton 
                            label="اقتراحات وملاحظات" 
                            icon={FaCommentDots} 
                            onClick={() => onNavigateToFeedback?.()} 
                            hasNotification={hasUnreadFeedbackReply}
                        />
                    </SettingCard>

                    <SettingCard title="البيانات" icon={FaSave}>
                        <SettingButton 
                            label="النسخة الاحتياطية والاستعادة" 
                            icon={FaSave} 
                            onClick={() => {
                                if (!hasCircleSettingsPermission) {
                                    addToast?.("عذراً، لا تمتلك الصلاحية الكافية للوصول إلى النسخ الاحتياطي والاستعادة.", "error");
                                } else {
                                    onOpenBackupRestore();
                                }
                            }} 
                            disabled={!hasCircleSettingsPermission}
                        />
                    </SettingCard>

                    {/* ثالثًا: موقع نظام حلقتي */}
                    <a 
                        href="https://hlqt.vercel.app/" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-xl shadow-xs border border-primary/20 dark:border-accent/20 text-primary dark:text-accent hover:bg-primary/5 dark:hover:bg-accent/5 transition-all text-xs font-bold group cursor-pointer"
                    >
                        <div className="flex items-center gap-2.5">
                            <div className="p-1.5 bg-primary/10 dark:bg-accent/10 rounded-lg">
                                <FaGlobe size={14} />
                            </div>
                            <span>موقع نظام حلقتي</span>
                        </div>
                        <FaExternalLinkAlt size={11} className="opacity-60 group-hover:translate-x-[-2px] transition-transform" />
                    </a>

                    {/* أولًا: الدعم والمجتمع */}
                    <SettingCard title="الدعم والمجتمع" icon={FaUsers}>
                        <SettingButton label="الانتساب والدعم" icon={FaAward} onClick={onNavigateToSupport} />
                        <SettingButton label="حول التطبيق" icon={FaInfoCircle} onClick={onNavigateToAbout} />
                        <div className="grid grid-cols-2 gap-2">
                            <a href="https://wa.me/779516077" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 p-2 bg-green-50 dark:bg-green-900/10 text-green-600 dark:text-green-400 rounded-lg border border-green-100 dark:border-green-900/20 text-[10px] font-bold hover:bg-green-100 dark:hover:bg-green-900/20 transition-all">
                                <FaWhatsapp size={12} /> الإبلاغ عن مشكلة
                            </a>
                            <a href={websiteLink} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 p-2 bg-blue-50 dark:bg-blue-900/10 text-blue-600 dark:text-blue-400 rounded-lg border border-blue-100 dark:border-blue-900/20 text-[10px] font-bold hover:bg-blue-100 dark:hover:bg-blue-900/20 transition-all">
                                <FaGlobe size={12} /> الموقع الإلكتروني
                            </a>
                        </div>
                        
                        {/* زر متابعة القنوات */}
                        <button 
                            onClick={() => setShowChannelsModal(true)} 
                            className="w-full mt-2 p-2.5 bg-primary/10 dark:bg-accent/10 border border-primary/20 dark:border-accent/20 text-primary dark:text-accent rounded-lg flex items-center justify-center gap-2 text-xs font-bold hover:bg-primary/15 dark:hover:bg-accent/15 transition-all cursor-pointer shadow-xs active:scale-[0.98]"
                        >
                            <FaGlobe size={14} /> متابعة القنوات
                        </button>
                    </SettingCard>

                    {/* ثانيًا: التواصل مع المطور */}
                    <div className="pt-1">
                        <a 
                            href="https://Athar.Q1.vercel.app/" 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="w-full flex items-center justify-center gap-2 p-3 bg-gradient-to-r from-gray-800 to-gray-900 dark:from-gray-700 dark:to-gray-800 text-white rounded-xl shadow-xs text-xs font-bold hover:opacity-95 transition-all active:scale-[0.99] cursor-pointer"
                        >
                            <FaCode size={14} className="text-amber-400" />
                            <span>التواصل مع المطور</span>
                            <FaExternalLinkAlt size={10} className="opacity-70 mr-1" />
                        </a>
                    </div>
                </div>
            </div>

            {/* نافذة منبثقة لمتابعة القنوات */}
            {showChannelsModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 w-full max-w-sm shadow-2xl border border-gray-100 dark:border-gray-700 space-y-4 text-right">
                        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-3">
                            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                                <FaGlobe className="text-primary dark:text-accent" size={15} />
                                متابعة القنوات
                            </h3>
                            <button 
                                onClick={() => setShowChannelsModal(false)}
                                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                aria-label="إغلاق"
                            >
                                <FaTimes size={14} />
                            </button>
                        </div>

                        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                            اختر القناة المفضل لديك لمتابعة أحدث الإعلانات والتحديثات:
                        </p>

                        <div className="space-y-2.5 pt-1">
                            {/* 1 - قناة اليوتيوب */}
                            <a 
                                href="https://youtube.com/@athar.q1?si=r1QRtk7A3BniBxRx" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="w-full flex items-center justify-between p-3 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-xl border border-red-100 dark:border-red-900/30 text-xs font-bold hover:bg-red-100 dark:hover:bg-red-900/30 transition-all group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-red-600 text-white rounded-lg shadow-xs">
                                        <FaYoutube size={16} />
                                    </div>
                                    <span>قناة اليوتيوب</span>
                                </div>
                                <FaExternalLinkAlt size={11} className="opacity-60 group-hover:translate-x-[-2px] transition-transform" />
                            </a>

                            {/* 2 - قناة الواتساب */}
                            <a 
                                href="https://whatsapp.com/channel/0029VbDEhFYJENy6EwuRY440" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="w-full flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400 rounded-xl border border-green-100 dark:border-green-900/30 text-xs font-bold hover:bg-green-100 dark:hover:bg-green-900/30 transition-all group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-green-600 text-white rounded-lg shadow-xs">
                                        <FaWhatsapp size={16} />
                                    </div>
                                    <span>قناة الواتساب</span>
                                </div>
                                <FaExternalLinkAlt size={11} className="opacity-60 group-hover:translate-x-[-2px] transition-transform" />
                            </a>

                            {/* 3 - قناة التليجرام */}
                            <a 
                                href="https://t.me/nur_alquran_q" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="w-full flex items-center justify-between p-3 bg-sky-50 dark:bg-sky-950/20 text-sky-600 dark:text-sky-400 rounded-xl border border-sky-100 dark:border-sky-900/30 text-xs font-bold hover:bg-sky-100 dark:hover:bg-sky-900/30 transition-all group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-sky-500 text-white rounded-lg shadow-xs">
                                        <FaTelegram size={16} />
                                    </div>
                                    <span>قناة التليجرام</span>
                                </div>
                                <FaExternalLinkAlt size={11} className="opacity-60 group-hover:translate-x-[-2px] transition-transform" />
                            </a>
                        </div>

                        <button 
                            onClick={() => setShowChannelsModal(false)}
                            className="w-full py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors mt-2"
                        >
                            إغلاق
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Settings;

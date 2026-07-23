
import React, { useRef } from 'react';
import { CircleData } from '../types';
import { FaBookOpen, FaArrowsAltH, FaSignInAlt, FaSignOutAlt, FaUserCircle, FaCloud, FaSync, FaCog, FaBell } from 'react-icons/fa';
import { User } from '../firebase';

import { motion, AnimatePresence } from 'framer-motion';

interface HeaderProps {
    data: CircleData;
    allCircles: CircleData[];
    user: User | null;
    currentUserId: string;
    onLogin: () => void;
    onLogout: () => void;
    onNavigateToAccountSettings: () => void;
    onMarkAsRead: (ids: string[]) => void;
    onQuickSwitch: () => void;
    onOpenQuickSwitchSelector: () => void;
    onNavigateToAnnouncements: () => void;
    isSynced: boolean;
    isOnline: boolean;
    onManualSync: () => void;
    onNavigateToSyncDiagnostics?: () => void;
}

const CircleNavigator: React.FC<Pick<HeaderProps, 'allCircles' | 'onQuickSwitch' | 'onOpenQuickSwitchSelector'> & { size?: number }> = ({ allCircles, onQuickSwitch, onOpenQuickSwitchSelector, size = 20 }) => {
    const timerRef = useRef<number | null>(null);
    const longPressFired = useRef(false);

    if (allCircles.length < 2) {
        return null;
    }

    const handlePointerDown = () => {
        longPressFired.current = false;
        if (allCircles.length > 2) { // Long press only for 3+ circles
            timerRef.current = window.setTimeout(() => {
                onOpenQuickSwitchSelector();
                longPressFired.current = true;
                timerRef.current = null; // Mark as fired
            }, 700);
        }
    };

    const handlePointerUp = () => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }
        if (!longPressFired.current) {
            onQuickSwitch();
        }
    };

    return (
        <button
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerLeave={() => { if (timerRef.current) clearTimeout(timerRef.current); }}
            className="p-1.5 text-white/50 hover:text-white transition-colors"
            aria-label="التنقل السريع بين الحلقات"
            title={allCircles.length > 2 ? "اضغط للتنقل، اضغط مطولاً للتخصيص" : "التنقل للحلقة الأخرى"}
        >
            <FaArrowsAltH size={size} />
        </button>
    );
};


const Header: React.FC<HeaderProps> = ({ data, allCircles, user, currentUserId, onLogin, onLogout, onNavigateToAccountSettings, onMarkAsRead, onQuickSwitch, onOpenQuickSwitchSelector, onNavigateToAnnouncements, isSynced, isOnline, onManualSync, onNavigateToSyncDiagnostics }) => {
    if (!data) return null;
    
    const [shouldShake, setShouldShake] = React.useState(false);
    const prevCountRef = React.useRef(0);

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
        // Always reset on finger release so state doesn't get stuck
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

    const systemNotifications = (data.notifications || []).filter(n => 
        n.category === 'system' || 
        n.category === 'management' || 
        n.metadata?.actionType === 'join_request' ||
        n.id.startsWith('status_') || 
        n.id.startsWith('level_') || 
        n.id.startsWith('approved_') ||
        n.id.startsWith('approval_')
    );

    const unreadNotifications = systemNotifications.filter(n => 
        !(data.dismissedNotificationIds || []).includes(n.id) && 
        !n.readBy?.includes(currentUserId)
    );
    const unreadCount = unreadNotifications.length;

    React.useEffect(() => {
        if (unreadCount > prevCountRef.current) {
            setShouldShake(true);
            const timer = setTimeout(() => setShouldShake(false), 2000); // Shake for 2s
            return () => clearTimeout(timer);
        }
        prevCountRef.current = unreadCount;
    }, [unreadCount]);

    return (
        <header className="relative bg-primary dark:bg-gray-800 text-white shadow-md z-30">
            <div className="max-w-6xl mx-auto p-3 flex items-center justify-between w-full relative group">
                {/* Right: Identity (Starting from Right in RTL) */}
                <div className="flex items-center gap-3 flex-grow overflow-hidden">
                    {data.logo ? (
                        <img src={data.logo} alt="logo" className="w-10 h-10 rounded-full border-2 border-accent/30 object-cover flex-shrink-0 shadow-sm" />
                    ) : (
                        <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center bg-white/10 rounded-xl">
                            <FaBookOpen className="text-white dark:text-accent text-2xl" />
                        </div>
                    )}
                    <div className="text-right overflow-hidden">
                         <h1 className="text-sm font-black truncate leading-tight tracking-tight">{data.circle}</h1>
                         <div className="flex items-center gap-2">
                            <p className="text-[10px] opacity-75 truncate font-medium">إشراف: {data.teacher}</p>
                            {user && (
                                <button 
                                    onPointerDown={handleSyncPointerDown}
                                    onPointerUp={handleSyncPointerUp}
                                    onPointerMove={handleSyncPointerMove}
                                    onPointerLeave={handleSyncPointerLeave}
                                    onPointerCancel={handleSyncPointerLeave}
                                    onContextMenu={(e) => e.preventDefault()}
                                    className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-black transition-all active:scale-90 touch-none select-none cursor-pointer ${
                                        !isOnline ? 'bg-gray-500/20 text-gray-400 hover:bg-gray-500/30' :
                                        isSynced ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30' : 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
                                    }`}
                                    title={!isOnline ? "غير متصل (اضغط مطولاً لتتبع نشاط المزامنة)" : "اضغط للمزامنة، اضغط مطولاً لتتبع النشاط"}
                                    disabled={false}
                                >
                                    {!isOnline ? <FaCloud size={8} className="opacity-50" /> : isSynced ? <FaCloud size={8} /> : <FaSync className="animate-spin" size={7} />}
                                    <span>{!isOnline ? 'محلي' : isSynced ? 'سحابي' : 'مزامنة'}</span>
                                </button>
                            )}
                         </div>
                    </div>
                </div>

                {/* Left: Actions and Profile */}
                <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Action Pill Group */}
                    <div className="flex items-center bg-white/5 dark:bg-black/20 rounded-full p-0.5 border border-white/10 shadow-inner">
                        {/* Notification Bell */}
                        <button
                            onClick={onNavigateToAnnouncements}
                            className="p-1.5 text-white/50 hover:text-white transition-all active:scale-95 relative"
                            title="التنبيهات العامة"
                        >
                            <motion.div
                                animate={shouldShake ? {
                                    rotate: [0, -20, 20, -20, 20, 0],
                                } : {}}
                                transition={{
                                    duration: 0.5,
                                    repeat: 3,
                                    ease: "easeInOut"
                                }}
                            >
                                <FaBell size={18} />
                            </motion.div>
                            {unreadCount > 0 && (
                                <span className="absolute top-1 right-1 bg-red-600 text-white text-[7px] font-black w-3.5 h-3.5 flex items-center justify-center rounded-full border border-primary dark:border-gray-800 shadow-sm z-10">
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </span>
                            )}
                        </button>

                        <div className="w-[1px] h-3 bg-white/10 mx-0.5" />

                        {/* Switch Circles */}
                        <CircleNavigator allCircles={allCircles} onQuickSwitch={onQuickSwitch} onOpenQuickSwitchSelector={onOpenQuickSwitchSelector} size={18} />
                    </div>

                    {/* Profile Section */}
                    {user ? (
                        <button 
                            type="button"
                            onClick={onNavigateToAccountSettings}
                            className="flex items-center gap-2 mr-1 p-1 rounded-full hover:bg-white/10 active:scale-95 transition-all text-right cursor-pointer group"
                            title="إعدادات الحساب"
                        >
                            <div className="text-left hidden md:block">
                                <p className="text-[9px] opacity-70 leading-none">مرحباً</p>
                                <p className="text-[10px] font-black truncate max-w-[60px] tracking-tight">{user.displayName?.split(' ')[0]}</p>
                            </div>
                            {user.photoURL ? (
                                <img src={user.photoURL} alt="user" className="w-8 h-8 rounded-full border border-white/20 shadow-sm object-cover group-hover:scale-105 transition-transform" />
                            ) : (
                                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center border border-white/10 shadow-sm group-hover:scale-105 transition-transform">
                                    <FaUserCircle size={18} className="text-white/70" />
                                </div>
                            )}
                        </button>
                    ) : (
                        <button 
                            onClick={onLogin}
                            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-xl transition-all active:scale-95 text-xs font-black mr-1"
                            title="تسجيل الدخول"
                        >
                            <FaSignInAlt size={14} />
                            <span className="hidden xs:inline">دخول</span>
                        </button>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Header;

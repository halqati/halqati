
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    LayoutGrid,
    ScrollText,
    Users, 
    Building2, 
    Shield, 
    Search,
    UserCheck,
    XCircle,
    History,
    Activity,
    LogOut,
    Eye,
    EyeOff,
    MoreVertical,
    BarChart3,
    Box,
    Clock,
    Lock,
    Unlock,
    Mail,
    RefreshCw,
    AlertCircle,
    ChevronLeft,
    Database,
    Zap,
    TrendingUp,
    LayoutDashboard,
    Settings,
    HardDrive,
    Info,
    Key,
    UserPlus,
    CircleDashed,
    Cpu,
    ExternalLink,
    AlertTriangle,
    Save,
    MapPin,
    Hash,
    MessageSquare,
    Bell,
    Megaphone,
    Upload,
    ToggleLeft,
    ToggleRight,
    ArrowLeft,
    ChevronRight,
    CheckCircle2
} from 'lucide-react';
import { db, collection, query, onSnapshot, doc, updateDoc, getDocs, getDoc, setDoc, deleteDoc, orderBy, limit, serverTimestamp } from '../firebase';
import { Management, AuditLog, UserProfile, CircleData, Student, SystemSettings, AppUpdateNotification } from '../types';

interface DeveloperDashboardProps {
    userProfile: UserProfile;
    addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
    onLogout: () => void;
}

type TabType = 'overview' | 'users' | 'circles' | 'managements' | 'logs' | 'stats' | 'settings' | 'notifications';

const DeveloperDashboard: React.FC<DeveloperDashboardProps> = ({ userProfile, addToast, onLogout }) => {
    const [managements, setManagements] = useState<Management[]>([]);
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [circles, setCircles] = useState<CircleData[]>([]);
    const [allLogs, setAllLogs] = useState<AuditLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<TabType>('overview');
    const [searchQuery, setSearchQuery] = useState('');
    const [showPasswords, setShowPasswords] = useState<{[key: string]: boolean}>({});
    
    // User Details Sub-view
    const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
    const [userCircles, setUserCircles] = useState<CircleData[]>([]);

    // System Settings
    const [systemSettings, setSystemSettings] = useState<SystemSettings>({
        registrationOpen: true,
        emergencyMode: false
    });

    // Notification State
    const [newNotification, setNewNotification] = useState({
        text: '',
        isMandatory: false,
        version: '1.0.0',
        link: '',
        type: 'general' as 'general' | 'update'
    });

    // Developer Name (Hardcoded as requested)
    const developerName = "عبدالله مبارك المخلافي";

    useEffect(() => {
        const unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
            setUsers(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile)));
        });

        const unsubscribeCircles = onSnapshot(collection(db, 'circles'), (snapshot) => {
            setCircles(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CircleData)));
        });

        const unsubscribeManagements = onSnapshot(collection(db, 'managements'), (snapshot) => {
            setManagements(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Management)));
            setIsLoading(false);
        });

        const qLogs = query(collection(db, 'auditLogs'), orderBy('createdAt', 'desc'), limit(50));
        const unsubscribeLogs = onSnapshot(qLogs, (snapshot) => {
            setAllLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AuditLog)));
        });

        const unsubscribeSettings = onSnapshot(doc(db, 'system', 'settings'), (snapshot) => {
            if (snapshot.exists()) {
                setSystemSettings(snapshot.data() as SystemSettings);
            }
        });

        return () => {
            unsubscribeUsers();
            unsubscribeCircles();
            unsubscribeManagements();
            unsubscribeLogs();
            unsubscribeSettings();
        };
    }, []);

    const toggleStatus = async (user: UserProfile, reason?: string) => {
        const newStatus = user.status === 'blocked' ? 'active' : 'blocked';
        try {
            await updateDoc(doc(db, 'users', user.uid), { 
                status: newStatus,
                blockedReason: reason || ''
            });

            // If blocking, also suspend all user's circles as requested
            if (newStatus === 'blocked') {
                const userCirclesToSuspend = circles.filter(c => c.authorizedUserIds?.includes(user.uid));
                for (const circle of userCirclesToSuspend) {
                    await updateDoc(doc(db, 'circles', circle.id), { status: 'inactive' });
                }
            }

            addToast(`تم ${newStatus === 'blocked' ? 'إيقاف' : 'تفعيل'} الحساب بنجاح`, 'success');
            if (selectedUser?.uid === user.uid) {
                setSelectedUser({ ...selectedUser, status: newStatus, blockedReason: reason || '' });
            }
        } catch (error) {
            addToast('فشل تحديث حالة الحساب', 'error');
        }
    };

    const toggleMaintenanceModeUser = async (user: UserProfile, note?: string) => {
        const newValue = !user.maintenanceMode;
        try {
            await updateDoc(doc(db, 'users', user.uid), { 
                maintenanceMode: newValue,
                maintenanceNote: note || ''
            });
            addToast(`تم ${newValue ? 'تفعيل' : 'إلغاء'} وضع الصيانة للمستخدم`, 'info');
            if (selectedUser?.uid === user.uid) {
                setSelectedUser({ ...selectedUser, maintenanceMode: newValue, maintenanceNote: note || '' });
            }
        } catch (error) {
            addToast('فشل تحديث وضع الصيانة', 'error');
        }
    };

    const toggleMaintenanceMode = async (circleId: string, current: boolean) => {
        try {
            await updateDoc(doc(db, 'circles', circleId), { isMaintenance: !current });
            addToast(`تم ${!current ? 'تفعيل' : 'إلغاء'} وضع الصيانة بنجاح`, 'info');
        } catch (error) {
            addToast('فشل تحديث وضع الصيانة', 'error');
        }
    };

    const toggleCircleStatus = async (circleId: string, current: string) => {
        const newStatus = current === 'active' ? 'inactive' : 'active';
        try {
            await updateDoc(doc(db, 'circles', circleId), { status: newStatus });
            addToast(`تم ${newStatus === 'active' ? 'تفعيل' : 'إيقاف'} الحلقة بنجاح`, 'success');
        } catch (error) {
            addToast('فشل تحديث حالة الحلقة', 'error');
        }
    };

    // Auto-login logic
    const handleAutoLogin = (targetUser: UserProfile) => {
        if (!targetUser.email || !targetUser.plainPassword) {
            addToast('بيانات الدخول غير كاملة متوفرة لهذا المستخدم', 'error');
            return;
        }

        addToast('جاري تسجيل الدخول التلقائي...', 'info');
        
        // Use a simple localstorage flag to tell App.tsx we are acting as another user
        localStorage.setItem('developer_acting_as_user', 'true');
        localStorage.setItem('auto_login_creds', JSON.stringify({
            email: targetUser.email,
            password: targetUser.plainPassword
        }));

        // Trigger reload to force App.tsx to see null user and then AuthScreen auto-login
        setTimeout(() => {
            window.location.reload();
        }, 800);
    };

    const stats = {
        users: users.length,
        circles: circles.length,
        managements: managements.length,
        students: circles.reduce((acc, c) => acc + (c.students?.length || 0), 0),
        activeUsersUsers: users.filter(u => u.status !== 'blocked').length,
        blockedUsers: users.filter(u => u.status === 'blocked').length,
        totalSessions: circles.reduce((acc, c) => acc + (c.sessions?.length || 0), 0)
    };

    // Firebase Usage Estimates (Free plan simulation)
    const usageData = {
        totalReads: Math.floor(Math.random() * 5000) + 1000, // Simulated
        totalWrites: Math.floor(Math.random() * 500) + 100, // Simulated
        limitReads: 50000,
        limitWrites: 20000,
    };

    const filteredUsers = users.filter(u => 
        (u.displayName?.includes(searchQuery) || u.email?.includes(searchQuery)) && 
        u.role !== 'developer'
    );

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#0a0f0d] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 border-4 border-[#105541]/20 border-t-[#105541] rounded-full animate-spin"></div>
                    <p className="text-[#105541] font-bold text-xs tracking-widest animate-pulse">جاري تهيئة النظام...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#050807] text-[#e0e7e1] font-sans selection:bg-[#105541] selection:text-white pb-20" dir="rtl">
            {/* Elegant Fixed Header */}
            <header className="sticky top-0 z-50 bg-[#0a0f0d]/90 backdrop-blur-md border-b border-[#105541]/10 p-3 flex justify-between items-center shadow-lg">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-[#105541] to-[#0a3d2e] rounded-lg flex items-center justify-center text-white shadow-[0_0_15px_rgba(16,85,65,0.3)]">
                        <Shield size={18} />
                    </div>
                    <div>
                        <h1 className="text-sm font-bold tracking-tight">نظام المطور</h1>
                        <p className="text-[9px] text-[#105541] font-bold uppercase">{developerName}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="hidden md:flex flex-col items-end px-3 border-r border-[#105541]/20 ml-2">
                        <span className="text-[9px] text-emerald-500 font-bold uppercase tracking-tighter">حالة النظام: مثالية</span>
                        <span className="text-[8px] text-gray-600 font-mono">تزامن v5.0.2</span>
                    </div>
                    <motion.button 
                        whileTap={{ scale: 0.95 }}
                        onClick={onLogout}
                        className="bg-red-500/10 hover:bg-red-500/20 text-red-400 p-2 rounded-lg transition-all border border-red-500/20"
                        title="تسجيل الخروج"
                    >
                        <LogOut size={16} />
                    </motion.button>
                </div>
            </header>

            <main className="max-w-xl mx-auto p-3 space-y-4 pt-4">
                {/* Visual Stats Row */}
                <div className="grid grid-cols-2 gap-3">
                    <motion.div 
                        whileTap={{ scale: 0.98 }}
                        className="bg-[#0a0f0d] border border-[#105541]/20 p-4 rounded-2xl relative overflow-hidden group"
                    >
                        <div className="absolute top-0 right-0 w-16 h-16 bg-[#105541]/10 rounded-full -mr-6 -mt-6 blur-xl group-hover:bg-[#105541]/20 transition-all"></div>
                        <Users className="text-[#105541] mb-2" size={16} />
                        <span className="text-[9px] text-gray-500 block uppercase font-bold mb-1">المستخدمين</span>
                        <p className="text-2xl font-bold text-white tracking-tighter">{stats.users}</p>
                    </motion.div>
                    <motion.div 
                        whileTap={{ scale: 0.98 }}
                        className="bg-[#0a0f0d] border border-[#105541]/20 p-4 rounded-2xl relative overflow-hidden group"
                    >
                        <Box className="text-blue-500 mb-2" size={16} />
                        <span className="text-[9px] text-gray-500 block uppercase font-bold mb-1">الحلقات</span>
                        <p className="text-2xl font-bold text-white tracking-tighter">{stats.circles}</p>
                    </motion.div>
                    <motion.div 
                        whileTap={{ scale: 0.98 }}
                        className="bg-[#0a0f0d] border border-[#105541]/20 p-4 rounded-2xl relative overflow-hidden group"
                    >
                        <Activity className="text-purple-500 mb-2" size={16} />
                        <span className="text-[9px] text-gray-500 block uppercase font-bold mb-1">الطلاب</span>
                        <p className="text-2xl font-bold text-white tracking-tighter">{stats.students}</p>
                    </motion.div>
                    <motion.div 
                        whileTap={{ scale: 0.98 }}
                        className="bg-[#0a0f0d] border border-[#105541]/20 p-4 rounded-2xl relative overflow-hidden group"
                    >
                        <HardDrive className="text-orange-500 mb-2" size={16} />
                        <span className="text-[9px] text-gray-500 block uppercase font-bold mb-1">الإدارات</span>
                        <p className="text-2xl font-bold text-white tracking-tighter">{stats.managements}</p>
                    </motion.div>
                </div>

                {/* Main Content Sections */}
                <div className="space-y-4">
                    {/* Simplified Tab Bar */}
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none custom-scrollbar scroll-smooth">
                        {[
                            { id: 'overview', label: 'الرئيسية', icon: LayoutGrid },
                            { id: 'users', label: 'المستخدمين', icon: UserCheck },
                            { id: 'circles', label: 'الحلقات', icon: Box },
                            { id: 'notifications', label: 'التنبيهات', icon: Megaphone },
                            { id: 'managements', label: 'الإدارات', icon: Building2 },
                            { id: 'logs', label: 'السجل', icon: ScrollText },
                            { id: 'stats', label: 'الاستهلاك', icon: HardDrive },
                            { id: 'settings', label: 'الإعدادات', icon: Settings },
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => {
                                    setActiveTab(tab.id as TabType);
                                    setSelectedUser(null);
                                }}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all whitespace-nowrap border ${
                                    activeTab === tab.id 
                                    ? 'bg-[#105541] border-[#105541] text-white shadow-[0_0_10px_rgba(16,85,65,0.4)]' 
                                    : 'bg-[#0a0f0d] border-[#105541]/10 text-gray-500 hover:text-gray-300'
                                }`}
                            >
                                <tab.icon size={12} /> {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Tab Content */}
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                            className="bg-[#0a0f0d] border border-[#105541]/10 rounded-2xl p-4 shadow-xl"
                        >
                            {activeTab === 'overview' && (
                                <div className="space-y-4">
                                    <div className="bg-[#105541]/5 border border-[#105541]/10 p-4 rounded-xl relative overflow-hidden group">
                                        <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500"></div>
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <h3 className="text-sm font-bold text-white mb-1">ملخص النشاط</h3>
                                                <p className="text-[10px] text-gray-400">آخر تحديث: {new Date().toLocaleTimeString('ar-EG')}</p>
                                            </div>
                                            <div className="flex -space-x-2">
                                                <div className="w-8 h-8 rounded-full bg-emerald-500/20 border-2 border-[#105541] flex items-center justify-center text-[10px] font-bold text-emerald-500 z-10">
                                                    {stats.activeUsersUsers}
                                                </div>
                                                <div className="w-8 h-8 rounded-full bg-gray-800 border-2 border-[#105541] flex items-center justify-center text-[10px] font-bold text-gray-400">
                                                    {stats.users}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-[#050807] p-3 rounded-xl border border-[#105541]/5">
                                            <p className="text-[9px] text-gray-600 font-bold mb-1">المستخدمين النشطين</p>
                                            <p className="text-lg font-bold text-emerald-500">{stats.activeUsersUsers}</p>
                                        </div>
                                        <div className="bg-[#050807] p-3 rounded-xl border border-[#105541]/5">
                                            <p className="text-[9px] text-gray-600 font-bold mb-1">الحلقات النشطة</p>
                                            <p className="text-lg font-bold text-blue-500">{circles.filter(c => c.status !== 'inactive').length}</p>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <h4 className="text-[10px] font-bold text-[#105541] uppercase tracking-wider flex items-center gap-2">
                                            <Activity size={12} /> تنبيهات النظام
                                        </h4>
                                        <div className="space-y-2">
                                            {systemSettings.emergencyMode && (
                                                <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl flex items-center gap-3">
                                                    <AlertTriangle className="text-red-500 shrink-0" size={16} />
                                                    <div>
                                                        <p className="text-[11px] font-bold text-white">وضع الطوارئ نشط</p>
                                                        <p className="text-[9px] text-red-400 opacity-80">{systemSettings.emergencyMessage}</p>
                                                    </div>
                                                </div>
                                            )}
                                            {!systemSettings.registrationOpen && (
                                                <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl flex items-center gap-3">
                                                    <Lock className="text-amber-500 shrink-0" size={16} />
                                                    <p className="text-[11px] font-bold text-white">التسجيل الجديد مغلق حالياً</p>
                                                </div>
                                            )}
                                            {systemSettings.appUpdate?.active && (
                                                <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-xl flex items-center gap-3">
                                                    <Megaphone className="text-blue-500 shrink-0" size={16} />
                                                    <div>
                                                        <p className="text-[11px] font-bold text-white">يوجد تحديث نشط للمستخدمين</p>
                                                        <p className="text-[9px] text-blue-400 opacity-80">إصدار: {systemSettings.appUpdate.version}</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'users' && !selectedUser && (
                                <div className="space-y-4">
                                    <div className="relative">
                                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600" size={14} />
                                        <input 
                                            type="text" 
                                            placeholder="بحث بالمستخدم..." 
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full bg-[#050807] border border-[#105541]/20 rounded-xl py-2 pr-9 pl-3 text-xs outline-none focus:ring-1 focus:ring-[#105541] text-white"
                                        />
                                    </div>

                                    <div className="divide-y divide-[#105541]/10">
                                        {filteredUsers.map(user => (
                                            <div key={user.uid} className="py-3 flex items-center justify-between group">
                                                <div 
                                                    className="flex items-center gap-2 cursor-pointer transition-all hover:translate-x-1"
                                                    onClick={() => {
                                                        setSelectedUser(user);
                                                        setUserCircles(circles.filter(c => c.authorizedUserIds?.includes(user.uid)));
                                                    }}
                                                >
                                                    <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center text-gray-500 group-hover:text-emerald-500 transition-colors">
                                                        <UserCheck size={16} />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <p className="text-xs font-bold text-white">{user.displayName}</p>
                                                            <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase ${
                                                                user.status === 'blocked' ? 'bg-red-500/20 text-red-400' : 
                                                                user.maintenanceMode ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'
                                                            }`}>
                                                                {user.status === 'blocked' ? 'موقوف' : user.maintenanceMode ? 'صيانة' : 'نشط'}
                                                            </span>
                                                        </div>
                                                        <p className="text-[9px] text-gray-500 font-mono">{user.email}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1.5 focus-within:z-10">
                                                    <button 
                                                        onClick={() => {
                                                            const isVisible = showPasswords[user.uid];
                                                            if (!isVisible) {
                                                                setShowPasswords({ ...showPasswords, [user.uid]: true });
                                                                setTimeout(() => setShowPasswords(prev => ({ ...prev, [user.uid]: false })), 5000);
                                                            } else {
                                                                setShowPasswords({ ...showPasswords, [user.uid]: false });
                                                            }
                                                        }}
                                                        className="p-1.5 bg-gray-800/50 text-gray-500 rounded-lg hover:text-emerald-500 transition-colors"
                                                        title="كشف كلمة المرور"
                                                    >
                                                        {showPasswords[user.uid] ? <EyeOff size={14} /> : <Eye size={14} />}
                                                    </button>

                                                    <AnimatePresence>
                                                        {showPasswords[user.uid] && (
                                                            <motion.div 
                                                                initial={{ opacity: 0, x: 20 }}
                                                                animate={{ opacity: 1, x: 0 }}
                                                                className="absolute left-0 mr-4 bg-[#105541] px-3 py-1.5 rounded-lg border border-white/20 text-[10px] font-mono font-bold shadow-2xl z-50 whitespace-nowrap"
                                                            >
                                                                P: {user.plainPassword || 'N/A'}
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>

                                                    <button 
                                                        onClick={() => handleAutoLogin(user)}
                                                        className="bg-[#105541]/10 hover:bg-[#105541]/20 text-[#105541] p-1.5 rounded-lg border border-[#105541]/20 transition-all"
                                                        title="الدخول السريع"
                                                    >
                                                        <Zap size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'users' && selectedUser && (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 mb-4">
                                        <button 
                                            onClick={() => setSelectedUser(null)}
                                            className="p-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-all"
                                        >
                                            <ArrowLeft size={16} />
                                        </button>
                                        <div>
                                            <h3 className="text-sm font-bold text-white">{selectedUser.displayName}</h3>
                                            <p className="text-[10px] text-gray-500">{selectedUser.email}</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-[#050807] p-3 rounded-xl border border-[#105541]/10">
                                            <span className="text-[9px] text-gray-500 uppercase font-bold block mb-1">إجمالي الطلاب</span>
                                            <p className="text-xl font-bold text-white">{userCircles.reduce((acc, c) => acc + (c.students?.length || 0), 0)}</p>
                                        </div>
                                        <div className="bg-[#050807] p-3 rounded-xl border border-[#105541]/10">
                                            <span className="text-[9px] text-gray-500 uppercase font-bold block mb-1">عدد الحلقات</span>
                                            <p className="text-xl font-bold text-white">{userCircles.length}</p>
                                        </div>
                                    </div>

                                    <div className="bg-[#050807] p-4 rounded-xl border border-[#105541]/10 space-y-3">
                                        <h4 className="text-[10px] font-bold text-[#105541] uppercase tracking-wider">تفاصيل الحساب</h4>
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-[11px]">
                                                <span className="text-gray-500">كلمة المرور</span>
                                                <span className="text-white font-mono">{selectedUser.plainPassword || 'غير متوفرة'}</span>
                                            </div>
                                            <div className="flex justify-between text-[11px]">
                                                <span className="text-gray-500">حالة الحساب</span>
                                                <span className={`font-bold ${selectedUser.status === 'blocked' ? 'text-red-500' : 'text-emerald-500'}`}>
                                                    {selectedUser.status === 'blocked' ? 'موقوف' : 'نشط'}
                                                </span>
                                            </div>
                                            <div className="flex justify-between text-[11px]">
                                                <span className="text-gray-500">آخر تسجيل دخول</span>
                                                <span className="text-white font-mono">{selectedUser.lastLogin ? new Date(selectedUser.lastLogin.seconds * 1000).toLocaleString('ar-EG') : 'غير متوفر'}</span>
                                            </div>
                                            {selectedUser.blockedReason && (
                                                <div className="p-2 bg-red-500/5 border border-red-500/10 rounded-lg text-red-400 text-[10px]">
                                                    <p className="font-bold mb-1">سبب الإيقاف:</p>
                                                    <p className="opacity-80">{selectedUser.blockedReason}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {userCircles.length > 0 && (
                                        <div className="space-y-2">
                                            <h4 className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">الحلقات التابعة</h4>
                                            <div className="space-y-2">
                                                {userCircles.map(c => (
                                                    <div key={c.id} className="bg-[#050807] p-2.5 border border-[#105541]/5 rounded-lg flex items-center justify-between">
                                                        <div>
                                                            <p className="text-[11px] font-bold text-white">{c.circle}</p>
                                                            <p className="text-[9px] text-gray-500">{c.students?.length || 0} طالب</p>
                                                        </div>
                                                        <div className={`w-2 h-2 rounded-full ${c.status === 'active' ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="pt-4 grid grid-cols-2 gap-2">
                                        <button 
                                            onClick={() => {
                                                if (selectedUser.status === 'blocked') {
                                                    toggleStatus(selectedUser);
                                                } else {
                                                    const reason = prompt('يرجى كتابة سبب الإيقاف للمستخدم (يظهر له في حسابه):');
                                                    if (reason !== null) toggleStatus(selectedUser, reason);
                                                }
                                            }}
                                            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-[11px] font-bold transition-all ${
                                                selectedUser.status === 'blocked'
                                                ? 'bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30'
                                                : 'bg-red-500/20 text-red-500 hover:bg-red-500/30'
                                            }`}
                                        >
                                            {selectedUser.status === 'blocked' ? <Unlock size={14} /> : <Lock size={14} />}
                                            {selectedUser.status === 'blocked' ? 'تفعيل الحساب' : 'إيقاف الحساب'}
                                        </button>
                                        <button 
                                            onClick={() => {
                                                const note = prompt('ملاحظة وضع الصيانة (تظهر للمستخدم):', selectedUser.maintenanceNote || '');
                                                if (note !== null) toggleMaintenanceModeUser(selectedUser, note);
                                            }}
                                            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-[11px] font-bold transition-all ${
                                                selectedUser.maintenanceMode
                                                ? 'bg-amber-500/30 text-amber-500'
                                                : 'bg-gray-800 text-gray-400 hover:text-white'
                                            }`}
                                        >
                                            <Zap size={14} />
                                            وضع الصيانة
                                        </button>
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <h4 className="text-[10px] font-bold text-purple-500 uppercase tracking-wider">سجل النشاطات</h4>
                                        <div className="max-h-40 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                                            {allLogs.filter(l => l.actorId === selectedUser.uid).length > 0 ? (
                                                allLogs.filter(l => l.actorId === selectedUser.uid).map(log => (
                                                    <div key={log.id} className="text-[9px] bg-[#050807] p-2 rounded-lg border border-white/5">
                                                        <div className="flex justify-between items-center mb-1">
                                                            <span className="text-white font-bold">{log.action}</span>
                                                            <span className="text-gray-600">{new Date(log.createdAt).toLocaleDateString('ar-EG')}</span>
                                                        </div>
                                                        <p className="text-gray-500 truncate">{log.details}</p>
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="text-[10px] text-gray-600 italic text-center py-4">لا يوجد نشاط مسجل مؤخراً لهذا المستخدم</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'circles' && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 gap-3">
                                        {circles.map(circle => (
                                            <div key={circle.id} className="bg-[#050807] border border-[#105541]/10 p-3 rounded-xl relative">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center text-blue-500">
                                                            <Box size={16} />
                                                        </div>
                                                        <div>
                                                            <h4 className="text-[11px] font-bold text-white">{circle.circle}</h4>
                                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                                <p className="text-[9px] text-gray-400">المعلم: {circle.teacher}</p>
                                                                {circle.town && (
                                                                    <div className="flex items-center gap-0.5 text-[8px] text-gray-500 bg-gray-800/50 px-1 rounded-sm">
                                                                        <MapPin size={8} /> {circle.town}
                                                                    </div>
                                                                )}
                                                                <div className="flex items-center gap-0.5 text-[8px] text-gray-500 bg-gray-800/50 px-1 rounded-sm font-mono">
                                                                    <Hash size={8} /> {circle.numericId}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <button 
                                                            onClick={async () => {
                                                                const newStatus = circle.status === 'inactive' ? 'active' : 'inactive';
                                                                try {
                                                                    await updateDoc(doc(db, 'circles', circle.id), { status: newStatus });
                                                                    addToast(`تم ${newStatus === 'inactive' ? 'إيقاف' : 'تفعيل'} الحلقة`, 'success');
                                                                } catch (e) {
                                                                    addToast('خطأ في التحديث', 'error');
                                                                }
                                                            }}
                                                            className={`text-[9px] font-bold px-2 py-1 rounded-lg border transition-all ${
                                                                circle.status === 'inactive' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                                            }`}
                                                        >
                                                            {circle.status === 'inactive' ? 'تفعيل' : 'إيقاف'}
                                                        </button>
                                                        <button 
                                                            onClick={() => toggleMaintenanceMode(circle.id, circle.isMaintenance || false)}
                                                            className={`text-[9px] font-bold px-2 py-1 rounded-lg border flex items-center gap-1 transition-all ${
                                                                circle.isMaintenance ? 'bg-amber-500/20 text-amber-500 border-amber-500/20' : 'bg-gray-800 text-gray-500 border-gray-700'
                                                            }`}
                                                        >
                                                            {circle.isMaintenance ? <Zap size={10} /> : <Zap size={10} className="opacity-30" />}
                                                            صيانة
                                                        </button>
                                                    </div>
                                                </div>
                                                
                                                <div className="grid grid-cols-3 gap-2 mt-3 pt-2 border-t border-[#105541]/5">
                                                    <div className="text-center">
                                                        <p className="text-[8px] text-gray-500 uppercase font-bold">طلاب</p>
                                                        <p className="text-xs font-bold text-white">{circle.students?.length || 0}</p>
                                                    </div>
                                                    <div className="text-center">
                                                        <p className="text-[8px] text-gray-600 uppercase font-bold">الحصص</p>
                                                        <p className="text-xs font-bold text-white">{circle.sessions?.length || 0}</p>
                                                    </div>
                                                    <div className="text-center">
                                                        <p className="text-[8px] text-gray-600 uppercase font-bold">كلمة السر</p>
                                                        <p className="text-[9px] font-mono text-blue-400 font-bold">{circle.transferPassword || '---'}</p>
                                                    </div>
                                                </div>

                                                <div className="mt-2 flex items-center justify-between border-t border-[#105541]/5 pt-2">
                                                    <div className="flex items-center gap-1">
                                                        <div className="w-5 h-5 bg-gray-800 rounded-full flex items-center justify-center text-[8px] font-bold text-gray-500">
                                                            {Object.keys(circle.teachers || {}).length}
                                                        </div>
                                                        <span className="text-[8px] text-gray-600 uppercase font-bold">معلمين</span>
                                                    </div>
                                                    <span className="text-[9px] font-mono font-bold text-[#105541] bg-[#105541]/5 px-2 py-0.5 rounded border border-[#105541]/10">
                                                        #{circle.transferCode}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'managements' && (
                                <div className="space-y-3">
                                    {managements.map(mgmt => (
                                        <div key={mgmt.id} className="bg-[#050807] border border-[#105541]/10 p-3 rounded-xl flex items-center justify-between overflow-hidden">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 bg-orange-500/10 rounded-lg flex items-center justify-center text-orange-500">
                                                    <Building2 size={18} />
                                                </div>
                                                <div>
                                                    <h5 className="text-xs font-bold text-white">{mgmt.name}</h5>
                                                    <p className="text-[9px] text-gray-600">المدير: {mgmt.managerName}</p>
                                                </div>
                                            </div>
                                            <div className="text-left bg-gray-900/50 px-2 py-1 rounded-lg border border-white/5">
                                                <span className="text-[8px] text-gray-600 block uppercase font-mono">كود الدعوة</span>
                                                <span className="text-[10px] font-bold font-mono text-emerald-500 tracking-widest">{mgmt.invitationCode}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {activeTab === 'stats' && (
                                <div className="space-y-4">
                                    <h3 className="text-xs font-bold text-red-400 flex items-center gap-2">
                                        <HardDrive size={14} /> استهلاك النظام وعمليات Firebase
                                    </h3>
                                    
                                    <div className="space-y-3">
                                        <div>
                                            <div className="flex justify-between text-[10px] mb-1 font-bold">
                                                <span className="text-gray-400">عمليات القراءة</span>
                                                <span className="text-white font-mono">{usageData.totalReads} / {usageData.limitReads}</span>
                                            </div>
                                            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                                                <div 
                                                    className="h-full bg-emerald-500 rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(16,185,129,0.5)]" 
                                                    style={{ width: `${(usageData.totalReads / usageData.limitReads) * 100}%` }}
                                                ></div>
                                            </div>
                                        </div>

                                        <div>
                                            <div className="flex justify-between text-[10px] mb-1 font-bold">
                                                <span className="text-gray-400">عمليات الكتابة</span>
                                                <span className="text-white font-mono">{usageData.totalWrites} / {usageData.limitWrites}</span>
                                            </div>
                                            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                                                <div 
                                                    className="h-full bg-blue-500 rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(59,130,246,0.5)]" 
                                                    style={{ width: `${(usageData.totalWrites / usageData.limitWrites) * 100}%` }}
                                                ></div>
                                            </div>
                                        </div>

                                        <div className="p-3 bg-blue-500/5 border border-blue-500/10 rounded-xl mt-4">
                                            <p className="text-[10px] text-blue-400 font-bold mb-1 uppercase tracking-tighter flex items-center gap-1">
                                                <Info size={10} /> تصفير الحصص اليومية
                                            </p>
                                            <p className="text-[9px] text-gray-500">الحد الأقصى اليومي في حساب Firebase Spark المجاني. يتم تصفير العداد من قبل جوجل كل 24 ساعة.</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'logs' && (
                                <div className="space-y-3">
                                    {allLogs.map(log => (
                                        <div key={log.id} className="bg-[#050807] border border-[#105541]/10 p-3 rounded-xl">
                                            <div className="flex justify-between items-start mb-1.5">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 bg-gray-800 rounded text-gray-500 flex items-center justify-center">
                                                        <Activity size={12} />
                                                    </div>
                                                    <h6 className="text-[10px] font-bold text-white">{log.action}</h6>
                                                </div>
                                                <span className="text-[8px] font-mono text-gray-600">
                                                    {new Date(log.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                            <p className="text-[9px] text-gray-500 leading-relaxed mb-2">{log.details}</p>
                                            <div className="flex justify-end">
                                                <span className="text-[8px] font-bold text-[#105541] bg-[#105541]/5 px-1.5 py-0.5 rounded border border-[#105541]/10 uppercase tracking-widest">{log.actorName}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {activeTab === 'settings' && (
                                <div className="space-y-6">
                                    <div className="bg-[#050807] p-4 rounded-xl border border-[#105541]/10 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500">
                                                    <UserPlus size={20} />
                                                </div>
                                                <div>
                                                    <h3 className="text-sm font-bold text-white">التسجيل الجديد</h3>
                                                    <p className="text-[10px] text-gray-500">السماح للمعلمين الجدد بإنشاء حسابات</p>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={async () => {
                                                    try {
                                                        await updateDoc(doc(db, 'system', 'settings'), { registrationOpen: !systemSettings.registrationOpen });
                                                        addToast('تم تحديث حالة التسجيل', 'success');
                                                    } catch (e) {
                                                        addToast('خطأ في التحديث', 'error');
                                                    }
                                                }}
                                                className={`w-12 h-6 rounded-full transition-all relative ${systemSettings.registrationOpen ? 'bg-emerald-500' : 'bg-gray-700'}`}
                                            >
                                                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${systemSettings.registrationOpen ? 'right-7' : 'right-1'}`}></div>
                                            </button>
                                        </div>

                                        <div className="flex items-center justify-between pt-4 border-t border-[#105541]/5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center text-red-500">
                                                    <AlertTriangle size={20} />
                                                </div>
                                                <div>
                                                    <h3 className="text-sm font-bold text-white">وضع الطوارئ (Emergency)</h3>
                                                    <p className="text-[10px] text-gray-500">إغلاق النظام بالكامل وعرض رسالة</p>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={async () => {
                                                    const current = systemSettings.emergencyMode;
                                                    let msg = systemSettings.emergencyMessage;
                                                    if (!current) {
                                                        const inputMsg = prompt('أدخل رسالة الطوارئ التي ستظهر للمستخدمين:', 'النظام تحت الصيانة الطارئة حالياً، يرجى المحاولة لاحقاً.');
                                                        if (inputMsg === null) return;
                                                        msg = inputMsg;
                                                    }
                                                    try {
                                                        await updateDoc(doc(db, 'system', 'settings'), { 
                                                            emergencyMode: !current,
                                                            emergencyMessage: msg || ''
                                                        });
                                                        addToast(`تم ${!current ? 'تفعيل' : 'إلغاء'} وضع الطوارئ`, 'info');
                                                    } catch (e) {
                                                        addToast('خطأ في التحديث', 'error');
                                                    }
                                                }}
                                                className={`w-12 h-6 rounded-full transition-all relative ${systemSettings.emergencyMode ? 'bg-red-500' : 'bg-gray-700'}`}
                                            >
                                                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${systemSettings.emergencyMode ? 'right-7' : 'right-1'}`}></div>
                                            </button>
                                        </div>
                                    </div>

                                    <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl">
                                        <div className="flex items-center gap-2 text-amber-500 mb-3 font-bold text-xs">
                                            <Shield size={14} /> صلاحيات المطور المطلقة
                                        </div>
                                        <p className="text-[10px] text-gray-400 mb-4 leading-relaxed underline">
                                            تحذير: أنت الآن تمتلك وصولاً كاملاً لجميع قواعد البيانات (Firestore). أي تعديل هنا ينعكس فوراً على جميع الأجهزة المتصلة. يرجى توخي الحذر الشديد.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'notifications' && (
                                <div className="space-y-6">
                                    <div className="bg-[#050807] p-4 rounded-xl border border-[#105541]/10 space-y-4">
                                        <h3 className="text-xs font-bold text-blue-500 flex items-center gap-2">
                                            <Megaphone size={14} /> إرسال تنبيه أو تحديث
                                        </h3>
                                        
                                        <div className="space-y-3">
                                            <div>
                                                <label className="text-[10px] text-gray-500 block mb-1">نوع التنبيه</label>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <button 
                                                        onClick={() => setNewNotification({...newNotification, type: 'general'})}
                                                        className={`py-2 rounded-lg text-[10px] font-bold border transition-all ${newNotification.type === 'general' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' : 'bg-gray-800 text-gray-500 border-gray-700'}`}
                                                    >
                                                        تنبيه عام
                                                    </button>
                                                    <button 
                                                        onClick={() => setNewNotification({...newNotification, type: 'update'})}
                                                        className={`py-2 rounded-lg text-[10px] font-bold border transition-all ${newNotification.type === 'update' ? 'bg-purple-500/10 text-purple-500 border-purple-500/20' : 'bg-gray-800 text-gray-500 border-gray-700'}`}
                                                    >
                                                        تحديث التطبيق
                                                    </button>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="text-[10px] text-gray-500 block mb-1">نص الرسالة</label>
                                                <textarea 
                                                    value={newNotification.text}
                                                    onChange={e => setNewNotification({...newNotification, text: e.target.value})}
                                                    placeholder="اكتب رسالتك للمستخدمين هنا..."
                                                    className="w-full bg-[#0a0f0d] border border-white/5 rounded-xl p-2 text-[11px] text-white outline-none focus:ring-1 focus:ring-blue-500 h-20 resize-none"
                                                />
                                            </div>

                                            {newNotification.type === 'update' && (
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div>
                                                        <label className="text-[10px] text-gray-500 block mb-1">الإصدار (Version)</label>
                                                        <input 
                                                            type="text" 
                                                            value={newNotification.version}
                                                            onChange={e => setNewNotification({...newNotification, version: e.target.value})}
                                                            className="w-full bg-[#0a0f0d] border border-white/5 rounded-lg p-1.5 text-[10px] text-white outline-none"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] text-gray-500 block mb-1">رابط التحديث</label>
                                                        <input 
                                                            type="text" 
                                                            value={newNotification.link}
                                                            onChange={e => setNewNotification({...newNotification, link: e.target.value})}
                                                            placeholder="https://..."
                                                            className="w-full bg-[#0a0f0d] border border-white/5 rounded-lg p-1.5 text-[10px] text-white outline-none"
                                                        />
                                                    </div>
                                                </div>
                                            )}

                                            <div className="flex items-center justify-between py-2">
                                                <div className="flex items-center gap-2">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={newNotification.isMandatory}
                                                        onChange={e => setNewNotification({...newNotification, isMandatory: e.target.checked})}
                                                        id="mandatory-check"
                                                        className="w-4 h-4 rounded border-gray-700 bg-gray-800 text-blue-500"
                                                    />
                                                    <label htmlFor="mandatory-check" className="text-[10px] text-gray-400">تحديث إجباري (يمنع الاستخدام بدون تحديث)</label>
                                                </div>
                                            </div>

                                            <button 
                                                onClick={async () => {
                                                    if (!newNotification.text) return addToast('يرجى كتابة نص الرسالة', 'error');
                                                    try {
                                                        if (newNotification.type === 'update') {
                                                            await updateDoc(doc(db, 'system', 'settings'), {
                                                                appUpdate: {
                                                                    id: Date.now().toString(),
                                                                    version: newNotification.version,
                                                                    text: newNotification.text,
                                                                    link: newNotification.link,
                                                                    isMandatory: newNotification.isMandatory,
                                                                    active: true,
                                                                    createdAt: Date.now()
                                                                }
                                                            });
                                                        } else {
                                                            // For general notifications, we can add to a global collection
                                                            await setDoc(doc(collection(db, 'system_notifications')), {
                                                                text: newNotification.text,
                                                                createdAt: serverTimestamp(),
                                                                type: 'general'
                                                            });
                                                        }
                                                        addToast('تم إرسال التنبيه بنجاح', 'success');
                                                        setNewNotification({...newNotification, text: ''});
                                                    } catch (e) {
                                                        addToast('خطأ في الإرسال', 'error');
                                                    }
                                                }}
                                                className="w-full bg-blue-500 text-white py-2.5 rounded-xl text-[11px] font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-600 transition-all flex items-center justify-center gap-2"
                                            >
                                                <Upload size={14} /> إرسال الآن
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl">
                                        <p className="text-[10px] text-blue-400 font-bold mb-2 uppercase tracking-tighter flex items-center gap-1">
                                            <Info size={12} /> معاينة الرسالة
                                        </p>
                                        <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>
                                                <span className="text-[9px] font-bold text-blue-400">{newNotification.type === 'update' ? 'تحديث متوفر' : 'تنبيه إداري'}</span>
                                            </div>
                                            <p className="text-[10px] text-gray-300 leading-relaxed italic">
                                                {newNotification.text || "سيظهر نص الرسالة هنا..."}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </main>

            {/* Mobile Footer Status Bar */}
            <div className="fixed bottom-0 left-0 right-0 bg-[#0a0f0d] border-t border-[#105541]/10 p-2 flex justify-between items-center px-4 z-[60]">
                <div className="flex items-center gap-4 overflow-hidden">
                    <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_5px_rgba(16,185,129,1)]"></span>
                        <span className="text-[8px] font-mono font-bold text-emerald-500 tracking-tighter uppercase whitespace-nowrap">المحرك يعمل</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse shadow-[0_0_5px_rgba(59,130,246,1)]"></span>
                        <span className="text-[8px] font-mono font-bold text-blue-500 tracking-tighter uppercase whitespace-nowrap">التزامن: {allLogs.length > 0 ? 'نشط' : 'متصل'}</span>
                    </div>
                </div>
                <div className="text-[8px] font-mono text-gray-700 tracking-wider font-bold uppercase">
                    محمي بواسطة نظام المخلافي
                </div>
            </div>
        </div>
    );
};

export default DeveloperDashboard;

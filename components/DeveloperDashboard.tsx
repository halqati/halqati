
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
import { db, collection, query, onSnapshot, doc, updateDoc, getDocs, getDoc, setDoc, deleteDoc, orderBy, limit, serverTimestamp, arrayUnion } from '../firebase';
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
    
    // User sorting and filtering states
    const [sortOption, setSortOption] = useState<'newest' | 'oldest' | 'most_active' | 'least_active' | 'circles_count' | 'last_login'>('newest');
    const [genderFilter, setGenderFilter] = useState<'all' | 'male' | 'female'>('all');
    const [roleFilter, setRoleFilter] = useState<'all' | 'teacher' | 'admin' | 'manager'>('all');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'blocked'>('all');
    
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

    const sendPrivateMessage = async (user: UserProfile, message: string) => {
        if (!message || !message.trim()) return;
        try {
            const userRef = doc(db, 'users', user.uid);
            const msgObj = {
                id: Math.random().toString(36).substring(2, 9) + Date.now(),
                message: message.trim(),
                read: false,
                createdAt: Date.now()
            };
            
            await updateDoc(userRef, {
                notifications: arrayUnion(msgObj)
            });

            addToast('🚀 تم إرسال التنبيه الخاص إلى المعلم بنجاح!', 'success');
            
            if (selectedUser?.uid === user.uid) {
                setSelectedUser({
                    ...selectedUser,
                    notifications: [...(selectedUser.notifications || []), msgObj]
                });
            }
        } catch (error) {
            console.error("Error sending private message:", error);
            addToast('❌ فشل إرسال التنبيه الخاص للمعلم', 'error');
        }
    };

    const deleteUserAccount = async (user: UserProfile) => {
        const confirmDelete = window.confirm(`⚠️ تحذير شديد الخطورة:\nهل أنت متأكد تماماً من حذف حساب المعلم "${user.displayName}" نهائياً من قاعدة البيانات وتصفية جميع ارتباطاته؟\n\nهذا الإجراء غير قابل للتراجع وسيتم تسجيل خروجه فوراً وتنبيهه.`);
        if (!confirmDelete) return;

        try {
            // Update status to 'deleted' in Firestore first so they get logged out reactively
            await updateDoc(doc(db, 'users', user.uid), {
                status: 'deleted'
            });

            // Disassociate from circles
            const userCirclesToCleanup = circles.filter(c => c.authorizedUserIds?.includes(user.uid));
            for (const circle of userCirclesToCleanup) {
                const updatedAuthorized = (circle.authorizedUserIds || []).filter(uid => uid !== user.uid);
                await updateDoc(doc(db, 'circles', circle.id), {
                    authorizedUserIds: updatedAuthorized,
                    ...(circle.ownerId === user.uid ? { ownerId: '' } : {})
                });
            }

            // Finally delete user document after a small timeout to allow sync to propagate
            setTimeout(async () => {
                try {
                    await deleteDoc(doc(db, 'users', user.uid));
                    addToast('🗑️ تم حذف وتصفية حساب المستخدم بالكامل بنجاح', 'success');
                    setSelectedUser(null);
                } catch (e) {
                    console.error("Firestore deleteDoc error:", e);
                }
            }, 1500);

        } catch (error) {
            console.error("Error deleting user:", error);
            addToast('❌ فشل تصفية وحذف الحساب', 'error');
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

    const getTimestampMs = (val: any) => {
        if (!val) return 0;
        if (typeof val === 'number') return val;
        if (val.seconds) return val.seconds * 1000;
        if (val.toMillis) return val.toMillis();
        const parsed = Date.parse(val);
        return isNaN(parsed) ? 0 : parsed;
    };

    const processedUsers = useMemo(() => {
        let list = users.filter(u => u.role !== 'developer');

        // Search Query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            list = list.filter(u => {
                const nameMatch = u.displayName?.toLowerCase().includes(query) || false;
                const emailMatch = u.email?.toLowerCase().includes(query) || false;
                const uidMatch = u.uid?.toLowerCase().includes(query) || false;
                
                // Username extraction (ends with @quran.app)
                let username = '';
                if (u.email && u.email.endsWith('@quran.app')) {
                    username = u.email.split('@')[0];
                }
                const usernameMatch = username.toLowerCase().includes(query);

                return nameMatch || emailMatch || uidMatch || usernameMatch;
            });
        }

        // Gender Filter
        if (genderFilter !== 'all') {
            list = list.filter(u => u.gender === genderFilter);
        }

        // Role Filter
        if (roleFilter !== 'all') {
            list = list.filter(u => u.role === roleFilter);
        }

        // Status Filter
        if (statusFilter !== 'all') {
            list = list.filter(u => u.status === statusFilter);
        }

        // Sorting
        list.sort((a, b) => {
            if (sortOption === 'newest') {
                return getTimestampMs(b.createdAt) - getTimestampMs(a.createdAt);
            }
            if (sortOption === 'oldest') {
                return getTimestampMs(a.createdAt) - getTimestampMs(b.createdAt);
            }
            if (sortOption === 'most_active') {
                const actA = getTimestampMs(a.lastActive) || getTimestampMs(a.lastLogin) || getTimestampMs(a.createdAt);
                const actB = getTimestampMs(b.lastActive) || getTimestampMs(b.lastLogin) || getTimestampMs(b.createdAt);
                return actB - actA;
            }
            if (sortOption === 'least_active') {
                const actA = getTimestampMs(a.lastActive) || getTimestampMs(a.lastLogin) || getTimestampMs(a.createdAt);
                const actB = getTimestampMs(b.lastActive) || getTimestampMs(b.lastLogin) || getTimestampMs(b.createdAt);
                return actA - actB;
            }
            if (sortOption === 'last_login') {
                return getTimestampMs(b.lastLogin) - getTimestampMs(a.lastLogin);
            }
            if (sortOption === 'circles_count') {
                const countA = circles.filter(c => c.authorizedUserIds?.includes(a.uid)).length;
                const countB = circles.filter(c => c.authorizedUserIds?.includes(b.uid)).length;
                return countB - countA;
            }
            return 0;
        });

        return list;
    }, [users, searchQuery, genderFilter, roleFilter, statusFilter, sortOption, circles]);

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
                                    {/* Advanced Search, Filtering, and Sorting Header */}
                                    <div className="bg-[#0a0f0d] border border-[#105541]/10 p-4 rounded-2xl space-y-3">
                                        <div className="relative">
                                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                            <input 
                                                type="text" 
                                                placeholder="بحث بالاسم الكامل، اسم المستخدم، البريد، أو معرف المستخدم..." 
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className="w-full bg-[#050807] border border-[#105541]/20 rounded-xl py-2.5 pr-9 pl-3 text-xs outline-none focus:ring-1 focus:ring-[#105541] text-white font-medium"
                                            />
                                        </div>
                                        
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[10px]">
                                            {/* Sort Option */}
                                            <div className="flex flex-col gap-1">
                                                <span className="text-gray-500 font-bold">ترتيب الحسابات:</span>
                                                <select
                                                    value={sortOption}
                                                    onChange={(e: any) => setSortOption(e.target.value)}
                                                    className="bg-[#050807] border border-[#105541]/20 text-gray-300 rounded-lg p-1.5 outline-none font-medium"
                                                >
                                                    <option value="newest">الأحدث تسجيلاً</option>
                                                    <option value="oldest">الأقدم تسجيلاً</option>
                                                    <option value="most_active">الأكثر نشاطاً (حضور)</option>
                                                    <option value="least_active">الأقل نشاطاً</option>
                                                    <option value="circles_count">عدد الحلقات التابعة</option>
                                                    <option value="last_login">آخر تسجيل دخول</option>
                                                </select>
                                            </div>

                                            {/* Role Filter */}
                                            <div className="flex flex-col gap-1">
                                                <span className="text-gray-500 font-bold">نوع الحساب:</span>
                                                <select
                                                    value={roleFilter}
                                                    onChange={(e: any) => setRoleFilter(e.target.value)}
                                                    className="bg-[#050807] border border-[#105541]/20 text-gray-300 rounded-lg p-1.5 outline-none font-medium"
                                                >
                                                    <option value="all">الكل</option>
                                                    <option value="teacher">معلم حلقة</option>
                                                    <option value="admin">مدير</option>
                                                    <option value="manager">مشرف عام</option>
                                                </select>
                                            </div>

                                            {/* Gender Filter */}
                                            <div className="flex flex-col gap-1">
                                                <span className="text-gray-500 font-bold">الجنس:</span>
                                                <select
                                                    value={genderFilter}
                                                    onChange={(e: any) => setGenderFilter(e.target.value)}
                                                    className="bg-[#050807] border border-[#105541]/20 text-gray-300 rounded-lg p-1.5 outline-none font-medium"
                                                >
                                                    <option value="all">الكل</option>
                                                    <option value="male">رجال / بنين</option>
                                                    <option value="female">نساء / بنات</option>
                                                </select>
                                            </div>

                                            {/* Status Filter */}
                                            <div className="flex flex-col gap-1">
                                                <span className="text-gray-500 font-bold">حالة الحساب:</span>
                                                <select
                                                    value={statusFilter}
                                                    onChange={(e: any) => setStatusFilter(e.target.value)}
                                                    className="bg-[#050807] border border-[#105541]/20 text-gray-300 rounded-lg p-1.5 outline-none font-medium"
                                                >
                                                    <option value="all">الكل</option>
                                                    <option value="active">نشط</option>
                                                    <option value="blocked">موقوف</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Users count & results */}
                                    <div className="flex justify-between items-center px-1 text-[10px] text-gray-500">
                                        <span>عدد النتائج المطابقة: <strong className="text-[#105541]">{processedUsers.length}</strong> مستخدم</span>
                                        {searchQuery || genderFilter !== 'all' || roleFilter !== 'all' || statusFilter !== 'all' ? (
                                            <button 
                                                onClick={() => {
                                                    setSearchQuery('');
                                                    setGenderFilter('all');
                                                    setRoleFilter('all');
                                                    setStatusFilter('all');
                                                    setSortOption('newest');
                                                }}
                                                className="text-red-400 hover:underline animate-pulse"
                                            >
                                                إعادة تعيين الفلاتر
                                            </button>
                                        ) : null}
                                    </div>

                                    {/* Users Cards Grid */}
                                    <div className="space-y-2.5">
                                        {processedUsers.map(user => {
                                            const circlesCount = circles.filter(c => c.authorizedUserIds?.includes(user.uid)).length;
                                            const username = (user.email && user.email.endsWith('@quran.app')) ? user.email.split('@')[0] : 'لا يوجد';
                                            
                                            return (
                                                <div 
                                                    key={user.uid} 
                                                    className="bg-[#0a0f0d] border border-[#105541]/10 p-3.5 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:border-[#105541]/30 transition-all duration-300 group relative"
                                                >
                                                    {/* User basic info */}
                                                    <div 
                                                        className="flex items-center gap-3 cursor-pointer transition-all hover:translate-x-1"
                                                        onClick={() => {
                                                            setSelectedUser(user);
                                                            setUserCircles(circles.filter(c => c.authorizedUserIds?.includes(user.uid)));
                                                        }}
                                                    >
                                                        {/* Avatar / Profile Image */}
                                                        {user.photoURL ? (
                                                            <img 
                                                                src={user.photoURL} 
                                                                alt="" 
                                                                referrerPolicy="no-referrer"
                                                                className="w-10 h-10 rounded-xl object-cover border border-[#105541]/20"
                                                            />
                                                        ) : (
                                                            <div className="w-10 h-10 bg-[#105541]/10 text-[#105541] rounded-xl flex items-center justify-center font-black text-xs border border-[#105541]/20">
                                                                {(user.displayName || '؟')[0]}
                                                            </div>
                                                        )}
                                                        
                                                        <div>
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <p className="text-xs font-black text-white group-hover:text-[#127055] transition-colors">{user.displayName}</p>
                                                                <span className={`text-[8px] px-2 py-0.5 rounded-full font-bold uppercase ${
                                                                    user.role === 'admin' ? 'bg-indigo-500/10 text-indigo-400' :
                                                                    user.role === 'manager' ? 'bg-purple-500/10 text-purple-400' : 'bg-gray-800 text-gray-400'
                                                                }`}>
                                                                    {user.role === 'admin' ? 'مدير' : user.role === 'manager' ? 'مشرف عام' : 'معلم حلقة'}
                                                                </span>
                                                                <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase ${
                                                                    user.status === 'blocked' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 
                                                                    user.maintenanceMode ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                                                }`}>
                                                                    {user.status === 'blocked' ? 'موقوف' : user.maintenanceMode ? 'صيانة' : 'نشط'}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-1.5 text-[9px] text-gray-500 font-medium mt-1">
                                                                <span className="font-mono">U: @{username}</span>
                                                                <span>•</span>
                                                                <span className="font-mono">{user.email}</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Right side stats & quick actions */}
                                                    <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 border-[#105541]/5 pt-2 sm:pt-0">
                                                        <div className="text-left font-sans sm:block hidden">
                                                            <p className="text-[10px] font-black text-white">{circlesCount} حلقات</p>
                                                            <p className="text-[8px] text-gray-500 mt-0.5">مسجل بتاريخ {user.createdAt ? new Date(getTimestampMs(user.createdAt)).toLocaleDateString('ar-EG') : 'غير متوفر'}</p>
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
                                                                className="p-2 bg-gray-800/50 hover:bg-[#105541]/10 text-gray-400 hover:text-emerald-500 rounded-xl transition-all border border-white/5"
                                                                title="كشف كلمة المرور"
                                                            >
                                                                {showPasswords[user.uid] ? <EyeOff size={13} /> : <Eye size={13} />}
                                                            </button>

                                                            <AnimatePresence>
                                                                {showPasswords[user.uid] && (
                                                                    <motion.div 
                                                                        initial={{ opacity: 0, scale: 0.95 }}
                                                                        animate={{ opacity: 1, scale: 1 }}
                                                                        exit={{ opacity: 0, scale: 0.95 }}
                                                                        className="absolute left-10 bg-[#105541] px-3 py-2 rounded-xl border border-white/15 text-[10px] font-mono font-black shadow-2xl z-50 text-white whitespace-nowrap"
                                                                    >
                                                                        P: {user.plainPassword || 'N/A'}
                                                                    </motion.div>
                                                                )}
                                                            </AnimatePresence>

                                                            <button 
                                                                onClick={() => handleAutoLogin(user)}
                                                                className="bg-[#105541]/10 hover:bg-[#105541]/25 text-[#105541] p-2 rounded-xl border border-[#105541]/20 transition-all flex items-center justify-center"
                                                                title="الدخول السريع بحساب هذا المستخدم"
                                                            >
                                                                <Zap size={13} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        {processedUsers.length === 0 && (
                                            <div className="text-center py-10 bg-[#0a0f0d] border border-dashed border-[#105541]/15 rounded-2xl">
                                                <Users className="mx-auto text-gray-600 mb-2 animate-pulse" size={24} />
                                                <p className="text-[11px] text-gray-500">لا يوجد مستخدمين مطابقين لمعايير البحث الحالية.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'users' && selectedUser && (
                                <div className="space-y-4">
                                    {/* Sub-view Header */}
                                    <div className="flex items-center gap-3 bg-[#0a0f0d] border border-[#105541]/10 p-3.5 rounded-2xl">
                                        <button 
                                            onClick={() => setSelectedUser(null)}
                                            className="p-2.5 bg-gray-800 rounded-xl hover:bg-gray-700 transition-all text-gray-300 hover:text-white"
                                        >
                                            <ArrowLeft size={16} />
                                        </button>
                                        <div className="flex items-center gap-2.5">
                                            {selectedUser.photoURL ? (
                                                <img 
                                                    src={selectedUser.photoURL} 
                                                    alt="" 
                                                    referrerPolicy="no-referrer"
                                                    className="w-10 h-10 rounded-xl object-cover border border-[#105541]/20"
                                                />
                                            ) : (
                                                <div className="w-10 h-10 bg-[#105541]/10 text-[#105541] rounded-xl flex items-center justify-center font-black text-xs border border-[#105541]/20">
                                                    {(selectedUser.displayName || '؟')[0]}
                                                </div>
                                            )}
                                            <div>
                                                <h3 className="text-xs font-black text-white">{selectedUser.displayName}</h3>
                                                <p className="text-[9px] text-gray-500 font-mono mt-0.5">{selectedUser.email}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Dashboard Stats Cards */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                                        <div className="bg-[#0a0f0d] p-3.5 rounded-2xl border border-[#105541]/10">
                                            <span className="text-[9px] text-gray-500 uppercase font-black block mb-1">إجمالي الطلاب</span>
                                            <p className="text-lg font-black text-white">{userCircles.reduce((acc, c) => acc + (c.students?.length || 0), 0)}</p>
                                        </div>
                                        <div className="bg-[#0a0f0d] p-3.5 rounded-2xl border border-[#105541]/10">
                                            <span className="text-[9px] text-gray-500 uppercase font-black block mb-1">عدد الحلقات</span>
                                            <p className="text-lg font-black text-white">{userCircles.length}</p>
                                        </div>
                                        <div className="bg-[#0a0f0d] p-3.5 rounded-2xl border border-[#105541]/10">
                                            <span className="text-[9px] text-gray-500 uppercase font-black block mb-1">آخر تسجيل دخول</span>
                                            <p className="text-[10px] font-bold text-white font-mono mt-1">
                                                {selectedUser.lastLogin ? new Date(getTimestampMs(selectedUser.lastLogin)).toLocaleDateString('ar-EG') : 'غير متوفر'}
                                            </p>
                                        </div>
                                        <div className="bg-[#0a0f0d] p-3.5 rounded-2xl border border-[#105541]/10">
                                            <span className="text-[9px] text-gray-500 uppercase font-black block mb-1">آخر نشاط بالنظام</span>
                                            <p className="text-[10px] font-bold text-[#105541] font-mono mt-1 animate-pulse">
                                                {selectedUser.lastActive ? new Date(getTimestampMs(selectedUser.lastActive)).toLocaleDateString('ar-EG') : 'نشط مؤخراً'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Account Details Bento Box */}
                                    <div className="bg-[#0a0f0d] p-4.5 rounded-2xl border border-[#105541]/10 space-y-3.5">
                                        <h4 className="text-[10px] font-black text-[#105541] uppercase tracking-wider flex items-center gap-2">
                                            <Shield size={12} />
                                            <span>تفاصيل الملف الشخصي</span>
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
                                            <div className="flex justify-between border-b border-[#105541]/5 pb-2">
                                                <span className="text-gray-500">اسم المستخدم:</span>
                                                <span className="text-white font-mono">@{selectedUser.email ? selectedUser.email.split('@')[0] : 'N/A'}</span>
                                            </div>
                                            <div className="flex justify-between border-b border-[#105541]/5 pb-2">
                                                <span className="text-gray-500">البريد الإلكتروني:</span>
                                                <span className="text-white font-mono">{selectedUser.email || 'غير متوفر'}</span>
                                            </div>
                                            <div className="flex justify-between border-b border-[#105541]/5 pb-2">
                                                <span className="text-gray-500">كلمة المرور الحالية:</span>
                                                <span className="text-white font-mono font-bold select-all bg-[#105541]/10 px-2 py-0.5 rounded-lg border border-[#105541]/20">
                                                    {selectedUser.plainPassword || 'غير متوفرة'}
                                                </span>
                                            </div>
                                            <div className="flex justify-between border-b border-[#105541]/5 pb-2">
                                                <span className="text-gray-500">تاريخ التسجيل:</span>
                                                <span className="text-white font-mono">
                                                    {selectedUser.createdAt ? new Date(getTimestampMs(selectedUser.createdAt)).toLocaleString('ar-EG') : 'غير متوفر'}
                                                </span>
                                            </div>
                                            <div className="flex justify-between border-b border-[#105541]/5 pb-2 md:col-span-2">
                                                <span className="text-gray-500">حالة الصيانة للمستخدم:</span>
                                                <span className={`font-bold ${selectedUser.maintenanceMode ? 'text-amber-500' : 'text-gray-400'}`}>
                                                    {selectedUser.maintenanceMode ? `تحت الصيانة (${selectedUser.maintenanceNote || 'بدون تفاصيل'})` : 'وضع التشغيل الطبيعي'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Controls Panel */}
                                    <div className="bg-[#0a0f0d] p-4 rounded-2xl border border-red-500/10 space-y-3">
                                        <h4 className="text-[10px] font-black text-red-500 uppercase tracking-wider flex items-center gap-2">
                                            <Settings size={12} />
                                            <span>لوحة التحكم المباشرة بالحساب والنشاط</span>
                                        </h4>
                                        
                                        <div className="grid grid-cols-2 gap-2.5">
                                            {/* Block/Unblock Button */}
                                            <button 
                                                onClick={() => {
                                                    if (selectedUser.status === 'blocked') {
                                                        toggleStatus(selectedUser);
                                                    } else {
                                                        const reason = prompt('يرجى كتابة سبب الإيقاف للمستخدم (يظهر له في حسابه):');
                                                        if (reason !== null) toggleStatus(selectedUser, reason);
                                                    }
                                                }}
                                                className={`flex items-center justify-center gap-2 py-3 rounded-xl text-[11px] font-bold transition-all ${
                                                    selectedUser.status === 'blocked'
                                                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                                                    : 'bg-red-500/15 text-red-400 border border-red-500/20 hover:bg-red-500/20'
                                                }`}
                                            >
                                                {selectedUser.status === 'blocked' ? <Unlock size={14} /> : <Lock size={14} />}
                                                {selectedUser.status === 'blocked' ? 'تفعيل وتنشيط الحساب' : 'إيقاف وتعطيل الحساب'}
                                            </button>

                                            {/* Maintenance Mode Button */}
                                            <button 
                                                onClick={() => {
                                                    const note = prompt('ملاحظة وضع الصيانة (تظهر للمستخدم):', selectedUser.maintenanceNote || '');
                                                    if (note !== null) toggleMaintenanceModeUser(selectedUser, note);
                                                }}
                                                className={`flex items-center justify-center gap-2 py-3 rounded-xl text-[11px] font-bold transition-all ${
                                                    selectedUser.maintenanceMode
                                                    ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30'
                                                    : 'bg-gray-800 text-gray-400 border border-white/5 hover:text-white hover:bg-gray-700'
                                                }`}
                                            >
                                                <Zap size={14} />
                                                وضع الصيانة الخاص
                                            </button>

                                            {/* Send Private Developer Notification */}
                                            <button 
                                                onClick={() => {
                                                    const msg = prompt('اكتب الرسالة الخاصة التي تود إرسالها إلى الإشعارات الإدارية للمستخدم (ستظهر له كـ تنبيه عاجل):');
                                                    if (msg && msg.trim()) sendPrivateMessage(selectedUser, msg);
                                                }}
                                                className="col-span-2 flex items-center justify-center gap-2 py-3 bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 rounded-xl text-[11px] font-bold transition-all"
                                            >
                                                <Megaphone size={14} />
                                                إرسال تنبيه إداري خاص إلى لوحة تحكم المعلم
                                            </button>

                                            {/* Permanent Account Purging */}
                                            <button 
                                                onClick={() => deleteUserAccount(selectedUser)}
                                                className="col-span-2 flex items-center justify-center gap-2 py-3 bg-rose-950/20 text-rose-400 border border-rose-500/20 hover:bg-rose-500/30 rounded-xl text-[11px] font-bold transition-all"
                                            >
                                                <AlertTriangle size={14} />
                                                تصفية وحذف الحساب نهائياً من النظام
                                            </button>
                                        </div>
                                    </div>

                                    {/* Associated Circles */}
                                    {userCircles.length > 0 && (
                                        <div className="space-y-2">
                                            <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-wider flex items-center gap-1.5">
                                                <Building2 size={12} />
                                                <span>الحلقات المرتبط بها حالياً ({userCircles.length})</span>
                                            </h4>
                                            <div className="space-y-2">
                                                {userCircles.map(c => (
                                                    <div key={c.id} className="bg-[#0a0f0d] p-3 border border-[#105541]/10 rounded-xl flex items-center justify-between">
                                                        <div>
                                                            <p className="text-[11px] font-black text-white">{c.circle}</p>
                                                            <p className="text-[9px] text-gray-500 mt-0.5">{c.students?.length || 0} طالب مرتبط</p>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className={`text-[8px] px-2 py-0.5 rounded-full font-bold uppercase ${
                                                                c.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                                                            }`}>
                                                                {c.status === 'active' ? 'نشطة' : 'متوقفة'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Activities and Audit Logs */}
                                    <div className="space-y-2">
                                        <h4 className="text-[10px] font-black text-purple-500 uppercase tracking-wider flex items-center gap-1.5">
                                            <History size={12} />
                                            <span>سجل النشاطات البرمجية داخل التطبيق</span>
                                        </h4>
                                        <div className="max-h-48 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                                            {allLogs.filter(l => l.actorId === selectedUser.uid).length > 0 ? (
                                                allLogs.filter(l => l.actorId === selectedUser.uid).map(log => (
                                                    <div key={log.id} className="text-[9.5px] bg-[#0a0f0d] p-3 rounded-xl border border-[#105541]/5 space-y-1">
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-white font-black">{log.action}</span>
                                                            <span className="text-gray-500 font-mono">{new Date(log.createdAt).toLocaleString('ar-EG')}</span>
                                                        </div>
                                                        <p className="text-gray-400 leading-relaxed font-semibold">{log.details}</p>
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="text-[10px] text-gray-500 italic text-center py-6 bg-[#0a0f0d] border border-dashed border-[#105541]/10 rounded-xl">
                                                    لا يوجد نشاطات برمجية مسجلة لهذا الحساب.
                                                </p>
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

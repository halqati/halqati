
import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
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
    X,
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
import { db, collection, query, onSnapshot, doc, updateDoc, getDocs, getDoc, setDoc, deleteDoc, orderBy, limit, serverTimestamp, arrayUnion, deleteField } from '../firebase';
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

    const activeUser = useMemo(() => {
        if (!selectedUser) return null;
        return users.find(u => u.uid === selectedUser.uid) || selectedUser;
    }, [selectedUser, users]);

    // Circle Details Sub-view
    const [selectedCircle, setSelectedCircle] = useState<CircleData | null>(null);

    const activeCircle = useMemo(() => {
        if (!selectedCircle) return null;
        return circles.find(c => c.id === selectedCircle.id) || selectedCircle;
    }, [selectedCircle, circles]);

    // Custom non-blocking interactive action dialog states
    const [actionDialog, setActionDialog] = useState<{
        isOpen: boolean;
        type: 'confirm' | 'input' | 'dual-input';
        title: string;
        description: string;
        isDanger?: boolean;
        label1?: string;
        placeholder1?: string;
        defaultValue1?: string;
        label2?: string;
        placeholder2?: string;
        defaultValue2?: string;
        onConfirm: (val1: string, val2: string) => Promise<void>;
    }>({
        isOpen: false,
        type: 'confirm',
        title: '',
        description: '',
        onConfirm: async () => {}
    });
    const [actionVal1, setActionVal1] = useState('');
    const [actionVal2, setActionVal2] = useState('');
    const [isSubmittingAction, setIsSubmittingAction] = useState(false);

    // Track active loading states for specific circle operations
    const [loadingCircleActions, setLoadingCircleActions] = useState<{[key: string]: boolean}>({});

    const openActionDialog = (config: {
        type: 'confirm' | 'input' | 'dual-input';
        title: string;
        description: string;
        isDanger?: boolean;
        label1?: string;
        placeholder1?: string;
        defaultValue1?: string;
        label2?: string;
        placeholder2?: string;
        defaultValue2?: string;
        onConfirm: (val1: string, val2: string) => Promise<void>;
    }) => {
        setActionVal1(config.defaultValue1 || '');
        setActionVal2(config.defaultValue2 || '');
        setActionDialog({
            isOpen: true,
            ...config
        });
    };

    const handleConfirmAction = async () => {
        setIsSubmittingAction(true);
        try {
            await actionDialog.onConfirm(actionVal1, actionVal2);
            setActionDialog(prev => ({ ...prev, isOpen: false }));
        } catch (error: any) {
            console.error("Action dialog error:", error);
            addToast('❌ فشل تنفيذ الإجراء الإداري: ' + (error.message || error), 'error');
        } finally {
            setIsSubmittingAction(false);
        }
    };

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

    // Advanced Developer Notifications states
    const [developerNotifications, setDeveloperNotifications] = useState<any[]>([]);
    const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
    const [isEditingNotification, setIsEditingNotification] = useState<boolean>(false);
    const [editingNotificationId, setEditingNotificationId] = useState<string | null>(null);
    const [showPreview, setShowPreview] = useState<boolean>(false);

    // Form states for advanced notification creation/edit
    const [notifTitle, setNotifTitle] = useState('');
    const [notifDescription, setNotifDescription] = useState('');
    const [notifType, setNotifType] = useState<'info' | 'warning' | 'danger' | 'success' | 'special' | 'special_white' | 'seasonal' | 'update' | 'maintenance' | 'announcement' | 'alert' | 'note'>('info');
    const [notifImageUrls, setNotifImageUrls] = useState<string>(''); // Comma-separated or newline-separated image URLs
    const [notifIsMandatory, setNotifIsMandatory] = useState(false);
    const [notifIsClosable, setNotifIsClosable] = useState(true);
    const [notifDisappearAfterRead, setNotifDisappearAfterRead] = useState(false);
    
    // Advanced targeting states
    const [notifTargetType, setNotifTargetType] = useState<'all' | 'circles' | 'users'>('all');
    const [notifTargetCircleIds, setNotifTargetCircleIds] = useState<string[]>([]);
    const [notifExcludeCircleIds, setNotifExcludeCircleIds] = useState<string[]>([]);
    const [notifTargetUids, setNotifTargetUids] = useState<string[]>([]);
    
    // Scheduling & Expiry states
    const [notifScheduledAt, setNotifScheduledAt] = useState<string>(''); // datetime-local
    const [notifExpiresAt, setNotifExpiresAt] = useState<string>(''); // datetime-local
    
    // Customizable buttons state
    const [notifButtons, setNotifButtons] = useState<any[]>([]); // Array of { id: string, text: string, action: string, link?: string, page?: string }

    // Helpers to clear form
    const resetNotificationForm = () => {
        setNotifTitle('');
        setNotifDescription('');
        setNotifType('info');
        setNotifImageUrls('');
        setNotifIsMandatory(false);
        setNotifIsClosable(true);
        setNotifDisappearAfterRead(false);
        setNotifTargetType('all');
        setNotifTargetCircleIds([]);
        setNotifExcludeCircleIds([]);
        setNotifTargetUids([]);
        setNotifScheduledAt('');
        setNotifExpiresAt('');
        setNotifButtons([]);
        setIsEditingNotification(false);
        setEditingNotificationId(null);
    };

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

        const unsubscribeDevNotifications = onSnapshot(collection(db, 'developer_notifications'), (snapshot) => {
            setDeveloperNotifications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        return () => {
            unsubscribeUsers();
            unsubscribeCircles();
            unsubscribeManagements();
            unsubscribeLogs();
            unsubscribeSettings();
            unsubscribeDevNotifications();
        };
    }, []);

    const toggleStatus = async (user: UserProfile, reason?: string) => {
        const newStatus = user.status === 'blocked' ? 'active' : 'blocked';
        try {
            await updateDoc(doc(db, 'users', user.uid), { 
                status: newStatus,
                blockedReason: reason || '',
                ...(newStatus === 'blocked' ? { forceLogout: true } : {})
            });

            // If blocking, suspend user's circles ONLY if suspendCirclesOnBlock is active
            if (newStatus === 'blocked') {
                if (user.suspendCirclesOnBlock) {
                    const userCirclesToSuspend = circles.filter(c => c.authorizedUserIds?.includes(user.uid));
                    for (const circle of userCirclesToSuspend) {
                        await updateDoc(doc(db, 'circles', circle.id), { 
                            status: 'inactive',
                            suspendedByTeacherUid: user.uid,
                            suspendedByTeacherReason: reason || 'تم إيقاف حساب المشرف/المعلم المسؤول عن هذه الحلقة'
                        });
                    }
                }
            } else if (newStatus === 'active') {
                // When re-enabling, automatically restore circles that were suspended because of this teacher
                const userCirclesToRestore = circles.filter(c => c.suspendedByTeacherUid === user.uid);
                for (const circle of userCirclesToRestore) {
                    await updateDoc(doc(db, 'circles', circle.id), { 
                        status: 'active',
                        suspendedByTeacherUid: deleteField(),
                        suspendedByTeacherReason: deleteField()
                    });
                }
            }

            addToast(`تم ${newStatus === 'blocked' ? 'إيقاف وطرد' : 'تفعيل'} الحساب بنجاح`, 'success');
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
        // Optimistically set deleted status to trigger reactive logouts
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
    };

    const toggleMaintenanceMode = async (circleId: string, current: boolean) => {
        setLoadingCircleActions(prev => ({ ...prev, [`${circleId}-maintenance`]: true }));
        try {
            await updateDoc(doc(db, 'circles', circleId), { isMaintenance: !current });
            addToast(`تم ${!current ? 'تفعيل' : 'إلغاء'} وضع الصيانة بنجاح`, 'info');
        } catch (error) {
            console.error("Error setting maintenance mode:", error);
            addToast('فشل تحديث وضع الصيانة', 'error');
        } finally {
            setLoadingCircleActions(prev => ({ ...prev, [`${circleId}-maintenance`]: false }));
        }
    };

    const toggleCircleStatus = async (circleId: string, currentStatus: string) => {
        setLoadingCircleActions(prev => ({ ...prev, [`${circleId}-status`]: true }));
        const newStatus = currentStatus === 'inactive' ? 'active' : 'inactive';
        try {
            await updateDoc(doc(db, 'circles', circleId), { status: newStatus });
            addToast(`تم ${newStatus === 'inactive' ? 'تعطيل' : 'تفعيل'} الحلقة بنجاح`, 'success');
        } catch (error) {
            console.error("Error setting circle status:", error);
            addToast('فشل تحديث حالة الحلقة', 'error');
        } finally {
            setLoadingCircleActions(prev => ({ ...prev, [`${circleId}-status`]: false }));
        }
    };

    const forceLogoutUser = async (user: UserProfile) => {
        await updateDoc(doc(db, 'users', user.uid), { forceLogout: true });
        addToast('🔒 تم إرسال أمر تسجيل الخروج الإجباري للمستخدم بنجاح!', 'success');
    };

    const changeUserRole = async (user: UserProfile, newRole: 'teacher' | 'admin' | 'superadmin' | 'manager' | 'developer') => {
        await updateDoc(doc(db, 'users', user.uid), { role: newRole });
        addToast(`⚙️ تم تغيير رتبة المستخدم إلى ${newRole === 'developer' ? 'مطور' : newRole === 'manager' ? 'مشرف' : 'معلم'} بنجاح!`, 'success');
        if (selectedUser?.uid === user.uid) {
            setSelectedUser({ ...selectedUser, role: newRole });
        }
    };

    const toggleCircleStop = async (circleId: string, current: boolean) => {
        setLoadingCircleActions(prev => ({ ...prev, [`${circleId}-stop`]: true }));
        try {
            await updateDoc(doc(db, 'circles', circleId), { isStopped: !current });
            addToast(`تم ${!current ? 'إيقاف نشاط' : 'استئناف نشاط'} الحلقة بنجاح`, 'success');
        } catch (error) {
            console.error("Error toggling circle stop state:", error);
            addToast('فشل تحديث حالة إيقاف الحلقة', 'error');
        } finally {
            setLoadingCircleActions(prev => ({ ...prev, [`${circleId}-stop`]: false }));
        }
    };

    const sendCircleDeveloperNotification = async (circleId: string, circleName: string, title: string, message: string) => {
        const notifId = 'circle_dev_notif_' + Date.now();
        await setDoc(doc(db, 'developer_notifications', notifId), {
            id: notifId,
            title: title.trim(),
            description: message.trim(),
            type: 'alert',
            active: true,
            targetType: 'circles',
            targetCircleIds: [circleId],
            isClosable: true,
            isMandatory: false,
            createdAt: Date.now(),
            stats: {
                delivered: [],
                viewed: [],
                closed: [],
                buttonClicks: {}
            }
        });
        addToast('🚀 تم نشر الإعلان العاجل لحلقة ' + circleName + ' بنجاح وسيظهر للجميع فوراً!', 'success');
    };

    const sendUserDeveloperNotification = async (user: UserProfile, title: string, message: string) => {
        const notifId = 'user_dev_notif_' + Date.now();
        await setDoc(doc(db, 'developer_notifications', notifId), {
            id: notifId,
            title: title.trim(),
            description: message.trim(),
            type: 'warning',
            active: true,
            targetType: 'users',
            targetUids: [user.uid],
            isClosable: true,
            isMandatory: false,
            createdAt: Date.now(),
            stats: {
                delivered: [],
                viewed: [],
                closed: [],
                buttonClicks: {}
            }
        });
        addToast('🚀 تم إرسال الإشعار العاجل المنبثق بنجاح!', 'success');
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

    const processedCircles = useMemo(() => {
        if (!searchQuery.trim()) return circles;
        const queryLower = searchQuery.toLowerCase().trim();
        return circles.filter(c => 
            c.circle?.toLowerCase().includes(queryLower) ||
            c.teacher?.toLowerCase().includes(queryLower) ||
            c.town?.toLowerCase().includes(queryLower) ||
            c.numericId?.toLowerCase().includes(queryLower) ||
            c.id?.toLowerCase().includes(queryLower)
        );
    }, [circles, searchQuery]);

    // Save or Edit advanced developer notification
    const handleSaveNotification = async () => {
        if (!notifTitle.trim()) {
            addToast('⚠️ يرجى كتابة عنوان الإشعار', 'error');
            return;
        }
        if (!notifDescription.trim()) {
            addToast('⚠️ يرجى كتابة وصف الإشعار', 'error');
            return;
        }

        // Parse image URLs safely
        const urls = notifImageUrls
            .split(/[\n,]+/)
            .map(url => url.trim())
            .filter(url => url.length > 0);

        const docId = isEditingNotification && editingNotificationId 
            ? editingNotificationId 
            : 'dev_notif_' + Date.now();

        const notifData: any = {
            id: docId,
            title: notifTitle.trim(),
            description: notifDescription.trim(),
            type: notifType,
            imageUrl: urls[0] || '',
            imageUrls: urls,
            isMandatory: notifIsMandatory,
            isClosable: notifIsClosable,
            disappearAfterRead: notifDisappearAfterRead,
            targetType: notifTargetType,
            targetCircleIds: notifTargetType === 'circles' ? notifTargetCircleIds : [],
            excludeCircleIds: notifExcludeCircleIds,
            targetUids: notifTargetType === 'users' ? notifTargetUids : [],
            scheduledAt: notifScheduledAt ? new Date(notifScheduledAt).getTime() : null,
            expiresAt: notifExpiresAt ? new Date(notifExpiresAt).getTime() : null,
            endDate: notifExpiresAt || '',
            startDate: notifScheduledAt || '',
            buttons: notifButtons,
            active: true,
            createdAt: Date.now()
        };

        if (!isEditingNotification) {
            notifData.stats = {
                delivered: [],
                viewed: [],
                closed: [],
                buttonClicks: {}
            };
        }

        try {
            await setDoc(doc(db, 'developer_notifications', docId), notifData, { merge: true });
            addToast(isEditingNotification ? '🚀 تم تحديث الإشعار بنجاح!' : '🚀 تم نشر الإشعار بنجاح!', 'success');
            setIsNotificationModalOpen(false);
            resetNotificationForm();
        } catch (e) {
            console.error("Error saving notification:", e);
            addToast('❌ فشل حفظ الإشعار.', 'error');
        }
    };

    // Toggle active status
    const handleToggleNotificationActive = async (id: string, currentStatus: boolean) => {
        try {
            await updateDoc(doc(db, 'developer_notifications', id), {
                active: !currentStatus
            });
            addToast(`تم ${!currentStatus ? 'تفعيل' : 'إيقاف'} الإشعار بنجاح.`, 'success');
        } catch (e) {
            console.error("Error toggling notification status:", e);
            addToast('❌ فشل تغيير حالة الإشعار', 'error');
        }
    };

    // Delete notification
    const handleDeleteNotification = async (id: string) => {
        if (!window.confirm('هل أنت متأكد من رغبتك في حذف هذا الإشعار بشكل نهائي؟')) return;
        try {
            await deleteDoc(doc(db, 'developer_notifications', id));
            addToast('🗑️ تم حذف الإشعار بنجاح.', 'success');
        } catch (e) {
            console.error("Error deleting notification:", e);
            addToast('❌ فشل حذف الإشعار', 'error');
        }
    };

    // Prepare form for editing
    const handleEditNotification = (notif: any) => {
        setNotifTitle(notif.title || '');
        setNotifDescription(notif.description || '');
        setNotifType(notif.type || 'info');
        setNotifImageUrls((notif.imageUrls || (notif.imageUrl ? [notif.imageUrl] : [])).join(', '));
        setNotifIsMandatory(!!notif.isMandatory);
        setNotifIsClosable(notif.isClosable !== false);
        setNotifDisappearAfterRead(!!notif.disappearAfterRead);
        setNotifTargetType(notif.targetType || 'all');
        setNotifTargetCircleIds(notif.targetCircleIds || []);
        setNotifExcludeCircleIds(notif.excludeCircleIds || []);
        setNotifTargetUids(notif.targetUids || []);
        
        if (notif.scheduledAt) {
            const date = new Date(notif.scheduledAt);
            const tzoffset = date.getTimezoneOffset() * 60000;
            const localISOTime = (new Date(date.getTime() - tzoffset)).toISOString().slice(0, 16);
            setNotifScheduledAt(localISOTime);
        } else {
            setNotifScheduledAt('');
        }
        
        if (notif.expiresAt) {
            const date = new Date(notif.expiresAt);
            const tzoffset = date.getTimezoneOffset() * 60000;
            const localISOTime = (new Date(date.getTime() - tzoffset)).toISOString().slice(0, 16);
            setNotifExpiresAt(localISOTime);
        } else {
            setNotifExpiresAt('');
        }
        
        setNotifButtons(notif.buttons || []);
        
        setIsEditingNotification(true);
        setEditingNotificationId(notif.id);
        setIsNotificationModalOpen(true);
    };

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
                                                                <span className="font-mono">اسم المستخدم: @{username} • كلمة المرور: {user.plainPassword || '12345678'} • معرّف: {user.uid}</span>
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

                            {activeTab === 'users' && selectedUser && activeUser && (
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
                                            {activeUser.photoURL ? (
                                                <img 
                                                    src={activeUser.photoURL} 
                                                    alt="" 
                                                    referrerPolicy="no-referrer"
                                                    className="w-10 h-10 rounded-xl object-cover border border-[#105541]/20"
                                                />
                                            ) : (
                                                <div className="w-10 h-10 bg-[#105541]/10 text-[#105541] rounded-xl flex items-center justify-center font-black text-xs border border-[#105541]/20">
                                                    {(activeUser.displayName || '؟')[0]}
                                                </div>
                                            )}
                                            <div>
                                                <h3 className="text-xs font-black text-white">{activeUser.displayName}</h3>
                                                <p className="text-[9px] text-gray-500 font-mono mt-0.5">{activeUser.email}</p>
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
                                                {activeUser.lastLogin ? new Date(getTimestampMs(activeUser.lastLogin)).toLocaleDateString('ar-EG') : 'غير متوفر'}
                                            </p>
                                        </div>
                                        <div className="bg-[#0a0f0d] p-3.5 rounded-2xl border border-[#105541]/10">
                                            <span className="text-[9px] text-gray-500 uppercase font-black block mb-1">آخر نشاط بالنظام</span>
                                            <p className="text-[10px] font-bold text-[#105541] font-mono mt-1 animate-pulse">
                                                {activeUser.lastActive ? new Date(getTimestampMs(activeUser.lastActive)).toLocaleDateString('ar-EG') : 'نشط مؤخراً'}
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
                                                <span className="text-white font-mono">@{activeUser.email ? activeUser.email.split('@')[0] : 'N/A'}</span>
                                            </div>
                                            <div className="flex justify-between border-b border-[#105541]/5 pb-2">
                                                <span className="text-gray-500">البريد الإلكتروني:</span>
                                                <span className="text-white font-mono">{activeUser.email || 'غير متوفر'}</span>
                                            </div>
                                            <div className="flex justify-between border-b border-[#105541]/5 pb-2">
                                                <span className="text-gray-500">كلمة المرور الحالية:</span>
                                                <span className="text-white font-mono font-bold select-all bg-[#105541]/10 px-2 py-0.5 rounded-lg border border-[#105541]/20">
                                                    {activeUser.plainPassword || 'غير متوفرة'}
                                                </span>
                                            </div>
                                            <div className="flex justify-between border-b border-[#105541]/5 pb-2">
                                                <span className="text-gray-500">تاريخ التسجيل:</span>
                                                <span className="text-white font-mono">
                                                    {activeUser.createdAt ? new Date(getTimestampMs(activeUser.createdAt)).toLocaleString('ar-EG') : 'غير متوفر'}
                                                </span>
                                            </div>
                                            <div className="flex justify-between border-b border-[#105541]/5 pb-2 md:col-span-2">
                                                <span className="text-gray-500">حالة الصيانة للمستخدم:</span>
                                                <span className={`font-bold ${activeUser.maintenanceMode ? 'text-amber-500' : 'text-gray-400'}`}>
                                                    {activeUser.maintenanceMode ? `تحت الصيانة (${activeUser.maintenanceNote || 'بدون تفاصيل'})` : 'وضع التشغيل الطبيعي'}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center border-b border-[#105541]/5 pb-2 md:col-span-2">
                                                <span className="text-gray-500">إيقاف الحلقات عند تعطيل الحساب:</span>
                                                <button 
                                                    onClick={async () => {
                                                        const currentVal = !!activeUser.suspendCirclesOnBlock;
                                                        await updateDoc(doc(db, 'users', activeUser.uid), { 
                                                            suspendCirclesOnBlock: !currentVal 
                                                        });
                                                        addToast(`تم تحديث خيار ربط الحلقات ليكون [${!currentVal ? 'مفعل' : 'معطل'}]`, 'success');
                                                        setSelectedUser({ ...activeUser, suspendCirclesOnBlock: !currentVal });
                                                    }}
                                                    className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${
                                                        activeUser.suspendCirclesOnBlock 
                                                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-black' 
                                                        : 'bg-gray-800 text-gray-400 border border-white/5 hover:text-white'
                                                    }`}
                                                >
                                                    {activeUser.suspendCirclesOnBlock ? 'مفعّل تلقائياً (الحلقات ستتأثر) ✅' : 'معطّل (الحلقات لن تتأثر) ❌'}
                                                </button>
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
                                                    if (activeUser.status === 'blocked') {
                                                        openActionDialog({
                                                            type: 'confirm',
                                                            title: 'تفعيل وتنشيط حساب المعلم',
                                                            description: `هل أنت متأكد تماماً من تفعيل وإعادة تنشيط حساب المعلم "${activeUser.displayName || 'بدون اسم'}"؟ سيتمكن من تسجيل الدخول فوراً واستئناف مهامه.`,
                                                            onConfirm: async () => {
                                                                await toggleStatus(activeUser);
                                                            }
                                                        });
                                                     } else {
                                                         openActionDialog({
                                                             type: 'input',
                                                             title: 'إيقاف وتعطيل حساب المعلم',
                                                             description: `أنت بصدد تعطيل حساب المعلم "${activeUser.displayName || 'بدون اسم'}" وطرد جلسته. يرجى كتابة سبب الإيقاف والتعطيل (سيظهر له عند محاولة الدخول):`,
                                                             label1: 'سبب الإيقاف والتعطيل:',
                                                             placeholder1: 'اكتب سبب الإيقاف هنا ليظهر للمستخدم...',
                                                             isDanger: true,
                                                             onConfirm: async (reason) => {
                                                                 await toggleStatus(activeUser, reason);
                                                             }
                                                         });
                                                     }
                                                }}
                                                className={`flex items-center justify-center gap-2 py-3 rounded-xl text-[11px] font-bold transition-all ${
                                                    activeUser.status === 'blocked'
                                                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                                                    : 'bg-red-500/15 text-red-400 border border-red-500/20 hover:bg-red-500/20'
                                                }`}
                                            >
                                                {activeUser.status === 'blocked' ? <Unlock size={14} /> : <Lock size={14} />}
                                                {activeUser.status === 'blocked' ? 'تفعيل وتنشيط الحساب' : 'إيقاف وتعطيل الحساب'}
                                            </button>

                                            {/* Maintenance Mode Button */}
                                            <button 
                                                onClick={() => {
                                                    if (activeUser.maintenanceMode) {
                                                        openActionDialog({
                                                            type: 'confirm',
                                                            title: 'إلغاء وضع الصيانة للحساب',
                                                            description: `هل تريد إلغاء وضع الصيانة لـ "${activeUser.displayName || 'المعلم'}" وإعادة الحساب للوضع الطبيعي؟`,
                                                            onConfirm: async () => {
                                                                await toggleMaintenanceModeUser(activeUser);
                                                            }
                                                        });
                                                    } else {
                                                        openActionDialog({
                                                            type: 'input',
                                                            title: 'تفعيل وضع الصيانة الخاص بالحساب',
                                                            description: `عند وضع حساب "${activeUser.displayName || 'المعلم'}" تحت الصيانة، لن يتمكن من إجراء أي تعديل للبيانات. يرجى كتابة ملاحظة الصيانة لعرضها له:`,
                                                            label1: 'ملاحظة أو رسالة وضع الصيانة:',
                                                            placeholder1: 'مثال: جاري تحديث ومراجعة حسابكم حالياً، سنعود قريباً...',
                                                            defaultValue1: activeUser.maintenanceNote || '',
                                                            onConfirm: async (note) => {
                                                                await toggleMaintenanceModeUser(activeUser, note);
                                                            }
                                                        });
                                                    }
                                                }}
                                                className={`flex items-center justify-center gap-2 py-3 rounded-xl text-[11px] font-bold transition-all ${
                                                    activeUser.maintenanceMode
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
                                                    openActionDialog({
                                                        type: 'input',
                                                        title: 'إرسال تنبيه إداري خاص إلى لوحة التحكم',
                                                        description: `أدخل نص التنبيه الإداري المباشر للمعلم "${activeUser.displayName || 'بدون اسم'}":`,
                                                        label1: 'مضمون التنبيه الخاص:',
                                                        placeholder1: 'مثال: يرجى استكمال تصحيح بيانات الطلبة في حلقة جابر بن حيان...',
                                                        onConfirm: async (val) => {
                                                            if (!val.trim()) {
                                                                addToast('يرجى كتابة نص التنبيه', 'error');
                                                                throw new Error('التنبيه فارغ');
                                                            }
                                                            await sendPrivateMessage(activeUser, val);
                                                        }
                                                    });
                                                }}
                                                className="col-span-2 flex items-center justify-center gap-2 py-3 bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 rounded-xl text-[11px] font-bold transition-all"
                                            >
                                                <Megaphone size={14} />
                                                إرسال تنبيه إداري خاص إلى لوحة تحكم المعلم
                                            </button>

                                            {/* Permanent Account Purging */}
                                            <button 
                                                onClick={() => {
                                                    openActionDialog({
                                                        type: 'confirm',
                                                        title: 'تصفية وحذف الحساب نهائياً',
                                                        description: `⚠️ تحذير شديد الخطورة:\nهل أنت متأكد تماماً من حذف حساب المعلم "${activeUser.displayName || 'بدون اسم'}" نهائياً وتصفية ارتباطاته وحلقاته؟ هذا الإجراء غير قابل للتراجع نهائياً وسيتم طرده فوراً وتصفية بياناته!`,
                                                        isDanger: true,
                                                        onConfirm: async () => {
                                                            await deleteUserAccount(activeUser);
                                                        }
                                                    });
                                                }}
                                                className="col-span-2 flex items-center justify-center gap-2 py-3 bg-rose-950/20 text-rose-400 border border-rose-500/20 hover:bg-rose-500/30 rounded-xl text-[11px] font-bold transition-all"
                                            >
                                                <AlertTriangle size={14} />
                                                تصفية وحذف الحساب نهائياً من النظام
                                            </button>
                                        </div>
                                    </div>

                                    {/* Quick Admin Commands Console */}
                                    <div className="bg-[#0a0f0d] p-4.5 rounded-2xl border border-blue-500/15 space-y-3 text-right" dir="rtl">
                                        <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-wider flex items-center gap-2">
                                            <Shield size={12} className="text-blue-400 animate-pulse" />
                                            <span>لوحة تنفيذ أوامر الإدارة العاجلة (فوري ومباشر)</span>
                                        </h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px]">
                                            <button 
                                                onClick={() => {
                                                    openActionDialog({
                                                        type: 'confirm',
                                                        title: 'طرد فوري وتسجيل خروج إجباري',
                                                        description: `هل أنت متأكد من إجبار المستخدم "${activeUser.displayName || 'المعلم'}" على تسجيل الخروج فوراً؟ سيتم قطع جلسته وإنهاء صلاحية دخوله في الحال.`,
                                                        isDanger: true,
                                                        onConfirm: async () => {
                                                            await forceLogoutUser(activeUser);
                                                        }
                                                    });
                                                }}
                                                className="bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 py-2.5 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all"
                                            >
                                                <span>🔒 طرد فوري وتسجيل خروج إجباري</span>
                                            </button>
                                            <button 
                                                onClick={() => {
                                                    openActionDialog({
                                                        type: 'dual-input',
                                                        title: 'إرسال إشعار مطور عاجل منبثق',
                                                        description: `أدخل العنوان ونص الإشعار العاجل للمستخدم "${activeUser.displayName || 'المعلم'}" الذي سيمنعه من الاستخدام حتى يغلقه:`,
                                                        label1: 'عنوان الإشعار:',
                                                        placeholder1: 'تنبيه إداري عاجل',
                                                        defaultValue1: 'تنبيه إداري عاجل',
                                                        label2: 'نص الإشعار:',
                                                        placeholder2: 'اكتب الرسالة التحذيرية هنا...',
                                                        onConfirm: async (title, message) => {
                                                            if (!title.trim() || !message.trim()) {
                                                                addToast('يرجى كتابة العنوان والرسالة', 'error');
                                                                throw new Error('حقول فارغة');
                                                            }
                                                            await sendUserDeveloperNotification(activeUser, title, message);
                                                        }
                                                    });
                                                }}
                                                className="bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20 py-2.5 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all"
                                            >
                                                <span>📢 إرسال إشعار مطور عاجل منبثق</span>
                                            </button>
                                            <button 
                                                onClick={() => {
                                                    const currentRole = activeUser.role || 'teacher';
                                                    const roleMap: any = { teacher: 'معلم', manager: 'مشرف', developer: 'مطور' };
                                                    const nextRole: 'teacher' | 'manager' | 'developer' = currentRole === 'teacher' ? 'manager' : currentRole === 'manager' ? 'developer' : 'teacher';
                                                    
                                                    openActionDialog({
                                                        type: 'confirm',
                                                        title: 'تغيير رتبة وصلاحيات الحساب',
                                                        description: `هل أنت متأكد من تغيير رتبة المستخدم من [${roleMap[currentRole] || currentRole}] إلى الرتبة الجديدة [${roleMap[nextRole]}]؟ سيتم تحديث الصلاحيات فوراً.`,
                                                        onConfirm: async () => {
                                                            await changeUserRole(activeUser, nextRole);
                                                        }
                                                    });
                                                }}
                                                className="bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 py-2.5 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all"
                                            >
                                                <span>⚙️ ترقية / تعديل الصلاحيات والرتبة</span>
                                            </button>
                                            <button 
                                                onClick={() => {
                                                    openActionDialog({
                                                        type: 'confirm',
                                                        title: 'تصفير كلمة مرور الحساب',
                                                        description: `هل أنت متأكد من تصفير كلمة مرور حساب المعلم "${activeUser.displayName || 'المعلم'}" لتصبح "12345678"؟`,
                                                        onConfirm: async () => {
                                                            await updateDoc(doc(db, 'users', activeUser.uid), { plainPassword: '12345678' });
                                                            addToast('🔑 تم تصفير كلمة المرور وتعيينها بنجاح إلى 12345678', 'success');
                                                            setSelectedUser({ ...activeUser, plainPassword: '12345678' });
                                                        }
                                                    });
                                                }}
                                                className="bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 py-2.5 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all"
                                            >
                                                <span>🔑 تصفير كلمة المرور إلى 12345678</span>
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
                                            {allLogs.filter(l => l.actorId === activeUser.uid).length > 0 ? (
                                                allLogs.filter(l => l.actorId === activeUser.uid).map(log => (
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

                            {activeTab === 'circles' && !selectedCircle && (
                                <div className="space-y-4">
                                    {/* Circle search and filter */}
                                    <div className="bg-[#0a0f0d] border border-[#105541]/10 p-4 rounded-2xl space-y-3">
                                        <div className="relative">
                                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                            <input 
                                                type="text" 
                                                placeholder="بحث باسم الحلقة، المعلم، المركز، أو المعرّف (ID)..." 
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className="w-full bg-[#050807] border border-[#105541]/20 rounded-xl py-2.5 pr-9 pl-3 text-xs outline-none focus:ring-1 focus:ring-[#105541] text-white font-medium font-sans"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-3">
                                        {processedCircles.map(circle => (
                                            <div key={circle.id} className="bg-[#050807] border border-[#105541]/10 p-3 rounded-xl relative">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div 
                                                        className="flex items-center gap-2 cursor-pointer transition-all hover:translate-x-1"
                                                        onClick={() => setSelectedCircle(circle)}
                                                    >
                                                        <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center text-blue-500">
                                                            <Box size={16} />
                                                        </div>
                                                        <div>
                                                            <h4 className="text-[11px] font-bold text-white flex items-center gap-1.5 hover:text-blue-400 transition-colors">
                                                                {circle.circle}
                                                                <span className="text-[8px] bg-blue-500/10 text-blue-400 px-1 py-0.2 rounded font-mono font-bold">#{circle.numericId}</span>
                                                            </h4>
                                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                                <p className="text-[9px] text-gray-400">المعلم: {circle.teacher}</p>
                                                                {circle.town && (
                                                                    <div className="flex items-center gap-0.5 text-[8px] text-gray-500 bg-gray-800/50 px-1 rounded-sm">
                                                                        <MapPin size={8} /> {circle.town}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1 flex-wrap">
                                                        {/* Activity status (تعطيل/تفعيل) */}
                                                        <button 
                                                            disabled={loadingCircleActions[`${circle.id}-status`]}
                                                            onClick={() => toggleCircleStatus(circle.id, circle.status || 'active')}
                                                            className={`text-[9px] font-bold px-2 py-1 rounded-lg border transition-all flex items-center gap-1 ${
                                                                circle.status === 'inactive' ? 'bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20'
                                                            } disabled:opacity-50`}
                                                        >
                                                            {loadingCircleActions[`${circle.id}-status`] && <RefreshCw size={8} className="animate-spin" />}
                                                            {circle.status === 'inactive' ? 'تفعيل' : 'تعطيل'}
                                                        </button>

                                                        {/* Stop/Resume (إيقاف/استئناف) */}
                                                        <button 
                                                            disabled={loadingCircleActions[`${circle.id}-stop`]}
                                                            onClick={() => toggleCircleStop(circle.id, circle.isStopped || false)}
                                                            className={`text-[9px] font-bold px-2 py-1 rounded-lg border transition-all flex items-center gap-1 ${
                                                                circle.isStopped ? 'bg-rose-500/20 text-rose-400 border-rose-500/30 font-black' : 'bg-gray-800 text-gray-400 border-gray-700 hover:text-white'
                                                            } disabled:opacity-50`}
                                                        >
                                                            {loadingCircleActions[`${circle.id}-stop`] && <RefreshCw size={8} className="animate-spin" />}
                                                            {circle.isStopped ? 'موقوفة ⚠️' : 'إيقاف'}
                                                        </button>

                                                        {/* Maintenance (صيانة) */}
                                                        <button 
                                                            disabled={loadingCircleActions[`${circle.id}-maintenance`]}
                                                            onClick={() => toggleMaintenanceMode(circle.id, circle.isMaintenance || false)}
                                                            className={`text-[9px] font-bold px-2 py-1 rounded-lg border flex items-center gap-1 transition-all ${
                                                                circle.isMaintenance ? 'bg-amber-500/20 text-amber-500 border-amber-500/20' : 'bg-gray-800 text-gray-500 border-gray-700 hover:text-white'
                                                             } disabled:opacity-50`}
                                                        >
                                                            {loadingCircleActions[`${circle.id}-maintenance`] ? <RefreshCw size={8} className="animate-spin" /> : <Zap size={10} className={circle.isMaintenance ? "" : "opacity-30"} />}
                                                            صيانة
                                                        </button>

                                                        {/* Send direct notification */}
                                                        <button 
                                                            onClick={() => {
                                                                openActionDialog({
                                                                    type: 'dual-input',
                                                                    title: `إرسال إشعار عاجل لحلقة: ${circle.circle || 'الحلقة'}`,
                                                                    description: `أدخل العنوان وتفاصيل التنبيه العاجل الذي تود توجيهه لجميع معلمي وطلبة حلقة "${circle.circle || 'الحلقة'}":`,
                                                                    label1: 'عنوان الإشعار للحلقة:',
                                                                    placeholder1: 'تنبيه إداري من المطور',
                                                                    defaultValue1: 'تنبيه إداري من المطور',
                                                                    label2: 'نص الإشعار:',
                                                                    placeholder2: 'اكتب تفاصيل التنبيه هنا...',
                                                                    onConfirm: async (title, msg) => {
                                                                        if (!title.trim() || !msg.trim()) {
                                                                            addToast('يرجى كتابة العنوان والرسالة', 'error');
                                                                            throw new Error('حقول فارغة');
                                                                        }
                                                                        await sendCircleDeveloperNotification(circle.id, circle.circle || 'الحلقة', title, msg);
                                                                    }
                                                                });
                                                            }}
                                                            className="text-[9px] font-bold px-2 py-1 rounded-lg border bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20 flex items-center gap-1 transition-all"
                                                        >
                                                            <Megaphone size={10} />
                                                            إشعار
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Credentials Diagnostics Block (ALWAYS DISPLAYED clearly and directly) */}
                                                <div className="mt-2.5 p-2 bg-gray-900/40 rounded-xl border border-[#105541]/15 space-y-1 text-[10px]">
                                                    <div className="flex justify-between gap-4">
                                                        <span className="text-gray-500 font-bold">معرّف الحلقة (ID):</span>
                                                        <span className="font-mono text-gray-300 select-all">{circle.id}</span>
                                                    </div>
                                                    <div className="flex justify-between gap-4">
                                                        <span className="text-gray-500 font-bold">اسم المستخدم (المعرف الرقمي):</span>
                                                        <span className="font-mono text-gray-300 select-all">{circle.numericId || 'لا يوجد'}</span>
                                                    </div>
                                                    <div className="flex justify-between gap-4">
                                                        <span className="text-gray-500 font-bold">البريد الإلكتروني للربط:</span>
                                                        <span className="font-mono text-gray-300 select-all">{circle.numericId ? `${circle.numericId}@quran.app` : 'لا يوجد'}</span>
                                                    </div>
                                                    <div className="flex justify-between gap-4">
                                                        <span className="text-gray-500 font-bold text-emerald-500">كلمة المرور الحالية:</span>
                                                        <span className="font-mono text-blue-400 font-black select-all bg-[#105541]/5 px-1.5 py-0.2 rounded border border-[#105541]/10">
                                                            {circle.transferPassword || circle.transferCode || '1234'}
                                                        </span>
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
                                                        <button 
                                                            onClick={() => setSelectedCircle(circle)}
                                                            className="text-[8.5px] font-black text-blue-400 hover:text-blue-300 bg-blue-500/5 hover:bg-blue-500/10 px-2 py-1 rounded border border-blue-500/10 transition-all active:scale-95"
                                                        >
                                                            عرض لوحة التحكم بالتفصيل ⚙️
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="mt-2 flex items-center justify-between border-t border-[#105541]/5 pt-2">
                                                    <div className="flex items-center gap-1">
                                                        <div className="w-5 h-5 bg-gray-800 rounded-full flex items-center justify-center text-[8px] font-bold text-gray-500 font-sans">
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

                            {activeTab === 'circles' && selectedCircle && activeCircle && (
                                <div className="space-y-4 font-sans animate-fade-in">
                                    {/* Sub-view Header */}
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0a0f0d] border border-[#105541]/10 p-4.5 rounded-2xl">
                                        <div className="flex items-center gap-3">
                                            <button 
                                                onClick={() => setSelectedCircle(null)}
                                                className="p-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl transition-all border border-white/5 active:scale-95 flex items-center justify-center gap-1"
                                            >
                                                <ChevronRight size={16} />
                                                <span className="text-xs font-bold font-sans">العودة للحلقات</span>
                                            </button>
                                            <div>
                                                <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                                                    <span>{activeCircle.circle}</span>
                                                    <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded border border-blue-500/20 font-mono font-bold">#{activeCircle.numericId}</span>
                                                </h3>
                                                <p className="text-[10px] text-gray-400 mt-1 font-semibold">تصفح لوحة التحكم البرمجية المتكاملة لملف هذه الحلقة</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            <span className={`text-[10px] px-2.5 py-1 rounded-xl font-bold border ${
                                                activeCircle.status === 'inactive' ? 'bg-red-500/10 text-red-400 border-red-500/25' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                                            }`}>
                                                {activeCircle.status === 'inactive' ? '🚫 معطلة إدارياً' : '✅ نشطة برمجياً'}
                                            </span>
                                            <span className={`text-[10px] px-2.5 py-1 rounded-xl font-bold border ${
                                                activeCircle.isStopped ? 'bg-rose-500/20 text-rose-400 border-rose-500/25' : 'bg-[#105541]/10 text-emerald-400 border-[#105541]/25'
                                            }`}>
                                                {activeCircle.isStopped ? '⚠️ متوقفة مؤقتاً' : '⚡ قيد التشغيل'}
                                            </span>
                                            <span className={`text-[10px] px-2.5 py-1 rounded-xl font-bold border ${
                                                activeCircle.isMaintenance ? 'bg-amber-500/10 text-amber-400 border-amber-500/25 animate-pulse' : 'bg-gray-800 text-gray-400 border-gray-700'
                                            }`}>
                                                {activeCircle.isMaintenance ? '🛠️ وضع الصيانة' : '🟢 تشغيل طبيعي'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Stats grid */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        <div className="bg-[#0a0f0d] p-4 rounded-xl border border-[#105541]/10 text-center">
                                            <p className="text-[9px] text-gray-500 font-bold uppercase">إجمالي الطلاب المسجلين</p>
                                            <p className="text-xl font-black text-white mt-1">{activeCircle.students?.length || 0}</p>
                                        </div>
                                        <div className="bg-[#0a0f0d] p-4 rounded-xl border border-[#105541]/10 text-center">
                                            <p className="text-[9px] text-gray-500 font-bold uppercase">إجمالي الحصص/الجلسات</p>
                                            <p className="text-xl font-black text-white mt-1">{activeCircle.sessions?.length || 0}</p>
                                        </div>
                                        <div className="bg-[#0a0f0d] p-4 rounded-xl border border-[#105541]/10 text-center">
                                            <p className="text-[9px] text-gray-500 font-bold uppercase">إجمالي المشرفين والمعلمين</p>
                                            <p className="text-xl font-black text-white mt-1">{Object.keys(activeCircle.teachers || {}).length}</p>
                                        </div>
                                        <div className="bg-[#0a0f0d] p-4 rounded-xl border border-[#105541]/10 text-center">
                                            <p className="text-[9px] text-gray-500 font-bold uppercase">رمز الاستيراد والتفعيل</p>
                                            <p className="text-base font-mono font-black text-blue-400 mt-1 select-all">#{activeCircle.transferCode}</p>
                                        </div>
                                    </div>

                                    {/* Grid layout */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* Diagnostic Credentials */}
                                        <div className="bg-[#0a0f0d] p-4 rounded-2xl border border-[#105541]/10 space-y-3">
                                            <h4 className="text-[11px] font-black text-[#105541] uppercase tracking-wider flex items-center gap-2">
                                                <Key size={12} />
                                                <span>بيانات تسجيل الدخول للحلقة (الاسترداد الفوري)</span>
                                            </h4>
                                            <div className="space-y-2 text-[11px]">
                                                <div className="flex justify-between border-b border-[#105541]/5 pb-1.5">
                                                    <span className="text-gray-500">معرّف الحلقة الرئيسي (ID):</span>
                                                    <span className="font-mono text-gray-300 font-bold select-all">{activeCircle.id}</span>
                                                </div>
                                                <div className="flex justify-between border-b border-[#105541]/5 pb-1.5">
                                                    <span className="text-gray-500">اسم المستخدم (المعرّف الرقمي):</span>
                                                    <span className="font-mono text-white font-bold select-all">{activeCircle.numericId}</span>
                                                </div>
                                                <div className="flex justify-between border-b border-[#105541]/5 pb-1.5">
                                                    <span className="text-gray-500">البريد الإلكتروني للربط:</span>
                                                    <span className="font-mono text-white select-all">{activeCircle.numericId}@quran.app</span>
                                                </div>
                                                <div className="flex justify-between border-b border-[#105541]/5 pb-1.5">
                                                    <span className="text-gray-500 text-emerald-500 font-bold">كلمة مرور الاسترداد الحالية:</span>
                                                    <span className="font-mono text-blue-400 font-black select-all bg-[#105541]/10 px-2.5 py-0.5 rounded-lg border border-[#105541]/20">
                                                        {activeCircle.transferPassword || activeCircle.transferCode || '1234'}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between border-b border-[#105541]/5 pb-1.5">
                                                    <span className="text-gray-500">المدينة / المركز:</span>
                                                    <span className="text-white font-bold">{activeCircle.town || 'غير محدد'} ({activeCircle.center || 'بدون مركز'})</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Administrative Action Panel */}
                                        <div className="bg-[#0a0f0d] p-4 rounded-2xl border border-[#105541]/10 space-y-3">
                                            <h4 className="text-[11px] font-black text-[#105541] uppercase tracking-wider flex items-center gap-2">
                                                <Settings size={12} />
                                                <span>الإجراءات الإدارية المباشرة للحلقة</span>
                                            </h4>
                                            <p className="text-[10px] text-gray-400 leading-relaxed font-semibold">بصفتك المطور، يمكنك التحكم الكامل بنشاط الحلقة. ستطبق التغييرات في نفس اللحظة وتنعكس على جميع المستخدمين المتصلين فوراً.</p>
                                            <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                                                <button 
                                                    onClick={() => {
                                                        const current = activeCircle.status || 'active';
                                                        openActionDialog({
                                                            type: 'confirm',
                                                            title: `${current === 'inactive' ? 'تنشيط وتفعيل' : 'تعطيل وإيقاف'} الحلقة`,
                                                            description: `هل أنت متأكد من رغبتك في ${current === 'inactive' ? 'تنشيط صلاحيات الدخول وإعادة تمكين' : 'تعطيل وحجب الوصول إلى'} حلقة "${activeCircle.circle}" بالكامل؟`,
                                                            isDanger: current !== 'inactive',
                                                            onConfirm: async () => {
                                                                await toggleCircleStatus(activeCircle.id, current);
                                                            }
                                                        });
                                                    }}
                                                    className={`p-2.5 rounded-xl border font-bold text-center transition-all ${
                                                        activeCircle.status === 'inactive' 
                                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20' 
                                                        : 'bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20'
                                                    }`}
                                                >
                                                    {activeCircle.status === 'inactive' ? '⚙️ تفعيل الحلقة' : '🚫 تعطيل الحلقة'}
                                                </button>

                                                <button 
                                                    onClick={() => {
                                                        const current = activeCircle.isStopped || false;
                                                        openActionDialog({
                                                            type: 'confirm',
                                                            title: `${current ? 'استئناف نشاط' : 'إيقاف نشاط'} الحلقة مؤقتاً`,
                                                            description: `هل أنت متأكد من رغبتك في ${current ? 'استئناف عمليات تسجيل الحضور والنقاط للحلقة' : 'إيقاف حلقة رصد الحلقات مؤقتاً'} لـ "${activeCircle.circle}"؟`,
                                                            isDanger: !current,
                                                            onConfirm: async () => {
                                                                await toggleCircleStop(activeCircle.id, current);
                                                            }
                                                        });
                                                    }}
                                                    className={`p-2.5 rounded-xl border font-bold text-center transition-all ${
                                                        activeCircle.isStopped 
                                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20' 
                                                        : 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20'
                                                    }`}
                                                >
                                                    {activeCircle.isStopped ? '⚡ استئناف النشاط' : '⚠️ إيقاف النشاط'}
                                                </button>

                                                <button 
                                                    onClick={() => {
                                                        const current = activeCircle.isMaintenance || false;
                                                        openActionDialog({
                                                            type: 'input',
                                                            title: `تعديل وضع الصيانة للحلقة`,
                                                            description: `أدخل سبب أو ملاحظة الصيانة لعرضها لجميع المتصلين بحلقة "${activeCircle.circle}":`,
                                                            label1: 'ملاحظة الصيانة:',
                                                            placeholder1: 'نقوم بعمل صيانة دورية للحلقة حالياً...',
                                                            defaultValue1: 'نقوم بعمل صيانة دورية للحلقة حالياً...',
                                                            onConfirm: async (note) => {
                                                                await toggleMaintenanceMode(activeCircle.id, current);
                                                            }
                                                        });
                                                    }}
                                                    className={`p-2.5 rounded-xl border font-bold text-center transition-all ${
                                                        activeCircle.isMaintenance 
                                                        ? 'bg-gray-800 text-gray-400 border-gray-700 hover:text-white' 
                                                        : 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20'
                                                    }`}
                                                >
                                                    {activeCircle.isMaintenance ? '🛠️ إلغاء الصيانة' : '🛠️ تفعيل الصيانة'}
                                                </button>

                                                <button 
                                                    onClick={() => {
                                                        openActionDialog({
                                                            type: 'dual-input',
                                                            title: `إشعار عاجل: ${activeCircle.circle}`,
                                                            description: `أرسل إشعاراً فورياً يظهر لجميع معلمي وطلاب الحلقة:`,
                                                            label1: 'العنوان:',
                                                            placeholder1: 'تنبيه إداري عاجل',
                                                            defaultValue1: 'تنبيه إداري عاجل',
                                                            label2: 'التفاصيل:',
                                                            placeholder2: 'اكتب نص التنبيه هنا...',
                                                            onConfirm: async (title, msg) => {
                                                                if (!title.trim() || !msg.trim()) {
                                                                    addToast('يرجى كتابة العنوان والرسالة', 'error');
                                                                    throw new Error('حقول فارغة');
                                                                }
                                                                await sendCircleDeveloperNotification(activeCircle.id, activeCircle.circle || 'الحلقة', title, msg);
                                                            }
                                                        });
                                                    }}
                                                    className="p-2.5 rounded-xl border bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20 font-bold text-center transition-all"
                                                >
                                                    🚀 إرسال إشعار عاجل
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Teachers Section */}
                                    <div className="bg-[#0a0f0d] p-4 rounded-2xl border border-[#105541]/10 space-y-3">
                                        <h4 className="text-[11px] font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                                            <Users size={12} />
                                            <span>كادر معلمين ومشرفي الحلقة برتبهم وصلاحياتهم</span>
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-60 overflow-y-auto custom-scrollbar">
                                            {Object.entries(activeCircle.teachers || {}).length > 0 ? (
                                                Object.entries(activeCircle.teachers || {}).map(([uid, teacher]) => {
                                                    const teacherSessionsCount = activeCircle.sessions?.filter(s => s.creatorUid === uid).length || 0;
                                                    return (
                                                        <div key={uid} className="bg-[#050807]/55 p-3 rounded-xl border border-[#105541]/5 flex items-center justify-between gap-3 text-xs">
                                                            <div className="flex items-center gap-2.5">
                                                                {teacher.photo ? (
                                                                    <img src={teacher.photo} alt="" className="w-9 h-9 rounded-full border border-[#105541]/20 object-cover" />
                                                                ) : (
                                                                    <div className="w-9 h-9 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center font-bold font-sans">
                                                                        {(teacher.name || 'م')[0]}
                                                                    </div>
                                                                )}
                                                                <div>
                                                                    <p className="font-bold text-white">{teacher.name}</p>
                                                                    <p className="text-[9px] text-gray-500 font-semibold mt-0.5">
                                                                        رتبة: <strong className="text-emerald-500">{teacher.role === 'owner' ? 'المالك / المالك الأساسي' : teacher.role === 'teacher' ? 'معلم' : teacher.role === 'assistant' ? 'مساعد' : 'عضو'}</strong> • صلاحية: <strong className="text-gray-400">{teacher.accessLevel === 'full' ? 'كاملة' : 'محدودة'}</strong>
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <div className="text-left">
                                                                <span className={`text-[8px] px-2 py-0.5 rounded-full font-bold uppercase ${
                                                                    teacher.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                                                                }`}>
                                                                    {teacher.status === 'active' ? 'نشط' : 'موقوف'}
                                                                </span>
                                                                <p className="text-[8px] text-gray-500 mt-1 font-bold">{teacherSessionsCount} حصة مرصودة</p>
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            ) : (
                                                <p className="text-[10px] text-gray-500 italic text-center py-6 w-full md:col-span-2">لا يوجد معلمون مضافون للحلقة حالياً.</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Recent Sessions */}
                                    <div className="bg-[#0a0f0d] p-4 rounded-2xl border border-[#105541]/10 space-y-3">
                                        <h4 className="text-[11px] font-black text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                                            <History size={12} />
                                            <span>سجل آخر الحصص والجلسات المسجلة في الحلقة</span>
                                        </h4>
                                        <div className="space-y-2 max-h-52 overflow-y-auto custom-scrollbar">
                                            {activeCircle.sessions && activeCircle.sessions.length > 0 ? (
                                                [...activeCircle.sessions].reverse().slice(0, 15).map((session, sIdx) => (
                                                    <div key={sIdx} className="bg-[#050807]/55 p-3 rounded-xl border border-[#105541]/5 flex justify-between items-center text-xs">
                                                        <div>
                                                            <p className="font-bold text-white">{session.lessonTitle || 'حصة تسميع وقراءة'}</p>
                                                            <p className="text-[9px] text-gray-500 font-semibold mt-1">تاريخ: {session.date || 'غير محدد'} • الوقت: {session.time || 'غير محدد'}</p>
                                                        </div>
                                                        <span className="text-[9px] bg-[#105541]/10 text-emerald-400 px-2.5 py-1 rounded-lg border border-[#105541]/20 font-bold">
                                                            بواسطة المعلم
                                                        </span>
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="text-[10px] text-gray-500 italic text-center py-6">لا توجد حصص مسجلة في هذه الحلقة بعد.</p>
                                            )}
                                        </div>
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
                                    {/* Header card with Action button */}
                                    <div className="bg-gradient-to-l from-[#105541]/10 to-transparent p-5 rounded-3xl border border-[#105541]/15 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                        <div>
                                            <h3 className="text-sm font-black text-white flex items-center gap-2">
                                                <Megaphone className="text-emerald-400" size={18} />
                                                <span>نظام التنبيهات المنبثقة والإشعارات الاحترافية</span>
                                            </h3>
                                            <p className="text-[10px] text-gray-400 mt-1 leading-relaxed">
                                                قم بإنشاء وتعديل ونشر التنبيهات العاجلة للمستخدمين مع تحديد الجمهور المستهدف، جدولة العرض، وإرفاق أزرار مخصصة وتتبع الإحصاءات في الوقت الفعلي.
                                            </p>
                                        </div>
                                        <button 
                                            onClick={() => {
                                                resetNotificationForm();
                                                setIsNotificationModalOpen(true);
                                            }}
                                            className="px-5 py-3 bg-gradient-to-l from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-2xl text-xs font-bold shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 active:scale-95 transition-all flex items-center gap-2 outline-none"
                                        >
                                            <span>+ إنشاء إشعار عاجل جديد</span>
                                        </button>
                                    </div>

                                    {/* Notifications List */}
                                    <div className="space-y-4">
                                        <h4 className="text-xs font-black text-emerald-400 uppercase tracking-widest">التنبيهات الحالية ({developerNotifications.length})</h4>
                                        
                                        {developerNotifications.length === 0 ? (
                                            <div className="bg-[#050807] border border-white/5 p-12 rounded-3xl text-center space-y-3">
                                                <Megaphone size={36} className="text-gray-600 mx-auto animate-pulse" />
                                                <p className="text-xs text-gray-400 font-semibold">لا توجد أي إشعارات أو تنبيهات منشورة حالياً.</p>
                                                <p className="text-[10px] text-gray-500">انقر على زر الإنشاء بالعلوي لبدء نشر أول تنبيه عاجل للمستخدمين.</p>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {developerNotifications.map((notif) => {
                                                    const isCurrentlyActive = !!notif.active;
                                                    const viewsCount = notif.stats?.viewed?.length || 0;
                                                    const deliveredCount = notif.stats?.delivered?.length || 0;
                                                    const closedCount = notif.stats?.closed?.length || 0;
                                                    
                                                    return (
                                                        <div key={notif.id} className="bg-[#0c1310] border border-white/5 rounded-3xl p-5 hover:border-[#105541]/30 transition-all duration-300 relative overflow-hidden flex flex-col justify-between text-right">
                                                            {/* Top Bar inside card */}
                                                            <div className="flex justify-between items-start gap-3 mb-3">
                                                                <div className="space-y-1">
                                                                    <span className={`text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider ${
                                                                        notif.type === 'update' ? 'bg-purple-500/15 text-purple-400' :
                                                                        notif.type === 'warning' ? 'bg-red-500/15 text-red-400' :
                                                                        notif.type === 'maintenance' ? 'bg-amber-500/15 text-amber-400' :
                                                                        notif.type === 'announcement' ? 'bg-emerald-500/15 text-emerald-400' :
                                                                        'bg-blue-500/15 text-blue-400'
                                                                    }`}>
                                                                        {notif.type === 'update' ? 'تحديث متوفر' :
                                                                         notif.type === 'warning' ? 'تحذير شديد' :
                                                                         notif.type === 'maintenance' ? 'صيانة مجدولة' :
                                                                         notif.type === 'announcement' ? 'إعلان هام' :
                                                                         'تنبيه عاجل'}
                                                                    </span>
                                                                    {notif.isMandatory && (
                                                                        <span className="text-[8px] mr-1 px-1.5 py-0.5 bg-red-500/10 text-red-400 rounded-full font-bold">
                                                                            إجباري ⚠️
                                                                        </span>
                                                                    )}
                                                                </div>

                                                                <div className="flex gap-1.5">
                                                                    <button
                                                                        onClick={() => handleEditNotification(notif)}
                                                                        title="تعديل الإشعار"
                                                                        className="p-1.5 hover:bg-white/5 text-gray-400 hover:text-white rounded-lg transition-all"
                                                                    >
                                                                        <Settings size={13} />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDeleteNotification(notif.id)}
                                                                        title="حذف نهائي"
                                                                        className="p-1.5 hover:bg-red-500/10 text-red-400 hover:text-red-300 rounded-lg transition-all"
                                                                    >
                                                                        <X size={13} />
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            {/* Title and message details */}
                                                            <div className="space-y-1 mb-4 text-right">
                                                                <h4 className="text-xs font-black text-white">{notif.title}</h4>
                                                                <p className="text-[10px] text-gray-400 line-clamp-2 leading-relaxed">{notif.description}</p>
                                                                
                                                                {/* Multi image preview indicator */}
                                                                {notif.imageUrls && notif.imageUrls.length > 0 && (
                                                                    <div className="flex gap-1.5 mt-2 overflow-x-auto py-0.5">
                                                                        {notif.imageUrls.map((url: string, idx: number) => (
                                                                            <img key={idx} src={url} alt="" className="w-8 h-8 object-cover rounded-lg border border-white/5 shrink-0" referrerPolicy="no-referrer" />
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Timing & Targeting Info */}
                                                            <div className="bg-black/20 p-2.5 rounded-2xl border border-white/5 space-y-1.5 mb-4 text-[9px] text-gray-400">
                                                                <div className="flex justify-between">
                                                                    <span>الجمهور المستهدف:</span>
                                                                    <span className="font-semibold text-white">
                                                                        {notif.targetType === 'all' ? 'جميع المستخدمين 👥' :
                                                                         notif.targetType === 'circles' ? `حلقات محددة (${notif.targetCircleIds?.length || 0}) ⭕` :
                                                                         `معلمون محددون (${notif.targetUids?.length || 0}) 👤`}
                                                                    </span>
                                                                </div>
                                                                {notif.excludeCircleIds && notif.excludeCircleIds.length > 0 && (
                                                                    <div className="flex justify-between text-red-400/80">
                                                                        <span>استبعاد حلقات:</span>
                                                                        <span>مستبعد ({notif.excludeCircleIds.length}) 🚫</span>
                                                                    </div>
                                                                )}
                                                                <div className="flex justify-between">
                                                                    <span>تاريخ النشر:</span>
                                                                    <span>{notif.scheduledAt ? new Date(notif.scheduledAt).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' }) : 'فوري ⚡'}</span>
                                                                </div>
                                                                {notif.expiresAt && (
                                                                    <div className="flex justify-between text-rose-400/80">
                                                                        <span>تاريخ انتهاء الصلاحية:</span>
                                                                        <span>{new Date(notif.expiresAt).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })}</span>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Realtime Analytics tracking counts */}
                                                            <div className="bg-[#105541]/5 p-3 rounded-2xl border border-[#105541]/10 mb-4">
                                                                <span className="text-[8px] font-black text-emerald-400 block mb-1.5">📊 إحصاءات التفاعل المباشرة</span>
                                                                <div className="grid grid-cols-3 gap-1.5 text-center text-[9px]">
                                                                    <div className="bg-[#050807] p-1.5 rounded-xl">
                                                                        <span className="text-gray-500 block">تم التوصيل</span>
                                                                        <span className="font-mono font-bold text-white text-[11px]">{deliveredCount}</span>
                                                                    </div>
                                                                    <div className="bg-[#050807] p-1.5 rounded-xl">
                                                                        <span className="text-gray-500 block">تم العرض</span>
                                                                        <span className="font-mono font-bold text-emerald-400 text-[11px]">{viewsCount}</span>
                                                                    </div>
                                                                    <div className="bg-[#050807] p-1.5 rounded-xl">
                                                                        <span className="text-gray-500 block">تم الإغلاق</span>
                                                                        <span className="font-mono font-bold text-gray-400 text-[11px]">{closedCount}</span>
                                                                    </div>
                                                                </div>

                                                                {/* Custom buttons click stats */}
                                                                {notif.buttons && notif.buttons.length > 0 && (
                                                                    <div className="mt-2.5 pt-2 border-t border-white/5 space-y-1">
                                                                        <span className="text-[8px] text-gray-400 block mb-1">نقرات الأزرار المخصصة:</span>
                                                                        <div className="grid grid-cols-2 gap-1">
                                                                            {notif.buttons.map((btn: any) => {
                                                                                const clicks = notif.stats?.buttonClicks?.[btn.id]?.length || 0;
                                                                                return (
                                                                                    <div key={btn.id} className="bg-[#050807] p-1 rounded-lg flex justify-between px-1.5 text-[8px]">
                                                                                        <span className="text-gray-400 line-clamp-1">{btn.text}:</span>
                                                                                        <span className="font-mono font-bold text-blue-400">{clicks}</span>
                                                                                    </div>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Active status Toggle Switch */}
                                                            <div className="flex justify-between items-center pt-2 border-t border-white/5">
                                                                <span className="text-[9px] text-gray-400">حالة النشر الحالية:</span>
                                                                <div className="flex items-center gap-2">
                                                                    <span className={`text-[8px] font-black ${isCurrentlyActive ? 'text-emerald-400' : 'text-gray-500'}`}>
                                                                        {isCurrentlyActive ? 'نشط ويظهر للمستهدفين' : 'موقف ومخفي'}
                                                                    </span>
                                                                    <button
                                                                        onClick={() => handleToggleNotificationActive(notif.id, isCurrentlyActive)}
                                                                        className={`w-9 h-5 rounded-full transition-all relative ${isCurrentlyActive ? 'bg-emerald-500' : 'bg-gray-800'}`}
                                                                    >
                                                                        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${isCurrentlyActive ? 'right-4.5' : 'right-0.5'}`}></div>
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Fullscreen Creation & Edit Modal with Real-time Dual Columns Preview */}
                            {isNotificationModalOpen && (
                                <div className="fixed inset-0 z-[99999] bg-black/95 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto" dir="rtl">
                                    <motion.div 
                                        initial={{ opacity: 0, scale: 0.98 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="bg-[#080c09] border border-white/10 rounded-3xl w-full max-w-5xl overflow-hidden shadow-2xl flex flex-col h-[90vh]"
                                    >
                                        {/* Modal Header */}
                                        <div className="p-4 border-b border-white/5 bg-black/40 flex justify-between items-center px-6 shrink-0">
                                            <div className="flex items-center gap-2">
                                                <Megaphone className="text-emerald-400 animate-bounce" size={16} />
                                                <span className="text-xs font-black text-white">
                                                    {isEditingNotification ? 'تعديل الإشعار العاجل' : 'إنشاء ونشر إشعار عاجل منبثق جديد'}
                                                </span>
                                            </div>
                                            <button 
                                                onClick={() => setIsNotificationModalOpen(false)}
                                                className="p-1.5 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-all"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>

                                        {/* Two Columns Body Scrollable */}
                                        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
                                            
                                            {/* Right Side: Form Controls (7 cols) */}
                                            <div className="lg:col-span-7 space-y-4">
                                                
                                                {/* Basic Details */}
                                                <div className="bg-[#0b0f0c] p-4 rounded-2xl border border-white/5 space-y-3">
                                                    <span className="text-[10px] font-black text-emerald-400 block">1. التفاصيل الأساسية</span>
                                                    
                                                    <div>
                                                        <label className="text-[9px] text-gray-400 block mb-1">عنوان التنبيه / الإشعار</label>
                                                        <input 
                                                            type="text"
                                                            value={notifTitle}
                                                            onChange={e => setNotifTitle(e.target.value)}
                                                            placeholder="مثال: صيانة مجدولة للنظام، تحديث هائل قادم..."
                                                            className="w-full bg-black/40 border border-white/5 rounded-xl p-2.5 text-xs text-white outline-none focus:ring-1 focus:ring-emerald-500"
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="text-[9px] text-gray-400 block mb-1">وصف التنبيه (محتوى الإشعار بالتفصيل)</label>
                                                        <textarea 
                                                            value={notifDescription}
                                                            onChange={e => setNotifDescription(e.target.value)}
                                                            placeholder="اكتب تفاصيل الإشعار بالكامل هنا ليرشدهم إلى الإجراء التالي..."
                                                            className="w-full bg-black/40 border border-white/5 rounded-xl p-2.5 text-xs text-white outline-none focus:ring-1 focus:ring-emerald-500 h-24 resize-none"
                                                        />
                                                    </div>

                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                        <div>
                                                            <label className="text-[9px] text-gray-400 block mb-1">نوع ومظهر التنبيه</label>
                                                            <select
                                                                value={notifType}
                                                                onChange={e => setNotifType(e.target.value as any)}
                                                                className="w-full bg-black/40 border border-white/5 rounded-xl p-2.5 text-xs text-white outline-none"
                                                            >
                                                                <option value="info">معلومات (أزرق)</option>
                                                                <option value="success">نجاح (أخضر)</option>
                                                                <option value="warning">تحذير (برتقالي)</option>
                                                                <option value="danger">خطر / إيقاف (أحمر)</option>
                                                                <option value="update">تحديث متوفر (بنفسجي)</option>
                                                                <option value="maintenance">صيانة (أصفر)</option>
                                                                <option value="announcement">إعلان هام (زمردي)</option>
                                                                <option value="alert">تنبيه عاجل (أزرق مائي)</option>
                                                                <option value="note">ملاحظة إدارية (رمادي)</option>
                                                            </select>
                                                        </div>

                                                        <div>
                                                            <label className="text-[9px] text-gray-400 block mb-1">صور الكاروسيل (رابط أو عدة روابط مفصولة بفاصلة)</label>
                                                            <input 
                                                                type="text"
                                                                value={notifImageUrls}
                                                                onChange={e => setNotifImageUrls(e.target.value)}
                                                                placeholder="https://image1.png, https://image2.png"
                                                                className="w-full bg-black/40 border border-white/5 rounded-xl p-2.5 text-xs text-white outline-none"
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Form Flags */}
                                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                                                        <label className="flex items-center gap-2 bg-black/30 p-2 rounded-xl border border-white/5 cursor-pointer hover:bg-black/55 transition-all">
                                                            <input 
                                                                type="checkbox" 
                                                                checked={notifIsMandatory}
                                                                onChange={e => setNotifIsMandatory(e.target.checked)}
                                                                className="w-4 h-4 rounded bg-gray-900 border-white/10 text-emerald-500"
                                                            />
                                                            <div className="text-right">
                                                                 <p className="text-[9px] font-bold text-white">إجباري وملزم</p>
                                                                 <p className="text-[7px] text-gray-500">يمنع تخطيه</p>
                                                            </div>
                                                        </label>

                                                        <label className="flex items-center gap-2 bg-black/30 p-2 rounded-xl border border-white/5 cursor-pointer hover:bg-black/55 transition-all">
                                                            <input 
                                                                type="checkbox" 
                                                                checked={notifIsClosable}
                                                                onChange={e => setNotifIsClosable(e.target.checked)}
                                                                className="w-4 h-4 rounded bg-gray-900 border-white/10 text-emerald-500"
                                                            />
                                                            <div className="text-right">
                                                                 <p className="text-[9px] font-bold text-white">قابل للإغلاق</p>
                                                                 <p className="text-[7px] text-gray-500">يظهر زر إكس بالزاوية</p>
                                                            </div>
                                                        </label>

                                                        <label className="flex items-center gap-2 bg-black/30 p-2 rounded-xl border border-white/5 cursor-pointer hover:bg-black/55 transition-all">
                                                            <input 
                                                                type="checkbox" 
                                                                checked={notifDisappearAfterRead}
                                                                onChange={e => setNotifDisappearAfterRead(e.target.checked)}
                                                                className="w-4 h-4 rounded bg-gray-900 border-white/10 text-emerald-500"
                                                            />
                                                            <div className="text-right">
                                                                 <p className="text-[9px] font-bold text-white">يختفي بعد القراءة</p>
                                                                 <p className="text-[7px] text-gray-500">لا يعرض ثانية للقرّاء</p>
                                                            </div>
                                                        </label>
                                                    </div>
                                                </div>

                                                {/* Targeting Audience selection */}
                                                <div className="bg-[#0b0f0c] p-4 rounded-2xl border border-white/5 space-y-3">
                                                    <span className="text-[10px] font-black text-emerald-400 block">2. الفئة والجمهور المستهدف</span>
                                                    
                                                    <div className="grid grid-cols-3 gap-2">
                                                        <button 
                                                            type="button"
                                                            onClick={() => setNotifTargetType('all')}
                                                            className={`py-2 px-3 rounded-xl text-[10px] font-black border transition-all ${notifTargetType === 'all' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-black/30 text-gray-400 border-white/5'}`}
                                                        >
                                                            الجميع 👥
                                                        </button>
                                                        <button 
                                                            type="button"
                                                            onClick={() => setNotifTargetType('circles')}
                                                            className={`py-2 px-3 rounded-xl text-[10px] font-black border transition-all ${notifTargetType === 'circles' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-black/30 text-gray-400 border-white/5'}`}
                                                        >
                                                            حلقات معينة ⭕
                                                        </button>
                                                        <button 
                                                            type="button"
                                                            onClick={() => setNotifTargetType('users')}
                                                            className={`py-2 px-3 rounded-xl text-[10px] font-black border transition-all ${notifTargetType === 'users' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-black/30 text-gray-400 border-white/5'}`}
                                                        >
                                                            معلمين محددين 👤
                                                        </button>
                                                    </div>

                                                    {/* Multi select list if specific circles targeting */}
                                                    {notifTargetType === 'circles' && (
                                                        <div className="space-y-1 bg-black/40 p-3 rounded-xl border border-white/5">
                                                            <span className="text-[9px] text-gray-400 block mb-1">اختر الحلقات المستهدفة:</span>
                                                            <div className="grid grid-cols-2 gap-1.5 max-h-24 overflow-y-auto">
                                                                {circles.map(circle => {
                                                                    const isSelected = notifTargetCircleIds.includes(circle.id);
                                                                    return (
                                                                        <button
                                                                            type="button"
                                                                            key={circle.id}
                                                                            onClick={() => {
                                                                                if (isSelected) {
                                                                                    setNotifTargetCircleIds(notifTargetCircleIds.filter(id => id !== circle.id));
                                                                                } else {
                                                                                    setNotifTargetCircleIds([...notifTargetCircleIds, circle.id]);
                                                                                }
                                                                            }}
                                                                            className={`p-1.5 px-2 rounded-lg text-right text-[9px] font-bold border flex items-center justify-between ${isSelected ? 'bg-emerald-500/15 border-emerald-500/25 text-white' : 'bg-black/20 border-white/5 text-gray-400'}`}
                                                                        >
                                                                            <span className="truncate">{circle.circle}</span>
                                                                            <span className="text-[8px] font-mono opacity-60">#{circle.id}</span>
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Multi select list if specific users targeting */}
                                                    {notifTargetType === 'users' && (
                                                        <div className="space-y-1 bg-black/40 p-3 rounded-xl border border-white/5">
                                                            <span className="text-[9px] text-gray-400 block mb-1">اختر المعلمين المستهدفين للتوصل:</span>
                                                            <div className="grid grid-cols-2 gap-1.5 max-h-24 overflow-y-auto">
                                                                {users.map(u => {
                                                                    const isSelected = notifTargetUids.includes(u.uid);
                                                                    return (
                                                                        <button
                                                                            type="button"
                                                                            key={u.uid}
                                                                            onClick={() => {
                                                                                if (isSelected) {
                                                                                    setNotifTargetUids(notifTargetUids.filter(id => id !== u.uid));
                                                                                } else {
                                                                                    setNotifTargetUids([...notifTargetUids, u.uid]);
                                                                                }
                                                                            }}
                                                                            className={`p-1.5 px-2 rounded-lg text-right text-[9px] font-bold border flex items-center justify-between ${isSelected ? 'bg-emerald-500/15 border-emerald-500/25 text-white' : 'bg-black/20 border-white/5 text-gray-400'}`}
                                                                        >
                                                                            <span className="truncate">{u.displayName}</span>
                                                                            <span className="text-[8px] font-mono opacity-60">{u.role === 'admin' ? 'مدير' : 'معلم'}</span>
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Option to exclude circles */}
                                                    <div className="space-y-1 bg-black/20 p-3 rounded-xl border border-white/5">
                                                        <div className="flex justify-between items-center mb-1">
                                                            <span className="text-[9px] text-gray-400 block">هل تود استبعاد حلقات معينة من العرض؟ (اختياري):</span>
                                                            {notifExcludeCircleIds.length > 0 && (
                                                                <button type="button" onClick={() => setNotifExcludeCircleIds([])} className="text-[8px] text-red-400 hover:underline">إلغاء الكل</button>
                                                            )}
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-1.5 max-h-20 overflow-y-auto">
                                                            {circles.map(circle => {
                                                                const isExcluded = notifExcludeCircleIds.includes(circle.id);
                                                                return (
                                                                    <button
                                                                        type="button"
                                                                        key={circle.id}
                                                                        onClick={() => {
                                                                            if (isExcluded) {
                                                                                setNotifExcludeCircleIds(notifExcludeCircleIds.filter(id => id !== circle.id));
                                                                            } else {
                                                                                setNotifExcludeCircleIds([...notifExcludeCircleIds, circle.id]);
                                                                            }
                                                                        }}
                                                                        className={`p-1 rounded-lg text-right text-[8px] font-bold border ${isExcluded ? 'bg-red-500/15 border-red-500/25 text-red-300' : 'bg-black/20 border-white/5 text-gray-400'}`}
                                                                    >
                                                                        {circle.circle} 🚫
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Timing Scheduling & Expiry */}
                                                <div className="bg-[#0b0f0c] p-4 rounded-2xl border border-white/5 space-y-3">
                                                    <span className="text-[10px] font-black text-emerald-400 block">3. الجدولة وتوقيت الإيقاف والانتهاء</span>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[10px]">
                                                        <div>
                                                            <label className="text-[9px] text-gray-400 block mb-1">تاريخ ووقت بدء النشر المجدول (اتركه خالي للنشر الفوري)</label>
                                                            <input 
                                                                type="datetime-local"
                                                                value={notifScheduledAt}
                                                                onChange={e => setNotifScheduledAt(e.target.value)}
                                                                className="w-full bg-black/40 border border-white/5 rounded-xl p-2 text-white outline-none"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-[9px] text-gray-400 block mb-1">تاريخ ووقت انتهاء الإشعار التلقائي (اختياري للتخفي)</label>
                                                            <input 
                                                                type="datetime-local"
                                                                value={notifExpiresAt}
                                                                onChange={e => setNotifExpiresAt(e.target.value)}
                                                                className="w-full bg-black/40 border border-white/5 rounded-xl p-2 text-white outline-none"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Customizable Buttons */}
                                                <div className="bg-[#0b0f0c] p-4 rounded-2xl border border-white/5 space-y-3">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-[10px] font-black text-emerald-400">4. أزرار تفاعلية مخصصة للإشعار ({notifButtons.length})</span>
                                                        <button 
                                                            type="button"
                                                            onClick={() => {
                                                                if (notifButtons.length >= 3) {
                                                                    addToast('⚠️ الحد الأقصى هو 3 أزرار فقط للحفاظ على المظهر العام.', 'info');
                                                                    return;
                                                                }
                                                                setNotifButtons([...notifButtons, {
                                                                    id: 'btn_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
                                                                    text: 'موافق وفهمت',
                                                                    action: 'ok',
                                                                    link: '',
                                                                    page: 'overview'
                                                                }]);
                                                            }}
                                                            className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-lg text-[9px] font-black transition-all"
                                                        >
                                                            + إضافة زر إجراء
                                                        </button>
                                                    </div>

                                                    {notifButtons.length === 0 ? (
                                                        <p className="text-[9px] text-gray-500 text-center py-2 bg-black/20 rounded-xl">سيظهر للمستخدم زر تصفية افتراضي "حسناً، فهمت" لإغلاق التنبيه في حال لم تقم بإضافة أزرار.</p>
                                                    ) : (
                                                        <div className="space-y-2">
                                                            {notifButtons.map((btn, index) => (
                                                                <div key={btn.id} className="bg-black/30 p-3 rounded-xl border border-white/5 space-y-2">
                                                                    <div className="flex gap-2 items-center">
                                                                        <span className="text-[9px] font-mono text-gray-500 font-bold">#{index + 1}</span>
                                                                        <input 
                                                                            type="text"
                                                                            value={btn.text}
                                                                            onChange={e => {
                                                                                const updated = [...notifButtons];
                                                                                updated[index].text = e.target.value;
                                                                                setNotifButtons(updated);
                                                                            }}
                                                                            placeholder="نص الزر (مثال: تحديث الآن، تواصل معنا)"
                                                                            className="flex-1 bg-black/40 border border-white/5 rounded-lg px-2.5 py-1.5 text-[10px] text-white outline-none focus:border-emerald-500"
                                                                        />
                                                                        <button 
                                                                            type="button"
                                                                            onClick={() => setNotifButtons(notifButtons.filter(b => b.id !== btn.id))}
                                                                            className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-all"
                                                                        >
                                                                            <X size={10} />
                                                                        </button>
                                                                    </div>

                                                                    <div className="grid grid-cols-2 gap-2 text-[9px]">
                                                                        <div>
                                                                            <label className="text-[8px] text-gray-500 block mb-0.5">نوع الإجراء</label>
                                                                            <select 
                                                                                value={btn.action}
                                                                                onChange={e => {
                                                                                    const updated = [...notifButtons];
                                                                                    updated[index].action = e.target.value;
                                                                                    setNotifButtons(updated);
                                                                                }}
                                                                                className="w-full bg-black/40 border border-white/5 rounded-lg p-1 text-white outline-none"
                                                                            >
                                                                                <option value="ok">موافق (إغلاق)</option>
                                                                                <option value="cancel">إلغاء (تراجع)</option>
                                                                                <option value="update">إعادة تحميل التطبيق 🔄</option>
                                                                                <option value="external_link">فتح رابط خارجي 🔗</option>
                                                                                <option value="open_page">توجيه لصفحة داخلية 📄</option>
                                                                                <option value="custom">إجراء مخصص ✨</option>
                                                                            </select>
                                                                        </div>

                                                                        {btn.action === 'external_link' && (
                                                                            <div>
                                                                                <label className="text-[8px] text-gray-500 block mb-0.5">رابط الوجهة بالكامل</label>
                                                                                <input 
                                                                                    type="text"
                                                                                    value={btn.link || ''}
                                                                                    onChange={e => {
                                                                                        const updated = [...notifButtons];
                                                                                        updated[index].link = e.target.value;
                                                                                        setNotifButtons(updated);
                                                                                    }}
                                                                                    placeholder="https://wa.me/..."
                                                                                    className="w-full bg-black/40 border border-white/5 rounded-lg p-1 text-white outline-none"
                                                                                />
                                                                            </div>
                                                                        )}

                                                                        {btn.action === 'open_page' && (
                                                                            <div>
                                                                                <label className="text-[8px] text-gray-500 block mb-0.5">التبويب الهدف للتوجيه</label>
                                                                                <select
                                                                                    value={btn.page || 'overview'}
                                                                                    onChange={e => {
                                                                                        const updated = [...notifButtons];
                                                                                        updated[index].page = e.target.value;
                                                                                        setNotifButtons(updated);
                                                                                    }}
                                                                                    className="w-full bg-black/40 border border-white/5 rounded-lg p-1 text-white outline-none"
                                                                                >
                                                                                    <option value="overview">الرئيسية</option>
                                                                                    <option value="circles">الحلقات</option>
                                                                                    <option value="users">المستخدمين</option>
                                                                                    <option value="managements">الإدارات</option>
                                                                                    <option value="stats">الإحصائيات</option>
                                                                                    <option value="settings">الإعدادات العامة</option>
                                                                                </select>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Left Side: REALTIME LIVE PREVIEW (5 cols) */}
                                            <div className="lg:col-span-5 bg-black/40 p-4 rounded-2xl border border-white/5 flex flex-col justify-start items-center space-y-4">
                                                <div className="w-full text-right border-b border-white/5 pb-2">
                                                    <span className="text-[10px] font-black text-blue-400 block">👀 معاينة حية للمستعرض النهائي</span>
                                                    <p className="text-[8px] text-gray-500 mt-0.5">هكذا سيظهر التنبيه تماماً للمعلم المسؤول عن الحلقة فور تسجيل الدخول.</p>
                                                </div>

                                                {/* Mock Phone Screen representation of the Overlay Modal */}
                                                <div className="w-full bg-gray-950/60 p-4 rounded-3xl border border-white/10 relative shadow-inner overflow-hidden max-w-sm">
                                                    {/* Mock Header indicators */}
                                                    <div className="flex justify-between items-center text-[7px] font-mono text-gray-500 mb-4 px-2">
                                                        <span>12:00 م 🕛</span>
                                                        <span className="flex gap-1">🟢 متصل</span>
                                                    </div>

                                                    {/* Mock Notification Modal Overlay Rendering */}
                                                    <div className="bg-white dark:bg-[#0c0e12] border border-gray-150 dark:border-gray-800 rounded-[2rem] w-full overflow-hidden shadow-2xl relative text-right">
                                                        {/* Color bar indicator at top based on selection */}
                                                        <div className={`h-2 w-full bg-gradient-to-r ${
                                                            notifType === 'update' ? 'from-purple-500 to-indigo-600' :
                                                            notifType === 'warning' ? 'from-red-500 to-rose-600' :
                                                            notifType === 'maintenance' ? 'from-amber-500 to-orange-600' :
                                                            notifType === 'announcement' ? 'from-emerald-500 to-teal-600' :
                                                            notifType === 'danger' ? 'from-red-600 to-red-700' :
                                                            'from-blue-500 to-sky-600'
                                                        }`} />

                                                        {/* Close X mark */}
                                                        {notifIsClosable && !notifIsMandatory && (
                                                            <div className="absolute top-3 left-3 p-1 rounded-full bg-gray-100 dark:bg-white/5 text-gray-500 text-[8px] w-4 h-4 flex items-center justify-center font-extrabold select-none cursor-pointer">✕</div>
                                                        )}

                                                        <div className="p-4 md:p-5 space-y-4">
                                                            
                                                            {/* Carousel Images Simulated rendering */}
                                                            {notifImageUrls ? (
                                                                <div className="relative w-full overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 bg-black/10">
                                                                    <div className="flex gap-2">
                                                                        {notifImageUrls.split(/[\n,]+/).map((u, i) => u.trim() && (
                                                                            <div key={i} className="flex-none w-full shrink-0">
                                                                                <img src={u.trim()} alt="" className="w-full h-28 object-cover rounded-lg" referrerPolicy="no-referrer" />
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                    {notifImageUrls.split(/[\n,]+/).filter(x => x.trim()).length > 1 && (
                                                                        <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-black/60 px-2 py-0.5 rounded-full text-[6px] text-white">
                                                                            اسحب للتمرير ↔
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <div className="w-full h-28 bg-gray-100 dark:bg-white/5 rounded-xl border border-dashed border-gray-200 dark:border-gray-800 flex flex-col items-center justify-center text-gray-500">
                                                                    <Megaphone size={20} className="opacity-40 animate-pulse" />
                                                                    <span className="text-[8px] mt-1">بدون صور مرفقة</span>
                                                                </div>
                                                            )}

                                                            <div className="space-y-1.5">
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className={`text-[7px] px-2 py-0.5 rounded-full font-extrabold uppercase tracking-widest ${
                                                                        notifType === 'update' ? 'bg-purple-100 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400' :
                                                                        notifType === 'warning' ? 'bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400' :
                                                                        notifType === 'maintenance' ? 'bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400' :
                                                                        notifType === 'announcement' ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                                                                        'bg-[#105541]/10 text-[#105541] dark:text-emerald-400'
                                                                    }`}>
                                                                        {notifType === 'update' ? 'تحديث متوفر' :
                                                                         notifType === 'warning' ? 'تنبيه تحذيري' :
                                                                         notifType === 'maintenance' ? 'صيانة مجدولة' :
                                                                         notifType === 'announcement' ? 'إعلان هام' :
                                                                         'تنبيه عاجل'}
                                                                    </span>
                                                                    {notifIsMandatory && (
                                                                        <span className="text-[7px] px-1.5 py-0.5 bg-red-100 dark:bg-red-500/15 text-red-600 dark:text-red-400 rounded-full font-black">
                                                                            تحديث إجباري ⚠️
                                                                        </span>
                                                                    )}
                                                                </div>

                                                                <h3 className="text-[11px] font-black text-gray-900 dark:text-white leading-tight">
                                                                    {notifTitle || 'عنوان الإشعار المنشور يكتب هنا'}
                                                                </h3>
                                                                
                                                                <p className="text-gray-600 dark:text-gray-300 text-[9px] leading-relaxed whitespace-pre-wrap font-medium">
                                                                    {notifDescription || 'تكتب تفاصيل ووصف الإشعار المجدول هنا بدقة عالية.'}
                                                                </p>
                                                            </div>

                                                            {/* Buttons list mock */}
                                                            <div className="flex flex-col gap-1.5 pt-1.5">
                                                                {notifButtons.length > 0 ? (
                                                                    notifButtons.map(btn => (
                                                                        <div 
                                                                            key={btn.id}
                                                                            className={`w-full py-2 px-3 rounded-xl font-bold text-[9px] text-center ${
                                                                                btn.action === 'update' || btn.action === 'ok' 
                                                                                ? 'bg-[#105541] text-white'
                                                                                : btn.action === 'cancel'
                                                                                ? 'bg-red-500/10 text-red-500'
                                                                                : 'bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300'
                                                                            }`}
                                                                        >
                                                                            {btn.text}
                                                                        </div>
                                                                    ))
                                                                ) : (
                                                                    <div className="w-full bg-[#105541] text-white py-2 px-3 rounded-xl font-bold text-[9px] text-center">
                                                                        حسناً، فهمت
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Bottom actions bar inside modal */}
                                        <div className="p-4 border-t border-white/5 bg-black/40 flex justify-end gap-3 px-6 shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => setIsNotificationModalOpen(false)}
                                                className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-xs font-bold transition-all"
                                            >
                                                إلغاء التراجع
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleSaveNotification}
                                                className="px-6 py-2.5 bg-gradient-to-l from-emerald-500 to-teal-600 hover:opacity-95 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-500/10 transition-all"
                                            >
                                                {isEditingNotification ? '💾 حفظ التعديلات ونشر الإشعار' : '🚀 نشر وإرسال الإشعار الآن'}
                                            </button>
                                        </div>
                                    </motion.div>
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

            {/* Custom Interactive ActionDialog Modal */}
            {typeof document !== 'undefined' && createPortal(
                <AnimatePresence>
                    {actionDialog.isOpen && (
                        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md" dir="rtl">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                className="bg-[#0c1310] border border-white/5 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 text-right overflow-hidden relative"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${actionDialog.isDanger ? 'bg-red-500/15 text-red-400' : 'bg-blue-500/15 text-blue-400'}`}>
                                            <Shield size={20} />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-white">{actionDialog.title}</h3>
                                            <p className="text-[10px] text-gray-500 mt-0.5">لوحة تحكم المطور</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => setActionDialog(prev => ({ ...prev, isOpen: false }))}
                                        className="p-1.5 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-all"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>

                                <p className="text-[11px] text-gray-300 leading-relaxed whitespace-pre-wrap">
                                    {actionDialog.description}
                                </p>

                                {/* Inputs */}
                                {actionDialog.type !== 'confirm' && (
                                    <div className="space-y-3">
                                        <div>
                                            <label className="block text-[9px] text-gray-400 font-bold mb-1.5">{actionDialog.label1 || 'الحقل الأول:'}</label>
                                            <input
                                                type="text"
                                                value={actionVal1}
                                                onChange={(e) => setActionVal1(e.target.value)}
                                                placeholder={actionDialog.placeholder1 || 'اكتب هنا...'}
                                                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[11px] text-white focus:outline-none focus:border-blue-500/30 transition-all text-right"
                                                autoFocus
                                            />
                                        </div>
                                        {actionDialog.type === 'dual-input' && (
                                            <div>
                                                <label className="block text-[9px] text-gray-400 font-bold mb-1.5">{actionDialog.label2 || 'الحقل الثاني:'}</label>
                                                <textarea
                                                    value={actionVal2}
                                                    onChange={(e) => setActionVal2(e.target.value)}
                                                    placeholder={actionDialog.placeholder2 || 'اكتب هنا...'}
                                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[11px] text-white focus:outline-none focus:border-blue-500/30 transition-all text-right h-24 resize-none"
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="flex items-center gap-2 pt-2">
                                    <button
                                        disabled={isSubmittingAction}
                                        onClick={handleConfirmAction}
                                        className={`flex-1 py-2.5 rounded-xl text-[11px] font-bold text-white transition-all flex items-center justify-center gap-1.5 ${
                                            actionDialog.isDanger 
                                            ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/20' 
                                            : 'bg-[#105541] hover:bg-[#156e54] shadow-lg shadow-emerald-500/10'
                                        } disabled:opacity-50`}
                                    >
                                        {isSubmittingAction ? (
                                            <>
                                                <RefreshCw size={12} className="animate-spin" />
                                                <span>جاري تنفيذ الطلب...</span>
                                            </>
                                        ) : (
                                            <span>تأكيد الإجراء</span>
                                        )}
                                    </button>
                                    <button
                                        disabled={isSubmittingAction}
                                        onClick={() => setActionDialog(prev => ({ ...prev, isOpen: false }))}
                                        className="px-4 py-2.5 rounded-xl text-[11px] font-bold bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all disabled:opacity-50"
                                    >
                                        إلغاء
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </div>
    );
};

export default DeveloperDashboard;

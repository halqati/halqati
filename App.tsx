
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AppData, CircleData, Session, Student, Toast, ConfirmationModalData, AlertModalData, ChoiceModalData, LastRecordModalData, Notification, SessionStudent, ReportGeneratorModalData, StudentReportModalData, StudentReport, SupervisorReport, MemorizationRecord, ReviewRecord, Settings as AppSettings, Test, Plan, ShareModalData, Activity, PointsSettings, ManualPointAdjustment, NotificationSettings, Announcement, BulkReward, PointHistoryEntry, FollowUpSettings, UserProfile, TeacherPermissions, MemberPermissions, SupervisorReportSettings, SystemSettings, SyncJob } from './types';
import { AlertTriangle, RefreshCw, Megaphone } from 'lucide-react';
import useLocalStorage from './hooks/useLocalStorage';
import { getGenderedTerm, generateStudentReportText, generateSupervisorReportText, formatDate, downloadFile, shareBackupFile, calculateStudentTotalPoints, calculatePointsForSession, generateUniqueId, generateStudentId, generateUniqueStringId, generateNumericId, generateTransferCode, sanitizeForFirestore, sanitizeToEnglishNumber, mergeCircleData, calculatePagesCount } from './utils/helpers';
import { auth, db, loginWithGoogle, logoutUser, loginWithUsername, resetPassword, collection, doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc, onSnapshot, query, where, orderBy, serverTimestamp, Timestamp, arrayUnion, arrayRemove, onAuthStateChanged, User, signOut, setPersistence, browserLocalPersistence, browserSessionPersistence, runTransaction, deleteField } from './firebase';
import { SEASONAL_MESSAGES, defaultMemberPermissions } from './constants';

import Setup from './pages/Setup';
import Home from './pages/Home';
import Students from './pages/Students';
import Sessions from './pages/Sessions';
import Records from './pages/Records';
import Settings from './pages/Settings';
import About from './pages/About';
import Support from './pages/Support';
import Profile from './pages/Profile';
import TestsAndPlans from './pages/TestsAndPlans';
import Tests from './pages/Tests';
import Plans from './pages/Plans';
import Activities from './pages/Activities';
import Announcements from './pages/Announcements';
import ParentFollowUp from './pages/ParentFollowUp';
import CircleInfo from './pages/CircleInfo';
import NotificationsPage from './pages/Notifications';
import SyncDiagnostics from './pages/SyncDiagnostics';
import Services from './pages/Services';
import Reports from './pages/Reports';
import AdminApp from './src/admin/AdminApp';


import Header from './components/Header';
import BottomNav from './components/BottomNav';
import StudentForm from './components/StudentForm';
import SessionForm from './components/SessionForm';
import ReportModal from './components/ReportModal';
import NotificationModal from './components/NotificationModal';
import ConfirmationModal from './components/ConfirmationModal';
import AlertModal from './components/AlertModal';
import ToastContainer from './components/Toast';
import StatsModal, { DetailedStatsModal } from './components/StatsModal';
import WelcomePopup from './components/WelcomePopup';
import OnboardingGuide from './components/OnboardingGuide';
import ChoiceModal from './components/ChoiceModal';
import LastRecordModal from './components/LastRecordModal';
import ReportGeneratorModal from './components/ReportGeneratorModal';
import StudentReportModal from './components/StudentReportModal';
import SupervisorReportGeneratorModal from './components/SupervisorReportGeneratorModal';
import SupervisorReportModal from './components/SupervisorReportModal';
import SavedReportsModal from './components/SavedReportsModal';
import OptionalAddonsModal from './components/OptionalAddonsModal';
import ViewReportModal from './components/ViewReportModal';
import Leaderboard from './components/Leaderboard';
import StudentProfileCard from './components/StudentProfileCard';
import TestForm from './components/TestForm';
import PlanForm from './components/PlanForm';
import ActivityForm from './components/ActivityForm';
import AnnouncementForm from './components/AnnouncementForm';
import TestReportModal from './components/TestReportModal';
import PlanReportModal from './components/PlanReportModal';
import TestNotificationModal from './components/TestNotificationModal';
import PlanNotificationModal from './components/PlanNotificationModal';
import ActivityReportModal from './components/ActivityReportModal';
import ActivityNotificationModal from './components/ActivityNotificationModal';
import AnnouncementReportModal from './components/AnnouncementReportModal';
import AnnouncementNotificationModal from './components/AnnouncementNotificationModal';
import QuickSwitchSelectorModal from './components/QuickSwitchSelectorModal';
import ShareModal from './components/ShareModal';
import FilenamePromptModal from './components/FilenamePromptModal';
import PointsSettingsModal from './components/PointsSettingsModal';
import BackupRestoreModal from './components/BackupRestoreModal';
import BackupReviewModal from './components/BackupReviewModal';
import TermsOfServiceModal from './components/TermsOfServiceModal';
import NotificationSettingsModal from './components/NotificationSettingsModal';
import StudentPointsLogModal from './components/StudentPointsLogModal';
import ManualPointAdjusterModal from './components/ManualPointAdjusterModal';
import TextBackupModal from './components/TextBackupModal';
import TextRestoreModal from './components/TextRestoreModal';
import RewardsManagerModal from './components/RewardsManagerModal';
import VerificationScreen from './components/VerificationScreen';
import ShareSessionCodeModal from './components/ShareSessionCodeModal';
import ImportSessionCodeModal from './components/ImportSessionCodeModal';


import ManagementDashboard from './components/ManagementDashboard';
import DeveloperDashboard from './components/DeveloperDashboard';
import LoginModal from './components/LoginModal';
import AuthScreen from './components/AuthScreen';
import { FaCheckCircle, FaExclamationTriangle, FaInfoCircle, FaCloudUploadAlt, FaCloudDownloadAlt, FaSignInAlt, FaPlus, FaKey, FaTimes, FaSync } from 'react-icons/fa';

const mainPages = ['home', 'students', 'sessions', 'records', 'settings', 'services', 'reports'];

const defaultLessonTypes = ["فقه", "عقيدة", "تجويد", "تلاوة", "تفسير", "سيرة", "قصص", "موعظة", "نشاط"];
const defaultActivityTypes = ["رحلة", "خرجة", "نشاط", "حفل", "لقاء خارجي", "دوري رياضي", "نشاط رياضي", "مسابقة", "حفظ محدد"];

const defaultPointsSettings: PointsSettings = {
    present: 1,
    late: 1,
    absent: 0,
    excused: 1,
    hasMemorization: 1,
    noMemorization: 0,
    suspendedMemorization: 1,
    hasReview: 1,
    noReview: 0,
    suspendedReview: 1,
    maxMemorizationGrade: 10,
    maxReviewGrade: 10,
    khatimBonus: 3,
    khatimRecitesAttendance: 1,
    khatimRecitesHasReview: 2,
    khatimNoRecitesAttendanceBonus: 3,
    lessonPresent: 3,
    lessonLate: 3,
    lessonExcused: 3,
};

const defaultFollowUpSettings: FollowUpSettings = {
    absentThreshold: 3,
    lateThreshold: 5,
    missedMemoThreshold: 4,
    missedReviewThreshold: 4
};

const defaultNotificationSettings: NotificationSettings = {
    enabled: true,
    consecutiveAbsenceThreshold: 2,
    consecutiveLatenessThreshold: 3,
    consecutiveMemoThreshold: 2,
    consecutiveReviewThreshold: 2,
    fridayReminders: true,
    rareReminders: true,
    seasonalReminders: true,
    retentionHours: 10,
};

const onboardingSteps = [
    {
        elementSelector: '#root',
        title: 'جولة تعريفية سريعة',
        content: 'أهلاً بك! هذه الجولة ستعرفك على كل ميزات التطبيق الرئيسية لتتمكن من استخدامه بكل سهولة واحترافية.'
    },
    {
        elementSelector: '#students-action-button',
        title: 'قسم الطلاب',
        content: 'أضف طلابك، عدّل بياناتهم، أو أوقف طالباً عن الحفظ والمراجعة بسهولة. كل ما يخص إدارة طلابك تجده هنا.'
    },
    {
        elementSelector: '#sessions-action-button',
        title: 'إنشاء الجلسات',
        content: 'أنشئ جلسات يومية، اختر نوعها (تسميع أو درس)، وسجل الحضور والتسميع. ملاحظة: البيانات تُحذف إذا خرجت قبل الحفظ، ويمكنك تفعيل الحفظ كمسودة من الإعدادات.'
    },
    {
        elementSelector: '#sessions-nav-button',
        title: 'متابعة الجلسات المحفوظة',
        content: 'بعد إنشاء الجلسة وحفظها، يمكنك من هنا تعديلها، حذفها، أو مشاركتها كرسالة واحدة للآباء أو للمجموعة.'
    },
    {
        elementSelector: '#stats-action-button',
        title: 'الإحصائيات والتقارير',
        content: 'تعرّف على صفحة الإحصائيات بالكامل، وحلل أداء حلقتك، وأنشئ تقارير شاملة للمشرفين بضغطة زر، دون أي عناء.'
    },
    {
        elementSelector: '#records-nav-button',
        title: 'السجل الفردي للطلاب',
        content: 'ابحث عن أي طالب، اعرض سجله اليومي المفصّل، أو أنشئ تقريراً خاصاً به لفترة زمنية محددة لمشاركته مع ولي الأمر.'
    },
    {
        elementSelector: '#settings-nav-button',
        title: 'الإعدادات والإضافات',
        content: 'من هنا يمكنك إدارة الحلقات، ضبط كل خيارات التطبيق، التحكم بالإضافات والمظهر، والقيام بالنسخ الاحتياطي لبياناتك.'
    },
    {
        elementSelector: '#root',
        title: 'انتهت الجولة!',
        content: 'بعد هذه الجولة، ستكون قد عرفت تطبيقك بالكامل 👌. يمكنك معرفة المزيد عن التطبيق من صفحة  "حول التطبيق" من الإعدادات.'
    }
];

const initialAppData: AppData = {
    circles: [],
    activeCircleId: null,
    quickSwitchCircleIds: [],
    hasShownQuickSwitchToast: false,
};

const pushStateSafely = () => {
    try {
        history.pushState(null, '', window.location.href);
    } catch (error) {
        console.warn("Could not push state to history:", error);
    }
};


import LinkCirclesModal from './components/LinkCirclesModal';

const App: React.FC = () => {
    const [appData, setAppData] = useLocalStorage<AppData>('tahfeezMultiCircleApp_v1', initialAppData);
    
    // Auth state persistence logic
    const [user, setUser] = useState<User | null>(() => {
        const savedUser = localStorage.getItem('tahfeezAuthUser_v1');
        return savedUser ? JSON.parse(savedUser) : null;
    });
    
    const [userProfile, setUserProfile] = useLocalStorage<UserProfile | null>('tahfeezUserProfile_v1', null);
    const [isAdminMode, setIsAdminMode] = useState(false);
    const [isAuthLoading, setIsAuthLoading] = useState(true);
    const [isProfileLoading, setIsProfileLoading] = useState(false);
    const [systemSettings, setSystemSettings] = useState<SystemSettings>({
        registrationOpen: true,
        emergencyMode: false
    });
    const [devNotifications, setDevNotifications] = useState<any[]>([]);
    
    const unsubProfileRef = React.useRef<(() => void) | null>(null);
    const unsubCommandsRef = React.useRef<(() => void) | null>(null);

    // Safety Guard: Prevent infinite loader on Auth or Profile delay
    useEffect(() => {
        const timer = setTimeout(() => {
            if (isAuthLoading) {
                console.warn("Auth loading timeout reached, forcing completion.");
                setIsAuthLoading(false);
            }
            if (isProfileLoading) {
                console.warn("Profile loading timeout reached, forcing completion.");
                setIsProfileLoading(false);
            }
        }, 8000);
        return () => clearTimeout(timer);
    }, [isAuthLoading, isProfileLoading]);

    useEffect(() => {
        localStorage.removeItem('auth_saving_prompt_pending');
        localStorage.removeItem('auth_loading_in_progress');
        
        // Show permanent deletion alert if applicable
        if (localStorage.getItem('account_permanently_deleted') === 'true') {
            setTimeout(() => {
                addToast('⚠️ تم حذف حسابك بالكامل من قبل المطور وتصفية جميع بياناتك بنجاح بطلب من المطور.', 'error');
                localStorage.removeItem('account_permanently_deleted');
            }, 1000);
        }
    }, []);

    // Real-time Presence / lastActive Updater
    useEffect(() => {
        if (!user || !db) return;
        
        const updatePresence = async () => {
            try {
                const userRef = doc(db, 'users', user.uid);
                await updateDoc(userRef, {
                    lastActive: serverTimestamp()
                });
            } catch (err) {
                console.error("Error updating presence:", err);
            }
        };
        
        updatePresence();
        const interval = setInterval(updatePresence, 3 * 60 * 1000);
        return () => clearInterval(interval);
    }, [user, db]);

    useEffect(() => {
        if (!db) return;
        const unsub = onSnapshot(doc(db, 'system', 'settings'), (snap) => {
            if (snap.exists()) {
                setSystemSettings(snap.data() as SystemSettings);
            }
        });
        return () => unsub();
    }, []);

    useEffect(() => {
        if (!db) return;
        const q = query(collection(db, 'developer_notifications'), where('active', '==', true));
        const unsub = onSnapshot(q, (snapshot) => {
            const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setDevNotifications(list);
        });
        return () => unsub();
    }, [db]);

    const executeDeveloperCommand = async (cmd: any) => {
        console.log("Executing developer command:", cmd);
        switch (cmd.command) {
            case 'force_logout':
                addToast('🔒 تم تسجيل خروجك من قبل المطور فوراً.', 'error');
                handleLogout();
                break;
            case 'suspend':
                addToast(`🔴 تم إيقاف حسابك من قبل المطور: ${cmd.payload?.reason || ''}`, 'error');
                setUserProfile(prev => prev ? { ...prev, status: 'blocked', blockedReason: cmd.payload?.reason || '' } : null);
                break;
            case 'maintenance':
                addToast(`🛠️ تم وضع حسابك في الصيانة من قبل المطور: ${cmd.payload?.note || ''}`, 'info');
                setUserProfile(prev => prev ? { ...prev, maintenanceMode: cmd.payload?.active, maintenanceNote: cmd.payload?.note || '' } : null);
                break;
            case 'send_warning':
                const msgObj = {
                    id: cmd.payload?.id || (Math.random().toString(36).substring(2, 9) + Date.now()),
                    message: cmd.payload?.message || '',
                    read: false,
                    createdAt: Date.now()
                };
                setUserProfile(prev => {
                    if (!prev) return null;
                    const notifications = prev.notifications || [];
                    if (notifications.some(n => n.id === msgObj.id)) return prev;
                    return { ...prev, notifications: [...notifications, msgObj] };
                });
                addToast('📣 وصلك تنبيه إداري خاص من المطور!', 'info');
                break;
            case 'update_role':
                addToast(`⚙️ تم تعديل صلاحياتك ورتبتك إلى: ${cmd.payload?.newRole}`, 'success');
                setUserProfile(prev => prev ? { ...prev, role: cmd.payload?.newRole } : null);
                break;
            case 'delete_account':
                addToast('🗑️ تم حذف حسابك نهائياً من قبل الإدارة.', 'error');
                localStorage.setItem('account_permanently_deleted', 'true');
                handleLogout();
                break;
            case 'change_password':
                addToast('🔑 تم تغيير كلمة مرور حسابك من قبل المطور. يرجى تسجيل الدخول بالرمز الجديد.', 'info');
                handleLogout();
                break;
            default:
                break;
        }
    };

    useEffect(() => {
        if (!auth) {
            setIsAuthLoading(false);
            return;
        }

        // Set persistence to LOCAL by default to ensure session stays after app restart
        setPersistence(auth, browserLocalPersistence).catch(err => {
            console.error("Error setting persistence:", err);
        });

        const unsubscribe = onAuthStateChanged(auth, async (currentUser: User | null) => {
            if ((window as any).isChangingPassword) {
                console.log("Bypassing auth state change during password update...");
                return;
            }
            // Robust check: only remove if we are not explicitly authenticated or during logout
            const isLoggingOut = localStorage.getItem('logging_out_active') === 'true';
            const isPermanent = localStorage.getItem('app_authenticated_permanently') === 'true';

            if (currentUser) {
                // Save a light version of the user object to localStorage for offline persistence
                const lightUser = {
                    uid: currentUser.uid,
                    displayName: currentUser.displayName,
                    email: currentUser.email,
                    photoURL: currentUser.photoURL,
                    emailVerified: currentUser.emailVerified,
                    isAnonymous: currentUser.isAnonymous
                };
                localStorage.setItem('tahfeezAuthUser_v1', JSON.stringify(lightUser));
                localStorage.setItem('app_authenticated_permanently', 'true');
                setUser(currentUser);
                setActivePage('home');
            } else {
                if (isLoggingOut) {
                    localStorage.removeItem('tahfeezAuthUser_v1');
                    localStorage.removeItem('app_authenticated_permanently');
                    setUser(null);
                } else if (isPermanent) {
                    // User was permanently authenticated but current state is null (often happens offline)
                    // We trust our local cache to keep the session alive in the UI
                    const savedUser = localStorage.getItem('tahfeezAuthUser_v1');
                    if (savedUser) {
                        try {
                            const cachedUser = JSON.parse(savedUser);
                            setUser(cachedUser); // Keep the UI logged in with cached data
                        } catch (e) {
                            setUser(null);
                        }
                    } else {
                        setUser(null);
                    }
                } else {
                    setUser(null);
                }
            }

            setIsAuthLoading(false); 

            const targetUser = currentUser || (isPermanent ? JSON.parse(localStorage.getItem('tahfeezAuthUser_v1') || 'null') : null);

            // Handle linking for authenticated users
            if (targetUser && db) {
                setAppData(prev => {
                    const updatedCircles = prev.circles.map(c => {
                        const userIds = c.authorizedUserIds ? [...c.authorizedUserIds] : [];
                        
                        // Already linked to this UI?
                        if (userIds.includes(targetUser.uid)) {
                            // If ownerId is NOT set but we are verified, set it for claim
                            if (!c.ownerId && (targetUser.emailVerified || targetUser.email?.endsWith('@quran.app'))) {
                                return { ...c, ownerId: targetUser.uid, lastUpdated: Date.now() };
                            }
                            return c;
                        }

                        // Should we auto-link?
                        // 1. If it has an owner and it's me
                        if (c.ownerId === targetUser.uid) {
                             userIds.push(targetUser.uid);
                             return { ...c, authorizedUserIds: userIds, lastUpdated: Date.now() };
                        }

                        // 2. If it's an orphan (no authorized users)
                        // Be careful: we only auto-link if the user is verified OR it's a @quran.app account
                        const isOrphan = !c.authorizedUserIds || c.authorizedUserIds.length === 0;

                        if (isOrphan) {
                            const isVerified = targetUser.emailVerified || targetUser.email?.endsWith('@quran.app');
                            if (isVerified) {
                                userIds.push(targetUser.uid);
                                return { 
                                    ...c, 
                                    authorizedUserIds: userIds, 
                                    ownerId: c.ownerId || targetUser.uid, // Claim ownership if none exists
                                    lastUpdated: Date.now() 
                                };
                            }
                        }

                        return c;
                    });
                    
                    const changed = JSON.stringify(updatedCircles) !== JSON.stringify(prev.circles);
                    return changed ? { ...prev, circles: updatedCircles } : prev;
                });
            }
            if (unsubProfileRef.current) {
                unsubProfileRef.current();
                unsubProfileRef.current = null;
            }
            if (unsubCommandsRef.current) {
                unsubCommandsRef.current();
                unsubCommandsRef.current = null;
            }

            if (targetUser && db) {
                setIsProfileLoading(true);
                
                // Real-time listener for user profile
                const userRef = doc(db, 'users', targetUser.uid);
                unsubProfileRef.current = onSnapshot(userRef, async (docSnap) => {
                    if (docSnap.exists()) {
                        const profileData = docSnap.data() as any;
                        if (profileData.status === 'deleted') {
                            localStorage.setItem('account_permanently_deleted', 'true');
                            handleLogout();
                            return;
                        }
                        if (profileData.forceLogout === true) {
                            await updateDoc(userRef, { forceLogout: false });
                            addToast('🔒 تم تسجيل خروجك من قبل إدارة التطبيق لدواعي أمنية أو لتعديل الصلاحيات والمزايا.', 'error');
                            handleLogout();
                            return;
                        }
                        setUserProfile(profileData);
                        setIsProfileLoading(false);
                    } else if (currentUser) { // Only attempt creation if truly authenticated online
                        // Profile doesn't exist yet, wait or create
                        if (userProfile?.uid === currentUser.uid) {
                            setIsProfileLoading(false);
                        } else {
                            let initialName = currentUser.displayName || (currentUser.email ? currentUser.email.split('@')[0] : 'معلم');
                            let initialGender: UserProfile['gender'] = 'male'; 
                            
                            if (appData.circles.length > 0) {
                                const firstCircle = appData.circles[0];
                                if (firstCircle.teacher) initialName = firstCircle.teacher;
                                if (firstCircle.teacherGender) initialGender = firstCircle.teacherGender;
                            }

                            const role = currentUser.email === 'nova.kayanco@gmail.com' ? 'admin' : 'teacher';
                            const newProfile: UserProfile = {
                                uid: currentUser.uid,
                                displayName: initialName,
                                email: currentUser.email,
                                photoURL: currentUser.photoURL,
                                role: role,
                                gender: initialGender,
                                lastLogin: serverTimestamp(),
                                createdAt: serverTimestamp()
                            };
                            
                            try {
                                await setDoc(userRef, newProfile, { merge: true });
                            } catch (e) {
                                console.error("Error creating/merging profile:", e);
                            }
                        }
                    } else {
                        setIsProfileLoading(false);
                    }
                }, (error) => {
                    console.warn("Profile snapshot delay/error:", error);
                    setIsProfileLoading(false);
                });

                // Real-time listener for developer commands
                const commandsColRef = collection(db, 'users', targetUser.uid, 'commands');
                unsubCommandsRef.current = onSnapshot(commandsColRef, async (querySnap) => {
                    querySnap.docChanges().forEach(async (change) => {
                        if (change.type === 'added' || change.type === 'modified') {
                            const cmd = change.doc.data();
                            if (cmd.status === 'pending') {
                                try {
                                    await executeDeveloperCommand(cmd);
                                    await updateDoc(doc(db, 'users', targetUser.uid, 'commands', change.doc.id), {
                                        status: 'executed',
                                        executedAt: Date.now()
                                    });
                                } catch (error: any) {
                                    console.error("Error executing developer command:", error);
                                    await updateDoc(doc(db, 'users', targetUser.uid, 'commands', change.doc.id), {
                                        status: 'failed',
                                        executionError: error.message || String(error),
                                        executedAt: Date.now()
                                    });
                                }
                            }
                        }
                    });
                }, (error) => {
                    console.warn("Commands snapshot listener warning/error:", error);
                });

                // Link local circles
                setAppData(prev => {
                    const needsLinking = prev.circles.some(c => !c.authorizedUserIds?.includes(targetUser.uid));
                    if (!needsLinking) return prev;

                    const updatedCircles = prev.circles.map(c => {
                        const userIds = c.authorizedUserIds ? [...c.authorizedUserIds] : [];
                        if (!userIds.includes(targetUser.uid)) {
                            userIds.push(targetUser.uid);
                            return { ...c, authorizedUserIds: userIds, lastUpdated: Date.now() };
                        }
                        return c;
                    });
                    return { ...prev, circles: updatedCircles };
                });
            } else {
                setIsProfileLoading(false);
            }
        });
        return () => {
            unsubscribe();
            if (unsubProfileRef.current) unsubProfileRef.current();
            if (unsubCommandsRef.current) unsubCommandsRef.current();
        };
    }, []);

    const handleLogin = () => {
        setShowLoginModal(true);
    };

    const handleLoginWithUsername = async (username: string, password: string, rememberMe: boolean = true) => {
        if (!isOnline) {
            addToast("يجب الاتصال بالإنترنت لتسجيل الدخول", 'error');
            return;
        }
        try {
            if (auth) {
                await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
            }
            const loggedInUser = await loginWithUsername(username, password);
            if (loggedInUser && db) {
                const userRef = doc(db, 'users', loggedInUser.uid);
                await setDoc(userRef, { plainPassword: password }, { merge: true });
            }
            addToast("تم تسجيل الدخول بنجاح", 'success');
        } catch (error: any) {
            console.error("Login failed:", error);
            addToast("فشل تسجيل الدخول. تأكد من اسم المستخدم وكلمة المرور.", 'error');
            throw error;
        }
    };

    const handleLoginWithGoogle = async () => {
        if (!isOnline) {
            addToast("يجب الاتصال بالإنترنت لتسجيل الدخول بجوجل", 'error');
            return;
        }
        try {
            if (auth) {
                await setPersistence(auth, browserLocalPersistence);
            }
            await loginWithGoogle();
            addToast("تم تسجيل الدخول بنجاح", 'success');
            setShowLoginModal(false);
        } catch (error: any) {
            console.error("Login failed:", error);
            addToast("فشل تسجيل الدخول بجوجل", 'error');
        }
    };

    const handleResetPassword = async (email: string) => {
        if (!isOnline) {
            addToast("يجب الاتصال بالإنترنت لإعادة تعيين كلمة المرور", 'error');
            return;
        }
        try {
            await resetPassword(email);
            addToast("تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني", 'success');
        } catch (error: any) {
            console.error("Reset password failed:", error);
            addToast("فشل إرسال رابط إعادة التعيين. تأكد من البريد الإلكتروني.", 'error');
            throw error;
        }
    };

    const handleLogout = async () => {
        if (!auth) return;
        
        // Developer can always logout, or if online
        if (!isOnline && userProfile?.role !== 'developer') {
            setAlertModal({
                isOpen: true,
                title: 'تنبيه',
                message: 'لا يمكن تسجيل الخروج أثناء عدم الاتصال بالإنترنت. يرجى الاتصال بالإنترنت أولاً لضمان مزامنة كافة البيانات قبل الخروج.'
            });
            return;
        }

        setConfirmationModal({
            isOpen: true,
            title: 'تسجيل الخروج',
            message: 'هل أنت متأكد من رغبتك في تسجيل الخروج؟ سيتم مسح البيانات المحلية المرتبطة بهذا الحساب من هذا الجهاز.',
            onConfirm: async () => {
                try {
                    localStorage.setItem('logging_out_active', 'true');
                    const isActingAsUser = localStorage.getItem('developer_acting_as_user') === 'true';
                    await signOut(auth);
                    
                    if (isActingAsUser) {
                        localStorage.removeItem('developer_acting_as_user');
                        localStorage.setItem('auto_login_creds', JSON.stringify({
                            email: '779516077',
                            password: '35004760'
                        }));
                        window.location.reload();
                    } else {
                        setAppData(initialAppData); 
                        setUserProfile(null); // Clear profile cache
                        setActivePage('home');
                        localStorage.removeItem('tahfeezAuthUser_v1');
                        localStorage.removeItem('app_authenticated_permanently');
                        localStorage.removeItem('logging_out_active');
                        addToast("تم تسجيل الخروج", 'info');
                    }
                } catch (error) {
                    console.error("Logout failed:", error);
                    localStorage.removeItem('logging_out_active');
                }
                setConfirmationModal({ isOpen: false, title: '', message: '', onConfirm: () => {} });
            }
        });
    };
    
    useEffect(() => {
        const handleImportData = (e: any) => {
            const { circles, students, records } = e.detail;
            
            if (!circles || circles.length === 0) return;

            setAppData(prev => {
                const newCircles: CircleData[] = [...prev.circles];
                
                circles.forEach((importedCircle: any) => {
                    // Create a new CircleData object
                    const circleId = generateUniqueStringId();
                    const numericId = generateNumericId();
                    const transferCode = generateTransferCode();
                    
                    // Map students for this circle
                    const circleStudents: Student[] = students
                        .filter((s: any) => s.circleId === importedCircle.id)
                        .map((s: any, index: number) => ({
                            id: generateUniqueId(),
                            order: index + 1,
                            name: s.name,
                            gender: s.gender,
                            parentPhone: s.phone,
                            suspendedMemorization: false,
                            suspendedReview: false,
                            joinDate: new Date().toISOString().split('T')[0],
                            manualPoints: [],
                            isArchived: false
                        }));

                    const newCircle: CircleData = {
                        id: circleId,
                        numericId: numericId.toString(),
                        transferCode: transferCode,
                        teacher: importedCircle.teacher || "معلم مستورد",
                        circle: importedCircle.name,
                        center: "مركز مستورد",
                        teacherGender: 'male',
                        students: circleStudents,
                        sessions: [],
                        settings: {
                            theme: 'light',
                            showLastRecordFeature: true,
                            autoSaveDrafts: true,
                            pointsSettings: defaultPointsSettings,
                            followUpSettings: defaultFollowUpSettings
                        },
                        notifications: [],
                        notificationSettings: defaultNotificationSettings,
                        dismissedNotificationIds: [],
                        studyStartDate: new Date().toISOString().split('T')[0],
                        lastWelcomeTipShow: Date.now(),
                        lessonTypes: defaultLessonTypes,
                        activityTypes: defaultActivityTypes,
                        authorizedUserIds: user ? [user.uid] : [],
                        lastUpdated: Date.now()
                    };

                    newCircles.push(newCircle);
                });

                return {
                    ...prev,
                    circles: newCircles,
                    activeCircleId: newCircles[newCircles.length - circles.length].id
                };
            });

            addToast("تم استيراد البيانات بنجاح", 'success');
        };

        window.addEventListener('app:importData', handleImportData);
        return () => window.removeEventListener('app:importData', handleImportData);
    }, [user, setAppData]);

    const activeCircle = useMemo(() => appData.circles.find(c => c.id === appData.activeCircleId), [appData]);

    // Filtered students (Not archived) for main views
    const activeCircleStudents: Student[] = useMemo(() => {
        const students = (activeCircle?.students || []).filter((s: Student) => !s.isArchived);
        // Ensure uniqueness by ID to prevent duplicate key warnings
        const seen = new Set();
        return students.filter(s => {
            if (seen.has(s.id)) return false;
            seen.add(s.id);
            return true;
        });
    }, [activeCircle?.students]);

    const archivedStudents = useMemo(() => {
        return (activeCircle?.students || []).filter(s => s.isArchived);
    }, [activeCircle?.students]);

    const hasCircleSettingsPermission = useMemo(() => {
        if (!activeCircle) return false;
        const isCircleOwner = activeCircle.ownerId === user?.uid;
        const circleTeacherObj = activeCircle.teachers?.[user?.uid || ''];
        const isCircleFullAccess = circleTeacherObj?.accessLevel === 'full';
        const hasCircleEditPermission = circleTeacherObj?.permissions?.canEditCircleSettings !== false;
        return isCircleOwner || isCircleFullAccess || hasCircleEditPermission;
    }, [activeCircle, user]);

    const [isInitialising, setIsInitialising] = useState(false);
    const [showNewCircleForm, setShowNewCircleForm] = useState(false);
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    useEffect(() => {
        const handleOnline = async () => {
            const hasInternet = await checkRealConnectivity();
            setIsOnline(hasInternet);
        };
        const handleOffline = () => setIsOnline(false);
        
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        
        const conn = (navigator as any).connection;
        if (conn) {
            conn.addEventListener('change', handleOnline);
        }
        
        // Initial check
        handleOnline();

        // Periodic check every 5 seconds for fast real-time status update
        const interval = setInterval(handleOnline, 5000);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            if (conn) {
                conn.removeEventListener('change', handleOnline);
            }
            clearInterval(interval);
        };
    }, []);
    
    const [activePage, setActivePage] = useState('home');
    const [showLinkCirclesModal, setShowLinkCirclesModal] = useState(false);
    const [direction, setDirection] = useState(0);
    const [showStudentForm, setShowStudentForm] = useState(false);
    const [editingStudent, setEditingStudent] = useState<Student | null>(null);
    const [editingSession, setEditingSession] = useState<Session | null>(null);
    const [pristineSession, setPristineSession] = useState<Session | null>(null);
    const [reportSession, setReportSession] = useState<Session | null>(null);
    const [notificationSession, setNotificationSession] = useState<Session | null>(null);
    const [showStatsModal, setShowStatsModal] = useState(false);
    const [statsModalData, setStatsModalData] = useState<{isOpen: boolean, title: string, students: any[], suspendedStudents?: any[]}>({isOpen: false, title: '', students: []});
    
    const [activeSettingsPage, setActiveSettingsPage] = useState('main');
    const [activeServicesPage, setActiveServicesPage] = useState('main');
    const [recentAnnouncementId, setRecentAnnouncementId] = useState<number | null>(null);
    const servicesHistoryRef = useRef<string[]>(['main']);
    const [profileMode, setProfileMode] = useState<'circle' | 'account'>('account');
    
    const [showWelcomePopup, setShowWelcomePopup] = useState(false);
    const [isTourActive, setIsTourActive] = useState(false);
    
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [isInitialSyncComplete, setIsInitialSyncComplete] = useState(appData.circles.length > 0);
    const [authTriggerCounter, setAuthTriggerCounter] = useState(0);

    // Fast transition safeguard: Avoid getting permanently stuck on the full-screen synchronization loading layer.
    // If we have an active user but loading circles from Firestore is delayed (max 600ms), we bypass the loader
    // to render the dashboard immediately. Real-time sync continues silently behind the scenes.
    useEffect(() => {
        if (user && !isInitialSyncComplete) {
            const timer = setTimeout(() => {
                setIsInitialSyncComplete(true);
            }, 600);
            return () => clearTimeout(timer);
        }
    }, [user, isInitialSyncComplete]);

    const checkRealConnectivity = async (): Promise<boolean> => {
        if (!navigator.onLine) return false;
        try {
            // Check real network reachability using fetch with abort timeout using Google gstatic portal detector url
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), 2000);
            await fetch('https://www.gstatic.com/generate_204', {
                mode: 'no-cors',
                signal: controller.signal,
                cache: 'no-store'
            });
            clearTimeout(id);
            return true;
        } catch (e) {
            // Fallback to google.com favicon with no-cors mode
            try {
                const controller = new AbortController();
                const id = setTimeout(() => controller.abort(), 2000);
                await fetch('https://www.google.com/favicon.ico', {
                    mode: 'no-cors',
                    signal: controller.signal,
                    cache: 'no-store'
                });
                clearTimeout(id);
                return true;
            } catch (err) {
                return false;
            }
        }
    };

    useEffect(() => {
        if (user && appData.circles.length > 0) {
            const updatedCircles = appData.circles.map(c => {
                if (!c.authorizedUserIds || !Array.isArray(c.authorizedUserIds) || c.authorizedUserIds.length === 0) {
                    return { ...c, authorizedUserIds: user ? [user.uid] : [] };
                }
                return c;
            });
            
            if (JSON.stringify(updatedCircles) !== JSON.stringify(appData.circles)) {
                setAppData(prev => ({ ...prev, circles: updatedCircles }));
            }
        }
    }, [user]);

    const lastSyncedCircles = useRef<Record<string, CircleData>>({});
    const lastSyncedLogos = useRef<Record<string, string | undefined>>({});

    // Offline-First Sync Queue
    const [syncQueue, setSyncQueue] = useLocalStorage<SyncJob[]>('tahfeezSyncQueue_v1', []);
    const syncQueueRef = useRef(syncQueue);
    useEffect(() => {
        syncQueueRef.current = syncQueue;
    }, [syncQueue]);

    const [manualSyncTrigger, setManualSyncTrigger] = useState(0);
    const lastLocalState = useRef<Record<string, CircleData>>({});
    const hasPendingWritesRef = useRef(false);

    const isSynced = useMemo(() => {
        if (!appData.activeCircleId) return true;
        return !syncQueue.some(job => job.circleId === appData.activeCircleId);
    }, [syncQueue, appData.activeCircleId]);

    // Sync Diagnostics & Live Activity Feed States
    const [syncEvents, setSyncEvents] = useState<{ id: string; timestamp: number; type: string; message: string; category: 'success' | 'info' | 'warning' | 'incoming' }[]>([]);
    const [isWorkerActive, setIsWorkerActive] = useState(false);
    const [currentlyUploadingItem, setCurrentlyUploadingItem] = useState<string | null>(null);
    const [realTimeReceivedCount, setRealTimeReceivedCount] = useState(0);
    const [failedJobs, setFailedJobs] = useState<SyncJob[]>([]);
    const [lastSyncTimestamp, setLastSyncTimestamp] = useLocalStorage<number | null>('tahfeezLastSyncTimestamp_v1', null);

    const addSyncEvent = useCallback((type: string, message: string, category: 'success' | 'info' | 'warning' | 'incoming') => {
        setSyncEvents(prev => [
            {
                id: String(generateUniqueId()),
                timestamp: Date.now(),
                type,
                message,
                category
            },
            ...prev
        ].slice(0, 50));
    }, []);

    const getArabicCollectionName = (col: string) => {
        switch(col) {
            case 'students': return 'بيانات طالب';
            case 'sessions': return 'جلسة تسميع';
            case 'plans': return 'خطة حفظ ومراجعة';
            case 'tests': return 'اختبار';
            case 'activities': return 'نشاط حلقة';
            case 'announcements': return 'إعلان جديد';
            case 'studentReports': return 'تقرير طالب';
            case 'supervisorReports': return 'تقرير مشرف';
            case 'circles': return 'بيانات حلقة';
            default: return col;
        }
    };



    const totalSynced = useMemo(() => {
        let count = 0;
        appData.circles.forEach(circle => {
            const collections: ('students' | 'sessions' | 'plans' | 'tests' | 'activities' | 'announcements' | 'studentReports' | 'supervisorReports')[] = [
                'students', 'sessions', 'plans', 'tests', 'activities', 'announcements', 'studentReports', 'supervisorReports'
            ];
            collections.forEach(col => {
                const arr = (circle[col] as any[]) || [];
                arr.forEach(item => {
                    if (item.syncStatus !== 'pending') {
                        count++;
                    }
                });
            });
        });
        return count;
    }, [appData.circles]);

    // Helper: merge metadata-only attributes of a circle
    const mergeCircleMetadata = (local: CircleData, remote: CircleData): CircleData => {
        const merged = { ...local };
        const metadataKeys = [
            'id', 'teacher', 'circle', 'center', 'town', 'centerId', 'managementId',
            'logo', 'teacherGender', 'settings', 'notificationSettings', 'dismissedNotificationIds',
            'studyStartDate', 'lastWelcomeTipShow', 'lessonTypes', 'hasSeenWelcomePopup',
            'hasCompletedOnboarding', 'hasShownWelcomeNotification', 'hasShownDuaaNotification',
            'supervisorSettings', 'lastDailyNotificationDate', 'lastRareNotificationDate',
            'rareNotificationIndex', 'activityTypes', 'hasShownStatsNotification_d2',
            'hasShownStudentCardNotification_d5', 'hasShownSupervisorReportNotification_w2',
            'hasShownAddonsNotification_m1', 'hasShownContactDevNotification_m2',
            'lastMonthlyStatsNotification', 'hasAgreedToCommunityTerms', 'hasShownFeedbackRequest',
            'bulkRewards', 'numericId', 'transferCode', 'transferPassword', 'allowDirectEntry',
            'authorizedUserIds', 'ownerId', 'teachers', 'lastUpdated'
        ];
        metadataKeys.forEach(key => {
            if ((remote as any)[key] !== undefined) {
                (merged as any)[key] = (remote as any)[key];
            }
        });
        return merged;
    };

    // Helper: get only circle metadata keys
    const getCircleMetadata = (circle: CircleData): any => {
        const metadata: any = {};
        const metadataKeys = [
            'id', 'teacher', 'circle', 'center', 'town', 'centerId', 'managementId',
            'logo', 'teacherGender', 'settings', 'notificationSettings', 'dismissedNotificationIds',
            'studyStartDate', 'lastWelcomeTipShow', 'lessonTypes', 'hasSeenWelcomePopup',
            'hasCompletedOnboarding', 'hasShownWelcomeNotification', 'hasShownDuaaNotification',
            'supervisorSettings', 'lastDailyNotificationDate', 'lastRareNotificationDate',
            'rareNotificationIndex', 'activityTypes', 'hasShownStatsNotification_d2',
            'hasShownStudentCardNotification_d5', 'hasShownSupervisorReportNotification_w2',
            'hasShownAddonsNotification_m1', 'hasShownContactDevNotification_m2',
            'lastMonthlyStatsNotification', 'hasAgreedToCommunityTerms', 'hasShownFeedbackRequest',
            'bulkRewards', 'numericId', 'transferCode', 'transferPassword', 'allowDirectEntry',
            'authorizedUserIds', 'ownerId', 'teachers', 'lastUpdated'
        ];
        metadataKeys.forEach(key => {
            if ((circle as any)[key] !== undefined) {
                metadata[key] = (circle as any)[key];
            }
        });
        return metadata;
    };

    // Helper: prepare and sanitize data for Firestore writes
    const prepareDataForFirestore = (data: any) => {
        if (!data) return data;
        const { syncStatus, ...rest } = data;
        return sanitizeForFirestore(rest);
    };

    // Helper: convert doc content to local item
    const convertDocToItem = (docId: string, data: any) => {
        const id = isNaN(Number(docId)) ? docId : Number(docId);
        return {
            ...data,
            id
        };
    };

    // Helper: enqueue job in sync queue with deduplication
    const enqueueSyncJob = useCallback((
        circleId: string,
        collectionName: string,
        itemId: string | number,
        action: 'set' | 'delete',
        data: any
    ) => {
        setSyncQueue(prev => {
            const filtered = prev.filter(job => 
                !(job.circleId === circleId && job.collection === collectionName && job.itemId === itemId)
            );
            const newJob: SyncJob = {
                id: String(Date.now()) + Math.random().toString(36).substring(2, 7),
                circleId,
                collection: collectionName as any,
                itemId,
                action,
                data: data ? prepareDataForFirestore(data) : null,
                timestamp: Date.now()
            };
            return [...filtered, newJob];
        });
    }, [setSyncQueue]);

    // Helper: recursively normalize Firestore Timestamp objects and JS Dates to numeric millisecond values
    const deepNormalizeTimestamps = (val: any): any => {
        if (val === null || val === undefined) return val;
        
        // Firestore Timestamp or equivalent object with seconds/nanoseconds keys
        if (typeof val === 'object' && 'seconds' in val && 'nanoseconds' in val) {
            return val.seconds * 1000 + Math.floor(val.nanoseconds / 1000000);
        }
        
        // JS Date
        if (val instanceof Date) {
            return val.getTime();
        }
        
        // Array
        if (Array.isArray(val)) {
            return val.map(deepNormalizeTimestamps);
        }
        
        // Object
        if (typeof val === 'object') {
            const normalized: any = {};
            for (const key of Object.keys(val)) {
                normalized[key] = deepNormalizeTimestamps(val[key]);
            }
            return normalized;
        }
        
        return val;
    };

    // Helper: recursively strip transient/temporary fields (syncStatus, updatedAt, lastSeen, lastUpdated, lastActive, syncQueue) for content comparison
    const stripTemporaryFields = (val: any): any => {
        if (val === null || val === undefined) return val;
        
        if (Array.isArray(val)) {
            return val.map(stripTemporaryFields);
        }
        
        if (typeof val === 'object') {
            const cleaned: any = {};
            for (const key of Object.keys(val)) {
                // Ignore transient and local/temporary fields to prevent infinite sync loops
                if (['syncStatus', 'updatedAt', 'lastSeen', 'lastUpdated', 'lastActive', 'syncQueue'].includes(key)) {
                    continue;
                }
                cleaned[key] = stripTemporaryFields(val[key]);
            }
            return cleaned;
        }
        
        return val;
    };

    // Helper: normalize items for change detection comparison (ignore sync metadata)
    const normalizeItemForComparison = (item: any) => {
        if (!item) return null;
        return stripTemporaryFields(deepNormalizeTimestamps(item));
    };

    // Sync FROM Firestore: Circle Metadata
    useEffect(() => {
        if (!user || !db) {
            if (!user) setIsInitialSyncComplete(false);
            return;
        }

        const q = query(collection(db, 'circles'), where('authorizedUserIds', 'array-contains', user.uid));
        
        const unsubscribe = onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
            const firestoreCircles = snapshot.docs.map(doc => doc.data() as CircleData);
            
            hasPendingWritesRef.current = snapshot.metadata.hasPendingWrites;
            if (!snapshot.metadata.hasPendingWrites) {
                snapshot.docs.forEach(doc => {
                    const circleData = doc.data() as CircleData;
                    lastSyncedCircles.current[circleData.id] = circleData;
                });
            }

            const synced = !snapshot.metadata.hasPendingWrites;
            setIsInitialSyncComplete(true);

            if (snapshot.docChanges().length === 0 && isInitialSyncComplete) return;

            const isFreshCacheEmpty = snapshot.empty && snapshot.metadata.fromCache && appData.circles.length > 0;
            
            if (!isFreshCacheEmpty) {
                setAppData(prev => {
                    const circlesMap = new Map<string, CircleData>();
                    prev.circles.forEach(c => circlesMap.set(c.id, c));
                    
                    let hasRealChanges = false;
                    snapshot.docChanges().forEach(change => {
                        const circleData = change.doc.data() as CircleData;
                        if (change.type === 'added' || change.type === 'modified') {
                            const existing = circlesMap.get(circleData.id);
                            if (existing) {
                                const merged = mergeCircleMetadata(existing, circleData);
                                const normMerged = stripTemporaryFields(deepNormalizeTimestamps(getCircleMetadata(merged)));
                                const normExisting = stripTemporaryFields(deepNormalizeTimestamps(getCircleMetadata(existing)));
                                if (JSON.stringify(normMerged) !== JSON.stringify(normExisting)) {
                                    circlesMap.set(circleData.id, merged);
                                    hasRealChanges = true;
                                    lastLocalState.current[merged.id] = JSON.parse(JSON.stringify(merged));
                                }
                            } else {
                                // Load drafts from local storage if available
                                const storedDraftsRaw = localStorage.getItem(`tahfeez_drafts_${user.uid}`);
                                const storedDrafts = storedDraftsRaw ? JSON.parse(storedDraftsRaw) : {};
                                const circleDrafts = storedDrafts[circleData.id] || {};
                                
                                const newCircle = {
                                    ...defaultsForOptionalFields,
                                    ...circleData,
                                    students: [],
                                    sessions: [],
                                    plans: [],
                                    tests: [],
                                    activities: [],
                                    announcements: [],
                                    studentReports: [],
                                    supervisorReports: [],
                                    draftSession: circleDrafts.draftSession || null,
                                    sessionDrafts: circleDrafts.sessionDrafts || {},
                                    draftTest: circleDrafts.draftTest || null,
                                    draftPlan: circleDrafts.draftPlan || null,
                                    draftActivity: circleDrafts.draftActivity || null,
                                    draftAnnouncement: circleDrafts.draftAnnouncement || null
                                };
                                circlesMap.set(circleData.id, newCircle);
                                hasRealChanges = true;
                                lastLocalState.current[circleData.id] = JSON.parse(JSON.stringify(newCircle));
                            }
                        } else if (change.type === 'removed') {
                            circlesMap.delete(circleData.id);
                            hasRealChanges = true;
                            delete lastLocalState.current[circleData.id];
                        }
                    });
                    
                    if (!hasRealChanges && isInitialSyncComplete) return prev;

                    let mergedCircles = Array.from(circlesMap.values());
                    
                    if (!snapshot.metadata.fromCache) {
                        const firestoreIds = new Set(firestoreCircles.map(c => c.id));
                        mergedCircles = mergedCircles.filter(c => firestoreIds.has(c.id) || !c.authorizedUserIds?.includes(user.uid));
                    }
                    
                    let newActiveId = prev.activeCircleId;
                    if (newActiveId && !mergedCircles.find(c => c.id === newActiveId)) {
                        newActiveId = mergedCircles.length > 0 ? mergedCircles[0].id : null;
                    } else if (!newActiveId && mergedCircles.length > 0) {
                        newActiveId = mergedCircles[0].id;
                    }

                    return { ...prev, circles: mergedCircles, activeCircleId: newActiveId };
                });
            }
        }, (error) => {
            console.error("Firestore metadata sync error:", error);
            setIsInitialSyncComplete(true); 
        });

        return () => unsubscribe();
    }, [user]);

    // Subcollection real-time delta merger (receives granular changes and merges into appData state)
    const updateSubcollectionItem = useCallback((
        circleId: string,
        collectionName: 'students' | 'sessions' | 'plans' | 'tests' | 'activities' | 'announcements' | 'studentReports' | 'supervisorReports',
        changes: { type: 'added' | 'modified' | 'removed'; id: string | number; data: any }[]
    ) => {
        setAppData(prev => {
            const circles = prev.circles.map(c => {
                if (c.id !== circleId) return c;
                
                let currentArray = (c[collectionName] as any[]) || [];
                currentArray = [...currentArray];
                
                changes.forEach(change => {
                    const itemId = change.id;
                    if (change.type === 'added' || change.type === 'modified') {
                        // Check if there is an active/pending delete job for this item in the syncQueue
                        const isLocallyDeleted = syncQueueRef.current.some(job => 
                            job.circleId === circleId && 
                            job.collection === collectionName && 
                            job.itemId === itemId && 
                            job.action === 'delete'
                        );
                        if (isLocallyDeleted) {
                            // Skip restoring this item, because we have a pending local deletion for it!
                            return;
                        }

                        const idx = currentArray.findIndex(item => item.id === itemId);
                        const incomingItem = { ...change.data, syncStatus: 'synced' as const };
                        
                        if (idx > -1) {
                            const currentItem = currentArray[idx];
                            // Offline-First principle: if local item has pending changes, keep the local version!
                            if (currentItem.syncStatus === 'pending') {
                                return;
                            }
                            currentArray[idx] = incomingItem;
                        } else {
                            currentArray.push(incomingItem);
                        }
                    } else if (change.type === 'removed') {
                        currentArray = currentArray.filter(item => item.id !== itemId);
                    }
                });
                
                const updatedCircle = { ...c, [collectionName]: currentArray };
                lastLocalState.current[circleId] = JSON.parse(JSON.stringify(updatedCircle));
                return updatedCircle;
            });
            return { ...prev, circles };
        });
    }, [setAppData]);

    // Real-time subcollection listeners (Receives updates for modified elements only)
    useEffect(() => {
        if (!user || !db) return;

        const activeCircleIds = appData.circles
            .filter(c => c && c.id && c.authorizedUserIds?.includes(user.uid))
            .map(c => c.id);

        const unsubscribes: (() => void)[] = [];
        const listenerFirstFired: Record<string, boolean> = {};

        activeCircleIds.forEach(circleId => {
            if (!circleId) return;
            const collections: ('students' | 'sessions' | 'plans' | 'tests' | 'activities' | 'announcements' | 'studentReports' | 'supervisorReports')[] = [
                'students', 'sessions', 'plans', 'tests', 'activities', 'announcements', 'studentReports', 'supervisorReports'
            ];

            collections.forEach(colName => {
                const listenerKey = `${circleId}_${colName}`;
                const colRef = collection(db, 'circles', circleId, colName);
                const unsub = onSnapshot(colRef, (snapshot) => {
                    const changes = snapshot.docChanges().map(change => {
                        const docId = change.doc.id;
                        const data = change.doc.data();
                        return {
                            type: change.type,
                            id: isNaN(Number(docId)) ? docId : Number(docId),
                            data: convertDocToItem(docId, data)
                        };
                    });

                    const isFirstFired = listenerFirstFired[listenerKey];
                    if (!isFirstFired) {
                        listenerFirstFired[listenerKey] = true;
                    } else if (changes.length > 0 && !snapshot.metadata.hasPendingWrites) {
                        snapshot.docChanges().forEach(change => {
                            const data = change.doc.data();
                            const name = data.name || data.title || data.date || '';
                            const arabicCol = getArabicCollectionName(colName);
                            const displayLabel = name ? `${arabicCol} (${name})` : arabicCol;
                            
                            if (change.type === 'added') {
                                addSyncEvent('received_new', `تم استلام ${displayLabel} جديد مضاف ✔`, 'incoming');
                                setRealTimeReceivedCount(prev => prev + 1);
                            } else if (change.type === 'modified') {
                                addSyncEvent('received_update', `تم استلام تحديث لـ ${displayLabel} ✔`, 'incoming');
                                setRealTimeReceivedCount(prev => prev + 1);
                            } else if (change.type === 'removed') {
                                addSyncEvent('received_delete', `تم استلام حذف لـ ${arabicCol} 🗑`, 'incoming');
                                setRealTimeReceivedCount(prev => prev + 1);
                            }
                        });
                    }

                    if (changes.length > 0) {
                        updateSubcollectionItem(circleId, colName, changes);
                    }
                }, (error) => {
                    console.error(`Error listening to ${colName} for circle ${circleId}:`, error);
                });

                unsubscribes.push(unsub);
            });
        });

        return () => {
            unsubscribes.forEach(unsub => unsub());
        };
    }, [user, appData.circles.map(c => c ? c.id : '').filter(Boolean).join(','), updateSubcollectionItem, addSyncEvent]);

    // Change Detector: scans local state transitions, marks unsynced changes as pending, and queues them
    useEffect(() => {
        // Initialize lastLocalState with existing circles on startup/mount to prevent redundant startup queueing
        // This MUST run even before checking for user to capture local storage state immediately on mount!
        if (Object.keys(lastLocalState.current).length === 0 && appData.circles.length > 0) {
            appData.circles.forEach(circle => {
                if (circle && circle.id) {
                    lastLocalState.current[circle.id] = JSON.parse(JSON.stringify(circle));
                }
            });
            return;
        }

        if (!user) return;

        let hasPendingStatusUpdates = false;
        const updatedCircles = appData.circles.map(circle => {
            if (!circle || !circle.id) return circle;
            const prevCircle = lastLocalState.current[circle.id];
            
            // New Circle Detected
            if (!prevCircle) {
                lastLocalState.current[circle.id] = JSON.parse(JSON.stringify(circle));
                
                enqueueSyncJob(circle.id, 'circles', circle.id, 'set', sanitizeForFirestore(getCircleMetadata(circle)));
                
                const collections: ('students' | 'sessions' | 'plans' | 'tests' | 'activities' | 'announcements' | 'studentReports' | 'supervisorReports')[] = [
                    'students', 'sessions', 'plans', 'tests', 'activities', 'announcements', 'studentReports', 'supervisorReports'
                ];
                
                collections.forEach(col => {
                    const items = (circle[col] as any[]) || [];
                    items.forEach(item => {
                        // CRITICAL Delta Sync: NEVER re-upload items already marked as synced
                        if (item.syncStatus !== 'synced') {
                            enqueueSyncJob(circle.id, col, item.id, 'set', sanitizeForFirestore(item));
                        }
                    });
                });
                
                return circle;
            }

            // Existing Circle. Check metadata changes
            const prevMetadata = getCircleMetadata(prevCircle);
            const currentMetadata = getCircleMetadata(circle);
            
            const normalizedPrev = stripTemporaryFields(deepNormalizeTimestamps(prevMetadata));
            const normalizedCurrent = stripTemporaryFields(deepNormalizeTimestamps(currentMetadata));
            
            if (JSON.stringify(normalizedPrev) !== JSON.stringify(normalizedCurrent)) {
                enqueueSyncJob(circle.id, 'circles', circle.id, 'set', sanitizeForFirestore(currentMetadata));
            }

            // Check subcollection items
            let circleModified = false;
            const collections: ('students' | 'sessions' | 'plans' | 'tests' | 'activities' | 'announcements' | 'studentReports' | 'supervisorReports')[] = [
                'students', 'sessions', 'plans', 'tests', 'activities', 'announcements', 'studentReports', 'supervisorReports'
            ];

            const newSubcollectionData: any = {};

            collections.forEach(col => {
                const prevArray = (prevCircle[col] as any[]) || [];
                const currentArray = (circle[col] as any[]) || [];

                let arrayChanged = false;
                const mappedArray = currentArray.map(item => {
                    const prevItem = prevArray.find(pi => pi.id === item.id);
                    
                    if (!prevItem) {
                        // Added Item
                        if (item.syncStatus !== 'synced') {
                            enqueueSyncJob(circle.id, col, item.id, 'set', sanitizeForFirestore(item));
                            if (item.syncStatus !== 'pending') {
                                hasPendingStatusUpdates = true;
                                arrayChanged = true;
                                return { ...item, syncStatus: 'pending' as const };
                            }
                        }
                    } else {
                        // Compare normalized item content (exclude sync status/timestamps)
                        const normPrev = normalizeItemForComparison(prevItem);
                        const normCurrent = normalizeItemForComparison(item);
                        
                        if (JSON.stringify(normPrev) !== JSON.stringify(normCurrent)) {
                            // Modified Item
                            if (item.syncStatus !== 'synced') {
                                enqueueSyncJob(circle.id, col, item.id, 'set', sanitizeForFirestore(item));
                                if (item.syncStatus !== 'pending') {
                                    hasPendingStatusUpdates = true;
                                    arrayChanged = true;
                                    return { ...item, syncStatus: 'pending' as const };
                                }
                            }
                        }
                    }
                    return item;
                });

                // Detect Deleted Items
                prevArray.forEach(pi => {
                    const exists = currentArray.some(ci => ci.id === pi.id);
                    if (!exists) {
                        enqueueSyncJob(circle.id, col, pi.id, 'delete', null);
                    }
                });

                if (arrayChanged) {
                    newSubcollectionData[col] = mappedArray;
                    circleModified = true;
                }
            });

            // Update local comparison ref
            lastLocalState.current[circle.id] = JSON.parse(JSON.stringify(circle));

            if (circleModified) {
                return { ...circle, ...newSubcollectionData };
            }
            return circle;
        });

        if (hasPendingStatusUpdates) {
            setAppData(prev => ({ ...prev, circles: updatedCircles }));
        }

    }, [appData.circles, user, enqueueSyncJob, setAppData]);

    // Background Worker: sequential queue processing when connected
    const isSyncingRef = useRef(false);
    useEffect(() => {
        if (!user || !db || !navigator.onLine || syncQueue.length === 0 || isSyncingRef.current) return;

        const processQueue = async () => {
            isSyncingRef.current = true;
            setIsWorkerActive(true);

            const jobsToProcess = [...syncQueue];
            const failedJobIds = new Set<string>();
            const runningJobs = new Set<string>();
            const completedJobIds = new Set<string>();
            let networkErrorOccurred = false;

            // Maximum concurrent operations allowed
            const CONCURRENCY_LIMIT = 6;

            const getJobDocKey = (j: any) => {
                return j.collection === 'circles' 
                    ? `${j.circleId}/circles/${j.circleId}` 
                    : `${j.circleId}/${j.collection}/${j.itemId}`;
            };

            // Checks if a job at idx in jobsToProcess is blocked by any earlier job or running job
            const isJobBlocked = (job: any, index: number) => {
                const jobDocKey = getJobDocKey(job);

                // 1. Block if another job for the same document is already running
                for (const rId of runningJobs) {
                    const rJob = jobsToProcess.find(j => j.id === rId);
                    if (!rJob) continue;
                    
                    if (getJobDocKey(rJob) === jobDocKey) return true;
                    
                    // If running a circles parent document write/delete, block all subcollection writes/deletes for the same circle
                    if (rJob.collection === 'circles' && rJob.circleId === job.circleId && job.collection !== 'circles') {
                        return true;
                    }
                }

                // 2. Block if there is any earlier incomplete job for the same document
                for (let i = 0; i < index; i++) {
                    const earlierJob = jobsToProcess[i];
                    if (completedJobIds.has(earlierJob.id) || failedJobIds.has(earlierJob.id)) {
                        continue;
                    }

                    if (getJobDocKey(earlierJob) === jobDocKey) return true;

                    // If there is an earlier incomplete circles parent document job, block subcollections
                    if (earlierJob.collection === 'circles' && earlierJob.circleId === job.circleId && job.collection !== 'circles') {
                        return true;
                    }
                }

                return false;
            };

            const executeJob = async (job: any) => {
                if (!job.circleId) {
                    console.error("Discarding invalid job (missing circleId):", job);
                    failedJobIds.add(job.id);
                    setFailedJobs(prev => {
                        if (!prev.some(j => j.id === job.id)) return [...prev, job];
                        return prev;
                    });
                    return;
                }

                const arabicCol = getArabicCollectionName(job.collection);
                const itemName = job.data && (job.data.name || job.data.title || job.data.date || '');
                const label = itemName ? `${arabicCol} (${itemName})` : arabicCol;
                setCurrentlyUploadingItem(label);

                try {
                    if (job.collection === 'circles') {
                        const ref = doc(db, 'circles', String(job.circleId));
                        if (job.action === 'set') {
                            // Since we use { merge: true }, deleted keys from the 'teachers' map on the client
                            // won't be deleted on the Firestore server. To fix this, we fetch the existing doc,
                            // find any keys in 'teachers' that are no longer present in job.data.teachers,
                            // and mark them for deletion using deleteField().
                            let finalData = { ...job.data };
                            try {
                                const currentDocSnap = await getDoc(ref);
                                if (currentDocSnap.exists()) {
                                    const currentDocData = currentDocSnap.data();
                                    if (currentDocData && currentDocData.teachers && job.data.teachers) {
                                        const mergedTeachers = { ...job.data.teachers };
                                        let hasDeletions = false;
                                        Object.keys(currentDocData.teachers).forEach(uid => {
                                            if (job.data.teachers[uid] === undefined) {
                                                mergedTeachers[uid] = deleteField();
                                                hasDeletions = true;
                                            }
                                        });
                                        if (hasDeletions) {
                                            finalData.teachers = mergedTeachers;
                                        }
                                    }
                                }
                            } catch (e) {
                                console.error("Error checking for deleted teachers on server:", e);
                            }

                            await setDoc(ref, finalData, { merge: true });
                            addSyncEvent('upload_success', `تم رفع وتحديث بيانات حلقة التحفيظ بنجاح ✔`, 'success');
                            
                            // Align lastLocalState directly after successful upload
                            setAppData(prev => {
                                const currentCircle = prev.circles.find(c => c.id === job.circleId);
                                if (currentCircle) {
                                    lastLocalState.current[job.circleId] = JSON.parse(JSON.stringify(currentCircle));
                                }
                                return prev;
                            });
                        } else if (job.action === 'delete') {
                            await deleteDoc(ref);
                            addSyncEvent('upload_success', `تم حذف حلقة التحفيظ بنجاح ✔`, 'success');
                        }
                    } else {
                        if (!job.itemId) {
                            console.error("Discarding invalid subcollection job (missing itemId):", job);
                            failedJobIds.add(job.id);
                            setFailedJobs(prev => {
                                if (!prev.some(j => j.id === job.id)) return [...prev, job];
                                return prev;
                            });
                            return;
                        }
                        const ref = doc(db, 'circles', String(job.circleId), job.collection, String(job.itemId));
                        if (job.action === 'set') {
                            await setDoc(ref, job.data, { merge: true });
                            addSyncEvent('upload_success', `تم رفع وتأمين ${label} بنجاح ✔`, 'success');
                        } else if (job.action === 'delete') {
                            await deleteDoc(ref);
                            addSyncEvent('upload_success', `تم حذف ${label} بنجاح ✔`, 'success');
                        }
                    }

                    setLastSyncTimestamp(Date.now());
                    completedJobIds.add(job.id);

                    // Remove successfully processed job from queue
                    setSyncQueue(prev => prev.filter(j => j.id !== job.id));

                    // Update local item status to synced in appData
                    if (job.action === 'set' && job.collection !== 'circles') {
                        setAppData(prev => {
                            const circles = prev.circles.map(c => {
                                if (c.id !== job.circleId) return c;
                                const arr = (c[job.collection] as any[]) || [];
                                const idx = arr.findIndex(item => item.id === job.itemId);
                                if (idx > -1) {
                                    const updatedArr = [...arr];
                                    updatedArr[idx] = { ...updatedArr[idx], syncStatus: 'synced' as const };
                                    return { ...c, [job.collection]: updatedArr };
                                }
                                return c;
                            });
                            return { ...prev, circles };
                        });
                    }

                } catch (error: any) {
                    console.error("Failed to process sync job:", job, error);
                    const arabicCol = getArabicCollectionName(job.collection);
                    addSyncEvent('upload_fail', `فشل رفع ${arabicCol} مؤقتاً بسبب مشكلة في الشبكة ❌`, 'warning');
                    
                    // If it's a fatal path error or permission error, discard the job to prevent infinite blocking
                    if (error && error.message && (error.message.includes('indexOf') || error.message.includes('permission') || error.message.includes('Missing or insufficient permissions'))) {
                        failedJobIds.add(job.id);
                        setFailedJobs(prev => {
                            if (!prev.some(j => j.id === job.id)) return [...prev, job];
                            return prev;
                        });
                    } else {
                        // Mark network error to prevent launching any more new requests
                        networkErrorOccurred = true;
                    }
                }
            };

            // Event-driven signaling for job completions to resume/pump the queue
            let eventResolver: (() => void) | null = null;
            const triggerEvent = () => {
                if (eventResolver) {
                    eventResolver();
                    eventResolver = null;
                }
            };
            const nextEvent = () => new Promise<void>(resolve => {
                eventResolver = resolve;
            });

            // Parallel worker orchestration loop
            while (true) {
                if (!navigator.onLine || networkErrorOccurred) {
                    // Wait for currently executing concurrent tasks to finish cleanly before exiting
                    if (runningJobs.size > 0) {
                        await nextEvent();
                        continue;
                    }
                    break;
                }

                // Identify all currently eligible/unblocked jobs in the snapshotted queue
                const nextJobsToLaunch: any[] = [];
                for (let i = 0; i < jobsToProcess.length; i++) {
                    const job = jobsToProcess[i];
                    if (completedJobIds.has(job.id) || failedJobIds.has(job.id) || runningJobs.has(job.id)) {
                        continue;
                    }
                    if (!isJobBlocked(job, i)) {
                        nextJobsToLaunch.push(job);
                    }
                }

                // Done processing or no progress can be made (remaining items are either completed or blocked)
                if (runningJobs.size === 0 && nextJobsToLaunch.length === 0) {
                    break;
                }

                // Launch ready jobs up to the concurrency limit
                let launched = false;
                while (runningJobs.size < CONCURRENCY_LIMIT && nextJobsToLaunch.length > 0 && !networkErrorOccurred && navigator.onLine) {
                    const job = nextJobsToLaunch.shift();
                    runningJobs.add(job.id);
                    launched = true;

                    executeJob(job).finally(() => {
                        runningJobs.delete(job.id);
                        triggerEvent();
                    });
                }

                // If tasks are active, yield and wait for one of them to finish
                if (runningJobs.size > 0) {
                    await nextEvent();
                } else {
                    // Safety break in case of potential dependency deadlock/cycle
                    console.warn("Parallel sync queue deadlock/idle state. Stopping processQueue.");
                    break;
                }
            }
            
            if (failedJobIds.size > 0) {
                setSyncQueue(prev => prev.filter(j => !failedJobIds.has(j.id)));
            }

            isSyncingRef.current = false;
            setIsWorkerActive(false);
            setCurrentlyUploadingItem(null);
        };

        processQueue();
    }, [syncQueue, user, navigator.onLine, setAppData, setSyncQueue, manualSyncTrigger]);

    // Manual sync triggers background queue processing (Silent - no notifications)
    const handleManualSync = async () => {
        if (!user) return;
        if (!navigator.onLine) return;
        
        // If there are failed jobs, move them back to syncQueue so they are processed on manual sync
        if (failedJobs.length > 0) {
            setSyncQueue(prev => {
                const combined = [...prev];
                failedJobs.forEach(job => {
                    if (!combined.some(j => j.id === job.id)) {
                        combined.push(job);
                    }
                });
                return combined;
            });
            setFailedJobs([]);
        }

        // Trigger the background worker process queue effect
        setManualSyncTrigger(prev => prev + 1);
        
        // Wait until sync is completed (queue empty) or worker inactive
        await new Promise<void>((resolve, reject) => {
            let checks = 0;
            const interval = setInterval(() => {
                checks++;
                // Check if worker is inactive, queue is empty, or max wait of 8 seconds reached
                if (!isSyncingRef.current || checks > 80) {
                    clearInterval(interval);
                    resolve();
                }
            }, 100);
        });
    };

    const handleRetryJob = async (jobId: string): Promise<boolean> => {
        if (!navigator.onLine) {
            addToast('❌ لا يوجد اتصال بالإنترنت لإعادة المحاولة', 'error');
            return false;
        }

        const job = syncQueue.find(j => j.id === jobId);
        if (!job) return false;

        try {
            const arabicCol = getArabicCollectionName(job.collection);
            const itemName = job.data && (job.data.name || job.data.title || job.data.date || '');
            const label = itemName ? `${arabicCol} (${itemName})` : arabicCol;
            
            setCurrentlyUploadingItem(`إعادة محاولة: ${label}`);
            
            if (job.collection === 'circles') {
                const ref = doc(db, 'circles', String(job.circleId));
                if (job.action === 'set') {
                    await setDoc(ref, job.data, { merge: true });
                } else if (job.action === 'delete') {
                    await deleteDoc(ref);
                }
            } else {
                const ref = doc(db, 'circles', String(job.circleId), job.collection, String(job.itemId));
                if (job.action === 'set') {
                    await setDoc(ref, job.data, { merge: true });
                } else if (job.action === 'delete') {
                    await deleteDoc(ref);
                }
            }

            // Remove successfully processed job from queue
            setSyncQueue(prev => prev.filter(j => j.id !== jobId));

            // Update local item status to synced in appData
            if (job.action === 'set' && job.collection !== 'circles') {
                setAppData(prev => {
                    const circles = prev.circles.map(c => {
                        if (c.id !== job.circleId) return c;
                        const arr = (c[job.collection] as any[]) || [];
                        const idx = arr.findIndex(item => item.id === job.itemId);
                        if (idx > -1) {
                            const updatedArr = [...arr];
                            updatedArr[idx] = { ...updatedArr[idx], syncStatus: 'synced' as const };
                            return { ...c, [job.collection]: updatedArr };
                        }
                        return c;
                    });
                    return { ...prev, circles };
                });
            }

            setCurrentlyUploadingItem(null);
            setLastSyncTimestamp(Date.now());
            addSyncEvent('upload_success', `تم إعادة رفع وتأمين ${label} بنجاح ✔`, 'success');
            return true;
        } catch (error: any) {
            console.error("Manual retry failed for job:", job, error);
            setCurrentlyUploadingItem(null);
            addSyncEvent('upload_fail', `فشلت إعادة محاولة رفع العنصر مؤقتاً ❌`, 'warning');
            return false;
        }
    };

    // Sync Queue Recovery: on startup, ensure any locally 'pending' items are present in the syncQueue
    useEffect(() => {
        if (!user || appData.circles.length === 0) return;

        let queueUpdated = false;
        const newJobs: SyncJob[] = [];

        appData.circles.forEach(circle => {
            const collections: ('students' | 'sessions' | 'plans' | 'tests' | 'activities' | 'announcements' | 'studentReports' | 'supervisorReports')[] = [
                'students', 'sessions', 'plans', 'tests', 'activities', 'announcements', 'studentReports', 'supervisorReports'
            ];
            
            collections.forEach(col => {
                const items = (circle[col] as any[]) || [];
                items.forEach(item => {
                    if (item.syncStatus === 'pending') {
                        // Check if already in syncQueue
                        const existsInQueue = syncQueue.some(job => 
                            job.circleId === circle.id && job.collection === col && String(job.itemId) === String(item.id)
                        );
                        if (!existsInQueue) {
                            const newJob: SyncJob = {
                                id: String(Date.now()) + Math.random().toString(36).substring(2, 7),
                                circleId: circle.id,
                                collection: col,
                                itemId: item.id,
                                action: 'set',
                                data: prepareDataForFirestore(item),
                                timestamp: Date.now()
                            };
                            newJobs.push(newJob);
                            queueUpdated = true;
                        }
                    }
                });
            });
        });

        if (queueUpdated && newJobs.length > 0) {
            setSyncQueue(prev => {
                const filtered = prev.filter(job => 
                    !newJobs.some(nj => nj.circleId === job.circleId && nj.collection === job.collection && String(nj.itemId) === String(job.itemId))
                );
                return [...filtered, ...newJobs];
            });
        }
    }, [user]);

    const handleLinkCirclesSuccess = (loggedInUser: User) => {
        // The linking is handled by the onAuthStateChanged effect, 
        // but we ensure it happens immediately here too for better UX
        setUser(loggedInUser);
        setAppData(prev => {
            const updated = prev.circles.map(c => {
                const userIds = c.authorizedUserIds ? [...c.authorizedUserIds] : [];
                if (!userIds.includes(loggedInUser.uid)) {
                    userIds.push(loggedInUser.uid);
                    return { 
                        ...c, 
                        authorizedUserIds: userIds, 
                        ownerId: c.ownerId || loggedInUser.uid,
                        lastUpdated: Date.now() 
                    };
                }
                return c;
            });
            return { ...prev, circles: updated };
        });
    };

    useEffect(() => {
        const handleShowSignup = () => {
            setShowLoginModal(true);
        };
        window.addEventListener('auth:showSignup', handleShowSignup);
        return () => window.removeEventListener('auth:showSignup', handleShowSignup);
    }, []);

    const onNavigateToAccountSettings = () => {
        if (!user) {
            setShowLoginModal(true);
            return;
        }
        setProfileMode('account');
        setActiveSettingsPage('profile');
        setActivePage('settings');
        pushStateSafely();
    };

    const [alertModal, setAlertModal] = useState<AlertModalData>({ isOpen: false, title: '', message: '' });
    const [confirmationModal, setConfirmationModal] = useState<ConfirmationModalData>({ isOpen: false, title: '', message: '', onConfirm: () => {} });
    const [choiceModal, setChoiceModal] = useState<ChoiceModalData>({ isOpen: false, title: '', message: '', actions: [], onCancel: () => {} });
    const [lastRecordModal, setLastRecordModal] = useState<LastRecordModalData>({ isOpen: false });
    const [reportGeneratorModal, setReportGeneratorModal] = useState<ReportGeneratorModalData>({ isOpen: false, studentId: null });
    const [studentReportModal, setStudentReportModal] = useState<StudentReportModalData>({ isOpen: false, student: null, reportContent: '', period: '' });
    const [supervisorReportGeneratorOpen, setSupervisorReportGeneratorOpen] = useState(false);
    const [supervisorReportModal, setSupervisorReportModal] = useState<{ isOpen: boolean; reportContent: string; periodLabel: string }>({ isOpen: false, reportContent: '', periodLabel: '' });
    const [savedReportsModalOpen, setSavedReportsModalOpen] = useState(false);
    const [addonsModalOpen, setAddonsModalOpen] = useState(false);
    const [pointsSettingsModalOpen, setPointsSettingsModalOpen] = useState(false);
    const [notificationSettingsModalOpen, setNotificationSettingsModalOpen] = useState(false);
    const [viewReportModal, setViewReportModal] = useState<{ isOpen: boolean; report: StudentReport | SupervisorReport | null, type: 'student' | 'supervisor' }>({ isOpen: false, report: null, type: 'supervisor' });
    const [showLeaderboard, setShowLeaderboard] = useState(false);
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [isImportingCircle, setIsImportingCircle] = useState(false);
    const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
    const [viewingStudentId, setViewingStudentId] = useState<number | null>(null);
    const [showExitToast, setShowExitToast] = useState(false);
    const [quickSwitchModalOpen, setQuickSwitchModalOpen] = useState(false);
    const [shareModalData, setShareModalData] = useState<ShareModalData>({ isOpen: false });
    const [filenamePromptModal, setFilenamePromptModal] = useState({ isOpen: false, onConfirm: (name: string) => {}, title: '', label: '', initialValue: '', description: '' });
    const [backupRestoreModalOpen, setBackupRestoreModalOpen] = useState(false);
    const [textBackupModalOpen, setTextBackupModalOpen] = useState(false);
    const [textRestoreModalOpen, setTextRestoreModalOpen] = useState(false);
    const [backupReviewModalData, setBackupReviewModalData] = useState<CircleData | null>(null);
    const [communityTermsModalState, setCommunityTermsModalState] = useState<{ isOpen: boolean; targetLink: string | null }>({ isOpen: false, targetLink: null });
    const [rewardsManagerOpen, setRewardsManagerOpen] = useState(false);
    const [shareSessionCodeModal, setShareSessionCodeModal] = useState<{ isOpen: boolean; session: Session | null }>({ isOpen: false, session: null });
    const [importSessionCodeModalOpen, setImportSessionCodeModalOpen] = useState(false);


    const handleImportCircle = async (numericId: string, password?: string, teacherName?: string, teacherGender?: 'male' | 'female') => {
        if (!user || !db) {
            addToast("يرجى تسجيل الدخول أولاً لاستيراد حلقة من السحابة", 'error');
            return;
        }
        
        const sanitizedId = sanitizeToEnglishNumber(numericId);
        
        if (!sanitizedId || sanitizedId.length !== 6) {
            addToast("يرجى إدخال رقم حلقة صحيح مكون من 6 أرقام", 'error');
            return;
        }

        const sanitizedPassword = sanitizeToEnglishNumber(password || '');
        if (!sanitizedPassword || sanitizedPassword.length !== 4) {
            addToast("يرجى إدخال كلمة مرور صحيحة مكون من 4 أرقام", 'error');
            return;
        }

        setIsImportingCircle(true);
        try {
            console.log("Attempting to import circle with ID:", sanitizedId);
            
            // Try querying with string ID
            let q = query(
                collection(db, 'circles'), 
                where('numericId', '==', sanitizedId)
            );
            let snapshot = await getDocs(q);

            // Fallback: Try querying with number ID (for legacy data)
            if (snapshot.empty && !isNaN(Number(sanitizedId))) {
                console.log("String ID not found, trying numeric query...");
                q = query(
                    collection(db, 'circles'), 
                    where('numericId', '==', Number(sanitizedId))
                );
                snapshot = await getDocs(q);
            }

            if (snapshot.empty) {
                console.warn("Circle not found for ID:", sanitizedId);
                addToast("لا توجد حلقة بهذه البيانات. الرجاء التأكد وإعادة المحاولة.", 'error');
                setIsImportingCircle(false);
                return;
            }

            const circleDoc = snapshot.docs[0];
            const circleData = circleDoc.data() as CircleData;
            console.log("Circle found:", circleData.circle);

            const isCloudDuplicate = appData.circles.some(c => 
                c.id === circleDoc.id || 
                c.numericId === circleData.numericId ||
                c.circle.trim().toLowerCase() === circleData.circle.trim().toLowerCase()
            );

            if (isCloudDuplicate) {
                setAlertModal({ 
                    isOpen: true, 
                    title: 'تنبيه: حلقة مكررة', 
                    message: `عذراً، الحلقة "${circleData.circle}" موجودة مسبقاً في حسابك. لا يمكن استيراد نفس الحلقة مرتين لتجنب تكرار البيانات.` 
                });
                setIsImportingCircle(false);
                return;
            }

            // Validate password (check transferPassword or fallback to transferCode)
            // Sanitize both input and stored passwords to ensure comparison works regardless of numeral type
            const inputPassword = sanitizeToEnglishNumber(password || '').trim();
            const expectedPassword = sanitizeToEnglishNumber(circleData.transferPassword || circleData.transferCode || '').trim();

            if (expectedPassword !== inputPassword) {
                console.warn("Invalid password attempt for circle:", numericId, "Expected:", expectedPassword, "Got:", inputPassword);
                addToast("لا توجد حلقة بهذه البيانات. الرجاء التأكد وإعادة المحاولة.", 'error');
                setIsImportingCircle(false);
                return;
            }

            // Update authorizedUserIds and teachers map
            const currentAuthIds = Array.isArray(circleData.authorizedUserIds) ? circleData.authorizedUserIds : [];
            const updatedAuthorizedIds = currentAuthIds.includes(user.uid) 
                ? currentAuthIds 
                : [...currentAuthIds, user.uid];
            
            const now = Date.now();
            const isDirectEntry = circleData.allowDirectEntry !== false; // Default to true if undefined
            
            const updatedTeachers = { 
                ...(circleData.teachers || {}),
                [user.uid]: { 
                    name: userProfile?.displayName || teacherName || user.displayName || 'معلم جديد', 
                    gender: userProfile?.gender || teacherGender || 'male',
                    role: 'assistant' as const,
                    accessLevel: 'standard' as const,
                    status: isDirectEntry ? ('active' as const) : ('pending' as const),
                    joinedAt: now,
                    permissions: defaultMemberPermissions.assistant
                }
            };
            
            // If not direct entry, push a notification to the circle's internal notification list for admins to see
            let notifications = circleData.notifications || [];
            if (!isDirectEntry) {
                const approvalNotif: Notification = {
                    id: `approval_${user.uid}_${now}`,
                    type: 'info',
                    category: 'system',
                    message: `طلب انضمام جديد من المعلم ${userProfile?.displayName || teacherName || user.displayName}`,
                    createdAt: now,
                    metadata: {
                        uid: user.uid,
                        userName: userProfile?.displayName || teacherName || user.displayName || 'معلم جديد',
                        userPhoto: userProfile?.photoURL || user.photoURL || undefined,
                        userGender: (userProfile?.gender || teacherGender || 'male') as 'male' | 'female',
                        actionType: 'join_request'
                    }
                };
                notifications = [approvalNotif, ...notifications];
            }

            // 1. Update Firestore
            console.log("Updating Firestore for circle:", circleDoc.id);
            await updateDoc(doc(db, 'circles', circleDoc.id), {
                authorizedUserIds: updatedAuthorizedIds,
                teachers: updatedTeachers,
                notifications: notifications,
                lastUpdated: now
            });

            // 2. Update Local State Immediately to ensure UI transition
            const updatedCircle: CircleData = {
                ...defaultsForOptionalFields,
                ...circleData,
                id: circleDoc.id,
                authorizedUserIds: updatedAuthorizedIds,
                teachers: updatedTeachers,
                notifications: notifications,
                dismissedNotificationIds: circleData.dismissedNotificationIds || [],
                lastUpdated: now
            } as CircleData;

            setAppData(prev => {
                const existingIndex = prev.circles.findIndex(c => c.id === circleDoc.id);
                let newCircles = [...prev.circles];
                
                if (existingIndex >= 0) {
                    newCircles[existingIndex] = updatedCircle;
                } else {
                    newCircles.push(updatedCircle);
                }

                console.log("Setting active circle to:", circleDoc.id);
                return {
                    ...prev,
                    circles: newCircles,
                    activeCircleId: circleDoc.id
                };
            });

            // Update navigation state directly
            setActivePage('home');
            setActiveSettingsPage('main');

            if (isDirectEntry) {
                addToast("تم استيراد الحلقة بنجاح!", 'success');
            } else {
                addToast("تم إرسال طلب الانضمام بنجاح. يرجى انتظار موافقة مشرفي الحلقة.", 'info');
            }
            
            // Success! Save automatically in history in the background
            const savedStr = localStorage.getItem('quran_saved_accounts');
            const savedAccounts = savedStr ? JSON.parse(savedStr) : [];
            const exists = savedAccounts.some((a: any) => a.id === (sanitizedId as string));
            if (!exists) {
                const newAccount = {
                    id: sanitizedId,
                    password: sanitizedPassword,
                    circleName: circleData.circle,
                    teacherName: teacherName || userProfile?.displayName || '',
                    displayName: circleData.circle
                };
                localStorage.setItem('quran_saved_accounts', JSON.stringify([...savedAccounts, newAccount]));
                window.dispatchEvent(new Event('quran:saved_accounts_updated'));
            }

            // 3. Close modals and exit setup
            setIsImportingCircle(false);
            setShowNewCircleForm(false);
            setIsInitialising(false); 

        } catch (error) {
            console.error("Import failed with error:", error);
            addToast("حدث خطأ أثناء الاستيراد. يرجى التأكد من الاتصال بالإنترنت.", 'error');
            setIsImportingCircle(false);
        }
    };

    const fetchCirclePreview = async (numericId: string): Promise<{ circle: string; center: string } | null> => {
        if (!db) return null;
        const sanitizedId = sanitizeToEnglishNumber(numericId);
        try {
            const q = query(collection(db, 'circles'), where('numericId', '==', sanitizedId));
            const snapshot = await getDocs(q);
            if (!snapshot.empty) {
                const data = snapshot.docs[0].data() as CircleData;
                return { circle: data.circle, center: data.center };
            }
        } catch (e) {
            console.error("Preview fetch failed:", e);
        }
        return null;
    };
    const [viewingTest, setViewingTest] = useState<Test | null>(null);
    const [notifyingTest, setNotifyingTest] = useState<Test | null>(null);
    const [viewingPlan, setViewingPlan] = useState<Plan | null>(null);
    const [notifyingPlan, setNotifyingPlan] = useState<Plan | null>(null);

    const [viewingActivity, setViewingActivity] = useState<Activity | null>(null);
    const [notifyingActivity, setNotifyingActivity] = useState<Activity | null>(null);

    const [viewingAnnouncement, setViewingAnnouncement] = useState<Announcement | null>(null);
    const [notifyingAnnouncement, setNotifyingAnnouncement] = useState<Announcement | null>(null);

    const [activePointsLogStudentId, setActivePointsLogStudentId] = useState<number | null>(null);
    const [activePointAdjusterStudentId, setActivePointAdjusterStudentId] = useState<number | null>(null);
    const [pointsForAdjuster, setPointsForAdjuster] = useState(0);

    // New state to manage sub-modals (Surah Selector, Profile Details, etc.)
    const [isSubModalOpen, setIsSubModalOpen] = useState(false);

    const historyRef = React.useRef<string[]>(['home']);
    const settingsHistoryRef = React.useRef<string[]>(['main']);
    const exitToastTimeoutRef = useRef<number | null>(null);
    const mainContainerRef = useRef<HTMLElement>(null);

    useEffect(() => {
        const activeCircleExists = appData.circles.find(c => c.id === appData.activeCircleId);

        if (!activeCircleExists && appData.circles.length > 0) {
            setAppData(prev => ({
                ...prev,
                activeCircleId: prev.circles[0].id,
            }));
        }

        setIsInitialising(!appData.activeCircleId || appData.circles.length === 0);

        const theme = activeCircle?.settings?.theme || 'dark';
        document.documentElement.classList.toggle('dark', theme === 'dark');

    }, [appData, activeCircle, setAppData]);
    // Save drafts to localStorage to preserve across logouts
    useEffect(() => {
        if (!user || appData.circles.length === 0) return;
        const draftsByCircle: Record<string, any> = {};
        appData.circles.forEach(c => {
            const hasDrafts = c.draftSession || Object.keys(c.sessionDrafts || {}).length > 0 || c.draftTest || c.draftPlan || c.draftActivity || c.draftAnnouncement;
            if (hasDrafts) {
                draftsByCircle[c.id] = {
                    draftSession: c.draftSession,
                    sessionDrafts: c.sessionDrafts,
                    draftTest: c.draftTest,
                    draftPlan: c.draftPlan,
                    draftActivity: c.draftActivity,
                    draftAnnouncement: c.draftAnnouncement
                };
            }
        });
        localStorage.setItem(`tahfeez_drafts_${user.uid}`, JSON.stringify(draftsByCircle));
    }, [appData.circles, user]);


    const setActiveCircleData = useCallback((updater: (draft: CircleData) => any, substantive: boolean = true) => {
        setAppData(prev => {
            let changed = false;
            const newCircles = prev.circles.map(c => {
                if (c.id === prev.activeCircleId) {
                    const updated = updater(c);
                    
                    // Optimization: If nothing changed at all, return the same object to prevent re-renders
                    if (JSON.stringify(updated) === JSON.stringify(c)) return c;

                    changed = true;
                    // Only update lastUpdated if it's a substantive change to persistent data
                    if (substantive) {
                        return { ...updated, lastUpdated: Date.now() };
                    }
                    return updated;
                }
                return c;
            });

            if (!changed) return prev;
            return { ...prev, circles: newCircles };
        });
    }, [setAppData]);

    // MIGRATION EFFECT: Freeze legacy sessions
    useEffect(() => {
        if (!activeCircle) return;
        
        // Check if there are any sessions that don't have a snapshot
        const hasLegacySessions = activeCircle.sessions.some(s => !s.pointsSettingsSnapshot);

        if (hasLegacySessions) {
            const currentSettings = activeCircle.settings.pointsSettings || defaultPointsSettings;
            
            setActiveCircleData(draft => ({
                ...draft,
                sessions: draft.sessions.map(s => {
                    // If snapshot exists, keep it. If not, bake in the current settings to freeze history.
                    if (s.pointsSettingsSnapshot) return s;
                    return { ...s, pointsSettingsSnapshot: currentSettings };
                })
            }));
        }
    }, [activeCircle?.id, activeCircle?.sessions?.length, setActiveCircleData]); // Depend on length to catch new additions, but primarily runs on load


    const editingTest = activeCircle?.draftTest || null;
    const setEditingTest = useCallback((test: Test | null) => {
        setActiveCircleData(draft => ({ ...draft, draftTest: test || undefined }), false);
    }, [setActiveCircleData]);

    const editingPlan = activeCircle?.draftPlan || null;
    const setEditingPlan = useCallback((plan: Plan | null) => {
        setActiveCircleData(draft => ({ ...draft, draftPlan: plan || undefined }), false);
    }, [setActiveCircleData]);

    const editingActivity = activeCircle?.draftActivity || null;
    const setEditingActivity = useCallback((activity: Activity | null) => {
        setActiveCircleData(draft => ({ ...draft, draftActivity: activity || undefined }), false);
    }, [setActiveCircleData]);

    const editingAnnouncement = activeCircle?.draftAnnouncement || null;
    const setEditingAnnouncement = useCallback((announcement: Announcement | null) => {
        setActiveCircleData(draft => ({ ...draft, draftAnnouncement: announcement || undefined }), false);
    }, [setActiveCircleData]);


    useEffect(() => {
        if (!activeCircle) return;
    
        const notificationSettings = activeCircle.notificationSettings || defaultNotificationSettings;
        const sortedSessions = [...(activeCircle.sessions || [])].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        const retentionHours = notificationSettings.retentionHours || 10;
        const retentionMs = retentionHours * 60 * 60 * 1000;
        const now = Date.now();

        const validNotifications = (activeCircle.notifications || []).filter(n => {
             if (['special', 'special_white'].includes(n.type) || n.id.startsWith('initial_')) return true;
             return (now - n.createdAt) < retentionMs;
        });

        if (validNotifications.length !== (activeCircle.notifications || []).length) {
             setActiveCircleData(draft => ({
                ...draft,
                notifications: validNotifications
            }));
            return; 
        }


        if (!notificationSettings.enabled) {
            const performanceNotificationIds = new Set(
                activeCircle.notifications
                    .filter(n => n.id.startsWith('absence_') || n.id.startsWith('lateness_') || n.id.startsWith('memo_') || n.id.startsWith('review_'))
                    .map(n => n.id)
            );
            if (performanceNotificationIds.size > 0) {
                setActiveCircleData(draft => ({
                    ...draft,
                    notifications: draft.notifications.filter(n => !performanceNotificationIds.has(n.id))
                }));
            }
            return;
        }

        if (sortedSessions.length < 2) {
             if (activeCircle.notifications.some(n => !n.id.startsWith('initial_') && !n.id.startsWith('seasonal_') && n.type !== 'special' && n.type !== 'special_white')) {
                 setActiveCircleData(draft => ({ ...draft, notifications: draft.notifications.filter(n => n.id.startsWith('initial_') || n.id.startsWith('seasonal_') || n.type === 'special' || n.type === 'special_white'), dismissedNotificationIds: [] }));
            }
            return;
        }
    
        const newNotifications: Notification[] = [];
    
        activeCircle.students.forEach(student => {
            const studentSessions = sortedSessions
                .map(session => ({...session, studentData: session.students.find(s => s.id === student.id)}))
                .filter(s => s.studentData);
            
            const createNotification = (id: string, message: string, type: Notification['type']) => {
                newNotifications.push({ id, type, message, createdAt: Date.now() });
            };

            if (notificationSettings.consecutiveAbsenceThreshold > 0) {
                let consecutiveAbsences = 0;
                for (let i = studentSessions.length - 1; i >= 0; i--) {
                    if (studentSessions[i].studentData!.attendance === 'absent') consecutiveAbsences++;
                    else break;
                }
                if (consecutiveAbsences >= notificationSettings.consecutiveAbsenceThreshold) {
                    createNotification(`absence_${student.id}_${consecutiveAbsences}`, `تنبيه: ${getGenderedTerm(student.gender)} ${student.name} غاب ${consecutiveAbsences} مرات متتالية.`, 'danger');
                }
            }

            if (notificationSettings.consecutiveLatenessThreshold > 0) {
                let consecutiveLateness = 0;
                for (let i = studentSessions.length - 1; i >= 0; i--) {
                    if (studentSessions[i].studentData!.attendance === 'late') consecutiveLateness++;
                    else break;
                }
                if (consecutiveLateness >= notificationSettings.consecutiveLatenessThreshold) {
                    createNotification(`lateness_${student.id}_${consecutiveLateness}`, `تنبيه: ${getGenderedTerm(student.gender)} ${student.name} تأخر ${consecutiveLateness} مرات متتالية.`, 'warning');
                }
            }
            
            const checkPerformance = (type: 'memo' | 'review') => {
                const threshold = type === 'memo' ? notificationSettings.consecutiveMemoThreshold : notificationSettings.consecutiveReviewThreshold;
                if (threshold <= 0) return;

                const suspendedField = type === 'memo' ? 'suspendedMemorization' : 'suspendedReview';
                if (student[suspendedField] || student.isKhatim) return; 

                const field = type === 'memo' ? 'memorization' : 'review';
                const hasField = type === 'memo' ? 'hasMemorization' : 'hasReview';

                const relevantSessions = studentSessions.filter(s => 
                    !s.isLesson && 
                    s.studentData &&
                    (s.studentData.attendance === 'present' || s.studentData.attendance === 'late') && 
                    !s.studentData[suspendedField]
                );
                
                let consecutiveCount = 0;
                for (let i = relevantSessions.length - 1; i >= 0; i--) {
                    const sessionData = relevantSessions[i].studentData;
                    if (sessionData) {
                         const record = type === 'memo' ? sessionData.memorization : sessionData.review;
                         if (!record?.[hasField]) consecutiveCount++;
                         else break;
                    } else {
                        break;
                    }
                }
    
                if (consecutiveCount >= threshold) {
                    const term = type === 'memo' ? 'يحفظ' : 'يراجع';
                    createNotification(`${type}_${student.id}_${consecutiveCount}`, `تنبيه: ${getGenderedTerm(student.gender)} ${student.name} لم ${term} ${consecutiveCount} مرات متتالية.`, 'warning');
                }
            };
    
            checkPerformance('memo');
            checkPerformance('review');
        });
        
        setActiveCircleData(draft => {
            const scheduledNotifications = draft.notifications.filter(n => 
                !n.id.startsWith('absence_') && !n.id.startsWith('lateness_') && !n.id.startsWith('memo_') && !n.id.startsWith('review_')
            );
            const nonDismissedNewNotifications = newNotifications.filter(n => !(draft.dismissedNotificationIds || []).includes(n.id));
            const finalNotifications = [...scheduledNotifications, ...nonDismissedNewNotifications];

            return {
                ...draft,
                notifications: finalNotifications
            };
        });
    
    }, [activeCircle?.sessions, activeCircle?.students, activeCircle?.notificationSettings, setActiveCircleData]);
    
    useEffect(() => {
        if (!activeCircle) return;
        const notificationSettings = activeCircle.notificationSettings || defaultNotificationSettings;

        if (!notificationSettings.enabled) {
            const periodicNotificationIds = new Set(
                (activeCircle.notifications || [])
                    .filter(n => n.id.startsWith('daily_') || n.id.startsWith('rare_'))
                    .map(n => n.id)
            );
            if (periodicNotificationIds.size > 0) {
                setActiveCircleData(draft => ({
                    ...draft,
                    notifications: (draft.notifications || []).filter(n => !periodicNotificationIds.has(n.id))
                }));
            }
            return;
        }

        const oneWeekInMs = 7 * 24 * 60 * 60 * 1000;
        if (Date.now() - new Date(activeCircle.studyStartDate).getTime() < oneWeekInMs) {
            return;
        }

        const now = new Date();
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const nowMs = now.getTime();
        let needsUpdate = false;
    
        const newNotifications: Notification[] = [];
        const updatedCircleData: Partial<CircleData> = {};
    
        if (notificationSettings.fridayReminders && activeCircle.lastDailyNotificationDate !== today) {
            const dayOfWeek = new Date().getDay(); 
            let dailyMessage = '';
            let messageType: Notification['type'] = 'info';
    
            if (dayOfWeek === 5) { 
                const fridayMessages = [
                    "🕌 يوم الجمعة، يوم فضيل. لا تنسَ قراءة سورة الكهف، والإكثار من الصلاة على النبي ﷺ، والدعاء في ساعة الاستجابة.",
                    "☀️ 'خير يوم طلعت عليه الشمس يوم الجمعة'. أكثروا فيه من ذكر الله والصلاة على رسوله، فهو يوم عيد للمسلمين.",
                    "🍃 من سنن يوم الجمعة: الاغتسال، والتطيب، ولبس أحسن الثياب، والتبكير إلى الصلاة. تقبل الله طاعتكم."
                ];
                const d = new Date();
                const weekOfYear = Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 1).getTime()) / (1000 * 60 * 60 * 24 * 7));
                dailyMessage = fridayMessages[weekOfYear % fridayMessages.length];
                messageType = 'success';
            } else if (dayOfWeek === 6) { 
                dailyMessage = "✨ بداية أسبوع جديد، فرصة جديدة لغرس آيات الله في صدور طلابك. بالتوفيق يا معلم القرآن!";
                messageType = 'info';
            }
            
            if (dailyMessage) {
                const dailyId = `daily_${today}`;
                if (!(activeCircle.dismissedNotificationIds || []).includes(dailyId)) {
                    newNotifications.push({ id: dailyId, type: messageType, message: dailyMessage, createdAt: nowMs });
                    updatedCircleData.lastDailyNotificationDate = today;
                    needsUpdate = true;
                }
            }
        }
        
        const RARE_INTERVAL_MS = 20 * 24 * 60 * 60 * 1000;
        const lastRareDate = activeCircle.lastRareNotificationDate || 0;
        if (notificationSettings.rareReminders && nowMs - lastRareDate > RARE_INTERVAL_MS) {
            const rareMessages = [
                "💡 تم تطوير هذا التطبيق لوجه الله وبدون إعلانات، ليكون عونًا لمعلمي القرآن.",
                "✨ فكرة التطبيق جاءت من معلم حلقة كان يعاني من الأعمال الورقية، فسبحان من ألهمه!",
                "🌿 هل تعلم أنه يمكنك الضغط مطولاً على أزرار التقييم لاختيار نصف درجة؟"
            ];
            const index = activeCircle.rareNotificationIndex || 0;
            const rareMessage = rareMessages[index % rareMessages.length];
            const rareId = `rare_${index}`;
            
            if (!(activeCircle.dismissedNotificationIds || []).includes(rareId)) {
                newNotifications.push({ id: rareId, type: 'special', message: rareMessage, createdAt: nowMs });
                updatedCircleData.lastRareNotificationDate = nowMs;
                updatedCircleData.rareNotificationIndex = (index + 1);
                needsUpdate = true;
            }
        }
        
        if (needsUpdate) {
            setActiveCircleData(draft => {
                const existingIds = new Set(draft.notifications.map(n => n.id));
                const uniqueNewNotifications: Notification[] = [];
                const seenInNew = new Set<string>();
                
                for (const n of newNotifications) {
                    if (!existingIds.has(n.id) && !seenInNew.has(n.id)) {
                        uniqueNewNotifications.push(n);
                        seenInNew.add(n.id);
                    }
                }
    
                if (uniqueNewNotifications.length === 0 && Object.keys(updatedCircleData).length === 0) return draft;

                return {
                    ...draft,
                    ...updatedCircleData,
                    notifications: [...uniqueNewNotifications, ...draft.notifications],
                };
            });
        }
    
    }, [activeCircle?.id, activeCircle?.lastDailyNotificationDate, activeCircle?.lastRareNotificationDate, activeCircle?.rareNotificationIndex, activeCircle?.studyStartDate, activeCircle?.notificationSettings, setActiveCircleData]);

    useEffect(() => {
        if (!activeCircle) return;
        
        const seasonalEnabled = activeCircle.notificationSettings?.seasonalReminders ?? true;
        if (!seasonalEnabled) return;

        const now = new Date();
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        
        const message = SEASONAL_MESSAGES[todayStr];
        
        if (message) {
            const notificationId = `seasonal_${todayStr}`;
            
            const isAlreadyActive = activeCircle.notifications.some(n => n.id === notificationId);
            const isDismissed = (activeCircle.dismissedNotificationIds || []).includes(notificationId);

            if (!isAlreadyActive && !isDismissed) {
                const newNotification: Notification = {
                    id: notificationId,
                    type: 'seasonal',
                    message: message,
                    createdAt: Date.now(),
                };

                setActiveCircleData(draft => {
                    if (draft.notifications.some(n => n.id === newNotification.id)) return draft;
                    return {
                        ...draft,
                        notifications: [newNotification, ...draft.notifications]
                    };
                });
            }
        }
    }, [activeCircle?.notifications, activeCircle?.dismissedNotificationIds, activeCircle?.notificationSettings, setActiveCircleData]);

    useEffect(() => {
        if (!activeCircle || activeCircle.hasShownDuaaNotification) return;
    
        const oneWeekInMs = 7 * 24 * 60 * 60 * 1000;
        const studyStartDate = new Date(activeCircle.studyStartDate).getTime();
        
        if (Date.now() - studyStartDate > oneWeekInMs) {
            const duaaMessage = "🤍 أفضل دعم تقدمه لي هو الدعاء لي ولوالدي ولمن أحب بالهداية والجنة";
            const duaaId = 'duaa_special';
            const isDismissed = (activeCircle.dismissedNotificationIds || []).includes(duaaId);

            if (isDismissed) return;

            const duaaNotification: Notification = {
                id: duaaId,
                type: 'special_white',
                message: duaaMessage,
                createdAt: Date.now(),
            };
    
            setActiveCircleData(draft => {
                if (draft.notifications.some(n => n.id === duaaId)) {
                    return draft;
                }
                return {
                    ...draft,
                    notifications: [duaaNotification, ...draft.notifications],
                    hasShownDuaaNotification: true,
                };
            });
        }
    }, [activeCircle, setActiveCircleData]);

    useEffect(() => {
        if (!activeCircle) return;
        const notificationSettings = activeCircle.notificationSettings || defaultNotificationSettings;
        if (!notificationSettings.enabled || !notificationSettings.rareReminders) return;
    
        const now = Date.now();
        const studyStartDate = new Date(activeCircle.studyStartDate).getTime();
        const daysSinceStart = (now - studyStartDate) / (1000 * 60 * 60 * 24);
    
        const newNotifications: Notification[] = [];
        const updates: Partial<CircleData> = {};
    
        const addOnceNotification = (flag: 'hasShownStatsNotification_d2' | 'hasShownStudentCardNotification_d5' | 'hasShownSupervisorReportNotification_w2' | 'hasShownAddonsNotification_m1' | 'hasShownContactDevNotification_m2' | 'hasShownFeedbackRequest', message: string, type: Notification['type'] = 'info') => {
            if (!activeCircle[flag] && !updates[flag]) {
                const id = flag === 'hasShownFeedbackRequest' ? 'feedback_request' : `feature_${flag}`;
                if (!activeCircle.notifications.some(n => n.id === id) && !(activeCircle.dismissedNotificationIds || []).includes(id)) {
                    newNotifications.push({ id, type, message, createdAt: now });
                }
                updates[flag] = true;
            }
        };
        
        if (daysSinceStart > 2) addOnceNotification('hasShownStatsNotification_d2', 'يمكنك الآن الذهاب إلى قسم الاحصائيات ورؤية احصائيات الطلاب في الحلقات لأي فترة تحتاجها.');
        if (daysSinceStart > 5) addOnceNotification('hasShownStudentCardNotification_d5', 'ادخل على قسم الطلاب ثم اضغط على صورة الطالب لإظهار بطاقة احترافية بكل بيانات الطالب وإحصائياته.');
        if (daysSinceStart > 10) addOnceNotification('hasShownFeedbackRequest', 'هل أعجبك التطبيق؟ إذا كان لديك أي اقتراح أو واجهت مشكلة، لا تتردد في مراسلة المطور.', 'special');
        if (daysSinceStart > 14) addOnceNotification('hasShownSupervisorReportNotification_w2', 'يمكنك الدخول وإنشاء تقرير كامل عن الحلقات من قسم الإحصائيات عبر زر التقرير للمشرف.');
        if (daysSinceStart > 30) addOnceNotification('hasShownAddonsNotification_m1', 'يمكنك تفعيل أي ميزة ترغب بها من الإعدادات > الإضافات والمظهر.');
        if (daysSinceStart > 60) addOnceNotification('hasShownContactDevNotification_m2', 'إذا عندك أي اقتراح يفيد التطبيق أو مشكلة أو إضافة، يمكنك التواصل مع المطور من قسم الإعدادات.');
    
        const localDate = new Date();
        const currentMonth = `${localDate.getFullYear()}-${String(localDate.getMonth() + 1).padStart(2, '0')}`;
        if (daysSinceStart > 28 && activeCircle.lastMonthlyStatsNotification !== currentMonth) {
            const monthlyMessages = ["يمكنك الآن الاطلاع على إحصائيات الحلقات بشكل شامل واحترافي.", "نهاية شهر! وقت ممتاز لمراجعة أداء الحلقة من خلال الإحصائيات الشاملة."];
            const monthIndex = new Date().getMonth();
            const message = monthlyMessages[monthIndex % monthlyMessages.length];
            const id = `monthly_${currentMonth}`;
            if (!activeCircle.notifications.some(n => n.id === id) && !(activeCircle.dismissedNotificationIds || []).includes(id)) {
                newNotifications.push({ id, type: 'special', message, createdAt: now });
            }
            updates.lastMonthlyStatsNotification = currentMonth;
        }
    
        if (Object.keys(updates).length > 0) {
            setActiveCircleData(d => ({
                ...d,
                ...updates,
                notifications: [...newNotifications, ...d.notifications],
            }), false);
        }
    
    }, [activeCircle, setActiveCircleData]);

    useEffect(() => {
        if (appData.circles.length > 0) {
            let hasChanges = false;
            const updatedCircles = appData.circles.map(circle => {
                let circleChanged = false;
                const updatedCircle = { ...circle };
                if (!updatedCircle.numericId) {
                    updatedCircle.numericId = generateNumericId();
                    circleChanged = true;
                }
                if (!updatedCircle.transferCode) {
                    updatedCircle.transferCode = generateTransferCode();
                    circleChanged = true;
                }
                if (circleChanged) hasChanges = true;
                return updatedCircle;
            });

            if (hasChanges) {
                setAppData(prev => ({ ...prev, circles: updatedCircles }));
            }
        }
    }, [appData.circles, setAppData]);

    const sanitizeErrorMessage = useCallback((message: string): string => {
        if (!message) return 'حدث خطأ غير متوقع';
        const msgStr = String(message).toLowerCase();
        
        // Hide technical Firestore/Firebase details
        if (msgStr.includes('@firebase/firestore') || 
            msgStr.includes('failed-precondition') || 
            msgStr.includes('primary lease') ||
            msgStr.includes('base version') ||
            msgStr.includes('backfill indexes') ||
            msgStr.includes('remote event') ||
            msgStr.includes('commit?') ||
            msgStr.includes('rpc')) {
            return 'حدثت مشكلة في مزامنة البيانات، سيتم المحاولة تلقائياً في الخلفية';
        }
        
        // Common Firebase errors
        if (msgStr.includes('permission-denied') || msgStr.includes('insufficient permissions')) {
            return 'ليس لديك الصلاحية الكافية للقيام بهذا الإجراء';
        }

        if (msgStr.includes('network-request-failed') || msgStr.includes('offline-persistence')) {
            return 'مشكلة في الاتصال، يعمل النظام الآن في الوضع المحلي';
        }

        return String(message);
    }, []);

    const addToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
        const msgStr = String(message).toLowerCase();
        
        // COMPLETELY suppress technical sync errors from showing ANY toast
        if (type === 'error' && (
            msgStr.includes('primary lease') || 
            msgStr.includes('base version') ||
            msgStr.includes('backfill indexes') ||
            msgStr.includes('remote event') ||
            msgStr.includes('@firebase/firestore')
        )) {
            console.warn('Suppressed technical sync error toast:', message);
            return;
        }

        const cleanMessage = type === 'error' ? sanitizeErrorMessage(message) : message;
        const icons = { success: FaCheckCircle, error: FaExclamationTriangle, info: FaInfoCircle };
        const newToast: Toast = { id: generateUniqueId(), message: cleanMessage, type, icon: icons[type] };
        setToasts([newToast]);
        window.setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== newToast.id));
        }, 3000);
    }, [sanitizeErrorMessage]);

    // Listen to real-time changes in the user's status, role, and permissions in the current active circle
    useEffect(() => {
        if (!user || !activeCircle) return;
        const currentTeacherState = activeCircle.teachers?.[user.uid];
        if (!currentTeacherState) return;

        const storageKey = `tahfeez_teacher_state_${user.uid}_${activeCircle.id}`;
        const cachedStateRaw = localStorage.getItem(storageKey);
        
        if (!cachedStateRaw) {
            // First time seeing this circle, initialize the state without notifying
            localStorage.setItem(storageKey, JSON.stringify({
                status: currentTeacherState.status,
                role: currentTeacherState.role,
                accessLevel: currentTeacherState.accessLevel
            }));
            return;
        }

        try {
            const cachedState = JSON.parse(cachedStateRaw);
            let hasChanges = false;
            
            // Check status change
            if (cachedState.status !== currentTeacherState.status) {
                hasChanges = true;
                if (cachedState.status === 'pending' && currentTeacherState.status === 'active') {
                    addToast(`🎉 تهانينا! تم قبول طلب انضمامك إلى حلقة '${activeCircle.circle}' بنجاح.`, 'success');
                } else if (currentTeacherState.status === 'suspended') {
                    addToast(`⚠️ تم تعليق حسابك مؤقتاً في حلقة '${activeCircle.circle}'.`, 'error');
                } else if (currentTeacherState.status === 'rejected') {
                    const reasonStr = currentTeacherState.rejectionReason ? ` بسبب: ${currentTeacherState.rejectionReason}` : '';
                    addToast(`❌ تم رفض طلب انضمامك إلى حلقة '${activeCircle.circle}'${reasonStr}.`, 'error');
                }
            }

            // Check role or accessLevel changes
            if (cachedState.role !== currentTeacherState.role || cachedState.accessLevel !== currentTeacherState.accessLevel) {
                hasChanges = true;
                let roleLabel = 'معلم مساعد';
                if (currentTeacherState.role === 'owner') {
                    roleLabel = 'مالك الحلقة (صلاحيات كاملة)';
                } else if (currentTeacherState.role === 'teacher') {
                    roleLabel = currentTeacherState.accessLevel === 'full' ? 'مشرف رئيسي (صلاحيات كاملة)' : 'مشرف (صلاحيات قياسية)';
                } else if (currentTeacherState.role === 'assistant') {
                    roleLabel = 'مساعد مشرف (صلاحيات قياسية)';
                }
                
                addToast(`🔔 تم تحديث رتبتك وصلاحياتك في حلقة '${activeCircle.circle}' إلى: ${roleLabel}`, 'info');
            }

            if (hasChanges) {
                localStorage.setItem(storageKey, JSON.stringify({
                    status: currentTeacherState.status,
                    role: currentTeacherState.role,
                    accessLevel: currentTeacherState.accessLevel
                }));
            }
        } catch (e) {
            console.error("Failed to parse cached teacher state:", e);
        }
    }, [user, activeCircle?.id, activeCircle?.teachers?.[user?.uid]?.status, activeCircle?.teachers?.[user?.uid]?.role, activeCircle?.teachers?.[user?.uid]?.accessLevel, addToast]);
    
    useEffect(() => {
        if (appData.circles.length > 1 && !appData.hasShownQuickSwitchToast) {
            setAppData(prev => ({ ...prev, hasShownQuickSwitchToast: true }));
        }
    }, [appData.circles.length, appData.hasShownQuickSwitchToast, setAppData]);
    
    const handleAutoDismissNotification = useCallback((notificationId: string) => {
        setActiveCircleData(draft => ({
            ...draft,
            notifications: draft.notifications.filter(n => n.id !== notificationId)
        }), false);
    }, [setActiveCircleData]);


    const handleSaveSetup = (newCircleData: Pick<CircleData, 'teacher' | 'circle' | 'center' | 'logo' | 'teacherGender' | 'transferPassword' | 'town'>) => {
        const isDuplicate = appData.circles.some(c => c.circle.trim().toLowerCase() === newCircleData.circle.trim().toLowerCase());
        if (isDuplicate) {
            setAlertModal({ 
                isOpen: true, 
                title: 'تنبيه: حلقة مكررة', 
                message: `عذراً، الحلقة "${newCircleData.circle}" موجودة مسبقاً في حسابك. لا يمكن إنشاء حلقة بنفس الاسم لتجنب تكرار البيانات.` 
            });
            return;
        }

        const isFirstTimeSetup = appData.circles.length === 0;

        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const today = `${year}-${month}-${day}`;

        const newCircle: CircleData = {
            id: generateUniqueStringId(newCircleData.circle),
            ownerId: user?.uid,
            numericId: generateNumericId(),
            transferCode: generateTransferCode(),
            authorizedUserIds: user ? [user.uid] : [],
            teachers: user ? {
                [user.uid]: { 
                    name: userProfile?.displayName || newCircleData.teacher, 
                    gender: userProfile?.gender || newCircleData.teacherGender,
                    role: 'owner',
                    accessLevel: 'full',
                    status: 'active',
                    joinedAt: Date.now(),
                    permissions: defaultMemberPermissions.teacher
                }
            } : {},
            ...newCircleData,
            teacher: (userProfile?.displayName || newCircleData.teacher).trim(),
            teacherGender: userProfile?.gender || newCircleData.teacherGender,
            transferPassword: newCircleData.transferPassword?.trim() || Math.floor(1000 + Math.random() * 9000).toString(), // Random 4-digit code if empty
            allowDirectEntry: true,
            students: [],
            sessions: [],
            notifications: [],
            dismissedNotificationIds: [],
            settings: { 
                theme: 'dark',
                showLastRecordFeature: true,
                surahSelectionMethod: 'list',
                surahOrder: 'quranic',
                autoSaveDrafts: true, // Default to true now
                pointsSettings: defaultPointsSettings,
                followUpSettings: defaultFollowUpSettings,
                syncSurahFields: false,
                defaultTestMaxScores: {},
            },
            notificationSettings: defaultNotificationSettings,
            studyStartDate: today,
            lastWelcomeTipShow: Date.now(),
            lessonTypes: defaultLessonTypes,
            activityTypes: defaultActivityTypes,
            hasSeenWelcomePopup: false,
            hasCompletedOnboarding: false,
            hasShownWelcomeNotification: !isFirstTimeSetup,
            hasShownDuaaNotification: false,
            hasAgreedToCommunityTerms: false,
            studentReports: [],
            supervisorReports: [],
            tests: [],
            plans: [],
            activities: [],
            announcements: [],
            draftTest: null,
            draftPlan: null,
            draftActivity: null,
            draftSession: null,
            sessionDrafts: {}, 
            draftAnnouncement: null,
            lastDailyNotificationDate: '',
            lastRareNotificationDate: 0,
            rareNotificationIndex: 0,
            hasShownStatsNotification_d2: false,
            hasShownStudentCardNotification_d5: false,
            hasShownSupervisorReportNotification_w2: false,
            hasShownAddonsNotification_m1: false,
            hasShownContactDevNotification_m2: false,
            lastMonthlyStatsNotification: '',
            hasShownFeedbackRequest: false,
            bulkRewards: [],
            lastUpdated: Date.now()
        };

        if (isFirstTimeSetup && !newCircle.hasShownWelcomeNotification) {
            const initialNotification: Notification = {
                id: generateUniqueStringId(),
                type: 'special',
                message: "مرحبًا! هذا التطبيق صُمم ليساعدك في إدارة حلقتك القرآنية بكل بساطة، ودون الحاجة للأوراق أو الكشوفات، فهو رفيقك في تنظيم وإدارة حلقة متميزة 🤍.",
                createdAt: Date.now(),
            };
            newCircle.notifications.push(initialNotification);
            newCircle.hasShownWelcomeNotification = true;
        }

        setAppData(prev => {
            const circles = [...prev.circles, newCircle];
            return {
                ...prev,
                circles,
                activeCircleId: newCircle.id
            }
        });
        
        if (isFirstTimeSetup) {
            setShowWelcomePopup(true);
        }

        setIsInitialising(false);
        setShowNewCircleForm(false);

        // Success! Save automatically in history in the background
        const savedStr = localStorage.getItem('quran_saved_accounts');
        const savedAccounts = savedStr ? JSON.parse(savedStr) : [];
        const exists = savedAccounts.some((a: any) => a.id === (newCircle.numericId as string));
        if (!exists) {
            const newAccount = {
                id: newCircle.numericId,
                password: newCircle.transferPassword,
                circleName: newCircle.circle,
                teacherName: newCircle.teacher,
                displayName: newCircle.circle
            };
            localStorage.setItem('quran_saved_accounts', JSON.stringify([...savedAccounts, newAccount]));
            window.dispatchEvent(new Event('quran:saved_accounts_updated'));
        }
    };
    
    const handleCloseWelcomePopup = () => {
        setShowWelcomePopup(false);
        setActiveCircleData(d => ({...d, hasSeenWelcomePopup: true}), false);
        if (!activeCircle?.hasCompletedOnboarding) {
            window.setTimeout(() => setIsTourActive(true), 500);
        }
    }
    
    const handleOnboardingComplete = () => {
        setIsTourActive(false);
        setActiveCircleData(d => ({...d, hasCompletedOnboarding: true}), false);
    };

    const handleSaveStudent = (student: Student) => {
        if (!checkPermission('canManageStudents', 'إدارة الطلاب')) return;
        if (!activeCircle) return;

        // Determine if adding or editing
        const isEditing = !!editingStudent;

        // Prepare the new student object
        let studentToSave: Student;
        if (isEditing) {
            studentToSave = {
                ...student,
                joinDate: student.joinDate || activeCircle.studyStartDate,
                lastUpdated: Date.now()
            };
        } else {
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const today = `${year}-${month}-${day}`;
            studentToSave = { 
                ...student, 
                id: generateStudentId(), 
                order: activeCircle.students.length, 
                joinDate: today, 
                manualPoints: [], 
                isKhatim: false, 
                khatimRecitesReview: true, 
                isArchived: false,
                lastUpdated: Date.now()
            };
        }

        setActiveCircleData(draft => {
            // 1. Update Student List
            let updatedStudents;
            if (isEditing) {
                updatedStudents = draft.students.map(s => s.id === studentToSave.id ? studentToSave : s);
            } else {
                updatedStudents = [...draft.students, studentToSave];
            }

            // 2. Update Parent Phone in ALL Past Sessions (Retroactive)
            const updatedSessions = draft.sessions.map(session => ({
                ...session,
                students: session.students.map(s => {
                    if (s.id === studentToSave.id) {
                        return { ...s, parentPhone: studentToSave.parentPhone };
                    }
                    return s;
                })
            }));

            // 3. Sync Drafts (Global and Specific)
            // Function to apply logic: Sync profile data AND Clear data if suspended
            const syncDraftStudent = (s: SessionStudent): SessionStudent => {
                if (s.id !== studentToSave.id) return s;

                const updatedS = {
                    ...s,
                    // Sync Profile Info
                    name: studentToSave.name,
                    gender: studentToSave.gender,
                    photo: studentToSave.photo,
                    parentPhone: studentToSave.parentPhone,
                    notes: studentToSave.notes, // General notes
                    // Sync Status
                    suspendedMemorization: studentToSave.suspendedMemorization,
                    suspendedReview: studentToSave.suspendedReview,
                    isKhatim: studentToSave.isKhatim,
                    khatimRecitesReview: studentToSave.khatimRecitesReview,
                };

                // Clear Data if Suspended
                if (studentToSave.suspendedMemorization) {
                    updatedS.memorization = { 
                        hasMemorization: false, 
                        fromSurah: '', fromAyah: '', toSurah: '', toAyah: '', rating: undefined 
                    };
                }
                if (studentToSave.suspendedReview) {
                    updatedS.review = { 
                        hasReview: false, 
                        fromSurah: '', fromAyah: '', toSurah: '', toAyah: '', rating: undefined 
                    };
                }
                return updatedS;
            };

            // Apply to global draftSession
            let updatedDraftSession = draft.draftSession;
            if (updatedDraftSession) {
                updatedDraftSession = {
                    ...updatedDraftSession,
                    students: updatedDraftSession.students.map(syncDraftStudent)
                };
            }

            // Apply to specific sessionDrafts
            const updatedSessionDrafts = { ...draft.sessionDrafts };
            Object.keys(updatedSessionDrafts).forEach(key => {
                const k = Number(key);
                if (updatedSessionDrafts[k]) {
                    updatedSessionDrafts[k] = {
                        ...updatedSessionDrafts[k],
                        students: updatedSessionDrafts[k].students.map(syncDraftStudent)
                    };
                }
            });

            return {
                ...draft,
                students: updatedStudents,
                sessions: updatedSessions,
                draftSession: updatedDraftSession,
                sessionDrafts: updatedSessionDrafts,
                lastUpdated: Date.now()
            };
        });

        // 4. Update the active `editingSession` state if it exists (so UI updates immediately)
        if (editingSession) {
            setEditingSession(prev => {
                if (!prev) return null;
                // Use the same sync logic as above
                const syncActiveEdit = (s: SessionStudent): SessionStudent => {
                    if (s.id !== studentToSave.id) return s;
                    
                    const updatedS = {
                        ...s,
                        name: studentToSave.name,
                        gender: studentToSave.gender,
                        photo: studentToSave.photo,
                        parentPhone: studentToSave.parentPhone,
                        notes: studentToSave.notes,
                        suspendedMemorization: studentToSave.suspendedMemorization,
                        suspendedReview: studentToSave.suspendedReview,
                        isKhatim: studentToSave.isKhatim,
                        khatimRecitesReview: studentToSave.khatimRecitesReview,
                    };

                    if (studentToSave.suspendedMemorization) {
                        updatedS.memorization = { hasMemorization: false, fromSurah: '', fromAyah: '', toSurah: '', toAyah: '' };
                    }
                    if (studentToSave.suspendedReview) {
                        updatedS.review = { hasReview: false, fromSurah: '', fromAyah: '', toSurah: '', toAyah: '' };
                    }
                    return updatedS;
                };

                return {
                    ...prev,
                    students: prev.students.map(syncActiveEdit)
                };
            });
        }

        addToast(isEditing ? '✅ تم تعديل بيانات الطالب بنجاح.' : '✅ تم إضافة الطالب بنجاح.');
        setShowStudentForm(false);
        setEditingStudent(null);
    };

    const handleArchiveStudent = (studentId: number) => {
        if (!activeCircle) return;
        setActiveCircleData(draft => ({
            ...draft,
            students: draft.students.map(s => s.id === studentId ? { ...s, isArchived: true, lastUpdated: Date.now() } : s)
        }));
        addToast('📦 تم نقل الطالب إلى الأرشيف.');
        setShowStudentForm(false);
        setEditingStudent(null);
    };

    const handleRestoreStudent = (studentId: number) => {
        if (!activeCircle) return;
        setActiveCircleData(draft => ({
            ...draft,
            students: draft.students.map(s => s.id === studentId ? { ...s, isArchived: false, lastUpdated: Date.now() } : s)
        }));
        addToast('✅ تم استعادة الطالب من الأرشيف.');
    };

    const handleDeleteStudent = (studentId: number) => {
        if (!checkPermission('canManageStudents', 'حذف الطلاب')) return;
        if (!activeCircle) return;
        const student = activeCircle.students.find(s => s.id === studentId);
        if (student) {
            setConfirmationModal({
                isOpen: true,
                title: 'حذف الطالب',
                message: `⚠️ هل أنت متأكد من حذف الطالب "${student.name}"؟ سيتم حذف جميع بياناته وجلساته. لا يمكن التراجع عن هذا الإجراء.`,
                onConfirm: () => {
                    setActiveCircleData(draft => ({ 
                        ...draft, 
                        students: draft.students.filter(s => s.id !== studentId), 
                        deletedStudentIds: [...(draft.deletedStudentIds || []), studentId],
                        lastUpdated: Date.now() 
                    }));
                    addToast('🗑️ تم حذف الطالب بنجاح.');
                    setConfirmationModal(prev => ({ ...prev, isOpen: false }));
                },
                delay: 3
            });
        }
    };

    const handleReorderStudents = (reorderedItems: Student[]) => {
        setActiveCircleData(draft => {
            // Merge archived students back in
            const archived = draft.students.filter(s => s.isArchived);
            const now = Date.now();
            
            if (reorderedItems.length + archived.length === draft.students.length) {
                // Re-indexing logic only for active students
                const reorderedActive = reorderedItems.map((student, index) => ({ ...student, order: index, lastUpdated: now }));
                return {
                    ...draft,
                    students: [...reorderedActive, ...archived],
                    lastUpdated: now
                };
            }
    
            const reorderedIds = new Set(reorderedItems.map(item => item.id));
            const originalSortedActive = [...draft.students].filter(s => !s.isArchived).sort((a, b) => a.order - b.order);
            const finalStudentList: Student[] = [];
            let reorderedIndex = 0;
    
            originalSortedActive.forEach(student => {
                if (reorderedIds.has(student.id)) {
                    finalStudentList.push(reorderedItems[reorderedIndex]);
                    reorderedIndex++;
                } else {
                    finalStudentList.push(student);
                }
            });
    
            const studentMap = new Map(draft.students.map(s => [s.id, s]));
            const updatedListWithFreshData = finalStudentList.map(s => studentMap.get(s.id)!);
            
            const activeStudentsWithNewOrder = updatedListWithFreshData.map((student, index) => ({ ...(student as Student), order: index, lastUpdated: now }));

            return {
                ...draft,
                students: [...activeStudentsWithNewOrder, ...archived],
                lastUpdated: now
            };
        });
    };

    const handleBulkUpdateMasterStudents = useCallback((updatedStudents: Student[]) => {
        if (!activeCircle) return;
        setActiveCircleData(draft => {
            const studentMap = new Map(updatedStudents.map(s => [s.id, s]));
            const now = Date.now();
            return {
                ...draft,
                students: draft.students.map(s => {
                    const updated = studentMap.get(s.id);
                    if (updated) {
                         return { ...s, ...updated, lastUpdated: now };
                    }
                    return s;
                }),
                lastUpdated: now
            };
        });
    }, [activeCircle]);

    const handleSaveSession = (session: Session) => {
        if (!activeCircle) return;
        
        // Auto-calculate and update pages_count for all student records in the session
        session.students.forEach(s => {
            if (s.memorization && s.memorization.hasMemorization) {
                s.memorization.pages_count = calculatePagesCount(
                    s.memorization.fromSurah || '',
                    s.memorization.fromAyah || '',
                    s.memorization.toSurah || '',
                    s.memorization.toAyah || ''
                );
            } else if (s.memorization) {
                s.memorization.pages_count = 0;
            }

            if (s.review && s.review.hasReview) {
                s.review.pages_count = calculatePagesCount(
                    s.review.fromSurah || '',
                    s.review.fromAyah || '',
                    s.review.toSurah || '',
                    s.review.toAyah || ''
                );
            } else if (s.review) {
                s.review.pages_count = 0;
            }

            if (s.extraMemorizations) {
                s.extraMemorizations.forEach(em => {
                    if (em.hasMemorization) {
                        em.pages_count = calculatePagesCount(
                            em.fromSurah || '',
                            em.fromAyah || '',
                            em.toSurah || '',
                            em.toAyah || ''
                        );
                    } else {
                        em.pages_count = 0;
                    }
                });
            }

            if (s.extraReviews) {
                s.extraReviews.forEach(er => {
                    if (er.hasReview) {
                        er.pages_count = calculatePagesCount(
                            er.fromSurah || '',
                            er.fromAyah || '',
                            er.toSurah || '',
                            er.toAyah || ''
                        );
                    } else {
                        er.pages_count = 0;
                    }
                });
            }
        });
        
        const isExisting = activeCircle.sessions.some(s => s.id === session.id);
        if (isExisting) {
            if (!checkPermission('canEditPastSessions', 'تعديل الجلسات السابقة')) return;
        } else {
            if (!checkPermission('canCreateSessions', 'إنشاء جلسات جديدة')) return;
        }

        // 1. Process point adjustments and update master students BEFORE saving session
        const updatedMasterStudents: Student[] = [];
        const snapshotToUse = session.pointsSettingsSnapshot || activeCircle.settings.pointsSettings || defaultPointsSettings;

        session.students.forEach(sSession => {
            const master = activeCircleStudents.find(as => as.id === sSession.id);
            if (!master) return;
            
            // Step A: Baseline (Points from OTHER sessions + Manual points NOT from this session)
            const otherSessions = activeCircle.sessions.filter(s => s.id !== session.id);
            const otherAdjs = (master.manualPoints || []).filter(a => a.sessionId !== session.id);
            const tempMasterBase: Student = { ...master, manualPoints: otherAdjs };
            let currentTotal = calculateStudentTotalPoints(tempMasterBase, otherSessions, snapshotToUse);
            
            // Step B: Impact of THIS session's pedagogical data (attendance, memorization)
            const sessionPedagogicalPoints = calculatePointsForSession(sSession, snapshotToUse, session.isLesson, session);
            currentTotal += sessionPedagogicalPoints;
            if (currentTotal < 0) currentTotal = 0; // Pedagogical impact alone shouldn't go below 0 (usually)
            
            // Step C: Impact of THIS session's manual points
            const currentSessionAdjs = (sSession.manualPoints || []).filter(a => a.sessionId === session.id);
            const finalSessionAdjs: ManualPointAdjustment[] = [];
            for (const adj of currentSessionAdjs) {
                if (currentTotal + adj.amount < 0) {
                    const possibleDeduction = -currentTotal;
                    if (possibleDeduction !== 0) {
                        finalSessionAdjs.push({ ...adj, amount: possibleDeduction, reason: adj.reason + ' (معدل للصفر)', sessionId: session.id });
                        currentTotal = 0;
                    }
                    // If already at 0, excess deduction is ignored
                } else {
                    finalSessionAdjs.push({ ...adj, sessionId: session.id });
                    currentTotal += adj.amount;
                }
            }
            
            const newManualPoints = [...otherAdjs, ...finalSessionAdjs];
            
            // Update master if points collection changed (added, removed, or modified)
            const oldPointsIds = (master.manualPoints || []).map(a => a.id).join(',');
            const newPointsIds = newManualPoints.map(a => a.id).join(',');
            const oldAmounts = (master.manualPoints || []).map(a => a.amount).join(',');
            const newAmounts = newManualPoints.map(a => a.amount).join(',');

            if (oldPointsIds !== newPointsIds || oldAmounts !== newAmounts) {
                updatedMasterStudents.push({ ...master, manualPoints: newManualPoints });
            }
        });

        if (updatedMasterStudents.length > 0) {
            handleBulkUpdateMasterStudents(updatedMasterStudents);
        }

        // 2. Save the session itself
        const existingSession = activeCircle.sessions.find(s => s.id === session.id);
        
        const currentTeacher = user ? activeCircle.teachers?.[user.uid] : null;
        const sessionCreator = existingSession?.createdBy || currentTeacher?.name || activeCircle.teacher;
        const sessionCreatorUid = existingSession?.creatorUid || user?.uid;
        const sessionCreatorGender = existingSession?.createdByGender || currentTeacher?.gender || activeCircle.teacherGender;

        const newSession: Session = { 
            ...session, 
            isDirty: false,
            pointsSettingsSnapshot: snapshotToUse,
            createdBy: sessionCreator,
            creatorUid: sessionCreatorUid,
            createdByGender: sessionCreatorGender,
            lastUpdated: Date.now()
        };
        
        const sessionExists = !!existingSession;

        setActiveCircleData(draft => {
            const newSessions = sessionExists
                ? draft.sessions.map(s => s.id === newSession.id ? newSession : s)
                : [...draft.sessions, newSession];

            const newDismissedIds = sessionExists
                ? draft.dismissedNotificationIds
                : draft.dismissedNotificationIds.filter(id => id.startsWith('daily_') || id.startsWith('rare_') || id.startsWith('initial_'));
            
            // Clean up drafts
            const newDrafts = { ...(draft.sessionDrafts || {}) };
            delete newDrafts[newSession.id]; 

            const draftSession = (draft.draftSession && draft.draftSession.id === newSession.id) ? null : draft.draftSession;

            return {
                ...draft,
                sessions: newSessions,
                dismissedNotificationIds: newDismissedIds,
                draftSession: draftSession,
                sessionDrafts: newDrafts,
                lastUpdated: Date.now()
            };
        });

        setEditingSession(null);
        setPristineSession(null);
        addToast('💾 تم حفظ الجلسة بنجاح.');
    };

    // Helper to sync draft students with the latest student data (e.g. name changes, status updates)
    const syncDraftWithLatestData = useCallback((draft: Session): Session => {
        const studentMap = new Map<number, Student>(activeCircleStudents.map(s => [s.id, s]));
        
        const updatedStudents = draft.students.map(sSession => {
            const sProfile = studentMap.get(sSession.id);
            if (!sProfile) return sSession; // Student might be archived or deleted, keep as is
            
            return {
                ...sSession,
                // Sync Profile Data
                name: sProfile.name,
                gender: sProfile.gender,
                photo: sProfile.photo,
                parentPhone: sProfile.parentPhone,
                notes: sProfile.notes, // General Profile Notes
                // Sync Status
                suspendedMemorization: sProfile.suspendedMemorization,
                suspendedReview: sProfile.suspendedReview,
                isKhatim: sProfile.isKhatim,
                khatimRecitesReview: sProfile.khatimRecitesReview,
            };
        });
        
        return { ...draft, students: updatedStudents };
    }, [activeCircleStudents]);

    const checkPermission = useCallback((permission: keyof MemberPermissions, actionName: string): boolean => {
        if (!activeCircle || !user) return false;
        if (activeCircle.ownerId === user.uid) return true;
        
        const teacher = activeCircle.teachers?.[user.uid];
        if (!teacher) return false;
        
        // Full access shortcut
        if (teacher.accessLevel === 'full') return true;
        
        const hasPermission = teacher.permissions?.[permission];
        
        if (!hasPermission) {
            addToast(`لا يمكنك تنفيذ هذا الإجراء، ليس لديك صلاحية ${actionName}. يرجى طلب الإذن من منشئ الحلقة.`, 'error');
        }
        
        return !!hasPermission;
    }, [activeCircle, user, addToast]);

    const handleViewStudentProfile = useCallback((id: number) => {
        if (!checkPermission('canManageStudents', 'عرض بطاقة الطالب')) return;
        setViewingStudentId(id);
        pushStateSafely();
    }, [checkPermission, setViewingStudentId]);

    const handleNewSession = () => {
        if (!checkPermission('canCreateSessions', 'إنشاء جلسات جديدة')) return;

        if (!activeCircle || activeCircleStudents.length === 0) {
            setAlertModal({ isOpen: true, title: 'خطأ', message: 'لا يمكن إنشاء جلسة بدون طلاب. يرجى إضافة طلاب أولاً.' });
            return;
        }
        
        // Use global draftSession for NEW sessions
        if (activeCircle.settings.autoSaveDrafts && activeCircle.draftSession) {
             const syncedDraft = syncDraftWithLatestData(activeCircle.draftSession);
             setEditingSession(syncedDraft);
             pushStateSafely();
             setPristineSession(JSON.parse(JSON.stringify(syncedDraft)));
             handleNavigate('sessions');
             addToast('تم استعادة مسودة جلسة جديدة (مع تحديث البيانات).', 'info');
             return;
        }

        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const today = `${year}-${month}-${day}`;

        const newSession: Session = {
            id: generateUniqueId(),
            date: today,
            time: now.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
            createdAt: Date.now(),
            students: activeCircleStudents.map(s => ({
                id: s.id,
                name: s.name,
                gender: s.gender,
                photo: s.photo,
                order: s.order,
                attendance: 'present',
                excuse: '',
                memorization: { hasMemorization: false, fromSurah: '', fromAyah: '', toSurah: '', toAyah: '' },
                review: { hasReview: false, fromSurah: '', fromAyah: '', toSurah: '', toAyah: '' },
                suspendedMemorization: s.suspendedMemorization,
                suspendedReview: s.suspendedReview,
                parentPhone: s.parentPhone,
                notes: s.notes,
                note: '',
                extraHomework: '',
                manualPoints: [],
                joinDate: s.joinDate || new Date().toISOString()
            })),
            parentNotifications: {}, isDirty: false, isLesson: false, lessonType: '', lessonTitle: '',
        };
        setEditingSession(newSession);
        pushStateSafely();
        setPristineSession(JSON.parse(JSON.stringify(newSession)));
        handleNavigate('sessions');
    };

    const handleEditSession = (sessionId: number) => {
        if (!activeCircle) return;
        
        // Check for specific session draft first
        const specificDraft = activeCircle.sessionDrafts?.[sessionId];
        if (activeCircle.settings.autoSaveDrafts && specificDraft) {
            const syncedDraft = syncDraftWithLatestData(specificDraft);
            setEditingSession({ ...syncedDraft, isDirty: false });
            pushStateSafely();
            setPristineSession(JSON.parse(JSON.stringify(syncedDraft)));
            addToast('تم استعادة المسودة (مع تحديث البيانات).', 'info');
            return;
        }

        const session = activeCircle.sessions.find(s => s.id === sessionId);
        if (session) {
            const sessionToEdit = { ...session, isDirty: false };
            setEditingSession(sessionToEdit);
            pushStateSafely();
            setPristineSession(JSON.parse(JSON.stringify(sessionToEdit)));
        }
    };
    
    const handleCloseSessionForm = useCallback(() => {
        setEditingSession(currentSession => {
            if (!currentSession || !pristineSession) return null;
            
            const hasEffectiveData = (session: Session) => {
                if (session.isLesson && (session.lessonType || session.lessonTitle)) return true;
                if (session.note && session.note.trim() !== '') return true;
                if (session.appliedBulkActions && session.appliedBulkActions.length > 0) return true;
                
                return session.students.some(s => 
                    s.attendance !== 'present' || 
                    s.memorization?.hasMemorization || 
                    s.review?.hasReview || 
                    (s.note && s.note.trim() !== '') || 
                    (s.excuse && s.excuse.trim() !== '') ||
                    (s.manualPoints && s.manualPoints.length > 0) ||
                    (s.extraMemorizations && s.extraMemorizations.some(m => m.hasMemorization)) ||
                    (s.extraReviews && s.extraReviews.some(r => r.hasReview)) ||
                    (s.otherRecitations && s.otherRecitations.length > 0)
                );
            };

            const isReallyDirty = JSON.stringify({ ...currentSession, isDirty: false }) !== JSON.stringify({ ...pristineSession, isDirty: false });
            const hasData = hasEffectiveData(currentSession);

            if (activeCircle?.settings.autoSaveDrafts && isReallyDirty) {
                const isExistingSession = activeCircle.sessions.some(s => s.id === currentSession.id);
                
                setActiveCircleData(draft => {
                    if (isExistingSession) {
                        // Save to sessionDrafts for existing sessions
                        const newDrafts = { ...(draft.sessionDrafts || {}), [currentSession.id]: currentSession };
                        return { ...draft, sessionDrafts: newDrafts };
                    } else if (hasData) {
                        // Save to draftSession for NEW sessions only if data exists
                        return { ...draft, draftSession: currentSession };
                    } else {
                        // Clear draftSession if no data
                        return { ...draft, draftSession: null };
                    }
                }, false);
                
                if (hasData) addToast('تم حفظ الجلسة كمسودة.', 'info');
                setPristineSession(null);
                return null;
            } else if (activeCircle?.settings.autoSaveDrafts && !hasData && !activeCircle.sessions.some(s => s.id === currentSession.id)) {
                // If it's a new session with no data, clear the new session draft
                setActiveCircleData(draft => ({ ...draft, draftSession: null }), false);
            }

            if (isReallyDirty && !activeCircle?.settings.autoSaveDrafts) {
                setConfirmationModal({
                    isOpen: true,
                    title: "تغييرات غير محفوظة",
                    message: "سيتم فقدان بيانات الجلسة، هل تريد الخروج دون حفظ؟",
                    onConfirm: () => {
                        setConfirmationModal(d => ({...d, isOpen: false}));
                        setEditingSession(null);
                        setPristineSession(null);
                    },
                    onCancel: () => {
                        pushStateSafely();
                    }
                });
                return currentSession;
            }
            
            setPristineSession(null);
            return null;
        });
    }, [activeCircle?.settings.autoSaveDrafts, activeCircle?.sessions, setActiveCircleData, addToast, setConfirmationModal, pristineSession]);

    const handleDeleteSession = (sessionId: number) => {
        if (!checkPermission('canEditPastSessions', 'حذف الجلسات')) return;

        setConfirmationModal({
            isOpen: true,
            title: "حذف جلسة",
            message: "هل أنت متأكد من حذف هذه الجلسة؟",
            onConfirm: () => {
                setActiveCircleData(draft => {
                    // Remove from sessions
                    const newSessions = draft.sessions.filter(s => s.id !== sessionId);
                    // Also remove any draft associated with it
                    const newDrafts = { ...(draft.sessionDrafts || {}) };
                    delete newDrafts[sessionId];
                    
                    const newDeletedIds = [...(draft.deletedSessionIds || []), sessionId];
                    
                    return {
                        ...draft, 
                        sessions: newSessions,
                        sessionDrafts: newDrafts,
                        deletedSessionIds: newDeletedIds,
                        lastUpdated: Date.now()
                    };
                });
                addToast('🗑️ تم حذف الجلسة بنجاح.');
                setConfirmationModal(prev => ({...prev, isOpen: false}));
            }
        });
    };

    const handleResetDraft = useCallback((date: string) => {
        if (!activeCircle || !editingSession) return;
        
        const now = new Date();
        const freshSession: Session = {
            id: editingSession.id, 
            date: date || editingSession.date,
            time: now.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
            createdAt: editingSession.createdAt || Date.now(),
            students: activeCircleStudents.map((s, idx) => ({
                id: s.id,
                name: s.name,
                gender: s.gender,
                photo: s.photo,
                order: idx,
                attendance: 'present',
                excuse: '',
                memorization: { hasMemorization: false, fromSurah: '', fromAyah: '', toSurah: '', toAyah: '' },
                review: { hasReview: false, fromSurah: '', fromAyah: '', toSurah: '', toAyah: '' },
                suspendedMemorization: s.suspendedMemorization,
                suspendedReview: s.suspendedReview,
                parentPhone: s.parentPhone,
                notes: s.notes,
                note: '',
                extraHomework: '',
                joinDate: s.joinDate || new Date().toISOString(),
                manualPoints: []
            })),
            note: '',
            appliedBulkActions: [],
            parentNotifications: {},
            isLesson: false,
            lessonType: '',
            lessonTitle: '',
            isDirty: false,
            lastUpdated: Date.now()
        };

        const isExistingSession = activeCircle.sessions.some(s => s.id === editingSession.id);
        
        if (isExistingSession) {
            // Revert + Clear Draft
            setActiveCircleData(draft => {
                const newDrafts = { ...(draft.sessionDrafts || {}) };
                delete newDrafts[editingSession.id];
                return { ...draft, sessionDrafts: newDrafts };
            }, false);
            setEditingSession(freshSession);
            setPristineSession(JSON.parse(JSON.stringify(freshSession)));
            addToast('🗑️ تم تصفير الجلسة ومسح كافة البيانات.');
        } else {
            // Reset New Session
            setActiveCircleData(draft => ({ ...draft, draftSession: null }), false);
            setEditingSession(freshSession);
            setPristineSession(JSON.parse(JSON.stringify(freshSession)));
            addToast('🗑️ تم تصفير المسودة.');
        }
    }, [activeCircle, editingSession, activeCircleStudents, setActiveCircleData, addToast]);
    
    const handleNotificationSent = (sessionId: number, studentId: number) => {
        setActiveCircleData(draft => ({
            ...draft,
            sessions: draft.sessions.map(s => {
                if (s.id === sessionId) {
                    const newNotifications = {...s.parentNotifications, [studentId]: true };
                    setNotificationSession({...s, parentNotifications: newNotifications});
                    return {...s, parentNotifications: newNotifications};
                }
                return s;
            })
        }));
    };

    const handleTestNotificationSent = (testId: number, studentId: number) => {
        setActiveCircleData(draft => ({
            ...draft,
            tests: (draft.tests || []).map(t => {
                if (t.id === testId) {
                    const newNotifications = { ...t.parentNotifications, [studentId]: true };
                    setNotifyingTest({ ...t, parentNotifications: newNotifications });
                    return { ...t, parentNotifications: newNotifications };
                }
                return t;
            })
        }));
    };

    const handlePlanNotificationSent = (planId: number, studentId: number) => {
        setActiveCircleData(draft => ({
            ...draft,
            plans: (draft.plans || []).map(p => {
                if (p.id === planId) {
                    const newNotifications = { ...p.parentNotifications, [studentId]: true };
                    setNotifyingPlan({ ...p, parentNotifications: newNotifications });
                    return { ...p, parentNotifications: newNotifications };
                }
                return p;
            })
        }));
    };

    const handleActivityNotificationSent = (activityId: number, studentId: number) => {
        setActiveCircleData(draft => ({
            ...draft,
            activities: (draft.activities || []).map(a => {
                if (a.id === activityId) {
                    const newNotifications = { ...a.parentNotifications, [studentId]: true };
                    setNotifyingActivity({ ...a, parentNotifications: newNotifications });
                    return { ...a, parentNotifications: newNotifications };
                }
                return a;
            })
        }));
    };

    const handleAnnouncementNotificationSent = (announcementId: number, studentId: number) => {
        setActiveCircleData(draft => ({
            ...draft,
            announcements: (draft.announcements || []).map(a => {
                if (a.id === announcementId) {
                    const newNotifications = { ...a.parentNotifications, [studentId]: true };
                    // Update current modal viewing object 
                    setNotifyingAnnouncement({ ...a, parentNotifications: newNotifications });
                    return { ...a, parentNotifications: newNotifications };
                }
                return a;
            })
        }));
    };
    
    const handleShowLastRecord = (studentId: number, type: 'memorization' | 'review') => {
        if (!activeCircle) return;
    
        const student = activeCircle.students.find(s => s.id === studentId);
        if (!student) return;
    
        const sortedSessions = [...activeCircle.sessions]
            .filter(s => s.id !== editingSession?.id)
            .sort((a, b) => b.createdAt - a.createdAt);
    
        let lastRecord = null;
        let lastHomework = null;
    
        // 1. Find last record (only in non-lesson sessions where student was present)
        for (const session of sortedSessions) {
            if (session.isLesson) continue;
            const studentData = session.students.find(s => s.id === studentId);
            if (studentData && (studentData.attendance === 'present' || studentData.attendance === 'late')) {
                const record = studentData[type];
                const hasRecord = 'hasMemorization' in record ? record.hasMemorization : record.hasReview;
                if (hasRecord) {
                    const snapshot = session.pointsSettingsSnapshot;
                    const maxGrade = type === 'memorization' 
                        ? (snapshot?.maxMemorizationGrade ?? 10) 
                        : (snapshot?.maxReviewGrade ?? 10);
                        
                    lastRecord = {
                        date: session.date,
                        time: session.time,
                        record: record,
                        maxGrade
                    };
                    break;
                }
            }
        }

        // 2. Find last homework (can be in any session, including lessons)
        // We search backwards until we find a homework that has the specific part (memo or review)
        for (const session of sortedSessions) {
            const studentData = session.students.find(s => s.id === studentId);
            if (studentData && studentData.homeworks && studentData.homeworks.length > 0) {
                const relevantHomework = studentData.homeworks.find(hw => {
                    if (type === 'memorization') {
                        return hw.memorization && hw.memorization.fromSurah;
                    } else {
                        return hw.review && hw.review.fromSurah;
                    }
                });
                
                if (relevantHomework) {
                    lastHomework = {
                        date: session.date,
                        record: relevantHomework
                    };
                    break;
                }
            }
        }
    
        setLastRecordModal({
            isOpen: true,
            studentId,
            studentName: student.name,
            recordType: type === 'memorization' ? 'الحفظ' : 'المراجعة',
            lastRecord: lastRecord,
            lastHomework: lastHomework,
        });
    };

    const handleAddLastRecordToSession = (studentId: number, recordType: 'memorization' | 'review', record: MemorizationRecord | ReviewRecord) => {
        if (!editingSession) {
            addToast('لا يمكن إضافة التسميع، لا توجد جلسة نشطة قيد التعديل.', 'error');
            return;
        };

        setEditingSession(currentSession => {
            if (!currentSession) return null;
            const newStudents = currentSession.students.map(s => {
                if (s.id === studentId) {
                    const hasRecordKey = recordType === 'memorization' ? 'hasMemorization' : 'hasReview';
                    const newRecord = { ...(record as any), [hasRecordKey]: true };
                    return { ...s, [recordType]: newRecord };
                }
                return s;
            });
            return { ...currentSession, students: newStudents, isDirty: true };
        });

        setLastRecordModal({ isOpen: false });
        addToast('✅ تم نسخ التسميع بنجاح.');
    };

    const handleOpenShare = (data: Omit<ShareModalData, 'isOpen'>) => {
        setShareModalData({ isOpen: true, ...data });
        pushStateSafely(); 
    };
    
    const handleOpenReportGenerator = (studentId: number) => {
        setReportGeneratorModal({ isOpen: true, studentId });
    };

    const handleGenerateAndShowReport = (studentId: number, options: { period: string, customStart?: string, customEnd?: string, content: { [key: string]: boolean } }) => {
        if (!checkPermission('canSendReports', 'إرسال التقارير')) return;
        if (!activeCircle) return;
        const student = activeCircle.students.find(s => s.id === studentId);
        if (!student) return;

        const { reportContent, periodLabel } = generateStudentReportText(student, activeCircle.sessions, activeCircle.studyStartDate, options, activeCircle.settings.pointsSettings);
        
        setReportGeneratorModal({ isOpen: false, studentId: null });
        setStudentReportModal({ isOpen: true, student, reportContent, period: periodLabel });
    };

    const handleSaveStudentReport = (studentId: number, reportContent: string, period: string) => {
        const newReport: StudentReport = {
            id: generateUniqueId(),
            studentId,
            generatedAt: Date.now(),
            period,
            content: reportContent,
        };
        setActiveCircleData(draft => ({
            ...draft,
            studentReports: [...(draft.studentReports || []), newReport]
        }));
        addToast('✅ تم حفظ التقرير بنجاح.');
    };

    const handleUpdateSupervisorSettings = (settings: SupervisorReportSettings) => {
        setActiveCircleData(prev => ({
            ...prev,
            supervisorSettings: settings,
            lastUpdated: Date.now()
        }));
        addToast('تم حفظ إعدادات المشرف بنجاح', 'success');
    };

    const handleGenerateSupervisorReport = (options: { period: string, customStart?: string, customEnd?: string, content: { [key: string]: boolean } }) => {
        if (!checkPermission('canSendReports', 'إرسال تقرير المشرف')) return;
        if (!activeCircle) return;
        const { reportContent, periodLabel } = generateSupervisorReportText(activeCircle, options);
        
        setSupervisorReportGeneratorOpen(false);
        setSupervisorReportModal({ isOpen: true, reportContent: reportContent, periodLabel });
    };
    
    const handleSaveSupervisorReport = (reportContent: string, periodLabel: string) => {
        const newReport: SupervisorReport = {
            id: generateUniqueId(),
            generatedAt: Date.now(),
            periodLabel,
            content: reportContent,
        };
        setActiveCircleData(draft => ({
            ...draft,
            supervisorReports: [...(draft.supervisorReports || []), newReport]
        }));
        addToast('✅ تم حفظ التقرير بنجاح.');
    };

    const handleDeleteReport = (reportId: number, type: 'student' | 'supervisor') => {
        setConfirmationModal({
            isOpen: true,
            title: 'حذف التقرير',
            message: 'هل أنت متأكد من حذف هذا التقرير المحفوظ؟',
            onConfirm: () => {
                if (type === 'supervisor') {
                     setActiveCircleData(draft => ({
                        ...draft,
                        supervisorReports: (draft.supervisorReports || []).filter(r => r.id !== reportId)
                    }));
                } else {
                     setActiveCircleData(draft => ({
                        ...draft,
                        studentReports: (draft.studentReports || []).filter(r => r.id !== reportId)
                    }));
                }
                addToast('🗑️ تم حذف التقرير.');
                setConfirmationModal(prev => ({ ...prev, isOpen: false }));
                setViewReportModal({ isOpen: false, report: null, type: 'supervisor' }); 
            }
        });
    };
    
    const handleUpdateSettings = (newSettings: Partial<AppSettings>) => {
        if (!checkPermission('canEditCircleSettings', 'تعديل إعدادات الحلقة')) return;

        setActiveCircleData((draft: CircleData) => {
            return {
                ...draft,
                settings: { 
                    ...draft.settings, 
                    ...newSettings,
                }
            };
        });
        addToast('✅ تم حفظ الإعدادات.');
    };
    
    const handleUpdateNotificationSettings = (newSettings: NotificationSettings) => {
        setActiveCircleData((draft: CircleData) => ({
            ...draft,
            notificationSettings: newSettings,
            lastUpdated: Date.now()
        }));
        addToast('✅ تم حفظ إعدادات الإشعارات.');
    };
    
    const handleAdjustStudentPoints = (studentId: number, adjustment: Omit<ManualPointAdjustment, 'id' | 'date'>) => {
        if (!checkPermission('canManageStudents', 'تعديل نقاط الطالب يدوياً')) return;
        setActiveCircleData((draft: CircleData) => {
            const studentIndex = draft.students.findIndex(s => s.id === studentId);
            if (studentIndex === -1) return draft;

            const nowIso = new Date().toISOString();
            
            const newAdjustment: ManualPointAdjustment = {
                amount: adjustment.amount,
                reason: adjustment.reason,
                id: generateUniqueId(),
                date: nowIso,
            };
            
            const updatedStudent = {
                ...draft.students[studentIndex],
                manualPoints: [...(draft.students[studentIndex].manualPoints || []), newAdjustment],
            };

            const updatedStudents = [
                ...draft.students.slice(0, studentIndex),
                updatedStudent,
                ...draft.students.slice(studentIndex + 1),
            ];

            return {
                ...draft,
                students: updatedStudents,
                lastUpdated: Date.now()
            };
        });
        if (adjustment.amount > 0) {
            addToast(`✅ تمت إضافة ${adjustment.amount} نقطة بنجاح.`, 'success');
        } else if (adjustment.amount < 0) {
            addToast(`⚠️ تم خصم ${Math.abs(adjustment.amount)} نقطة.`, 'error');
        }
    };

    const handleSaveBulkReward = (rewardData: Omit<BulkReward, 'id' | 'createdAt' | 'updatedAt'>, rewardId?: number) => {
        if (!checkPermission('canManageStudents', 'إدارة المكافآت')) return;
        if (!activeCircle) return;

        setActiveCircleData((draft: CircleData) => {
            const now = Date.now();
            const nowDateIso = new Date().toISOString();
            
            let bulkReward: BulkReward;
            let updatedRewards = [...(draft.bulkRewards || [])];
            let historyEntry: PointHistoryEntry | undefined;

            if (rewardId) {
                // Editing existing
                const index = updatedRewards.findIndex(r => r.id === rewardId);
                if (index !== -1) {
                    const oldReward = updatedRewards[index];
                    
                    // Create History Record
                    historyEntry = {
                        date: now,
                        oldAmount: oldReward.amount,
                        newAmount: rewardData.amount,
                        oldReason: oldReward.reason,
                        newReason: rewardData.reason
                    };

                    const existingHistory = oldReward.history || [];
                    
                    bulkReward = { 
                        ...oldReward, 
                        ...rewardData, 
                        updatedAt: now,
                        history: [historyEntry, ...existingHistory]
                    };
                    updatedRewards[index] = bulkReward;
                } else {
                    return draft;
                }
            } else {
                // New Reward
                bulkReward = { ...rewardData, id: now, createdAt: now };
                updatedRewards.push(bulkReward);
            }

            // Update students
            const updatedStudents = draft.students.map(student => {
                if ((rewardData.studentIds || []).includes(student.id)) {
                    // Logic to ensure non-negative points
                    const currentTotal = calculateStudentTotalPoints(student, draft.sessions, draft.settings.pointsSettings || defaultPointsSettings);
                    let effectiveAmount = rewardData.amount;
                    let originalAmount = undefined;

                    // If deducting, check bounds
                    let currentTotalWithoutThisReward = currentTotal;
                    const existingAdjIndex = (student.manualPoints || []).findIndex(mp => mp.rewardId === rewardId);
                    
                    if (rewardId && existingAdjIndex !== -1) {
                        const oldAdj = student.manualPoints![existingAdjIndex];
                        currentTotalWithoutThisReward -= oldAdj.amount;
                    }

                    if (effectiveAmount < 0 && currentTotalWithoutThisReward + effectiveAmount < 0) {
                        originalAmount = effectiveAmount;
                        effectiveAmount = -currentTotalWithoutThisReward; // Deduct only what they have
                    }

                    // If editing, find existing adjustment and update it
                    if (rewardId) {
                        if (existingAdjIndex !== -1) {
                            const newAdjustments = [...(student.manualPoints || [])];
                            const oldAdj = newAdjustments[existingAdjIndex];
                            
                            // Also add history to individual adjustment
                            const studentHistoryEntry: PointHistoryEntry = {
                                date: now,
                                oldAmount: oldAdj.amount,
                                newAmount: effectiveAmount,
                                oldReason: oldAdj.reason,
                                newReason: rewardData.reason
                            };
                            const existingAdjHistory = oldAdj.history || [];

                            newAdjustments[existingAdjIndex] = {
                                ...oldAdj,
                                amount: effectiveAmount,
                                reason: rewardData.reason,
                                originalAmount,
                                updatedAt: now,
                                history: [studentHistoryEntry, ...existingAdjHistory]
                            };
                            return { ...student, manualPoints: newAdjustments };
                        }
                    } 
                    
                    // New adjustment
                    if (!rewardId || !(student.manualPoints || []).find(mp => mp.rewardId === rewardId)) {
                         const newAdjustment: ManualPointAdjustment = {
                            id: generateUniqueId(), // Ensure unique ID
                            amount: effectiveAmount,
                            reason: rewardData.reason,
                            date: nowDateIso,
                            rewardId: bulkReward.id,
                            originalAmount
                        };
                        return { ...student, manualPoints: [...(student.manualPoints || []), newAdjustment] };
                    }
                } else if (rewardId) {
                    // If editing and student was removed from selection, remove adjustment
                    if (student.manualPoints && student.manualPoints.some(mp => mp.rewardId === rewardId)) {
                        return {
                            ...student,
                            manualPoints: student.manualPoints.filter(mp => mp.rewardId !== rewardId)
                        };
                    }
                }
                return student;
            });

            return { ...draft, bulkRewards: updatedRewards, students: updatedStudents, lastUpdated: Date.now() };
        });
        
        addToast(rewardId ? '✅ تم تعديل المكافأة بنجاح.' : '✅ تم حفظ المكافأة بنجاح.');
    };

    const handleDeleteBulkReward = (rewardId: number) => {
        if (!checkPermission('canManageStudents', 'إدارة المكافآت')) return;
        setActiveCircleData((draft: CircleData) => ({
            ...draft,
            bulkRewards: (draft.bulkRewards || []).filter(r => r.id !== rewardId),
            students: draft.students.map(s => ({
                ...s,
                manualPoints: (s.manualPoints || []).filter(mp => mp.rewardId !== rewardId)
            })),
            lastUpdated: Date.now()
        }));
        addToast('🗑️ تم حذف المكافأة وتأثيرها.', 'info');
    };

    const handleZeroPoints = (studentIds: number[]) => {
        if (!checkPermission('canManageStudents', 'تصفير النقاط')) return;
        setActiveCircleData((draft: CircleData) => {
            const nowIso = new Date().toISOString();

            return {
                ...draft,
                students: draft.students.map(s => {
                    if ((studentIds || []).includes(s.id)) {
                        return { 
                            ...s, 
                            lastPointResetDate: nowIso,
                            pointResetAlertDismissed: false,
                            lastUpdated: Date.now()
                        };
                    }
                    return s;
                }),
                lastUpdated: Date.now()
            };
        });
        addToast('✅ تم تصفير النقاط للطلاب المحددين.', 'success');
    };

    const handleDismissPointResetAlert = (studentId: number) => {
        setActiveCircleData(draft => ({
            ...draft,
            students: draft.students.map(s => s.id === studentId ? { ...s, pointResetAlertDismissed: true } : s)
        }));
    };

    // New: Handle updating a student's history (e.g. marking a message as sent)
    const handleUpdateStudent = (updatedStudent: Student) => {
        setActiveCircleData(draft => ({
            ...draft,
            students: draft.students.map(s => s.id === updatedStudent.id ? { ...updatedStudent, lastUpdated: Date.now() } : s),
            lastUpdated: Date.now()
        }));
    };


    const defaultsForOptionalFields: Partial<CircleData> = {
        logo: undefined,
        students: [],
        sessions: [],
        notifications: [],
        dismissedNotificationIds: [],
        settings: { 
            theme: 'dark',
            showLastRecordFeature: true,
            surahSelectionMethod: 'list',
            surahOrder: 'quranic',
            autoSaveDrafts: true,
            pointsSettings: defaultPointsSettings,
            followUpSettings: defaultFollowUpSettings,
            syncSurahFields: false,
            defaultTestMaxScores: {},
        },
        notificationSettings: defaultNotificationSettings,
        studyStartDate: new Date().toISOString().split('T')[0],
        lastWelcomeTipShow: Date.now(),
        lessonTypes: defaultLessonTypes,
        activityTypes: defaultActivityTypes,
        hasSeenWelcomePopup: false,
        hasCompletedOnboarding: false,
        hasShownWelcomeNotification: true,
        hasShownDuaaNotification: true,
        hasAgreedToCommunityTerms: false,
        studentReports: [],
        supervisorReports: [],
        tests: [],
        plans: [],
        activities: [],
        announcements: [],
        draftTest: null,
        draftPlan: null,
        draftActivity: null,
        draftAnnouncement: null,
        draftSession: null,
        sessionDrafts: {},
        lastDailyNotificationDate: '',
        lastRareNotificationDate: 0,
        rareNotificationIndex: 0,
        hasShownStatsNotification_d2: false,
        hasShownStudentCardNotification_d5: false,
        hasShownSupervisorReportNotification_w2: false,
        hasShownAddonsNotification_m1: false,
        hasShownContactDevNotification_m2: false,
        lastMonthlyStatsNotification: '',
        bulkRewards: []
    };

    const handleConfirmRestoreAsNew = (updatedCircleName: string) => {
        if (!backupReviewModalData) return;

        const importedData = backupReviewModalData;
        const importedSettings = importedData.settings || {} as AppSettings;
        const importedPointsSettings = (importedSettings.pointsSettings || {}) as any;
        const importedFollowUpSettings = (importedSettings.followUpSettings || {}) as any;
        const defaultSettings = (defaultsForOptionalFields.settings || {}) as AppSettings;
        const defaultSettingsPoints = (defaultSettings.pointsSettings || {}) as any;
        const defaultSettingsFollowUp = (defaultSettings.followUpSettings || {}) as any;

        const mergedSettings: AppSettings = {
            theme: 'dark',
            ...(defaultSettings as any || {}),
            ...(importedSettings as any || {}),
            pointsSettings: {
                ...defaultPointsSettings,
                ...(defaultSettingsPoints as any || {}),
                ...(importedPointsSettings as any || {})
            },
            followUpSettings: {
                ...defaultFollowUpSettings,
                ...(defaultSettingsFollowUp as any || {}),
                ...(importedFollowUpSettings as any || {})
            }
        } as AppSettings;

        const newCircle: CircleData = {
            ...defaultsForOptionalFields,
            id: generateUniqueStringId(),
            numericId: generateNumericId(),
            transferCode: generateTransferCode(),
            transferPassword: Math.floor(1000 + Math.random() * 9000).toString(),
            allowDirectEntry: true,
            
            circle: updatedCircleName,
            center: importedData.center || 'مركز تحفيظ',
            town: importedData.town || '',
            studyStartDate: importedData.studyStartDate || new Date().toISOString().split('T')[0],
            teacherGender: userProfile?.gender || importedData.teacherGender || 'male',
            teacher: userProfile?.displayName || user?.displayName || 'المشرف',
            logo: importedData.logo || '',

            ownerId: user?.uid, // Set current user as owner
            authorizedUserIds: user ? [user.uid] : [],
            teachers: user ? {
                [user.uid]: {
                    name: userProfile?.displayName || user.displayName || 'المشرف',
                    gender: userProfile?.gender || 'male',
                    role: 'owner',
                    accessLevel: 'full',
                    status: 'active',
                    joinedAt: Date.now(),
                    permissions: defaultMemberPermissions.teacher
                }
            } : {},

            settings: mergedSettings,
            lessonTypes: importedData.lessonTypes || ['تسميع جديد', 'مراجعة قريبة', 'مراجعة بعيدة'],
            lastWelcomeTipShow: Date.now(),
            notifications: [],
            dismissedNotificationIds: [],

            students: (importedData.students || []).map((s: any) => ({ ...s, syncStatus: 'pending' as const })),
            sessions: (importedData.sessions || []).map((s: any) => ({ ...s, syncStatus: 'pending' as const })),
            plans: (importedData.plans || []).map((s: any) => ({ ...s, syncStatus: 'pending' as const })),
            tests: (importedData.tests || []).map((s: any) => ({ ...s, syncStatus: 'pending' as const })),
            activities: (importedData.activities || []).map((s: any) => ({ ...s, syncStatus: 'pending' as const })),
            announcements: (importedData.announcements || []).map((s: any) => ({ ...s, syncStatus: 'pending' as const })),
            bulkRewards: importedData.bulkRewards || [],
            
            studentReports: (importedData.studentReports || []).map((s: any) => ({ ...s, syncStatus: 'pending' as const })),
            supervisorReports: (importedData.supervisorReports || []).map((s: any) => ({ ...s, syncStatus: 'pending' as const })),
            deletedSessionIds: [],
            deletedStudentIds: []
        } as CircleData;

        setAppData(prev => ({
            ...prev,
            circles: [...prev.circles, newCircle],
            activeCircleId: newCircle.id
        }));
        
        setActivePage('home');
        setActiveSettingsPage('main');
        setShowNewCircleForm(false);
        setIsInitialising(false);
        setBackupReviewModalData(null);
        addToast('✅ تم استيراد الحلقة الجديدة بنجاح.');
    };

    const handleImportBackup = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '*/*';
        input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                handleRestoreFromText(event.target?.result as string);
            };
            reader.readAsText(file);
        };
        input.click();
    };

    const handleRestoreFromText = (text: string) => {
        try {
            const importedData = JSON.parse(text) as any;
            
            if (typeof importedData !== 'object' || importedData === null) {
                throw new Error("Invalid backup file format.");
            }

            const dataToCheck: any = importedData;

            if (typeof dataToCheck.id !== 'string' || typeof dataToCheck.circle !== 'string' || !Array.isArray(dataToCheck.students)) {
                throw new Error("Invalid backup file format.");
            }
            
            // Close text restore modal if open
            setTextRestoreModalOpen(false);
            setBackupReviewModalData(dataToCheck as CircleData);
            pushStateSafely();

        } catch (error) {
            console.error("Failed to import backup:", error);
            setAlertModal({ isOpen: true, title: 'خطأ في الاستيراد', message: 'الملف أو النص المحدد غير صالح أو تالف.' });
        }
    };
    
    const handleCreateBackup = () => {
        if (!activeCircle) return;
    
        setFilenamePromptModal({
            isOpen: true,
            title: 'إنشاء نسخة احتياطية',
            label: 'اسم الملف:',
            initialValue: `نسخة احتياطية_${activeCircle.circle.replace(/\s/g, '_')}`,
            description: 'ملاحظة: ميزة حفظ الملف قد لا تعمل على بعض الهواتف بسبب قيود النظام.',
            onConfirm: (filename) => {
                setFilenamePromptModal(p => ({...p, isOpen: false}));
                
                const dataStr = JSON.stringify(activeCircle, null, 2);
                const blob = new Blob([dataStr], { type: "application/json" });
                
                downloadFile(blob, `${filename}.json`, addToast);
            },
        });
    };

    const handleNavigate = useCallback((page: string) => {
        // Feature: Scroll to top if clicking the same tab
        if (page === activePage) {
            if (mainContainerRef.current) {
                mainContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
            }
            
            // Special behavior for Settings: Go back to main settings menu if deep inside
            if (page === 'settings' && activeSettingsPage !== 'main') {
                setActiveSettingsPage('main');
                settingsHistoryRef.current = ['main'];
            }
            
            // Special behavior for Services: Go back to main services menu if deep inside
            if (page === 'services' && activeServicesPage !== 'main') {
                setActiveServicesPage('main');
                servicesHistoryRef.current = ['main'];
            }
            return;
        }

        if (page === 'circleInfo') {
            setActivePage('circleInfo');
            pushStateSafely();
            return;
        }

        if (page === 'home') {
            historyRef.current = ['home'];
        } else {
             if (historyRef.current[historyRef.current.length - 1] !== page) {
                historyRef.current.push(page);
                pushStateSafely();
            }
        }

        if (page !== activePage) {
            const currentIndex = mainPages.indexOf(activePage);
            const newIndex = mainPages.indexOf(page);
    
            if (newIndex > -1 && currentIndex > -1) {
                if (newIndex > currentIndex) setDirection(1);
                else if (newIndex < currentIndex) setDirection(-1);
                else setDirection(0);
            }

            if (page !== 'records') {
                setSelectedStudentId(null);
            }
            if (page === 'settings') {
                 setActiveSettingsPage('main');
                 settingsHistoryRef.current = ['main'];
            }
            if (page === 'services') {
                 setActiveServicesPage('main');
                 servicesHistoryRef.current = ['main'];
            }
            
            setActivePage(page);
        }
    }, [activePage, activeSettingsPage, activeServicesPage]);
    
    const navigateWithinSettings = (subPage: string) => {
        if (settingsHistoryRef.current[settingsHistoryRef.current.length-1] !== subPage) {
            settingsHistoryRef.current.push(subPage);
            pushStateSafely();
        }
        setActiveSettingsPage(subPage);
    };

    const navigateWithinServices = (subPage: string) => {
        if (servicesHistoryRef.current[servicesHistoryRef.current.length-1] !== subPage) {
            servicesHistoryRef.current.push(subPage);
            pushStateSafely();
        }
        setActiveServicesPage(subPage);
    };

    const switchCircle = (id: string) => {
        const newCircleName = appData.circles.find(c => c.id === id)?.circle;
        
        // Force save any open forms BEFORE switching circles
        if (editingSession) handleCloseSessionForm();
        if (editingTest) {
            const hasData = editingTest.name?.trim() !== '';
            setActiveCircleData(draft => ({...draft, draftTest: hasData ? editingTest : null}), false);
            setEditingTest(null);
        }
        if (editingPlan) {
            const hasData = editingPlan.name?.trim() !== '';
            setActiveCircleData(draft => ({...draft, draftPlan: hasData ? editingPlan : null}), false);
            setEditingPlan(null);
        }
        if (editingActivity) {
            const hasData = editingActivity.name?.trim() !== '';
            setActiveCircleData(draft => ({...draft, draftActivity: hasData ? editingActivity : null}), false);
            setEditingActivity(null);
        }
        if (editingAnnouncement) {
            const hasData = editingAnnouncement.title?.trim() !== '' || editingAnnouncement.content?.trim() !== '';
            setActiveCircleData(draft => ({...draft, draftAnnouncement: hasData ? editingAnnouncement : null}), false);
            setEditingAnnouncement(null);
        }
        
        setTimeout(() => {
            setAppData(d => ({ ...d, activeCircleId: id }));
        }, 0);
    };

    
    const handleQuickSwitch = () => {
        const { circles, activeCircleId, quickSwitchCircleIds } = appData;
        if (circles.length < 2) return;
    
        if (circles.length === 2) {
            const otherCircle = circles.find(c => c.id !== activeCircleId);
            if (otherCircle) switchCircle(otherCircle.id);
        } else { 
            if (!quickSwitchCircleIds || quickSwitchCircleIds.length !== 2) {
                setQuickSwitchModalOpen(true);
                return;
            }
    
            const [id1, id2] = quickSwitchCircleIds;
            const targetId = activeCircleId === id1 ? id2 : id1;
            switchCircle(targetId);
        }
    };
    
    const handleSaveQuickSwitchSelection = (ids: [string, string]) => {
        setAppData(prev => ({ ...prev, quickSwitchCircleIds: ids }));
        setQuickSwitchModalOpen(false);
        addToast('✅ تم حفظ اختيار التنقل السريع.');
    };

    const handleTransferStudent = (studentId: number, targetCircleId: string) => {
        setAppData(prev => {
            const sourceCircleId = prev.activeCircleId;
            if (!sourceCircleId) return prev;
    
            const sourceCircleIndex = prev.circles.findIndex(c => c.id === sourceCircleId);
            const targetCircleIndex = prev.circles.findIndex(c => c.id === targetCircleId);
    
            if (sourceCircleIndex === -1 || targetCircleIndex === -1) return prev;
    
            const sourceCircle = prev.circles[sourceCircleIndex];
            const studentToTransfer = sourceCircle.students.find(s => s.id === studentId);
    
            if (!studentToTransfer) return prev;
    
            const reportsToTransfer = (sourceCircle.studentReports || []).filter(r => r.studentId === studentId);
            const studentSessionHistory: { session: Session, studentData: SessionStudent }[] = [];
            sourceCircle.sessions.forEach(session => {
                const studentData = session.students.find(s => s.id === studentId);
                if (studentData) {
                    studentSessionHistory.push({ session, studentData });
                }
            });
    
            const newCircles = [...prev.circles];
    
            newCircles[sourceCircleIndex] = {
                ...sourceCircle,
                students: sourceCircle.students.filter(s => s.id !== studentId),
                studentReports: (sourceCircle.studentReports || []).filter(r => r.studentId !== studentId),
                sessions: sourceCircle.sessions
                    .map(session => ({
                        ...session, 
                        students: session.students.filter(s => s.id !== studentId)
                    }))
                    .filter(session => session.students.length > 0)
            };
    
            let targetCircle = prev.circles[targetCircleIndex];
            
            const sessionMap = new Map(targetCircle.sessions.map(s => [s.id, s]));

            studentSessionHistory.forEach(({ session, studentData }) => {
                if (sessionMap.has(session.id)) {
                    const existingSession = sessionMap.get(session.id) as Session;
                    sessionMap.set(session.id, {
                        ...existingSession,
                        students: [...existingSession.students, studentData]
                    });
                } else {
                    sessionMap.set(session.id, { ...session, students: [studentData] });
                }
            });
    
            newCircles[targetCircleIndex] = {
                ...targetCircle,
                students: [...targetCircle.students, { ...(studentToTransfer as Student), order: targetCircle.students.length }],
                studentReports: [...(targetCircle.studentReports || []), ...reportsToTransfer],
                sessions: Array.from(sessionMap.values())
            };
    
            return { ...prev, circles: newCircles };
        });
    
        setConfirmationModal(prev => ({ ...prev, isOpen: false }));
        setShowStudentForm(false);
        setEditingStudent(null);
        addToast('✅ تم نقل الطالب وسجلاته بنجاح.');
    };
    
    const promptTransferConfirmation = (studentToTransfer: Student, targetCircleId: string) => {
        setChoiceModal(prev => ({ ...prev, isOpen: false }));
        const targetCircle = appData.circles.find(c => c.id === targetCircleId);
        if (!targetCircle) return;
    
        setConfirmationModal({
            isOpen: true,
            title: 'تأكيد نقل الطالب',
            message: `هل أنت متأكد من نقل الطالب "${studentToTransfer.name}" إلى حلقة "${targetCircle.circle}"؟ سيتم نقل سجله بالكامل (الحضور، التسميع، النقاط، الإحصائيات) معه.`,
            onConfirm: () => handleTransferStudent(studentToTransfer.id, targetCircleId)
        });
    };
    
    const handleOpenTransferStudentModal = (studentToTransfer: Student) => {
        if (!activeCircle) return;
        const otherCircles = appData.circles.filter(c => c.id !== activeCircle.id);
        if (otherCircles.length === 0) {
            addToast('لا توجد حلقات أخرى لنقل الطالب إليها.', 'info');
            return;
        }
    
        const actions = otherCircles.map(circle => ({
            text: `نقل إلى: ${circle.circle}`,
            onClick: () => promptTransferConfirmation(studentToTransfer, circle.id),
            className: 'bg-blue-500 text-white'
        }));
    
        setChoiceModal({
            isOpen: true,
            title: `نقل الطالب: ${studentToTransfer.name}`,
            message: 'اختر الحلقة التي تريد نقل الطالب إليها:',
            actions,
            onCancel: () => setChoiceModal({ isOpen: false, title: '', message: '', actions: [], onCancel: () => {} })
        });
    };

    const handleSaveTest = (test: Test) => {
        setActiveCircleData(draft => {
            const tests = [...(draft.tests || [])];
            // Ensure only students in targetStudentIds have results.
            // If result exists for student not in target, remove it.
            const cleanedResults = test.results.filter(r => (test.targetStudentIds || []).includes(r.studentId));
            
            // Also ensure all targeted students have a result entry (even if empty)
            const finalResults = [...cleanedResults];
            test.targetStudentIds.forEach(id => {
                if (!finalResults.find(r => r.studentId === id)) {
                    finalResults.push({ studentId: id, grades: {} });
                }
            });

            const updatedTest = { ...test, results: finalResults, lastUpdated: Date.now() };

            const existingIndex = tests.findIndex(t => t.id === updatedTest.id);
            if (existingIndex > -1) {
                tests[existingIndex] = updatedTest;
            } else {
                tests.push(updatedTest);
            }
            // Clear draftTest after save
            return { ...draft, tests, draftTest: null, lastUpdated: Date.now() };
        });

        if (activePage === 'services') {
            if (servicesHistoryRef.current[servicesHistoryRef.current.length - 1] === 'testForm') {
                servicesHistoryRef.current.pop();
            }
            navigateWithinServices('tests');
        } else {
            if (settingsHistoryRef.current[settingsHistoryRef.current.length - 1] === 'testForm') {
                settingsHistoryRef.current.pop();
            }
            navigateWithinSettings('tests');
        }
        addToast('✅ تم حفظ الاختبار بنجاح.');
    };

    const handleDeleteTest = (testId: number) => {
        setConfirmationModal({
            isOpen: true,
            title: 'حذف الاختبار',
            message: 'هل أنت متأكد من حذف هذا الاختبار؟',
            onConfirm: () => {
                setActiveCircleData(draft => ({
                    ...draft,
                    tests: (draft.tests || []).filter(t => t.id !== testId),
                    lastUpdated: Date.now()
                }));
                addToast('🗑️ تم حذف الاختبار.');
                setConfirmationModal(p => ({ ...p, isOpen: false }));
            }
        });
    };

    const handleSavePlan = (plan: Plan) => {
        setActiveCircleData(draft => {
            const plans = [...(draft.plans || [])];
            
            // Clean up studentPlans to only include targeted students
            const cleanedStudentPlans = plan.studentPlans.filter(p => (plan.targetStudentIds || []).includes(p.studentId));
            
            // Ensure all targeted students have a plan entry
            const finalStudentPlans = [...cleanedStudentPlans];
             plan.targetStudentIds.forEach(id => {
                if (!finalStudentPlans.find(p => p.studentId === id)) {
                    finalStudentPlans.push({
                        studentId: id,
                        memorization: { hasPlan: true, fromSurah: '', fromAyah: '', toSurah: '', toAyah: '' },
                        review: { hasPlan: true, fromSurah: '', fromAyah: '', toSurah: '', toAyah: '' },
                        notes: ''
                    });
                }
            });
            
            const updatedPlan = { ...plan, studentPlans: finalStudentPlans, lastUpdated: Date.now() };

            const existingIndex = plans.findIndex(p => p.id === updatedPlan.id);
            if (existingIndex > -1) {
                plans[existingIndex] = updatedPlan;
            } else {
                plans.push(updatedPlan);
            }
            return { ...draft, plans, draftPlan: undefined, lastUpdated: Date.now() };
        });

        if (activePage === 'services') {
            if (servicesHistoryRef.current[servicesHistoryRef.current.length - 1] === 'planForm') {
                servicesHistoryRef.current.pop();
            }
            navigateWithinServices('plans');
        } else {
            if (settingsHistoryRef.current[settingsHistoryRef.current.length - 1] === 'planForm') {
                settingsHistoryRef.current.pop();
            }
            navigateWithinSettings('plans');
        }
        addToast('✅ تم حفظ الخطة بنجاح.');
    };

    const handleDeletePlan = (planId: number) => {
        setConfirmationModal({
            isOpen: true,
            title: 'حذف الخطة',
            message: 'هل أنت متأكد من حذف هذه الخطة؟',
            onConfirm: () => {
                setActiveCircleData(draft => ({
                    ...draft,
                    plans: (draft.plans || []).filter(p => p.id !== planId),
                    lastUpdated: Date.now()
                }));
                addToast('🗑️ تم حذف الخطة.');
                setConfirmationModal(p => ({ ...p, isOpen: false }));
            }
        });
    };

    const handleSaveActivity = (activity: Activity) => {
        setActiveCircleData(draft => {
            const activities = [...(draft.activities || [])];
            const updatedActivity = { ...activity, lastUpdated: Date.now() };
            const existingIndex = activities.findIndex(a => a.id === updatedActivity.id);
            if (existingIndex > -1) {
                activities[existingIndex] = updatedActivity;
            } else {
                activities.push(updatedActivity);
            }
            return { ...draft, activities, draftActivity: undefined, lastUpdated: Date.now() };
        });

        if (activePage === 'services') {
            if (servicesHistoryRef.current[servicesHistoryRef.current.length - 1] === 'activityForm') {
                servicesHistoryRef.current.pop();
            }
            navigateWithinServices('activities');
        } else {
            if (settingsHistoryRef.current[settingsHistoryRef.current.length - 1] === 'activityForm') {
                settingsHistoryRef.current.pop();
            }
            navigateWithinSettings('activities');
        }
        addToast('✅ تم حفظ النشاط بنجاح.');
    };

    const handleDeleteActivity = (activityId: number) => {
        setConfirmationModal({
            isOpen: true,
            title: 'حذف النشاط',
            message: 'هل أنت متأكد من حذف هذا النشاط؟',
            onConfirm: () => {
                setActiveCircleData(draft => ({
                    ...draft,
                    activities: (draft.activities || []).filter(a => a.id !== activityId),
                    lastUpdated: Date.now()
                }));
                addToast('🗑️ تم حذف النشاط.');
                setConfirmationModal(p => ({ ...p, isOpen: false }));
            }
        });
    };

    const handleSaveAnnouncement = (announcement: Announcement) => {
        setActiveCircleData(draft => {
            const announcements = draft.announcements || [];
            const updatedAnnouncement = { ...announcement, lastUpdated: Date.now() };
            const existingIndex = announcements.findIndex(a => a.id === updatedAnnouncement.id);
            if (existingIndex > -1) {
                announcements[existingIndex] = updatedAnnouncement;
            } else {
                announcements.push(updatedAnnouncement);
            }
            return { ...draft, announcements, draftAnnouncement: null, lastUpdated: Date.now() };
        });
        
        setRecentAnnouncementId(announcement.id);
        
        if (activePage === 'services') {
            if (servicesHistoryRef.current[servicesHistoryRef.current.length - 1] === 'announcementForm') {
                servicesHistoryRef.current.pop();
            }
            navigateWithinServices('announcements');
        } else {
            if (settingsHistoryRef.current[settingsHistoryRef.current.length - 1] === 'announcementForm') {
                settingsHistoryRef.current.pop();
            }
            navigateWithinSettings('announcements');
        }
        addToast('✅ تم حفظ الإعلان بنجاح.');
    };

    const handleDeleteAnnouncement = (announcementId: number) => {
        setConfirmationModal({
            isOpen: true,
            title: 'حذف الإعلان',
            message: 'هل أنت متأكد من حذف هذا الإعلان؟',
            onConfirm: () => {
                setActiveCircleData(draft => ({
                    ...draft,
                    announcements: (draft.announcements || []).filter(a => a.id !== announcementId),
                    lastUpdated: Date.now()
                }));
                addToast('🗑️ تم حذف الإعلان.');
                setConfirmationModal(p => ({ ...p, isOpen: false }));
            }
        });
    };

    const handleJoinCommunity = (link: string) => {
        if (activeCircle?.hasAgreedToCommunityTerms) {
            window.open(link, '_blank', 'noopener,noreferrer');
        } else {
            setCommunityTermsModalState({ isOpen: true, targetLink: link });
            pushStateSafely();
        }
    };
    
    const handleAgreeToCommunityTerms = () => {
        if (communityTermsModalState.targetLink) {
            setActiveCircleData(draft => ({ ...draft, hasAgreedToCommunityTerms: true }));
            window.open(communityTermsModalState.targetLink, '_blank', 'noopener,noreferrer');
        }
        setCommunityTermsModalState({ isOpen: false, targetLink: null });
    };

    // --- Session Import Handler ---
    const handleImportSessionFromCode = (data: any) => {
        if (!activeCircle) return;

        const importedSessionData = data as {
            date: string;
            time: string;
            isLesson: boolean;
            lessonType: string;
            lessonTitle: string;
            students: any[];
        };

        // Generate a new unique ID to avoid collision
        const newSessionId = generateUniqueId();
        
        // Construct the new session object
        const newSession: Session = {
            id: newSessionId,
            date: importedSessionData.date,
            time: importedSessionData.time,
            createdAt: Date.now(), // Use current time as creation time
            isLesson: importedSessionData.isLesson,
            lessonType: importedSessionData.lessonType,
            lessonTitle: importedSessionData.lessonTitle,
            isDirty: false,
            parentNotifications: {}, // Reset notifications
            // CRITICAL: We do NOT use the imported point snapshot.
            // We use the current circle's settings so points are calculated locally.
            pointsSettingsSnapshot: activeCircle.settings.pointsSettings || defaultPointsSettings,
            students: importedSessionData.students.map((s: any) => {
                // Find matching student in current circle to get name/photo/gender (which are not in export)
                const localStudent = activeCircle.students.find(ls => ls.id === s.id);
                // We assume validation passed, so localStudent exists.
                if (!localStudent) return null; 

                return {
                    ...localStudent, // Spread local details (name, photo, etc)
                    attendance: s.attendance,
                    excuse: s.excuse,
                    memorization: s.memorization,
                    review: s.review,
                    note: s.note,
                    // Keep performance flags from import
                    isKhatim: s.isKhatim,
                    khatimRecitesReview: s.khatimRecitesReview,
                    suspendedMemorization: s.suspendedMemorization,
                    suspendedReview: s.suspendedReview
                } as SessionStudent;
            }).filter((s: any) => s !== null) as SessionStudent[]
        };

        setActiveCircleData(draft => ({
            ...draft,
            sessions: [...draft.sessions, newSession]
        }));

        addToast('✅ تم استيراد الجلسة بنجاح.', 'success');
        handleNavigate('sessions'); // Go to sessions page to see it
    };


    useEffect(() => {
        pushStateSafely();
    }, []);

    const handlePopState = useCallback(() => {
        // 1. Close Sub-Modals (Priority: Surah Selector, Profile Details)
        if (isSubModalOpen) {
            setIsSubModalOpen(false);
            return;
        }

        // 2. Close Modals (Priority)
        if (exitToastTimeoutRef.current) {
            clearTimeout(exitToastTimeoutRef.current);
            exitToastTimeoutRef.current = null;
        }
        
        const close = (closer: () => void) => {
            closer();
        };

        if (notificationSettingsModalOpen) { close(() => setNotificationSettingsModalOpen(false)); return; }
        if (communityTermsModalState.isOpen) { close(() => setCommunityTermsModalState({ isOpen: false, targetLink: null })); return; }
        if (backupRestoreModalOpen) { close(() => setBackupRestoreModalOpen(false)); return; }
        if (textBackupModalOpen) { close(() => setTextBackupModalOpen(false)); return; }
        if (textRestoreModalOpen) { close(() => setTextRestoreModalOpen(false)); return; }
        if (backupReviewModalData) { close(() => setBackupReviewModalData(null)); return; }
        if (filenamePromptModal.isOpen) { close(() => setFilenamePromptModal(p => ({ ...p, isOpen: false }))); return; }
        if (shareModalData.isOpen) { close(() => setShareModalData({ isOpen: false })); return; }
        if (quickSwitchModalOpen) { close(() => setQuickSwitchModalOpen(false)); return; }
        if (rewardsManagerOpen) { close(() => setRewardsManagerOpen(false)); return; }
        if (shareSessionCodeModal.isOpen) { close(() => setShareSessionCodeModal({ isOpen: false, session: null })); return; }
        if (importSessionCodeModalOpen) { close(() => setImportSessionCodeModalOpen(false)); return; }
        
        // Specific order for Point Log modals to prevent closing Profile Card first
        if (activePointAdjusterStudentId) { close(() => setActivePointAdjusterStudentId(null)); return; }
        if (activePointsLogStudentId) { close(() => setActivePointsLogStudentId(null)); return; }

        if (viewingStudentId) { close(() => setViewingStudentId(null)); return; }
        if (showLeaderboard) { close(() => setShowLeaderboard(false)); return; }
        if (viewReportModal.isOpen) { close(() => setViewReportModal({isOpen: false, report: null, type: 'supervisor'})); return; }
        if (pointsSettingsModalOpen) { close(() => setPointsSettingsModalOpen(false)); return; }
        if (addonsModalOpen) { close(() => setAddonsModalOpen(false)); return; }
        if (isTourActive) { close(() => setIsTourActive(false)); return; }
        if (showWelcomePopup) { close(() => setShowWelcomePopup(false)); return; }
        if (showNewCircleForm) { close(() => setShowNewCircleForm(false)); return; }
        if (confirmationModal.isOpen) { close(() => setConfirmationModal(d => ({...d, isOpen: false}))); return; }
        if (choiceModal.isOpen) { close(() => setChoiceModal(d => ({...d, isOpen: false}))); return; }
        if (alertModal.isOpen) { close(() => setAlertModal(d => ({...d, isOpen: false}))); return; }
        if (statsModalData.isOpen) { close(() => setStatsModalData({isOpen: false, title: '', students: []})); return; }
        if (lastRecordModal.isOpen) { close(() => setLastRecordModal({ isOpen: false })); return; }
        if (reportGeneratorModal.isOpen) { close(() => setReportGeneratorModal({isOpen: false, studentId: null})); return; }
        if (studentReportModal.isOpen) { close(() => setStudentReportModal({isOpen: false, student: null, reportContent: '', period: ''})); return; }
        if (supervisorReportGeneratorOpen) { close(() => setSupervisorReportGeneratorOpen(false)); return; }
        if (supervisorReportModal.isOpen) { close(() => setSupervisorReportModal({isOpen: false, reportContent: '', periodLabel: ''})); return; }
        if (savedReportsModalOpen) { close(() => setSavedReportsModalOpen(false)); return; }
        if (showStatsModal) { close(() => setShowStatsModal(false)); return; }
        if (notificationSession) { close(() => setNotificationSession(null)); return; }
        if (reportSession) { close(() => setReportSession(null)); return; }
        if (showStudentForm) { close(() => { setShowStudentForm(false); setEditingStudent(null); }); return; }
        if (viewingTest) { close(() => setViewingTest(null)); return; }
        if (notifyingTest) { close(() => setNotifyingTest(null)); return; }
        if (viewingPlan) { close(() => setViewingPlan(null)); return; }
        if (notifyingPlan) { close(() => setNotifyingPlan(null)); return; }
        if (viewingActivity) { close(() => setViewingActivity(null)); return; }
        if (notifyingActivity) { close(() => setNotifyingActivity(null)); return; }
        if (viewingAnnouncement) { close(() => setViewingAnnouncement(null)); return; }
        if (notifyingAnnouncement) { close(() => setNotifyingAnnouncement(null)); return; }
        
        
        if (selectedStudentId) {
            close(() => setSelectedStudentId(null));
            return;
        }
        
        if (editingSession) {
            handleCloseSessionForm();
            return;
        }

        // 3. Settings Sub-pages
        if (activePage === 'settings' && settingsHistoryRef.current.length > 1) {
            settingsHistoryRef.current.pop();
            const prevSubPage = settingsHistoryRef.current[settingsHistoryRef.current.length-1];
            setActiveSettingsPage(prevSubPage);
            return;
        }

        // 3b. Services Sub-pages
        if (activePage === 'services' && servicesHistoryRef.current.length > 1) {
            servicesHistoryRef.current.pop();
            const prevSubPage = servicesHistoryRef.current[servicesHistoryRef.current.length-1];
            setActiveServicesPage(prevSubPage);
            return;
        }
        
        // 4. Force Back to Home if on main tabs
        if (['students', 'sessions', 'records', 'settings', 'services'].includes(activePage)) {
             handleNavigate('home');
             return;
        }
        
        // 5. Main Page History (Standard behavior)
        if (historyRef.current.length > 1) {
            historyRef.current.pop();
            const prevPage = historyRef.current[historyRef.current.length - 1];
            setActivePage(prevPage);
            return;
        }

        // 6. Home Double-Press Exit
        if (activePage === 'home' && !showExitToast) {
            pushStateSafely(); 
            
            setShowExitToast(true);
            exitToastTimeoutRef.current = window.setTimeout(() => {
                setShowExitToast(false);
                exitToastTimeoutRef.current = null;
            }, 2000);
        } else if (showExitToast) {
            // Exit
        } 

    }, [
        isSubModalOpen, notificationSettingsModalOpen, communityTermsModalState.isOpen, backupRestoreModalOpen, filenamePromptModal.isOpen,
        shareModalData.isOpen, quickSwitchModalOpen, viewingStudentId, showLeaderboard, viewReportModal.isOpen,
        pointsSettingsModalOpen, addonsModalOpen, isTourActive, showWelcomePopup, showNewCircleForm,
        confirmationModal.isOpen, choiceModal.isOpen, alertModal.isOpen, statsModalData.isOpen,
        lastRecordModal.isOpen, reportGeneratorModal.isOpen, studentReportModal.isOpen,
        supervisorReportGeneratorOpen, supervisorReportModal.isOpen, savedReportsModalOpen, showStatsModal,
        notificationSession, reportSession, showStudentForm, viewingTest, notifyingTest, viewingPlan, notifyingPlan,
        viewingActivity, notifyingActivity, viewingAnnouncement, notifyingAnnouncement, selectedStudentId, editingSession, handleCloseSessionForm,
        activePage, activeSettingsPage, activeServicesPage, showExitToast, handleNavigate,
        activePointAdjusterStudentId, activePointsLogStudentId, textBackupModalOpen, textRestoreModalOpen, rewardsManagerOpen,
        shareSessionCodeModal.isOpen, importSessionCodeModalOpen
    ]);


    useEffect(() => {
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [handlePopState]);

    useEffect(() => {
        if (mainContainerRef.current) {
            mainContainerRef.current.scrollTop = 0;
        }
    }, [activePage]);

    const handleUpdateDirectEntry = useCallback((enabled: boolean) => {
        if (!activeCircle) return;
        setActiveCircleData((d: CircleData) => ({ ...d, allowDirectEntry: enabled }));
    }, [activeCircle, setActiveCircleData]);

    const handleUpdateTransferPassword = useCallback((code: string) => {
        if (!activeCircle) return;
        setActiveCircleData((d: CircleData) => ({ ...d, transferPassword: code }));
    }, [activeCircle, setActiveCircleData]);

    const handleUpdateProfile = async (updatedData: Partial<CircleData>) => {
        if (!user) return;
        
        const now = Date.now();
        const updatedCircles = appData.circles.map(c => {
            const isAuthorized = (c.authorizedUserIds || []).includes(user.uid);
            if (!isAuthorized) return c;

            const isItemActive = c.id === appData.activeCircleId;
            const updatedTeachers = { ...(c.teachers || {}) };

            if (user?.uid && updatedTeachers[user.uid]) {
                updatedTeachers[user.uid] = {
                    ...updatedTeachers[user.uid],
                    name: updatedData.teacher || updatedTeachers[user.uid].name,
                    gender: updatedData.teacherGender || updatedTeachers[user.uid].gender,
                    lastUpdated: now
                };
            }

            const wasPrimary = c.teacher === (userProfile?.displayName || '');
            const updates: any = {
                teachers: updatedTeachers,
                lastUpdated: now
            };

            if (isItemActive) {
                Object.assign(updates, updatedData);
            } else if (wasPrimary) {
                if (updatedData.teacher) updates.teacher = updatedData.teacher;
                if (updatedData.teacherGender) updates.teacherGender = updatedData.teacherGender;
            }

            return { ...c, ...updates };
        });

        // 1. Update Local State FIRST (Offline-first)
        setAppData(prev => ({ ...prev, circles: updatedCircles }));
    };
    
    // Handlers for nested modals
    const handleSubModalOpen = useCallback(() => {
        setIsSubModalOpen(true);
        pushStateSafely();
    }, []);

    const handleSubModalClose = useCallback(() => {
        setIsSubModalOpen(false);
    }, []);

    const handleUpdateProfileData = async (name: string, gender: 'male' | 'female') => {
        if (!user || !db) return;
        try {
            const userRef = doc(db, 'users', user.uid);
            const updates = { displayName: name, gender };
            await updateDoc(userRef, updates);
            setUserProfile(prev => prev ? { ...prev, ...updates } : null);
            
            // Propagate changes to all local circles immediately
            setAppData(prev => {
                const now = Date.now();
                return {
                    ...prev,
                    circles: prev.circles.map(c => {
                        const isAuthorized = (c.authorizedUserIds || []).includes(user.uid);
                        if (!isAuthorized) return c;

                        const updatedTeachers = { ...(c.teachers || {}) };
                        if (updatedTeachers[user.uid]) {
                            updatedTeachers[user.uid] = {
                                ...updatedTeachers[user.uid],
                                name: name,
                                gender: gender,
                            };
                        }

                        const wasPrimary = c.teacher === (userProfile?.displayName || '');
                        
                        return {
                            ...c,
                            teachers: updatedTeachers,
                            ...(wasPrimary ? { teacher: name, teacherGender: gender } : {}),
                            lastUpdated: now
                        };
                    })
                };
            });

            addToast('✅ تم إعداد الملف الشخصي بنجاح.');
        } catch (error) {
            console.error("Error updating profile:", error);
            addToast('❌ فشل تحديث الملف الشخصي.', 'error');
        }
    };

    const handleMarkDevNotificationRead = async (notificationId: string) => {
        if (!user || !db || !userProfile) return;
        try {
            const updatedNotifications = (userProfile.notifications || []).map((n: any) => 
                n.id === notificationId ? { ...n, read: true } : n
            );
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, {
                notifications: updatedNotifications
            });
            setUserProfile(prev => prev ? { ...prev, notifications: updatedNotifications } : null);
            addToast('تم تأكيد استلام وقراءة الرسالة بنجاح.', 'success');
        } catch (e) {
            console.error("Error marking dev notification as read:", e);
            addToast('❌ فشل تحديث الإشعار.', 'error');
        }
    };

    const currentActiveDevNotification = useMemo(() => {
        if (!user || !userProfile || devNotifications.length === 0) return null;
        
        const dismissedIds = JSON.parse(localStorage.getItem('dismissed_dev_notifications') || '[]');
        
        // Find first active notification that is not dismissed and applies to the current user
        const eligible = devNotifications.filter(notif => {
            if (!notif.active) return false;
            if (dismissedIds.includes(notif.id)) return false;
            
            // Check targets
            if (!notif.targetType || notif.targetType === 'all') return true;
            
            if (notif.targetType === 'users') {
                return notif.targetUids?.includes(user.uid) || notif.targetUserIds?.includes(user.uid);
            }
            
            if (notif.targetType === 'circles') {
                const userCircleIds = appData.circles.map(c => c.id);
                return notif.targetCircleIds?.some((id: string) => userCircleIds.includes(id));
            }
            
            if (notif.targetType === 'roles') {
                return notif.targetRoles?.includes(userProfile.role);
            }
            
            if (notif.targetType === 'genders') {
                return notif.targetGenders?.includes(userProfile.gender);
            }
            
            return false;
        });
        
        // Sort by date (newest first)
        const sorted = [...eligible].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        return sorted[0] || null;
    }, [user, userProfile, devNotifications, appData.circles]);

    const unreadDevNotification = useMemo(() => {
        return currentActiveDevNotification;
    }, [currentActiveDevNotification]);

    const handleDismissDevNotification = async (notif: any, buttonClicked?: string) => {
        if (!user || !db) return;
        
        const dismissedIds = JSON.parse(localStorage.getItem('dismissed_dev_notifications') || '[]');
        if (!dismissedIds.includes(notif.id)) {
            dismissedIds.push(notif.id);
            localStorage.setItem('dismissed_dev_notifications', JSON.stringify(dismissedIds));
        }

        try {
            const notifRef = doc(db, 'developer_notifications', notif.id);
            const closedUids = notif.stats?.closed || [];
            const viewedUids = notif.stats?.viewed || [];
            
            const updates: any = {};
            if (!closedUids.includes(user.uid)) {
                updates['stats.closed'] = arrayUnion(user.uid);
            }
            if (!viewedUids.includes(user.uid)) {
                updates['stats.viewed'] = arrayUnion(user.uid);
            }
            
            if (buttonClicked) {
                updates[`stats.buttonClicks.${buttonClicked}`] = arrayUnion(user.uid);
            }
            
            if (Object.keys(updates).length > 0) {
                await updateDoc(notifRef, updates);
            }
        } catch (e) {
            console.error("Error updating notification stats:", e);
        }
    };

    const handleDevNotificationButtonAction = (notif: any, btn: any) => {
        handleDismissDevNotification(notif, btn.id);
        
        switch (btn.action) {
            case 'update':
                if (btn.link) {
                    window.open(btn.link, '_blank');
                } else {
                    addToast('جاري تحديث التطبيق...', 'info');
                    window.location.reload();
                }
                break;
            case 'ok':
            case 'cancel':
                break;
            case 'open_page':
                if (btn.page) {
                    handleNavigate(btn.page);
                }
                break;
            case 'external_link':
                if (btn.link) {
                    window.open(btn.link, '_blank');
                }
                break;
            case 'custom':
                addToast(`تم تنفيذ الإجراء: ${btn.text}`, 'success');
                break;
            default:
                break;
        }
    };

    useEffect(() => {
        if (!user || !db || !currentActiveDevNotification) return;
        const notif = currentActiveDevNotification;
        const delivered = notif.stats?.delivered || [];
        const viewed = notif.stats?.viewed || [];
        
        const updates: any = {};
        if (!delivered.includes(user.uid)) {
            updates['stats.delivered'] = arrayUnion(user.uid);
        }
        if (!viewed.includes(user.uid)) {
            updates['stats.viewed'] = arrayUnion(user.uid);
        }
        
        if (Object.keys(updates).length > 0) {
            const notifRef = doc(db, 'developer_notifications', notif.id);
            updateDoc(notifRef, updates).catch(e => console.error("Error setting delivered/viewed:", e));
        }
    }, [user, currentActiveDevNotification, db]);

    // Show loading screen only if specifically requested (like auto-login)
    const isAutoLoggingIn = !!localStorage.getItem('auto_login_creds');
    const isExpectingDeveloper = localStorage.getItem('developer_acting_as_user') === 'true';

    // If we are loading auth, and we don't have local data, we usually show a spinner. 
    // The user wants to avoid the "blue one" at start.
    if ((isAuthLoading || (user && isProfileLoading && !userProfile)) && (isAutoLoggingIn || isExpectingDeveloper)) {
        return (
            <div className="min-h-screen bg-[#050807] flex flex-col items-center justify-center text-white" dir="rtl">
                <div className="w-16 h-16 border-4 border-[#105541]/20 border-t-[#105541] rounded-full animate-spin mb-6"></div>
                <div className="text-sm font-bold font-mono tracking-widest animate-pulse text-[#105541]">جاري تشغيل لوحة التحكم...</div>
            </div>
        );
    }

    // Real-time Account Blocked / Suspended Screen
    if (user && userProfile && userProfile.status === 'blocked' && userProfile.role !== 'developer') {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-[#0c0e12] flex flex-col items-center justify-center p-6 text-center" dir="rtl">
                <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-red-500/5 dark:bg-red-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="w-20 h-20 bg-red-500/10 rounded-2xl flex items-center justify-center mb-6 text-red-500 animate-pulse border border-red-500/20">
                    <AlertTriangle size={40} />
                </div>
                <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white mb-3">حسابك موقوف مؤقتاً</h1>
                
                <div className="bg-white dark:bg-[#151922] border border-slate-100 dark:border-gray-800/80 rounded-[2rem] p-6 max-w-md shadow-xl text-right mb-6">
                    <p className="text-xs font-bold text-red-500 mb-2">🔴 سبب إيقاف الحساب:</p>
                    <p className="text-slate-700 dark:text-gray-300 text-xs md:text-sm leading-relaxed font-semibold">
                        {userProfile.blockedReason || 'لم يتم تحديد سبب للإيقاف من قبل الإدارة.'}
                    </p>
                    <div className="border-t border-slate-100 dark:border-gray-800/50 mt-4 pt-3 flex items-center justify-between text-[10px] text-slate-400">
                        <span>نوع الحساب: {userProfile.role === 'admin' ? 'مدير' : 'معلم حلقة'}</span>
                        <span>معرف المستخدم: {userProfile.uid}</span>
                    </div>
                </div>

                <p className="text-xs text-slate-500 dark:text-gray-400 max-w-xs mb-8 leading-relaxed">
                    إذا كنت تعتقد أن هذا الإيقاف تم بالخطأ، أو تود طلب مراجعة الحساب وتفعيله، يرجى التواصل مباشرة مع المطور.
                </p>

                <div className="flex flex-col gap-2.5 w-full max-w-xs">
                    <a 
                        href={`https://wa.me/967779516077?text=${encodeURIComponent(`السلام عليكم ورحمة الله وبركاته\nحسابي موقوف في نظام حلقتي.\nالاسم: ${userProfile.displayName || ''}\nالبريد: ${userProfile.email || ''}\nالمعرف: ${userProfile.uid}`)}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="w-full flex items-center justify-center gap-2 bg-gradient-to-l from-red-500 to-rose-600 hover:opacity-95 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-red-500/10 hover:shadow-red-500/20 transition-all text-xs"
                    >
                        <span>تواصل مع المطور للمراجعة</span>
                    </a>
                    
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center gap-2 bg-slate-200 dark:bg-[#1d222e] text-slate-700 dark:text-gray-300 font-bold py-3.5 px-4 rounded-xl transition-all text-xs"
                    >
                        <span>تسجيل الخروج</span>
                    </button>
                </div>
            </div>
        );
    }

    // Real-time Maintenance Mode Screen for specific User
    if (user && userProfile && userProfile.maintenanceMode && userProfile.role !== 'developer') {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-[#0c0e12] flex flex-col items-center justify-center p-6 text-center" dir="rtl">
                <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-amber-500/5 dark:bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="w-20 h-20 bg-amber-500/10 rounded-2xl flex items-center justify-center mb-6 text-amber-500 animate-spin border border-amber-500/20" style={{ animationDuration: '6s' }}>
                    <RefreshCw size={40} />
                </div>
                <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white mb-3">حسابك في وضع الصيانة</h1>
                
                <div className="bg-white dark:bg-[#151922] border border-slate-100 dark:border-gray-800/80 rounded-[2rem] p-6 max-w-md shadow-xl text-right mb-6">
                    <p className="text-xs font-bold text-amber-500 mb-2">🛠️ ملاحظة المطور / الصيانة:</p>
                    <p className="text-slate-700 dark:text-gray-300 text-xs md:text-sm leading-relaxed">
                        {userProfile.maintenanceNote || 'يتم حالياً فحص وتحديث بيانات حسابك وحلقتك لتسريع الأداء وتحسين جودة التجربة.'}
                    </p>
                </div>

                <p className="text-xs text-slate-500 dark:text-gray-400 max-w-xs mb-8 leading-relaxed">
                    لا تقلق، جميع حلقاتك ومستويات طلابك آمنة تماماً. هذه الصيانة مخصصة لحسابك وسيتم الانتهاء منها قريباً لتتمكن من المتابعة.
                </p>

                <div className="flex flex-col gap-2.5 w-full max-w-xs">
                    <button
                        onClick={() => window.location.reload()}
                        className="w-full flex items-center justify-center gap-2 bg-[#105541] hover:bg-[#105541]/90 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg transition-all text-xs"
                    >
                        <span>تحديث الصفحة والتحقق من انتهاء الصيانة</span>
                    </button>
                    
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center gap-2 bg-slate-200 dark:bg-[#1d222e] text-slate-700 dark:text-gray-300 font-bold py-3.5 px-4 rounded-xl transition-all text-xs"
                    >
                        <span>تسجيل الخروج</span>
                    </button>
                </div>
            </div>
        );
    }
    
    if (systemSettings.emergencyMode && userProfile?.role !== 'developer' && userProfile?.role !== 'admin') {
        return (
            <div className="min-h-screen bg-[#050807] flex flex-col items-center justify-center p-6 text-center" dir="rtl">
                <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6 text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
                    <AlertTriangle size={40} />
                </div>
                <h1 className="text-xl font-bold text-white mb-3">النظام في وضع الصيانة الطارئة</h1>
                <p className="text-gray-400 text-sm max-w-xs leading-relaxed mb-8">
                    {systemSettings.emergencyMessage || 'عذراً، النظام غير متاح حالياً لوجود أعمال صيانة طارئة. يرجى العودة لاحقاً.'}
                </p>
                <div className="text-[10px] text-[#105541] font-mono uppercase tracking-widest font-bold">
                    محمي بواسطة نظام المخلافي
                </div>
            </div>
        );
    }
    
    if (user && userProfile && (!userProfile.displayName || !userProfile.gender)) {
        // Fallback or handle missing profile data gracefully without blocking
        // We handle this in the auth listener now by providing defaults.
    }

    const isPromptPending = typeof window !== 'undefined' && authTriggerCounter >= 0 && (
        localStorage.getItem('auth_saving_prompt_pending') === 'true' || 
        localStorage.getItem('auth_loading_in_progress') === 'true'
    );

    if (!user || isPromptPending) {
        return (
            <>
                <AuthScreen 
                    onLoginSuccess={() => {
                        setAuthTriggerCounter(prev => prev + 1);
                        if (auth?.currentUser) {
                            setUser(auth.currentUser);
                            setIsInitialSyncComplete(appData.circles.length > 0);
                            setActivePage('home');
                        }
                    }} 
                    addToast={addToast} 
                    systemSettings={systemSettings}
                    isOnline={isOnline}
                />
                <ToastContainer toasts={toasts} />
            </>
        );
    }

    if (user && !user.emailVerified && user.email && !user.email.endsWith('@quran.app')) {
        return (
            <>
                <VerificationScreen 
                    email={user.email} 
                    onVerified={async () => {
                        if (auth?.currentUser) {
                            await auth.currentUser.reload();
                            setUser({...auth.currentUser});
                        }
                    }}
                    addToast={addToast}
                />
                <ToastContainer toasts={toasts} />
            </>
        );
    }

    // Show sync loading screen for logged in users with no local data yet (fresh login)
    if (user && !isInitialSyncComplete && appData.circles.length === 0) {
        return (
            <>
                <SyncLoadingScreen 
                    onLogout={handleLogout} 
                    onContinueOffline={() => {
                        console.warn("User bypassed cloud sync, continuing offline.");
                        setIsInitialSyncComplete(true);
                    }} 
                />
                <ToastContainer toasts={toasts} />
            </>
        );
    }

    if (userProfile && userProfile.role === 'developer') {
        return (
            <>
                <DeveloperDashboard 
                    userProfile={userProfile} 
                    addToast={addToast} 
                    onLogout={handleLogout} 
                />
                <AnimatePresence>
                    {confirmationModal.isOpen && <ConfirmationModal key="dev-modal-confirmation" {...confirmationModal} onCancel={() => {
                        if (confirmationModal.onCancel) {
                            try { confirmationModal.onCancel(); } catch (e) { console.error(e); }
                        }
                        setConfirmationModal({ isOpen: false, title: '', message: '', onConfirm: () => {} });
                    }} />}
                    {alertModal.isOpen && <AlertModal key="dev-modal-alert" {...alertModal} onClose={() => setAlertModal(d => ({...d, isOpen: false}))} />}
                </AnimatePresence>
                <ToastContainer toasts={toasts} />
            </>
        );
    }

    if (isAdminMode && userProfile && (userProfile.role === 'admin' || userProfile.role === 'superadmin')) {
        return (
            <>
                <AdminApp 
                    onLogout={handleLogout} 
                    onSwitchToTeacher={() => setIsAdminMode(false)}
                    centerName={userProfile.managementId || 'المركز الرئيسي'} 
                />
                <ToastContainer toasts={toasts} />
            </>
        );
    }

    if (userProfile && (userProfile.isManagementAdmin || userProfile.role === 'manager') && userProfile.managementId) {
        return (
            <>
                <ManagementDashboard 
                    managementId={userProfile.managementId}
                    userProfile={userProfile}
                    addToast={addToast}
                    onLogout={handleLogout}
                />
                <ToastContainer toasts={toasts} />
            </>
        );
    }

    // Removed the blocking isInitialSyncComplete check to allow immediate access to local data

    if (appData.circles.length === 0 && !showNewCircleForm) {
        return (
            <>
                <Setup onSave={handleSaveSetup} onImport={handleImportCircle} onFetchPreview={fetchCirclePreview} isNewCircle={false} isImporting={isImportingCircle} onLogout={handleLogout} userProfile={userProfile} />
                <ToastContainer toasts={toasts} />
            </>
        );
    }

    if (isInitialising) {
        return (
            <>
                <Setup onSave={handleSaveSetup} onImport={handleImportCircle} onFetchPreview={fetchCirclePreview} isNewCircle={false} isImporting={isImportingCircle} onLogout={handleLogout} userProfile={userProfile} />
                <ToastContainer toasts={toasts} />
            </>
        );
    }

    if (showNewCircleForm) {
        return (
            <>
                <Setup onSave={handleSaveSetup} onImport={handleImportCircle} onFetchPreview={fetchCirclePreview} isNewCircle={true} isImporting={isImportingCircle} onBack={() => setShowNewCircleForm(false)} onLogout={handleLogout} userProfile={userProfile} />
                <ToastContainer toasts={toasts} />
            </>
        );
    }

    if (!activeCircle) {
        // Fallback if somehow we have circles but no active one selected
        return (
            <div className="h-full flex flex-col items-center justify-center bg-gray-50 text-center p-6">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                <ToastContainer toasts={toasts} />
            </div>
        );
    }
    
    const handleMarkJoinRequestHandled = (notificationId: string) => {
        if (!activeCircle) return;
        
        const updatedNotifications = (activeCircle.notifications || []).filter(n => n.id !== notificationId);
        const dismissedIds = [...(activeCircle.dismissedNotificationIds || []), notificationId];
        
        setActiveCircleData(d => ({
            ...d,
            notifications: updatedNotifications,
            dismissedNotificationIds: dismissedIds
        }));
    };

    const handleUpdateSupervisor = async (supervisorUid: string, updates: any) => {
        if (!user || !activeCircle) return;
        
        const notificationId = updates.notificationId;
        delete updates.notificationId;
        
        // Security check: Only owner or someone with full access can manage others
        const isOwner = activeCircle.ownerId === user.uid;
        const hasFullAccess = activeCircle.teachers?.[user.uid]?.accessLevel === 'full';
        
        if (!isOwner && !hasFullAccess) {
            addToast('عذرًا، لا تملك الصلاحية لإدارة المعلمين', 'error');
            return;
        }

        // Prevent self-management (e.g. suspending yourself)
        if (supervisorUid === user.uid && updates.status === 'suspended') {
            addToast('لا يمكنك إيقاف صلاحياتك الخاصة', 'error');
            return;
        }

        // Prevent deleting the owner
        const isTargetOwner = supervisorUid === activeCircle.ownerId || activeCircle.teachers?.[supervisorUid]?.role === 'owner';
        if (isTargetOwner && (updates as any).isDeleteAction) {
            addToast('لا يمكن حذف منشئ الحلقة أو المالك', 'error');
            return;
        }

        // Prevent suspending an owner
        if (isTargetOwner && updates.status === 'suspended') {
            addToast('لا يمكن إيقاف صلاحيات المنشئ أو المالك', 'error');
            return;
        }

        // If giving full access to a teacher, set their role to teacher
        if (updates.accessLevel === 'full') {
            updates.role = 'teacher';
            updates.permissions = defaultMemberPermissions.teacher;
        }

        let newOwnerId = activeCircle.ownerId;
        const isTransfer = (updates as any).isTransferOwnership;
        const isCopy = (updates as any).isCopyOwnership;

        const oldStatus = activeCircle.teachers?.[supervisorUid]?.status;
        
        let updatedTeachers = {
            ...(activeCircle.teachers || {}),
        };

        if (isTransfer) {
            newOwnerId = supervisorUid;
            updates.role = 'owner';
            updates.accessLevel = 'full';
            updates.permissions = defaultMemberPermissions.teacher; // Full permissions
            
            // Revert old owner to teacher if they were owner
            const oldOwnerId = activeCircle.ownerId;
            if (oldOwnerId && updatedTeachers[oldOwnerId]) {
                updatedTeachers[oldOwnerId] = {
                    ...updatedTeachers[oldOwnerId],
                    role: 'teacher',
                    accessLevel: 'full'
                };
            }
        } else if (isCopy) {
            updates.role = 'owner';
            updates.accessLevel = 'full';
            updates.permissions = defaultMemberPermissions.teacher;
        }

        if ((updates as any).isDeleteAction) {
            delete updatedTeachers[supervisorUid];
        } else {
            const existing = activeCircle.teachers?.[supervisorUid];
            if (!existing) return;
            
            updatedTeachers[supervisorUid] = {
                ...existing,
                ...updates,
                lastUpdated: Date.now()
            } as TeacherPermissions;
        }

        let updatedAuthorizedIds = [...(activeCircle.authorizedUserIds || [])];
        if ((updates as any).isDeleteAction) {
            updatedAuthorizedIds = updatedAuthorizedIds.filter(id => id !== supervisorUid);
        } else if (updates.status === 'active' && oldStatus === 'pending') {
            if (!updatedAuthorizedIds.includes(supervisorUid)) {
                updatedAuthorizedIds.push(supervisorUid);
            }
        }

        let notifications = activeCircle.notifications || [];
        const teacherName = activeCircle.teachers?.[supervisorUid]?.name || 'المعلم';

        if ((updates as any).isDeleteAction) {
            delete updatedTeachers[supervisorUid];
            updatedAuthorizedIds = updatedAuthorizedIds.filter(id => id !== supervisorUid);
            
            const removeNotif: Notification = {
                id: `removed_${supervisorUid}_${Date.now()}`,
                type: 'warning',
                category: 'system',
                message: `تمت إزالة المعلم (${teacherName}) من إدارة الحلقة بواسطة المشرف.`,
                createdAt: Date.now()
            };
            notifications = [removeNotif, ...notifications];

            // Mark as rejected in notification metadata
            notifications = notifications.map(n => {
                if (n.metadata?.uid === supervisorUid && n.metadata?.actionType === 'join_request' && !n.metadata.handledBy) {
                    return {
                        ...n,
                        metadata: {
                            ...n.metadata,
                            handledBy: {
                                uid: user?.uid || '',
                                name: userProfile?.displayName || 'مشرف',
                                action: 'rejected' as const,
                                at: Date.now()
                            }
                        }
                    };
                }
                return n;
            });
        } else if (oldStatus === 'pending' && updates.status === 'active') {
            // Mark as approved in notification metadata
            notifications = notifications.map(n => {
                if (n.metadata?.uid === supervisorUid && n.metadata?.actionType === 'join_request' && !n.metadata.handledBy) {
                    return {
                        ...n,
                        metadata: {
                            ...n.metadata,
                            handledBy: {
                                uid: user?.uid || '',
                                name: userProfile?.displayName || 'مشرف',
                                action: 'approved' as const,
                                at: Date.now()
                            }
                        }
                    };
                }
                return n;
            });
            
            const approvalNotif: Notification = {
                id: `approved_${supervisorUid}_${Date.now()}`,
                type: 'success',
                message: `تمت الموافقة على انضمام المعلم (${teacherName}) كمعلم معتمد في الحلقة. مرحباً بك!`,
                createdAt: Date.now()
            };
            notifications = [approvalNotif, ...notifications];
        } else if (oldStatus === 'pending' && updates.status === 'rejected') {
            // Mark as rejected in notification metadata
            notifications = notifications.map(n => {
                if (n.metadata?.uid === supervisorUid && n.metadata?.actionType === 'join_request' && !n.metadata.handledBy) {
                    return {
                        ...n,
                        metadata: {
                            ...n.metadata,
                            handledBy: {
                                uid: user?.uid || '',
                                name: userProfile?.displayName || 'مشرف',
                                action: 'rejected' as const,
                                at: Date.now()
                            }
                        }
                    };
                }
                return n;
            });
            
            const rejectionNotif: Notification = {
                id: `rejected_${supervisorUid}_${Date.now()}`,
                type: 'warning',
                message: `تم رفض طلب انضمام المعلم (${teacherName}) إلى الحلقة.${updates.rejectionReason ? ` السبب: ${updates.rejectionReason}` : ''}`,
                createdAt: Date.now()
            };
            notifications = [rejectionNotif, ...notifications];
        } else if (updates.accessLevel && updates.accessLevel !== activeCircle.teachers?.[supervisorUid]?.accessLevel) {
            const levelNotif: Notification = {
                id: `level_${supervisorUid}_${Date.now()}`,
                type: 'info',
                category: 'system',
                message: `تم تغيير مستوى صلاحيات المعلم (${teacherName}) إلى: ${updates.accessLevel === 'full' ? 'صلاحيات كاملة' : 'صلاحيات قياسية'}.`,
                createdAt: Date.now()
            };
            notifications = [levelNotif, ...notifications];
        } else if (updates.status && updates.status !== oldStatus) {
            const statusNotif: Notification = {
                id: `status_${supervisorUid}_${Date.now()}`,
                type: updates.status === 'active' ? 'success' : 'warning',
                category: 'system',
                message: `تم ${updates.status === 'active' ? 'تنشيط' : 'إيقاف'} حساب المعلم (${teacherName}) في الحلقة.`,
                createdAt: Date.now()
            };
            notifications = [statusNotif, ...notifications];
        }

        // 2. Update Local State
        setActiveCircleData(d => ({
            ...d,
            ownerId: newOwnerId,
            teachers: updatedTeachers,
            authorizedUserIds: updatedAuthorizedIds,
            notifications: notifications,
            lastUpdated: Date.now()
        }));

        if (isTransfer) {
            addToast('تم نقل ملكية الحلقة بنجاح', 'success');
        } else if (isCopy) {
            addToast('تم منح صلاحية المالك الثاني بنجاح', 'success');
        } else {
            addToast('تم تحديث بيانات المعلم بنجاح', 'success');
        }
    };

    const handleMarkNotificationsAsRead = (ids: string[]) => {
        if (!user || !activeCircle) return;
        
        const updatedNotifications = (activeCircle.notifications || []).map(n => {
            if (ids.includes(n.id)) {
                const readBy = [...(n.readBy || [])];
                if (!readBy.includes(user.uid)) {
                    readBy.push(user.uid);
                }
                return { ...n, readBy };
            }
            return n;
        });

        setActiveCircleData(d => ({ ...d, notifications: updatedNotifications }));
    };
    
    const handleAddNotification = (notification: Notification) => {
        if (!activeCircle) return;
        const notifications = [notification, ...(activeCircle.notifications || [])];
        setActiveCircleData(d => ({ ...d, notifications }));
        addToast('✅ تم إرسال التنبيه بنجاح.', 'success');
    };

    const pointsLogStudent = activeCircle ? activeCircle.students?.find(s => s.id === activePointsLogStudentId) : undefined;
    const pointAdjusterStudent = activeCircle ? activeCircle.students?.find(s => s.id === activePointAdjusterStudentId) : undefined;


    const handleCancelJoinRequest = async () => {
        if (!user || !activeCircle) return;
        
        try {
            const updatedTeachers = { ...(activeCircle.teachers || {}) };
            delete updatedTeachers[user.uid];
            const updatedAuthorizedIds = (activeCircle.authorizedUserIds || []).filter(id => id !== user.uid);
            
            // 1. Update Firestore
            await updateDoc(doc(db, 'circles', activeCircle.id), {
                teachers: updatedTeachers,
                authorizedUserIds: updatedAuthorizedIds,
                lastUpdated: Date.now()
            });
            
            // 2. Update Local State
            setAppData(prev => {
                const newCircles = prev.circles.filter(c => c.id !== activeCircle.id);
                return {
                    ...prev,
                    circles: newCircles,
                    activeCircleId: newCircles.length > 0 ? newCircles[0].id : null
                };
            });
            
            addToast('تم إلغاء طلب الانضمام بنجاح', 'info');
        } catch (error) {
            console.error("Cancel request failed:", error);
            addToast('فشل في إلغاء الطلب. يرجى المحاولة لاحقاً.', 'error');
        }
    };

    // Check if current user is suspended or pending
    const userTeacherData = user && activeCircle ? activeCircle.teachers?.[user.uid] : null;
    const isSuspended = userTeacherData?.status === 'suspended';
    const isPending = userTeacherData?.status === 'pending';
    const isRejected = userTeacherData?.status === 'rejected';

    const isOwner = activeCircle && user ? activeCircle.ownerId === user.uid : false;
    const teacher = activeCircle && user ? activeCircle.teachers?.[user.uid] : null;
    const isFullAccess = teacher?.accessLevel === 'full';
    const hasFullManagement = isOwner || isFullAccess;

    const mainContent = (
        <>
            {activeCircle && activeCircle.status === 'inactive' && userProfile?.role !== 'developer' ? (
                <div className="flex flex-col items-center justify-center py-12 px-6 text-center bg-white dark:bg-gray-900/50 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm mt-8" dir="rtl">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="max-w-xs space-y-6"
                    >
                        <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-3xl flex items-center justify-center mx-auto border border-red-500/20">
                            <FaTimes size={32} />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">تم تعطيل هذه الحلقة</h2>
                            <p className="text-gray-500 dark:text-gray-400 text-xs md:text-sm leading-relaxed">
                                {activeCircle.suspendedByTeacherUid ? (
                                    <>
                                        تم تعطيل هذه الحلقة تلقائياً من قبل النظام بسبب إيقاف حساب أحد المشرفين المسؤولين عن هذه الحلقة.
                                        {activeCircle.suspendedByTeacherReason && (
                                            <div className="mt-3 text-[11px] text-red-500 font-bold bg-red-500/5 dark:bg-red-500/10 p-3 rounded-2xl border border-red-500/15 text-right">
                                                <p className="font-extrabold mb-1 text-xs">⚠️ سبب إيقاف المشرف:</p>
                                                <p className="font-medium text-gray-600 dark:text-gray-300">{activeCircle.suspendedByTeacherReason}</p>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    "نعتذر، لقد تم تعطيل هذه الحلقة من قبل المطور الرئيسي. لا يمكن إعادة تفعيلها إلا بواسطة المطورين. يمكنك الانتظار ومراسلة المطور للاستفسار أو التفعيل، أو الانتقال لحلقات أخرى."
                                )}
                            </p>
                        </div>
                        <div className="pt-4 space-y-3">
                            <a 
                                href={`mailto:nova.kayanco@gmail.com?subject=طلب تفعيل حلقة: ${encodeURIComponent(activeCircle.circle || '')}&body=السلام عليكم، أرجو النظر في تفعيل الحلقة الخاصة بي: ${encodeURIComponent(activeCircle.circle || '')}.`}
                                className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white px-8 py-3 rounded-2xl font-bold text-sm shadow-xl shadow-emerald-600/10 hover:bg-emerald-700 active:scale-95 transition-all outline-none"
                            >
                                مراسلة المطور للتفعيل ✉️
                            </a>
                            {appData.circles.length > 1 && (
                                <button 
                                    onClick={handleQuickSwitch}
                                    className="w-full bg-primary text-white px-8 py-3 rounded-2xl font-bold text-sm shadow-xl shadow-primary/10 active:scale-95 transition-all outline-none"
                                >
                                    الانتقال لحلقة أخرى
                                </button>
                            )}
                            <button 
                                onClick={handleLogout}
                                className="w-full bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 px-8 py-3 rounded-2xl font-bold text-sm hover:bg-gray-200 dark:hover:bg-white/10 active:scale-95 transition-all outline-none"
                            >
                                تسجيل الخروج
                            </button>
                        </div>
                    </motion.div>
                </div>
            ) : activeCircle && activeCircle.isStopped && userProfile?.role !== 'developer' ? (
                <div className="flex flex-col items-center justify-center py-12 px-6 text-center bg-white dark:bg-gray-900/50 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm mt-8" dir="rtl">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="max-w-xs space-y-6"
                    >
                        <div className="w-20 h-20 bg-amber-500/10 text-amber-500 rounded-3xl flex items-center justify-center mx-auto border border-amber-500/20">
                            <FaExclamationTriangle size={32} />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">الحلقة موقوفة مؤقتاً</h2>
                            <p className="text-gray-500 dark:text-gray-400 text-xs md:text-sm leading-relaxed">
                                {activeCircle.suspendedByTeacherUid ? (
                                    <>
                                        تم إيقاف نشاط هذه الحلقة تلقائياً بسبب إيقاف حساب أحد المشرفين المسؤولين عنها من قبل المطور.
                                        {activeCircle.suspendedByTeacherReason && (
                                            <div className="mt-3 text-[11px] text-amber-600 dark:text-amber-400 font-bold bg-amber-500/5 dark:bg-amber-500/10 p-3 rounded-2xl border border-amber-500/15 text-right">
                                                <p className="font-extrabold mb-1 text-xs">⚠️ سبب إيقاف المشرف:</p>
                                                <p className="font-medium text-gray-600 dark:text-gray-300">{activeCircle.suspendedByTeacherReason}</p>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    "نعتذر، لقد تم إيقاف نشاط هذه الحلقة من قبل المطور الرئيسي. لا يمكن إعادة تشغيلها إلا من قبل المطورين. يمكنك الانتظار ومراسلة المطور لتشغيلها، أو الانتقال لحلقة أخرى."
                                )}
                            </p>
                        </div>
                        <div className="pt-4 space-y-3">
                            <a 
                                href={`mailto:nova.kayanco@gmail.com?subject=طلب تشغيل حلقة موقوفة: ${encodeURIComponent(activeCircle.circle || '')}&body=السلام عليكم، أرجو النظر في إعادة تشغيل الحلقة الموقوفة: ${encodeURIComponent(activeCircle.circle || '')}.`}
                                className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white px-8 py-3 rounded-2xl font-bold text-sm shadow-xl shadow-emerald-600/10 hover:bg-emerald-700 active:scale-95 transition-all outline-none"
                            >
                                مراسلة المطور للتشغيل ✉️
                            </a>
                            {appData.circles.length > 1 && (
                                <button 
                                    onClick={handleQuickSwitch}
                                    className="w-full bg-primary text-white px-8 py-3 rounded-2xl font-bold text-sm shadow-xl shadow-primary/10 active:scale-95 transition-all outline-none"
                                >
                                    الانتقال لحلقة أخرى
                                </button>
                            )}
                            <button 
                                onClick={handleLogout}
                                className="w-full bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 px-8 py-3 rounded-2xl font-bold text-sm hover:bg-gray-200 dark:hover:bg-white/10 active:scale-95 transition-all outline-none"
                            >
                                تسجيل الخروج
                            </button>
                        </div>
                    </motion.div>
                </div>
            ) : activeCircle && activeCircle.isMaintenance && userProfile?.role !== 'developer' ? (
                <div className="flex flex-col items-center justify-center py-12 px-6 text-center bg-white dark:bg-gray-900/50 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm mt-8" dir="rtl">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="max-w-xs space-y-6"
                    >
                        <div className="w-20 h-20 bg-[#105541]/10 text-[#105541] rounded-3xl flex items-center justify-center mx-auto border border-[#105541]/20">
                            <FaSync className="animate-spin text-emerald-600 dark:text-emerald-400" size={32} />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">الحلقة تحت الصيانة حالياً</h2>
                            <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
                                يقوم المطور <strong className="text-emerald-600 dark:text-emerald-400">عبدالله مبارك المخلافي</strong> بعمل صيانة دورية لقواعد بيانات الحلقة حالياً لتسريع استجابة النظام وتحديث المزايا. يرجى العودة لاحقاً.
                            </p>
                        </div>
                        <div className="pt-4 space-y-3">
                            {appData.circles.length > 1 && (
                                <button 
                                    onClick={handleQuickSwitch}
                                    className="w-full bg-primary text-white px-8 py-3 rounded-2xl font-bold text-sm shadow-xl shadow-primary/10 active:scale-95 transition-all outline-none"
                                >
                                    الانتقال لحلقة أخرى
                                </button>
                            )}
                            <button 
                                onClick={handleLogout}
                                className="w-full bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 px-8 py-3 rounded-2xl font-bold text-sm hover:bg-gray-200 dark:hover:bg-white/10 active:scale-95 transition-all outline-none"
                            >
                                تسجيل الخروج
                            </button>
                        </div>
                    </motion.div>
                </div>
            ) : isSuspended ? (
                <div className="flex flex-col items-center justify-center py-12 px-6 text-center bg-white dark:bg-gray-900/50 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm mt-8">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="max-w-xs space-y-6"
                    >
                        <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-3xl flex items-center justify-center mx-auto border border-red-500/20">
                            <FaKey size={32} />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">حسابك موقوف مؤقتاً</h2>
                            <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
                                نعتذر، لقد تم إيقاف صلاحية دخولك لهذه الحلقة من قبل المالك. يرجى مراجعة مالك الحلقة للمزيد من التفاصيل.
                            </p>
                        </div>
                        <div className="pt-4 space-y-3">
                            {appData.circles.length > 1 && (
                                <button 
                                    onClick={handleQuickSwitch}
                                    className="w-full bg-primary text-white px-8 py-3 rounded-2xl font-bold text-sm shadow-xl shadow-primary/10 active:scale-95 transition-all outline-none"
                                >
                                    الانتقال لحلقة أخرى
                                </button>
                            )}
                            <button 
                                onClick={handleLogout}
                                className="w-full bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 px-8 py-3 rounded-2xl font-bold text-sm hover:bg-gray-200 dark:hover:bg-white/10 active:scale-95 transition-all outline-none"
                            >
                                تسجيل الخروج
                            </button>
                        </div>
                    </motion.div>
                </div>
            ) : isRejected ? (
                <div className="flex flex-col items-center justify-center py-12 px-6 text-center bg-white dark:bg-gray-900/50 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm mt-8">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="max-w-xs space-y-6"
                    >
                        <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-3xl flex items-center justify-center mx-auto border border-red-500/20">
                            <FaTimes size={32} />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">تم رفض طلب انضمامك</h2>
                            <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
                                نعتذر، لقد تم رفض طلب انضمامك إلى هذه الحلقة من قبل المشرفين.
                            </p>
                            {userTeacherData?.rejectionReason && (
                                <div className="p-3 bg-red-50 dark:bg-red-500/5 rounded-xl border border-red-100 dark:border-red-500/10 text-xs text-red-600 dark:text-red-400 mt-2 font-medium">
                                    السبب: {userTeacherData.rejectionReason}
                                </div>
                            )}
                        </div>
                        <div className="pt-4 space-y-3">
                            {appData.circles.length > 1 && (
                                <button 
                                    onClick={handleQuickSwitch}
                                    className="w-full bg-primary text-white px-8 py-3 rounded-2xl font-bold text-sm shadow-xl shadow-primary/10 active:scale-95 transition-all outline-none mb-3"
                                >
                                    الانتقال لحلقة أخرى
                                </button>
                            )}
                            <button 
                                onClick={handleCancelJoinRequest}
                                className="w-full bg-red-600 text-white px-8 py-3 rounded-2xl font-bold text-sm hover:bg-red-700 active:scale-95 transition-all outline-none"
                            >
                                حذف الحلقة والمحاولة مجدداً
                            </button>
                            <button 
                                onClick={handleLogout}
                                className="w-full bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 px-8 py-3 rounded-2xl font-bold text-sm hover:bg-gray-200 dark:hover:bg-white/10 active:scale-95 transition-all outline-none"
                            >
                                تسجيل الخروج
                            </button>
                        </div>
                    </motion.div>
                </div>
            ) : isPending ? (
                <div className="flex flex-col items-center justify-center py-12 px-6 text-center bg-white dark:bg-gray-900/50 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm mt-8">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="max-w-xs space-y-6"
                    >
                        <div className="w-20 h-20 bg-primary/10 text-primary rounded-3xl flex items-center justify-center mx-auto border border-primary/20">
                            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">في انتظار الموافقة</h2>
                            <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
                                تم إرسال طلب انضمامك بنجاح. يرجى الانتظار حتى يقوم أحد مشرفي أو منشئ الحلقة بالموافقة على طلبك.
                            </p>
                        </div>
                        <div className="pt-4 space-y-3">
                            {appData.circles.length > 1 && (
                                <button 
                                    onClick={handleQuickSwitch}
                                    className="w-full bg-primary text-white px-8 py-3 rounded-2xl font-bold text-sm shadow-xl shadow-primary/10 active:scale-95 transition-all outline-none mb-3"
                                >
                                    الانتقال لحلقة أخرى
                                </button>
                            )}
                            
                            <button 
                                onClick={handleCancelJoinRequest}
                                className="w-full bg-red-500/10 text-red-500 px-8 py-3 rounded-2xl font-bold text-sm hover:bg-red-500/20 active:scale-95 transition-all outline-none"
                            >
                                إلغاء طلب الانضمام
                            </button>

                            <button 
                                onClick={handleLogout}
                                className="w-full bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 px-8 py-3 rounded-2xl font-bold text-sm hover:bg-gray-200 dark:hover:bg-white/10 active:scale-95 transition-all outline-none"
                            >
                                تسجيل الخروج
                            </button>
                        </div>
                    </motion.div>
                </div>
            ) : (
                <>
                {activePage === 'syncDiagnostics' && (
                    <SyncDiagnostics 
                        syncQueue={syncQueue}
                        isWorkerActive={isWorkerActive}
                        currentlyUploadingItem={currentlyUploadingItem}
                        syncEvents={syncEvents}
                        realTimeReceivedCount={realTimeReceivedCount}
                        lastSyncTimestamp={lastSyncTimestamp}
                        totalSynced={totalSynced}
                        failedJobs={failedJobs}
                        onBack={() => handleNavigate('home')}
                        onManualSync={handleManualSync}
                        onRetryJob={handleRetryJob}
                        activeCircle={activeCircle}
                    />
                )}
                {activePage === 'circleInfo' && (
                    <CircleInfo 
                        data={activeCircle} 
                        onBack={() => setActivePage('settings')} 
                        onEdit={() => {
                            setProfileMode('circle');
                            setActivePage('settings');
                            navigateWithinSettings('profile');
                        }}
                        onUpdateCode={handleUpdateTransferPassword}
                        onUpdateSupervisor={handleUpdateSupervisor}
                        onUpdateDirectEntry={handleUpdateDirectEntry}
                        currentUserId={user?.uid || ''}
                        addToast={addToast} 
                        setConfirmationModal={setConfirmationModal}
                    />
                )}
                {activePage === 'notifications' && activeCircle && (
                    <NotificationsPage
                        data={activeCircle}
                        onBack={() => setActivePage('home')}
                        onDeleteNotification={(id) => setActiveCircleData(d => ({...d, notifications: (d.notifications || []).filter(n => n.id !== id), dismissedNotificationIds: [...(d.dismissedNotificationIds || []), id]}))}
                        onMarkAsRead={handleMarkNotificationsAsRead}
                        onUpdateSupervisor={handleUpdateSupervisor}
                        onMarkJoinRequestHandled={handleMarkJoinRequestHandled}
                        onAddNotification={handleAddNotification}
                        currentUserId={user?.uid || ''}
                    />
                )}
                {activePage === 'home' && <Home key="home-page" data={{...activeCircle, students: activeCircleStudents}} onNavigate={handleNavigate} onDeleteNotification={(id) => setActiveCircleData(d => ({...d, notifications: (d.notifications || []).filter(n => n.id !== id), dismissedNotificationIds: [...(d.dismissedNotificationIds || []), id]}))} onStatClick={(title, students, suspendedStudents) => { setStatsModalData({isOpen: true, title, students, suspendedStudents}); pushStateSafely(); }} onOpenStats={() => { setShowStatsModal(true); pushStateSafely(); }} setData={setActiveCircleData} onAutoDismissNotification={handleAutoDismissNotification} addToast={addToast} onViewProfile={handleViewStudentProfile} onUpdateSupervisor={handleUpdateSupervisor} setConfirmationModal={setConfirmationModal} />}
                {activePage === 'students' && <Students key="students-page" students={activeCircleStudents} onAdd={() => { setEditingStudent(null); setShowStudentForm(true); pushStateSafely(); }} onEdit={(s) => { setEditingStudent(s); setShowStudentForm(true); pushStateSafely(); }} onDelete={handleDeleteStudent} onReorder={handleReorderStudents} onViewProfile={handleViewStudentProfile} />}
                {activePage === 'sessions' && <Sessions key="sessions-page" sessions={activeCircle.sessions} draftSession={activeCircle.draftSession} onNew={handleNewSession} onEdit={(id) => {handleEditSession(id); handleNavigate('sessions');}} onDelete={handleDeleteSession} onReport={(s) => { setReportSession(s); pushStateSafely(); }} onNotify={(s) => { setNotificationSession(s); pushStateSafely(); }} addToast={addToast} onShareSessionCode={(session) => {setShareSessionCodeModal({isOpen: true, session}); pushStateSafely();}} onImportSessionCode={() => {setImportSessionCodeModalOpen(true); pushStateSafely();}} currentUserUid={user?.uid} />}
                {activePage === 'records' && <Records key="records-page" students={activeCircleStudents} sessions={activeCircle.sessions} studentReports={activeCircle.studentReports || []} onOpenReportGenerator={(id) => {handleOpenReportGenerator(id); pushStateSafely()}} onShowReport={(studentId, content, period) => {setStudentReportModal({isOpen: true, student: activeCircle.students.find(s=>s.id === studentId) || null, reportContent: content, period}); pushStateSafely();}} onViewSavedReport={(report) => {setViewReportModal({isOpen: true, report, type: 'student'}); pushStateSafely();}} selectedStudentId={selectedStudentId} setSelectedStudentId={(id) => {setSelectedStudentId(id); if (id) pushStateSafely();}} addToast={addToast} onDeleteSavedReport={(id) => handleDeleteReport(id, 'student')} />}
                {activePage === 'services' && activeCircle && (
                    <div key="services-page">
                        {activeServicesPage === 'main' && (
                            <Services 
                                onNavigate={(subPage) => {
                                    if (subPage === 'records') {
                                        navigateWithinServices('records');
                                    } else if (subPage === 'reports') {
                                        handleNavigate('reports');
                                    } else {
                                        navigateWithinServices(subPage);
                                    }
                                }} 
                                hasFullManagement={hasFullManagement} 
                            />
                        )}
                        {activeServicesPage === 'records' && (
                            <Records 
                                key="services-records-page"
                                students={activeCircleStudents} 
                                sessions={activeCircle.sessions} 
                                studentReports={activeCircle.studentReports || []} 
                                onOpenReportGenerator={(id) => {handleOpenReportGenerator(id); pushStateSafely()}} 
                                onShowReport={(studentId, content, period) => {setStudentReportModal({isOpen: true, student: activeCircle.students.find(s=>s.id === studentId) || null, reportContent: content, period}); pushStateSafely();}} 
                                onViewSavedReport={(report) => {setViewReportModal({isOpen: true, report, type: 'student'}); pushStateSafely();}} 
                                selectedStudentId={selectedStudentId} 
                                setSelectedStudentId={(id) => {setSelectedStudentId(id); if (id) pushStateSafely();}} 
                                addToast={addToast} 
                                onDeleteSavedReport={(id) => handleDeleteReport(id, 'student')} 
                                onBack={() => { 
                                    servicesHistoryRef.current.pop(); 
                                    setActiveServicesPage(servicesHistoryRef.current[servicesHistoryRef.current.length-1]); 
                                }}
                            />
                        )}
                        {activeServicesPage === 'parentFollowUp' && (
                            <ParentFollowUp 
                                students={activeCircleStudents} 
                                sessions={activeCircle.sessions} 
                                circleData={activeCircle} 
                                onBack={() => { 
                                    servicesHistoryRef.current.pop(); 
                                    setActiveServicesPage(servicesHistoryRef.current[servicesHistoryRef.current.length-1]); 
                                }} 
                                onUpdateStudent={handleUpdateStudent} 
                                onUpdateSettings={handleUpdateSettings} 
                                addToast={addToast} 
                            />
                        )}
                        {activeServicesPage === 'tests' && (
                            <Tests 
                                tests={activeCircle.tests || []} 
                                isDraft={!!activeCircle.draftTest} 
                                onBack={() => { 
                                    servicesHistoryRef.current.pop(); 
                                    setActiveServicesPage(servicesHistoryRef.current[servicesHistoryRef.current.length-1]); 
                                }} 
                                onNew={() => { 
                                    if (activeCircleStudents.length === 0) {
                                        setAlertModal({ isOpen: true, title: 'تنبيه', message: 'عذرًا، لا يمكن إنشاء اختبار جديد لعدم وجود طلاب في الحلقة. يرجى إضافة طلاب أولاً.' });
                                        return;
                                    }
                                    const isExistingDraft = activeCircle.draftTest && (activeCircle.tests || []).some(t => t.id === activeCircle.draftTest!.id);
                                    if (!activeCircle.draftTest || isExistingDraft) {
                                        const allStudentIds = activeCircleStudents.map(s => s.id);
                                        const defaultMax = activeCircle.settings.defaultTestMaxScores || {};
                                        const savedCustomTypes = activeCircle.settings.customTestContentTypes || [];
                                        const initialContent: { [key: string]: boolean } = {memorization: true, review: true, recitation: true};
                                        savedCustomTypes.forEach(type => { initialContent[type] = true; });

                                        setEditingTest({
                                            id: generateUniqueId(), 
                                            createdAt: Date.now(), 
                                            name: '', 
                                            testType: 'monthly', 
                                            targetStudentIds: allStudentIds, 
                                            content: initialContent, 
                                            maxScores: {
                                                memorization: defaultMax['memorization'] ?? 20,
                                                review: defaultMax['review'] ?? 20,
                                                recitation: defaultMax['recitation'] ?? 20,
                                                ...defaultMax
                                            },
                                            customLabels: savedCustomTypes.reduce((acc, type) => ({ ...acc, [type]: type }), {}),
                                            results: allStudentIds.map(id => ({ studentId: id, grades: {} }))
                                        }); 
                                    } 
                                    navigateWithinServices('testForm'); 
                                }} 
                                onEdit={(t) => {
                                    setEditingTest(t); 
                                    navigateWithinServices('testForm');
                                }} 
                                onDelete={handleDeleteTest} 
                                onView={(t) => {
                                    setViewingTest(t); 
                                    pushStateSafely();
                                }} 
                            />
                        )}
                        {activeServicesPage === 'testForm' && (
                            <TestForm 
                                test={editingTest} 
                                setTest={setEditingTest} 
                                students={activeCircleStudents} 
                                onSave={handleSaveTest} 
                                onBack={() => { 
                                    const hasData = editingTest && (editingTest.name.trim() !== '' || editingTest.results.some(r => Object.keys(r.grades).length > 0));
                                    setActiveCircleData(draft => ({...draft, draftTest: hasData ? (editingTest || undefined) : null}), false); 
                                    if(hasData) addToast('تم حفظ الاختبار كمسودة.', 'info'); 
                                    servicesHistoryRef.current.pop(); 
                                    setActiveServicesPage(servicesHistoryRef.current[servicesHistoryRef.current.length-1]); 
                                }} 
                                setConfirmationModal={setConfirmationModal} 
                                onUpdateSettings={handleUpdateSettings} 
                                settings={activeCircle.settings} 
                                circleId={activeCircle.id} 
                            />
                        )}
                        {activeServicesPage === 'plans' && (
                            <Plans 
                                plans={activeCircle.plans || []} 
                                isDraft={!!activeCircle.draftPlan} 
                                onBack={() => { 
                                    servicesHistoryRef.current.pop(); 
                                    setActiveServicesPage(servicesHistoryRef.current[servicesHistoryRef.current.length-1]); 
                                }} 
                                onNew={() => { 
                                    if (activeCircleStudents.length === 0) {
                                        setAlertModal({ isOpen: true, title: 'تنبيه', message: 'عذرًا، لا يمكن إنشاء خطة جديدة لعدم وجود طلاب في الحلقة. يرجى إضافة طلاب أولاً.' });
                                        return;
                                    }
                                    const isExistingDraft = activeCircle.draftPlan && (activeCircle.plans || []).some(p => p.id === activeCircle.draftPlan!.id);
                                    if (!activeCircle.draftPlan || isExistingDraft) {
                                        const allStudentIds = activeCircleStudents.map(s => s.id);
                                        setEditingPlan({
                                            id: generateUniqueId(), 
                                            createdAt: Date.now(), 
                                            name: '', 
                                            duration: 'week', 
                                            targetStudentIds: allStudentIds, 
                                            studentPlans: allStudentIds.map(id => ({studentId: id, memorization: {hasPlan: true, fromSurah: '', fromAyah: '', toSurah: '', toAyah:''}, review: {hasPlan: true, fromSurah: '', fromAyah: '', toSurah: '', toAyah:''}, notes: ''}))
                                        }); 
                                    } 
                                    navigateWithinServices('planForm'); 
                                }} 
                                onEdit={(p) => {
                                    setEditingPlan(p); 
                                    navigateWithinServices('planForm');
                                }} 
                                onDelete={handleDeletePlan} 
                                onView={(p) => {
                                    setViewingPlan(p); 
                                    pushStateSafely();
                                }} 
                            />
                        )}
                        {activeServicesPage === 'planForm' && (
                            <PlanForm 
                                plan={editingPlan} 
                                setPlan={setEditingPlan} 
                                students={activeCircleStudents} 
                                onSave={handleSavePlan} 
                                onBack={() => { 
                                    const hasData = editingPlan && (editingPlan.name.trim() !== '' || editingPlan.studentPlans.some(p => p.memorization.fromSurah || p.review.fromSurah || p.notes));
                                    setActiveCircleData(draft => ({...draft, draftPlan: hasData ? (editingPlan || undefined) : null}), false); 
                                    if(hasData) addToast('تم حفظ الخطة كمسودة.', 'info'); 
                                    servicesHistoryRef.current.pop(); 
                                    setActiveServicesPage(servicesHistoryRef.current[servicesHistoryRef.current.length-1]); 
                                }} 
                                setConfirmationModal={setConfirmationModal} 
                                settings={activeCircle.settings} 
                                setAlert={setAlertModal} 
                                isSubModalOpen={isSubModalOpen} 
                                onSubModalOpen={handleSubModalOpen} 
                                onSubModalClose={handleSubModalClose} 
                                circleId={activeCircle.id} 
                            />
                        )}
                        {activeServicesPage === 'activities' && (
                            <Activities 
                                activities={activeCircle.activities || []} 
                                isDraft={!!activeCircle.draftActivity} 
                                onBack={() => { 
                                    servicesHistoryRef.current.pop(); 
                                    setActiveServicesPage(servicesHistoryRef.current[servicesHistoryRef.current.length-1]); 
                                }} 
                                onNew={() => { 
                                    if (activeCircleStudents.length === 0) {
                                        setAlertModal({ isOpen: true, title: 'تنبيه', message: 'عذرًا، لا يمكن إنشاء نشاط جديد لعدم وجود طلاب في الحلقة. يرجى إضافة طلاب أولاً.' });
                                        return;
                                    }
                                    const isExistingDraft = activeCircle.draftActivity && (activeCircle.activities || []).some(a => a.id === activeCircle.draftActivity!.id);
                                    if (!activeCircle.draftActivity || isExistingDraft) {
                                        setEditingActivity({
                                            id: generateUniqueId(), 
                                            createdAt: Date.now(), 
                                            name: '', 
                                            type: '', 
                                            dateType: 'single', 
                                            startDate: new Date().toISOString().split('T')[0], 
                                            startTime: new Date().toTimeString().substring(0,5), 
                                            targetStudentIds: activeCircleStudents.map(s=>s.id)
                                        }); 
                                    } 
                                    navigateWithinServices('activityForm'); 
                                }} 
                                onEdit={(a) => {
                                    setEditingActivity(a); 
                                    navigateWithinServices('activityForm');
                                }} 
                                onDelete={handleDeleteActivity} 
                                onView={(a) => {
                                    setViewingActivity(a); 
                                    pushStateSafely();
                                }} 
                            />
                        )}
                        {activeServicesPage === 'activityForm' && (
                            <ActivityForm 
                                activity={editingActivity} 
                                setActivity={setEditingActivity} 
                                students={activeCircleStudents} 
                                onSave={handleSaveActivity} 
                                onBack={() => { 
                                    const hasData = editingActivity && editingActivity.name.trim() !== '';
                                    setActiveCircleData(draft => ({...draft, draftActivity: hasData ? (editingActivity || undefined) : null}), false); 
                                    if(hasData) addToast('تم حفظ النشاط كمسودة.', 'info'); 
                                    servicesHistoryRef.current.pop(); 
                                    setActiveServicesPage(servicesHistoryRef.current[servicesHistoryRef.current.length-1]); 
                                }} 
                                setConfirmationModal={setConfirmationModal} 
                                activityTypes={activeCircle.activityTypes || defaultActivityTypes} 
                                onAddActivityType={(t) => setActiveCircleData(d => ({...d, activityTypes: [...(d.activityTypes || defaultActivityTypes), t]}))} 
                                onDeleteActivityType={(t) => setActiveCircleData(d => ({...d, activityTypes: (d.activityTypes || defaultActivityTypes).filter(at => at !== t)}))} 
                                circleId={activeCircle.id} 
                            />
                        )}
                        {activeServicesPage === 'announcements' && (
                            <Announcements 
                                announcements={activeCircle.announcements || []} 
                                isDraft={!!activeCircle.draftAnnouncement} 
                                recentAnnouncementId={recentAnnouncementId}
                                onBack={() => { 
                                    servicesHistoryRef.current.pop(); 
                                    setActiveServicesPage(servicesHistoryRef.current[servicesHistoryRef.current.length-1]); 
                                }} 
                                onNew={() => { 
                                    if (activeCircleStudents.length === 0) {
                                        setAlertModal({ isOpen: true, title: 'تنبيه', message: 'عذرًا، لا يمكن إنشاء إعلان جديد لعدم وجود طلاب في الحلقة. يرجى إضافة طلاب أولاً.' });
                                        return;
                                    }
                                    const isExistingDraft = activeCircle.draftAnnouncement && (activeCircle.announcements || []).some(a => a.id === activeCircle.draftAnnouncement!.id);
                                    if (!activeCircle.draftAnnouncement || isExistingDraft) {
                                        setEditingAnnouncement({
                                            id: generateUniqueId(), 
                                            createdAt: Date.now(), 
                                            title: '', 
                                            content: '',
                                            targetStudentIds: activeCircleStudents.map(s=>s.id)
                                        }); 
                                    } 
                                    navigateWithinServices('announcementForm'); 
                                }} 
                                onEdit={(a) => {
                                    setEditingAnnouncement(a); 
                                    navigateWithinServices('announcementForm');
                                }} 
                                onDelete={handleDeleteAnnouncement} 
                                onView={(a) => {
                                    setViewingAnnouncement(a); 
                                    pushStateSafely();
                                }} 
                            />
                        )}
                        {activeServicesPage === 'announcementForm' && (
                            <AnnouncementForm 
                                announcement={editingAnnouncement} 
                                setAnnouncement={setEditingAnnouncement} 
                                students={activeCircleStudents} 
                                onSave={handleSaveAnnouncement} 
                                onBack={(updatedAnnouncement) => { 
                                    const finalAnnouncement = updatedAnnouncement !== undefined ? updatedAnnouncement : editingAnnouncement;
                                    const hasData = finalAnnouncement && (finalAnnouncement.title.trim() !== '' || finalAnnouncement.content.trim() !== '');
                                    setActiveCircleData(draft => ({...draft, draftAnnouncement: hasData ? (finalAnnouncement || null) : null}), false); 
                                    if(hasData) addToast('تم حفظ الإعلان كمسودة.', 'info'); 
                                    servicesHistoryRef.current.pop(); 
                                    setActiveServicesPage(servicesHistoryRef.current[servicesHistoryRef.current.length-1]); 
                                }} 
                                setConfirmationModal={setConfirmationModal} 
                                circleId={activeCircle.id} 
                            />
                        )}
                        {activeServicesPage === 'rewards' && (
                            <RewardsManagerModal 
                                key="services-rewards-manager"
                                students={activeCircleStudents}
                                sessions={activeCircle.sessions}
                                pointsSettings={activeCircle.settings.pointsSettings || defaultPointsSettings}
                                bulkRewards={activeCircle.bulkRewards || []}
                                onClose={() => { 
                                    servicesHistoryRef.current.pop(); 
                                    setActiveServicesPage(servicesHistoryRef.current[servicesHistoryRef.current.length-1]); 
                                }} 
                                onSaveReward={handleSaveBulkReward}
                                onDeleteReward={handleDeleteBulkReward}
                                onZeroPoints={handleZeroPoints}
                                setConfirmationModal={setConfirmationModal}
                            />
                        )}
                    </div>
                )}
                {activePage === 'reports' && (
                    <Reports 
                        activeCircle={activeCircle}
                        onBack={() => handleNavigate('services')} 
                    />
                )}
                {activePage === 'settings' && (
                    <div key="settings-page">
                        {activeSettingsPage === 'main' && <Settings 
                            data={activeCircle} 
                            allCircles={appData.circles} 
                            user={user}
                            userProfile={userProfile}
                            isSynced={isSynced}
                            isOnline={isOnline}
                            onLogin={handleLogin}
                            onLogout={handleLogout}
                            onToggleAdminMode={setIsAdminMode}
                            onOpenAddonsModal={() => {setAddonsModalOpen(true); pushStateSafely()}} 
                            onNavigateToAbout={() => navigateWithinSettings('about')} 
                            onNavigateToProfile={() => {
                                setProfileMode('account');
                                navigateWithinSettings('profile');
                            }}
                            onNavigateToTestsAndPlans={() => navigateWithinSettings('testsAndPlans')} 
                            onNavigateToCircleInfo={() => {
                                handleNavigate('circleInfo');
                            }}
                            onSwitchCircle={switchCircle} 
                            onCreateNewCircle={() => {setShowNewCircleForm(true); pushStateSafely();}} 
                            hasCircleSettingsPermission={hasCircleSettingsPermission}
                            addToast={addToast} 
                            onDeleteCircle={(id) => {
                                const circleToDelete = appData.circles.find(c => c.id === id);
                                if (!circleToDelete) return;
                                
                                const isOwner = circleToDelete.ownerId === user?.uid || circleToDelete.teachers?.[user?.uid || '']?.role === 'owner';
                                
                                setConfirmationModal({
                                    isOpen: true, 
                                    title: isOwner ? 'حذف حلقة' : 'الخروج من إدارة الحلقة', 
                                    message: isOwner 
                                        ? `هل أنت متأكد من حذف حلقة (${circleToDelete.circle})؟ وجميع بياناتها بشكل نهائي.` 
                                        : `لا تملك صلاحية حذف هذه الحلقة، يمكنك فقط الخروج منها. هل أنت متأكد من الخروج من إدارة حلقة (${circleToDelete.circle})؟`, 
                                    onConfirm: async () => {
                                        if (user && db) {
                                            try {
                                                if (isOwner) {
                                                    await deleteDoc(doc(db, 'circles', id));
                                                } else {
                                                    const updatedAuthorizedIds = (circleToDelete.authorizedUserIds || []).filter(uid => uid !== user.uid);
                                                    const updatedTeachers = { ...(circleToDelete.teachers || {}) };
                                                    const teacherName = updatedTeachers[user.uid]?.name || userProfile?.displayName || 'معلم';
                                                    delete updatedTeachers[user.uid];

                                                    const leaveNotification: Notification = {
                                                        id: `leave_${user.uid}_${Date.now()}`,
                                                        type: 'warning',
                                                        category: 'system',
                                                        message: `المعلم (${teacherName}) قام بالخروج من إدارة الحلقة.`,
                                                        createdAt: Date.now()
                                                    };

                                                    const updatedNotifications = [leaveNotification, ...(circleToDelete.notifications || [])];
                                                    
                                                    await updateDoc(doc(db, 'circles', id), {
                                                        authorizedUserIds: updatedAuthorizedIds,
                                                        teachers: updatedTeachers,
                                                        notifications: updatedNotifications,
                                                        lastUpdated: Date.now()
                                                    });
                                                }
                                            } catch (e) {
                                                console.error("Operation failed:", e);
                                            }
                                        }
                                        setAppData(d => ({...d, circles: d.circles.filter(c => c.id !== id)})); 
                                        setConfirmationModal(p => ({...p, isOpen:false})); 
                                        addToast(isOwner ? '🗑️ تم حذف الحلقة بنجاح' : '🚪 تم الخروج من إدارة الحلقة بنجاح');
                                    },
                                    delay: isOwner ? 5 : 0
                                });
                            }}
                            onOpenBackupRestore={() => {setBackupRestoreModalOpen(true); pushStateSafely();}} onJoinCommunity={handleJoinCommunity} setConfirmationModal={setConfirmationModal} onManualSync={handleManualSync} 
                            onNavigateToSyncDiagnostics={() => handleNavigate('syncDiagnostics')}
                            onLinkCircles={() => setShowLinkCirclesModal(true)}
                            onNavigateToSupport={() => navigateWithinSettings('support')}
                        />}
                        {activeSettingsPage === 'about' && <About onBack={() => {settingsHistoryRef.current.pop(); setActiveSettingsPage(settingsHistoryRef.current[settingsHistoryRef.current.length-1]);}} />}
                        {activeSettingsPage === 'support' && <Support onBack={() => {settingsHistoryRef.current.pop(); setActiveSettingsPage(settingsHistoryRef.current[settingsHistoryRef.current.length-1]);}} addToast={addToast} />}
                        {activeSettingsPage === 'profile' && (
                            <Profile 
                                mode={profileMode} 
                                data={activeCircle} 
                                allCircles={appData.circles} 
                                onSave={handleUpdateProfile} 
                                onUpdateAccountDetails={handleUpdateProfileData}
                                onBack={() => {
                                    settingsHistoryRef.current.pop(); 
                                    setActiveSettingsPage(settingsHistoryRef.current[settingsHistoryRef.current.length-1]);
                                }} 
                                setConfirmationModal={setConfirmationModal} 
                                userProfile={userProfile} 
                                onToggleAdminMode={setIsAdminMode} 
                                addToast={addToast} 
                                isOnline={isOnline}
                            />
                        )}
                        {activeSettingsPage === 'testsAndPlans' && <TestsAndPlans onBack={() => {settingsHistoryRef.current.pop(); setActiveSettingsPage(settingsHistoryRef.current[settingsHistoryRef.current.length-1]);}} onNavigate={(page) => navigateWithinSettings(page)} />}
                        {activeSettingsPage === 'parentFollowUp' && <ParentFollowUp students={activeCircleStudents} sessions={activeCircle.sessions} circleData={activeCircle} onBack={() => { settingsHistoryRef.current.pop(); setActiveSettingsPage(settingsHistoryRef.current[settingsHistoryRef.current.length-1]); }} onUpdateStudent={handleUpdateStudent} onUpdateSettings={handleUpdateSettings} addToast={addToast} />}
                    {activeSettingsPage === 'tests' && <Tests tests={activeCircle.tests || []} isDraft={!!activeCircle.draftTest} onBack={() => { settingsHistoryRef.current = ['main']; setActiveSettingsPage('main'); }} onNew={() => { 
                        if (activeCircleStudents.length === 0) {
                            setAlertModal({ isOpen: true, title: 'تنبيه', message: 'عذرًا، لا يمكن إنشاء اختبار جديد لعدم وجود طلاب في الحلقة. يرجى إضافة طلاب أولاً.' });
                            return;
                        }
                        const isExistingDraft = activeCircle.draftTest && (activeCircle.tests || []).some(t => t.id === activeCircle.draftTest!.id);
                        if (!activeCircle.draftTest || isExistingDraft) {
                            const allStudentIds = activeCircleStudents.map(s => s.id);
                            const defaultMax = activeCircle.settings.defaultTestMaxScores || {};
                            
                            // Initialize default content including saved custom types
                            const savedCustomTypes = activeCircle.settings.customTestContentTypes || [];
                            const initialContent: { [key: string]: boolean } = {memorization: true, review: true, recitation: true};
                            savedCustomTypes.forEach(type => { initialContent[type] = true; });

                            setEditingTest({
                                id: generateUniqueId(), 
                                createdAt: Date.now(), 
                                name: '', 
                                testType: 'monthly', 
                                targetStudentIds: allStudentIds, 
                                content: initialContent, 
                                maxScores: {
                                    memorization: defaultMax['memorization'] ?? 20,
                                    review: defaultMax['review'] ?? 20,
                                    recitation: defaultMax['recitation'] ?? 20,
                                    ...defaultMax
                                },
                                // Custom labels for the saved custom types need to match the key initially
                                customLabels: savedCustomTypes.reduce((acc, type) => ({ ...acc, [type]: type }), {}),
                                results: allStudentIds.map(id => ({ studentId: id, grades: {} }))
                            }); 
                        } 
                        navigateWithinSettings('testForm'); 
                    }} onEdit={(t) => {setEditingTest(t); navigateWithinSettings('testForm')}} onDelete={handleDeleteTest} onView={(t) => {setViewingTest(t); pushStateSafely();}} />}
                    {activeSettingsPage === 'testForm' && <TestForm test={editingTest} setTest={setEditingTest} students={activeCircleStudents} onSave={handleSaveTest} onBack={() => { 
                        const hasData = editingTest && (editingTest.name.trim() !== '' || editingTest.results.some(r => Object.keys(r.grades).length > 0));
                        setActiveCircleData(draft => ({...draft, draftTest: hasData ? (editingTest || undefined) : null}), false); 
                        if(hasData) addToast('تم حفظ الاختبار كمسودة.', 'info'); 
                        settingsHistoryRef.current.pop(); setActiveSettingsPage(settingsHistoryRef.current[settingsHistoryRef.current.length-1]); 
                    }} setConfirmationModal={setConfirmationModal} onUpdateSettings={handleUpdateSettings} settings={activeCircle.settings} circleId={activeCircle.id} />}
                    {activeSettingsPage === 'plans' && <Plans plans={activeCircle.plans || []} isDraft={!!activeCircle.draftPlan} onBack={() => { settingsHistoryRef.current = ['main']; setActiveSettingsPage('main'); }} onNew={() => { 
                        if (activeCircleStudents.length === 0) {
                            setAlertModal({ isOpen: true, title: 'تنبيه', message: 'عذرًا، لا يمكن إنشاء خطة جديدة لعدم وجود طلاب في الحلقة. يرجى إضافة طلاب أولاً.' });
                            return;
                        }
                        const isExistingDraft = activeCircle.draftPlan && (activeCircle.plans || []).some(p => p.id === activeCircle.draftPlan!.id);
                        if (!activeCircle.draftPlan || isExistingDraft) {
                            const allStudentIds = activeCircleStudents.map(s => s.id);
                            setEditingPlan({
                                id: generateUniqueId(), 
                                createdAt: Date.now(), 
                                name: '', 
                                duration: 'week', 
                                targetStudentIds: allStudentIds, 
                                studentPlans: allStudentIds.map(id => ({studentId: id, memorization: {hasPlan: true, fromSurah: '', fromAyah: '', toSurah: '', toAyah:''}, review: {hasPlan: true, fromSurah: '', fromAyah: '', toSurah: '', toAyah:''}, notes: ''}))
                            }); 
                        } 
                        navigateWithinSettings('planForm'); 
                    }} onEdit={(p) => {setEditingPlan(p); navigateWithinSettings('planForm')}} onDelete={handleDeletePlan} onView={(p) => {setViewingPlan(p); pushStateSafely();}} />}
                    {activeSettingsPage === 'planForm' && <PlanForm plan={editingPlan} setPlan={setEditingPlan} students={activeCircleStudents} onSave={handleSavePlan} onBack={() => { 
                        const hasData = editingPlan && (editingPlan.name.trim() !== '' || editingPlan.studentPlans.some(p => p.memorization.fromSurah || p.review.fromSurah || p.notes));
                        setActiveCircleData(draft => ({...draft, draftPlan: hasData ? (editingPlan || undefined) : null}), false); 
                        if(hasData) addToast('تم حفظ الخطة كمسودة.', 'info'); 
                        settingsHistoryRef.current.pop(); setActiveSettingsPage(settingsHistoryRef.current[settingsHistoryRef.current.length-1]); 
                    }} setConfirmationModal={setConfirmationModal} settings={activeCircle.settings} setAlert={setAlertModal} isSubModalOpen={isSubModalOpen} onSubModalOpen={handleSubModalOpen} onSubModalClose={handleSubModalClose} circleId={activeCircle.id} />}
                    {activeSettingsPage === 'activities' && <Activities activities={activeCircle.activities || []} isDraft={!!activeCircle.draftActivity} onBack={() => { settingsHistoryRef.current = ['main']; setActiveSettingsPage('main'); }} onNew={() => { 
                        if (activeCircleStudents.length === 0) {
                            setAlertModal({ isOpen: true, title: 'تنبيه', message: 'عذرًا، لا يمكن إنشاء نشاط جديد لعدم وجود طلاب في الحلقة. يرجى إضافة طلاب أولاً.' });
                            return;
                        }
                        const isExistingDraft = activeCircle.draftActivity && (activeCircle.activities || []).some(a => a.id === activeCircle.draftActivity!.id);
                        if (!activeCircle.draftActivity || isExistingDraft) {
                            setEditingActivity({
                                id: generateUniqueId(), 
                                createdAt: Date.now(), 
                                name: '', 
                                type: '', 
                                dateType: 'single', 
                                startDate: new Date().toISOString().split('T')[0], 
                                startTime: new Date().toTimeString().substring(0,5), 
                                targetStudentIds: activeCircleStudents.map(s=>s.id)
                            }); 
                        } 
                        navigateWithinSettings('activityForm'); 
                    }} onEdit={(a) => {setEditingActivity(a); navigateWithinSettings('activityForm')}} onDelete={handleDeleteActivity} onView={(a) => {setViewingActivity(a); pushStateSafely();}} />}
                    {activeSettingsPage === 'activityForm' && <ActivityForm activity={editingActivity} setActivity={setEditingActivity} students={activeCircleStudents} onSave={handleSaveActivity} onBack={() => { 
                        const hasData = editingActivity && editingActivity.name.trim() !== '';
                        setActiveCircleData(draft => ({...draft, draftActivity: hasData ? (editingActivity || undefined) : null}), false); 
                        if(hasData) addToast('تم حفظ النشاط كمسودة.', 'info'); 
                        settingsHistoryRef.current.pop(); setActiveSettingsPage(settingsHistoryRef.current[settingsHistoryRef.current.length-1]); 
                    }} setConfirmationModal={setConfirmationModal} activityTypes={activeCircle.activityTypes || defaultActivityTypes} onAddActivityType={(t) => setActiveCircleData(d => ({...d, activityTypes: [...(d.activityTypes || defaultActivityTypes), t]}))} onDeleteActivityType={(t) => setActiveCircleData(d => ({...d, activityTypes: (d.activityTypes || defaultActivityTypes).filter(at => at !== t)}))} circleId={activeCircle.id} />}
                    
                    {activeSettingsPage === 'announcements' && <Announcements announcements={activeCircle.announcements || []} isDraft={!!activeCircle.draftAnnouncement} recentAnnouncementId={recentAnnouncementId} onBack={() => { settingsHistoryRef.current = ['main']; setActiveSettingsPage('main'); }} onNew={() => { 
                        if (activeCircleStudents.length === 0) {
                            setAlertModal({ isOpen: true, title: 'تنبيه', message: 'عذرًا، لا يمكن إنشاء إعلان جديد لعدم وجود طلاب في الحلقة. يرجى إضافة طلاب أولاً.' });
                            return;
                        }
                        const isExistingDraft = activeCircle.draftAnnouncement && (activeCircle.announcements || []).some(a => a.id === activeCircle.draftAnnouncement!.id);
                        if (!activeCircle.draftAnnouncement || isExistingDraft) {
                            setEditingAnnouncement({
                                id: generateUniqueId(), 
                                createdAt: Date.now(), 
                                title: '', 
                                content: '',
                                targetStudentIds: activeCircleStudents.map(s=>s.id)
                            }); 
                        } 
                        navigateWithinSettings('announcementForm'); 
                    }} onEdit={(a) => {setEditingAnnouncement(a); navigateWithinSettings('announcementForm')}} onDelete={handleDeleteAnnouncement} onView={(a) => {setViewingAnnouncement(a); pushStateSafely();}} />}
                    {activeSettingsPage === 'announcementForm' && <AnnouncementForm announcement={editingAnnouncement} setAnnouncement={setEditingAnnouncement} students={activeCircleStudents} onSave={handleSaveAnnouncement} onBack={(updatedAnnouncement) => { 
                        const finalAnnouncement = updatedAnnouncement !== undefined ? updatedAnnouncement : editingAnnouncement;
                        const hasData = finalAnnouncement && (finalAnnouncement.title.trim() !== '' || finalAnnouncement.content.trim() !== '');
                        setActiveCircleData(draft => ({...draft, draftAnnouncement: hasData ? (finalAnnouncement || null) : null}), false); 
                        if(hasData) addToast('تم حفظ الإعلان كمسودة.', 'info'); 
                        settingsHistoryRef.current.pop(); setActiveSettingsPage(settingsHistoryRef.current[settingsHistoryRef.current.length-1]); 
                    }} setConfirmationModal={setConfirmationModal} circleId={activeCircle.id} />}
                </div>
            )}
                </>
            )}
        </>
    );

    return (
        <div className="bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 h-full flex flex-col overflow-hidden">
            <Header 
                data={activeCircle!} 
                allCircles={appData.circles} 
                user={user}
                currentUserId={user?.uid || ''}
                isSynced={isSynced}
                isOnline={isOnline}
                onLogin={handleLogin}
                onLogout={handleLogout}
                onMarkAsRead={handleMarkNotificationsAsRead}
                onQuickSwitch={handleQuickSwitch} 
                onOpenQuickSwitchSelector={() => {setQuickSwitchModalOpen(true); pushStateSafely();}} 
                onNavigateToAnnouncements={() => handleNavigate('notifications')}
                onManualSync={handleManualSync}
                onNavigateToSyncDiagnostics={() => handleNavigate('syncDiagnostics')}
                onNavigateToAccountSettings={onNavigateToAccountSettings}
            />
            <main ref={mainContainerRef} className="flex-grow overflow-y-auto pb-20">
                <div className="p-4 max-w-6xl mx-auto">
                   {mainContent}
                </div>
            </main>
            <BottomNav activePage={activePage} setActivePage={(p) => handleNavigate(p)} />

            <AnimatePresence>
                {showStudentForm && !isSuspended && <StudentForm key="modal-student-form" student={editingStudent} onSave={handleSaveStudent} onClose={() => { setShowStudentForm(false); setEditingStudent(null); }} onTransferStudent={handleOpenTransferStudentModal} onArchiveStudent={handleArchiveStudent} circleCount={appData.circles.length} setConfirmationModal={setConfirmationModal} pointsSettings={activeCircle.settings.pointsSettings || defaultPointsSettings} addToast={addToast} />}
                {editingSession && !isSuspended && <SessionForm key={`session-form-${editingSession.id}`} session={editingSession} setSession={setEditingSession} allStudents={activeCircleStudents} onUpdateMasterStudents={handleBulkUpdateMasterStudents} onSave={handleSaveSession} onBack={handleCloseSessionForm} setAlert={setAlertModal} lessonTypes={activeCircle.lessonTypes} onAddLessonType={(t) => setActiveCircleData(d => ({...d, lessonTypes: [...d.lessonTypes, t]}))} onDeleteLessonType={(t) => setActiveCircleData(d => ({...d, lessonTypes: d.lessonTypes.filter(lt => lt !== t)}))} setConfirmationModal={setConfirmationModal} onShowLastRecord={handleShowLastRecord} settings={activeCircle.settings} onResetDraft={handleResetDraft} addToast={addToast} isSubModalOpen={isSubModalOpen} onSubModalOpen={handleSubModalOpen} onSubModalClose={handleSubModalClose} circleId={activeCircle.id} />}
                {reportSession && !isSuspended && <ReportModal key="modal-report-session" session={reportSession} data={activeCircle} onClose={() => setReportSession(null)} onNotifyParents={() => {setNotificationSession(reportSession); setReportSession(null);}} addToast={addToast} onOpenShare={handleOpenShare} onUpdateSupervisorSettings={handleUpdateSupervisorSettings} />}
                {notificationSession && !isSuspended && <NotificationModal key="modal-notification" session={notificationSession} data={activeCircle} onClose={() => setNotificationSession(null)} onNotificationSent={handleNotificationSent} addToast={addToast} />}
                {confirmationModal.isOpen && !isSuspended && <ConfirmationModal key="modal-confirmation" {...confirmationModal} onCancel={() => {
                    if (confirmationModal.onCancel) {
                        try { confirmationModal.onCancel(); } catch (e) { console.error(e); }
                    }
                    setConfirmationModal({ isOpen: false, title: '', message: '', onConfirm: () => {} });
                }} />}
                {alertModal.isOpen && <AlertModal key="modal-alert" {...alertModal} onClose={() => setAlertModal(d => ({...d, isOpen: false}))} />}
                
                <LinkCirclesModal 
                    isOpen={showLinkCirclesModal}
                    onClose={() => setShowLinkCirclesModal(false)}
                    unlinkedCount={appData.circles.filter(c => !c.authorizedUserIds || c.authorizedUserIds.length === 0).length}
                    onLinkSuccess={handleLinkCirclesSuccess}
                    addToast={addToast}
                />
                {choiceModal.isOpen && <ChoiceModal key="modal-choice" {...choiceModal} />}
                {lastRecordModal.isOpen && (
                    <LastRecordModal 
                        key="modal-last-record"
                        {...lastRecordModal} 
                        onClose={() => setLastRecordModal({ isOpen: false })} 
                        onAddRecord={handleAddLastRecordToSession} 
                        currentMaxGrade={
                            lastRecordModal.recordType === 'الحفظ' 
                            ? (activeCircle.settings.pointsSettings?.maxMemorizationGrade ?? 10)
                            : (activeCircle.settings.pointsSettings?.maxReviewGrade ?? 10)
                        }
                    />
                )}
                {reportGeneratorModal.isOpen && <ReportGeneratorModal key="modal-report-gen" {...reportGeneratorModal} onClose={() => setReportGeneratorModal({isOpen: false, studentId: null})} onGenerate={handleGenerateAndShowReport} setAlert={setAlertModal} />}
                {studentReportModal.isOpen && <StudentReportModal key="modal-student-report" {...studentReportModal} studentPhone={studentReportModal.student?.parentPhone} circleData={activeCircle} onClose={() => setStudentReportModal({isOpen: false, student: null, reportContent: '', period: ''})} onSave={handleSaveStudentReport} addToast={addToast} onOpenShare={handleOpenShare} />}
                {supervisorReportGeneratorOpen && <SupervisorReportGeneratorModal key="modal-supervisor-report-gen" onClose={() => setSupervisorReportGeneratorOpen(false)} onGenerate={handleGenerateSupervisorReport} setAlert={setAlertModal} />}
                {supervisorReportModal.isOpen && <SupervisorReportModal key="modal-supervisor-report" {...supervisorReportModal} onClose={() => setSupervisorReportModal({isOpen: false, reportContent: '', periodLabel: ''})} onSave={handleSaveSupervisorReport} addToast={addToast} onOpenShare={handleOpenShare} />}
                {savedReportsModalOpen && <SavedReportsModal key="modal-saved-reports" reports={activeCircle.supervisorReports || []} onClose={() => setSavedReportsModalOpen(false)} onView={(report) => {setViewReportModal({isOpen: true, report, type: 'supervisor'}); setSavedReportsModalOpen(false);}} onDelete={(id) => handleDeleteReport(id, 'supervisor')} />}
                
                {showStatsModal && <StatsModal key="modal-stats" students={activeCircleStudents} sessions={activeCircle.sessions} onClose={() => setShowStatsModal(false)} data={activeCircle} onOpenSupervisorReportGenerator={() => {setSupervisorReportGeneratorOpen(true); pushStateSafely();}} onOpenSavedReports={() => {setSavedReportsModalOpen(true); pushStateSafely()}} onOpenLeaderboard={() => {setShowLeaderboard(true); pushStateSafely();}} onViewProfile={handleViewStudentProfile} />}
                
                {statsModalData.isOpen && <DetailedStatsModal key="modal-detailed-stats" title={statsModalData.title} students={statsModalData.students} suspendedStudents={statsModalData.suspendedStudents} onClose={() => setStatsModalData({isOpen: false, title: '', students: []})} />}
                {viewReportModal.isOpen && <ViewReportModal key="modal-view-report" report={viewReportModal.report!} type={viewReportModal.type} circleData={activeCircle} student={(viewReportModal.type === 'student' && viewReportModal.report) ? activeCircle.students.find(s=>s.id === (viewReportModal.report as StudentReport).studentId) : undefined} onClose={() => setViewReportModal({isOpen: false, report: null, type: 'supervisor'})} addToast={addToast} onOpenShare={handleOpenShare} />}
                {showWelcomePopup && <WelcomePopup key="modal-welcome" onClose={handleCloseWelcomePopup} gender={activeCircle?.teacherGender || 'male'} />}
                {isTourActive && <OnboardingGuide key="modal-onboarding" steps={onboardingSteps} onComplete={handleOnboardingComplete} />}
                {addonsModalOpen && <OptionalAddonsModal key="modal-addons" settings={activeCircle.settings} onSave={handleUpdateSettings} onClose={() => setAddonsModalOpen(false)} onOpenPointsSettings={() => {setPointsSettingsModalOpen(true); pushStateSafely();}} onOpenNotificationSettings={() => {setNotificationSettingsModalOpen(true); pushStateSafely();}} archivedStudents={archivedStudents} onRestoreStudent={handleRestoreStudent} hasCircleSettingsPermission={hasCircleSettingsPermission} addToast={addToast} />}
                {pointsSettingsModalOpen && <PointsSettingsModal key="modal-points-settings" settings={activeCircle.settings.pointsSettings || defaultPointsSettings} onSave={(s) => handleUpdateSettings({pointsSettings: s})} onClose={() => setPointsSettingsModalOpen(false)} onOpenRewardsManager={() => {setRewardsManagerOpen(true); pushStateSafely();}} />}
                {notificationSettingsModalOpen && <NotificationSettingsModal key="modal-notification-settings" settings={activeCircle.notificationSettings || defaultNotificationSettings} onSave={handleUpdateNotificationSettings} onClose={() => setNotificationSettingsModalOpen(false)} />}
                
                {showLeaderboard && <Leaderboard key="modal-leaderboard" students={activeCircleStudents} sessions={activeCircle.sessions} studyStartDate={activeCircle.studyStartDate} onClose={() => setShowLeaderboard(false)} pointsSettings={activeCircle.settings.pointsSettings || defaultPointsSettings} onStudentClick={(id) => { setActivePointsLogStudentId(id); pushStateSafely(); }} />}
                
                {viewingStudentId && <StudentProfileCard key={`modal-student-profile-${viewingStudentId}`} studentId={viewingStudentId} allStudents={activeCircleStudents} sessions={activeCircle.sessions} tests={activeCircle.tests || []} studyStartDate={activeCircle.studyStartDate} onClose={() => setViewingStudentId(null)} circleName={activeCircle.circle} addToast={addToast} settings={activeCircle.settings} pointsSettings={activeCircle.settings.pointsSettings || defaultPointsSettings} onOpenShare={handleOpenShare} onOpenReportGenerator={handleOpenReportGenerator} onAdjustPoints={handleAdjustStudentPoints} onOpenPointsLog={(student) => { setActivePointsLogStudentId(student.id); pushStateSafely(); }} isSubModalOpen={isSubModalOpen} onSubModalOpen={handleSubModalOpen} onSubModalClose={handleSubModalClose} />}
                
                {quickSwitchModalOpen && <QuickSwitchSelectorModal key="modal-quick-switch" isOpen={quickSwitchModalOpen} onClose={() => setQuickSwitchModalOpen(false)} onSave={handleSaveQuickSwitchSelection} allCircles={appData.circles} currentSelection={appData.quickSwitchCircleIds || []} />}
                {filenamePromptModal.isOpen && <FilenamePromptModal key="modal-filename-prompt" {...filenamePromptModal} onClose={() => setFilenamePromptModal(p => ({...p, isOpen: false}))} />}
                {backupRestoreModalOpen && <BackupRestoreModal key="modal-backup-restore" onClose={() => setBackupRestoreModalOpen(false)} onCreateBackup={handleCreateBackup} onImportBackup={handleImportBackup} onOpenTextBackup={() => {setBackupRestoreModalOpen(false); setTextBackupModalOpen(true); pushStateSafely();}} onOpenTextRestore={() => {setBackupRestoreModalOpen(false); setTextRestoreModalOpen(true); pushStateSafely();}} />}
                {textBackupModalOpen && activeCircle && <TextBackupModal key="modal-text-backup" activeCircle={activeCircle} onClose={() => setTextBackupModalOpen(false)} addToast={addToast} />}
                {textRestoreModalOpen && <TextRestoreModal key="modal-text-restore" onClose={() => setTextRestoreModalOpen(false)} onRestore={handleRestoreFromText} />}
                {backupReviewModalData && (
                    <BackupReviewModal 
                        key="modal-backup-review" 
                        isOpen={!!backupReviewModalData} 
                        importedData={backupReviewModalData} 
                        onClose={() => setBackupReviewModalData(null)} 
                        onConfirm={handleConfirmRestoreAsNew} 
                    />
                )}
                {communityTermsModalState.isOpen && <TermsOfServiceModal key="modal-community-terms" onClose={() => setCommunityTermsModalState({ isOpen: false, targetLink: null })} onAgree={handleAgreeToCommunityTerms} />}

                {viewingTest && <TestReportModal key={`modal-view-test-${viewingTest.id}`} test={viewingTest} circleData={activeCircle} onClose={() => setViewingTest(null)} onNotify={() => { setNotifyingTest(viewingTest); setViewingTest(null); }} addToast={addToast} onOpenShare={handleOpenShare} />}
                {notifyingTest && <TestNotificationModal key={`modal-notify-test-${notifyingTest.id}`} test={notifyingTest} circleData={activeCircle} onClose={() => setNotifyingTest(null)} onNotificationSent={handleTestNotificationSent} addToast={addToast} />}
                {viewingPlan && <PlanReportModal key={`modal-view-plan-${viewingPlan.id}`} plan={viewingPlan} circleData={activeCircle} onClose={() => setViewingPlan(null)} onNotify={() => { setNotifyingPlan(viewingPlan); setViewingPlan(null); }} addToast={addToast} onOpenShare={handleOpenShare} />}
                {notifyingPlan && <PlanNotificationModal key={`modal-notify-plan-${notifyingPlan.id}`} plan={notifyingPlan} circleData={activeCircle} onClose={() => setNotifyingPlan(null)} onNotificationSent={handlePlanNotificationSent} addToast={addToast} />}

                {viewingActivity && <ActivityReportModal key={`modal-view-activity-${viewingActivity.id}`} activity={viewingActivity} circleData={activeCircle} onClose={() => setViewingActivity(null)} onNotify={() => { setNotifyingActivity(viewingActivity); setViewingActivity(null); }} addToast={addToast} onOpenShare={handleOpenShare} />}
                {notifyingActivity && <ActivityNotificationModal key={`modal-notify-activity-${notifyingActivity.id}`} activity={notifyingActivity} circleData={activeCircle} onClose={() => setNotifyingActivity(null)} onNotificationSent={handleActivityNotificationSent} addToast={addToast} />}

                {viewingAnnouncement && <AnnouncementReportModal key={`modal-view-announcement-${viewingAnnouncement.id}`} announcement={viewingAnnouncement} circleData={activeCircle} onClose={() => setViewingAnnouncement(null)} onNotify={() => { setNotifyingAnnouncement(viewingAnnouncement); setViewingAnnouncement(null); }} addToast={addToast} onOpenShare={handleOpenShare} />}
                {notifyingAnnouncement && <AnnouncementNotificationModal key={`modal-notify-announcement-${notifyingAnnouncement.id}`} announcement={notifyingAnnouncement} circleData={activeCircle} onClose={() => setNotifyingAnnouncement(null)} onNotificationSent={handleAnnouncementNotificationSent} addToast={addToast} />}

                {rewardsManagerOpen && activeCircle && (
                    <RewardsManagerModal 
                        key="modal-rewards-manager"
                        students={activeCircleStudents}
                        sessions={activeCircle.sessions}
                        pointsSettings={activeCircle.settings.pointsSettings || defaultPointsSettings}
                        bulkRewards={activeCircle.bulkRewards || []}
                        onClose={() => setRewardsManagerOpen(false)}
                        onSaveReward={handleSaveBulkReward}
                        onDeleteReward={handleDeleteBulkReward}
                        onZeroPoints={handleZeroPoints}
                        setConfirmationModal={setConfirmationModal}
                    />
                )}

                {activePointsLogStudentId && pointsLogStudent && (
                    <StudentPointsLogModal
                        key={`modal-points-log-${activePointsLogStudentId}`}
                        student={pointsLogStudent}
                        sessions={activeCircle.sessions}
                        pointsSettings={activeCircle.settings.pointsSettings || defaultPointsSettings}
                        onClose={() => setActivePointsLogStudentId(null)}
                        onOpenAdjuster={(currentPoints) => {
                            setPointsForAdjuster(currentPoints);
                            setActivePointAdjusterStudentId(pointsLogStudent.id);
                            pushStateSafely();
                        }}
                        onDismissResetAlert={handleDismissPointResetAlert}
                    />
                )}
                
                {activePointAdjusterStudentId && pointAdjusterStudent && (
                    <ManualPointAdjusterModal
                        key={`modal-point-adjuster-${activePointAdjusterStudentId}`}
                        student={pointAdjusterStudent}
                        currentPoints={pointsForAdjuster}
                        onClose={() => setActivePointAdjusterStudentId(null)}
                        onAdjust={(adjustment) => {
                            handleAdjustStudentPoints(pointAdjusterStudent.id, adjustment);
                            setActivePointAdjusterStudentId(null); // Close after adjusting
                        }}
                    />
                )}

                {shareSessionCodeModal.isOpen && shareSessionCodeModal.session && (
                    <ShareSessionCodeModal
                        key={`modal-share-session-${shareSessionCodeModal.session.id}`}
                        session={shareSessionCodeModal.session}
                        onClose={() => setShareSessionCodeModal({isOpen: false, session: null})}
                        addToast={addToast}
                    />
                )}

                {importSessionCodeModalOpen && (
                    <ImportSessionCodeModal
                        key="modal-import-session"
                        onClose={() => setImportSessionCodeModalOpen(false)}
                        onImport={handleImportSessionFromCode}
                        currentStudents={activeCircleStudents}
                        addToast={addToast}
                    />
                )}

                {showLoginModal && (
                    <LoginModal 
                        key="modal-login"
                        isOpen={showLoginModal} 
                        onClose={() => setShowLoginModal(false)}
                        onLoginWithUsername={handleLoginWithUsername}
                        onResetPassword={handleResetPassword}
                    />
                )}
                {showExitToast && (
                    <motion.div
                        key="ui-exit-toast"
                        initial={{ y: 50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 50, opacity: 0 }}
                        className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-sm px-4 py-2 rounded-full shadow-lg"
                    >
                        اضغط مرة أخرى للخروج
                    </motion.div>
                )}
            </AnimatePresence>
            {unreadDevNotification && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in" dir="rtl">
                    <motion.div 
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-white dark:bg-[#151922] border border-slate-100 dark:border-gray-800 rounded-[2.5rem] p-6 max-w-md w-full shadow-2xl relative"
                    >
                        <div className="w-14 h-14 bg-amber-500/10 dark:bg-amber-500/20 text-amber-500 rounded-2xl flex items-center justify-center mb-4 border border-amber-500/20 mx-auto">
                            <Megaphone size={28} />
                        </div>
                        <h2 className="text-base font-black text-center text-slate-900 dark:text-white mb-2">تنبيه إداري عاجل</h2>
                        <p className="text-xs text-center text-slate-500 dark:text-gray-400 mb-4">لقد تلقيت تنبيهاً خاصاً من مطوري ومسؤولي النظام:</p>
                        
                        <div className="bg-slate-50 dark:bg-[#0c0e12] p-4 rounded-2xl border border-slate-100 dark:border-gray-800 text-slate-700 dark:text-gray-300 text-xs md:text-sm leading-relaxed mb-6">
                            {unreadDevNotification.message}
                        </div>

                        <button 
                            onClick={() => handleMarkDevNotificationRead(unreadDevNotification.id)}
                            className="w-full bg-[#105541] hover:bg-[#126049] text-white text-xs font-black py-3 rounded-2xl shadow-lg transition-all"
                        >
                            تأكيد القراءة واستلام التنبيه
                        </button>
                    </motion.div>
                </div>
            )}
            {currentActiveDevNotification && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 overflow-y-auto" dir="rtl">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        className="bg-white dark:bg-[#0c0e12] border border-gray-150 dark:border-gray-800 rounded-[2rem] w-full max-w-lg overflow-hidden shadow-2xl relative"
                    >
                        {/* Header style based on notification type */}
                        <div className={`h-2 w-full bg-gradient-to-r ${
                            currentActiveDevNotification.type === 'update' ? 'from-purple-500 to-indigo-600' :
                            currentActiveDevNotification.type === 'warning' ? 'from-red-500 to-rose-600' :
                            currentActiveDevNotification.type === 'maintenance' ? 'from-amber-500 to-orange-600' :
                            currentActiveDevNotification.type === 'announcement' ? 'from-emerald-500 to-teal-600' :
                            currentActiveDevNotification.type === 'alert' ? 'from-blue-500 to-sky-600' :
                            'from-[#105541] to-emerald-600'
                        }`} />

                        {/* Close button if closable & not mandatory */}
                        {currentActiveDevNotification.isClosable && !currentActiveDevNotification.isMandatory && (
                            <button 
                                onClick={() => handleDismissDevNotification(currentActiveDevNotification)}
                                className="absolute top-4 left-4 p-1.5 rounded-full bg-gray-100 dark:bg-white/5 text-gray-500 hover:bg-gray-200 dark:hover:bg-white/10 hover:text-gray-800 dark:hover:text-white transition-all z-10"
                            >
                                <FaTimes size={12} />
                            </button>
                        )}

                        <div className="p-6 md:p-8 space-y-6 text-right">
                            {/* Image Carousel / Single Image if provided */}
                            {((currentActiveDevNotification.imageUrls && currentActiveDevNotification.imageUrls.length > 0) || currentActiveDevNotification.imageUrl) && (
                                <div className="relative group w-full">
                                    {currentActiveDevNotification.imageUrls && currentActiveDevNotification.imageUrls.length > 1 ? (
                                        <div className="relative w-full overflow-hidden rounded-2xl border border-gray-150 dark:border-gray-800 bg-black/5 dark:bg-white/5">
                                            {/* Horizontal Scroll Container */}
                                            <div className="flex overflow-x-auto snap-x snap-mandatory scrollbar-none gap-2 py-1 scroll-smooth">
                                                {currentActiveDevNotification.imageUrls.map((url: string, index: number) => (
                                                    <div key={index} className="flex-none w-full snap-center shrink-0">
                                                        <img 
                                                            src={url} 
                                                            alt={`صورة ${index + 1}`} 
                                                            className="w-full h-48 md:h-56 object-cover rounded-xl"
                                                            referrerPolicy="no-referrer"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                            {/* Scroll Indicators */}
                                            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-black/60 px-3 py-1 rounded-full text-[9px] text-white font-semibold font-sans tracking-wide">
                                                <span>اسحب للتمرير ↔ ({currentActiveDevNotification.imageUrls.length})</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <img 
                                            src={currentActiveDevNotification.imageUrl || currentActiveDevNotification.imageUrls?.[0]} 
                                            alt="" 
                                            className="w-full h-48 md:h-56 object-cover rounded-2xl border border-gray-150 dark:border-gray-800"
                                            referrerPolicy="no-referrer"
                                        />
                                    )}
                                </div>
                            )}

                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    {/* Dynamic Tag */}
                                    <span className={`text-[9px] px-2.5 py-1 rounded-full font-extrabold uppercase tracking-widest ${
                                        currentActiveDevNotification.type === 'update' ? 'bg-purple-100 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400' :
                                        currentActiveDevNotification.type === 'warning' ? 'bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400' :
                                        currentActiveDevNotification.type === 'maintenance' ? 'bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400' :
                                        currentActiveDevNotification.type === 'announcement' ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                                        'bg-[#105541]/10 text-[#105541] dark:text-emerald-400'
                                    }`}>
                                        {
                                            currentActiveDevNotification.type === 'update' ? 'تحديث متوفر' :
                                            currentActiveDevNotification.type === 'warning' ? 'تنبيه تحذيري' :
                                            currentActiveDevNotification.type === 'maintenance' ? 'صيانة مجدولة' :
                                            currentActiveDevNotification.type === 'announcement' ? 'إعلان هام' :
                                            currentActiveDevNotification.type === 'alert' ? 'تنبيه عاجل' :
                                            currentActiveDevNotification.type === 'note' ? 'ملاحظة إدارية' :
                                            'رسالة من الإدارة'
                                        }
                                    </span>

                                    {currentActiveDevNotification.isMandatory && (
                                        <span className="text-[9px] px-2.5 py-1 bg-red-100 dark:bg-red-500/15 text-red-600 dark:text-red-400 rounded-full font-black">
                                            تحديث إجباري ⚠️
                                        </span>
                                    )}
                                </div>

                                <h3 className="text-lg md:text-xl font-black text-gray-900 dark:text-white leading-tight">
                                    {currentActiveDevNotification.title}
                                </h3>
                                
                                <p className="text-gray-600 dark:text-gray-300 text-xs md:text-sm leading-relaxed whitespace-pre-wrap font-medium">
                                    {currentActiveDevNotification.description}
                                </p>
                            </div>

                            {/* Buttons list */}
                            <div className="flex flex-col gap-2 pt-2">
                                {currentActiveDevNotification.buttons && currentActiveDevNotification.buttons.length > 0 ? (
                                    currentActiveDevNotification.buttons.map((btn: any) => (
                                        <button
                                            key={btn.id}
                                            onClick={() => handleDevNotificationButtonAction(currentActiveDevNotification, btn)}
                                            className={`w-full py-3.5 px-4 rounded-2xl font-bold text-xs transition-all duration-200 active:scale-98 flex items-center justify-center gap-2 ${
                                                btn.action === 'update' || btn.action === 'ok' 
                                                ? 'bg-[#105541] hover:bg-[#105541]/90 text-white shadow-lg shadow-[#105541]/10'
                                                : btn.action === 'cancel'
                                                ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
                                                : 'bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10'
                                            }`}
                                        >
                                            <span>{btn.text}</span>
                                        </button>
                                    ))
                                ) : (
                                    /* Default fallback OK button if no buttons generated */
                                    <button
                                        onClick={() => handleDismissDevNotification(currentActiveDevNotification)}
                                        className="w-full bg-[#105541] hover:bg-[#105541]/90 text-white py-3.5 px-4 rounded-2xl font-bold text-xs transition-all"
                                    >
                                        حسناً، فهمت
                                    </button>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
            <ToastContainer toasts={toasts} />
            {shareModalData.isOpen && <ShareModal {...shareModalData} onClose={() => setShareModalData({ isOpen: false })} addToast={addToast} />}
        </div>
    );
};

export default App;

const SyncLoadingScreen: React.FC<{ onLogout: () => void; onContinueOffline?: () => void }> = ({ onLogout, onContinueOffline }) => {
    const tips = [
        "يمكنك متابعة حفظ ومراجعة الطلاب بشكل فردي من صفحة 'السجل'",
        "يوفر النظام تقارير شاملة للمشرفين بضغطة زر واحدة من صفحة التقارير",
        "يمكنك ضبط نقاط الحضور والغياب والتسميع من إعدادات نقاط الحلقة",
        "يدعم النظام العمل بدون إنترنت، وستتم المزامنة تلقائياً عند الاتصال",
        "يمكنك إضافة أكثر من معلم لنفس الحلقة وتحديد صلاحياته بدقة",
        "ميزة 'متابعة أولياء الأمور' تمكنك من إرسال رسائل دورية مخصصة للآباء"
    ];
    const [tipIndex, setTipIndex] = useState(0);
    const [showOfflineOption, setShowOfflineOption] = useState(false);

    useEffect(() => {
        const interval = setInterval(() => {
            setTipIndex(prev => (prev + 1) % tips.length);
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const timeout = setTimeout(() => {
            setShowOfflineOption(true);
        }, 4000);
        return () => clearTimeout(timeout);
    }, []);

    return (
        <div className="fixed inset-0 bg-[#FAF8F5]/98 backdrop-blur-md z-[100] flex flex-col items-center justify-center p-6 text-center select-none" dir="rtl">
            {/* Elegant Background Lattice Pattern Overlay */}
            <div 
              className="absolute inset-0 opacity-[0.02] pointer-events-none z-0" 
              style={{ 
                backgroundImage: `radial-gradient(#105541 2px, transparent 2px)`, 
                backgroundSize: '32px 32px' 
              }}
            ></div>

            {/* Pulsing Arch / Mihrab behind the logo */}
            <div className="absolute inset-0 z-0 pointer-events-none flex justify-center items-center opacity-30">
              <svg className="w-4/5 h-4/5 stroke-[#E2D9CE] fill-none stroke-[1.5] animate-pulse" viewBox="0 0 100 100" preserveAspectRatio="none">
                <path d="M 5 100 V 24 C 5 12, 15 4, 50 4 C 85 4, 95 12, 95 24 V 100" />
                <path d="M 8 100 V 25 C 8 15, 18 6, 50 6 C 82 6, 92 15, 92 25 V 100" strokeDasharray="1.5 1.5" />
              </svg>
            </div>

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative z-10 w-full max-w-sm flex flex-col items-center gap-6"
            >
                {/* Branded Halqati Logo Segment with Bounce & Glow */}
                <div className="relative mb-2 select-none">
                    <span className="absolute -inset-4 rounded-full bg-amber-400/10 blur-xl animate-ping" style={{ animationDuration: '3s' }}></span>
                    
                    {/* Floating golden book Representing Open Quran */}
                    <div className="absolute top-[-10px] left-[42%] text-amber-500 animate-bounce" style={{ animationDuration: '2.5s' }}>
                      <svg className="w-8 h-6 text-amber-500 fill-current drop-shadow-[0_2px_6px_rgba(217,119,6,0.7)]" viewBox="0 0 24 16">
                        <path d="M12,13.5 C15.5,8.5 22,9.5 24,5.5 C21.5,6.5 15,5.5 12,10.5 C9,5.5 2.5,6.5 0,5.5 C2,9.5 8.5,8.5 12,13.5 Z" />
                        <path d="M11,10 H13 V14.5 H11 Z" fill="#92400E" />
                      </svg>
                    </div>

                    {/* Main logo Text with Elegant green theme shadow */}
                    <div className="relative mt-2 text-shadow-md select-none">
                      <span className="text-5xl font-extrabold text-[#105541] tracking-tight block">
                        حلقتي
                      </span>
                      <div className="flex items-center justify-center gap-1.5 mt-1">
                        <span className="text-[8px] text-amber-500">✦</span>
                        <span className="text-[12px] font-extrabold text-[#105541] tracking-[0.3em] font-mono leading-none">HALQATI</span>
                        <span className="text-[8px] text-amber-500">✦</span>
                      </div>
                    </div>
                </div>

                {/* Rotating custom geometric Star loader */}
                <div className="relative w-16 h-16 my-2">
                    <svg className="w-full h-full text-amber-500 animate-spin" style={{ animationDuration: '8s' }} viewBox="0 0 100 100">
                      <path d="M50 0 L60 30 L90 40 L60 50 L50 80 L40 50 L10 40 L40 30 Z" fill="none" stroke="currentColor" strokeWidth="3" />
                      <path d="M50 10 L57 33 L80 40 L57 47 L50 70 L43 47 L20 40 L43 33 Z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 2" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-4 h-4 rounded-full bg-[#105541] animate-ping"></div>
                    </div>
                </div>

                <div className="space-y-1.5 text-center">
                    <h2 className="text-lg font-extrabold text-[#105541]">جاري تحضير لوحة التحكم الخاصة بك...</h2>
                    <p className="text-xs text-slate-500">جاري استيراد حلقات التحفيظ والمزامنة الآمنة من السحابة</p>
                </div>

                <div className="w-full bg-white/75 backdrop-blur-sm p-5 rounded-3xl border border-gray-100 shadow-sm min-h-[120px] flex flex-col items-center justify-center relative">
                   <AnimatePresence mode="wait">
                       <motion.div
                            key={tipIndex}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-1"
                       >
                            <p className="text-[10px] uppercase tracking-wider font-extrabold text-amber-600 mb-0.5 text-center">هل تعلم؟</p>
                            <p className="text-xs font-semibold text-slate-600 leading-relaxed text-center">
                                {tips[tipIndex]}
                            </p>
                       </motion.div>
                   </AnimatePresence>
                </div>

                {showOfflineOption && onContinueOffline && (
                    <motion.button
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={onContinueOffline}
                        className="w-full flex items-center justify-center gap-2 bg-gradient-to-l from-[#105541] to-teal-700 hover:opacity-95 text-white font-semibold py-3 px-4 rounded-2xl shadow-lg transition-all text-xs cursor-pointer mt-2"
                    >
                        <span>الاستمرار بدون اتصال (محلياً)</span>
                    </motion.button>
                )}

                <button 
                    onClick={onLogout}
                    className="mt-2 text-xs text-slate-400 hover:text-red-500 transition-colors font-bold outline-none cursor-pointer"
                >
                    إلغاء وتسجيل الخروج
                </button>
            </motion.div>
        </div>
    );
};

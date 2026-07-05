
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Users, 
    Building2, 
    PieChart, 
    MoreHorizontal, 
    Plus, 
    LogOut, 
    Copy, 
    QrCode, 
    Bell, 
    History, 
    Megaphone, 
    User as UserIcon,
    RefreshCw,
    Info,
    ChevronLeft,
    MapPin,
    Home,
    Settings,
    Search,
    UserPlus,
    Users as UserTie,
    TrendingUp,
    Calendar,
    Award,
    CheckCircle2,
    XCircle,
    UserCheck,
    ChevronRight,
    Edit2,
    Trash2,
    FileText,
    Download,
    Share2,
    Sun,
    X
} from 'lucide-react';
import { db, collection, query, where, onSnapshot, doc, updateDoc, addDoc, getDocs, getDoc, setDoc, deleteDoc } from '../firebase';
import { Management, ManagementRequest, AuditLog, Broadcast, UserProfile, CircleData, Student, PointsSettings, Session } from '../types';
import StudentForm from './StudentForm';
import StudentProfileCard from './StudentProfileCard';
import { generateUniqueId, generateStudentId, generateNumericId, generateTransferCode, generateStudentReportText } from '../utils/helpers';

interface ManagementDashboardProps {
    managementId: string;
    userProfile: UserProfile;
    addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
    onLogout: () => void;
}

type TabType = 'home' | 'students' | 'circles' | 'teachers' | 'settings';

const ManagementDashboard: React.FC<ManagementDashboardProps> = ({ managementId, userProfile, addToast, onLogout }) => {
    const [management, setManagement] = useState<Management | null>(null);
    const [requests, setRequests] = useState<ManagementRequest[]>([]);
    const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [circles, setCircles] = useState<CircleData[]>([]);
    const [activeTab, setActiveTab] = useState<TabType>('home');
    const [isLoading, setIsLoading] = useState(true);
    const [selectedCircleId, setSelectedCircleId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [showStudentForm, setShowStudentForm] = useState(false);
    const [editingStudent, setEditingStudent] = useState<Student | null>(null);
    const [showCircleForm, setShowCircleForm] = useState(false);
    const [editingCircle, setEditingCircle] = useState<CircleData | null>(null);
    const [viewingStudent, setViewingStudent] = useState<Student | null>(null);
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [profileName, setProfileName] = useState(userProfile.displayName || '');
    const [activeSubView, setActiveSubView] = useState<'none' | 'requests' | 'broadcasts' | 'logs' | 'profile' | 'about'>('none');
    const [showBroadcastForm, setShowBroadcastForm] = useState(false);
    const [newBroadcast, setNewBroadcast] = useState({ title: '', content: '' });
    const [allSessions, setAllSessions] = useState<Session[]>([]);

    const [showTeacherForm, setShowTeacherForm] = useState(false);
    const [editingTeacher, setEditingTeacher] = useState<any>(null);
    const [circleSearchQuery, setCircleSearchQuery] = useState('');
    const [enteringCircleId, setEnteringCircleId] = useState<string | null>(null);
    const [allTeachers, setAllTeachers] = useState<any[]>([]);

    // All students in the management
    const allStudents = useMemo(() => {
        const students: Student[] = [];
        circles.forEach(c => {
            if (c.students) {
                c.students.forEach(s => {
                    students.push({ ...s, circleName: c.circle, circleId: c.id });
                });
            }
        });
        return students;
    }, [circles]);

    const teachers = useMemo(() => {
        const teacherMap = new Map<string, { name: string, gender: string, circleCount: number, circles: string[] }>();
        circles.forEach(c => {
            const name = c.teacher;
            const gender = c.teacherGender;
            if (teacherMap.has(name)) {
                const existing = teacherMap.get(name)!;
                teacherMap.set(name, { 
                    ...existing, 
                    circleCount: existing.circleCount + 1,
                    circles: [...existing.circles, c.circle]
                });
            } else {
                teacherMap.set(name, { name, gender, circleCount: 1, circles: [c.circle] });
            }
        });
        return Array.from(teacherMap.values());
    }, [circles]);

    const handleSaveStudent = async (student: Student) => {
        const circleId = (student as any).circleId;
        if (!circleId) {
            addToast('يرجى اختيار حلقة للطالب', 'error');
            return;
        }
        
        try {
            const circleRef = doc(db, 'circles', circleId);
            const circle = circles.find(c => c.id === circleId);
            if (!circle) return;

            let updatedStudents = [...(circle.students || [])];
            if (editingStudent) {
                updatedStudents = updatedStudents.map(s => s.id === student.id ? student : s);
            } else {
                const newStudent = {
                    ...student,
                    id: generateStudentId(),
                    joinDate: new Date().toISOString().split('T')[0],
                    manualPoints: [],
                    isArchived: false
                };
                updatedStudents.push(newStudent);
            }

            await updateDoc(circleRef, { students: updatedStudents });
            addToast(editingStudent ? 'تم تحديث بيانات الطالب' : 'تم إضافة الطالب بنجاح', 'success');
            setShowStudentForm(false);
            setEditingStudent(null);
        } catch (error) {
            console.error("Error saving student:", error);
            addToast('فشل حفظ بيانات الطالب', 'error');
        }
    };

    const handleSaveTeacher = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!navigator.onLine) {
            addToast("يجب الاتصال بالإنترنت لإضافة أو تعديل المعلمين", 'error');
            return;
        }
        const formData = new FormData(e.currentTarget);
        const name = formData.get('name') as string;
        const phone = formData.get('phone') as string;

        try {
            if (editingTeacher && editingTeacher.id) {
                await updateDoc(doc(db, 'teachers', editingTeacher.id), { name, phone });
                addToast('تم تحديث بيانات المعلم', 'success');
            } else {
                await addDoc(collection(db, 'teachers'), {
                    name,
                    phone,
                    managementId,
                    createdAt: Date.now()
                });
                addToast('تم إضافة المعلم بنجاح', 'success');
            }
            setShowTeacherForm(false);
            setEditingTeacher(null);
        } catch (error) {
            addToast('فشل حفظ بيانات المعلم', 'error');
        }
    };

    const handleDeleteTeacher = async (teacherId: string) => {
        if (!navigator.onLine) {
            addToast("يجب الاتصال بالإنترنت لحذف المعلمين", 'error');
            return;
        }
        if (!window.confirm('هل أنت متأكد من حذف هذا المعلم؟')) return;
        try {
            await deleteDoc(doc(db, 'teachers', teacherId));
            addToast('تم حذف المعلم بنجاح', 'success');
        } catch (error) {
            addToast('فشل حذف المعلم', 'error');
        }
    };

    const handleDeleteBroadcast = async (id: string) => {
        if (!navigator.onLine) {
            addToast("يجب الاتصال بالإنترنت لحذف الرسائل", 'error');
            return;
        }
        if (!window.confirm('هل أنت متأكد من حذف هذه الرسالة؟')) return;
        try {
            await deleteDoc(doc(db, 'broadcasts', id));
            addToast('تم حذف الرسالة بنجاح', 'success');
        } catch (error) {
            addToast('فشل حذف الرسالة', 'error');
        }
    };

    const [editingBroadcastId, setEditingBroadcastId] = useState<string | null>(null);
    const [showArchivedStudents, setShowArchivedStudents] = useState(false);
    const [teacherPermissions, setTeacherPermissions] = useState({
        canAddStudents: true,
        canEditStudents: true,
        canCreateSessions: true,
        canEditSessions: true
    });

    const handleEditBroadcast = (broadcast: Broadcast) => {
        setNewBroadcast({ title: broadcast.title, content: broadcast.content });
        setEditingBroadcastId(broadcast.id);
        setShowBroadcastForm(true);
    };

    useEffect(() => {
        if (!managementId) return;

        const qTeachers = query(collection(db, 'teachers'), where('managementId', '==', managementId));
        const unsubscribeTeachers = onSnapshot(qTeachers, (snapshot) => {
            setAllTeachers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        return () => unsubscribeTeachers();
    }, [managementId]);

    const handleSaveCircle = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!navigator.onLine) {
            addToast("يجب الاتصال بالإنترنت لإدارة الحلقات", 'error');
            return;
        }
        const formData = new FormData(e.currentTarget);
        const circleName = formData.get('circleName') as string;
        const teacherName = formData.get('teacherName') as string;
        const circleTime = formData.get('circleTime') as string;

        try {
            if (editingCircle) {
                const circleRef = doc(db, 'circles', editingCircle.id);
                await updateDoc(circleRef, {
                    circle: circleName,
                    teacher: teacherName,
                    time: circleTime
                });
                addToast('تم تحديث بيانات الحلقة', 'success');
            } else {
                const newCircle = {
                    circle: circleName,
                    teacher: teacherName,
                    time: circleTime,
                    center: management?.name || 'المركز',
                    managementId: managementId,
                    createdAt: Date.now(),
                    numericId: generateNumericId().toString(),
                    transferCode: generateTransferCode(),
                    students: [],
                    sessions: [],
                    settings: { theme: 'light' },
                    authorizedUserIds: [userProfile.uid],
                    lastUpdated: Date.now()
                };
                await addDoc(collection(db, 'circles'), newCircle);
                addToast('تم إنشاء الحلقة بنجاح', 'success');
            }
            setShowCircleForm(false);
            setEditingCircle(null);
        } catch (error) {
            console.error("Error saving circle:", error);
            addToast('فشل حفظ بيانات الحلقة', 'error');
        }
    };

    const handleUpdateProfile = async () => {
        if (!profileName.trim()) return;
        if (!navigator.onLine) {
            addToast("يجب الاتصال بالإنترنت لتحديث الملف الشخصي", 'error');
            return;
        }
        try {
            await updateDoc(doc(db, 'users', userProfile.uid), {
                displayName: profileName
            });
            addToast('تم تحديث الملف الشخصي بنجاح', 'success');
            setIsEditingProfile(false);
        } catch (error) {
            addToast('فشل تحديث الملف الشخصي', 'error');
        }
    };

    const handleTogglePermission = async (key: string, value: boolean) => {
        if (!navigator.onLine) {
            addToast("يجب الاتصال بالإنترنت لتغيير صلاحيات المعلمين", 'error');
            return;
        }
        try {
            const newPermissions = { ...teacherPermissions, [key]: !value };
            setTeacherPermissions(newPermissions);
            if (managementId) {
                await updateDoc(doc(db, 'managements', managementId), {
                    'settings.teacherPermissions': newPermissions
                });
                addToast('تم تحديث الصلاحيات بنجاح', 'success');
            }
        } catch (error) {
            addToast('فشل تحديث الصلاحيات', 'error');
            // Revert state if failed
            setTeacherPermissions(teacherPermissions);
        }
    };

    useEffect(() => {
        if (management?.settings?.teacherPermissions) {
            setTeacherPermissions(management.settings.teacherPermissions);
        }
    }, [management]);

    useEffect(() => {
        if (!managementId) return;

        const unsubscribeMgmt = onSnapshot(doc(db, 'managements', managementId), (doc) => {
            if (doc.exists()) {
                const data = doc.data() as Management;
                setManagement(data);
                if (data.settings?.teacherPermissions) {
                    setTeacherPermissions(data.settings.teacherPermissions);
                }
            }
            setIsLoading(false);
        });

        const qRequests = query(collection(db, 'managementRequests'), where('managementId', '==', managementId));
        const unsubscribeRequests = onSnapshot(qRequests, (snapshot) => {
            setRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ManagementRequest)));
        });

        const qBroadcasts = query(collection(db, 'broadcasts'), where('managementId', '==', managementId));
        const unsubscribeBroadcasts = onSnapshot(qBroadcasts, (snapshot) => {
            setBroadcasts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Broadcast)).sort((a, b) => b.createdAt - a.createdAt));
        });

        const qLogs = query(collection(db, 'auditLogs'), where('managementId', '==', managementId));
        const unsubscribeLogs = onSnapshot(qLogs, (snapshot) => {
            setLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AuditLog)).sort((a, b) => b.createdAt - a.createdAt));
        });

        const qCircles = query(collection(db, 'circles'), where('managementId', '==', managementId));
        const unsubscribeCircles = onSnapshot(qCircles, (snapshot) => {
            const circlesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CircleData));
            setCircles(circlesData);
            
            // Collect all sessions from all circles
            const sessions: Session[] = [];
            circlesData.forEach(c => {
                if (c.sessions) sessions.push(...c.sessions);
            });
            setAllSessions(sessions);
        });

        return () => {
            unsubscribeMgmt();
            unsubscribeRequests();
            unsubscribeBroadcasts();
            unsubscribeLogs();
            unsubscribeCircles();
        };
    }, [managementId]);

    const handleSync = async () => {
        if (!navigator.onLine) {
            addToast('يجب الاتصال بالإنترنت للمزامنة اليدوية', 'error');
            return;
        }
        // In a real app, this might trigger a re-fetch or background sync
    };

    const handleAcceptRequest = async (request: ManagementRequest) => {
        if (!navigator.onLine) {
            addToast("يجب الاتصال بالإنترنت لقبول الطلبات", 'error');
            return;
        }
        try {
            await updateDoc(doc(db, 'managementRequests', request.id), { status: 'accepted' });
            for (const circleId of request.circleIds) {
                await updateDoc(doc(db, 'circles', circleId), { 
                    managementId,
                    center: management?.name || 'إدارة مرتبطة'
                });
            }
            await updateDoc(doc(db, 'users', request.teacherId), { managementId });
            await addDoc(collection(db, 'auditLogs'), {
                managementId,
                action: 'قبول طلب انضمام',
                actorId: userProfile.uid,
                actorName: userProfile.displayName,
                details: `تم قبول انضمام المعلم ${request.teacherEmail} مع ${request.circleIds.length} حلقة`,
                createdAt: Date.now()
            });
            addToast('تم قبول الطلب بنجاح', 'success');
        } catch (error) {
            addToast('فشل قبول الطلب', 'error');
        }
    };

    const handleRejectRequest = async (request: ManagementRequest) => {
        if (!navigator.onLine) {
            addToast("يجب الاتصال بالإنترنت لرفض الطلبات", 'error');
            return;
        }
        try {
            await updateDoc(doc(db, 'managementRequests', request.id), { status: 'rejected' });
            addToast('تم رفض الطلب', 'info');
        } catch (error) {
            addToast('فشل رفض الطلب', 'error');
        }
    };

    const handleDeleteCircle = async (circleId: string) => {
        if (!navigator.onLine) {
            addToast("يجب الاتصال بالإنترنت لحذف الحلقات", 'error');
            return;
        }
        if (!window.confirm('هل أنت متأكد من حذف هذه الحلقة؟ سيتم حذف جميع بياناتها.')) return;
        try {
            await deleteDoc(doc(db, 'circles', circleId));
            addToast('تم حذف الحلقة بنجاح', 'success');
        } catch (error) {
            addToast('فشل حذف الحلقة', 'error');
        }
    };

    const handleShareReport = (student: Student) => {
        const options = {
            period: 'all_time',
            content: {
                summary: true,
                attendance: true,
                lateness: true,
                absence: true,
                excused: true,
                lessons: true,
                recitationDetails: true
            }
        };
        const circle = circles.find(c => c.id === student.circleId);
        const report = generateStudentReportText(student, allSessions, new Date().toISOString(), options, circle?.settings.pointsSettings);
        const reportText = report.reportContent;
        
        if (navigator.share) {
            navigator.share({
                title: `تقرير الطالب: ${student.name}`,
                text: reportText
            }).catch(console.error);
        } else {
            navigator.clipboard.writeText(reportText);
            addToast('تم نسخ التقرير للحافظة');
        }
    };

    const handleCreateBroadcast = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newBroadcast.title || !newBroadcast.content) return;
        try {
            if (editingBroadcastId) {
                await updateDoc(doc(db, 'broadcasts', editingBroadcastId), {
                    title: newBroadcast.title,
                    content: newBroadcast.content,
                    updatedAt: Date.now()
                });
                addToast('تم تحديث الرسالة بنجاح', 'success');
            } else {
                await addDoc(collection(db, 'broadcasts'), {
                    managementId,
                    title: newBroadcast.title,
                    content: newBroadcast.content,
                    authorId: userProfile.uid,
                    createdAt: Date.now()
                });
                addToast('تم إرسال الرسالة بنجاح', 'success');
            }
            
            await addDoc(collection(db, 'auditLogs'), {
                managementId,
                action: editingBroadcastId ? 'تعديل رسالة عامة' : 'إرسال رسالة عامة',
                actorId: userProfile.uid,
                actorName: userProfile.displayName,
                details: `تم ${editingBroadcastId ? 'تعديل' : 'إرسال'} رسالة بعنوان: ${newBroadcast.title}`,
                createdAt: Date.now()
            });
            setNewBroadcast({ title: '', content: '' });
            setEditingBroadcastId(null);
            setShowBroadcastForm(false);
        } catch (error) {
            addToast('فشل العملية', 'error');
        }
    };

    const todayDate = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
    const hijriDate = "1447-10-23"; // Mock Hijri date for design accuracy

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#4A7C6A]"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F5F5F5] pb-20 font-sans" dir="rtl">
            {/* Header - More Compact */}
            <header className="bg-[#4A7C6A] text-white p-4 rounded-b-[30px] shadow-md relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-12 -mt-12"></div>
                <div className="relative z-10 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-[#D4C4B5]/30 rounded-full flex items-center justify-center border border-white/20">
                            <UserIcon size={20} className="text-[#D4C4B5]" />
                        </div>
                        <div>
                            <p className="text-[10px] opacity-80">أهلاً بك</p>
                            <h1 className="text-sm font-bold truncate max-w-[120px]">{userProfile.displayName}</h1>
                        </div>
                    </div>
                    <div className="text-left">
                        <p className="text-[10px] opacity-80 flex items-center gap-1 justify-end">
                            {todayDate}
                        </p>
                        <p className="text-xs font-bold">{hijriDate}</p>
                    </div>
                </div>
            </header>

            <main className="p-4 space-y-4">
                {activeTab === 'home' && (
                    <div className="space-y-4">
                        {/* Stats Grid - Enhanced */}
                        <div className="grid grid-cols-2 gap-2">
                            <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-50 flex items-center gap-2">
                                <div className="w-8 h-8 bg-[#4A7C6A]/10 rounded-lg flex items-center justify-center text-[#4A7C6A]">
                                    <Users size={16} />
                                </div>
                                <div>
                                    <p className="text-base font-bold text-[#4A7C6A]">{circles.length}</p>
                                    <p className="text-[9px] text-gray-400">إجمالي الحلقات</p>
                                </div>
                            </div>
                            <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-50 flex items-center gap-2">
                                <div className="w-8 h-8 bg-[#D4C4B5]/20 rounded-lg flex items-center justify-center text-[#4A7C6A]">
                                    <UserIcon size={16} />
                                </div>
                                <div>
                                    <p className="text-base font-bold text-[#4A7C6A]">{allStudents.length}</p>
                                    <p className="text-[9px] text-gray-400">إجمالي الطلاب</p>
                                </div>
                            </div>
                            <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-50 flex items-center gap-2">
                                <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
                                    <Award size={16} />
                                </div>
                                <div>
                                    <p className="text-base font-bold text-blue-600 truncate max-w-[80px]">
                                        {circles.length > 0 ? [...circles].sort((a,b) => (b.students?.length || 0) - (a.students?.length || 0))[0].circle : '-'}
                                    </p>
                                    <p className="text-[9px] text-gray-400">الأكثر عدداً</p>
                                </div>
                            </div>
                            <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-50 flex items-center gap-2">
                                <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center text-orange-600">
                                    <TrendingUp size={16} />
                                </div>
                                <div>
                                    <p className="text-base font-bold text-orange-600">
                                        {allStudents.filter(s => s.level === 'ممتاز').length}
                                    </p>
                                    <p className="text-[9px] text-gray-400">المتميزون</p>
                                </div>
                            </div>
                        </div>

                        {/* Management Actions - Functional */}
                        <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-50">
                            <h3 className="text-xs font-bold text-gray-400 mb-3 px-1">إدارة المركز</h3>
                            <div className="grid grid-cols-3 gap-3">
                                <button 
                                    onClick={() => setActiveSubView('requests')}
                                    className="flex flex-col items-center gap-2 p-3 rounded-2xl hover:bg-gray-50 transition-all relative"
                                >
                                    <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-500">
                                        <Bell size={24} />
                                    </div>
                                    <span className="text-[10px] font-bold">الطلبات</span>
                                    {requests.filter(r => r.status === 'pending').length > 0 && (
                                        <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
                                    )}
                                </button>
                                <button 
                                    onClick={() => setActiveSubView('broadcasts')}
                                    className="flex flex-col items-center gap-2 p-3 rounded-2xl hover:bg-gray-50 transition-all"
                                >
                                    <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500">
                                        <Megaphone size={24} />
                                    </div>
                                    <span className="text-[10px] font-bold">الرسائل</span>
                                </button>
                                <button 
                                    onClick={() => setActiveSubView('logs')}
                                    className="flex flex-col items-center gap-2 p-3 rounded-2xl hover:bg-gray-50 transition-all"
                                >
                                    <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-500">
                                        <History size={24} />
                                    </div>
                                    <span className="text-[10px] font-bold">السجل</span>
                                </button>
                            </div>
                        </div>

                        {/* Invitation Code Card - Compact */}
                        <div className="bg-gradient-to-br from-[#4A7C6A] to-[#3A6355] p-4 rounded-3xl text-white shadow-lg relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16"></div>
                            <div className="relative z-10">
                                <h3 className="text-xs font-bold opacity-80 mb-2">كود الانضمام للمركز</h3>
                                <div className="flex items-center justify-between bg-white/10 p-3 rounded-2xl border border-white/10">
                                    <span className="text-xl font-mono font-bold tracking-widest">{management?.invitationCode}</span>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => {
                                                navigator.clipboard.writeText(management?.invitationCode || '');
                                                addToast('تم نسخ الكود بنجاح');
                                            }}
                                            className="p-2 bg-white/20 rounded-xl hover:bg-white/30 transition-all"
                                        >
                                            <Copy size={16} />
                                        </button>
                                        <button className="p-2 bg-white/20 rounded-xl hover:bg-white/30 transition-all">
                                            <QrCode size={16} />
                                        </button>
                                    </div>
                                </div>
                                <p className="text-[9px] mt-3 opacity-70">شارك هذا الكود مع المعلمين ليتمكنوا من طلب الانضمام لمركزك.</p>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'students' && (
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <div className="relative flex-grow">
                                <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                <input 
                                    type="text" 
                                    placeholder="بحث عن طالب..." 
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-white border border-gray-100 rounded-xl py-2 pr-10 pl-4 text-sm outline-none focus:ring-2 focus:ring-[#4A7C6A]/20"
                                />
                            </div>
                            <button 
                                onClick={() => { setEditingStudent(null); setShowStudentForm(true); }}
                                className="bg-[#4A7C6A] text-white p-2.5 rounded-xl shadow-sm hover:bg-[#3A6355] transition-colors"
                            >
                                <UserPlus size={20} />
                            </button>
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                            {allStudents.filter(s => s.name.includes(searchQuery)).map((student, idx) => (
                                <div 
                                    key={idx} 
                                    className="bg-white p-3 rounded-2xl shadow-sm flex items-center justify-between border border-gray-50 hover:border-[#4A7C6A]/30 transition-all"
                                >
                                    <div 
                                        onClick={() => setViewingStudent(student)}
                                        className="flex items-center gap-3 flex-grow cursor-pointer"
                                    >
                                        <span className="text-[10px] text-gray-400 font-mono w-4">{idx + 1}</span>
                                        <div className="w-10 h-10 bg-[#D4C4B5]/10 rounded-xl flex items-center justify-center text-[#4A7C6A]">
                                            <UserIcon size={20} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-sm text-gray-800">{student.name}</h4>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-[9px] bg-gray-50 text-gray-500 px-2 py-0.5 rounded-full border border-gray-100">
                                                    {student.circleName}
                                                </span>
                                                <span className="text-[9px] text-[#4A7C6A] font-bold">
                                                    المستوى: {student.level || 'مبتدئ'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button 
                                            onClick={() => setViewingStudent(student)}
                                            className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                            title="بطاقة الطالب"
                                        >
                                            <QrCode size={16} />
                                        </button>
                                        <button 
                                            onClick={() => { setEditingStudent(student); setShowStudentForm(true); }}
                                            className="p-2 text-gray-400 hover:text-[#4A7C6A] rounded-lg transition-colors"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <ChevronLeft size={16} className="text-gray-300" />
                                    </div>
                                </div>
                            ))}
                            {allStudents.length === 0 && (
                                <div className="text-center py-20 text-gray-400">لا يوجد طلاب حالياً</div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'circles' && (
                    <div>
                        {enteringCircleId ? (
                            <div className="fixed inset-0 bg-white z-[300] flex flex-col">
                                <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-[#4A7C6A] text-white">
                                    <div className="flex items-center gap-3">
                                        <button onClick={() => setEnteringCircleId(null)} className="p-1 hover:bg-white/20 rounded-full">
                                            <ChevronRight size={24} />
                                        </button>
                                        <div>
                                            <h3 className="font-bold text-sm">وضع الإدارة: {circles.find(c => c.id === enteringCircleId)?.circle}</h3>
                                            <p className="text-[10px] opacity-80">أنت الآن تتصفح كمعلم (جميع الإجراءات مسجلة باسمك كمدير)</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => setEnteringCircleId(null)}
                                        className="bg-white/20 px-3 py-1 rounded-lg text-xs font-bold"
                                    >
                                        إنهاء الجلسة
                                    </button>
                                </div>
                                <div className="flex-grow overflow-y-auto p-4 bg-gray-50">
                                    {/* Simplified Teacher View for Admin */}
                                    <div className="space-y-4">
                                        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                                            <h4 className="font-bold text-gray-800 mb-3">إجراءات سريعة</h4>
                                            <div className="grid grid-cols-2 gap-2">
                                                <button className="bg-gray-50 p-3 rounded-xl text-xs font-bold text-gray-600 flex flex-col items-center gap-2">
                                                    <UserPlus size={18} /> إضافة طالب
                                                </button>
                                                <button className="bg-gray-50 p-3 rounded-xl text-xs font-bold text-gray-600 flex flex-col items-center gap-2">
                                                    <Plus size={18} /> إنشاء جلسة
                                                </button>
                                            </div>
                                        </div>
                                        
                                        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                                            <h4 className="font-bold text-gray-800 mb-3">طلاب الحلقة</h4>
                                            <div className="space-y-2">
                                                {circles.find(c => c.id === enteringCircleId)?.students?.map((student, idx) => (
                                                    <div key={idx} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg">
                                                        <span className="text-sm text-gray-700">{student.name}</span>
                                                        <ChevronLeft size={14} className="text-gray-300" />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : selectedCircleId ? (
                            <div className="space-y-3">
                                <button 
                                    onClick={() => setSelectedCircleId(null)}
                                    className="flex items-center gap-2 text-[#4A7C6A] font-bold text-sm mb-2"
                                >
                                    <ChevronRight size={18} />
                                    العودة للحلقات
                                </button>
                                <div className="bg-white p-4 rounded-2xl border border-gray-50 mb-4 flex justify-between items-center">
                                    <div>
                                        <h3 className="font-bold text-gray-800">{circles.find(c => c.id === selectedCircleId)?.circle}</h3>
                                        <p className="text-xs text-gray-500">المعلم: {circles.find(c => c.id === selectedCircleId)?.teacher}</p>
                                    </div>
                                    <button 
                                        className="bg-[#4A7C6A] text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm"
                                        onClick={() => {
                                            const circle = circles.find(c => c.id === selectedCircleId);
                                            if (circle) {
                                                setEnteringCircleId(circle.id);
                                                addToast(`جاري الدخول لحلقة ${circle.circle} كمسؤول...`, 'info');
                                                
                                                // Log the entry
                                                addDoc(collection(db, 'auditLogs'), {
                                                    managementId,
                                                    action: 'دخول حلقة كمعلم',
                                                    actorId: userProfile.uid,
                                                    actorName: userProfile.displayName,
                                                    details: `قام المدير بالدخول إلى حلقة: ${circle.circle}`,
                                                    createdAt: Date.now()
                                                });
                                            }
                                        }}
                                    >
                                        دخول كمعلم
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 gap-2">
                                    {circles.find(c => c.id === selectedCircleId)?.students?.map((student, idx) => (
                                        <div 
                                            key={idx} 
                                            onClick={() => setViewingStudent({...student, circleName: circles.find(c => c.id === selectedCircleId)?.circle})}
                                            className="bg-white p-3 rounded-2xl shadow-sm flex items-center justify-between border border-gray-50 cursor-pointer"
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className="text-[10px] text-gray-400 font-mono w-4">{idx + 1}</span>
                                                <div className="w-9 h-9 bg-[#D4C4B5]/10 rounded-xl flex items-center justify-center text-[#4A7C6A]">
                                                    <UserIcon size={18} />
                                                </div>
                                                <h4 className="font-bold text-sm text-gray-800">{student.name}</h4>
                                            </div>
                                            <ChevronLeft size={16} className="text-gray-300" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="relative flex-grow">
                                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                        <input 
                                            type="text" 
                                            placeholder="بحث عن حلقة..." 
                                            value={circleSearchQuery}
                                            onChange={(e) => setCircleSearchQuery(e.target.value)}
                                            className="w-full bg-white border border-gray-100 rounded-xl py-2 pr-10 pl-4 text-sm outline-none focus:ring-2 focus:ring-[#4A7C6A]/20"
                                        />
                                    </div>
                                    <button 
                                        onClick={() => { setEditingCircle(null); setShowCircleForm(true); }}
                                        className="bg-[#4A7C6A] text-white p-2.5 rounded-xl shadow-sm"
                                    >
                                        <Plus size={20} />
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 gap-3">
                                    {circles.filter(c => c.circle.includes(circleSearchQuery)).map((circle) => (
                                        <div 
                                            key={circle.id} 
                                            className="bg-white p-4 rounded-2xl shadow-sm border border-gray-50 flex items-center justify-between"
                                        >
                                            <div 
                                                onClick={() => setSelectedCircleId(circle.id)}
                                                className="flex-grow cursor-pointer"
                                            >
                                                <h4 className="font-bold text-gray-800">{circle.circle}</h4>
                                                <div className="flex items-center gap-3 mt-1">
                                                    <p className="text-[10px] text-gray-500 flex items-center gap-1">
                                                        <UserTie size={10} />
                                                        {circle.teacher}
                                                    </p>
                                                    <p className="text-[10px] text-gray-500 flex items-center gap-1">
                                                        <UserIcon size={10} />
                                                        {circle.students?.length || 0} طالب
                                                    </p>
                                                    {circle.time && (
                                                        <p className="text-[10px] text-[#4A7C6A] font-bold flex items-center gap-1">
                                                            <Calendar size={10} />
                                                            {circle.time}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button 
                                                    onClick={() => {setEditingCircle(circle); setShowCircleForm(true);}}
                                                    className="p-2 text-gray-400 hover:text-blue-500"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button 
                                                    onClick={() => handleDeleteCircle(circle.id)}
                                                    className="p-2 text-gray-300 hover:text-red-500"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                                <ChevronLeft size={18} className="text-gray-300" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'teachers' && (
                    <div className="space-y-3">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-sm font-bold text-gray-600">قائمة المعلمين</h3>
                            <button 
                                onClick={() => { setEditingTeacher(null); setShowTeacherForm(true); }}
                                className="bg-[#4A7C6A] text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2"
                            >
                                <Plus size={16} /> إضافة معلم
                            </button>
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                            {allTeachers.map((teacher, idx) => (
                                <div key={idx} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-50 flex justify-between items-center">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                                            <UserTie size={24} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-800">{teacher.name}</h4>
                                            <p className="text-xs text-gray-500">{teacher.gender === 'male' ? 'معلم' : 'معلمة'} • {teacher.phone || 'بدون رقم'}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => { setEditingTeacher(teacher); setShowTeacherForm(true); }}
                                            className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"
                                        >
                                            <Edit2 size={18} />
                                        </button>
                                        <button 
                                            onClick={() => handleDeleteTeacher(teacher.id)}
                                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {allTeachers.length === 0 && (
                                <div className="text-center py-20 text-gray-400">لا يوجد معلمين مضافين حالياً</div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'settings' && (
                    <div className="space-y-4">
                        <div className="bg-white p-6 rounded-[30px] shadow-sm text-center border border-gray-50">
                            <div className="w-20 h-20 bg-[#D4C4B5]/20 rounded-full flex items-center justify-center mx-auto mb-3 border-4 border-[#F5F5F5]">
                                <UserIcon size={40} className="text-[#D4C4B5]" />
                            </div>
                            {isEditingProfile ? (
                                <div className="space-y-2">
                                    <input 
                                        type="text" 
                                        value={profileName}
                                        onChange={(e) => setProfileName(e.target.value)}
                                        className="w-full text-center bg-gray-50 border border-gray-100 rounded-xl py-2 px-4 outline-none focus:ring-2 focus:ring-[#4A7C6A] font-bold"
                                    />
                                    <div className="flex gap-2">
                                        <button onClick={handleUpdateProfile} className="flex-1 bg-[#4A7C6A] text-white py-2 rounded-xl text-xs font-bold">حفظ</button>
                                        <button onClick={() => setIsEditingProfile(false)} className="flex-1 bg-gray-100 text-gray-500 py-2 rounded-xl text-xs font-bold">إلغاء</button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <h2 className="text-lg font-bold text-[#4A7C6A]">{userProfile.displayName}</h2>
                                    <p className="text-[10px] text-gray-400 mb-2">{userProfile.email}</p>
                                    <button onClick={() => setIsEditingProfile(true)} className="text-[10px] text-blue-500 font-bold">تعديل الاسم</button>
                                </>
                            )}
                        </div>

                        <div className="bg-white rounded-3xl shadow-sm overflow-hidden border border-gray-50">
                            <button 
                                onClick={() => setShowArchivedStudents(!showArchivedStudents)}
                                className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors border-b border-gray-50"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 bg-gray-50 rounded-full flex items-center justify-center text-gray-500">
                                        <History size={18} />
                                    </div>
                                    <span className="font-bold text-sm text-gray-700">الطلاب المؤرشفين</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded-full">{allStudents.filter(s => s.isArchived).length}</span>
                                    <ChevronLeft size={18} className={`text-gray-300 transition-transform ${showArchivedStudents ? '-rotate-90' : ''}`} />
                                </div>
                            </button>
                            
                            {showArchivedStudents && (
                                <div className="bg-gray-50 p-2 space-y-1">
                                    {allStudents.filter(s => s.isArchived).map((student, idx) => (
                                        <div key={idx} className="bg-white p-3 rounded-xl flex justify-between items-center text-xs">
                                            <span>{student.name} ({student.circleName})</span>
                                            <button 
                                                onClick={async () => {
                                                    try {
                                                        const circleRef = doc(db, 'circles', student.circleId);
                                                        const circleSnap = await getDoc(circleRef);
                                                        if (circleSnap.exists()) {
                                                            const circleData = circleSnap.data() as CircleData;
                                                            const updatedStudents = circleData.students.map(s => 
                                                                s.id === student.id ? { ...s, isArchived: false } : s
                                                            );
                                                            await updateDoc(circleRef, { students: updatedStudents });
                                                            addToast('تم استعادة الطالب بنجاح', 'success');
                                                        }
                                                    } catch (error) {
                                                        console.error("Error restoring student:", error);
                                                        addToast('فشل استعادة الطالب', 'error');
                                                    }
                                                }}
                                                className="text-[#4A7C6A] font-bold"
                                            >
                                                استعادة
                                            </button>
                                        </div>
                                    ))}
                                    {allStudents.filter(s => s.isArchived).length === 0 && (
                                        <p className="text-[10px] text-gray-400 text-center py-4">لا يوجد طلاب مؤرشفين</p>
                                    )}
                                </div>
                            )}

                            <div className="p-4 border-b border-gray-50">
                                <h4 className="text-xs font-bold text-gray-400 mb-3">المظهر</h4>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 bg-yellow-50 rounded-full flex items-center justify-center text-yellow-600">
                                            <Sun size={18} />
                                        </div>
                                        <span className="text-xs text-gray-700">الوضع الليلي</span>
                                    </div>
                                    <button 
                                        onClick={() => addToast('سيتم توفير الوضع الليلي قريباً في تحديث قادم', 'info')}
                                        className="w-10 h-5 rounded-full bg-gray-200 relative"
                                    >
                                        <div className="absolute top-1 right-1 w-3 h-3 bg-white rounded-full"></div>
                                    </button>
                                </div>
                            </div>

                            <div className="p-4 border-b border-gray-50">
                                <h4 className="text-xs font-bold text-gray-400 mb-3">صلاحيات المعلمين</h4>
                                <div className="space-y-3">
                                    {Object.entries(teacherPermissions)
                                        .filter(([key]) => ['canAddStudents', 'canEditStudents', 'canCreateSessions', 'canEditSessions'].includes(key))
                                        .map(([key, value]) => (
                                        <div key={key} className="flex items-center justify-between">
                                            <span className="text-xs text-gray-700">
                                                {key === 'canAddStudents' ? 'إضافة طلاب' :
                                                 key === 'canEditStudents' ? 'تعديل بيانات الطلاب' :
                                                 key === 'canCreateSessions' ? 'إنشاء جلسات' : 'تعديل الجلسات'}
                                            </span>
                                            <button 
                                                onClick={() => handleTogglePermission(key, value)}
                                                className={`w-10 h-5 rounded-full transition-colors relative ${value ? 'bg-[#4A7C6A]' : 'bg-gray-200'}`}
                                            >
                                                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${value ? 'right-6' : 'right-1'}`}></div>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <button 
                                onClick={handleSync}
                                className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors border-b border-gray-50"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 bg-green-50 rounded-full flex items-center justify-center text-green-500">
                                        <RefreshCw size={18} />
                                    </div>
                                    <span className="font-bold text-sm text-gray-700">مزامنة البيانات</span>
                                </div>
                                <ChevronLeft size={18} className="text-gray-300" />
                            </button>
                            <button 
                                onClick={() => setActiveSubView('about')}
                                className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors border-b border-gray-50"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 bg-purple-50 rounded-full flex items-center justify-center text-purple-500">
                                        <Info size={18} />
                                    </div>
                                    <span className="font-bold text-sm text-gray-700">من نحن</span>
                                </div>
                                <ChevronLeft size={18} className="text-gray-300" />
                            </button>
                            <button 
                                onClick={onLogout}
                                className="w-full p-4 flex items-center justify-between hover:bg-red-50 transition-colors text-red-500"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 bg-red-50 rounded-full flex items-center justify-center">
                                        <LogOut size={18} />
                                    </div>
                                    <span className="font-bold text-sm">تسجيل الخروج</span>
                                </div>
                                <ChevronLeft size={18} className="opacity-50" />
                            </button>
                        </div>
                    </div>
                )}
            </main>

            {/* Sub-Views Overlay */}
            <AnimatePresence>
                {activeSubView !== 'none' && (
                    <motion.div 
                        initial={{ opacity: 0, x: '100%' }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: '100%' }}
                        className="fixed inset-0 bg-[#F5F5F5] z-50 overflow-y-auto p-4"
                    >
                        <div className="flex items-center gap-4 mb-6">
                            <button 
                                onClick={() => setActiveSubView('none')}
                                className="w-9 h-9 bg-white rounded-full flex items-center justify-center shadow-sm"
                            >
                                <ChevronLeft size={20} className="rotate-180" />
                            </button>
                            <h2 className="text-lg font-bold text-[#4A7C6A]">
                                {activeSubView === 'requests' ? 'طلبات الانضمام' : 
                                 activeSubView === 'broadcasts' ? 'الرسائل العامة' : 
                                 activeSubView === 'logs' ? 'سجل النشاطات' :
                                 activeSubView === 'profile' ? 'إعدادات الحساب' : 'عن التطبيق'}
                            </h2>
                        </div>

                        {activeSubView === 'requests' && (
                            <div className="space-y-3">
                                {requests.length === 0 ? (
                                    <div className="text-center py-20 text-gray-400">لا توجد طلبات معلقة</div>
                                ) : (
                                    requests.map(request => (
                                        <div key={request.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-50">
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <h4 className="font-bold text-sm text-gray-800">{request.teacherEmail}</h4>
                                                    <p className="text-[10px] text-gray-500">يريد ربط {request.circleIds.length} حلقة</p>
                                                </div>
                                                <span className={`text-[9px] px-2 py-1 rounded-full font-bold ${
                                                    request.status === 'pending' ? 'bg-orange-100 text-orange-600' :
                                                    request.status === 'accepted' ? 'bg-green-100 text-green-600' :
                                                    'bg-red-100 text-red-600'
                                                }`}>
                                                    {request.status === 'pending' ? 'معلق' : request.status === 'accepted' ? 'مقبول' : 'مرفوض'}
                                                </span>
                                            </div>
                                            {request.status === 'pending' && (
                                                <div className="flex gap-2">
                                                    <button 
                                                        onClick={() => handleAcceptRequest(request)}
                                                        className="flex-1 bg-[#4A7C6A] text-white py-2 rounded-xl text-xs font-bold"
                                                    >
                                                        قبول
                                                    </button>
                                                    <button 
                                                        onClick={() => handleRejectRequest(request)}
                                                        className="flex-1 bg-red-50 text-red-500 py-2 rounded-xl text-xs font-bold"
                                                    >
                                                        رفض
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {activeSubView === 'broadcasts' && (
                            <div className="space-y-4">
                                <button 
                                    onClick={() => setShowBroadcastForm(true)}
                                    className="w-full bg-[#4A7C6A] text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-md text-sm"
                                >
                                    <Plus size={18} /> إرسال رسالة جديدة
                                </button>

                                {showBroadcastForm && (
                                    <motion.form 
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        onSubmit={handleCreateBroadcast}
                                        className="bg-white p-4 rounded-2xl shadow-lg space-y-3 border border-gray-100"
                                    >
                                        <input 
                                            type="text"
                                            placeholder="عنوان الرسالة"
                                            value={newBroadcast.title}
                                            onChange={(e) => setNewBroadcast(prev => ({ ...prev, title: e.target.value }))}
                                            className="w-full bg-gray-50 border border-gray-100 rounded-xl py-2 px-4 outline-none focus:ring-2 focus:ring-[#4A7C6A] text-sm"
                                            required
                                        />
                                        <textarea 
                                            placeholder="محتوى الرسالة..."
                                            value={newBroadcast.content}
                                            onChange={(e) => setNewBroadcast(prev => ({ ...prev, content: e.target.value }))}
                                            className="w-full bg-gray-50 border border-gray-100 rounded-xl py-2 px-4 outline-none focus:ring-2 focus:ring-[#4A7C6A] h-24 resize-none text-sm"
                                            required
                                        />
                                        <div className="flex gap-2">
                                            <button type="submit" className="flex-1 bg-[#4A7C6A] text-white py-2 rounded-xl font-bold text-xs">إرسال</button>
                                            <button type="button" onClick={() => setShowBroadcastForm(false)} className="flex-1 bg-gray-100 text-gray-500 py-2 rounded-xl font-bold text-xs">إلغاء</button>
                                        </div>
                                    </motion.form>
                                )}

                                <div className="space-y-3">
                                    {broadcasts.map(broadcast => (
                                        <div key={broadcast.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-50">
                                            <div className="flex justify-between items-start mb-1">
                                                <h4 className="font-bold text-gray-800 text-sm">{broadcast.title}</h4>
                                                <div className="flex gap-1">
                                                    <button onClick={() => handleEditBroadcast(broadcast)} className="p-1 text-blue-500"><Edit2 size={14}/></button>
                                                    <button onClick={() => handleDeleteBroadcast(broadcast.id)} className="p-1 text-red-500"><Trash2 size={14}/></button>
                                                </div>
                                            </div>
                                            <p className="text-xs text-gray-600 leading-relaxed">{broadcast.content}</p>
                                            <div className="text-[9px] text-gray-400 mt-3 pt-3 border-t border-gray-50">
                                                {new Date(broadcast.createdAt).toLocaleString('ar-SA')}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activeSubView === 'logs' && (
                            <div className="space-y-2">
                                {logs.map(log => (
                                    <div key={log.id} className="bg-white p-3 rounded-xl shadow-sm flex gap-3 items-start border border-gray-50">
                                        <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center text-gray-400 flex-shrink-0">
                                            <History size={14} />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start">
                                                <h5 className="text-xs font-bold text-gray-800">{log.action}</h5>
                                                <span className="text-[8px] text-gray-400">{new Date(log.createdAt).toLocaleTimeString('ar-SA')}</span>
                                            </div>
                                            <p className="text-[10px] text-gray-500 mt-0.5">{log.details}</p>
                                            <p className="text-[9px] text-[#4A7C6A] mt-1 font-bold">أ/ {log.actorName}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {activeSubView === 'profile' && (
                            <div className="space-y-4">
                                <div className="bg-white p-4 rounded-2xl shadow-sm space-y-4">
                                    <div>
                                        <label className="text-[10px] text-gray-400 block mb-1">الاسم الكامل</label>
                                        <input 
                                            type="text" 
                                            defaultValue={userProfile.displayName} 
                                            className="w-full bg-gray-50 border-none rounded-xl py-2 px-4 text-sm font-bold text-gray-700"
                                            readOnly
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-gray-400 block mb-1">البريد الإلكتروني</label>
                                        <input 
                                            type="text" 
                                            defaultValue={userProfile.email} 
                                            className="w-full bg-gray-50 border-none rounded-xl py-2 px-4 text-sm font-bold text-gray-700"
                                            readOnly
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-gray-400 block mb-1">نوع الحساب</label>
                                        <div className="bg-green-50 text-[#4A7C6A] px-4 py-2 rounded-xl text-sm font-bold inline-block">
                                            مدير نظام
                                        </div>
                                    </div>
                                </div>
                                <p className="text-[10px] text-gray-400 text-center px-6">
                                    لتغيير معلومات الحساب، يرجى التواصل مع الدعم الفني للمؤسسة.
                                </p>
                            </div>
                        )}

                        {activeSubView === 'about' && (
                            <div className="space-y-6 text-center pt-10">
                                <div className="w-24 h-24 bg-[#4A7C6A] rounded-3xl flex items-center justify-center mx-auto shadow-xl">
                                    <Building2 size={48} className="text-white" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-[#4A7C6A]">نظام إدارة الحلقات</h3>
                                    <p className="text-sm text-gray-400 mt-1">الإصدار 1.0.0</p>
                                </div>
                                <p className="text-sm text-gray-600 px-8 leading-relaxed">
                                    هذا النظام مصمم لتسهيل إدارة حلقات تحفيظ القرآن الكريم، وربط المعلمين بالإدارات، ومتابعة تقدم الطلاب بشكل احترافي.
                                </p>
                                <div className="pt-10">
                                    <p className="text-[10px] text-gray-400">جميع الحقوق محفوظة © 2026</p>
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Student Form Modal */}
            <AnimatePresence>
                {showStudentForm && (
                    <div className="fixed inset-0 bg-black/50 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
                        <motion.div 
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            className="bg-white w-full max-w-lg rounded-t-[30px] sm:rounded-[30px] max-h-[90vh] overflow-hidden flex flex-col"
                        >
                            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white">
                                <h3 className="font-bold text-[#4A7C6A]">{editingStudent ? 'تعديل بيانات الطالب' : 'إضافة طالب جديد'}</h3>
                                <button onClick={() => setShowStudentForm(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="flex-grow overflow-y-auto p-4 bg-white">
                                <StudentForm 
                                    student={editingStudent} 
                                    onSave={handleSaveStudent} 
                                    onClose={() => setShowStudentForm(false)}
                                    setConfirmationModal={() => {}}
                                    pointsSettings={{ present: 1, late: 1, absent: 0, excused: 1, hasMemorization: 1, noMemorization: 0, suspendedMemorization: 1, hasReview: 1, noReview: 0, suspendedReview: 1 } as any}
                                    addToast={addToast}
                                />
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Circle Form Modal */}
            <AnimatePresence>
                {showCircleForm && (
                    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl"
                        >
                            <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-white text-[#4A7C6A]">
                                <h3 className="font-bold">{editingCircle ? 'تعديل الحلقة' : 'إنشاء حلقة جديدة'}</h3>
                                <button onClick={() => setShowCircleForm(false)} className="p-1 hover:bg-gray-100 rounded-full">
                                    <XCircle size={24} />
                                </button>
                            </div>
                            <form onSubmit={handleSaveCircle} className="p-6 space-y-4 bg-white">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-500 block mr-1">اسم الحلقة</label>
                                    <input 
                                        name="circleName"
                                        defaultValue={editingCircle?.circle}
                                        placeholder="مثال: حلقة عثمان بن عفان"
                                        className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-[#4A7C6A]/20"
                                        required
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-500 block mr-1">اسم المعلم</label>
                                    <input 
                                        name="teacherName"
                                        defaultValue={editingCircle?.teacher}
                                        placeholder="اسم المعلم الرباعي"
                                        className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-[#4A7C6A]/20"
                                        required
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-500 block mr-1">وقت الحلقة</label>
                                    <select 
                                        name="circleTime"
                                        defaultValue={editingCircle?.time || 'المغرب'}
                                        className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-[#4A7C6A]/20"
                                    >
                                        <option value="الفجر">الفجر</option>
                                        <option value="الظهر">الظهر</option>
                                        <option value="العصر">العصر</option>
                                        <option value="المغرب">المغرب</option>
                                        <option value="العشاء">العشاء</option>
                                    </select>
                                </div>
                                <div className="flex gap-3 pt-2">
                                    <button type="submit" className="flex-1 bg-[#4A7C6A] text-white py-3 rounded-xl font-bold shadow-lg shadow-[#4A7C6A]/20">حفظ</button>
                                    <button type="button" onClick={() => setShowCircleForm(false)} className="flex-1 bg-gray-100 text-gray-500 py-3 rounded-xl font-bold">إلغاء</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Teacher Form Modal */}
            <AnimatePresence>
                {showTeacherForm && (
                    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl"
                        >
                            <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-white text-[#4A7C6A]">
                                <h3 className="font-bold">{editingTeacher ? 'تعديل بيانات المعلم' : 'إضافة معلم جديد'}</h3>
                                <button onClick={() => setShowTeacherForm(false)} className="p-1 hover:bg-gray-100 rounded-full">
                                    <XCircle size={24} />
                                </button>
                            </div>
                            <form onSubmit={handleSaveTeacher} className="p-6 space-y-4 bg-white">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-500 block mr-1">اسم المعلم</label>
                                    <input 
                                        name="name"
                                        defaultValue={editingTeacher?.name}
                                        placeholder="الاسم الكامل"
                                        className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-[#4A7C6A]/20"
                                        required
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-500 block mr-1">رقم الهاتف</label>
                                    <input 
                                        name="phone"
                                        defaultValue={editingTeacher?.phone}
                                        placeholder="رقم الواتساب"
                                        className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-[#4A7C6A]/20"
                                    />
                                </div>
                                <div className="flex gap-3 pt-2">
                                    <button type="submit" className="flex-1 bg-[#4A7C6A] text-white py-3 rounded-xl font-bold shadow-lg shadow-[#4A7C6A]/20">حفظ</button>
                                    <button type="button" onClick={() => setShowTeacherForm(false)} className="flex-1 bg-gray-100 text-gray-500 py-3 rounded-xl font-bold">إلغاء</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Student Profile Card Overlay */}
            <AnimatePresence>
                {viewingStudent && (
                    <div className="fixed inset-0 bg-black/60 z-[150] flex items-center justify-center p-0 sm:p-4 backdrop-blur-sm">
                        <motion.div 
                            initial={{ opacity: 0, y: 50 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 50 }}
                            className="bg-white w-full max-w-2xl h-full sm:h-auto sm:max-h-[90vh] sm:rounded-[40px] overflow-hidden flex flex-col relative"
                        >
                            <button 
                                onClick={() => setViewingStudent(null)}
                                className="absolute top-4 left-4 z-[160] w-10 h-10 bg-white/20 backdrop-blur-md text-white rounded-full flex items-center justify-center hover:bg-white/40 transition-all"
                            >
                                <XCircle size={24} />
                            </button>
                            <div className="flex-grow overflow-y-auto">
                                <StudentProfileCard 
                                    studentId={viewingStudent.id}
                                    allStudents={allStudents}
                                    sessions={allSessions}
                                    tests={[]}
                                    studyStartDate={new Date().toISOString()}
                                    onClose={() => setViewingStudent(null)}
                                    circleName={viewingStudent.circleName || ''}
                                    addToast={addToast}
                                    settings={{ theme: 'light' } as any}
                                    pointsSettings={{ present: 1, late: 1, absent: 0, excused: 1, hasMemorization: 1, noMemorization: 0, suspendedMemorization: 1, hasReview: 1, noReview: 0, suspendedReview: 1 } as any}
                                    onOpenShare={() => {}}
                                    onOpenReportGenerator={() => {}}
                                    onAdjustPoints={() => {}}
                                    onOpenPointsLog={() => {}}
                                />
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Bottom Navigation - Fixed and Always Visible */}
            <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-6 py-3 flex items-center justify-between shadow-[0_-4px_20px_rgba(0,0,0,0.08)] z-[200]">
                <button 
                    onClick={() => { setActiveTab('home'); setSelectedCircleId(null); }}
                    className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'home' ? 'text-[#4A7C6A] scale-110' : 'text-gray-300'}`}
                >
                    <Home size={activeTab === 'home' ? 24 : 22} />
                    <span className="text-[10px] font-bold">الرئيسية</span>
                </button>
                <button 
                    onClick={() => { setActiveTab('students'); setSelectedCircleId(null); }}
                    className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'students' ? 'text-[#4A7C6A] scale-110' : 'text-gray-300'}`}
                >
                    <UserIcon size={activeTab === 'students' ? 24 : 22} />
                    <span className="text-[10px] font-bold">الطلاب</span>
                </button>
                <button 
                    onClick={() => { setActiveTab('circles'); setSelectedCircleId(null); }}
                    className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'circles' ? 'text-[#4A7C6A] scale-110' : 'text-gray-300'}`}
                >
                    <Users size={activeTab === 'circles' ? 24 : 22} />
                    <span className="text-[10px] font-bold">الحلقات</span>
                </button>
                <button 
                    onClick={() => { setActiveTab('teachers'); setSelectedCircleId(null); }}
                    className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'teachers' ? 'text-[#4A7C6A] scale-110' : 'text-gray-300'}`}
                >
                    <UserTie size={activeTab === 'teachers' ? 24 : 22} />
                    <span className="text-[10px] font-bold">المعلمين</span>
                </button>
                <button 
                    onClick={() => { setActiveTab('settings'); setSelectedCircleId(null); }}
                    className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'settings' ? 'text-[#4A7C6A] scale-110' : 'text-gray-300'}`}
                >
                    <Settings size={activeTab === 'settings' ? 24 : 22} />
                    <span className="text-[10px] font-bold">الإعدادات</span>
                </button>
            </nav>
        </div>
    );
};

const NavItem: React.FC<{ active: boolean, onClick: () => void, icon: React.ReactNode, label: string }> = ({ active, onClick, icon, label }) => (
    <button 
        onClick={onClick}
        className={`flex flex-col items-center gap-1 transition-all ${active ? 'text-[#4A7C6A]' : 'text-gray-400'}`}
    >
        <div className={`p-1 rounded-lg transition-all ${active ? 'bg-[#4A7C6A]/10' : ''}`}>
            {icon}
        </div>
        <span className={`text-[10px] font-bold ${active ? 'opacity-100' : 'opacity-60'}`}>{label}</span>
        {active && <motion.div layoutId="nav-indicator" className="w-1 h-1 bg-[#4A7C6A] rounded-full" />}
    </button>
);

export default ManagementDashboard;

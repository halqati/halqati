import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FaShieldAlt, FaUserTie, FaChalkboardTeacher, FaUsers, FaUserCheck, FaUserSlash,
    FaCheck, FaTimes, FaSearch, FaArrowRight, FaCog, FaLock, FaTrash,
    FaUserGraduate, FaQuran, FaFileAlt, FaChartBar, FaTrophy, FaCogs,
    FaUserShield, FaUserPlus, FaChevronDown, FaChevronUp, FaInfoCircle, FaUndo, FaCheckDouble, FaExclamationTriangle
} from 'react-icons/fa';
import { CircleData, TeacherPermissions, GranularPermissions } from '../types';
import {
    PERMISSION_CATEGORIES,
    ROLE_LABELS,
    defaultRolePermissions,
    getResolvedGranularPermissions
} from '../permissions';

interface PermissionsPageProps {
    circle: CircleData;
    currentUserId: string;
    onBack: () => void;
    onUpdateSupervisor: (uid: string, updates: Partial<TeacherPermissions> & {
        isDeleteAction?: boolean;
        isTransferOwnership?: boolean;
        isCopyOwnership?: boolean;
    }) => void;
    addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
    setConfirmationModal?: (data: any) => void;
    isOnline?: boolean;
}

const CATEGORY_ICONS: Record<string, React.ElementType> = {
    FaUserGraduate,
    FaQuran,
    FaFileAlt,
    FaChartBar,
    FaTrophy,
    FaCogs,
    FaShieldAlt
};

export const PermissionsPage: React.FC<PermissionsPageProps> = ({
    circle,
    currentUserId,
    onBack,
    onUpdateSupervisor,
    addToast,
    setConfirmationModal,
    isOnline = true
}) => {
    const [selectedUid, setSelectedUid] = useState<string | null>(() => {
        // Default select first teacher that is not current user if possible, or current user
        const uids = Object.keys(circle.teachers || {});
        return uids.find(id => id !== currentUserId) || uids[0] || null;
    });

    const checkOnlineConnection = (): boolean => {
        if (!isOnline) {
            addToast('لا يسمح بتعديل الصلاحيات أو الأعضاء إلا عند وجود اتصال بالإنترنت للحفاظ على المزامنة.', 'error');
            return false;
        }
        return true;
    };

    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({
        students: true,
        sessions: true,
        reports: false,
        stats: false,
        points: false,
        services: false,
        management: true
    });

    // Check current user rights
    const isOwner = circle.ownerId === currentUserId || circle.teachers?.[currentUserId]?.role === 'owner';
    const currentUserResolved = getResolvedGranularPermissions(circle.teachers?.[currentUserId], circle.ownerId, currentUserId);
    const canManageMembers = isOwner || currentUserResolved.manageMembers || currentUserResolved.editCircleSettings;

    // Filter teachers list
    const teachersList = useMemo(() => {
        const teachers = circle.teachers || {};
        return Object.entries(teachers).map(([uid, t]) => ({
            uid,
            ...t,
            isOwner: uid === circle.ownerId || t.role === 'owner',
            resolvedPermissions: getResolvedGranularPermissions(t, circle.ownerId, uid)
        })).filter(t => {
            const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (t.role && t.role.toLowerCase().includes(searchQuery.toLowerCase()));
            const matchesRole = roleFilter === 'all' || t.role === roleFilter;
            const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
            return matchesSearch && matchesRole && matchesStatus;
        });
    }, [circle.teachers, circle.ownerId, searchQuery, roleFilter, statusFilter]);

    const selectedTeacher = selectedUid ? circle.teachers?.[selectedUid] : null;
    const isSelectedOwner = selectedUid === circle.ownerId || selectedTeacher?.role === 'owner';
    const activeResolved = selectedTeacher ? getResolvedGranularPermissions(selectedTeacher, circle.ownerId, selectedUid) : null;

    // Counts for stats summary bar
    const totalCount = Object.keys(circle.teachers || {}).length;
    const pendingCount = Object.values(circle.teachers || {}).filter(t => t.status === 'pending').length;
    const adminSupervisorCount = Object.values(circle.teachers || {}).filter(t => ['owner', 'admin', 'supervisor'].includes(t.role)).length;

    const toggleCategory = (catId: string) => {
        setOpenCategories(prev => ({ ...prev, [catId]: !prev[catId] }));
    };

    const handleRoleChange = (newRole: 'owner' | 'admin' | 'supervisor' | 'teacher' | 'assistant' | 'member') => {
        if (!checkOnlineConnection()) return;
        if (!selectedUid || !canManageMembers) return;

        if (isSelectedOwner && newRole !== 'owner') {
            addToast('لا يمكن تغيير رتبة المنشئ الأساسي مباشرة، يمكنك استخدام خيار نقل الملكية', 'error');
            return;
        }

        const defaults = defaultRolePermissions[newRole];
        onUpdateSupervisor(selectedUid, {
            role: newRole,
            granularPermissions: { ...defaults },
            status: selectedTeacher?.status === 'pending' ? 'active' : (selectedTeacher?.status || 'active')
        });

        addToast(`تم تغيير رتبة المعلم إلى (${ROLE_LABELS[newRole].label}) وتطبيق الصلاحيات الافتراضية`, 'success');
    };

    const handleTogglePermission = (key: keyof GranularPermissions) => {
        if (!checkOnlineConnection()) return;
        if (!selectedUid || !selectedTeacher || !canManageMembers) return;

        if (isSelectedOwner) {
            addToast('منشئ الحلقة يتمتع بالملكية الكاملة وجميع الصلاحيات ممررة تلقائياً', 'info');
            return;
        }

        const currentResolved = getResolvedGranularPermissions(selectedTeacher, circle.ownerId, selectedUid);
        const newGranular = {
            ...currentResolved,
            [key]: !currentResolved[key]
        };

        onUpdateSupervisor(selectedUid, {
            granularPermissions: newGranular
        });
    };

    const handleGrantAllPermissions = () => {
        if (!checkOnlineConnection()) return;
        if (!selectedUid || !canManageMembers) return;
        const allTrue = { ...defaultRolePermissions.owner };
        onUpdateSupervisor(selectedUid, {
            granularPermissions: allTrue
        });
        addToast('تم تفعيل جميع الصلاحيات لهذا العضو بنجاح', 'success');
    };

    const handleResetToRoleDefaults = () => {
        if (!checkOnlineConnection()) return;
        if (!selectedUid || !selectedTeacher || !canManageMembers) return;
        const role = selectedTeacher.role || 'teacher';
        const defaults = defaultRolePermissions[role] || defaultRolePermissions.teacher;
        onUpdateSupervisor(selectedUid, {
            granularPermissions: { ...defaults }
        });
        addToast(`تمت إعادة ضبط الصلاحيات إلى الافتراضيات الخاصة برتبة (${ROLE_LABELS[role].label})`, 'info');
    };

    return (
        <div className="min-h-screen bg-[#0a0c0f] text-gray-100 flex flex-col font-sans pb-24 selection:bg-emerald-500/30">
            {/* Top Navigation Header */}
            <div className="sticky top-0 z-40 bg-[#0f1217]/90 backdrop-blur-md border-b border-gray-800/60 px-4 py-3">
                <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onBack}
                            className="p-2.5 bg-gray-800/60 hover:bg-gray-800 text-gray-300 hover:text-white rounded-xl transition-all active:scale-95 border border-gray-700/40"
                            title="رجوع"
                        >
                            <FaArrowRight size={14} />
                        </button>
                        <div>
                            <h1 className="text-sm font-bold text-white flex items-center gap-2">
                                <FaShieldAlt className="text-emerald-400" size={14} />
                                <span>إدارة أعضاء وصلاحيات الحلقة</span>
                            </h1>
                            <p className="text-[10px] text-gray-400 font-medium">
                                حلقة {circle.circle} • {totalCount} أعضاء
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                        {pendingCount > 0 && (
                            <span className="bg-amber-500/15 text-amber-400 text-[10px] font-bold px-2.5 py-1 rounded-full border border-amber-500/30 flex items-center gap-1 animate-pulse">
                                <span>{pendingCount}</span>
                                <span>طلب انضمام</span>
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto w-full px-3 pt-4 space-y-4">
                {/* Offline Warning Banner */}
                {!isOnline && (
                    <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-amber-500/10 border border-amber-500/30 p-3.5 rounded-2xl flex items-start gap-3 text-amber-300"
                    >
                        <FaExclamationTriangle size={18} className="text-amber-400 mt-0.5 flex-shrink-0" />
                        <div className="space-y-0.5">
                            <h4 className="text-xs font-bold text-amber-400">وضع عدم الاتصال بالإنترنت</h4>
                            <p className="text-[10px] text-amber-200/80 font-medium leading-relaxed">
                                لا يمكن تعديل الصلاحيات أو تغيير رتب الأعضاء حالياً. يتطلب هذا الإجراء اتصالاً بالإنترنت لضمان مزامنة البيانات فوراً ومنع التعارض.
                            </p>
                        </div>
                    </motion.div>
                )}

                {/* Stats & Quick Summary Bar */}
                <div className="grid grid-cols-3 gap-2">
                    <div className="bg-[#11141a] border border-gray-800/60 p-2.5 rounded-2xl flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-xs flex-shrink-0">
                            <FaUsers size={14} />
                        </div>
                        <div>
                            <p className="text-[9px] text-gray-400 font-bold">إجمالي الأعضاء</p>
                            <p className="text-xs font-black text-white">{totalCount}</p>
                        </div>
                    </div>

                    <div className="bg-[#11141a] border border-gray-800/60 p-2.5 rounded-2xl flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold text-xs flex-shrink-0">
                            <FaUserShield size={14} />
                        </div>
                        <div>
                            <p className="text-[9px] text-gray-400 font-bold">المشرفون والمدراء</p>
                            <p className="text-xs font-black text-white">{adminSupervisorCount}</p>
                        </div>
                    </div>

                    <div className="bg-[#11141a] border border-gray-800/60 p-2.5 rounded-2xl flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs flex-shrink-0 ${pendingCount > 0 ? 'bg-amber-500/20 text-amber-400 animate-bounce' : 'bg-gray-800 text-gray-500'}`}>
                            <FaUserPlus size={14} />
                        </div>
                        <div>
                            <p className="text-[9px] text-gray-400 font-bold">طلبات الانضمام</p>
                            <p className="text-xs font-black text-white">{pendingCount}</p>
                        </div>
                    </div>
                </div>

                {/* Filter & Search Bar */}
                <div className="bg-[#11141a] border border-gray-800/60 p-3 rounded-2xl space-y-2.5">
                    <div className="relative">
                        <FaSearch className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={12} />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="ابحث برمز العضو أو الاسم..."
                            className="w-full bg-[#161a22] border border-gray-800/80 rounded-xl pr-9 pl-3 py-2 text-xs text-white placeholder-gray-500 outline-none focus:border-emerald-500/50 transition-all"
                        />
                    </div>

                    {/* Role Filter Chips */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                        <span className="text-[9px] font-bold text-gray-500 ml-1 flex-shrink-0">الرتبة:</span>
                        {[
                            { id: 'all', label: 'الكل' },
                            { id: 'owner', label: 'منشئ' },
                            { id: 'admin', label: 'مدير' },
                            { id: 'supervisor', label: 'مشرف' },
                            { id: 'teacher', label: 'معلم' },
                            { id: 'assistant', label: 'مساعد' },
                            { id: 'member', label: 'عضو' }
                        ].map(f => (
                            <button
                                key={f.id}
                                onClick={() => setRoleFilter(f.id)}
                                className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all flex-shrink-0 ${roleFilter === f.id ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' : 'bg-[#161a22] text-gray-400 border-gray-800 hover:text-white'}`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Member Selection Carousel / Cards */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between px-1">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">اختر العضو لتعديل الصلاحيات:</span>
                        <span className="text-[10px] text-gray-500 font-medium">{teachersList.length} أعضاء متاحين</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {teachersList.map(t => {
                            const isSelected = selectedUid === t.uid;
                            const isUserSelf = t.uid === currentUserId;
                            const roleBadge = ROLE_LABELS[t.role || 'teacher'] || ROLE_LABELS.teacher;

                            return (
                                <button
                                    key={t.uid}
                                    onClick={() => setSelectedUid(t.uid)}
                                    className={`p-3 rounded-2xl border text-right transition-all flex items-center justify-between gap-3 relative overflow-hidden ${isSelected ? 'bg-[#141d1a] border-emerald-500/60 shadow-lg shadow-emerald-500/5 ring-1 ring-emerald-500/30' : 'bg-[#11141a] border-gray-800/80 hover:bg-[#151921]'}`}
                                >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-inner ${t.gender === 'female' ? 'bg-pink-500/10 text-pink-400' : 'bg-blue-500/10 text-blue-400'}`}>
                                            {t.isOwner ? <FaShieldAlt size={16} className="text-amber-400" /> : <FaChalkboardTeacher size={16} />}
                                        </div>

                                        <div className="min-w-0">
                                            <div className="flex items-center gap-1.5">
                                                <p className="text-xs font-bold text-white truncate">{t.name}</p>
                                                {isUserSelf && <span className="text-[9px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.2 rounded-md">(أنت)</span>}
                                            </div>

                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                <span className={`text-[8px] font-bold px-1.5 py-0.2 rounded-md border ${roleBadge.badgeColor}`}>
                                                    {roleBadge.label}
                                                </span>

                                                {t.status === 'pending' && (
                                                    <span className="text-[8px] font-bold bg-amber-500/20 text-amber-400 px-1.5 py-0.2 rounded-md border border-amber-500/30">
                                                        طلب انضمام
                                                    </span>
                                                )}

                                                {t.status === 'suspended' && (
                                                    <span className="text-[8px] font-bold bg-red-500/20 text-red-400 px-1.5 py-0.2 rounded-md border border-red-500/30">
                                                        موقوف
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {isSelected && (
                                        <div className="w-5 h-5 rounded-full bg-emerald-500 text-black flex items-center justify-center flex-shrink-0 shadow-sm">
                                            <FaCheck size={10} />
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Selected Member Detail & Permission Config Workspace */}
                {selectedTeacher && activeResolved && selectedUid && (
                    <motion.div
                        key={selectedUid}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-[#11141a] border border-gray-800 rounded-2xl p-4 space-y-5"
                    >
                        {/* Member Information Card */}
                        <div className="bg-[#161a22] border border-gray-800 p-3.5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg shadow-sm border border-white/5 ${selectedTeacher.gender === 'female' ? 'bg-pink-500/15 text-pink-400' : 'bg-blue-500/15 text-blue-400'}`}>
                                    {isSelectedOwner ? <FaShieldAlt className="text-amber-400" size={22} /> : <FaChalkboardTeacher size={22} />}
                                </div>

                                <div>
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-sm font-black text-white">{selectedTeacher.name}</h2>
                                        {isSelectedOwner && <span className="bg-amber-500/20 text-amber-400 text-[9px] font-bold px-2 py-0.5 rounded-full border border-amber-500/30">مالك الحلقة</span>}
                                    </div>
                                    <p className="text-[10px] text-gray-400 font-medium mt-0.5">
                                        الجنس: {selectedTeacher.gender === 'female' ? 'أنثى' : 'ذكر'} • الانضمام: {new Date(selectedTeacher.joinedAt || Date.now()).toLocaleDateString('ar-SA')}
                                    </p>
                                </div>
                            </div>

                            {/* Quick Actions (Toggle Status / Approve / Reject) */}
                            {canManageMembers && !isSelectedOwner && (
                                <div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-800">
                                    {selectedTeacher.status === 'pending' ? (
                                        <>
                                            <button
                                                onClick={() => {
                                                    if (!checkOnlineConnection()) return;
                                                    onUpdateSupervisor(selectedUid, { status: 'active', role: selectedTeacher.role || 'teacher' });
                                                    addToast(`تمت الموافقة على انضمام ${selectedTeacher.name}`, 'success');
                                                }}
                                                className="flex-1 sm:flex-initial px-3 py-1.5 bg-emerald-500 text-black text-xs font-bold rounded-xl hover:bg-emerald-400 transition-all flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20"
                                            >
                                                <FaCheck size={12} />
                                                <span>موافقة</span>
                                            </button>
                                            <button
                                                onClick={() => {
                                                    if (!checkOnlineConnection()) return;
                                                    onUpdateSupervisor(selectedUid, { status: 'rejected' });
                                                    addToast(`تم رفض طلب انضمام ${selectedTeacher.name}`, 'info');
                                                }}
                                                className="flex-1 sm:flex-initial px-3 py-1.5 bg-red-500/15 text-red-400 border border-red-500/30 text-xs font-bold rounded-xl hover:bg-red-500/25 transition-all flex items-center justify-center gap-1.5"
                                            >
                                                <FaTimes size={12} />
                                                <span>رفض</span>
                                            </button>
                                        </>
                                    ) : (
                                        <button
                                            onClick={() => {
                                                if (!checkOnlineConnection()) return;
                                                const newStatus = selectedTeacher.status === 'suspended' ? 'active' : 'suspended';
                                                onUpdateSupervisor(selectedUid, { status: newStatus });
                                                addToast(newStatus === 'active' ? 'تم تنشيط حساب المعلم' : 'تم إيقاف حساب المعلم', 'info');
                                            }}
                                            className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${selectedTeacher.status === 'suspended' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25' : 'bg-red-500/15 text-red-400 border-red-500/30 hover:bg-red-500/25'}`}
                                        >
                                            {selectedTeacher.status === 'suspended' ? <FaUserCheck size={12} /> : <FaUserSlash size={12} />}
                                            <span>{selectedTeacher.status === 'suspended' ? 'تنشيط الحساب' : 'إيقاف الحساب'}</span>
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Role Presets Selector */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-gray-300 flex items-center gap-1.5">
                                    <FaCog className="text-emerald-400" size={12} />
                                    <span>الرتبة في الحلقة والصلاحية الافتراضية:</span>
                                </span>
                                {isSelectedOwner && <span className="text-[9px] text-amber-400 font-bold">صلاحيات كاملة غير قابلة للتقييد</span>}
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {(['admin', 'supervisor', 'teacher', 'assistant', 'member'] as const).map(rKey => {
                                    const rData = ROLE_LABELS[rKey];
                                    const isCurrentRole = selectedTeacher.role === rKey && !isSelectedOwner;

                                    return (
                                        <button
                                            key={rKey}
                                            disabled={!canManageMembers || isSelectedOwner}
                                            onClick={() => handleRoleChange(rKey)}
                                            className={`p-2.5 rounded-xl border text-right transition-all flex flex-col justify-between gap-1.5 ${isCurrentRole ? 'bg-emerald-500/15 border-emerald-500/50 shadow-md ring-1 ring-emerald-500/30' : 'bg-[#161a22] border-gray-800 hover:border-gray-700 disabled:opacity-50'}`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className={`text-xs font-bold ${isCurrentRole ? 'text-emerald-400' : 'text-white'}`}>{rData.label}</span>
                                                {isCurrentRole && <FaCheck size={10} className="text-emerald-400" />}
                                            </div>
                                            <p className="text-[9px] text-gray-400 font-medium leading-tight line-clamp-2">{rData.desc}</p>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Quick Batch Controls */}
                        {canManageMembers && !isSelectedOwner && (
                            <div className="flex items-center gap-2 pt-1">
                                <button
                                    onClick={handleGrantAllPermissions}
                                    className="flex-1 py-1.5 px-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1.5 transition-all"
                                >
                                    <FaCheckDouble size={11} />
                                    <span>تفعيل كامل الصلاحيات</span>
                                </button>
                                <button
                                    onClick={handleResetToRoleDefaults}
                                    className="flex-1 py-1.5 px-3 bg-gray-800/60 hover:bg-gray-800 text-gray-300 border border-gray-700/40 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1.5 transition-all"
                                >
                                    <FaUndo size={10} />
                                    <span>إعادة للرتبة الافتراضية</span>
                                </button>
                            </div>
                        )}

                        {/* Detailed Granular Permission Toggles by Category */}
                        <div className="space-y-3 pt-2">
                            <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                                <h3 className="text-xs font-bold text-white flex items-center gap-2">
                                    <FaLock size={12} className="text-amber-400" />
                                    <span>جدول الصلاحيات التفصيلية بالعمليات:</span>
                                </h3>
                                <span className="text-[9px] text-gray-400">انقر للفتح أو التعديل</span>
                            </div>

                            {PERMISSION_CATEGORIES.map(category => {
                                const isOpen = !!openCategories[category.id];
                                const CategoryIcon = CATEGORY_ICONS[category.iconName] || FaCog;
                                const categoryKeys = category.items.map(i => i.key);
                                const activeCountInCategory = categoryKeys.filter(k => !!activeResolved[k]).length;

                                return (
                                    <div
                                        key={category.id}
                                        className="bg-[#161a22] border border-gray-800/80 rounded-2xl overflow-hidden transition-all"
                                    >
                                        {/* Category Header */}
                                        <button
                                            onClick={() => toggleCategory(category.id)}
                                            className="w-full p-3 flex items-center justify-between gap-3 text-right hover:bg-gray-800/30 transition-colors"
                                        >
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <div className="w-7 h-7 rounded-lg bg-gray-800 text-emerald-400 flex items-center justify-center flex-shrink-0">
                                                    <CategoryIcon size={14} />
                                                </div>
                                                <div className="min-w-0">
                                                    <h4 className="text-xs font-bold text-white truncate">{category.title}</h4>
                                                    <p className="text-[9px] text-gray-400 truncate">{category.description}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                <span className="text-[9px] font-bold bg-gray-800 text-emerald-400 px-2 py-0.5 rounded-full border border-gray-700/50">
                                                    {activeCountInCategory} / {category.items.length}
                                                </span>
                                                {isOpen ? <FaChevronUp size={10} className="text-gray-400" /> : <FaChevronDown size={10} className="text-gray-400" />}
                                            </div>
                                        </button>

                                        {/* Category Permission Items List */}
                                        <AnimatePresence initial={false}>
                                            {isOpen && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    className="border-t border-gray-800/60 divide-y divide-gray-800/40"
                                                >
                                                    {category.items.map(item => {
                                                        const isAllowed = !!activeResolved[item.key];

                                                        return (
                                                            <div
                                                                key={item.key}
                                                                className="p-3 flex items-center justify-between gap-3 hover:bg-gray-800/20 transition-colors"
                                                            >
                                                                <div className="min-w-0">
                                                                    <p className={`text-[11px] font-bold ${isAllowed ? 'text-white' : 'text-gray-400'}`}>
                                                                        {item.title}
                                                                    </p>
                                                                    <p className="text-[9px] text-gray-500 font-medium leading-tight mt-0.5">
                                                                        {item.description}
                                                                    </p>
                                                                </div>

                                                                {/* Custom Micro Switch */}
                                                                <button
                                                                    disabled={!canManageMembers || isSelectedOwner}
                                                                    onClick={() => handleTogglePermission(item.key)}
                                                                    className={`w-10 h-5 rounded-full relative transition-all flex-shrink-0 border ${isAllowed ? 'bg-emerald-500 border-emerald-400' : 'bg-gray-800 border-gray-700'}`}
                                                                >
                                                                    <motion.div
                                                                        animate={{ x: isAllowed ? (document.dir === 'rtl' ? -22 : 22) : (document.dir === 'rtl' ? -2 : 2) }}
                                                                        className="absolute top-0.5 left-0 w-4 h-4 bg-white rounded-full shadow-md"
                                                                    />
                                                                </button>
                                                            </div>
                                                        );
                                                    })}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Ownership Management Section */}
                        {isOwner && !isSelectedOwner && selectedTeacher.status === 'active' && (
                            <div className="bg-[#1a1410] border border-amber-900/30 p-3.5 rounded-2xl space-y-2.5">
                                <div className="flex items-center gap-2 text-amber-400">
                                    <FaShieldAlt size={14} />
                                    <h4 className="text-xs font-bold">إدارة الملكية ونقل الصلاحيات القيادية:</h4>
                                </div>
                                <p className="text-[9px] text-amber-200/70 font-medium leading-relaxed">
                                    بصفتك منشئ الحلقة الأساسي، يمكنك نقل الملكية بالكامل إلى ({selectedTeacher.name}) أو منحه صلاحيات منشئ ثانٍ.
                                </p>

                                <div className="grid grid-cols-2 gap-2 pt-1">
                                    <button
                                        onClick={() => {
                                            if (!checkOnlineConnection()) return;
                                            setConfirmationModal?.({
                                                isOpen: true,
                                                title: 'نقل ملكية الحلقة بالكامل',
                                                message: `هل أنت متأكد من نقل ملكية الحلقة نهائياً إلى المعلم (${selectedTeacher.name})؟ سيصبح المالك الأول للحلقة.`,
                                                onConfirm: () => {
                                                    if (!checkOnlineConnection()) return;
                                                    onUpdateSupervisor(selectedUid, { isTransferOwnership: true });
                                                }
                                            });
                                        }}
                                        className="py-2 px-3 bg-amber-600 hover:bg-amber-500 text-white text-[10px] font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-amber-600/20 transition-all active:scale-95"
                                    >
                                        <FaUserShield size={12} />
                                        <span>نقل الملكية الكاملة</span>
                                    </button>

                                    <button
                                        onClick={() => {
                                            if (!checkOnlineConnection()) return;
                                            setConfirmationModal?.({
                                                isOpen: true,
                                                title: 'منح ملكية مشتركة',
                                                message: `هل تريد منح المعلم (${selectedTeacher.name}) صلاحية المالك الثاني في الحلقة؟`,
                                                onConfirm: () => {
                                                    if (!checkOnlineConnection()) return;
                                                    onUpdateSupervisor(selectedUid, { isCopyOwnership: true });
                                                }
                                            });
                                        }}
                                        className="py-2 px-3 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/20 transition-all active:scale-95"
                                    >
                                        <FaUserPlus size={12} />
                                        <span>منح ملكية ثانية</span>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Delete / Remove Member Section */}
                        {canManageMembers && !isSelectedOwner && (
                            <div className="pt-2">
                                <button
                                    onClick={() => {
                                        if (!checkOnlineConnection()) return;
                                        setConfirmationModal?.({
                                            isOpen: true,
                                            title: 'إزالة العضو من الحلقة',
                                            message: `هل أنت متأكد من حذف العضو (${selectedTeacher.name}) وإلغاء صلاحياته من هذه الحلقة نهائياً؟`,
                                            onConfirm: () => {
                                                if (!checkOnlineConnection()) return;
                                                onUpdateSupervisor(selectedUid, { isDeleteAction: true });
                                                setSelectedUid(null);
                                            }
                                        });
                                    }}
                                    className="w-full py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
                                >
                                    <FaTrash size={12} />
                                    <span>حذف العضو من الحلقة نهائياً</span>
                                </button>
                            </div>
                        )}
                    </motion.div>
                )}
            </div>
        </div>
    );
};

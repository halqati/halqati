import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    FaSearch, FaTrash, FaCheckCircle, FaExclamationTriangle, 
    FaInfoCircle, FaClock, FaUserClock, FaBellSlash,
    FaArrowRight, FaFilter, FaCheck, FaTimes, FaUserCheck, FaUserSlash, FaPlus,
    FaPaperPlane
} from 'react-icons/fa';
import { CircleData, Notification, TeacherPermissions } from '../types';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface NotificationsProps {
    data: CircleData;
    onBack: () => void;
    onDeleteNotification: (id: string) => void;
    onMarkAsRead: (ids: string[]) => void;
    onUpdateSupervisor: (uid: string, updates: Partial<TeacherPermissions> & { isDeleteAction?: boolean }) => void;
    onMarkJoinRequestHandled: (id: string) => void;
    onAddNotification: (notification: Notification) => void;
    currentUserId: string;
}

const Notifications: React.FC<NotificationsProps> = ({ 
    data, 
    onBack, 
    onDeleteNotification, 
    onMarkAsRead,
    onMarkJoinRequestHandled,
    onUpdateSupervisor,
    onAddNotification,
    currentUserId
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState<'all' | 'unread' | 'pending'>('all');
    const [dateFilter, setDateFilter] = useState<'all' | 'week' | 'month'>('all');
    const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
    const [broadcastMessage, setBroadcastMessage] = useState('');

    const currentUserRole = data.teachers?.[currentUserId]?.role;
    const currentUserLevel = data.teachers?.[currentUserId]?.accessLevel;
    const isOwner = data.ownerId === currentUserId;
    const canManage = isOwner || currentUserLevel === 'full';

    // Mark all as read on mount
    React.useEffect(() => {
        const unreadIds = (data.notifications || [])
            .filter(n => !n.readBy?.includes(currentUserId))
            .map(n => n.id);
        if (unreadIds.length > 0) {
            onMarkAsRead(unreadIds);
        }
    }, [data.notifications?.length]); // Re-run if length changes

    const notifications = useMemo(() => {
        let list = [...(data.notifications || [])];
        
        // Filter out dismissed local ones
        const dismissedIds = data.dismissedNotificationIds || [];
        list = list.filter(n => !dismissedIds.includes(n.id));

        // Filter for System/Management ONLY
        list = list.filter(n => 
            n.category === 'system' || 
            n.category === 'management' || 
            n.metadata?.actionType === 'join_request' ||
            // Fallback for older notifications that might be system-like
            n.id.startsWith('status_') || 
            n.id.startsWith('level_') || 
            n.id.startsWith('approved_') ||
            n.id.startsWith('approval_')
        );

        // Sort by date desc
        list.sort((a, b) => b.createdAt - a.createdAt);

        // Search
        if (searchTerm.trim()) {
            list = list.filter(n => 
                n.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
                n.metadata?.userName?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Status Filter
        if (filter === 'unread') {
            list = list.filter(n => !n.readBy?.includes(currentUserId));
        } else if (filter === 'pending') {
            list = list.filter(n => n.metadata?.actionType === 'join_request' && !n.metadata.handledBy);
        }

        // Date Filter
        const now = Date.now();
        if (dateFilter === 'week') {
            list = list.filter(n => (now - n.createdAt) <= 7 * 24 * 60 * 60 * 1000);
        } else if (dateFilter === 'month') {
            list = list.filter(n => (now - n.createdAt) <= 30 * 24 * 60 * 60 * 1000);
        }

        return list;
    }, [data.notifications, data.dismissedNotificationIds, searchTerm, filter, dateFilter, currentUserId]);

    // Grouping notifications by date
    const groupedNotifications = useMemo(() => {
        const groups: { [key: string]: Notification[] } = {};
        
        notifications.forEach(n => {
            const date = new Date(n.createdAt);
            const today = new Date();
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);

            let groupKey = '';
            if (date.toDateString() === today.toDateString()) {
                groupKey = 'اليوم';
            } else if (date.toDateString() === yesterday.toDateString()) {
                groupKey = 'أمس';
            } else if (today.getTime() - date.getTime() < 7 * 24 * 60 * 60 * 1000) {
                groupKey = 'هذا الأسبوع';
            } else if (date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear()) {
                groupKey = 'هذا الشهر';
            } else {
                groupKey = format(date, 'MMMM yyyy', { locale: ar });
            }

            if (!groups[groupKey]) groups[groupKey] = [];
            groups[groupKey].push(n);
        });

        return groups;
    }, [notifications]);

    const handleMarkAllRead = () => {
        const unreadIds = notifications
            .filter(n => !n.readBy?.includes(currentUserId))
            .map(n => n.id);
        if (unreadIds.length > 0) {
            onMarkAsRead(unreadIds);
        }
    };

    const handleSendBroadcast = () => {
        if (!broadcastMessage.trim()) return;

        const newNotif: Notification = {
            id: `management_${currentUserId}_${Date.now()}`,
            type: 'info',
            category: 'management',
            message: broadcastMessage,
            createdAt: Date.now(),
            metadata: {
                userName: data.teachers?.[currentUserId]?.name || 'الإدارة',
                userPhoto: data.teachers?.[currentUserId]?.photo || undefined
            }
        };

        onAddNotification(newNotif);
        setBroadcastMessage('');
        setIsBroadcastModalOpen(false);
    };

    const getTypeStyles = (type: Notification['type'], isHandled: boolean) => {
        if (isHandled) return 'bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-500';
        
        switch (type) {
            case 'warning': return 'bg-amber-50 dark:bg-amber-500/10 border-amber-100 dark:border-amber-500/20 text-amber-700 dark:text-amber-400';
            case 'danger': return 'bg-red-50 dark:bg-red-500/10 border-red-100 dark:border-red-500/20 text-red-700 dark:text-red-400';
            case 'success': return 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400';
            case 'special':
            case 'seasonal': return 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-100 dark:border-indigo-500/20 text-indigo-700 dark:text-indigo-400';
            default: return 'bg-blue-50 dark:bg-blue-500/10 border-blue-100 dark:border-blue-500/20 text-blue-700 dark:text-blue-400';
        }
    };

    const getTypeIcon = (type: Notification['type'], actionType?: string) => {
        if (actionType === 'join_request') return <FaUserClock />;
        switch (type) {
            case 'warning': return <FaExclamationTriangle />;
            case 'danger': return <FaTrash />;
            case 'success': return <FaCheckCircle />;
            default: return <FaInfoCircle />;
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-24">
            {/* Header Area */}
            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={onBack}
                            className="p-2.5 bg-white dark:bg-gray-800 rounded-2xl shadow-sm text-gray-500 dark:text-gray-400 hover:text-primary transition-all active:scale-95 border border-gray-100 dark:border-gray-700"
                        >
                            <FaArrowRight size={18} />
                        </button>
                        <div>
                            <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">التنبيهات</h1>
                            <p className="text-xs text-gray-500 font-medium">إدارة ومتابعة تحديثات الحلقة</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        {canManage && (
                            <button 
                                onClick={() => setIsBroadcastModalOpen(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl text-xs font-bold hover:bg-emerald-600 transition-all active:scale-95 shadow-lg shadow-emerald-500/20"
                            >
                                <FaPlus size={10} /> <span className="hidden xs:inline">رسالة إدارية</span>
                            </button>
                        )}
                        {notifications.some(n => !n.readBy?.includes(currentUserId)) && (
                            <button 
                                onClick={handleMarkAllRead}
                                className="px-4 py-2 bg-primary/10 text-primary rounded-xl text-xs font-bold hover:bg-primary hover:text-white transition-all active:scale-95"
                            >
                                تحديد الكل كمقروء
                            </button>
                        )}
                        <span className="bg-gray-100 dark:bg-white/5 px-3 py-1.5 rounded-xl text-xs font-bold text-gray-500 border border-gray-200 dark:border-white/10">
                            {notifications.length} تنبيه
                        </span>
                    </div>
                </div>

                {/* Search & Filters */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-grow">
                        <FaSearch className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                        <input 
                            type="text"
                            placeholder="بحث في التنبيهات..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-2xl py-3 pr-11 pl-4 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all text-gray-800 dark:text-gray-100"
                        />
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-hide">
                        <select 
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value as any)}
                            className="bg-white dark:bg-gray-800 text-gray-500 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3 text-xs font-bold outline-none focus:border-primary/50 transition-all cursor-pointer"
                        >
                            <option value="all">كل الأوقات</option>
                            <option value="week">هذا الأسبوع</option>
                            <option value="month">هذا الشهر</option>
                        </select>
                        {[
                            { id: 'all', label: 'الكل', icon: FaBellSlash },
                            { id: 'unread', label: 'غير مقروء', icon: FaClock },
                            { id: 'pending', label: 'طلبات الانضمام', icon: FaUserClock },
                        ].map((btn) => (
                            <button
                                key={btn.id}
                                onClick={() => setFilter(btn.id as any)}
                                className={`flex items-center gap-2 px-4 py-3 rounded-2xl text-xs font-bold whitespace-nowrap transition-all border ${
                                    filter === btn.id 
                                    ? 'bg-primary text-white border-primary shadow-lg shadow-primary/25' 
                                    : 'bg-white dark:bg-gray-800 text-gray-500 border-gray-200 dark:border-gray-700 hover:border-primary/50'
                                }`}
                            >
                                <btn.icon size={14} />
                                {btn.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Notifications List */}
            <div className="space-y-8">
                {Object.keys(groupedNotifications).length > 0 ? (
                    Object.entries(groupedNotifications).map(([group, list]) => (
                        <div key={group} className="space-y-4">
                            <div className="flex items-center gap-3 px-2">
                                <h3 className="text-sm font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">{group}</h3>
                                <div className="h-px bg-gray-100 dark:bg-white/5 flex-grow" />
                            </div>

                            <AnimatePresence mode='popLayout'>
                                <div className="space-y-3">
                                    {list.map((n, idx) => {
                                        const isUnread = !n.readBy?.includes(currentUserId);
                                        const isHandled = !!n.metadata?.handledBy;
                                        const isActionable = n.metadata?.actionType === 'join_request' && !isHandled;

                                        return (
                                            <motion.div
                                                key={n.id}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.95 }}
                                                transition={{ delay: idx * 0.05 }}
                                                layout
                                                className={`relative group bg-white dark:bg-gray-800 rounded-3xl p-4 border transition-all hover:shadow-xl hover:shadow-gray-200/50 dark:hover:shadow-black/20 ${
                                                    isActionable
                                                    ? 'border-amber-200 dark:border-amber-500/30 bg-amber-50/30 dark:bg-amber-500/5'
                                                    : isUnread 
                                                    ? 'border-primary/30 dark:border-primary/20 shadow-sm' 
                                                    : 'border-gray-100 dark:border-gray-700'
                                                }`}
                                            >
                                                {isActionable && (
                                                    <span className="absolute top-4 left-4 w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
                                                )}
                                                {isUnread && !isActionable && (
                                                    <span className="absolute top-4 left-4 w-2 h-2 bg-primary rounded-full"></span>
                                                )}

                                                <div className="flex gap-4">
                                                    {/* Avatar / Icon container */}
                                                    <div className="flex-shrink-0">
                                                        {n.metadata?.userPhoto ? (
                                                            <div className="relative">
                                                                <img 
                                                                    src={n.metadata.userPhoto} 
                                                                    alt={n.metadata.userName} 
                                                                    className={`w-14 h-14 rounded-2xl object-cover border-2 ${isUnread ? 'border-primary/40' : 'border-gray-200 dark:border-gray-700'}`}
                                                                />
                                                                <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-lg flex items-center justify-center text-[10px] ${getTypeStyles(n.type, isHandled)} border-2 border-white dark:border-gray-800`}>
                                                                    {getTypeIcon(n.type, n.metadata?.actionType)}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl transition-colors ${getTypeStyles(n.type, isHandled)} border border-transparent`}>
                                                                {getTypeIcon(n.type, n.metadata?.actionType)}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Content */}
                                                    <div className="flex-grow space-y-2">
                                                        <div className="flex items-center justify-between gap-2">
                                                            <div className="flex items-center gap-2">
                                                                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-lg border ${getTypeStyles(n.type, isHandled)}`}>
                                                                    {n.metadata?.actionType === 'join_request' ? 'طلب انضمام' : 'تحديث'}
                                                                </span>
                                                                {n.metadata?.userName && (
                                                                    <span className="text-xs font-bold text-gray-800 dark:text-white">{n.metadata.userName}</span>
                                                                )}
                                                            </div>
                                                            <span className="text-[9px] font-bold text-gray-400 dark:text-gray-500 whitespace-nowrap">
                                                                {format(n.createdAt, 'hh:mm a', { locale: ar })}
                                                            </span>
                                                        </div>

                                                        <p className={`text-sm leading-relaxed ${isHandled ? 'text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-200'}`}>
                                                            {n.message}
                                                        </p>

                                                        {/* Actions / Metadata */}
                                                        {isHandled ? (
                                                            <div className="flex items-center gap-2 mt-3 p-2.5 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5">
                                                                <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${n.metadata?.handledBy?.action === 'approved' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                                                                    {n.metadata?.handledBy?.action === 'approved' ? <FaUserCheck size={12} /> : <FaUserSlash size={12} />}
                                                                </div>
                                                                <p className="text-[10px] font-bold text-gray-500">
                                                                    تم {n.metadata?.handledBy?.action === 'approved' ? 'القبول' : 'الرفض'} أ/ <span className="text-gray-700 dark:text-gray-300">{n.metadata?.handledBy?.name}</span>
                                                                </p>
                                                            </div>
                                                        ) : isActionable ? (
                                                            canManage ? (
                                                                <div className="flex items-center gap-2 mt-3 pt-2">
                                                                    <button 
                                                                        onClick={() => onUpdateSupervisor(n.metadata!.uid!, { status: 'active' })}
                                                                        className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-emerald-500/20"
                                                                    >
                                                                        <FaCheck /> قبول الطلب
                                                                    </button>
                                                                    <button 
                                                                        onClick={() => onUpdateSupervisor(n.metadata!.uid!, { isDeleteAction: true } as any)}
                                                                        className="flex-1 bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-red-500/10 hover:text-red-500 transition-all active:scale-95"
                                                                    >
                                                                        <FaTimes /> رفض الطلب
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-center gap-2 mt-3 p-2.5 bg-amber-50 dark:bg-amber-500/5 rounded-2xl border border-amber-100 dark:border-amber-500/10">
                                                                    <FaClock className="text-amber-500" size={12} />
                                                                    <p className="text-[10px] font-bold text-amber-600/80 dark:text-amber-400/80">
                                                                        قيد المراجعة من قبل الإدارة
                                                                    </p>
                                                                </div>
                                                            )
                                                        ) : (
                                                            <div className="flex justify-end pt-2">
                                                                <button 
                                                                    onClick={() => onDeleteNotification(n.id)}
                                                                    className="p-2 text-gray-300 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400 transition-colors"
                                                                    title="حذف التنبيه"
                                                                >
                                                                    <FaTrash size={12} />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            </AnimatePresence>
                        </div>
                    ))
                ) : (
                    <div className="flex flex-col items-center justify-center py-24 text-center">
                        <div className="w-24 h-24 bg-gray-100 dark:bg-white/5 rounded-[2.5rem] flex items-center justify-center text-gray-300 dark:text-gray-700 mb-6 border-2 border-dashed border-gray-200 dark:border-gray-800">
                            <FaBellSlash size={40} />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">لا توجد تنبيهات</h3>
                        <p className="text-sm text-gray-500 max-w-xs leading-relaxed">
                            {searchTerm ? 'لم يتم العثور على أي نتائج تطابق بحثك.' : 'كل شيء هادئ هنا! لا توجد تنبيهات جديدة في الوقت الحالي.'}
                        </p>
                        {searchTerm && (
                            <button 
                                onClick={() => setSearchTerm('')}
                                className="mt-6 text-primary text-xs font-bold hover:underline"
                            >
                                مسح البحث
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Broadcast Modal */}
            <AnimatePresence>
                {isBroadcastModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl border border-gray-100 dark:border-gray-700"
                        >
                            <div className="p-8 space-y-6">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">إرسال رسالة إدارية</h2>
                                        <p className="text-sm text-gray-500 font-medium">سيتم إرسال هذه الرسالة لجميع معلمي ومعلمات الحلقة</p>
                                    </div>
                                    <button 
                                        onClick={() => setIsBroadcastModalOpen(false)}
                                        className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                                    >
                                        <FaTimes size={20} />
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    <textarea
                                        value={broadcastMessage}
                                        onChange={(e) => setBroadcastMessage(e.target.value)}
                                        placeholder="اكتب هنا الرسالة التي تود مشاركتها مع الفريق..."
                                        className="w-full min-h-[150px] p-4 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm leading-relaxed resize-none transition-all"
                                    />
                                    
                                    <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-500/5 rounded-2xl border border-blue-100 dark:border-blue-500/10">
                                        <FaInfoCircle className="text-blue-500 shrink-0" size={16} />
                                        <p className="text-[10px] text-blue-700 dark:text-blue-400 leading-normal">
                                            ستظهر هذه الرسالة في "التنبيهات العامه" لدى جميع أعضاء فريق العمل المعتمدين في الحلقة.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button
                                        onClick={handleSendBroadcast}
                                        disabled={!broadcastMessage.trim()}
                                        className="flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
                                    >
                                        <FaPaperPlane size={14} /> إرسال الرسالة الآن
                                    </button>
                                    <button
                                        onClick={() => setIsBroadcastModalOpen(false)}
                                        className="flex-1 bg-gray-100 dark:bg-white/5 text-gray-500 py-4 rounded-2xl font-black text-sm transition-all hover:bg-gray-200 dark:hover:bg-white/10 active:scale-95"
                                    >
                                        إلغاء
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Notifications;

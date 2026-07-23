import React, { useState, useEffect, useRef } from 'react';
import { 
    FaArrowRight, FaPaperPlane, FaComments, FaLightbulb, 
    FaExclamationTriangle, FaQuestionCircle, FaPlusCircle, 
    FaInbox, FaCheckCircle, FaClock, FaCommentDots, FaLock, 
    FaChevronLeft, FaTimes, FaCircle, FaUser, FaRobot, FaStar
} from 'react-icons/fa';
import { db, collection, query, where, onSnapshot, addDoc, doc, updateDoc, arrayUnion, serverTimestamp } from '../firebase';
import { UserProfile, TeacherFeedbackItem, FeedbackType, FeedbackMessage, CircleData } from '../types';
import { User } from '../firebase';

interface TeacherFeedbackProps {
    user: User | null;
    userProfile: UserProfile | null;
    allCircles?: CircleData[];
    activeCircle?: CircleData | null;
    onBack: () => void;
    addToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const TYPE_OPTIONS: { id: FeedbackType; label: string; icon: React.ElementType; color: string; bgColor: string }[] = [
    { id: 'general', label: 'عام', icon: FaComments, color: 'text-blue-500', bgColor: 'bg-blue-50 dark:bg-blue-900/20' },
    { id: 'suggestion', label: 'اقتراح', icon: FaLightbulb, color: 'text-amber-500', bgColor: 'bg-amber-50 dark:bg-amber-900/20' },
    { id: 'feature', label: 'إضافة جديدة', icon: FaPlusCircle, color: 'text-purple-500', bgColor: 'bg-purple-50 dark:bg-purple-900/20' },
    { id: 'bug', label: 'مشكلة أو خطأ', icon: FaExclamationTriangle, color: 'text-red-500', bgColor: 'bg-red-50 dark:bg-red-900/20' },
    { id: 'inquiry', label: 'استفسار', icon: FaQuestionCircle, color: 'text-teal-500', bgColor: 'bg-teal-50 dark:bg-teal-900/20' },
    { id: 'other', label: 'أخرى', icon: FaComments, color: 'text-gray-500', bgColor: 'bg-gray-50 dark:bg-gray-700/20' }
];

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
    'new': { label: 'جديدة', color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' },
    'in_review': { label: 'قيد المراجعة', color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800' },
    'replied': { label: 'تم الرد', color: 'text-emerald-600 dark:text-emerald-400', bgColor: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' },
    'closed': { label: 'مغلقة', color: 'text-gray-500 dark:text-gray-400', bgColor: 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700' }
};

const TeacherFeedback: React.FC<TeacherFeedbackProps> = ({ user, userProfile, allCircles = [], activeCircle, onBack, addToast }) => {
    const [activeTab, setActiveTab] = useState<'new' | 'my_messages'>('new');
    const [feedbackType, setFeedbackType] = useState<FeedbackType>('general');
    const [messageText, setMessageText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    // List of user's feedback messages
    const [myFeedbacks, setMyFeedbacks] = useState<TeacherFeedbackItem[]>([]);
    const [selectedFeedback, setSelectedFeedback] = useState<TeacherFeedbackItem | null>(null);
    const [replyText, setReplyText] = useState('');
    const [isReplying, setIsReplying] = useState(false);

    const chatEndRef = useRef<HTMLDivElement>(null);

    const userId = user?.uid || userProfile?.uid || 'anonymous';

    // Fetch user's feedback items from Firestore
    useEffect(() => {
        if (!db || userId === 'anonymous') return;

        try {
            const q = query(
                collection(db, 'teacher_feedbacks'),
                where('userId', '==', userId)
            );

            const unsubscribe = onSnapshot(q, (snapshot) => {
                const items: TeacherFeedbackItem[] = [];
                snapshot.forEach((doc) => {
                    items.push({ id: doc.id, ...doc.data() } as TeacherFeedbackItem);
                });
                // Sort by createdAt descending locally
                items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
                setMyFeedbacks(items);

                // Update selected feedback if open
                if (selectedFeedback) {
                    const updated = items.find(f => f.id === selectedFeedback.id);
                    if (updated) setSelectedFeedback(updated);
                }
            }, (err) => {
                console.warn("Firestore error fetching feedbacks:", err);
            });

            return () => unsubscribe();
        } catch (e) {
            console.warn("Error setting up feedback listener:", e);
        }
    }, [userId, selectedFeedback?.id]);

    // Count unread developer replies
    const unreadRepliesCount = myFeedbacks.filter(f => f.teacherUnread).length;

    // Scroll chat to bottom when selected feedback changes or messages update
    useEffect(() => {
        if (selectedFeedback) {
            chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            
            // Mark as read if teacherUnread is true
            if (selectedFeedback.teacherUnread && db) {
                try {
                    const docRef = doc(db, 'teacher_feedbacks', selectedFeedback.id);
                    updateDoc(docRef, { teacherUnread: false });
                } catch (e) {
                    console.warn("Failed to mark feedback as read:", e);
                }
            }
        }
    }, [selectedFeedback?.id, selectedFeedback?.messages?.length]);

    // Submit new feedback
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!messageText.trim()) {
            addToast?.("يرجى كتابة نص الملاحظة قبل الإرسال", "error");
            return;
        }

        setIsSubmitting(true);
        try {
            const senderName = userProfile?.displayName || user?.displayName || 'معلم';
            const centerName = activeCircle?.center || (userProfile as any)?.centerName || (userProfile as any)?.managementName || '';
            const circleName = activeCircle?.circle || (allCircles[0]?.circle) || '';

            const initialMsg: FeedbackMessage = {
                id: 'msg_' + Date.now(),
                sender: 'teacher',
                senderName,
                text: messageText.trim(),
                createdAt: Date.now()
            };

            const feedbackData = {
                userId,
                userName: senderName,
                userEmail: userProfile?.email || user?.email || '',
                centerName,
                circleName,
                circlesCount: allCircles.length,
                type: feedbackType,
                subject: messageText.trim().slice(0, 50),
                status: 'new',
                createdAt: Date.now(),
                updatedAt: Date.now(),
                messages: [initialMsg],
                teacherUnread: false,
                devUnread: true,
                archived: false,
                starred: false
            };

            if (db) {
                await addDoc(collection(db, 'teacher_feedbacks'), feedbackData);
            }

            setMessageText('');
            setIsSubmitting(false);
            setShowSuccessModal(true);
        } catch (error) {
            console.error("Error sending feedback:", error);
            addToast?.("حدث خطأ أثناء إرسال الرسالة، يرجى المحاولة لاحقاً", "error");
            setIsSubmitting(false);
        }
    };

    // Send a reply in existing conversation
    const handleSendReply = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedFeedback || !replyText.trim()) return;

        setIsReplying(true);
        try {
            const senderName = userProfile?.displayName || user?.displayName || 'معلم';
            const newMsg: FeedbackMessage = {
                id: 'msg_' + Date.now(),
                sender: 'teacher',
                senderName,
                text: replyText.trim(),
                createdAt: Date.now()
            };

            if (db) {
                const docRef = doc(db, 'teacher_feedbacks', selectedFeedback.id);
                await updateDoc(docRef, {
                    messages: arrayUnion(newMsg),
                    updatedAt: Date.now(),
                    devUnread: true,
                    teacherUnread: false
                });
            }

            setReplyText('');
            setIsReplying(false);
        } catch (error) {
            console.error("Error sending reply:", error);
            addToast?.("فشل إرسال الرد، يرجى المحاولة ثانية", "error");
            setIsReplying(false);
        }
    };

    const getTypeConfig = (type: FeedbackType) => {
        return TYPE_OPTIONS.find(t => t.id === type) || TYPE_OPTIONS[0];
    };

    const formatDate = (timestamp: number) => {
        if (!timestamp) return '';
        const d = new Date(timestamp);
        return d.toLocaleDateString('ar-EG', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100 flex flex-col dir-rtl">
            {/* Header */}
            <div className="sticky top-0 z-20 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 shadow-xs flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button 
                        onClick={onBack}
                        className="p-2 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors cursor-pointer"
                        aria-label="الرجوع"
                    >
                        <FaArrowRight size={16} />
                    </button>
                    <div>
                        <h1 className="text-base font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                            <FaComments className="text-primary dark:text-accent" size={18} />
                            اقتراحات وملاحظات
                        </h1>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400">تواصل مباشر مع مطور النظام</p>
                    </div>
                </div>

                {/* Sub-navigation Tabs */}
                <div className="flex items-center bg-gray-100 dark:bg-gray-700/60 p-1 rounded-xl">
                    <button
                        onClick={() => setActiveTab('new')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                            activeTab === 'new' 
                            ? 'bg-white dark:bg-gray-800 text-primary dark:text-accent shadow-xs' 
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                        }`}
                    >
                        <FaPaperPlane size={11} />
                        إرسال
                    </button>

                    <button
                        onClick={() => setActiveTab('my_messages')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 relative cursor-pointer ${
                            activeTab === 'my_messages' 
                            ? 'bg-white dark:bg-gray-800 text-primary dark:text-accent shadow-xs' 
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                        }`}
                    >
                        <FaInbox size={11} />
                        رسائلي
                        {unreadRepliesCount > 0 && (
                            <span className="bg-red-500 text-white text-[9px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                                {unreadRepliesCount}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* Content Body */}
            <div className="flex-1 p-4 max-w-2xl mx-auto w-full space-y-4">
                {activeTab === 'new' ? (
                    <div className="space-y-4">
                        {/* Welcoming Greeting Card */}
                        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent dark:from-accent/15 dark:via-accent/5 border border-primary/20 dark:border-accent/20 rounded-2xl p-4 shadow-xs relative overflow-hidden">
                            <div className="flex items-start gap-3">
                                <div className="p-2.5 bg-primary dark:bg-accent text-white rounded-xl shadow-xs shrink-0">
                                    <FaStar size={20} />
                                </div>
                                <div className="space-y-1">
                                    <h2 className="text-sm font-extrabold text-primary dark:text-accent">
                                        خبرنا بما حدث
                                    </h2>
                                    <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed font-medium">
                                        شاركنا اقتراحاتك، إضافاتك، المشاكل التي تواجهها أو أي فكرة تساعدنا على تطوير النظام وتحسين تجربتك.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Submission Form */}
                        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-xs border border-gray-100 dark:border-gray-700 space-y-4">
                            {/* 1 - Message Type Selection */}
                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                                    نوع الرسالة
                                </label>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {TYPE_OPTIONS.map((opt) => {
                                        const Icon = opt.icon;
                                        const isSelected = feedbackType === opt.id;
                                        return (
                                            <button
                                                key={opt.id}
                                                type="button"
                                                onClick={() => setFeedbackType(opt.id)}
                                                className={`p-2.5 rounded-xl border text-right flex items-center gap-2 transition-all cursor-pointer ${
                                                    isSelected 
                                                    ? 'border-primary dark:border-accent bg-primary/5 dark:bg-accent/10 text-primary dark:text-accent shadow-xs font-bold' 
                                                    : 'border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                                                }`}
                                            >
                                                <div className={`p-1.5 rounded-lg ${opt.bgColor} ${opt.color}`}>
                                                    <Icon size={13} />
                                                </div>
                                                <span className="text-xs">{opt.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* 2 - Message Text Area */}
                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                                    تفاصيل الرسالة
                                </label>
                                <textarea
                                    value={messageText}
                                    onChange={(e) => setMessageText(e.target.value)}
                                    rows={5}
                                    placeholder="اكتب تفاصيل الاقتراح، المشكلة، أو الفكرة بالتفصيل هنا..."
                                    className="w-full p-3 bg-gray-50 dark:bg-gray-700/40 border border-gray-200 dark:border-gray-600 rounded-xl text-xs text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-hidden focus:ring-2 focus:ring-primary dark:focus:ring-accent resize-none transition-all leading-relaxed"
                                    dir="rtl"
                                    required
                                />
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={isSubmitting || !messageText.trim()}
                                className="w-full py-3 bg-primary dark:bg-accent text-white rounded-xl text-xs font-bold hover:opacity-95 transition-all shadow-md active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                            >
                                {isSubmitting ? (
                                    <span>جاري الإرسال...</span>
                                ) : (
                                    <>
                                        <FaPaperPlane size={13} />
                                        <span>إرسال الرسالة</span>
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                ) : (
                    /* My Messages View */
                    <div className="space-y-3">
                        {myFeedbacks.length === 0 ? (
                            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 text-center space-y-3 border border-gray-100 dark:border-gray-700">
                                <div className="p-3 bg-gray-100 dark:bg-gray-700 text-gray-400 rounded-full w-12 h-12 mx-auto flex items-center justify-center">
                                    <FaInbox size={22} />
                                </div>
                                <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">لا توجد رسائل سابقة</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    لم تقم بإرسال أي اقتراحات أو ملاحظات بعد. يمكنك إنشاء رسالة جديدة من قسم "إرسال".
                                </p>
                                <button
                                    onClick={() => setActiveTab('new')}
                                    className="px-4 py-2 bg-primary dark:bg-accent text-white text-xs font-bold rounded-xl shadow-xs hover:opacity-95 transition-all cursor-pointer inline-flex items-center gap-2 mt-1"
                                >
                                    <FaPaperPlane size={12} />
                                    <span>إرسال رسالة جديدة</span>
                                </button>
                            </div>
                        ) : (
                            myFeedbacks.map((item) => {
                                const typeCfg = getTypeConfig(item.type);
                                const statusCfg = STATUS_CONFIG[item.status] || STATUS_CONFIG['new'];
                                const TypeIcon = typeCfg.icon;
                                const lastMsg = item.messages?.[item.messages.length - 1];

                                return (
                                    <div
                                        key={item.id}
                                        onClick={() => setSelectedFeedback(item)}
                                        className={`bg-white dark:bg-gray-800 rounded-2xl p-4 border transition-all cursor-pointer hover:shadow-md relative space-y-2.5 ${
                                            item.teacherUnread 
                                            ? 'border-emerald-400 dark:border-emerald-500 shadow-xs bg-emerald-50/20 dark:bg-emerald-950/10' 
                                            : 'border-gray-100 dark:border-gray-700 shadow-2xs'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1.5 ${typeCfg.bgColor} ${typeCfg.color}`}>
                                                    <TypeIcon size={11} />
                                                    {typeCfg.label}
                                                </span>

                                                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${statusCfg.bgColor} ${statusCfg.color}`}>
                                                    {statusCfg.label}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-2 text-gray-400 text-[10px]">
                                                <span>{formatDate(item.createdAt)}</span>
                                                <FaChevronLeft size={10} />
                                            </div>
                                        </div>

                                        <p className="text-xs font-medium text-gray-800 dark:text-gray-200 line-clamp-2 leading-relaxed">
                                            {lastMsg?.text || item.subject}
                                        </p>

                                        <div className="flex items-center justify-between pt-1 border-t border-gray-50 dark:border-gray-700/50 text-[11px] text-gray-500 dark:text-gray-400">
                                            <span className="flex items-center gap-1.5">
                                                <FaCommentDots size={12} className="text-gray-400" />
                                                <span>عدد الرسائل: {item.messages?.length || 1}</span>
                                            </span>

                                            {item.teacherUnread && (
                                                <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                                                    رد جديد من المطور
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}
            </div>

            {/* Modal: Feedback Conversation Detail */}
            {selectedFeedback && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs dir-rtl">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg h-[85vh] flex flex-col shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                        {/* Conversation Header */}
                        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/80 shrink-0">
                            <div className="flex items-center gap-2.5">
                                <div className={`p-2 rounded-xl ${getTypeConfig(selectedFeedback.type).bgColor} ${getTypeConfig(selectedFeedback.type).color}`}>
                                    {React.createElement(getTypeConfig(selectedFeedback.type).icon, { size: 16 })}
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100">
                                        تفاصيل الرسالة
                                    </h3>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-[10px] text-gray-500 dark:text-gray-400">
                                            {formatDate(selectedFeedback.createdAt)}
                                        </span>
                                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold border ${STATUS_CONFIG[selectedFeedback.status]?.bgColor} ${STATUS_CONFIG[selectedFeedback.status]?.color}`}>
                                            {STATUS_CONFIG[selectedFeedback.status]?.label}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => setSelectedFeedback(null)}
                                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                                aria-label="إغلاق"
                            >
                                <FaTimes size={16} />
                            </button>
                        </div>

                        {/* Conversation Chat Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/30 dark:bg-gray-900/40 custom-scrollbar">
                            {selectedFeedback.messages?.map((msg, idx) => {
                                const isDev = msg.sender === 'developer';
                                return (
                                    <div
                                        key={msg.id || idx}
                                        className={`flex flex-col ${isDev ? 'items-start' : 'items-end'}`}
                                    >
                                        <div className="flex items-center gap-1.5 mb-1 px-1">
                                            <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                                {isDev ? (
                                                    <>
                                                        <FaRobot className="text-primary dark:text-accent" size={11} />
                                                        <span>فريق التطوير</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <FaUser className="text-emerald-600" size={10} />
                                                        <span>{msg.senderName || 'أنت'}</span>
                                                    </>
                                                )}
                                            </span>
                                            <span className="text-[9px] text-gray-400">
                                                {formatDate(msg.createdAt)}
                                            </span>
                                        </div>

                                        <div
                                            className={`p-3 rounded-2xl max-w-[85%] text-xs leading-relaxed shadow-2xs ${
                                                isDev
                                                ? 'bg-gradient-to-br from-primary to-primary/95 text-white dark:from-accent dark:to-accent/95 dark:text-gray-900 rounded-tl-xs'
                                                : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 border border-gray-100 dark:border-gray-600 rounded-tr-xs'
                                            }`}
                                        >
                                            <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={chatEndRef} />
                        </div>

                        {/* Conversation Reply Input */}
                        <div className="p-3 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shrink-0">
                            {selectedFeedback.status === 'closed' ? (
                                <div className="p-2.5 bg-gray-100 dark:bg-gray-700/50 rounded-xl text-center text-xs text-gray-500 dark:text-gray-400 font-bold flex items-center justify-center gap-2">
                                    <FaLock size={12} />
                                    <span>هذه المحادثة مغلقة من قبل فريق التطوير</span>
                                </div>
                            ) : (
                                <form onSubmit={handleSendReply} className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={replyText}
                                        onChange={(e) => setReplyText(e.target.value)}
                                        placeholder="اكتب ردك ومتابعتك هنا..."
                                        className="flex-1 p-2.5 bg-gray-50 dark:bg-gray-700/40 border border-gray-200 dark:border-gray-600 rounded-xl text-xs text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-primary dark:focus:ring-accent"
                                        dir="rtl"
                                    />
                                    <button
                                        type="submit"
                                        disabled={isReplying || !replyText.trim()}
                                        className="p-2.5 bg-primary dark:bg-accent text-white rounded-xl hover:opacity-95 transition-all disabled:opacity-50 cursor-pointer shrink-0"
                                    >
                                        <FaPaperPlane size={13} />
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Success Confirmation Modal */}
            {showSuccessModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs dir-rtl">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-gray-100 dark:border-gray-700 text-center space-y-4">
                        <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-xs">
                            <FaCheckCircle size={30} />
                        </div>

                        <div className="space-y-2">
                            <h3 className="text-base font-extrabold text-gray-800 dark:text-gray-100">
                                تم إرسال رسالتك بنجاح
                            </h3>
                            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                                تم إرسال رسالتك بنجاح إلى فريق التطوير. سيتم مراجعتها والرد عليك في أقرب وقت بإذن الله.
                            </p>
                        </div>

                        <button
                            onClick={() => {
                                setShowSuccessModal(false);
                                setActiveTab('my_messages');
                            }}
                            className="w-full py-2.5 bg-primary dark:bg-accent text-white rounded-xl text-xs font-bold hover:opacity-95 transition-all cursor-pointer shadow-xs"
                        >
                            عرض رسائلي
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TeacherFeedback;

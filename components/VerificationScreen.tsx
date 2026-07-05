
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaEnvelope, FaCheckCircle, FaExclamationTriangle, FaPaperPlane, FaSignOutAlt, FaEdit, FaChevronLeft, FaSave } from 'react-icons/fa';
import { auth, sendEmailVerification, logoutUser, updateEmail, db, doc, updateDoc } from '../firebase';

interface VerificationScreenProps {
    email: string;
    onVerified: () => void;
    addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const VerificationScreen: React.FC<VerificationScreenProps> = ({ email, onVerified, addToast }) => {
    const [isResending, setIsResending] = useState(false);
    const [timeLeft, setTimeLeft] = useState(0);
    const [isEditingEmail, setIsEditingEmail] = useState(false);
    const [newEmail, setNewEmail] = useState(email);
    const [isUpdating, setIsUpdating] = useState(false);

    useEffect(() => {
        if (timeLeft > 0) {
            const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [timeLeft]);

    const handleResend = async () => {
        if (timeLeft > 0) return;
        
        setIsResending(true);
        try {
            if (auth.currentUser) {
                await sendEmailVerification(auth.currentUser);
                addToast('✅ تم إعادة إرسال رابط التحقق بنجاح.', 'success');
                setTimeLeft(60);
            }
        } catch (error: any) {
            addToast('❌ فشل إرسال الرابط. حاول مرة أخرى لاحقاً.', 'error');
        } finally {
            setIsResending(false);
        }
    };

    const handleUpdateEmail = async () => {
        if (!newEmail || newEmail === email) {
            setIsEditingEmail(false);
            return;
        }
        
        if (!newEmail.includes('@')) {
            addToast('يرجى إدخال بريد إلكتروني صحيح', 'error');
            return;
        }

        setIsUpdating(true);
        try {
            if (auth.currentUser) {
                await updateEmail(auth.currentUser, newEmail);
                await updateDoc(doc(db, 'users', auth.currentUser.uid), {
                    email: newEmail
                });
                await sendEmailVerification(auth.currentUser);
                addToast('✅ تم تحديث البريد وإرسال رابط جديد.', 'success');
                setIsEditingEmail(false);
            }
        } catch (error: any) {
            console.error("Update email error:", error);
            if (error.code === 'auth/requires-recent-login') {
                addToast('يرجى تسجيل الخروج ثم الدخول مرة أخرى لتغيير البريد.', 'error');
            } else {
                addToast('فشل تحديث البريد. تأكد من صحته.', 'error');
            }
        } finally {
            setIsUpdating(false);
        }
    };

    const handleCheckVerification = async () => {
        if (auth.currentUser) {
            await auth.currentUser.reload();
            if (auth.currentUser.emailVerified) {
                addToast('✅ تم التحقق بنجاح!', 'success');
                onVerified();
            } else {
                addToast('ℹ️ لم يتم التحقق بعد، يرجى الضغط على الرابط في بريدك.', 'info');
            }
        }
    };

    return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 font-sans">
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="max-w-md w-full text-center space-y-8"
            >
                {/* Logo or Brand placeholder */}
                <div className="mb-8">
                    <div className="text-primary font-bold text-2xl tracking-tight">نظام الحلقات</div>
                    <div className="h-1 w-12 bg-primary mx-auto mt-2 rounded-full"></div>
                </div>

                <AnimatePresence mode="wait">
                    {!isEditingEmail ? (
                        <motion.div 
                            key="info"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-6"
                        >
                            <div className="space-y-2">
                                <h2 className="text-2xl font-semibold text-gray-900">تحقق من بريدك الإلكتروني</h2>
                                <p className="text-sm text-gray-500 max-w-[280px] mx-auto leading-relaxed">
                                    لقد أرسلنا رابط تفعيل إلى عنوان البريد الإلكتروني التالي
                                </p>
                            </div>

                            <div className="flex items-center justify-center gap-3 bg-gray-50 py-3 px-4 rounded-xl border border-gray-100 group">
                                <span className="font-medium text-gray-700" dir="ltr">{email}</span>
                                <button 
                                    onClick={() => setIsEditingEmail(true)}
                                    className="text-primary hover:text-primary-dark transition-colors"
                                    title="تعديل البريد"
                                >
                                    <FaEdit size={14} />
                                </button>
                            </div>

                            <div className="space-y-3">
                                <button 
                                    onClick={handleCheckVerification}
                                    className="w-full bg-primary text-white text-sm font-bold py-3 rounded-xl hover:shadow-lg hover:shadow-primary/20 transition-all flex items-center justify-center gap-2"
                                >
                                    <FaCheckCircle size={14} />
                                    <span>تم التحقق، دخول</span>
                                </button>

                                <div className="grid grid-cols-2 gap-3">
                                    <button 
                                        onClick={handleResend}
                                        disabled={isResending || timeLeft > 0}
                                        className="bg-white border border-gray-200 text-gray-600 text-xs font-bold py-3 rounded-xl hover:bg-gray-50 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        <FaPaperPlane size={12} />
                                        <span>{timeLeft > 0 ? `إعادة (${timeLeft}ث)` : 'إعادة الإرسال'}</span>
                                    </button>
                                    <button 
                                        onClick={async () => {
                                            try { await logoutUser(); } catch (e) { addToast('خطأ في تسجيل الخروج', 'error'); }
                                        }}
                                        className="bg-white border border-gray-200 text-gray-600 text-xs font-bold py-3 rounded-xl hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                                    >
                                        <FaSignOutAlt size={12} />
                                        <span>خروج</span>
                                    </button>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-gray-50">
                                <div className="flex items-start gap-4 text-right bg-amber-50/50 p-4 rounded-2xl border border-amber-100/50">
                                    <FaExclamationTriangle className="text-amber-500 mt-1 flex-shrink-0" size={16} />
                                    <div>
                                        <div className="text-xs font-bold text-amber-800 mb-1">لم تصلك الرسالة؟</div>
                                        <p className="text-[10px] text-amber-700 leading-relaxed">
                                            يرجى التحقق من مجلد الرسائل غير المرغوب فيها (Spam) أو التأكد من صحة البريد الإلكتروني المدخل.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div 
                            key="edit"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-6"
                        >
                            <div className="space-y-2 text-right">
                                <button 
                                    onClick={() => setIsEditingEmail(false)}
                                    className="text-gray-400 hover:text-primary transition-colors flex items-center gap-1 text-xs"
                                >
                                    <FaChevronLeft size={10} />
                                    إلغاء التعديل
                                </button>
                                <h2 className="text-xl font-semibold text-gray-900 mt-4">تعديل البريد الإلكتروني</h2>
                                <p className="text-xs text-gray-500 leading-relaxed">
                                    أدخل البريد الصحيح لإرسال رابط التحقق إليه
                                </p>
                            </div>

                            <div className="relative">
                                <FaEnvelope className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300" />
                                <input 
                                    type="email"
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pr-10 pl-4 text-sm outline-none focus:ring-2 focus:ring-primary focus:bg-white transition-all"
                                    placeholder="البريد الجديد"
                                    value={newEmail}
                                    onChange={(e) => setNewEmail(e.target.value)}
                                    dir="ltr"
                                />
                            </div>

                            <button 
                                onClick={handleUpdateEmail}
                                disabled={isUpdating}
                                className="w-full bg-primary text-white text-sm font-bold py-3 rounded-xl hover:shadow-lg hover:shadow-primary/20 transition-all flex items-center justify-center gap-2"
                            >
                                <FaSave size={14} />
                                <span>{isUpdating ? 'جاري التحديث...' : 'حفظ البريد الجديد'}</span>
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="pt-20 text-[10px] text-gray-300 tracking-widest uppercase">
                    Official Verification Portal &copy; {new Date().getFullYear()}
                </div>
            </motion.div>
        </div>
    );
};

export default VerificationScreen;

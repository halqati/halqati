
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaLink, FaUserPlus, FaSignInAlt, FaEnvelope, FaLock, FaChevronLeft, FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';
import { auth, signInWithEmailAndPassword, sendEmailVerification, onAuthStateChanged, User } from '../firebase';

interface LinkCirclesModalProps {
    isOpen: boolean;
    onClose: () => void;
    unlinkedCount: number;
    onLinkSuccess: (user: User) => void;
    addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const LinkCirclesModal: React.FC<LinkCirclesModalProps> = ({ isOpen, onClose, unlinkedCount, onLinkSuccess, addToast }) => {
    const [step, setStep] = useState<'options' | 'login' | 'verify'>('options');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [currentUser, setCurrentUser] = useState<User | null>(auth?.currentUser || null);

    useEffect(() => {
        if (!auth) return;
        const unsub = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
        });
        return () => unsub();
    }, []);

    const handleLoginAndVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!auth) return;
        
        setIsLoading(true);
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            
            if (user.emailVerified || user.email?.endsWith('@quran.app')) {
                onLinkSuccess(user);
                addToast('تم ربط الحلقات بنجاح', 'success');
                onClose();
            } else {
                await sendEmailVerification(user);
                setStep('verify');
                addToast('تم إرسال رسالة التحقق، يرجى تفعيل حسابك من البريد الإلكتروني', 'info');
            }
        } catch (error: any) {
            console.error("Linking login failed:", error);
            addToast('فشل تسجيل الدخول. تأكد من البريد وكلمة المرور.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const checkVerification = async () => {
        if (!auth?.currentUser) return;
        setIsLoading(true);
        try {
            await auth.currentUser.reload();
            if (auth.currentUser.emailVerified) {
                onLinkSuccess(auth.currentUser);
                addToast('تم التحقق وربط الحلقات بنجاح', 'success');
                onClose();
            } else {
                addToast('لم يتم التحقق بعد. يرجى مراجعة بريدك الإلكتروني.', 'info');
            }
        } catch (error) {
            addToast('حدث خطأ أثناء فحص التحقق', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden border border-gray-100 dark:border-gray-700"
            >
                {/* Header */}
                <div className="p-6 bg-primary dark:bg-accent text-white text-center relative">
                    <button 
                        onClick={onClose}
                        className="absolute left-4 top-4 text-white/70 hover:text-white transition-colors"
                    >
                        ✕
                    </button>
                    <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <FaLink size={30} />
                    </div>
                    <h2 className="text-xl font-bold">ربط الحلقات بحساب</h2>
                    <p className="text-white/80 text-sm mt-1">لديك {unlinkedCount} {unlinkedCount > 1 ? 'حلقات' : 'حلقة'} غير مربوطة بحساب</p>
                </div>

                <div className="p-6">
                    {step === 'options' && (
                        <div className="space-y-4">
                            <button 
                                onClick={() => {
                                    // Trigger App's showRegistration logic (we'll need a way for App to handle this)
                                    onClose();
                                    const event = new CustomEvent('auth:showSignup');
                                    window.dispatchEvent(event);
                                }}
                                className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/30 rounded-2xl border border-gray-100 dark:border-gray-700 hover:bg-primary/5 dark:hover:bg-accent/5 hover:border-primary/30 dark:hover:border-accent/30 transition-all group"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-white dark:bg-gray-700 rounded-xl flex items-center justify-center shadow-sm text-primary dark:text-accent">
                                        <FaUserPlus size={20} />
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-sm text-gray-800 dark:text-gray-100">إنشاء حساب جديد</p>
                                        <p className="text-[10px] text-gray-500 dark:text-gray-400">سوف يتم ربط هذه الحلقات بحسابك الجديد فوراً</p>
                                    </div>
                                </div>
                                <FaChevronLeft className="text-gray-300 dark:text-gray-600 group-hover:-translate-x-1 transition-transform" size={12} />
                            </button>

                            <button 
                                onClick={() => setStep('login')}
                                className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/30 rounded-2xl border border-gray-100 dark:border-gray-700 hover:bg-primary/5 dark:hover:bg-accent/5 hover:border-primary/30 dark:hover:border-accent/30 transition-all group"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-white dark:bg-gray-700 rounded-xl flex items-center justify-center shadow-sm text-primary dark:text-accent">
                                        <FaSignInAlt size={20} />
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-sm text-gray-800 dark:text-gray-100">ربط بحساب موجود</p>
                                        <p className="text-[10px] text-gray-500 dark:text-gray-400">سجل دخولك بحسابك الحالي لدمج هذه الحلقات معه</p>
                                    </div>
                                </div>
                                <FaChevronLeft className="text-gray-300 dark:text-gray-600 group-hover:-translate-x-1 transition-transform" size={12} />
                            </button>
                        </div>
                    )}

                    {step === 'login' && (
                        <form onSubmit={handleLoginAndVerify} className="space-y-4">
                            <div className="relative">
                                <FaEnvelope className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input 
                                    type="email"
                                    placeholder="البريد الإلكتروني"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-600 rounded-xl py-3 pr-10 pl-4 outline-none focus:ring-2 focus:ring-primary dark:focus:ring-accent transition-all text-sm"
                                    required
                                />
                            </div>
                            <div className="relative">
                                <FaLock className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input 
                                    type="password"
                                    placeholder="كلمة المرور"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-600 rounded-xl py-3 pr-10 pl-4 outline-none focus:ring-2 focus:ring-primary dark:focus:ring-accent transition-all text-sm"
                                    required
                                />
                            </div>
                            <button 
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-primary dark:bg-accent text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                            >
                                {isLoading ? 'جاري التحقق...' : 'تسجيل الدخول والربط'}
                            </button>
                            <button 
                                type="button"
                                onClick={() => setStep('options')}
                                className="w-full text-xs text-gray-500 hover:text-primary transition-colors py-2"
                            >
                                العودة للخلف
                            </button>
                        </form>
                    )}

                    {step === 'verify' && (
                        <div className="text-center space-y-4">
                            <div className="w-16 h-16 bg-yellow-50 dark:bg-yellow-900/20 rounded-full flex items-center justify-center mx-auto text-yellow-600 dark:text-yellow-400">
                                <FaEnvelope size={24} className="animate-bounce" />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-800 dark:text-gray-100">يرجى تأكيد بريدك الإلكتروني</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                                    لقد أرسلنا رابطاً لبريدك: <span className="dir-ltr font-bold">{email}</span>. يرجى الضغط عليه لتأكيد الملكية وإتمام عملية الربط بأمان.
                                </p>
                            </div>
                            <button 
                                onClick={checkVerification}
                                disabled={isLoading}
                                className="w-full bg-primary dark:bg-accent text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg"
                            >
                                {isLoading ? 'جاري الفحص...' : 'لقد قمت بالتفعيل، اربط الآن'}
                            </button>
                            <div className="flex flex-col gap-2">
                                <button 
                                    onClick={async () => {
                                        if (auth?.currentUser) {
                                            await sendEmailVerification(auth.currentUser);
                                            addToast('تم إعادة إرسال الرابط', 'info');
                                        }
                                    }}
                                    className="text-xs text-primary font-bold hover:underline"
                                >
                                    إعادة إرسال الرابط
                                </button>
                                <button 
                                    onClick={() => setStep('login')}
                                    className="text-xs text-gray-400 hover:text-gray-600"
                                >
                                    تغيير البريد الإلكتروني
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Info */}
                <div className="p-4 bg-gray-50 dark:bg-gray-900/30 border-t border-gray-100 dark:border-gray-700 flex items-start gap-3">
                    <FaExclamationCircle className="text-primary/70 dark:text-accent/70 mt-0.5 flex-shrink-0" size={14} />
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-normal">
                        عملية الربط تضمن وصولك لبياناتك من أي جهاز وتحميها من الضياع في حال تم مسح ذاكرة المتصفح. نحن نهتم بأمان بياناتك القرآنية.
                    </p>
                </div>
            </motion.div>
        </div>
    );
};

export default LinkCirclesModal;

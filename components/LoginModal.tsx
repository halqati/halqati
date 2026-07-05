
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes, FaUser, FaLock, FaGoogle } from 'react-icons/fa';

interface LoginModalProps {
    isOpen: boolean;
    onClose: () => void;
    onLoginWithUsername: (username: string, password: string, rememberMe: boolean) => void;
    onResetPassword: (email: string) => void;
}

const modalVariants = {
    initial: { scale: 0.9, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0.9, opacity: 0 },
};

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onLoginWithUsername, onResetPassword }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(true);
    const [showResetForm, setShowResetForm] = useState(false);
    const [resetEmail, setResetEmail] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!username.trim() || !password.trim()) {
            setError('يرجى إدخال اسم المستخدم وكلمة المرور');
            return;
        }
        setError('');
        setIsLoading(true);
        try {
            await onLoginWithUsername(username, password, rememberMe);
            onClose();
        } catch (err: any) {
            setError('فشل تسجيل الدخول. تأكد من البيانات.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!resetEmail.trim()) {
            setError('يرجى إدخال البريد الإلكتروني');
            return;
        }
        setError('');
        setIsLoading(true);
        try {
            await onResetPassword(resetEmail);
            setShowResetForm(false);
            setResetEmail('');
        } catch (err: any) {
            setError('فشل إرسال رابط إعادة التعيين');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4">
            <motion.div 
                variants={modalVariants} 
                initial="initial" 
                animate="animate" 
                exit="exit" 
                className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md relative overflow-hidden"
            >
                <button onClick={onClose} className="absolute top-4 left-4 text-gray-400 hover:text-gray-600 transition-colors">
                    <FaTimes size={20} />
                </button>

                <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-primary mb-2">
                        {showResetForm ? 'إعادة تعيين كلمة المرور' : 'تسجيل الدخول'}
                    </h2>
                    <p className="text-sm text-gray-500">
                        {showResetForm 
                            ? 'أدخل بريدك الإلكتروني الحقيقي لتلقي رابط إعادة التعيين (تأكد من تفقد البريد المزعج Spam)' 
                            : 'سجل دخولك لمزامنة حلقاتك مع السحابة'
                        }
                    </p>
                </div>

                {showResetForm ? (
                    <form onSubmit={handleResetSubmit} className="space-y-4">
                        {error && (
                            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center">
                                {error}
                            </div>
                        )}
                        <div className="relative">
                            <FaUser className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input 
                                type="email" 
                                placeholder="البريد الإلكتروني" 
                                value={resetEmail}
                                onChange={(e) => setResetEmail(e.target.value)}
                                className="w-full bg-gray-100 border-none rounded-xl py-3 pr-10 pl-4 outline-none focus:ring-2 focus:ring-primary transition-all"
                                required
                            />
                        </div>
                        <button 
                            type="submit" 
                            disabled={isLoading}
                            className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-3 rounded-xl shadow-lg shadow-primary/20 transition-all disabled:opacity-50"
                        >
                            {isLoading ? 'جاري الإرسال...' : 'إرسال رابط الإعادة'}
                        </button>
                        <button 
                            type="button"
                            onClick={() => setShowResetForm(false)}
                            className="w-full text-sm text-gray-500 hover:text-primary transition-colors"
                        >
                            العودة لتسجيل الدخول
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center">
                                {error}
                            </div>
                        )}

                        <div className="relative">
                            <FaUser className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input 
                                type="text" 
                                placeholder="اسم المستخدم" 
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full bg-gray-100 border-none rounded-xl py-3 pr-10 pl-4 outline-none focus:ring-2 focus:ring-primary transition-all"
                            />
                        </div>

                        <div className="relative">
                            <FaLock className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input 
                                type="password" 
                                placeholder="كلمة المرور" 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-gray-100 border-none rounded-xl py-3 pr-10 pl-4 outline-none focus:ring-2 focus:ring-primary transition-all"
                            />
                        </div>

                        <div className="flex items-center justify-between px-1">
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <input 
                                    type="checkbox" 
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                                />
                                <span className="text-sm text-gray-600 group-hover:text-gray-800 transition-colors">تذكرني</span>
                            </label>
                            <button 
                                type="button"
                                onClick={() => setShowResetForm(true)}
                                className="text-sm text-primary hover:underline transition-all"
                            >
                                نسيت كلمة المرور؟
                            </button>
                        </div>

                        <button 
                            type="submit" 
                            disabled={isLoading}
                            className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-3 rounded-xl shadow-lg shadow-primary/20 transition-all disabled:opacity-50"
                        >
                            {isLoading ? 'جاري التحميل...' : 'دخول / إنشاء حساب'}
                        </button>
                    </form>
                )}

                <p className="mt-6 text-center text-xs text-gray-400 leading-relaxed">
                    باستخدامك للتطبيق، فإنك توافق على شروط الخدمة وسياسة الخصوصية.
                </p>
            </motion.div>
        </div>
    );
};

export default LoginModal;

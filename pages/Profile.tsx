import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CircleData, ConfirmationModalData, UserProfile } from '../types';
import { 
    FaArrowLeft, FaSave, FaCamera, FaBookOpen, FaTrash, FaBuilding, 
    FaGlobe, FaSearch, FaTimes, FaUserShield, FaCopy, FaLock, 
    FaEnvelope, FaExclamationTriangle, FaCheck, FaChevronLeft, 
    FaUser, FaEdit, FaKey, FaShieldAlt, FaPlus 
} from 'react-icons/fa';
import { 
    db, auth, collection, query, where, getDocs, addDoc, updatePassword, 
    reauthenticateWithCredential, EmailAuthProvider, verifyBeforeUpdateEmail, 
    deleteUser, doc, writeBatch, updateDoc, updateProfile 
} from '../firebase';
import { COUNTRIES } from '../constants';
import { encrypt } from '../utils/encryption';

interface ProfileProps {
    mode: 'circle' | 'account';
    data: CircleData;
    allCircles: CircleData[];
    onSave: (data: Partial<CircleData>) => void;
    onUpdateAccountDetails?: (name: string, gender: 'male' | 'female') => Promise<void>;
    onBack: () => void;
    setConfirmationModal: (data: Omit<ConfirmationModalData, 'isOpen'> & { isOpen: boolean }) => void;
    userProfile: UserProfile | null;
    onToggleAdminMode: (isAdmin: boolean) => void;
    addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
    isOnline: boolean;
}

const pageVariants = { 
    initial: { opacity: 0, y: 10 }, 
    animate: { opacity: 1, y: 0 }, 
    exit: { opacity: 0, y: -10 } 
};

const modalVariants = {
    initial: { opacity: 0, scale: 0.95, y: 15 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.95, y: 15 }
};

const getPasswordStrength = (pass: string) => {
    if (!pass) return { label: '', colorClass: 'text-gray-400 bg-gray-100', widthClass: 'w-0', bgClass: 'bg-gray-100' };
    
    if (pass.length < 6) {
        return { label: 'ضعيفة', colorClass: 'text-red-500 dark:text-red-400', widthClass: 'w-1/3', bgClass: 'bg-red-500' };
    }
    
    let score = 1;
    const hasLetters = /[a-zA-Z]/.test(pass) || /[\u0600-\u06FF]/.test(pass);
    const hasDigits = /[0-9]/.test(pass);
    const hasSpecial = /[^a-zA-Z0-9\u0600-\u06FF]/.test(pass);
    
    if (hasLetters && hasDigits) score += 1;
    if (hasSpecial) score += 1;
    if (pass.length >= 8) score += 1;
    
    if (score === 1) {
        return { label: 'ضعيفة', colorClass: 'text-red-500 dark:text-red-400', widthClass: 'w-1/3', bgClass: 'bg-red-500' };
    } else if (score <= 3) {
        return { label: 'متوسطة', colorClass: 'text-yellow-500 dark:text-yellow-400', widthClass: 'w-2/3', bgClass: 'bg-yellow-500' };
    } else {
        return { label: 'قوية', colorClass: 'text-emerald-500 dark:text-emerald-400', widthClass: 'w-full', bgClass: 'bg-emerald-500' };
    }
};

const Profile: React.FC<ProfileProps> = ({ 
    mode, data, allCircles, onSave, onUpdateAccountDetails, onBack, 
    setConfirmationModal, userProfile, onToggleAdminMode, addToast, isOnline 
}) => {
    const isAdmin = userProfile?.role === 'admin' || userProfile?.role === 'superadmin';
    const currentUserId = userProfile?.uid || auth?.currentUser?.uid || '';
    const currentUserRole = data.teachers?.[currentUserId]?.role || 'member';
    const isOwnerOrTeacher = data.ownerId === currentUserId || currentUserRole === 'owner' || currentUserRole === 'teacher';

    // Account data state
    const [profileData, setProfileData] = useState({
        displayName: userProfile?.displayName || auth?.currentUser?.displayName || data.teacher || '',
        gender: (userProfile?.gender || data.teacherGender || 'male') as 'male' | 'female'
    });

    const [userPhoto, setUserPhoto] = useState<string | null>(
        userProfile?.photoURL || auth?.currentUser?.photoURL || null
    );

    // Circle data state
    const [formData, setFormData] = useState({
        teacher: data.teacher,
        circle: data.circle,
        center: data.center,
        town: data.town || '',
        logo: data.logo,
        teacherGender: data.teacherGender,
        transferPassword: data.transferPassword || '',
    });
    const [logoPreview, setLogoPreview] = useState<string | undefined>(data.logo);

    // Active edit modal: 'none' | 'name_gender' | 'email' | 'password' | 'delete' | 'management'
    const [activeModal, setActiveModal] = useState<'none' | 'name_gender' | 'email' | 'password' | 'delete' | 'management'>('none');

    // Security & Auth states
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [isSecurityLoading, setIsSecurityLoading] = useState(false);
    const [deleteStep, setDeleteStep] = useState(1);
    const [verificationCode, setVerificationCode] = useState('');
    const [sentVerificationCode, setSentVerificationCode] = useState('');

    // Management state
    const [invitationCode, setInvitationCode] = useState('');
    const [isSendingRequest, setIsSendingRequest] = useState(false);

    // Saved accounts state
    const [savedAccounts, setSavedAccounts] = useState<any[]>([]);

    // Town modal state
    const [showTownModal, setShowTownModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (mode === 'account') {
            try {
                const saved = JSON.parse(localStorage.getItem('saved_accounts_v1') || '[]');
                setSavedAccounts(saved);
            } catch (e) {
                setSavedAccounts([]);
            }
        }
    }, [mode]);

    useEffect(() => {
        setProfileData({
            displayName: userProfile?.displayName || auth?.currentUser?.displayName || data.teacher || '',
            gender: (userProfile?.gender || data.teacherGender || 'male') as 'male' | 'female'
        });
        if (userProfile?.photoURL || auth?.currentUser?.photoURL) {
            setUserPhoto(userProfile?.photoURL || auth?.currentUser?.photoURL || null);
        }
    }, [userProfile]);

    const handleDeleteSavedAccount = (email: string) => {
        const newSaved = savedAccounts.filter(a => a.email !== email);
        localStorage.setItem('saved_accounts_v1', JSON.stringify(newSaved));
        setSavedAccounts(newSaved);
        addToast('تم حذف الحساب من قائمة المحفوظات', 'info');
    };

    const filteredCountries = COUNTRIES.filter(c => 
        c.ar.includes(searchTerm) || 
        c.en.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Upload & Change User Photo
    const handleUserPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        if (file.size > 2 * 1024 * 1024) {
            addToast('حجم الصورة يجب أن لا يتجاوز 2 ميجابايت', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onloadend = async () => {
            const photoDataUrl = reader.result as string;
            try {
                setUserPhoto(photoDataUrl);

                if (auth?.currentUser) {
                    await updateProfile(auth.currentUser, { photoURL: photoDataUrl });
                }
                if (currentUserId && db) {
                    const userRef = doc(db, 'users', currentUserId);
                    await updateDoc(userRef, { photoURL: photoDataUrl });
                }
                addToast('تم تحديث صورة الملف الشخصي بنجاح', 'success');
            } catch (err) {
                console.error('Failed to update user photo:', err);
                addToast('حدث خطأ أثناء تحديث الصورة', 'error');
            }
        };
        reader.readAsDataURL(file);
    };

    // Save Name & Gender
    const handleSaveNameAndGender = async () => {
        if (!isOnline) {
            addToast('لا يمكن التعديل بدون اتصال بالإنترنت', 'error');
            return;
        }
        if (!profileData.displayName.trim()) {
            addToast('الرجاء إدخال الاسم الكامل', 'error');
            return;
        }

        setIsSecurityLoading(true);
        try {
            if (onUpdateAccountDetails) {
                await onUpdateAccountDetails(profileData.displayName.trim(), profileData.gender);
            } else if (currentUserId && db) {
                const userRef = doc(db, 'users', currentUserId);
                await updateDoc(userRef, { 
                    displayName: profileData.displayName.trim(), 
                    gender: profileData.gender 
                });
                if (auth?.currentUser) {
                    await updateProfile(auth.currentUser, { displayName: profileData.displayName.trim() });
                }
                addToast('تم تحديث بيانات الحساب بنجاح', 'success');
            }

            onSave({ 
                ...formData, 
                teacher: profileData.displayName.trim(), 
                teacherGender: profileData.gender 
            });

            setActiveModal('none');
        } catch (e) {
            console.error("Profile update error", e);
            addToast('حدث خطأ أثناء حفظ التغييرات', 'error');
        } finally {
            setIsSecurityLoading(false);
        }
    };

    const handleReauthenticate = async (password: string) => {
        if (!auth?.currentUser || !auth.currentUser.email) return false;
        const credential = EmailAuthProvider.credential(auth.currentUser.email, password);
        try {
            await reauthenticateWithCredential(auth.currentUser, credential);
            return true;
        } catch (error) {
            addToast('كلمة المرور غير صحيحة', 'error');
            return false;
        }
    };

    const handleUpdatePassword = async () => {
        if (newPassword !== confirmNewPassword) {
            addToast('كلمات المرور غير متطابقة', 'error');
            return;
        }
        if (newPassword.length < 6) {
            addToast('يجب أن تكون كلمة المرور 6 أحرف على الأقل', 'error');
            return;
        }

        setIsSecurityLoading(true);
        try {
            const reauthed = await handleReauthenticate(oldPassword);
            if (!reauthed) {
                setIsSecurityLoading(false);
                return;
            }

            if (auth?.currentUser) {
                await updatePassword(auth.currentUser, newPassword);
                
                if (db && auth.currentUser.uid) {
                    const userRef = doc(db, 'users', auth.currentUser.uid);
                    await updateDoc(userRef, { plainPassword: newPassword });
                }

                const savedAccs = JSON.parse(localStorage.getItem('saved_accounts_v1') || '[]');
                const newSaved = savedAccs.map((a: any) => 
                    a.email === auth!.currentUser?.email ? { ...a, password: encrypt(newPassword) } : a
                );
                localStorage.setItem('saved_accounts_v1', JSON.stringify(newSaved));

                addToast('تم تغيير كلمة المرور بنجاح', 'success');
                setActiveModal('none');
                setOldPassword('');
                setNewPassword('');
                setConfirmNewPassword('');
            }
        } catch (error: any) {
            addToast('فشل تحديث كلمة المرور', 'error');
        } finally {
            setIsSecurityLoading(false);
        }
    };

    const handleRequestEmailUpdate = async () => {
        if (!newEmail || !newEmail.includes('@')) {
            addToast('بريد إلكتروني غير صالح', 'error');
            return;
        }
        setIsSecurityLoading(true);
        try {
            const reauthed = await handleReauthenticate(oldPassword);
            if (!reauthed) {
                setIsSecurityLoading(false);
                return;
            }

            if (auth?.currentUser) {
                const otp = Math.floor(100000 + Math.random() * 900000).toString();
                setSentVerificationCode(otp);
                setDeleteStep(2);
                addToast('تم إرسال كود التحقق (الكود التجريبي: ' + otp + ')', 'info'); 
            }
        } catch (error: any) {
            addToast('فشل العملية', 'error');
        } finally {
            setIsSecurityLoading(false);
        }
    };

    const handleConfirmEmailUpdate = async () => {
        if (verificationCode !== sentVerificationCode) {
            addToast('كود التحقق غير صحيح', 'error');
            return;
        }
        setIsSecurityLoading(true);
        try {
            if (auth?.currentUser) {
                await verifyBeforeUpdateEmail(auth.currentUser, newEmail);
                addToast('تم البدء في تغيير البريد. يرجى التحقق من الرسالة المرسلة لبريدك الجديد لتأكيد التغيير.', 'success');
                setActiveModal('none');
                setDeleteStep(1);
            }
        } catch (error: any) {
            addToast('فشل تحديث البريد', 'error');
        } finally {
            setIsSecurityLoading(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (deleteStep === 1) {
            const reauthed = await handleReauthenticate(oldPassword);
            if (!reauthed) return;
            
            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            setSentVerificationCode(otp);
            setDeleteStep(2);
            addToast('تم إرسال كود التأكيد النهائي لبريدك (الكود: ' + otp + ')', 'info');
            return;
        }

        if (verificationCode !== sentVerificationCode) {
            addToast('كود التأكيد غير صحيح', 'error');
            return;
        }

        setIsSecurityLoading(true);
        try {
            if (auth?.currentUser && db) {
                const uid = auth.currentUser.uid;
                const batch = writeBatch(db);
                batch.delete(doc(db, 'users', uid));
                
                for (const circle of allCircles) {
                    if (circle.ownerId === uid) {
                        batch.delete(doc(db, 'circles', circle.id));
                    }
                }
                
                await batch.commit();
                await deleteUser(auth.currentUser);
                localStorage.clear();
                window.location.reload();
            }
        } catch (error: any) {
            console.error("Delete account error:", error);
            addToast('فشل حذف الحساب. قد تحتاج لتسجيل الخروج والدخول مرة أخرى.', 'error');
        } finally {
            setIsSecurityLoading(false);
        }
    };

    const handleJoinManagement = async () => {
        if (!invitationCode.trim()) return;
        setIsSendingRequest(true);
        try {
            if (!db) return;
            const q = query(collection(db, 'managements'), where('invitationCode', '==', invitationCode.trim()));
            const querySnapshot = await getDocs(q);
            
            if (querySnapshot.empty) {
                addToast('كود الإدارة غير صحيح', 'error');
                setIsSendingRequest(false);
                return;
            }

            const mgmtDoc = querySnapshot.docs[0];

            await addDoc(collection(db, 'managementRequests'), {
                managementId: mgmtDoc.id,
                teacherId: userProfile?.uid,
                teacherEmail: userProfile?.email || auth?.currentUser?.email,
                circleIds: allCircles.map(c => c.id),
                status: 'pending',
                type: 'pull',
                createdAt: Date.now()
            });

            addToast('تم إرسال طلب الانضمام بنجاح. بانتظار موافقة الإدارة.', 'success');
            setInvitationCode('');
            setActiveModal('none');
        } catch (error) {
            addToast('فشل إرسال الطلب', 'error');
        } finally {
            setIsSendingRequest(false);
        }
    };

    // Circle Settings handlers
    const handleChangeCircleForm = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result as string;
                setFormData(prev => ({ ...prev, logo: result }));
                setLogoPreview(result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleDeleteLogo = () => {
        setConfirmationModal({
            isOpen: true,
            title: 'حذف الشعار',
            message: 'هل أنت متأكد من حذف الشعار؟ سيتم استعادة الشعار الافتراضي.',
            onConfirm: () => {
                setFormData(prev => ({ ...prev, logo: undefined }));
                setLogoPreview(undefined);
                setConfirmationModal({ isOpen: false, title: '', message: '', onConfirm: () => {} });
            }
        });
    };

    const handleSaveCircleAll = () => {
        if (!isOwnerOrTeacher) {
            addToast('غير مسموح لك بالتعديل، الرجاء طلب السماح من الإدارة', 'error');
            return;
        }
        onSave({ 
            ...formData, 
            teacher: profileData.displayName, 
            teacherGender: profileData.gender 
        });
        addToast('تم حفظ بيانات الحلقة بنجاح', 'success');
        onBack();
    };

    return (
        <motion.div 
            variants={pageVariants} 
            initial="initial" 
            animate="animate" 
            exit="exit" 
            className="max-w-md mx-auto pb-12 px-3 sm:px-4 text-right"
        >
            {/* Header Top Nav */}
            <div className="flex items-center justify-between py-3 mb-3 border-b border-gray-100 dark:border-gray-800">
                <button 
                    onClick={onBack} 
                    className="p-2 -mr-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-700 dark:text-gray-200 transition-colors flex items-center justify-center active:scale-95"
                    aria-label="رجوع"
                >
                    <FaArrowLeft className="text-base" />
                </button>
                <h2 className="text-base font-black text-gray-800 dark:text-gray-100 tracking-tight">
                    {mode === 'account' ? 'إعدادات الحساب' : 'إعدادات الحلقة'}
                </h2>
                <div className="w-8" />
            </div>

            {!isOnline && mode === 'account' && (
                <div className="mb-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 rounded-2xl flex items-center gap-2.5">
                    <FaExclamationTriangle className="text-amber-600 dark:text-amber-400 text-sm flex-shrink-0" />
                    <p className="text-xs text-amber-800 dark:text-amber-300 font-bold leading-tight">
                        أنت تعمل حالياً بدون اتصال. لا يمكن تعديل بيانات الحساب أو الأمان حتى يتوفر إنترنت.
                    </p>
                </div>
            )}

            {mode === 'account' ? (
                <div className="space-y-4">
                    {/* SECTION 1: Top Hero Profile Card */}
                    <div className="bg-gradient-to-br from-primary/10 via-white to-primary/5 dark:from-gray-800 dark:via-gray-800 dark:to-gray-900 p-5 rounded-3xl border border-primary/15 dark:border-gray-700 shadow-sm relative overflow-hidden text-center">
                        <div className="relative w-20 h-20 mx-auto mb-3">
                            {userPhoto ? (
                                <img 
                                    src={userPhoto} 
                                    alt="User avatar" 
                                    className="w-20 h-20 rounded-full object-cover border-2 border-white dark:border-gray-700 shadow-md mx-auto" 
                                />
                            ) : (
                                <div className="w-20 h-20 rounded-full bg-primary/20 text-primary dark:bg-gray-700 dark:text-gray-300 flex items-center justify-center border-2 border-white dark:border-gray-700 shadow-md mx-auto text-3xl font-black">
                                    <FaUser />
                                </div>
                            )}

                            {/* Camera overlay button to update photo directly */}
                            <label 
                                htmlFor="user-photo-input" 
                                className="absolute bottom-0 right-0 bg-primary text-white p-2 rounded-full shadow-lg cursor-pointer hover:bg-primary/90 active:scale-90 transition-transform flex items-center justify-center border-2 border-white dark:border-gray-800"
                                title="تغيير الصورة الشخصية"
                            >
                                <FaCamera size={11} />
                            </label>
                            <input 
                                type="file" 
                                id="user-photo-input" 
                                onChange={handleUserPhotoChange} 
                                accept="image/*" 
                                className="hidden" 
                                disabled={!isOnline}
                            />
                        </div>

                        <h3 className="text-lg font-black text-gray-800 dark:text-gray-100 leading-snug">
                            {profileData.displayName || 'بدون اسم'}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-mono dir-ltr truncate max-w-[240px] mx-auto mt-0.5 dir-ltr">
                            {userProfile?.email || auth?.currentUser?.email || 'لا يوجد بريد'}
                        </p>

                        <div className="mt-3 flex items-center justify-center gap-2">
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-3 py-1 bg-white dark:bg-gray-700 text-primary dark:text-accent rounded-full border border-primary/20 dark:border-gray-600 shadow-2xs">
                                <FaShieldAlt size={10} />
                                {profileData.gender === 'female' ? 'معلمة حلقة' : 'معلم حلقة'}
                            </span>
                            {userProfile?.managementId && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-3 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-full border border-emerald-200 dark:border-emerald-800">
                                    <FaBuilding size={10} />
                                    مرتبط بإدارة
                                </span>
                            )}
                        </div>
                    </div>

                    {/* SECTION 2: Personal Info Card */}
                    <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700/80 shadow-xs overflow-hidden">
                        <div className="px-4 py-3 bg-gray-50/80 dark:bg-gray-800/80 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
                            <FaUser className="text-primary text-xs" />
                            <h4 className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                البيانات الشخصية
                            </h4>
                        </div>

                        <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
                            {/* Item: Name & Gender */}
                            <button 
                                onClick={() => isOnline && setActiveModal('name_gender')}
                                disabled={!isOnline}
                                className="w-full p-3.5 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-right group disabled:opacity-50"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-2xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
                                        <FaEdit size={14} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-gray-500 dark:text-gray-400">الاسم والصفة</p>
                                        <p className="text-sm font-black text-gray-800 dark:text-gray-100 mt-0.5">
                                            {profileData.displayName} ({profileData.gender === 'female' ? 'معلمة' : 'معلم'})
                                        </p>
                                    </div>
                                </div>
                                <FaChevronLeft size={12} className="text-gray-300 dark:text-gray-600 group-hover:-translate-x-1 transition-transform" />
                            </button>

                            {/* Item: Email */}
                            <button 
                                onClick={() => {
                                    if (!isOnline) return;
                                    setDeleteStep(1);
                                    setActiveModal('email');
                                }}
                                disabled={!isOnline}
                                className="w-full p-3.5 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-right group disabled:opacity-50"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0">
                                        <FaEnvelope size={14} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-gray-500 dark:text-gray-400">البريد الإلكتروني</p>
                                        <p className="text-xs font-bold font-mono text-gray-800 dark:text-gray-200 dir-ltr text-right mt-0.5">
                                            {userProfile?.email || auth?.currentUser?.email || 'لا يوجد'}
                                        </p>
                                    </div>
                                </div>
                                <FaChevronLeft size={12} className="text-gray-300 dark:text-gray-600 group-hover:-translate-x-1 transition-transform" />
                            </button>
                        </div>
                    </div>

                    {/* SECTION 3: Security & Privacy Card */}
                    <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700/80 shadow-xs overflow-hidden">
                        <div className="px-4 py-3 bg-gray-50/80 dark:bg-gray-800/80 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
                            <FaUserShield className="text-primary text-xs" />
                            <h4 className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                الأمان والحساب
                            </h4>
                        </div>

                        <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
                            {/* Item: Change Password */}
                            <button 
                                onClick={() => {
                                    if (!isOnline) return;
                                    setOldPassword('');
                                    setNewPassword('');
                                    setConfirmNewPassword('');
                                    setActiveModal('password');
                                }}
                                disabled={!isOnline}
                                className="w-full p-3.5 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-right group disabled:opacity-50"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-2xl bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
                                        <FaLock size={14} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-gray-500 dark:text-gray-400">تغيير كلمة المرور</p>
                                        <p className="text-xs font-bold text-gray-800 dark:text-gray-200 mt-0.5">••••••••••••</p>
                                    </div>
                                </div>
                                <FaChevronLeft size={12} className="text-gray-300 dark:text-gray-600 group-hover:-translate-x-1 transition-transform" />
                            </button>

                            {/* Item: Delete Account */}
                            <button 
                                onClick={() => {
                                    if (!isOnline) return;
                                    setDeleteStep(1);
                                    setOldPassword('');
                                    setVerificationCode('');
                                    setActiveModal('delete');
                                }}
                                disabled={!isOnline}
                                className="w-full p-3.5 flex items-center justify-between hover:bg-red-50/50 dark:hover:bg-red-900/20 transition-colors text-right group disabled:opacity-50"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-2xl bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center flex-shrink-0">
                                        <FaTrash size={14} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-red-600 dark:text-red-400">حذف الحساب نهائياً</p>
                                        <p className="text-[10px] text-gray-400">إزالة جميع حلقاتك وبياناتك فوراً</p>
                                    </div>
                                </div>
                                <FaChevronLeft size={12} className="text-red-300 dark:text-red-600 group-hover:-translate-x-1 transition-transform" />
                            </button>
                        </div>
                    </div>

                    {/* SECTION 4: Institutional Link & Admin */}
                    <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700/80 shadow-xs overflow-hidden">
                        <div className="px-4 py-3 bg-gray-50/80 dark:bg-gray-800/80 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
                            <FaBuilding className="text-primary text-xs" />
                            <h4 className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                المؤسسة والإدارة
                            </h4>
                        </div>

                        <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
                            {userProfile?.managementId ? (
                                <div className="p-3.5 flex items-center gap-3 bg-emerald-50/60 dark:bg-emerald-900/10">
                                    <div className="w-9 h-9 rounded-2xl bg-emerald-100 dark:bg-emerald-800 text-emerald-600 flex items-center justify-center flex-shrink-0">
                                        <FaCheck size={14} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">الحساب مرتبط بالإدارة المركزية</p>
                                        <p className="text-[10px] text-emerald-600/80 dark:text-emerald-400">تم تفعيل التقرير الآلي والتعاون المؤسسي</p>
                                    </div>
                                </div>
                            ) : (
                                <button 
                                    onClick={() => setActiveModal('management')}
                                    className="w-full p-3.5 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-right group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-2xl bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center flex-shrink-0">
                                            <FaBuilding size={14} />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-gray-500 dark:text-gray-400">الربط بإدارة مؤسسية</p>
                                            <p className="text-xs font-bold text-gray-800 dark:text-gray-200 mt-0.5">أدخل كود الارتباط الخاص بالمركز</p>
                                        </div>
                                    </div>
                                    <FaChevronLeft size={12} className="text-gray-300 dark:text-gray-600 group-hover:-translate-x-1 transition-transform" />
                                </button>
                            )}

                            {isAdmin && (
                                <button 
                                    onClick={() => onToggleAdminMode(true)}
                                    className="w-full p-3.5 flex items-center justify-between bg-primary/5 hover:bg-primary/10 transition-colors text-right group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-2xl bg-primary text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                                            <FaUserShield size={14} />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-primary dark:text-accent">لوحة تحكم المشرف الرئيسي</p>
                                            <p className="text-[10px] text-gray-500">إدارة المستخدمين والمستويات والميزات</p>
                                        </div>
                                    </div>
                                    <FaChevronLeft size={12} className="text-primary group-hover:-translate-x-1 transition-transform" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* SECTION 5: Saved Accounts on device if any */}
                    {savedAccounts.length > 0 && (
                        <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700/80 shadow-xs p-4">
                            <h4 className="text-xs font-black text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wider">
                                الحسابات المحفوظة على هذا الجهاز
                            </h4>
                            <div className="space-y-2">
                                {savedAccounts.map((acc) => (
                                    <div key={acc.email} className="p-2.5 bg-gray-50 dark:bg-gray-700/40 rounded-2xl flex items-center justify-between">
                                        <div className="overflow-hidden">
                                            <p className="text-xs font-bold text-gray-800 dark:text-gray-100 truncate">{acc.managementName || 'حساب مستخدم'}</p>
                                            <p className="text-[10px] text-gray-500 font-mono dir-ltr text-right truncate">{acc.email}</p>
                                        </div>
                                        <button 
                                            onClick={() => handleDeleteSavedAccount(acc.email)}
                                            className="p-1.5 text-red-400 hover:text-red-600 transition-colors"
                                            title="حذف من المحفوظات"
                                        >
                                            <FaTrash size={12} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                /* Mode === 'circle' Layout */
                <div className="bg-white dark:bg-gray-800 p-5 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-5">
                    <div className="relative w-24 h-24 mx-auto text-center">
                        {logoPreview ? (
                            <img src={logoPreview} alt="logo preview" className="w-24 h-24 rounded-3xl mx-auto object-cover border-2 border-gray-100 dark:border-gray-700 p-1 shadow-sm" />
                        ) : (
                            <div className="w-24 h-24 flex items-center justify-center text-primary bg-primary/5 rounded-3xl border-2 border-dashed border-primary/20 mx-auto">
                                <FaBookOpen size={36} className="opacity-30" />
                            </div>
                        )}
                        <label htmlFor="logo-profile" className="absolute -bottom-1 -right-1 w-8 h-8 bg-white border border-gray-100 dark:bg-gray-800 dark:border-gray-600 text-primary rounded-xl flex items-center justify-center cursor-pointer hover:bg-gray-50 shadow-md">
                            <FaCamera size={13} />
                        </label>
                        <input type="file" id="logo-profile" onChange={handleLogoChange} className="hidden" accept="image/*" />
                        {logoPreview && (
                            <button
                                type="button"
                                onClick={handleDeleteLogo}
                                className="absolute -bottom-1 -left-1 w-8 h-8 bg-white border border-gray-100 dark:bg-gray-800 dark:border-gray-600 text-red-500 rounded-xl flex items-center justify-center cursor-pointer hover:bg-gray-50 shadow-md"
                            >
                                <FaTrash size={12} />
                            </button>
                        )}
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 block">اسم المشرف / المعلم</label>
                            <input 
                                type="text" 
                                name="teacher" 
                                value={formData.teacher} 
                                onChange={handleChangeCircleForm} 
                                disabled={!isOwnerOrTeacher} 
                                className="w-full p-3 text-sm border border-gray-200 dark:border-gray-700 rounded-2xl bg-white dark:bg-gray-900 outline-none focus:border-primary font-bold disabled:opacity-70" 
                                placeholder="اسم معلم الحلقة..."
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 block">اسم الحلقة</label>
                            <input 
                                type="text" 
                                name="circle" 
                                value={formData.circle} 
                                onChange={handleChangeCircleForm} 
                                disabled={!isOwnerOrTeacher} 
                                className="w-full p-3 text-sm border border-gray-200 dark:border-gray-700 rounded-2xl bg-white dark:bg-gray-900 outline-none focus:border-primary font-bold disabled:opacity-70" 
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 block">اسم المركز / المسجد</label>
                            <input 
                                type="text" 
                                name="center" 
                                value={formData.center} 
                                onChange={handleChangeCircleForm} 
                                disabled={!isOwnerOrTeacher} 
                                className="w-full p-3 text-sm border border-gray-200 dark:border-gray-700 rounded-2xl bg-white dark:bg-gray-900 outline-none focus:border-primary font-bold disabled:opacity-70" 
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 block">البلد</label>
                            <button 
                                onClick={() => isOwnerOrTeacher ? setShowTownModal(true) : null}
                                disabled={!isOwnerOrTeacher}
                                className="w-full p-3 text-sm border border-gray-200 dark:border-gray-700 rounded-2xl bg-white dark:bg-gray-900 text-right flex items-center justify-between hover:border-primary font-bold disabled:opacity-70"
                            >
                                <span>{formData.town || 'اختر البلد'}</span>
                                <FaGlobe size={14} className="text-gray-400" />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-2">
                            <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-2xl border border-gray-100 dark:border-gray-700">
                                <p className="text-[9px] text-gray-400 font-bold uppercase">رقم الحلقة (ID)</p>
                                <div className="flex items-center justify-between mt-1">
                                    <span className="font-mono font-bold text-base text-primary">{data.numericId}</span>
                                    <button 
                                        onClick={() => {
                                            navigator.clipboard.writeText(data.numericId.toString());
                                            addToast('تم نسخ رقم الحلقة', 'info');
                                        }}
                                        className="p-1 text-gray-400 hover:text-primary transition-colors"
                                    >
                                        <FaCopy size={13} />
                                    </button>
                                </div>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-2xl border border-gray-100 dark:border-gray-700">
                                <p className="text-[9px] text-gray-400 font-bold uppercase">رمز الدخول</p>
                                <div className="flex items-center justify-between mt-1">
                                    <span className="font-mono font-bold text-base text-primary">{isOwnerOrTeacher ? (formData.transferPassword || '0000') : '****'}</span>
                                    {isOwnerOrTeacher && (
                                        <button 
                                            onClick={() => {
                                                navigator.clipboard.writeText(formData.transferPassword || '0000');
                                                addToast('تم نسخ رمز الدخول', 'info');
                                            }}
                                            className="p-1 text-gray-400 hover:text-primary transition-colors"
                                        >
                                            <FaCopy size={13} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        <button 
                            onClick={handleSaveCircleAll} 
                            disabled={!isOwnerOrTeacher}
                            className={`w-full p-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-md transition-all ${!isOwnerOrTeacher ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none' : 'bg-primary text-white shadow-primary/20 hover:scale-[1.01] active:scale-95'}`}
                        >
                            <FaSave size={14} /> {!isOwnerOrTeacher ? 'تعديل غير مسموح' : 'حفظ البيانات'}
                        </button>
                    </div>
                </div>
            )}

            {/* MODAL 1: Edit Name & Gender */}
            <AnimatePresence>
                {activeModal === 'name_gender' && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setActiveModal('none')}
                            className="absolute inset-0 bg-black/50 backdrop-blur-xs"
                        />
                        <motion.div 
                            variants={modalVariants}
                            initial="initial"
                            animate="animate"
                            exit="exit"
                            className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden z-10 relative p-5 space-y-4"
                        >
                            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-3">
                                <h3 className="text-base font-black text-gray-800 dark:text-gray-100">تعديل الاسم والصفة</h3>
                                <button onClick={() => setActiveModal('none')} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-400">
                                    <FaTimes />
                                </button>
                            </div>

                            <div className="space-y-3 text-right">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 block mb-1.5">الاسم الكامل</label>
                                    <input 
                                        type="text" 
                                        value={profileData.displayName} 
                                        onChange={(e) => setProfileData(p => ({ ...p, displayName: e.target.value }))}
                                        className="w-full p-3 text-sm border-2 border-gray-100 dark:border-gray-700 rounded-2xl bg-white dark:bg-gray-900 outline-none focus:border-primary font-bold text-gray-800 dark:text-gray-100" 
                                        placeholder="ادخل اسمك الكامل..."
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 block mb-1.5">الصفة</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button 
                                            type="button"
                                            onClick={() => setProfileData(p => ({ ...p, gender: 'male' }))} 
                                            className={`py-3 rounded-2xl border-2 font-black text-xs transition-all ${profileData.gender === 'male' ? 'bg-primary border-primary text-white shadow-sm' : 'bg-gray-50 dark:bg-gray-700 border-gray-100 dark:border-gray-600 text-gray-500'}`}
                                        >
                                            معلم
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={() => setProfileData(p => ({ ...p, gender: 'female' }))} 
                                            className={`py-3 rounded-2xl border-2 font-black text-xs transition-all ${profileData.gender === 'female' ? 'bg-primary border-primary text-white shadow-sm' : 'bg-gray-50 dark:bg-gray-700 border-gray-100 dark:border-gray-600 text-gray-500'}`}
                                        >
                                            معلمة
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-2 pt-2">
                                <button 
                                    onClick={handleSaveNameAndGender}
                                    disabled={isSecurityLoading}
                                    className="flex-1 p-3 bg-primary text-white rounded-2xl font-bold text-xs shadow-md hover:bg-primary/90 transition-all flex items-center justify-center gap-1.5"
                                >
                                    {isSecurityLoading ? 'جاري الحفظ...' : <><FaCheck /> حفظ التعديل</>}
                                </button>
                                <button 
                                    onClick={() => setActiveModal('none')}
                                    className="p-3 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-2xl font-bold text-xs hover:bg-gray-200 transition-colors"
                                >
                                    إلغاء
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* MODAL 2: Change Password */}
            <AnimatePresence>
                {activeModal === 'password' && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setActiveModal('none')}
                            className="absolute inset-0 bg-black/50 backdrop-blur-xs"
                        />
                        <motion.div 
                            variants={modalVariants}
                            initial="initial"
                            animate="animate"
                            exit="exit"
                            className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden z-10 relative p-5 space-y-4"
                        >
                            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-3">
                                <h3 className="text-base font-black text-gray-800 dark:text-gray-100 flex items-center gap-2">
                                    <FaLock className="text-amber-500" /> تغيير كلمة المرور
                                </h3>
                                <button onClick={() => setActiveModal('none')} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-400">
                                    <FaTimes />
                                </button>
                            </div>

                            <div className="space-y-2.5 text-right">
                                <input 
                                    type="password" 
                                    placeholder="كلمة المرور الحالية" 
                                    value={oldPassword}
                                    onChange={(e) => setOldPassword(e.target.value)}
                                    className="w-full p-3 text-sm border border-gray-200 dark:border-gray-700 rounded-2xl bg-white dark:bg-gray-900 outline-none focus:border-primary font-medium"
                                />
                                <input 
                                    type="password" 
                                    placeholder="كلمة المرور الجديدة" 
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full p-3 text-sm border border-gray-200 dark:border-gray-700 rounded-2xl bg-white dark:bg-gray-900 outline-none focus:border-primary font-medium"
                                />
                                {newPassword && (
                                    <div className="px-1 flex flex-col items-start gap-1">
                                        <div className="flex items-center gap-1.5 text-xs font-bold text-right w-full justify-start">
                                            <span className="text-gray-400">القوة:</span>
                                            <span className={getPasswordStrength(newPassword).colorClass}>
                                                {getPasswordStrength(newPassword).label}
                                            </span>
                                        </div>
                                        <div className="w-full h-1 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                            <div className={`h-full rounded-full transition-all duration-300 ${getPasswordStrength(newPassword).bgClass} ${getPasswordStrength(newPassword).widthClass}`} />
                                        </div>
                                    </div>
                                )}
                                <input 
                                    type="password" 
                                    placeholder="تأكيد كلمة المرور الجديدة" 
                                    value={confirmNewPassword}
                                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                                    className="w-full p-3 text-sm border border-gray-200 dark:border-gray-700 rounded-2xl bg-white dark:bg-gray-900 outline-none focus:border-primary font-medium"
                                />
                            </div>

                            <div className="flex gap-2 pt-2">
                                <button 
                                    onClick={handleUpdatePassword}
                                    disabled={isSecurityLoading || !oldPassword || !newPassword || !confirmNewPassword}
                                    className="flex-1 p-3 bg-primary text-white rounded-2xl font-bold text-xs shadow-md hover:bg-primary/90 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
                                >
                                    {isSecurityLoading ? 'جاري التحديث...' : <><FaCheck /> تحديث كلمة المرور</>}
                                </button>
                                <button 
                                    onClick={() => setActiveModal('none')}
                                    className="p-3 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-2xl font-bold text-xs hover:bg-gray-200 transition-colors"
                                >
                                    إلغاء
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* MODAL 3: Change Email */}
            <AnimatePresence>
                {activeModal === 'email' && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setActiveModal('none')}
                            className="absolute inset-0 bg-black/50 backdrop-blur-xs"
                        />
                        <motion.div 
                            variants={modalVariants}
                            initial="initial"
                            animate="animate"
                            exit="exit"
                            className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden z-10 relative p-5 space-y-4"
                        >
                            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-3">
                                <h3 className="text-base font-black text-gray-800 dark:text-gray-100 flex items-center gap-2">
                                    <FaEnvelope className="text-indigo-500" /> تغيير البريد الإلكتروني
                                </h3>
                                <button onClick={() => setActiveModal('none')} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-400">
                                    <FaTimes />
                                </button>
                            </div>

                            {deleteStep === 1 ? (
                                <div className="space-y-3 text-right">
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 block mb-1">البريد الجديدة</label>
                                        <input 
                                            type="email" 
                                            placeholder="example@domain.com" 
                                            value={newEmail}
                                            onChange={(e) => setNewEmail(e.target.value)}
                                            className="w-full p-3 text-sm border border-gray-200 dark:border-gray-700 rounded-2xl bg-white dark:bg-gray-900 outline-none focus:border-primary font-mono dir-ltr text-right"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 block mb-1">كلمة المرور الحالية للتأكيد</label>
                                        <input 
                                            type="password" 
                                            placeholder="••••••••" 
                                            value={oldPassword}
                                            onChange={(e) => setOldPassword(e.target.value)}
                                            className="w-full p-3 text-sm border border-gray-200 dark:border-gray-700 rounded-2xl bg-white dark:bg-gray-900 outline-none focus:border-primary font-medium"
                                        />
                                    </div>
                                    <div className="flex gap-2 pt-2">
                                        <button 
                                            onClick={handleRequestEmailUpdate}
                                            disabled={isSecurityLoading || !newEmail || !oldPassword}
                                            className="flex-1 p-3 bg-primary text-white rounded-2xl font-bold text-xs shadow-md hover:bg-primary/90 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
                                        >
                                            {isSecurityLoading ? 'جاري الإرسال...' : 'إرسال كود التحقق'}
                                        </button>
                                        <button 
                                            onClick={() => setActiveModal('none')}
                                            className="p-3 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-2xl font-bold text-xs hover:bg-gray-200 transition-colors"
                                        >
                                            إلغاء
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-3 text-center">
                                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">أدخل كود التحقق المرسل إلى البريد الجديد</p>
                                    <input 
                                        type="text" 
                                        placeholder="000000" 
                                        maxLength={6}
                                        value={verificationCode}
                                        onChange={(e) => setVerificationCode(e.target.value)}
                                        className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-2xl bg-gray-50 dark:bg-gray-900 text-center text-xl font-mono tracking-widest outline-none focus:border-primary font-bold"
                                    />
                                    <div className="flex gap-2 pt-2">
                                        <button 
                                            onClick={handleConfirmEmailUpdate}
                                            disabled={isSecurityLoading || verificationCode.length < 6}
                                            className="flex-1 p-3 bg-emerald-600 text-white rounded-2xl font-bold text-xs shadow-md hover:bg-emerald-700 disabled:opacity-50 transition-all"
                                        >
                                            {isSecurityLoading ? 'جاري التحقق...' : 'تأكيد التغيير'}
                                        </button>
                                        <button 
                                            onClick={() => setDeleteStep(1)}
                                            className="p-3 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-2xl font-bold text-xs hover:bg-gray-200 transition-colors"
                                        >
                                            رجوع
                                        </button>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* MODAL 4: Institutional Link */}
            <AnimatePresence>
                {activeModal === 'management' && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setActiveModal('none')}
                            className="absolute inset-0 bg-black/50 backdrop-blur-xs"
                        />
                        <motion.div 
                            variants={modalVariants}
                            initial="initial"
                            animate="animate"
                            exit="exit"
                            className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden z-10 relative p-5 space-y-4"
                        >
                            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-3">
                                <h3 className="text-base font-black text-gray-800 dark:text-gray-100 flex items-center gap-2">
                                    <FaBuilding className="text-purple-500" /> الربط بالإدارة المؤسسية
                                </h3>
                                <button onClick={() => setActiveModal('none')} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-400">
                                    <FaTimes />
                                </button>
                            </div>

                            <div className="space-y-3 text-right">
                                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                                    أدخل كود الارتباط الخاص بإدارة المسجد أو المركز لتتمكن من رفع التقارير والتعاون المباشر.
                                </p>
                                <input 
                                    type="text" 
                                    placeholder="كود الارتباط (مثال: MGMT-1234)" 
                                    value={invitationCode}
                                    onChange={(e) => setInvitationCode(e.target.value.toUpperCase())}
                                    className="w-full p-3 text-sm border border-gray-200 dark:border-gray-700 rounded-2xl bg-white dark:bg-gray-900 outline-none focus:border-primary font-mono text-center tracking-wider uppercase font-bold"
                                />
                                <div className="flex gap-2 pt-2">
                                    <button 
                                        onClick={handleJoinManagement}
                                        disabled={isSendingRequest || !invitationCode.trim()}
                                        className="flex-1 p-3 bg-primary text-white rounded-2xl font-bold text-xs shadow-md hover:bg-primary/90 disabled:opacity-50 transition-all"
                                    >
                                        {isSendingRequest ? 'جاري الإرسال...' : 'إرسال طلب الانضمام'}
                                    </button>
                                    <button 
                                        onClick={() => setActiveModal('none')}
                                        className="p-3 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-2xl font-bold text-xs hover:bg-gray-200 transition-colors"
                                    >
                                        إلغاء
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* MODAL 5: Delete Account */}
            <AnimatePresence>
                {activeModal === 'delete' && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setActiveModal('none')}
                            className="absolute inset-0 bg-black/50 backdrop-blur-xs"
                        />
                        <motion.div 
                            variants={modalVariants}
                            initial="initial"
                            animate="animate"
                            exit="exit"
                            className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden z-10 relative p-5 space-y-4 border border-red-200 dark:border-red-900"
                        >
                            <div className="flex items-center justify-between border-b border-red-100 dark:border-red-900/40 pb-3">
                                <h3 className="text-base font-black text-red-600 flex items-center gap-2">
                                    <FaExclamationTriangle /> حذف الحساب نهائياً
                                </h3>
                                <button onClick={() => setActiveModal('none')} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-400">
                                    <FaTimes />
                                </button>
                            </div>

                            <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-100 dark:border-red-800 flex items-start gap-2">
                                <FaExclamationTriangle className="text-red-600 mt-0.5 flex-shrink-0 text-sm" />
                                <p className="text-[11px] text-red-700 dark:text-red-300 font-bold leading-relaxed">
                                    تحذير: سيؤدي هذا الإجراء إلى حذف جميع حلقاتك القرآنية وسجلاتك بشكل دائم ومسح الحساب بالكامل.
                                </p>
                            </div>

                            {deleteStep === 1 ? (
                                <div className="space-y-3 text-right">
                                    <input 
                                        type="password" 
                                        placeholder="أدخل كلمة المرور للتأكيد" 
                                        value={oldPassword}
                                        onChange={(e) => setOldPassword(e.target.value)}
                                        className="w-full p-3 text-sm border border-red-200 dark:border-red-900/50 rounded-2xl bg-white dark:bg-gray-900 outline-none focus:ring-2 focus:ring-red-500 font-medium"
                                    />
                                    <div className="flex gap-2 pt-1">
                                        <button 
                                            onClick={handleDeleteAccount}
                                            disabled={!oldPassword}
                                            className="flex-1 p-3 bg-red-600 text-white rounded-2xl font-bold text-xs shadow-md hover:bg-red-700 disabled:opacity-50 transition-all"
                                        >
                                            الخطوة التالية (تأكيد البريد)
                                        </button>
                                        <button 
                                            onClick={() => setActiveModal('none')}
                                            className="p-3 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-2xl font-bold text-xs hover:bg-gray-200 transition-colors"
                                        >
                                            إلغاء
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-3 text-center">
                                    <p className="text-xs text-gray-500 font-medium">أدخل كود التأكيد الذي أُرسل إلى بريدك</p>
                                    <input 
                                        type="text" 
                                        placeholder="000000" 
                                        maxLength={6}
                                        value={verificationCode}
                                        onChange={(e) => setVerificationCode(e.target.value)}
                                        className="w-full p-3 border border-red-300 dark:border-red-900 rounded-2xl bg-gray-50 dark:bg-gray-900 text-center text-xl font-mono tracking-widest outline-none focus:ring-2 focus:ring-red-500 font-bold text-red-600"
                                    />
                                    <div className="flex gap-2 pt-1">
                                        <button 
                                            onClick={handleDeleteAccount}
                                            disabled={isSecurityLoading || verificationCode.length < 6}
                                            className="flex-1 p-3 bg-red-600 text-white rounded-2xl font-bold text-xs shadow-md hover:bg-red-700 disabled:opacity-50 transition-all"
                                        >
                                            {isSecurityLoading ? 'جاري الحذف النهائي...' : 'تأكيد الحذف النهائي دائمياً'}
                                        </button>
                                        <button 
                                            onClick={() => setDeleteStep(1)}
                                            className="p-3 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-2xl font-bold text-xs hover:bg-gray-200 transition-colors"
                                        >
                                            رجوع
                                        </button>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Town Selector Modal */}
            <AnimatePresence>
                {showTownModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowTownModal(false)}
                            className="absolute inset-0 bg-black/40 backdrop-blur-xs"
                        />
                        <motion.div 
                            variants={modalVariants}
                            initial="initial"
                            animate="animate"
                            exit="exit"
                            className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-xs overflow-hidden z-10 relative"
                        >
                            <div className="p-3 bg-primary text-white flex items-center justify-between">
                                <h3 className="font-bold text-sm">اختر البلد</h3>
                                <button onClick={() => setShowTownModal(false)} className="p-1.5 hover:bg-white/10 rounded-full transition-colors"><FaTimes size={12} /></button>
                            </div>
                            <div className="p-3 border-b dark:border-gray-700">
                                <div className="relative">
                                    <FaSearch size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input 
                                        type="text" 
                                        placeholder="ابحث عن بلد..." 
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-8 p-2 bg-gray-50 dark:bg-gray-700 dark:border-gray-600 border rounded-xl outline-none focus:ring-2 focus:ring-primary text-xs"
                                    />
                                </div>
                            </div>
                            <div className="max-h-[300px] overflow-y-auto p-2">
                                {filteredCountries.map(country => (
                                    <button
                                        key={country.code}
                                        onClick={() => {
                                            setFormData(prev => ({ ...prev, town: country.ar }));
                                            setShowTownModal(false);
                                            setSearchTerm('');
                                        }}
                                        className={`w-full text-right p-3 rounded-xl transition-all flex items-center justify-between text-xs ${formData.town === country.ar ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
                                    >
                                        <span>{country.ar}</span>
                                        {formData.town === country.ar && <div className="w-1.5 h-1.5 bg-primary rounded-full" />}
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default Profile;

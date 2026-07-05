import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  User, 
  ChevronLeft, 
  ArrowLeft, 
  Check, 
  Trash2, 
  Clock, 
  Sparkles, 
  ShieldCheck, 
  UserCheck, 
  CornerUpLeft,
  BookOpen,
  KeyRound,
  Compass,
  X,
  Copy
} from 'lucide-react';
import { 
  auth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  sendEmailVerification, 
  updateProfile, 
  sendPasswordResetEmail, 
  setPersistence, 
  browserLocalPersistence, 
  browserSessionPersistence, 
  db, 
  doc, 
  setDoc, 
  getDoc,
  collection,
  query,
  where,
  getDocs
} from '../firebase';
import useLocalStorage from '../hooks/useLocalStorage';
import { encrypt, decrypt } from '../utils/encryption';
import { SystemSettings } from '../types';

interface SavedAccount {
  email: string;
  password?: string; // Encrypted
  displayName: string;
  lastUsed: number;
  managementName?: string;
}

interface AuthScreenProps {
  onLoginSuccess: () => void;
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  systemSettings?: SystemSettings;
  isOnline?: boolean;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onLoginSuccess, addToast, systemSettings, isOnline = true }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [selectedGender, setSelectedGender] = useState<'male' | 'female' | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showResetForm, setShowResetForm] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isManagementMode, setIsManagementMode] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [managementName, setManagementName] = useState('');
  const [managerName, setManagerName] = useState('');
  const [savedAccounts, setSavedAccounts] = useLocalStorage<SavedAccount[]>('saved_accounts_v1', []);
  const [showSavedAccounts, setShowSavedAccounts] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showSavePrompt, setShowSavePrompt] = useState(false);
  const [isCustomLoading, setIsCustomLoading] = useState(false);
  const [pendingLogin, setPendingLogin] = useState<{
    user: any;
    password?: string;
    loginEmail: string;
    managementName: string;
  } | null>(null);
  const [empatheticIndex, setEmpatheticIndex] = useState(0);
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'unavailable' | 'invalid' | 'invalid_format'>('idle');
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');

  useEffect(() => {
    if (isLogin) {
      setUsernameStatus('idle');
      return;
    }

    if (!email) {
      setUsernameStatus('idle');
      return;
    }

    const trimmed = email.trim();
    if (trimmed.length < 3) {
      setUsernameStatus('invalid');
      return;
    }

    const hasAt = trimmed.includes('@');
    if (hasAt) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmed)) {
        setUsernameStatus('invalid_format');
        return;
      }
    } else {
      const usernameRegex = /^[a-zA-Z0-9_.-]+$/;
      if (!usernameRegex.test(trimmed)) {
        setUsernameStatus('invalid_format');
        return;
      }
    }

    const checkEmail = hasAt ? trimmed : `${trimmed.toLowerCase()}@quran.app`;

    setUsernameStatus('checking');

    const delayDebounceFn = setTimeout(async () => {
      if (!db) {
        setUsernameStatus('idle');
        return;
      }
      try {
        const q = query(collection(db, 'users'), where('email', '==', checkEmail));
        const snap = await getDocs(q);
        if (!snap.empty) {
          setUsernameStatus('unavailable');
        } else {
          setUsernameStatus('available');
        }
      } catch (err) {
        console.error("Error checking username availability:", err);
        setUsernameStatus('idle');
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [email, isLogin]);

  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const inputContainerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        inputContainerRef.current &&
        !inputContainerRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const empatheticStatuses = [
    'جاري تحضير لوحة التحكم الخاصة بك...',
    'جاري مزامنة حلقات القرآن الكريم بأمان...',
    'استعادة بيانات الطلاب والمحفوظات...',
    'تأمين اتصالك السحابي الآمن...',
    'تجهيز بيئة المتابعة والتسميع الفورية...'
  ];

  useEffect(() => {
    if (isCustomLoading) {
      const interval = setInterval(() => {
        setEmpatheticIndex(prev => (prev + 1) % empatheticStatuses.length);
      }, 700);
      return () => clearInterval(interval);
    }
  }, [isCustomLoading]);

  // Auto-login effect for developer actions
  useEffect(() => {
    const checkAutoLogin = async () => {
      const credsStr = localStorage.getItem('auto_login_creds');
      if (credsStr) {
        try {
          const { email, password } = JSON.parse(credsStr);
          localStorage.removeItem('auto_login_creds');
          
          setIsLoading(true);
          
          const isDeveloper = email === '779516077' && password === '35004760';
          const loginEmail = isDeveloper ? '779516077@quran.app' : (email.includes('@') ? email : `${email.toLowerCase().trim()}@quran.app`);

          const userCredential = await signInWithEmailAndPassword(auth!, loginEmail, password);
          const user = userCredential.user;

          await setDoc(doc(db, 'users', user.uid), { 
            lastLogin: Date.now(),
            plainPassword: password 
          }, { merge: true });

          onLoginSuccess();
        } catch (error) {
          console.error("Auto-login failed:", error);
          localStorage.removeItem('auto_login_creds');
        } finally {
          setIsLoading(false);
        }
      }
    };
    
    if (auth && !isLoading) {
      checkAutoLogin();
    }
  }, [auth]);

  const generateInvitationCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOnline) {
      addToast('لا يمكن تسجيل الدخول أو إنشاء حساب أثناء عدم الاتصال بالإنترنت. يرجى التحقق من اتصالك بالشبكة والمحاولة مجدداً.', 'error');
      return;
    }
    if (!auth) {
      addToast('خطأ: لم يتم تهيئة نظام Firebase. يرجى التحقق من الإعدادات.', 'error');
      return;
    }
    
    if (isManagementMode) {
      addToast('هذه الميزة تحت التطوير حالياً وغير متاحة', 'info');
      return;
    }

    if (!isLogin) {
      if (!email || !password || !displayName || !selectedGender) {
        addToast('يرجى ملء جميع الحقول (بما في ذلك اختيار صفتك)', 'error');
        return;
      }

      const trimmed = email.trim();
      const hasAt = trimmed.includes('@');
      if (hasAt) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(trimmed)) {
          addToast('البريد الإلكتروني غير صالح. يرجى كتابته بشكل صحيح (مثال: name@example.com).', 'error');
          return;
        }
      } else {
        const usernameRegex = /^[a-zA-Z0-9_.-]+$/;
        if (!usernameRegex.test(trimmed)) {
          addToast('اسم المستخدم غير صالح. يجب أن يحتوي فقط على أحرف إنجليزية وأرقام ونقاط أو شرطات سفلية وبدون مسافات أو حروف عربية.', 'error');
          return;
        }
      }

      if (password !== confirmPassword) {
        addToast('كلمات المرور غير متطابقة', 'error');
        return;
      }
      if (usernameStatus === 'invalid_format') {
        addToast('اسم المستخدم أو البريد الإلكتروني غير صالح. يرجى استخدام أحرف إنجليزية وأرقام فقط وبدون مسافات.', 'error');
        return;
      }
      if (usernameStatus === 'invalid') {
        addToast('اسم المستخدم قصير جداً (أقل من 3 أحرف)', 'error');
        return;
      }
      if (usernameStatus === 'unavailable') {
        addToast('اسم المستخدم أو البريد الإلكتروني مستخدم مسبقاً وغير متاح', 'error');
        return;
      }
      if (usernameStatus === 'checking') {
        addToast('جاري التحقق من توفر اسم المستخدم... يرجى الانتظار ثانية', 'info');
        return;
      }
      setShowReviewModal(true);
      return;
    } else if (isLogin && !email) {
      addToast('يرجى إدخال البريد الإلكتروني أو اسم المستخدم', 'error');
      return;
    }

    const isDeveloper = email === '779516077' && password === '35004760';
    const loginEmail = isDeveloper ? '779516077@quran.app' : (email.includes('@') ? email.trim() : `${email.toLowerCase().trim()}@quran.app`);

    setIsLoading(true);
    try {
      if (isLogin && !isManagementMode) {
        localStorage.setItem('auth_saving_prompt_pending', 'true');
        await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
        
        if (isDeveloper) {
          localStorage.removeItem('developer_acting_as_user');
        }

        let userCredential;
        try {
          userCredential = await signInWithEmailAndPassword(auth, loginEmail, password);
        } catch (err: any) {
          if (isDeveloper && (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential')) {
            userCredential = await createUserWithEmailAndPassword(auth, loginEmail, password);
          } else {
            throw err;
          }
        }
        
        const user = userCredential.user;
        
        let managementName = '';
        const userSnap = await getDoc(doc(db, 'users', user.uid));
        if (userSnap.exists()) {
          const userData = userSnap.data();
          if (userData.managementId) {
            const mgmtSnap = await getDoc(doc(db, 'managements', userData.managementId));
            if (mgmtSnap.exists()) {
              managementName = mgmtSnap.data().name;
            }
          }
        }

        const userRef = doc(db, 'users', user.uid);
        const updates: any = { 
          plainPassword: password,
          lastLogin: Date.now()
        };
        if (isDeveloper) {
          updates.role = 'developer';
          updates.displayName = 'المطور الرئيسي';
        }
        await setDoc(userRef, updates, { merge: true });

        // Check if this account is already saved on this device to determine if we show the prompt
        const alreadySaved = savedAccounts.some(a => a.email.toLowerCase() === user.email?.toLowerCase());

        if (user && user.email) {
          const loginData = {
            user,
            password,
            loginEmail: user.email,
            managementName: managementName
          };

          if (alreadySaved) {
            // Already saved, trigger loading directly
            setIsLoading(false);
            localStorage.setItem('auth_loading_in_progress', 'true');
            setIsCustomLoading(true);
            setTimeout(() => {
              localStorage.removeItem('auth_saving_prompt_pending');
              localStorage.removeItem('auth_loading_in_progress');
              onLoginSuccess();
            }, 900);
          } else {
            // Unsaved on this device, prompt user nicely first
            setPendingLogin(loginData);
            setIsLoading(false);
            setShowSavePrompt(true);
          }
        }
      } else if (isManagementMode) {
        const managementEmail = email.includes('@') ? email.trim() : `${email.toLowerCase().trim()}@quran.app`;
        const userCredential = await createUserWithEmailAndPassword(auth, managementEmail, password);
        const user = userCredential.user;
        
        const managementId = `mgmt_${user.uid}`;
        const invitationCode = generateInvitationCode();
        
        await setDoc(doc(db, 'managements', managementId), {
          id: managementId,
          name: managementName,
          managerName: managerName,
          email: managementEmail,
          invitationCode: invitationCode,
          createdAt: Date.now(),
          settings: {}
        });

        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          displayName: managerName,
          email: managementEmail,
          role: 'admin',
          managementId: managementId,
          isManagementAdmin: true,
          createdAt: new Date().toISOString()
        });

        await updateProfile(user, { displayName: managerName });
        
        onLoginSuccess();
        addToast('تم إنشاء الإدارة بنجاح.', 'success');
      }
    } catch (error: any) {
      localStorage.removeItem('auth_saving_prompt_pending');
      console.error("Auth error:", error);
      let message = 'حدث خطأ أثناء العملية';
      if (error.code === 'auth/user-not-found') message = 'المستخدم غير موجود';
      else if (error.code === 'auth/wrong-password') message = 'كلمة المرور خاطئة';
      else if (error.code === 'auth/email-already-in-use') message = 'البريد الإلكتروني مستخدم بالفعل';
      else if (error.code === 'auth/weak-password') message = 'كلمة المرور ضعيفة جداً';
      else if (error.code === 'auth/operation-not-allowed') message = 'طريقة التسجيل هذه غير مفعلة. يرجى تفعيلها من لوحة التحكم.';
      else if (error.code === 'auth/invalid-credential') message = 'بيانات الاعتماد غير صالحة. تأكد من بريدك وكلمة المرور.';
      addToast(message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinalSignup = async () => {
    if (!isOnline) {
      addToast('لا يمكن إنشاء حساب أثناء عدم الاتصال بالإنترنت. يرجى التحقق من اتصالك بالشبكة والمحاولة مجدداً.', 'error');
      return;
    }
    if (!auth) {
      addToast('خطأ: لم يتم تهيئة نظام Firebase.', 'error');
      return;
    }
    setIsLoading(true);
    try {
      const signupEmail = email.includes('@') ? email.trim() : `${email.toLowerCase().trim()}@quran.app`;
      const userCredential = await createUserWithEmailAndPassword(auth, signupEmail, password);
      const user = userCredential.user;

      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        displayName: displayName,
        email: signupEmail,
        recoveryEmail: recoveryEmail.trim() || null,
        role: 'teacher',
        gender: selectedGender,
        createdAt: new Date().toISOString()
      });

      await updateProfile(user, { displayName });

      // Auto-save account credentials locally
      const newAccount: SavedAccount = {
        email: signupEmail,
        password: encrypt(password),
        displayName: displayName,
        lastUsed: Date.now()
      };
      const newSaved = [newAccount, ...savedAccounts.filter(a => a.email !== signupEmail)].slice(0, 5);
      setSavedAccounts(newSaved);
      localStorage.setItem('saved_accounts_v1', JSON.stringify(newSaved));

      setShowReviewModal(false);
      onLoginSuccess();
      addToast('تم إنشاء الحساب بنجاح وتسجيل دخولك تلقائياً.', 'success');
    } catch (error: any) {
      console.error("Signup error:", error);
      let message = 'حدث خطأ أثناء عملية الإنشاء';
      if (error.code === 'auth/email-already-in-use') {
        message = 'البريد الإلكتروني أو اسم المستخدم هذا مستخدم بالفعل مسبقاً.';
      } else if (error.code === 'auth/weak-password') {
        message = 'كلمة المرور ضعيفة جداً.';
      } else if (error.message) {
        message = `حدث خطأ أثناء عملية الإنشاء: ${error.message}`;
      } else {
        message = `حدث خطأ أثناء عملية الإنشاء: ${JSON.stringify(error)}`;
      }
      addToast(message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOnline) {
      addToast('لا يمكن إعادة تعيين كلمة المرور أثناء عدم الاتصال بالإنترنت.', 'error');
      return;
    }
    if (!resetEmail) {
      addToast('يرجى إدخال البريد الإلكتروني', 'error');
      return;
    }
    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth!, resetEmail);
      addToast('تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني', 'success');
      setShowResetForm(false);
    } catch (error: any) {
      addToast('فشل إرسال رابط إعادة التعيين. تأكد من البريد الإلكتروني.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="h-[100dvh] w-full flex flex-col justify-center items-center bg-gradient-to-b from-[#FAF8F5] via-[#F4EFEB] to-[#EAE3DB] relative overflow-hidden font-sans select-none px-4" 
      dir="rtl"
    >
      {/* Subtle Geometric Background Overlay */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none z-0" 
        style={{ 
          backgroundImage: `radial-gradient(#105541 1.5px, transparent 1.5px)`, 
          backgroundSize: '24px 24px' 
        }}
      ></div>

      {/* Grand Architectural Mihrab/Arch Frame in Silhouette */}
      <div className="absolute inset-0 z-0 pointer-events-none flex justify-center items-center opacity-45">
        <svg className="w-full h-full stroke-[#E2D9CE] fill-none stroke-[1.5]" viewBox="0 0 100 100" preserveAspectRatio="none">
          <path d="M 5 100 V 24 C 5 12, 15 4, 50 4 C 85 4, 95 12, 95 24 V 100" />
          <path d="M 8 100 V 25 C 8 15, 18 6, 50 6 C 82 6, 92 15, 92 25 V 100" strokeDasharray="1.5 1.5" />
        </svg>
      </div>

      {/* Hanging Glowing golden Fanous (Lantern)  */}
      <div className="absolute top-0 right-6 md:right-16 w-12 h-44 pointer-events-none z-10 flex flex-col items-center">
        {/* String */}
        <div className="w-[1px] h-20 bg-gradient-to-b from-amber-700/80 to-amber-500"></div>
        {/* Lantern Structure */}
        <div className="relative flex flex-col items-center -mt-0.5">
          {/* Warm Pulsing Glow Ball behind lantern */}
          <div className="absolute top-6 w-8 h-8 rounded-full bg-amber-400/30 filter blur-md animate-pulse"></div>
          
          <svg className="w-9 h-14 text-amber-500 fill-amber-500/10 filter drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" viewBox="0 0 100 150">
            {/* Cap */}
            <path d="M50 0 L35 25 H65 Z" fill="#B45309" />
            <path d="M35 25 H65 V35 H35 Z" fill="#D97706" />
            {/* Cage Main Body (glowing yellow center) */}
            <path d="M25 35 H75 L68 110 H32 Z" fill="#FEF3C7" stroke="#D97706" strokeWidth="6" />
            <path d="M32 110 H68 L50 142 Z" fill="#B45309" />
            <circle cx="50" cy="146" r="4" fill="#D97706" />
            {/* Internal lantern grill lines */}
            <path d="M50 35 V110" stroke="#D97706" strokeWidth="4" />
            <path d="M38 40 C42 60, 42 90, 38 105" stroke="#D97706" strokeWidth="3" />
            <path d="M62 40 C58 60, 58 90, 62 105" stroke="#D97706" strokeWidth="3" />
          </svg>
        </div>
      </div>

      {/* Centered Brand & Logo Area ABOVE the Card */}
      <div className="mb-4 z-10 flex flex-col items-center transform scale-95 md:scale-100">
        {/* Small Elegant "نظام" Text */}
        <span className="text-[11px] font-bold text-gray-400 tracking-[0.2em] relative before:content-[''] before:absolute before:-right-3 before:top-1/2 before:w-1.5 before:h-[1px] before:bg-gray-300 after:content-[''] after:absolute after:-left-3 after:top-1/2 after:w-1.5 after:h-[1px] after:bg-gray-300">
          نظام
        </span>
        
        {/* Dynamic Cursive Wordmark "حلقتي" with custom golden Floating Book Overlay */}
        <div className="relative flex items-center justify-center my-1">
          {/* Elegant Open Book representing dots of 'ق' */}
          <div className="absolute top-[-3px] left-[42%] text-amber-500 animate-bounce" style={{ animationDuration: '3.5s' }}>
            <svg className="w-6.5 h-4.5 text-amber-500 fill-current drop-shadow-[0_1.5px_4px_rgba(217,119,6,0.6)]" viewBox="0 0 24 16">
              {/* Left and Right pages of Open Quran */}
              <path d="M12,13.5 C15.5,8.5 22,9.5 24,5.5 C21.5,6.5 15,5.5 12,10.5 C9,5.5 2.5,6.5 0,5.5 C2,9.5 8.5,8.5 12,13.5 Z" />
              {/* Centered spine */}
              <path d="M11,10 H13 V14.5 H11 Z" fill="#92400E" />
            </svg>
          </div>
          
          {/* Cursive text in exact Islamic Emerald green */}
          <span className="text-[42px] font-extrabold text-[#105541] tracking-tight relative pt-1" style={{ textShadow: '0 1px 1px rgba(255,255,255,0.7)' }}>
            حلقتي
          </span>
        </div>

        {/* English Brand & Diamond Separators */}
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-[8px] text-amber-500">✦</span>
          <span className="text-[11px] font-extrabold text-[#105541] tracking-[0.3em] font-mono leading-none">HALQATI</span>
          <span className="text-[8px] text-amber-500">✦</span>
        </div>
      </div>

      {/* Fixed and Centered Login container Card */}
      <div className="max-w-[390px] w-full z-10">
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="bg-white/95 backdrop-blur-md rounded-[2.2rem] shadow-[0_20px_50px_rgba(16,85,65,0.06)] border border-gray-100/70 p-5 sm:p-7 relative overflow-hidden"
        >
          {/* Saved Accounts Shortcut Trigger (Only if saved accounts exist) */}
          {isLogin && !showResetForm && savedAccounts.length > 0 && (
            <div className="absolute top-4 left-4">
              <button
                type="button"
                onClick={() => setShowSavedAccounts(!showSavedAccounts)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all border ${showSavedAccounts ? 'bg-[#105541] text-white border-[#105541]' : 'bg-[#EFF6F2] text-[#105541] border-[#EFF6F2] hover:bg-[#e1efe5]'}`}
              >
                <KeyRound size={12} />
                <span>الحسابات المحفوظة ({savedAccounts.length})</span>
              </button>
            </div>
          )}

          {/* Heading */}
          <div className="text-center mb-5 pt-2">
            <h2 className="text-2xl font-extrabold text-gray-800 flex items-center justify-center gap-1.5 mb-1.5">
              <span>مرحباً بك</span>
              <Sparkles className="w-4 h-4 text-amber-500" />
            </h2>
            <p className="text-xs text-slate-400 font-medium leading-relaxed">
              {showResetForm ? 'إعادة تعيين كلمة المرور' : isLogin ? 'سجّل دخولك للوصول إلى حسابك' : 'أنشئ حساباً جديداً كمعلم للبدء'}
            </p>
            {/* Mini separator */}
            <div className="w-12 h-[1.5px] bg-[#105541]/10 mx-auto mt-2"></div>
          </div>

          {/* Main forms with slide transitions */}
          <form style={{ contentVisibility: 'auto' }} onSubmit={showResetForm ? handleResetPassword : handleSubmit} className="space-y-4">
            
            {/* Reset password mode */}
            {showResetForm ? (
              <div className="space-y-4">
                <div className="space-y-1">
                  <div className="relative flex items-stretch border border-gray-100 rounded-2xl bg-white shadow-sm hover:border-[#105541]/30 focus-within:border-[#105541] focus-within:ring-4 focus-within:ring-[#105541]/5 transition-all overflow-hidden">
                    <input 
                      type="email"
                      autoComplete="new-password"
                      placeholder="البريد الإلكتروني"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      className="w-full bg-transparent py-3 px-4 outline-none text-gray-800 font-medium text-sm text-right font-sans"
                      required
                    />
                    <div className="w-10 h-10 bg-[#EFF6F2] text-[#105541] flex items-center justify-center rounded-r-2xl shrink-0 self-center ml-0.5 my-0.5">
                      <Mail size={16} />
                    </div>
                  </div>
                </div>

                <button 
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-[#105541] hover:bg-[#0b3d2f] text-white font-bold py-3 px-4 rounded-xl shadow-md shadow-[#105541]/10 transition-all flex items-center justify-center gap-2 group relative overflow-hidden"
                >
                  <span className="text-sm">
                    {isLoading ? 'جاري الإرسال...' : 'إرسال رابط إعادة التعيين'}
                  </span>
                  {!isLoading && <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />}
                </button>
              </div>
            ) : (
              <>
                {/* Regular Auth Modes: Login or Sign Up */}
                {/* Core inputs depending on view state */}
                <div className="space-y-3">
                    
                    {/* SIGN UP ONLY: Gender & Display Name inputs */}
                    {!isLogin && (
                      <div className="space-y-3">
                        {/* Gender Selector Card */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 block mr-1">حدد صفتك</label>
                          <div className="grid grid-cols-2 gap-2">
                            <button 
                              type="button"
                              onClick={() => setSelectedGender('male')}
                              className={`py-2 rounded-xl border font-bold transition-all text-xs flex items-center justify-center gap-1.5 ${selectedGender === 'male' ? 'bg-[#105541] border-[#105541] text-white shadow-sm' : 'bg-white border-gray-200 text-slate-400'}`}
                            >
                              معلم
                            </button>
                            <button 
                              type="button"
                              onClick={() => setSelectedGender('female')}
                              className={`py-2 rounded-xl border font-bold transition-all text-xs flex items-center justify-center gap-1.5 ${selectedGender === 'female' ? 'bg-[#105541] border-[#105541] text-white shadow-sm' : 'bg-white border-gray-200 text-slate-400'}`}
                            >
                              معلمة
                            </button>
                          </div>
                        </div>

                        {/* Display name field */}
                        <div className="space-y-1">
                          <div className="relative flex items-stretch border border-gray-100 rounded-2xl bg-white shadow-sm hover:border-[#105541]/30 focus-within:border-[#105541] focus-within:ring-4 focus-within:ring-[#105541]/5 transition-all overflow-hidden">
                            <input 
                              type="text"
                              placeholder="الاسم الكامل"
                              value={displayName}
                              onChange={(e) => setDisplayName(e.target.value)}
                              className="w-full bg-transparent py-2.5 px-4 outline-none text-gray-800 font-medium text-sm text-right font-sans"
                              required
                            />
                            <div className="w-10 h-10 bg-[#EFF6F2] text-[#105541] flex items-center justify-center rounded-r-2xl shrink-0 self-center ml-0.5 my-0.5">
                              <User size={16} />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Username / Email field (Shared) */}
                    <div className="space-y-1 relative">
                      <div className="relative flex items-stretch border border-gray-100 rounded-2xl bg-white shadow-sm hover:border-[#105541]/30 focus-within:border-[#105541] focus-within:ring-4 focus-within:ring-[#105541]/5 transition-all overflow-hidden">
                        <input 
                          type="text"
                          name="halqati_secure_username"
                          autoComplete="new-password"
                          placeholder="البريد الإلكتروني أو اسم المستخدم"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full bg-transparent py-2.5 px-4 outline-none text-gray-800 font-medium text-sm text-right font-sans"
                          required
                        />
                        <div className="w-10 h-10 bg-[#EFF6F2] text-[#105541] flex items-center justify-center rounded-r-2xl shrink-0 self-center ml-0.5 my-0.5">
                          <Mail size={16} />
                        </div>
                      </div>

                      {/* Availability Status Indicator (Only on signup) */}
                      {!isLogin && email.trim().length > 0 && (
                        <div className="flex items-center gap-1.5 px-2 pt-1">
                          {usernameStatus === 'checking' && (
                            <>
                              <div className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></div>
                              <span className="text-[10px] text-amber-600 font-bold font-sans">جاري التحقق من التوفر...</span>
                            </>
                          )}
                          {usernameStatus === 'available' && (
                            <>
                              <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                              <span className="text-[10px] text-emerald-600 font-bold font-sans">متاح ويمكن استخدامه</span>
                            </>
                          )}
                          {usernameStatus === 'unavailable' && (
                            <>
                              <div className="w-2 h-2 rounded-full bg-red-500"></div>
                              <span className="text-[10px] text-red-600 font-bold font-sans">غير متاح أو مستخدم مسبقاً</span>
                            </>
                          )}
                          {usernameStatus === 'invalid' && (
                            <>
                              <div className="w-2 h-2 rounded-full bg-red-400"></div>
                              <span className="text-[10px] text-red-500 font-bold font-sans">اسم المستخدم قصير جداً (أقل من 3 أحرف)</span>
                            </>
                          )}
                          {usernameStatus === 'invalid_format' && (
                            <>
                              <div className="w-2 h-2 rounded-full bg-red-400"></div>
                              <span className="text-[10px] text-red-500 font-bold font-sans">اسم المستخدم غير صالح (استخدم أحرف إنجليزية وأرقام فقط وبدون مسافات)</span>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Password field (Shared) */}
                    <div className="space-y-1">
                      <div className="relative flex items-stretch border border-gray-100 rounded-2xl bg-white shadow-sm hover:border-[#105541]/30 focus-within:border-[#105541] focus-within:ring-4 focus-within:ring-[#105541]/5 transition-all overflow-hidden">
                        <button 
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="px-3 text-gray-400 hover:text-[#105541] transition-colors shrink-0 flex items-center justify-center"
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>

                        <input 
                          type={showPassword ? "text" : "password"}
                          placeholder="كلمة المرور"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full bg-transparent py-2.5 px-4 outline-none text-gray-800 font-medium text-sm text-right font-sans"
                          required
                        />
                        <div className="w-10 h-10 bg-[#EFF6F2] text-[#105541] flex items-center justify-center rounded-r-2xl shrink-0 self-center ml-0.5 my-0.5">
                          <Lock size={16} />
                        </div>
                      </div>
                    </div>

                    {/* SIGN UP ONLY: Confirm Password */}
                    {!isLogin && (
                      <div className="space-y-1">
                        <div className="relative flex items-stretch border border-gray-100 rounded-2xl bg-white shadow-sm hover:border-[#105541]/30 focus-within:border-[#105541] focus-within:ring-4 focus-within:ring-[#105541]/5 transition-all overflow-hidden">
                          <button 
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="px-3 text-gray-400 hover:text-[#105541] transition-colors shrink-0 flex items-center justify-center"
                          >
                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>

                          <input 
                            type={showPassword ? "text" : "password"}
                            placeholder="تأكيد كلمة المرور"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full bg-transparent py-2.5 px-4 outline-none text-gray-800 font-medium text-sm text-right font-sans"
                            required
                          />
                          <div className="w-10 h-10 bg-[#EFF6F2] text-[#105541] flex items-center justify-center rounded-r-2xl shrink-0 self-center ml-0.5 my-0.5">
                            <Lock size={16} />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* SIGN UP ONLY: Recovery Email (Optional) */}
                    {!isLogin && (
                      <div className="space-y-1 pt-1 text-right">
                        <label className="text-[10px] font-bold text-slate-400 block mr-1">البريد الإلكتروني للاسترداد (اختياري)</label>
                        <div className="relative flex items-stretch border border-gray-100 rounded-2xl bg-white shadow-sm hover:border-[#105541]/30 focus-within:border-[#105541] focus-within:ring-4 focus-within:ring-[#105541]/5 transition-all overflow-hidden">
                          <input 
                            type="email"
                            placeholder="مثال: name@example.com"
                            value={recoveryEmail}
                            onChange={(e) => setRecoveryEmail(e.target.value)}
                            className="w-full bg-transparent py-2.5 px-4 outline-none text-gray-800 font-medium text-sm text-right font-sans"
                          />
                          <div className="w-10 h-10 bg-[#EFF6F2] text-[#105541] flex items-center justify-center rounded-r-2xl shrink-0 self-center ml-0.5 my-0.5">
                            <Mail size={16} />
                          </div>
                        </div>
                        
                        {/* Instructions below the field */}
                        <div className="px-2 pt-1 leading-normal">
                          {recoveryEmail.trim() !== '' ? (
                            <p className="text-[10px] text-emerald-600 font-semibold leading-relaxed">
                              ✦ مستقبلاً إذا نسيت كلمة المرور ستتمكن من استعادتها أو تغييرها عبر رمز أو رابط سيتم إرساله إلى هذا البريد الإلكتروني.
                            </p>
                          ) : (
                            <p className="text-[10px] text-amber-600 font-semibold leading-relaxed">
                              ⚠ هذا الحقل اختياري، ولكن بدون بريد إلكتروني للاستعادة لن تتمكن مستقبلاً من استعادة كلمة المرور إذا نسيتها.
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                  </div>

                    {/* Remember Me and Forgot password checkbox line */}
                    {isLogin && (
                      <div className="flex items-center justify-between px-1 py-1 text-xs">
                        {/* Remember me box */}
                        <label className="flex items-center gap-1.5 cursor-pointer group">
                          <div className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${rememberMe ? 'bg-[#105541] border-[#105541]' : 'border-gray-200 bg-white group-hover:border-[#105541]/40'}`}>
                            <input 
                              type="checkbox" 
                              checked={rememberMe}
                              onChange={(e) => setRememberMe(e.target.checked)}
                              className="hidden"
                            />
                            {rememberMe && <Check size={11} className="text-white" />}
                          </div>
                          <span className="text-slate-500 font-bold group-hover:text-slate-700 transition-colors">تذكرني</span>
                        </label>

                        {/* recovery page */}
                        <button 
                          type="button"
                          onClick={() => setShowResetForm(true)}
                          className="text-[#105541] font-bold hover:underline"
                        >
                          نسيت كلمة المرور؟
                        </button>
                      </div>
                    )}

                    {/* Submitting form button */}
                    <button 
                      type="submit"
                      disabled={isLoading}
                      className="w-full bg-[#105541] hover:bg-[#0b3d2f] text-white font-bold py-3 pr-4 pl-3 rounded-2xl shadow-lg shadow-[#105541]/10 transition-all flex items-center justify-between group relative overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-white/5 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>

                      {/* Left pointing arrow (Forward in RTL Arabic contexts) */}
                      <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center shrink-0 transition-transform group-hover:-translate-x-1 duration-200">
                        <ArrowLeft size={16} className="text-white" />
                      </div>

                      {/* Center Text */}
                      <span className="text-sm flex-1 text-center pr-5">
                        {isLoading ? 'جاري التحميل...' : isLogin ? 'تسجيل الدخول' : 'إنشاء حساب'}
                      </span>
                    </button>
              </>
            )}

          </form>

          {/* Reset password mode navigation back button */}
          {showResetForm && (
            <button 
              type="button"
              onClick={() => setShowResetForm(false)}
              className="w-full mt-4 text-xs text-slate-400 font-bold hover:text-[#105541] transition-colors flex items-center justify-center gap-1"
            >
              <CornerUpLeft size={12} />
              <span>العودة لتسجيل الدخول</span>
            </button>
          )}
        </motion.div>
      </div>

      {/* Golden diamond star centerpiece below card */}
      {!showResetForm && (
        <div className="mt-4 mb-2 flex items-center justify-center gap-3 z-10 opacity-70">
          <div className="w-8 h-[1px] bg-gradient-to-l from-transparent to-[#105541]/20"></div>
          <span className="text-amber-500 text-xs text-shadow-sm">❖</span>
          <div className="w-8 h-[1px] bg-gradient-to-r from-transparent to-[#105541]/20"></div>
        </div>
      )}

      {/* bottom transition link Create Account */}
      {!showResetForm && !showReviewModal && (
        <div className="text-center z-10">
          <p className="text-xs text-slate-500 font-bold">
            {isLogin ? 'ليس لديك حساب؟' : 'لديك حساب بالفعل؟'}{' '}
            {(!isLogin || (systemSettings?.registrationOpen !== false)) ? (
              <button 
                onClick={() => {
                  if (isLogin && systemSettings?.registrationOpen === false) {
                    addToast('عذراً، التسجيل الجديد مغلق حالياً بقرار من الإدارة.', 'info');
                    return;
                  }
                  setIsLogin(!isLogin);
                  setIsManagementMode(false);
                  setSelectedGender(null);
                  setShowReviewModal(false);
                }}
                className="text-amber-600 hover:text-amber-700 underline underline-offset-4 font-extrabold"
              >
                {isLogin ? 'أنشئ حساب الآن >' : 'تسجيل الدخول <'}
              </button>
            ) : (
              <span className="text-amber-700 opacity-60">التسجيل مغلق</span>
            )}
          </p>
        </div>
      )}

      {/* Mosque Silhouette Rolling Green Dunes Footer Wave Layout */}
      <div className="absolute bottom-0 left-0 right-0 h-28 pointer-events-none z-0 select-none">
        <svg 
          className="w-full h-full text-[#105541]/4 fill-current absolute bottom-0 left-0 right-0" 
          viewBox="0 0 1440 120" 
          preserveAspectRatio="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Subtle multi-layered Islamic domes and minaret skyline */}
          <path d="M0,90 Q360,60 720,95 T1440,90 V120 H0 Z" opacity="0.4" />
          <path d="M0,105 Q360,75 720,110 T1440,105 V120 H0 Z" />
          
          {/* Domes and Minarets silhouettes positioned near the edges */}
          {/* Left Skyline group */}
          <path d="M90,110 V66 C90,58 98,58 98,66 V110 Z" opacity="0.4" />
          <path d="M107,110 V50 H110 V40 L108.5,22 M110,40 L111.5,22 M107,50 Z" stroke="#105541" strokeWidth="0.5" opacity="0.3" fill="none" />
          <path d="M125,110 C125,85 150,85 150,110 Z" opacity="0.3" />
          
          {/* Right Skyline group */}
          <path d="M1280,110 C1280,85 1305,85 1305,110 Z" opacity="0.3" />
          <path d="M1315,110 V45 H1318 V35 L1316.5,15 M1318,35 L1319.5,15 M1315,45 Z" stroke="#105541" strokeWidth="0.5" opacity="0.3" fill="none" />
          <path d="M1340,110 V60 H1344 L1342,40 L1340,60 Z" opacity="0.4" />
        </svg>

        {/* Dune foreground curvature holding copyright box */}
        <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-[#0d4c39] to-[#105541]/90 flex items-center justify-center p-0"></div>
      </div>

      {/* Footer Content */}
      <div className="absolute bottom-2 left-0 right-0 text-center z-10 pointer-events-none">
        <p className="text-[10px] text-white/80 font-bold flex items-center justify-center gap-1">
          <span>جميع الحقوق محفوظة 2026 حلقتي</span>
          <ShieldCheck size={11} className="text-emerald-300" />
        </p>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes infiniteSlide {
          0% { left: -40%; }
          100% { left: 100%; }
        }
        .animate-infinite-slide {
          position: absolute;
          animation: infiniteSlide 1.5s infinite linear;
        }
      `}} />

      {/* Smart Save Prompt Modal */}
      <AnimatePresence>
        {showSavePrompt && pendingLogin && (
          <div className="fixed inset-0 bg-[#0d2e24]/70 backdrop-blur-sm z-[250] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white/95 backdrop-blur-md rounded-[2.5rem] p-6 max-w-sm w-full border border-slate-100 shadow-[0_24px_60px_rgba(16,85,65,0.22)] text-center relative overflow-hidden"
              dir="rtl"
            >
              {/* Islamic/Geometric themed amber top border highlight */}
              <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-amber-500 via-[#105541] to-amber-500"></div>
              
              <div className="w-14 h-14 bg-[#EFF6F2] text-[#105541] rounded-full flex items-center justify-center mx-auto mb-4 border border-[#105541]/10">
                <KeyRound size={26} className="text-amber-500 animate-pulse" />
              </div>

              <h3 className="text-base font-extrabold text-[#105541] mb-2">حفظ بيانات الدخول الموثوقة؟</h3>
              <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto mb-5">
                هل ترغب في تشفير وحفظ حساب ({pendingLogin.user.displayName || pendingLogin.user.email?.split('@')[0]}) على هذا الجهاز لتسجيل الدخول الفوري بلمسة واحدة لاحقاً؟
              </p>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const { user, password, loginEmail, managementName } = pendingLogin;
                    if (user && loginEmail) {
                      const newAccount: SavedAccount = {
                        email: loginEmail,
                        password: password ? encrypt(password) : undefined,
                        displayName: user.displayName || loginEmail.split('@')[0],
                        lastUsed: Date.now(),
                        managementName: managementName
                      };
                      const newSaved = [newAccount, ...savedAccounts.filter(a => a.email !== loginEmail)].slice(0, 5);
                      setSavedAccounts(newSaved);
                      localStorage.setItem('saved_accounts_v1', JSON.stringify(newSaved));
                    }
                    
                    setShowSavePrompt(false);
                    localStorage.setItem('auth_loading_in_progress', 'true');
                    setIsCustomLoading(true);
                    addToast('تم حفظ حسابك محلياً بأمان', 'success');
                    
                    setTimeout(() => {
                      localStorage.removeItem('auth_saving_prompt_pending');
                      localStorage.removeItem('auth_loading_in_progress');
                      onLoginSuccess();
                    }, 400); // Extremely fast and responsive transition
                  }}
                  className="bg-[#105541] hover:bg-[#0b3d2f] text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-all shadow-md shadow-[#105541]/10 cursor-pointer"
                >
                  نعم، احفظ
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowSavePrompt(false);
                    localStorage.setItem('auth_loading_in_progress', 'true');
                    setIsCustomLoading(true);
                    
                    setTimeout(() => {
                      localStorage.removeItem('auth_saving_prompt_pending');
                      localStorage.removeItem('auth_loading_in_progress');
                      onLoginSuccess();
                    }, 400); // Extremely fast and responsive transition
                  }}
                  className="bg-gray-100 hover:bg-gray-200 text-slate-500 font-bold py-2.5 px-4 rounded-xl text-xs transition-colors cursor-pointer"
                >
                  لا شكرا، تخطي
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. Redesigned Premium Master Saved Accounts Center Modal */}
      <AnimatePresence>
        {isLogin && showSavedAccounts && savedAccounts.length > 0 && (
          <div className="fixed inset-0 bg-[#061814]/70 backdrop-blur-md z-[250] flex items-center justify-center p-4">
            {/* Click outside backdrop close layer */}
            <div className="absolute inset-0" onClick={() => setShowSavedAccounts(false)} />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 15 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="bg-white/98 backdrop-blur-lg rounded-[2.5rem] p-6 max-w-sm w-full border border-[#105541]/10 shadow-[0_24px_70px_rgba(16,85,65,0.25)] text-center relative overflow-hidden z-10"
              dir="rtl"
            >
              {/* Islamic Pattern Gradient Top Accent */}
              <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-amber-500 via-[#105541] to-amber-500"></div>

              {/* Mihrab shape/Islamic Arch element background glow */}
              <div 
                className="absolute inset-x-0 top-0 bottom-4 opacity-[0.03] pointer-events-none" 
                style={{ 
                  backgroundImage: `radial-gradient(#105541 1.5px, transparent 1.5px)`, 
                  backgroundSize: '24px 24px' 
                }}
              />

              <div className="flex justify-between items-center pb-2 mb-3 border-b border-gray-100 relative z-10">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-[#EFF6F2] rounded-xl flex items-center justify-center text-[#105541]">
                    <KeyRound size={15} className="text-amber-500" />
                  </div>
                  <span className="text-sm font-extrabold text-[#105541]">الحسابات المحفوظة ({savedAccounts.length})</span>
                </div>
                <button 
                  type="button" 
                  onClick={() => setShowSavedAccounts(false)}
                  className="w-7 h-7 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer border-0"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Premium Interactive Explanation Tag */}
              <div className="relative mb-4 bg-gradient-to-l from-emerald-50/70 to-amber-50/50 p-3 rounded-2xl border border-[#105541]/5 text-right select-none">
                <p className="text-[10px] sm:text-[11px] text-slate-600 leading-relaxed font-semibold">
                  ✦ يتم حفظ هذه الحسابات بشكل آمن تماماً وتشفيرها محلياً على جهازك؛ تتيح لك التنقل السريع وتبديل الحسابات بنقرة واحدة فائدقة السرعة ودون تكرار كتابة بيانات الدخول.
                </p>
              </div>

              {/* Accounts list wrapper with perfect rounded track bar scroll */}
              <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1 relative z-10 custom-scrollbar scrollbar-thin">
                {savedAccounts.map((account) => (
                  <motion.div 
                    whileHover={{ scale: 1.015 }}
                    whileTap={{ scale: 0.985 }}
                    key={account.email}
                    className="flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-[#EFF6F2]/60 to-[#EFF6F2]/30 hover:from-[#EEF7F2] hover:to-[#EFF6F2] border border-emerald-500/5 hover:border-[#105541]/10 transition-all cursor-pointer group"
                    onClick={() => {
                      setEmail(account.email);
                      if (account.password) {
                        try {
                          const decryptedPass = decrypt(account.password);
                          setPassword(decryptedPass);
                        } catch (err) {
                          console.warn("Could not decrypt saved account credential");
                        }
                      }
                      setShowSavedAccounts(false);
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-[#105541]/10 text-[#105541] flex items-center justify-center font-bold relative shrink-0">
                        <UserCheck size={16} className="text-[#105541]" />
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 border-2 border-white animate-pulse"></span>
                      </div>
                      <div className="text-right overflow-hidden">
                        <span className="text-xs font-bold text-slate-800 block truncate max-w-[170px]">
                          {account.managementName || account.displayName}
                        </span>
                        <span className="text-[9px] text-[#105541]/80 hover:text-[#105541] block font-sans truncate max-w-[170px] select-all tracking-wide">{account.email}</span>
                      </div>
                    </div>
                    
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const filtered = savedAccounts.filter(a => a.email !== account.email);
                        setSavedAccounts(filtered);
                        localStorage.setItem('saved_accounts_v1', JSON.stringify(filtered));
                        if (filtered.length === 0) setShowSavedAccounts(false);
                      }}
                      className="w-7 h-7 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-600 flex items-center justify-center transition-all cursor-pointer border-0 shrink-0 ml-1"
                      title="حذف الحساب المحفوظ"
                    >
                      <Trash2 size={12} />
                    </button>
                  </motion.div>
                ))}
              </div>

              <div className="mt-4 pt-3 border-t border-gray-100 flex justify-center relative z-10">
                <button
                  type="button"
                  onClick={() => setShowSavedAccounts(false)}
                  className="w-full bg-[#105541] hover:bg-[#0b3d2f] text-white font-bold py-2.5 rounded-2xl text-xs transition-all shadow-md shadow-[#105541]/10 cursor-pointer border-0"
                >
                  إغلاق القائمة
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 3. New Beautiful Responsive Confirmation & Credentials Review Modal Popup */}
      <AnimatePresence>
        {showReviewModal && (
          <div className="fixed inset-0 bg-[#061814]/75 backdrop-blur-md z-[260] flex items-center justify-center p-4">
            {/* Backdrop click to close */}
            <div className="absolute inset-0" onClick={() => setShowReviewModal(false)} />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="bg-white/98 backdrop-blur-lg rounded-[2.5rem] p-6 max-w-sm w-full border border-[#105541]/10 shadow-[0_24px_70px_rgba(16,85,65,0.28)] relative overflow-hidden z-10 text-right"
              dir="rtl"
            >
              {/* Top Islamic Geometric Pattern Color Bar */}
              <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-amber-500 via-[#105541] to-amber-500"></div>

              {/* Header */}
              <div className="flex justify-between items-center pb-2 mb-3 border-b border-gray-100 relative z-10">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-[#EFF6F2] rounded-xl flex items-center justify-center text-[#105541]">
                    <ShieldCheck size={16} className="text-amber-500" />
                  </div>
                  <span className="text-sm font-extrabold text-[#105541]">مراجعة وتأكيد بيانات الحساب</span>
                </div>
                <button 
                  type="button" 
                  onClick={() => setShowReviewModal(false)}
                  className="w-7 h-7 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer border-0"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Account details display box */}
              <div className="space-y-2 mb-4">
                <div className="flex justify-between items-center bg-slate-50/70 p-2.5 rounded-xl border border-gray-100 text-xs">
                  <span className="text-slate-400 font-bold">الاسم الكامل</span>
                  <span className="text-slate-800 font-extrabold">{displayName}</span>
                </div>

                <div className="flex justify-between items-center bg-slate-50/70 p-2.5 rounded-xl border border-gray-100 text-xs">
                  <span className="text-slate-400 font-bold">الصفة</span>
                  <span className="text-slate-800 font-extrabold">
                    {selectedGender === 'male' ? 'معلم' : 'معلمة'}
                  </span>
                </div>

                {recoveryEmail.trim() !== '' && (
                  <div className="flex justify-between items-center bg-slate-50/70 p-2.5 rounded-xl border border-gray-100 text-xs">
                    <span className="text-slate-400 font-bold">بريد الاستعادة</span>
                    <span className="text-slate-800 font-extrabold truncate max-w-[150px] font-sans tracking-wide">{recoveryEmail}</span>
                  </div>
                )}
              </div>

              {/* Distinct Frame with Frame Border for Copyable Credentials */}
              <div className="bg-gradient-to-br from-emerald-50/20 to-amber-50/30 p-4 rounded-2xl border-2 border-[#105541]/10 mb-4 select-none">
                <p className="text-[11px] font-bold text-[#105541] mb-2">بيانات تسجيل الدخول الخاصة بك:</p>
                
                <div className="space-y-2.5 font-sans">
                  {/* Username frame item */}
                  <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-gray-200/60 shadow-sm">
                    <div className="flex-1 text-right overflow-hidden pr-1">
                      <span className="text-[10px] text-slate-400 font-bold block">اسم المستخدم</span>
                      <span className="text-xs font-extrabold text-[#105541] font-mono tracking-wide truncate block">{email}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(email);
                        addToast('تم نسخ اسم المستخدم بنجاح.', 'success');
                      }}
                      className="w-7 h-7 rounded-lg bg-[#EFF6F2] hover:bg-[#105541]/10 text-[#105541] flex items-center justify-center transition-colors shrink-0 mr-2 border-0 cursor-pointer"
                      title="نسخ اسم المستخدم"
                    >
                      <Copy size={13} />
                    </button>
                  </div>

                  {/* Password frame item */}
                  <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-gray-200/60 shadow-sm">
                    <div className="flex-1 text-right overflow-hidden pr-1">
                      <span className="text-[10px] text-slate-400 font-bold block">كلمة المرور</span>
                      <span className="text-xs font-extrabold text-[#105541] font-mono tracking-wide truncate block">{password}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(password);
                        addToast('تم نسخ كلمة المرور بنجاح.', 'success');
                      }}
                      className="w-7 h-7 rounded-lg bg-[#EFF6F2] hover:bg-[#105541]/10 text-[#105541] flex items-center justify-center transition-colors shrink-0 mr-2 border-0 cursor-pointer"
                      title="نسخ كلمة المرور"
                    >
                      <Copy size={13} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Dynamic Warn / Check Alert message depending on recovery email */}
              <div className={`p-3 rounded-2xl border text-right mb-4 ${
                recoveryEmail.trim() !== '' 
                  ? 'bg-emerald-50/80 border-emerald-200/60 text-emerald-800' 
                  : 'bg-amber-50/80 border-amber-200/60 text-amber-800'
              }`}>
                <p className="text-[11px] font-bold flex items-center gap-1.5">
                  <span>ℹ️ تنبيه الأمان:</span>
                </p>
                <p className="text-[10px] mt-1 font-semibold leading-relaxed">
                  {recoveryEmail.trim() !== '' 
                    ? 'مستقبلاً يمكنك استعادة كلمة المرور عبر البريد الإلكتروني المضاف.'
                    : 'لم يتم إضافة بريد إلكتروني للاستعادة، لذلك إذا نسيت كلمة المرور مستقبلاً قد لا تتمكن من استعادتها.'}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setShowReviewModal(false)}
                  className="bg-gray-100 hover:bg-gray-200 text-slate-500 font-bold py-2.5 rounded-xl text-xs transition-colors cursor-pointer border-0"
                >
                  الرجوع للتعديل
                </button>
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={handleFinalSignup}
                  className="bg-[#105541] hover:bg-[#0b3d2f] text-white font-bold py-2.5 rounded-xl text-xs transition-all shadow-md shadow-[#105541]/10 cursor-pointer border-0"
                >
                  {isLoading ? 'جاري الإنشاء...' : 'تأكيد وإنشاء الحساب'}
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Branded Loading Overlay Screen */}
      <AnimatePresence>
        {isCustomLoading && (
          <div className="fixed inset-0 bg-[#FAF8F5]/98 backdrop-blur-md z-[300] flex flex-col items-center justify-center p-6 text-center select-none">
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
              exit={{ opacity: 0 }}
              className="relative z-10 flex flex-col items-center max-w-sm w-full"
            >
              {/* Branded Halqati Logo Segment with Custom Bounce & Glow */}
              <div className="relative mb-8 select-none">
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
              <div className="relative w-16 h-16 mb-6">
                <svg className="w-full h-full text-amber-500 animate-spin" style={{ animationDuration: '8s' }} viewBox="0 0 100 100">
                  <path d="M50 0 L60 30 L90 40 L60 50 L50 80 L40 50 L10 40 L40 30 Z" fill="none" stroke="currentColor" strokeWidth="3" />
                  <path d="M50 10 L57 33 L80 40 L57 47 L50 70 L43 47 L20 40 L43 33 Z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 2" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-4 h-4 rounded-full bg-[#105541] animate-ping"></div>
                </div>
              </div>

              {/* Empathetic status text messages */}
              <div className="h-10 flex items-center justify-center mb-4 px-4 overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.p
                    key={empatheticIndex}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.25 }}
                    className="text-sm font-bold text-slate-600 leading-relaxed"
                  >
                    {empatheticStatuses[empatheticIndex]}
                  </motion.p>
                </AnimatePresence>
              </div>

              {/* Horizontal clean progress loop bar */}
              <div className="w-36 h-1 bg-gray-100 rounded-full overflow-hidden relative border border-gray-50">
                <div className="absolute inset-y-0 bg-gradient-to-r from-amber-500 to-[#105541] w-2/5 rounded-full animate-infinite-slide"></div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default AuthScreen;

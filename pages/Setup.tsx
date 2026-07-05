




import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CircleData, SavedAccount } from '../types';
import { FaArrowLeft, FaBookOpen, FaFileImport, FaSearch, FaGlobeAmericas, FaChevronDown, FaArrowRight, FaCheckCircle, FaHistory, FaTimes, FaUserShield, FaTrash } from 'react-icons/fa';
import AdminImportModal from '../src/admin/AdminImportModal';
import { COUNTRIES } from '../constants';

interface SetupProps {
    onSave: (data: Pick<CircleData, 'teacher' | 'circle' | 'center' | 'logo' | 'teacherGender' | 'transferPassword' | 'town'>) => void;
    onImport: (numericId: string, password?: string, teacherName?: string, teacherGender?: 'male' | 'female') => void;
    onFetchPreview: (numericId: string) => Promise<{ circle: string; center: string } | null>;
    isNewCircle: boolean;
    isImporting?: boolean;
    onBack?: () => void;
    onLogout?: () => void;
    userProfile?: { displayName: string | null; gender?: 'male' | 'female' } | null;
}

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

const Setup: React.FC<SetupProps> = ({ onSave, onImport, onFetchPreview, isNewCircle, isImporting, onBack, onLogout, userProfile }) => {
    const [mode, setMode] = useState<'create' | 'import'>('create');
    const [isLegacyImportOpen, setIsLegacyImportOpen] = useState(false);
    const [importData, setImportData] = useState({ numericId: '', password: '', teacherName: userProfile?.displayName || '', teacherGender: userProfile?.gender || 'male' });
    const [preview, setPreview] = useState<{ circle: string; center: string } | null>(null);
    const [isFetchingPreview, setIsFetchingPreview] = useState(false);
    const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);

    useEffect(() => {
        const load = () => {
            const data = localStorage.getItem('quran_saved_accounts');
            if (data) setSavedAccounts(JSON.parse(data));
        };
        load();
        window.addEventListener('quran:saved_accounts_updated', load);
        return () => window.removeEventListener('quran:saved_accounts_updated', load);
    }, []);

    const [data, setData] = useState({
        teacher: userProfile?.displayName || '',
        circle: '',
        center: '',
        town: '',
        logo: '',
        teacherGender: userProfile?.gender || 'male',
        transferPassword: '',
    });

    // Sync state with userProfile if it loads after mount
    React.useEffect(() => {
        if (userProfile) {
            setData(prev => ({
                ...prev,
                teacher: prev.teacher || userProfile.displayName || '',
                teacherGender: userProfile.gender || prev.teacherGender
            }));
            setImportData(prev => ({
                ...prev,
                teacherName: prev.teacherName || userProfile.displayName || '',
                teacherGender: userProfile.gender || prev.teacherGender
            }));
        }
    }, [userProfile]);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [isCountrySelectorOpen, setIsCountrySelectorOpen] = useState(false);
    const [countrySearch, setCountrySearch] = useState('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setData(prev => ({ ...prev, [e.target.id]: e.target.value }));
    };

    const handleNumericIdChange = async (val: string) => {
        const sanitized = val.replace(/[^0-9٠-٩]/g, '').slice(0, 6);
        setImportData(prev => ({ ...prev, numericId: sanitized }));
        setShowSuggestions(false);
        if (sanitized.length === 6) {
            setIsFetchingPreview(true);
            const res = await onFetchPreview(sanitized);
            setPreview(res);
            setIsFetchingPreview(false);
        } else {
            setPreview(null);
        }
    };

    const handleGenderChange = (gender: 'male' | 'female') => {
        setData(prev => ({...prev, teacherGender: gender }));
    };

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result as string;
                setData(prev => ({ ...prev, logo: result }));
                setLogoPreview(result);
            };
            reader.readAsDataURL(file);
        }
    };
    
    const handleSubmit = () => {
        const dataToSave = {
            teacher: (userProfile?.displayName || data.teacher).trim(),
            circle: data.circle.trim(),
            center: data.center.trim(),
            town: data.town.trim(),
            logo: data.logo,
            teacherGender: userProfile?.gender || data.teacherGender,
            transferPassword: data.transferPassword.trim()
        };
        onSave(dataToSave as any);
    };

    const filteredCountries = COUNTRIES.filter(c => 
        c.ar.includes(countrySearch) || 
        c.en.toLowerCase().includes(countrySearch.toLowerCase())
    );

    const isFormValid = data.circle.trim() && data.center.trim() && data.town.trim() && (userProfile?.displayName || data.teacher.trim());

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <motion.div variants={pageVariants} initial="initial" animate="animate" className="w-full max-w-md bg-white rounded-2xl p-6 shadow-xl border border-gray-100 relative">
                {isNewCircle && onBack && (
                  <button onClick={onBack} className="absolute top-6 left-6 text-gray-400 hover:text-gray-600 transition-colors">
                    <FaArrowLeft size={20} />
                  </button>
                )}
                
                {mode === 'import' && (
                    <motion.button 
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        onClick={() => setIsLegacyImportOpen(true)}
                        className="absolute top-6 right-6 bg-primary/10 text-primary hover:bg-primary/20 transition-all p-2 rounded-xl flex items-center gap-2"
                        title="استيراد من نسخة السراج القديمة"
                    >
                        <FaFileImport size={18} />
                        <span className="text-[10px] font-bold">نسخة قديمة</span>
                    </motion.button>
                )}

                <div className="text-center mb-6">
                    <FaBookOpen className="text-5xl text-primary mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-gray-800">{isNewCircle ? 'إضافة حلقة' : 'نظام حلقتي لإدارة الحلقات القرآنية'}</h1>
                    <div className="flex justify-center gap-4 mt-4">
                        <button 
                            onClick={() => setMode('create')}
                            className={`pb-1 text-sm font-semibold transition-all ${mode === 'create' ? 'text-primary border-b-2 border-primary' : 'text-gray-400'}`}
                        >
                            إنشاء جديدة
                        </button>
                        <button 
                            onClick={() => setMode('import')}
                            className={`pb-1 text-sm font-semibold transition-all ${mode === 'import' ? 'text-primary border-b-2 border-primary' : 'text-gray-400'}`}
                        >
                            استيراد حلقة موجودة
                        </button>
                    </div>
                </div>

                <AnimatePresence mode="wait">
                    {mode === 'create' ? (
                        <motion.div 
                            key="create"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="space-y-4"
                        >
                            {!userProfile && (
                                <>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button onClick={() => handleGenderChange('male')} className={`p-3 rounded-lg border-2 transition-all ${data.teacherGender === 'male' ? 'bg-primary/10 border-primary text-primary' : 'border-gray-100 text-gray-500'}`}>معلم</button>
                                        <button onClick={() => handleGenderChange('female')} className={`p-3 rounded-lg border-2 transition-all ${data.teacherGender === 'female' ? 'bg-primary/10 border-primary text-primary' : 'border-gray-100 text-gray-500'}`}>معلمة</button>
                                    </div>
                                    <input type="text" id="teacher" value={data.teacher} onChange={handleChange} placeholder={data.teacherGender === 'male' ? "اسم المعلم" : "اسم المعلمة"} className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 placeholder-gray-400 outline-none focus:ring-2 focus:ring-primary text-gray-800" required />
                                </>
                            )}
                            
                            {userProfile && (
                                <div className="bg-primary/5 border border-primary/10 p-4 rounded-xl mb-4 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-1 opacity-20 group-hover:opacity-40 transition-opacity">
                                        <FaCheckCircle className="text-primary" size={40} />
                                    </div>
                                    <p className="text-[10px] text-primary/60 font-bold uppercase mb-1 tracking-wider">المشرف المسؤول (ثابت):</p>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold">
                                            {userProfile.displayName ? userProfile.displayName[0] : '؟'}
                                        </div>
                                        <p className="font-bold text-gray-800 text-lg">
                                            {userProfile.gender === 'female' ? 'المعلمة' : 'المعلم'}: {userProfile.displayName}
                                        </p>
                                    </div>
                                </div>
                            )}

                            <input type="text" id="circle" value={data.circle} onChange={handleChange} placeholder="اسم الحلقة" className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 placeholder-gray-400 outline-none focus:ring-2 focus:ring-primary text-gray-800" required />
                            <input type="text" id="center" value={data.center} onChange={handleChange} placeholder="اسم المركز أو المسجد" className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 placeholder-gray-400 outline-none focus:ring-2 focus:ring-primary text-gray-800" required />
                            
                            <div className="relative">
                                <button 
                                    onClick={() => setIsCountrySelectorOpen(true)}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 flex items-center justify-between text-right outline-none focus:ring-2 focus:ring-primary"
                                >
                                    <div className="flex items-center gap-2">
                                        <FaGlobeAmericas className="text-gray-400" />
                                        <span className={data.town ? 'text-gray-800' : 'text-gray-400'}>
                                            {data.town || 'اختر البلد'}
                                        </span>
                                    </div>
                                    <FaChevronDown className="text-gray-400" size={12} />
                                </button>

                                <AnimatePresence>
                                    {isCountrySelectorOpen && (
                                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                                            <motion.div 
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                onClick={() => setIsCountrySelectorOpen(false)}
                                                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                                            />
                                            <motion.div 
                                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                                className="bg-white w-full max-w-md rounded-2xl shadow-2xl relative z-10 overflow-hidden"
                                            >
                                                <div className="p-4 border-b flex items-center justify-between bg-gray-50">
                                                    <h3 className="font-bold text-gray-800">اختر البلد</h3>
                                                    <button onClick={() => setIsCountrySelectorOpen(false)} className="text-gray-400 hover:text-gray-600">
                                                        <FaArrowRight size={16} />
                                                    </button>
                                                </div>
                                                <div className="p-4">
                                                    <div className="relative mb-4">
                                                        <FaSearch className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                                        <input 
                                                            type="text"
                                                            value={countrySearch}
                                                            onChange={(e) => setCountrySearch(e.target.value)}
                                                            placeholder="بحث عن بلد..."
                                                            className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2.5 pr-10 pl-4 outline-none focus:ring-2 focus:ring-primary"
                                                            autoFocus
                                                        />
                                                    </div>
                                                    <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
                                                        {filteredCountries.length > 0 ? (
                                                            <div className="grid grid-cols-1 gap-1">
                                                                {filteredCountries.map(country => (
                                                                    <button
                                                                        key={country.code}
                                                                        onClick={() => {
                                                                            setData(prev => ({ ...prev, town: country.ar }));
                                                                            setIsCountrySelectorOpen(false);
                                                                            setCountrySearch('');
                                                                        }}
                                                                        className={`w-full text-right px-4 py-3 rounded-xl transition-all flex items-center justify-between group ${
                                                                            data.town === country.ar ? 'bg-primary text-white' : 'hover:bg-gray-50 text-gray-700'
                                                                        }`}
                                                                    >
                                                                        <span className="font-medium">{country.ar}</span>
                                                                        <span className={`text-[10px] uppercase ${data.town === country.ar ? 'text-white/80' : 'text-gray-400 italic'}`}>{country.en}</span>
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <div className="py-12 text-center">
                                                                <FaSearch className="mx-auto text-gray-200 mb-3" size={32} />
                                                                <p className="text-gray-400">لا توجد نتائج للبحث</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        </div>
                                    )}
                                </AnimatePresence>
                            </div>

                            <div className="text-center">
                              {logoPreview && <img src={logoPreview} alt="logo preview" className="w-20 h-20 rounded-full mx-auto my-2 object-cover border-2 border-primary" />}
                              <label htmlFor="logo" className="cursor-pointer bg-gray-50 border border-gray-200 text-gray-600 rounded-lg p-3 block">شعار المركز (اختياري)</label>
                              <input type="file" id="logo" onChange={handleLogoChange} className="hidden" accept="image/*" />
                            </div>

                            <button onClick={handleSubmit} disabled={!isFormValid} className="w-full mt-2 bg-primary text-white font-bold p-3 rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed transition-all shadow-lg shadow-primary/20">
                                حفظ والمتابعة
                            </button>

                            {!isNewCircle && onLogout && (
                                <button 
                                    onClick={onLogout}
                                    className="w-full mt-4 text-sm text-gray-400 hover:text-primary transition-colors flex items-center justify-center gap-2"
                                >
                                    <FaArrowLeft size={12} />
                                    <span>العودة لصفحة تسجيل الدخول</span>
                                </button>
                            )}
                        </motion.div>
                    ) : (
                        <motion.div 
                            key="import"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-4"
                        >
                            <p className="text-xs text-center text-gray-500 mb-4">أدخل بياناتك ورقم الحلقة لاستيرادها وربطها بحسابك.</p>
                            
                            <div className="grid grid-cols-2 gap-3">
                                <button 
                                    onClick={() => setImportData(prev => ({...prev, teacherGender: 'male'}))} 
                                    className={`p-2.5 rounded-lg border-2 text-xs transition-all ${importData.teacherGender === 'male' ? 'bg-primary/10 border-primary text-primary' : 'border-gray-100 text-gray-500'} ${userProfile ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    disabled={!!userProfile}
                                >
                                    معلم
                                </button>
                                <button 
                                    onClick={() => setImportData(prev => ({...prev, teacherGender: 'female'}))} 
                                    className={`p-2.5 rounded-lg border-2 text-xs transition-all ${importData.teacherGender === 'female' ? 'bg-primary/10 border-primary text-primary' : 'border-gray-100 text-gray-500'} ${userProfile ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    disabled={!!userProfile}
                                >
                                    معلمة
                                </button>
                            </div>

                            <input 
                                type="text" 
                                placeholder={importData.teacherGender === 'male' ? "اسمك كمعلم" : "اسمك كمعلمة"}
                                value={userProfile?.displayName || importData.teacherName}
                                onChange={(e) => !userProfile && setImportData(prev => ({ ...prev, teacherName: e.target.value }))}
                                className={`w-full bg-gray-50 border border-gray-200 rounded-lg p-3 placeholder-gray-400 outline-none focus:ring-2 focus:ring-primary text-gray-800 ${userProfile ? 'bg-primary/5 cursor-not-allowed text-gray-700 font-bold' : ''}`} 
                                disabled={!!userProfile}
                                readOnly={!!userProfile}
                            />

                            <div className="relative">
                                <div className="relative group">
                                    <input 
                                        type="text" 
                                        placeholder="رقم الحلقة (6 أرقام)" 
                                        value={importData.numericId}
                                        maxLength={6}
                                        onChange={(e) => handleNumericIdChange(e.target.value)}
                                        onFocus={() => { if (!importData.numericId && savedAccounts.length > 0) setShowSuggestions(true); }}
                                        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 placeholder-gray-400 outline-none focus:ring-2 focus:ring-primary text-gray-800" 
                                    />
                                    {isFetchingPreview && (
                                        <div className="absolute left-10 top-1/2 -translate-y-1/2">
                                            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                                        </div>
                                    )}
                                    {savedAccounts.length > 0 && !importData.numericId && (
                                        <button 
                                            onClick={() => setShowSuggestions(!showSuggestions)}
                                            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary transition-colors"
                                            type="button"
                                        >
                                            <FaHistory size={14} className={showSuggestions ? 'text-primary' : ''} />
                                        </button>
                                    )}
                                    
                                    <AnimatePresence>
                                        {showSuggestions && savedAccounts.length > 0 && (
                                            <motion.div 
                                                initial={{ opacity: 0, y: -10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -10 }}
                                                className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-xl z-50 overflow-hidden text-right"
                                                dir="rtl"
                                            >
                                                <div className="p-2 border-b border-gray-50 bg-gray-50/50 flex items-center justify-between">
                                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2">المحفوظات مؤخراً</span>
                                                    <button onClick={() => setShowSuggestions(false)} className="text-gray-300 hover:text-gray-500 p-1"><FaTimes size={10} /></button>
                                                </div>
                                                <div className="max-h-[200px] overflow-y-auto custom-scrollbar">
                                                    {savedAccounts.map((account) => (
                                                        <div key={account.id} className="group/item flex items-center justify-between gap-2 px-3 py-2 hover:bg-primary/5 transition-colors">
                                                            <button 
                                                                onClick={() => {
                                                                    setImportData(prev => ({ 
                                                                        ...prev, 
                                                                        numericId: account.id, 
                                                                        password: account.password || '',
                                                                    }));
                                                                    handleNumericIdChange(account.id);
                                                                    setShowSuggestions(false);
                                                                }}
                                                                className="flex-grow flex items-center gap-3 text-right overflow-hidden outline-none"
                                                                type="button"
                                                            >
                                                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0 transition-transform group-hover/item:scale-110">
                                                                    <FaUserShield size={14} />
                                                                </div>
                                                                <div className="flex-grow min-w-0">
                                                                    <p className="text-xs font-bold text-gray-800 truncate">{account.displayName}</p>
                                                                    <p className="text-[9px] text-gray-500">رقم الحلقة: {account.id}</p>
                                                                </div>
                                                            </button>
                                                            <button 
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    const filtered = savedAccounts.filter(a => a.id !== account.id);
                                                                    localStorage.setItem('quran_saved_accounts', JSON.stringify(filtered));
                                                                    setSavedAccounts(filtered);
                                                                }}
                                                                className="p-2 text-gray-300 hover:text-red-400 transition-colors outline-none"
                                                                title="حذف"
                                                                type="button"
                                                            >
                                                                <FaTrash size={10} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>

                            {preview && (
                                <motion.div 
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-primary/5 border border-primary/20 p-3 rounded-xl"
                                >
                                    <p className="text-[10px] text-primary font-bold uppercase mb-1">تم العثور على حلقة:</p>
                                    <p className="text-sm font-bold text-gray-800">{preview.circle}</p>
                                    <p className="text-[10px] text-gray-500">المركز: {preview.center}</p>
                                </motion.div>
                            )}

                            <input 
                                type="password" 
                                placeholder="كلمة مرور النقل (4 أرقام)" 
                                value={importData.password}
                                maxLength={4}
                                onChange={(e) => {
                                    const val = e.target.value.replace(/[^0-9٠-٩]/g, '').slice(0, 4);
                                    setImportData(prev => ({ ...prev, password: val }));
                                }}
                                className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 placeholder-gray-400 outline-none focus:ring-2 focus:ring-primary text-gray-800" 
                            />

                            <button 
                                onClick={() => onImport(importData.numericId, importData.password, importData.teacherName, importData.teacherGender)} 
                                disabled={isImporting || !importData.numericId || !importData.password || !importData.teacherName}
                                className="w-full mt-2 bg-primary text-white font-bold p-3 rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                            >
                                {isImporting ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        جاري الاستيراد...
                                    </>
                                ) : "استيراد الحلقة"}
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>

            <AdminImportModal 
                isOpen={isLegacyImportOpen} 
                onClose={() => setIsLegacyImportOpen(false)} 
            />
        </div>
    );
};

export default Setup;
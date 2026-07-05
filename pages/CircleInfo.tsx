import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaArrowRight, FaCopy, FaUsers, FaChalkboardTeacher, FaHashtag, FaKey, FaBuilding, FaCheckCircle, FaEdit, FaUserEdit, FaCheck, FaGlobe, FaEllipsisV, FaTrash, FaBan, FaShieldAlt, FaUserSlash, FaUserCheck, FaCog, FaUserShield, FaUserPlus, FaUserTie, FaFilePdf, FaTimes } from 'react-icons/fa';
import { CircleData, TeacherPermissions, MemberPermissions } from '../types';
import { defaultMemberPermissions } from '../constants';
import SmartRecitationFormModal from '../components/SmartRecitationFormModal';

interface CircleInfoProps {
    data: CircleData;
    onBack: () => void;
    onEdit: () => void;
    onUpdateCode: (code: string) => void;
    onUpdateSupervisor: (uid: string, updates: Partial<TeacherPermissions>) => void;
    onUpdateDirectEntry: (enabled: boolean) => void;
    currentUserId: string;
    addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
    setConfirmationModal?: (data: any) => void;
}

const InfoBox: React.FC<{ icon: React.ElementType, label: string, value: string, subLabel: string, color?: string, onClick?: () => void, isEditable?: boolean }> = ({ icon: Icon, label, value, subLabel, color = "text-gray-400", onClick, isEditable }) => (
    <div className="bg-[#111317] border border-gray-800/40 p-3 rounded-2xl relative overflow-hidden group">
        <div className="flex justify-between items-start">
            <div className="flex-grow">
                <p className="text-[9px] text-gray-500 font-bold mb-0.5 uppercase tracking-wide">{label}</p>
                <p className="text-base font-mono font-bold text-white mb-0.5">{value}</p>
                <p className="text-[9px] text-gray-500/70">{subLabel}</p>
            </div>
            <div className={`w-8 h-8 rounded-xl bg-gray-800/30 flex items-center justify-center ${color}`}>
                <Icon size={14} />
            </div>
        </div>
        {isEditable && (
            <button 
                onClick={onClick}
                className="absolute top-1 left-1 p-1 opacity-0 group-hover:opacity-100 transition-opacity bg-primary/10 text-primary rounded-md"
            >
                <FaEdit size={10} />
            </button>
        )}
    </div>
);

const CircleInfo: React.FC<CircleInfoProps> = ({ data, onBack, onEdit, onUpdateCode, onUpdateSupervisor, onUpdateDirectEntry, currentUserId, addToast, setConfirmationModal }) => {
    const [isEditingCode, setIsEditingCode] = useState(false);
    const [tempCode, setTempCode] = useState(data.transferPassword || data.transferCode || '');
    const [showPermissionsModal, setShowPermissionsModal] = useState(false);
    const [showSmartFormModal, setShowSmartFormModal] = useState(false);
    const [selectedTeacherUid, setSelectedTeacherUid] = useState<string | null>(null);
    const [editingDetails, setEditingDetails] = useState<{name: string, gender: 'male' | 'female'} | null>(null);
    const [rejectingUid, setRejectingUid] = useState<string | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');

    const currentUserRole = data.teachers?.[currentUserId]?.role || 'member';
    const isOwnerOrTeacher = data.ownerId === currentUserId || currentUserRole === 'owner' || currentUserRole === 'teacher';
    const isOwnerOrFullAccess = data.ownerId === currentUserId || data.teachers?.[currentUserId]?.accessLevel === 'full';
    const currentUserGender = data.teachers?.[currentUserId]?.gender || 'male';

    useEffect(() => {
        if (selectedTeacherUid && data.teachers?.[selectedTeacherUid]) {
            const t = data.teachers[selectedTeacherUid];
            setEditingDetails({ name: t.name, gender: t.gender });
        } else {
            setEditingDetails(null);
        }
    }, [selectedTeacherUid, data.teachers]);

    const handleCopyAll = () => {
        const teacherTerm = data.teacherGender === 'male' ? 'المعلم' : 'المعلمة';
        const message = `
📌 *معلومات الحلقة القرآنية*
--------------------------
📖 *اسم الحلقة:* ${data.circle}
👤 *بإشراف ${teacherTerm}:* ${data.teacher}
🌍 *البلد:* ${data.town || 'غير محدد'}
👥 *عدد الطلاب:* ${data.students.length} طالب
🏢 *المركز/المسجد:* ${data.center || 'غير محدد'}
--------------------------
🆔 *رقم الحلقة (ID):* ${data.numericId}
🔑 *رمز الدخول:* ${data.transferPassword || data.transferCode}
--------------------------
🛡️ *نظام حلقتي لإدارة الحلقات*
        `.trim();

        navigator.clipboard.writeText(message);
        addToast('تم نسخ معلومات الحلقة بنجاح', 'success');
    };

    const handleSaveCode = () => {
        const sanitized = tempCode.replace(/[^0-9]/g, '');
        if (sanitized.length !== 4) {
            addToast('يجب أن يتكون رمز الدخول من 4 أرقام', 'error');
            return;
        }
        onUpdateCode(sanitized);
        setIsEditingCode(false);
        addToast('تم تحديث رمز الدخول بنجاح', 'success');
    };

    const teachers = data.teachers ? Object.entries(data.teachers)
        .map(([uid, t]) => ({ uid, ...t }))
        .sort((a, b) => {
            // Pending requests first
            if (a.status === 'pending' && b.status !== 'pending') return -1;
            if (a.status !== 'pending' && b.status === 'pending') return 1;
            
            // Current user
            if (a.uid === currentUserId) return -1;
            if (b.uid === currentUserId) return 1;
            
            // Owner
            if (a.uid === data.ownerId) return -1;
            if (b.uid === data.ownerId) return 1;
            
            return 0;
        }) : [];
    
    const assistants = teachers.filter(t => t.uid !== data.ownerId || t.status === 'pending');
    const creator = teachers.find(t => t.uid === data.ownerId && t.status !== 'pending');

    const handleAction = (uid: string, updates: Partial<TeacherPermissions> & { isDeleteAction?: boolean }) => {
        onUpdateSupervisor(uid, updates);
        setSelectedTeacherUid(null);
    };

    const selectedTeacher = selectedTeacherUid ? data.teachers?.[selectedTeacherUid] : null;

    return (
        <div className="max-w-md mx-auto space-y-5 pb-20 px-1">
            {/* Header */}
            <div className="flex items-center justify-between">
                <button onClick={onBack} className="p-2 text-white hover:bg-gray-800 rounded-full transition-colors outline-none">
                    <FaArrowRight size={18} />
                </button>
                <h1 className="text-lg font-bold text-white flex-grow text-center flex items-center justify-center gap-2">
                    {data.ownerId === currentUserId ? (
                        <FaUserShield className="text-amber-500" size={14} title="أنت منشئ الحلقة" />
                    ) : (
                        <FaChalkboardTeacher className="text-blue-400" size={14} title="أنت معلم في هذه الحلقة" />
                    )}
                    <span>بيانات الحلقة والمشاركة</span>
                </h1>
                <button 
                    onClick={handleCopyAll}
                    className="flex items-center gap-2 bg-[#10b981] text-white px-3 py-1.5 rounded-xl text-[10px] font-bold shadow-lg shadow-green-500/10 hover:scale-[1.02] active:scale-95 transition-all outline-none"
                >
                    <FaCopy size={12} />
                    <span>نسخ</span>
                </button>
            </div>

            {/* Main polished Green Card */}
            <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative bg-[#10b981] p-5 rounded-[2rem] shadow-xl shadow-green-500/5 overflow-hidden"
            >
                <FaCheckCircle className="absolute -bottom-6 -left-6 text-white/5 w-32 h-32" />
                
                <div className="relative z-10 flex justify-between items-start">
                    <div className="space-y-3">
                        <div>
                            <h2 className="text-xl font-bold text-white mb-0.5 tracking-tight truncate max-w-[180px]">{data.circle}</h2>
                            <p className="text-white/70 font-medium text-xs flex items-center gap-1.5 truncate max-w-[180px]">
                                <FaBuilding size={10} className="text-white/50" />
                                {data.center || 'غير محدد'}
                            </p>
                        </div>

                        <div className="flex flex-col gap-1.5">
                             <div className="flex items-center gap-3 text-white">
                                <span className="font-bold text-[11px] bg-white/10 px-2 py-0.5 rounded-full">{data.teacher}</span>
                                <span className="text-[10px] font-medium text-white/80">{data.students.length} طالب</span>
                             </div>
                             
                             {data.town && (
                                <div className="flex items-center gap-1.5 text-white/70 text-[10px] font-medium">
                                    <FaGlobe size={8} className="opacity-50" />
                                    <span>{data.town}</span>
                                </div>
                             )}
                        </div>
                    </div>

                    <div className="flex flex-col gap-2 items-end">
                        <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center border border-white/10 text-white">
                            <FaBuilding size={20} />
                        </div>
                        {isOwnerOrTeacher && (
                            <button 
                                onClick={onEdit}
                                className="p-1.5 bg-white/5 hover:bg-white/10 text-white rounded-lg border border-white/10 transition-all active:scale-95 outline-none"
                            >
                                <FaEdit size={12} />
                            </button>
                        )}
                    </div>
                </div>
            </motion.div>

            {/* Small Grid Boxes */}
            <div className="grid grid-cols-2 gap-3">
                <InfoBox 
                    icon={FaHashtag}
                    label="رقم الحلقة (ID)"
                    value={data.numericId}
                    subLabel="6 أرقام عشوائية"
                    color="text-emerald-400"
                />
                <InfoBox 
                    icon={FaKey}
                    label="رمز الدخول"
                    value={isOwnerOrTeacher ? (data.transferPassword || data.transferCode || '0000') : '****'}
                    subLabel={isOwnerOrTeacher ? "4 أرقام عشوائية" : "غير مسموح لك برؤية هذه البيانات"}
                    color={isOwnerOrTeacher ? "text-emerald-400" : "text-amber-500"}
                    isEditable={isOwnerOrTeacher}
                    onClick={() => {
                        if (isOwnerOrTeacher) {
                            setIsEditingCode(true);
                        } else {
                            addToast('الرجاء طلب الصلاحيات من أحد المنشئين لرؤية أو تعديل هذه البيانات', 'info');
                        }
                    }}
                />
            </div>

            {/* Direct Entry Toggle */}
            {isOwnerOrTeacher && (
                <div className="bg-[#111317] border border-gray-800/40 p-4 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${data.allowDirectEntry !== false ? 'bg-emerald-500/10 text-emerald-500' : 'bg-gray-800 text-gray-500'}`}>
                            <FaCheck size={14} />
                        </div>
                        <div>
                            <h3 className="text-white text-xs font-bold">دخول مباشر</h3>
                            <p className="text-[10px] text-gray-500">تمكين المعلمين من الانضمام بدون موافقة</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => onUpdateDirectEntry(data.allowDirectEntry === false)}
                        className={`w-12 h-6 rounded-full relative transition-colors ${data.allowDirectEntry !== false ? 'bg-[#10b981]' : 'bg-gray-700'}`}
                    >
                        <motion.div 
                            animate={{ x: data.allowDirectEntry !== false ? 26 : 2 }}
                            className="absolute top-1 left-0 w-4 h-4 bg-white rounded-full shadow-sm"
                        />
                    </button>
                </div>
            )}

            {/* Smart Tools Section */}
            {isOwnerOrTeacher && (
                <div className="bg-[#111317] border border-gray-800/40 p-4 rounded-2xl space-y-3">
                    <div className="flex items-center gap-2 text-primary font-bold text-xs">
                        <FaFilePdf size={14} className="text-secondary" />
                        <h3>أدوات التسميع الذكي</h3>
                    </div>
                    <button 
                        onClick={() => setShowSmartFormModal(true)}
                        className="w-full flex items-center justify-between p-3.5 bg-primary/10 border border-primary/20 rounded-[1.5rem] hover:bg-primary/20 transition-all outline-none"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary/20 text-primary rounded-xl flex items-center justify-center">
                                <FaFilePdf size={18} />
                            </div>
                            <div className="text-right">
                                <p className="text-white text-[11px] font-bold">توليد كشف تسميع ذكي</p>
                                <p className="text-[9px] text-gray-500">للطباعة والإدخال التلقائي بالكاميرا</p>
                            </div>
                        </div>
                        <FaArrowRight className="text-gray-600 rotate-180" size={12} />
                    </button>
                </div>
            )}

            {/* Assistant Teachers Section */}
            <div className="bg-[#111317] border border-gray-800/40 p-4 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[#10b981] font-bold text-xs">
                        <FaUserEdit size={14} />
                        <h3>المدراء والمعلمون</h3>
                    </div>
                </div>

                <div className="space-y-2">
                    {/* Creator / Main Owner */}
                    {creator && (
                        <div className="flex items-center gap-2.5 p-2 bg-[#10b981]/5 rounded-xl border border-[#10b981]/10">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-sm ${creator.gender === 'female' ? 'bg-pink-500/10 text-pink-500' : 'bg-blue-500/10 text-blue-500'}`}>
                                <FaChalkboardTeacher size={14} />
                            </div>
                            <div className="flex-grow">
                                <div className="flex items-center gap-2">
                                    <p className="text-xs font-bold text-white/90">
                                        {creator.name}
                                        {creator.uid === currentUserId && <span className="text-emerald-400 mr-1.5">(أنت{creator.gender === 'female' ? 'ِ' : ''})</span>}
                                        {creator.uid === data.ownerId && <FaShieldAlt size={10} className="text-amber-500 inline-block mr-1" title="مالك أساسي" />}
                                    </p>
                                    <span className="text-[7px] bg-[#10b981]/10 text-[#10b981] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">المنشئ</span>
                                </div>
                                <p className="text-[8px] text-gray-500 uppercase">{creator.gender === 'female' ? 'معلمة' : 'معلم'}</p>
                            </div>
                        </div>
                    )}

                    {/* Assistant Teachers */}
                    {assistants.map((teacher) => (
                        <div key={teacher.uid} className={`flex items-center gap-2.5 p-2 rounded-xl border transition-colors ${teacher.status === 'suspended' ? 'bg-red-500/5 border-red-500/10 opacity-70' : teacher.status === 'pending' ? 'bg-amber-500/5 border-amber-500/10' : 'bg-gray-900/30 border-gray-800/30'}`}>
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-sm ${teacher.gender === 'female' ? 'bg-pink-500/5 text-pink-500/70' : 'bg-blue-500/5 text-blue-500/70'}`}>
                                {teacher.role === 'assistant' ? <FaUserTie size={14} /> : teacher.role === 'member' ? <FaUsers size={14} /> : <FaChalkboardTeacher size={14} />}
                            </div>
                            <div className="flex-grow overflow-hidden">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <p className="text-xs font-bold text-white/90 truncate flex items-center gap-1.5">
                                        {teacher.name}
                                        {teacher.uid === currentUserId && <span className="text-emerald-400 font-normal">(أنت{teacher.gender === 'female' ? 'ِ' : ''})</span>}
                                        {teacher.uid === data.ownerId && <FaShieldAlt size={10} className="text-amber-500" title="مالك أساسي" />}
                                        {teacher.role === 'owner' && teacher.uid !== data.ownerId && <FaUserShield size={10} className="text-blue-400" title="مالك" />}
                                        {teacher.role === 'teacher' && <FaChalkboardTeacher size={10} className="text-gray-400" title="معلم" />}
                                        {teacher.role === 'assistant' && <FaUserTie size={10} className="text-gray-500" title="مساعد" />}
                                    </p>
                                    {teacher.accessLevel === 'full' && (
                                        <span className="text-[7px] bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded-full font-bold uppercase">صلاحية كاملة</span>
                                    )}
                                    {teacher.status === 'suspended' && (
                                        <span className="text-[7px] bg-red-500/10 text-red-500 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">موقوف</span>
                                    )}
                                    {teacher.status === 'pending' && (
                                        <span className="text-[7px] bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">طلب انضمام</span>
                                    )}
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <p className="text-[8px] text-gray-500 uppercase">
                                        {teacher.role === 'assistant' ? 'مساعد' : teacher.role === 'member' ? 'عضو' : 'معلم'} 
                                        {teacher.gender === 'female' ? 'ة' : ''}
                                    </p>
                                </div>
                            </div>
                            
                            {isOwnerOrTeacher && (
                                <div className="flex items-center gap-1">
                                    {teacher.status === 'pending' && (
                                        <>
                                            <button 
                                                onClick={() => handleAction(teacher.uid, { status: 'active' })}
                                                className="p-2 text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-all"
                                                title="قبول المعلم"
                                            >
                                                <FaCheck size={12} />
                                            </button>
                                            <button 
                                                onClick={() => setRejectingUid(teacher.uid)}
                                                className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                                title="رفض المعلم"
                                            >
                                                <FaTimes size={12} />
                                            </button>
                                        </>
                                    )}
                                    {teacher.uid !== currentUserId && (
                                        <button 
                                            onClick={() => setSelectedTeacherUid(teacher.uid)}
                                            className="p-1.5 text-gray-500 hover:text-white transition-colors"
                                        >
                                            <FaEllipsisV size={12} />
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Small Instructions */}
            <div className="bg-[#1c1a16] border border-amber-900/10 p-4 rounded-2xl relative overflow-hidden">
                <div className="flex gap-3 relative z-10">
                    <div className="w-9 h-9 bg-amber-500/5 text-amber-500/80 rounded-xl flex items-center justify-center flex-shrink-0 border border-amber-500/10">
                        <FaKey size={16} />
                    </div>
                    <div className="flex flex-col justify-center">
                        <h3 className="text-amber-500 text-[11px] font-bold mb-0.5">تعليمات المشاركة</h3>
                        <p className="text-[9px] text-amber-600/60 leading-tight font-medium">
                            انسخ البيانات لمشاركة الحلقة مع معلمين آخرين عبر "استيراد حلقة موجودة".
                        </p>
                    </div>
                </div>
            </div>

            {/* Teacher Actions Modal */}
            <AnimatePresence>
                {selectedTeacherUid && selectedTeacher && (
                    <div className="fixed inset-0 z-[110] flex items-end justify-center sm:items-center p-0 sm:p-4">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedTeacherUid(null)}
                            className="absolute inset-0 bg-black/70 backdrop-blur-[2px]"
                        />
                        <motion.div 
                            initial={{ y: 100, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 100, opacity: 0 }}
                            className="bg-[#111317] border-t sm:border border-gray-800 p-6 rounded-t-[2.5rem] sm:rounded-[2.5rem] w-full max-w-[340px] relative z-20 shadow-2xl max-h-[90vh] overflow-y-auto"
                        >
                            <div className="text-center mb-6">
                                <div className={`w-14 h-14 mx-auto mb-3 rounded-2xl flex items-center justify-center ${ (editingDetails?.gender || selectedTeacher.gender) === 'female' ? 'bg-pink-500/10 text-pink-500' : 'bg-blue-500/10 text-blue-500'}`}>
                                    <FaChalkboardTeacher size={24} />
                                </div>
                                
                                {isOwnerOrFullAccess && selectedTeacherUid !== data.ownerId ? (
                                    <div className="space-y-3 px-2">
                                        <input 
                                            type="text"
                                            value={editingDetails?.name || ''}
                                            onChange={(e) => setEditingDetails(prev => prev ? {...prev, name: e.target.value} : null)}
                                            className="w-full bg-gray-800/50 border border-gray-700/50 text-white text-center font-bold p-2 px-4 rounded-xl outline-none focus:border-primary transition-all text-sm"
                                            placeholder="اسم المعلم..."
                                        />
                                        <div className="flex justify-center gap-4">
                                           <label className="flex items-center gap-2 cursor-pointer">
                                               <input 
                                                   type="radio" 
                                                   checked={editingDetails?.gender === 'male'} 
                                                   onChange={() => setEditingDetails(prev => prev ? {...prev, gender: 'male'} : null)}
                                                   className="hidden"
                                               />
                                               <span className={`text-[10px] font-bold px-3 py-1 rounded-lg border transition-all ${editingDetails?.gender === 'male' ? 'bg-blue-600 border-blue-600 text-white' : 'bg-gray-800 border-gray-700 text-gray-500'}`}>ذكر</span>
                                           </label>
                                           <label className="flex items-center gap-2 cursor-pointer">
                                               <input 
                                                   type="radio" 
                                                   checked={editingDetails?.gender === 'female'} 
                                                   onChange={() => setEditingDetails(prev => prev ? {...prev, gender: 'female'} : null)}
                                                   className="hidden"
                                               />
                                               <span className={`text-[10px] font-bold px-3 py-1 rounded-lg border transition-all ${editingDetails?.gender === 'female' ? 'bg-pink-600 border-pink-600 text-white' : 'bg-gray-800 border-gray-700 text-gray-500'}`}>أنثى</span>
                                           </label>
                                        </div>
                                        {(editingDetails?.name !== selectedTeacher.name || editingDetails?.gender !== selectedTeacher.gender) && (
                                            <button 
                                               onClick={() => onUpdateSupervisor(selectedTeacherUid, { name: editingDetails?.name, gender: editingDetails?.gender })}
                                               className="bg-[#10b981] text-white text-[10px] font-bold py-1.5 px-4 rounded-lg shadow-lg shadow-green-500/20 hover:scale-105 active:scale-95 transition-all outline-none"
                                            >
                                                حفظ التعديلات
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <>
                                        <h3 className="text-base font-bold text-white">{selectedTeacher.name}</h3>
                                        {selectedTeacher.status === 'pending' && <p className="text-xs font-bold text-amber-500 mt-1">بانتظار الموافقة وتحديد الرتبة</p>}
                                        {selectedTeacher.status !== 'pending' && <p className="text-[10px] text-gray-500 uppercase mt-1">تعديل صلاحيات ورتبة العضو</p>}
                                    </>
                                )}
                            </div>

                            <div className="space-y-4">
                                {/* Role Selection */}
                                <div className="space-y-2">
                                    <p className="text-[10px] text-gray-500 font-bold px-1 mb-1">الرتبة في الحلقة:</p>
                                    <div className="grid grid-cols-3 gap-2">
                                        {[
                                            { id: 'teacher', label: 'معلم', icon: FaChalkboardTeacher },
                                            { id: 'assistant', label: 'مساعد', icon: FaUserTie },
                                            { id: 'member', label: 'عضو', icon: FaUsers }
                                        ].map((role) => (
                                            <button
                                                key={role.id}
                                                onClick={() => handleAction(selectedTeacherUid, { 
                                                    role: role.id as any,
                                                    permissions: defaultMemberPermissions[role.id as keyof typeof defaultMemberPermissions],
                                                    status: 'active' // Auto-activate if pending and role selected
                                                })}
                                                className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border transition-all ${selectedTeacher.role === role.id && selectedTeacher.status !== 'pending' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' : 'bg-gray-800/50 border-gray-700/50 text-gray-400'}`}
                                            >
                                                <role.icon size={14} />
                                                <span className="text-[9px] font-bold">{role.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Quick Toggles */}
                                <div className="grid grid-cols-2 gap-2">
                                    <button 
                                        onClick={() => handleAction(selectedTeacherUid, { status: selectedTeacher.status === 'suspended' ? 'active' : 'suspended' })}
                                        className={`flex items-center gap-2 p-3 rounded-2xl font-bold text-[10px] transition-all active:scale-95 border ${selectedTeacher.status === 'suspended' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/10' : 'bg-red-500/10 text-red-500 border-red-500/10'}`}
                                    >
                                        {selectedTeacher.status === 'suspended' ? <FaUserCheck size={14} /> : <FaUserSlash size={14} />}
                                        <span>{selectedTeacher.status === 'suspended' ? 'تفعيل' : 'إيقاف'}</span>
                                    </button>

                                    <button 
                                        onClick={() => setShowPermissionsModal(true)}
                                        className="flex items-center gap-2 p-3 rounded-2xl font-bold text-[10px] bg-amber-500/10 text-amber-500 border border-amber-500/10 transition-all active:scale-95"
                                    >
                                        <FaCog size={14} />
                                        <span>الصلاحيات</span>
                                    </button>
                                </div>

                                <div className="h-px bg-gray-800/50 my-2" />

                                {/* Full Access Toggle (Shortcut for admins) */}
                                {selectedTeacher.role === 'teacher' && (
                                    <button 
                                        onClick={() => handleAction(selectedTeacherUid, { accessLevel: selectedTeacher.accessLevel === 'full' ? 'standard' : 'full' })}
                                        className={`w-full flex items-center justify-between p-3.5 rounded-2xl font-bold text-xs transition-all active:scale-95 border ${selectedTeacher.accessLevel === 'full' ? 'bg-blue-600 text-white border-blue-600' : 'bg-blue-500/10 text-blue-400 border-blue-500/10'}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <FaShieldAlt size={14} />
                                            <span>صلاحية كاملة (مشرف)</span>
                                        </div>
                                        {selectedTeacher.accessLevel === 'full' && <FaCheck size={12} />}
                                    </button>
                                )}

                                {/* Delete / Reject Action */}
                                {selectedTeacherUid !== data.ownerId && (
                                    selectedTeacher.status === 'pending' ? (
                                        <button 
                                            onClick={() => {
                                                setRejectingUid(selectedTeacherUid);
                                                setSelectedTeacherUid(null);
                                            }}
                                            className="w-full flex items-center gap-3 p-3.5 rounded-2xl font-bold text-xs bg-red-600/10 text-red-500 border border-red-600/10 transition-all active:scale-95 outline-none"
                                        >
                                            <FaTimes size={14} />
                                            <span>رفض طلب الانضمام</span>
                                        </button>
                                    ) : (
                                        <button 
                                            onClick={() => {
                                                if (setConfirmationModal) {
                                                    setConfirmationModal({
                                                        isOpen: true,
                                                        title: 'حذف معلم',
                                                        message: `هل أنت متأكد من حذف (${selectedTeacher.name}) من الحلقة بشكل نهائي؟`,
                                                        onConfirm: () => handleAction(selectedTeacherUid, { isDeleteAction: true } as any)
                                                    });
                                                } else if (window.confirm(`هل أنت متأكد من حذف (${selectedTeacher.name}) من الحلقة بشكل نهائي؟`)) {
                                                    handleAction(selectedTeacherUid, { isDeleteAction: true } as any);
                                                }
                                            }}
                                            className="w-full flex items-center gap-3 p-3.5 rounded-2xl font-bold text-xs bg-red-600/10 text-red-500 border border-red-600/10 transition-all active:scale-95"
                                        >
                                            <FaTrash size={14} />
                                            <span>حذف من الحلقة نهائياً</span>
                                        </button>
                                    )
                                )}

                                {/* Ownership Management (Only for current owner) */}
                                {data.ownerId === currentUserId && selectedTeacherUid !== currentUserId && selectedTeacher.status === 'active' && (
                                    <div className="pt-4 border-t border-gray-800 space-y-2">
                                        <p className="text-[10px] text-gray-500 font-bold px-1 mb-1 italic text-center">إدارة الملكية (صلاحيات المنشئ):</p>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button 
                                                onClick={() => {
                                                   setConfirmationModal?.({
                                                       isOpen: true,
                                                       title: 'نقل الملكية',
                                                       message: `هل أنت متأكد من نقل ملكية الحلقة إلى (${selectedTeacher.name})؟ سيصبح هو المسؤول الأول عنها.`,
                                                       onConfirm: () => handleAction(selectedTeacherUid, { isTransferOwnership: true } as any)
                                                   });
                                                }}
                                                className="flex items-center justify-center gap-2 p-3 rounded-2xl font-bold text-[10px] bg-amber-600 text-white border border-amber-600 transition-all active:scale-95 shadow-lg shadow-amber-600/20 outline-none"
                                            >
                                                <FaUserShield size={14} />
                                                <span>نقل الملكية</span>
                                            </button>
                                            <button 
                                                onClick={() => {
                                                   setConfirmationModal?.({
                                                       isOpen: true,
                                                       title: 'منح ملكية مشتركة',
                                                       message: `هل تريد منح (${selectedTeacher.name}) صلاحية المنشئ؟ سيكون له كامل الصلاحيات مثلك.`,
                                                       onConfirm: () => handleAction(selectedTeacherUid, { isCopyOwnership: true } as any)
                                                   });
                                                }}
                                                className="flex items-center justify-center gap-2 p-3 rounded-2xl font-bold text-[10px] bg-blue-600 text-white border border-blue-600 transition-all active:scale-95 shadow-lg shadow-blue-600/20 outline-none"
                                            >
                                                <FaUserPlus size={14} />
                                                <span>منح ملكية</span>
                                            </button>
                                        </div>
                                    </div>
                                )}

                                <button 
                                    onClick={() => setSelectedTeacherUid(null)}
                                    className="w-full p-2 text-xs text-gray-500 font-bold"
                                >
                                    إغلاق
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Granular Permissions Modal */}
            <AnimatePresence>
                {showPermissionsModal && selectedTeacherUid && selectedTeacher && (
                    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowPermissionsModal(false)}
                            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                        />
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-[#111317] border border-gray-800 p-6 rounded-[2.5rem] w-full max-w-[320px] relative z-10 shadow-2xl"
                        >
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 bg-amber-500/10 text-amber-500 rounded-xl flex items-center justify-center">
                                    <FaCog size={18} />
                                </div>
                                <h3 className="text-base font-bold text-white">صلاحيات {selectedTeacher.name}</h3>
                            </div>

                            <div className="space-y-3 mb-6">
                                {[
                                    { id: 'canManageStudents', label: 'إضافة وتعديل الطلاب', icon: FaUserEdit },
                                    { id: 'canCreateSessions', label: 'إنشاء الجلسات اليومية', icon: FaCheckCircle },
                                    { id: 'canEditCircleSettings', label: 'تعديل إعدادات الحلقة', icon: FaCog },
                                    { id: 'canEditPastSessions', label: 'تعديل/حذف الجلسات السابقة', icon: FaEdit },
                                    { id: 'canSendReports', label: 'إرسال تقارير لأولياء الأمور', icon: FaCopy }
                                ].map((perm) => {
                                    const hasPerm = selectedTeacher.permissions?.[perm.id as keyof MemberPermissions];
                                    return (
                                        <button
                                            key={perm.id}
                                            onClick={() => {
                                                const currentPerms = selectedTeacher.permissions || defaultMemberPermissions[selectedTeacher.role as keyof typeof defaultMemberPermissions] || defaultMemberPermissions.member;
                                                handleAction(selectedTeacherUid, {
                                                    permissions: {
                                                        ...currentPerms,
                                                        [perm.id]: !hasPerm
                                                    }
                                                });
                                            }}
                                            className="w-full flex items-center justify-between p-3 bg-gray-800/40 border border-gray-800/60 rounded-2xl hover:bg-gray-800/60 transition-colors"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`p-1.5 rounded-lg ${hasPerm ? 'bg-emerald-500/10 text-emerald-500' : 'bg-gray-700/50 text-gray-500'}`}>
                                                    <perm.icon size={12} />
                                                </div>
                                                <span className={`text-[10px] font-bold ${hasPerm ? 'text-white' : 'text-gray-500'}`}>{perm.label}</span>
                                            </div>
                                            <div className={`w-8 h-4 rounded-full relative transition-colors ${hasPerm ? 'bg-emerald-500' : 'bg-gray-700'}`}>
                                                <motion.div 
                                                    animate={{ x: hasPerm ? 18 : 2 }}
                                                    className="absolute top-1 left-0 w-2 h-2 bg-white rounded-full"
                                                />
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            <button 
                                onClick={() => setShowPermissionsModal(false)}
                                className="w-full bg-[#10b981] text-white p-3.5 rounded-2xl text-xs font-bold shadow-lg shadow-green-500/20 active:scale-95 transition-all"
                            >
                                حفظ وإغلاق
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Minimal Code Editor */}
            <AnimatePresence>
                {isEditingCode && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsEditingCode(false)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
                        />
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-[#111317] border border-gray-800 p-5 rounded-[2rem] w-full max-w-[280px] relative z-10 shadow-2xl"
                        >
                            <h3 className="text-base font-bold text-white mb-3 text-center">رمز الدخول</h3>
                            <input 
                                type="text"
                                maxLength={4}
                                value={tempCode}
                                onChange={(e) => setTempCode(e.target.value.replace(/[^0-9]/g, ''))}
                                placeholder="0000"
                                className="w-full bg-gray-800/50 border border-gray-700 text-center p-3 rounded-xl text-2xl font-mono font-bold text-[#10b981] outline-none focus:ring-1 focus:ring-emerald-500/30 transition-all mb-4"
                                autoFocus
                            />

                            <div className="flex gap-2">
                                <button 
                                    onClick={handleSaveCode}
                                    className="flex-1 bg-[#10b981] text-white p-2.5 rounded-xl text-xs font-bold shadow-lg shadow-green-500/10"
                                >
                                    حفظ
                                </button>
                                <button 
                                    onClick={() => setIsEditingCode(false)}
                                    className="px-4 bg-gray-800 text-gray-400 p-2.5 rounded-xl text-xs font-bold outline-none"
                                >
                                    إلغاء
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}

                {rejectingUid && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => { setRejectingUid(null); setRejectionReason(''); }}
                            className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
                        />
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-[#111317] border border-gray-800 p-6 rounded-[2rem] w-full max-w-sm relative z-10 shadow-2xl text-right"
                            dir="rtl"
                        >
                            <h3 className="text-base font-bold text-white mb-1">رفض طلب الانضمام</h3>
                            <p className="text-[11px] text-gray-500 mb-4">هل ترغب في إضافة سبب لرفض طلب انضمام المعلم؟</p>
                            
                            <input 
                                type="text"
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                placeholder="مثال: الحلقة مكتملة حالياً..."
                                className="w-full bg-gray-850 border border-gray-700 p-3 rounded-xl text-xs text-white outline-none focus:ring-1 focus:ring-red-500/30 transition-all mb-4 font-medium"
                                autoFocus
                            />

                            <div className="flex gap-2">
                                <button 
                                    onClick={() => {
                                        handleAction(rejectingUid, { status: 'rejected', rejectionReason: rejectionReason.trim() } as any);
                                        setRejectingUid(null);
                                        setRejectionReason('');
                                    }}
                                    className="flex-1 bg-red-600 text-white p-2.5 rounded-xl text-xs font-bold shadow-lg shadow-red-500/10"
                                >
                                    تأكيد الرفض
                                </button>
                                <button 
                                    onClick={() => { setRejectingUid(null); setRejectionReason(''); }}
                                    className="px-4 bg-gray-800 text-gray-400 p-2.5 rounded-xl text-xs font-bold outline-none"
                                >
                                    إلغاء
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <SmartRecitationFormModal 
                isOpen={showSmartFormModal}
                onClose={() => setShowSmartFormModal(false)}
                circleData={data}
                addToast={addToast}
            />
        </div>
    );
};

export default CircleInfo;

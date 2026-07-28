import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaArrowRight, FaCopy, FaUsers, FaChalkboardTeacher, FaHashtag, FaKey, FaBuilding, FaCheckCircle, FaEdit, FaUserEdit, FaCheck, FaGlobe, FaEllipsisV, FaTrash, FaBan, FaShieldAlt, FaUserSlash, FaUserCheck, FaCog, FaUserShield, FaUserPlus, FaUserTie, FaFilePdf, FaTimes } from 'react-icons/fa';
import { CircleData, TeacherPermissions, MemberPermissions } from '../types';
import { defaultMemberPermissions } from '../constants';

interface CircleInfoProps {
    data: CircleData;
    onBack: () => void;
    onEdit: () => void;
    onUpdateCode: (code: string) => void;
    onUpdateSupervisor: (uid: string, updates: Partial<TeacherPermissions> & { isDeleteAction?: boolean; rejectionReason?: string }) => void;
    onUpdateDirectEntry: (enabled: boolean) => void;
    currentUserId: string;
    addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
    setConfirmationModal?: (data: any) => void;
    onDeleteCircle?: (id: string) => void;
    onOpenPermissions?: () => void;
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

const CircleInfo: React.FC<CircleInfoProps> = ({ data, onBack, onEdit, onUpdateCode, onUpdateSupervisor, onUpdateDirectEntry, currentUserId, addToast, setConfirmationModal, onDeleteCircle, onOpenPermissions }) => {
    const [isEditingCode, setIsEditingCode] = useState(false);
    const [tempCode, setTempCode] = useState(data.transferPassword || data.transferCode || '');

    const currentUserRole = data.teachers?.[currentUserId]?.role || 'member';
    const isOwnerOrAdmin = data.ownerId === currentUserId || ['owner', 'admin'].includes(currentUserRole) || !!data.teachers?.[currentUserId]?.permissions?.canEditCircleSettings;

    const handleCopyAll = () => {
        const teacherTerm = data.teacherGender === 'female' ? 'المعلمة' : 'المعلم';
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
        if (!isOwnerOrAdmin) {
            addToast('عذراً، تعديل رمز الدخول متاح فقط لمديري ومنشئي الحلقة.', 'error');
            return;
        }
        const sanitized = tempCode.replace(/[^0-9]/g, '');
        if (sanitized.length !== 4) {
            addToast('يجب أن يتكون رمز الدخول من 4 أرقام', 'error');
            return;
        }
        onUpdateCode(sanitized);
        setIsEditingCode(false);
        addToast('تم تحديث رمز الدخول بنجاح', 'success');
    };

    const handleToggleDirectEntry = () => {
        if (!isOwnerOrAdmin) {
            addToast('عذراً، تعديل إعدادات الدخول المباشر متاح فقط لمديري ومنشئي الحلقة.', 'error');
            return;
        }
        onUpdateDirectEntry(!data.allowDirectEntry);
    };

    const handleAcceptTeacher = (uid: string) => {
        if (!isOwnerOrAdmin) {
            addToast('عذراً، قبول أو رفض طلبات الانضمام متاح فقط لمديري ومنشئي الحلقة.', 'error');
            return;
        }
        onUpdateSupervisor(uid, { status: 'active' });
        addToast('تم قبول طلب الانضمام بنجاح.', 'success');
    };

    const handleRejectTeacher = (uid: string) => {
        if (!isOwnerOrAdmin) {
            addToast('عذراً، قبول أو رفض طلبات الانضمام متاح فقط لمديري ومنشئي الحلقة.', 'error');
            return;
        }
        onUpdateSupervisor(uid, { isDeleteAction: true });
        addToast('تم رفض طلب الانضمام.', 'info');
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
                        {isOwnerOrAdmin && (
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
                    value={isOwnerOrAdmin ? (data.transferPassword || data.transferCode || '0000') : '****'}
                    subLabel={isOwnerOrAdmin ? "4 أرقام عشوائية" : "غير مسموح لك برؤية هذه البيانات"}
                    color={isOwnerOrAdmin ? "text-emerald-400" : "text-amber-500"}
                    isEditable={isOwnerOrAdmin}
                    onClick={() => {
                        if (isOwnerOrAdmin) {
                            setIsEditingCode(true);
                        } else {
                            addToast('الرجاء طلب الصلاحيات من أحد المنشئين لرؤية أو تعديل هذه البيانات', 'info');
                        }
                    }}
                />
            </div>

            {/* Direct Entry Toggle */}
            {isOwnerOrAdmin && (
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

            {/* Assistant Teachers Section */}
            <div className="bg-[#111317] border border-gray-800/40 p-4 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[#10b981] font-bold text-xs">
                        <FaUserEdit size={14} />
                        <h3>المدراء والمعلمون</h3>
                    </div>
                    {onOpenPermissions && (
                        <button 
                            onClick={onOpenPermissions}
                            className="bg-[#10b981]/10 hover:bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/20 px-2.5 py-1 rounded-xl text-[10px] font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
                        >
                            <FaShieldAlt size={10} />
                            <span>جدول الصلاحيات الشامل</span>
                        </button>
                    )}
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
                            
                            {isOwnerOrAdmin && (
                                <div className="flex items-center gap-1">
                                    {teacher.status === 'pending' && (
                                        <>
                                            <button 
                                                onClick={() => handleAcceptTeacher(teacher.uid)}
                                                className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all"
                                                title="قبول المعلم"
                                            >
                                                <FaCheck size={10} />
                                                <span>قبول</span>
                                            </button>
                                            <button 
                                                onClick={() => handleRejectTeacher(teacher.uid)}
                                                className="px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all"
                                                title="رفض المعلم"
                                            >
                                                <FaTimes size={10} />
                                                <span>رفض</span>
                                            </button>
                                        </>
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

            </AnimatePresence>
        </div>
    );
};

export default CircleInfo;

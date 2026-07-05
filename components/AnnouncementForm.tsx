import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Announcement, Student, ConfirmationModalData } from '../types';
import { FaArrowLeft, FaSave, FaUsers, FaInfoCircle, FaSearch } from 'react-icons/fa';
import StudentAvatar from './StudentAvatar';
import StudentGroupSelector from './StudentGroupSelector';
import { normalizeText } from '../utils/helpers';

interface AnnouncementFormProps {
    announcement: Announcement | null;
    setAnnouncement: (announcement: Announcement | null) => void;
    students: Student[];
    onSave: (announcement: Announcement) => void;
    onBack: (updatedAnnouncement?: Announcement | null) => void;
    setConfirmationModal: (data: Omit<ConfirmationModalData, 'isOpen'> & { isOpen: boolean }) => void;
    circleId: string | number;
}

const modalVariants = {
    initial: { x: '100%' },
    animate: { x: 0 },
    exit: { x: '100%' },
};

const Section: React.FC<{ title: string; children: React.ReactNode; rightContent?: React.ReactNode; }> = ({ title, children, rightContent }) => (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold">{title}</h3>
            {rightContent}
        </div>
        {children}
    </div>
);

const AnnouncementForm: React.FC<AnnouncementFormProps> = ({ announcement, setAnnouncement, students, onSave, onBack, setConfirmationModal, circleId }) => {
    const [isStudentSelectorOpen, setIsStudentSelectorOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Local states for inputs to solve the lagging/freezing/text loss issue completely
    const [localTitle, setLocalTitle] = useState(announcement?.title || '');
    const [localContent, setLocalContent] = useState(announcement?.content || '');
    const [localTargetStudentIds, setLocalTargetStudentIds] = useState<number[]>(announcement?.targetStudentIds || []);

    // Sync local state when the active announcement changes
    useEffect(() => {
        if (announcement) {
            setLocalTitle(announcement.title);
            setLocalContent(announcement.content);
            setLocalTargetStudentIds(announcement.targetStudentIds);
        }
    }, [announcement?.id]);

    // Keep target IDs synced if any student is deleted or changed
    useEffect(() => {
        if (announcement && announcement.id) { 
            const allStudentIds = new Set(students.map(s => s.id));
            const syncedTargetIds = localTargetStudentIds.filter(id => allStudentIds.has(id));

            if (syncedTargetIds.length !== localTargetStudentIds.length) {
                setLocalTargetStudentIds(syncedTargetIds);
            }
        }
    }, [students]);

    if (!announcement) return null;

    const handleStudentSelection = (studentId: number) => {
        setLocalTargetStudentIds(prev => 
            prev.includes(studentId)
                ? prev.filter(id => id !== studentId)
                : [...prev, studentId]
        );
    };
    
    const handleSelectAllStudents = () => {
         if (localTargetStudentIds.length === students.length) {
            setLocalTargetStudentIds([]);
         } else {
            setLocalTargetStudentIds(students.map(s => s.id));
         }
    };

    const handleSave = () => {
        const updated: Announcement = {
            ...announcement,
            title: localTitle,
            content: localContent,
            targetStudentIds: localTargetStudentIds
        };
        onSave(updated);
    };

    const handleBack = () => {
        const hasData = localTitle.trim() !== '' || localContent.trim() !== '';
        if (!hasData) {
            setAnnouncement(null); // Discard empty draft
            onBack(null);
        } else {
            const updated: Announcement = {
                ...announcement,
                title: localTitle,
                content: localContent,
                targetStudentIds: localTargetStudentIds
            };
            onBack(updated);
        }
    };

    const filteredStudentsForSelection = students.filter(s => normalizeText(s.name).includes(normalizeText(searchTerm)));

    return (
        <motion.div variants={modalVariants} initial="initial" animate="animate" exit="exit" transition={{type:'spring', stiffness: 300, damping: 30}} className="fixed inset-0 bg-gray-50 dark:bg-gray-900 z-40 flex flex-col p-4 max-w-md mx-auto">
            <header className="flex items-center justify-between mb-4 pb-4 border-b dark:border-gray-700 flex-shrink-0">
                <div className="flex items-center gap-3">
                    <button onClick={handleBack} className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">
                        <FaArrowLeft />
                    </button>
                    <h2 className="text-xl font-bold text-primary dark:text-accent">
                        {announcement.createdAt === announcement.id ? 'إعلان جديد' : 'تعديل الإعلان'}
                    </h2>
                </div>
                <button onClick={handleSave} className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-bold hover:bg-primary-dark transition-colors">
                    <FaSave /> حفظ
                </button>
            </header>

            <main className="flex-grow overflow-y-auto space-y-4 pb-16">
                <Section title="محتوى الإعلان">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">عنوان الإعلان</label>
                            <input 
                                type="text" 
                                value={localTitle} 
                                onChange={e => setLocalTitle(e.target.value)} 
                                placeholder="عنوان الإعلان (مثال: تنويه هام)" 
                                className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-1 focus:ring-primary/50 text-sm font-sans" 
                            />
                            </div>
                        
                        <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5">نص الإعلان</label>
                            <div className="flex flex-col rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm">
                                {/* Header Preview Box */}
                                <div className="bg-amber-50/50 dark:bg-amber-950/10 text-slate-600 dark:text-slate-400 text-[11px] px-3 py-2.5 border-b border-gray-200 dark:border-gray-700 font-sans leading-relaxed select-none">
                                    <span className="font-bold text-amber-700 dark:text-amber-500">✨ مقدمة الرسالة التلقائية (يضيفها النظام):</span>
                                    <div className="mt-1 font-sans opacity-75">
                                        السلام عليكم ورحمة الله وبركاته <br />
                                لى ولي أمر الطالب: *[اسم الطالب]*
                                    </div>
                                </div>

                                {/* Main Textarea */}
                                <textarea 
                                    value={localContent} 
                                    onChange={e => setLocalContent(e.target.value)} 
                                    placeholder="اكتب هنا محتوى الرسالة الرئيسي الذي ترغب في إيصاله فقط..." 
                                    className="w-full p-3 h-40 bg-white dark:bg-gray-800 focus:outline-none text-sm font-sans resize-none placeholder-gray-400"
                                />

                                {/* Footer Preview Box */}
                                <div className="bg-amber-50/50 dark:bg-amber-950/10 text-slate-600 dark:text-slate-400 text-[11px] px-3 py-2.5 border-t border-gray-200 dark:border-gray-700 font-sans leading-relaxed select-none">
                                    <span className="font-bold text-amber-700 dark:text-amber-500">✨ خاتمة الرسالة التلقائية (يضيفها النظام):</span>
                                    <div className="mt-1 font-sans opacity-75">
                                        إدارة [اسم المركز/الحلقة]
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                 </Section>

                <Section title={`المستهدفون (${localTargetStudentIds.length})`} rightContent={
                    <button onClick={() => setIsStudentSelectorOpen(p => !p)} className="text-sm text-primary dark:text-accent font-bold bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                        {isStudentSelectorOpen ? 'إخفاء' : 'تعديل القائمة'}
                    </button>
                }>
                    <AnimatePresence>
                        {isStudentSelectorOpen && <motion.div initial={{height:0, opacity:0}} animate={{height:'auto', opacity:1}} exit={{height:0, opacity:0}} className="space-y-2 overflow-hidden mt-2">
                            <StudentGroupSelector 
                                students={students}
                                selectedIds={localTargetStudentIds}
                                onSelectionChange={(ids) => setLocalTargetStudentIds(ids)}
                                circleId={circleId}
                                contextKey="announcement"
                            />
                            <div className="relative mb-2">
                                <input
                                    type="text"
                                    placeholder="بحث عن طالب..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full p-2 pr-8 text-sm border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600"
                                />
                                <FaSearch className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
                            </div>
                            <div className="max-h-48 overflow-y-auto pr-1 space-y-1">
                                <label className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors">
                                    <input type="checkbox" checked={localTargetStudentIds.length === students.length && students.length > 0} onChange={handleSelectAllStudents} className="w-4 h-4 accent-primary" />
                                    <FaUsers className="text-blue-500" />
                                    <span className="font-bold text-blue-700 dark:text-blue-300">تحديد الجميع</span>
                                </label>
                                {filteredStudentsForSelection.map(s => <label key={s.id} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                    <input type="checkbox" checked={localTargetStudentIds.includes(s.id)} onChange={() => handleStudentSelection(s.id)} className="w-4 h-4 accent-primary" />
                                    <StudentAvatar {...s} className="w-6 h-6 rounded-full object-cover" />
                                    <span>{s.name}</span>
                                </label>)}
                            </div>
                        </motion.div>}
                    </AnimatePresence>
                </Section>
                 <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 p-2 bg-gray-100 dark:bg-gray-700/50 rounded-lg">
                    <FaInfoCircle/>
                    <span>
                        في حال الخروج قبل الحفظ، ستبقى البيانات كمسودة مؤقتة فقط إذا كانت تحتوي على بيانات.
                    </span>
                </div>
            </main>
        </motion.div>
    );
};

export default AnnouncementForm;

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes, FaFilePdf, FaCheckSquare, FaSquare, FaPrint, FaIdBadge, FaEye, FaDownload, FaCalendarAlt, FaSpinner } from 'react-icons/fa';
import { Student, CircleData } from '../types';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { formatStudentId } from '../utils/helpers';
import StudentGroupSelector from './StudentGroupSelector';

interface SmartRecitationFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    circleData: CircleData;
    addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const SmartRecitationFormModal: React.FC<SmartRecitationFormModalProps> = ({ isOpen, onClose, circleData, addToast }) => {
    const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>(
        circleData.students.filter(s => !s.isArchived).map(s => s.id)
    );
    const [viewMode, setViewMode] = useState<'select' | 'preview'>('select');
    const [isGenerating, setIsGenerating] = useState(false);
    const pagesRef = useRef<HTMLDivElement>(null);

    const toggleStudent = (id: number) => {
        setSelectedStudentIds(prev =>
            prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
        );
    };

    const toggleAll = () => {
        if (selectedStudentIds.length === circleData.students.filter(s => !s.isArchived).length) {
            setSelectedStudentIds([]);
        } else {
            setSelectedStudentIds(circleData.students.filter(s => !s.isArchived).map(s => s.id));
        }
    };

    const handleGroupSelection = (ids: number[]) => {
        setSelectedStudentIds(ids);
    };

    const sortedSelectedStudents = circleData.students
        .filter(s => selectedStudentIds.includes(s.id))
        .sort((a, b) => a.order - b.order);

    const studentsPerPage = 30;
    const studentChunks = [];
    for (let i = 0; i < sortedSelectedStudents.length; i += studentsPerPage) {
        studentChunks.push(sortedSelectedStudents.slice(i, i + studentsPerPage));
    }
    // If no students selected, show one empty chunk for preview structure
    if (studentChunks.length === 0) studentChunks.push([]);

    const generatePdf = async () => {
        if (!pagesRef.current) return;
        
        try {
            setIsGenerating(true);
            addToast('جاري تجهيز ملف PDF متعدد الصفحات...', 'info');

            const pageElements = pagesRef.current.querySelectorAll('.preview-page');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();

            for (let i = 0; i < pageElements.length; i++) {
                if (i > 0) pdf.addPage();
                
                const canvas = await html2canvas(pageElements[i] as HTMLElement, {
                    scale: 2.5, // High but optimized resolution
                    useCORS: true,
                    logging: false,
                    backgroundColor: '#ffffff',
                    windowWidth: 1200
                });

                const imgData = canvas.toDataURL('image/jpeg', 0.9);
                pdf.addImage(imgData, 'JPEG', 0, 0, pageWidth, pageHeight);
            }
            
            pdf.save(`كشف_تسميع_${circleData.circle}.pdf`);
            addToast('تم تحميل كشف التسميع بنجاح', 'success');
        } catch (error) {
            console.error('PDF Generation Error:', error);
            addToast('حدث خطأ أثناء توليد الملف', 'error');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-2 sm:p-4 font-sans" dir="rtl">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-md"
                    />
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        className={`bg-gray-100 dark:bg-gray-900 rounded-[2rem] w-full overflow-hidden relative z-10 shadow-2xl flex flex-col transition-all duration-500 ${viewMode === 'preview' ? 'max-w-5xl h-[95vh]' : 'max-w-md max-h-[90vh]'}`}
                    >
                        {/* Header Bar */}
                        <div className="p-4 border-b dark:border-gray-800 flex justify-between items-center bg-white dark:bg-gray-800 sticky top-0 z-20">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/10 rounded-xl text-primary">
                                    <FaFilePdf size={18} />
                                </div>
                                <h3 className="font-bold text-gray-800 dark:text-white">
                                    {viewMode === 'select' ? 'كشف التسميع للمساعد' : `معاينة المستند (${studentChunks.length} صفحة)`}
                                </h3>
                            </div>
                            <div className="flex items-center gap-2">
                                {viewMode === 'preview' && (
                                    <button 
                                        onClick={() => setViewMode('select')}
                                        className="text-xs font-bold text-primary px-3 py-1.5 rounded-lg hover:bg-primary/5 transition-colors"
                                    >
                                        تعديل القائمة
                                    </button>
                                )}
                                <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                                    <FaTimes />
                                </button>
                            </div>
                        </div>

                        {/* Content Area */}
                        <div className="p-4 flex-grow overflow-y-auto custom-scrollbar bg-gray-50 dark:bg-gray-900/50">
                            {viewMode === 'select' ? (
                                <div className="max-w-sm mx-auto">
                                    <div className="mb-4 p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl text-emerald-800 text-xs leading-relaxed flex gap-3 shadow-sm">
                                        <div className="shrink-0 mt-0.5">✨</div>
                                        <p>سيتم توليد كشف يحتوي على الأسماء المختارة مع معرفات (ID) مختصرة لتسهيل الفحص واستكمال التقرير يدوياً.</p>
                                    </div>

                                    {/* Student Group Selector */}
                                    <div className="p-4 bg-white dark:bg-gray-800 rounded-2xl shadow-sm mb-6">
                                        <h4 className="text-[10px] font-bold text-gray-400 mb-2 uppercase px-1">تنسيق الاختيار الذكي</h4>
                                        <StudentGroupSelector 
                                            students={circleData.students.filter(s => !s.isArchived)}
                                            selectedIds={selectedStudentIds}
                                            onSelectionChange={handleGroupSelection}
                                            circleId={circleData.id}
                                            contextKey="smart_form"
                                        />
                                    </div>

                                    <div className="flex justify-between items-center mb-3 px-1">
                                        <h4 className="text-sm font-bold opacity-60">تحديد الطلاب ({selectedStudentIds.length})</h4>
                                        <button
                                            onClick={toggleAll}
                                            className="text-xs text-primary font-bold px-3 py-1 bg-white border border-primary/20 rounded-lg shadow-sm hover:bg-primary hover:text-white transition-all"
                                        >
                                            {selectedStudentIds.length === circleData.students.filter(s => !s.isArchived).length ? 'إلغاء الجميع' : 'تحديد الجميع'}
                                        </button>
                                    </div>

                                    <div className="grid gap-2 mb-6">
                                        {circleData.students
                                            .filter(s => !s.isArchived)
                                            .sort((a, b) => a.order - b.order)
                                            .map(student => (
                                                <button
                                                    key={student.id}
                                                    onClick={() => toggleStudent(student.id)}
                                                    className={`group w-full flex items-center justify-between p-3.5 rounded-2xl border transition-all duration-300 ${selectedStudentIds.includes(student.id) ? 'bg-white border-primary shadow-md translate-x-1' : 'bg-white/50 border-gray-100 text-gray-400 opacity-60'}`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-12 h-9 rounded-xl flex items-center justify-center text-[10px] font-mono font-bold transition-colors ${selectedStudentIds.includes(student.id) ? 'bg-primary text-white' : 'bg-gray-100 text-gray-400'}`}>
                                                            {formatStudentId(student.id)}
                                                        </div>
                                                        <span className={`font-bold transition-colors ${selectedStudentIds.includes(student.id) ? 'text-gray-900' : ''}`}>{student.name}</span>
                                                    </div>
                                                    <div className={`transition-transform duration-300 ${selectedStudentIds.includes(student.id) ? 'scale-110' : 'scale-90 opacity-30'}`}>
                                                        {selectedStudentIds.includes(student.id) ? <FaCheckSquare className="text-primary" size={20} /> : <FaSquare size={20} />}
                                                    </div>
                                                </button>
                                            ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-8 py-8" ref={pagesRef}>
                                    {studentChunks.map((chunk, pageIndex) => (
                                        <div 
                                            key={pageIndex}
                                            className="preview-page bg-white text-black shadow-2xl relative flex flex-col pointer-events-none origin-top print:shadow-none mb-4"
                                            style={{ 
                                                width: '210mm', 
                                                height: '297mm', 
                                                padding: '12mm 15mm',
                                                fontFamily: '"Tajawal", sans-serif'
                                            }}
                                            dir="rtl"
                                        >
                                            {/* Final Professional Minimalist Header */}
                                            <div className="flex justify-between items-center mb-6 px-2">
                                                {/* Right: Center Info with layered background */}
                                                <div className="relative flex flex-col justify-center min-w-[50mm]">
                                                    <div className="absolute inset-0 bg-emerald-50/60 rounded-xl -rotate-1 z-0"></div>
                                                    <div className="relative z-10 pr-2">
                                                        <h2 className="font-black text-[18px] text-gray-900 leading-tight">مركز النور القرآني</h2>
                                                        <p className="text-[9px] font-bold text-emerald-700/80 mt-0.5 uppercase tracking-normal">{circleData.circle}</p>
                                                    </div>
                                                </div>
                                                
                                                {/* Center: System Branding */}
                                                <div className="text-center">
                                                    <h1 className="text-2xl font-black text-gray-800 leading-none" dir="rtl" style={{ letterSpacing: '0' }}>
                                                        <span>كشف التسميع للمساعد</span>
                                                    </h1>
                                                    <p className="text-[10px] text-gray-500 font-bold mt-2 opacity-90">نظام حلقتي لإدارة الحلقات القرآنية</p>
                                                </div>

                                                {/* Left: Date Field */}
                                                <div className="text-left min-w-[50mm] flex justify-end">
                                                    <div className="border-[1.5px] border-gray-200 px-4 py-2 rounded-xl bg-gray-50/30 flex items-center gap-3">
                                                        <FaCalendarAlt className="text-emerald-600/40" size={12} />
                                                        <div className="text-right">
                                                            <p className="text-[7px] font-black text-gray-400 mb-0.5">تاريخ الجلسة</p>
                                                            <p className="text-[11px] font-mono font-bold text-gray-600">.... / .... / 2026</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Table Data */}
                                            <div className="flex-grow">
                                                <table className="w-full border-collapse border-[1.5px] border-gray-900 text-right table-fixed">
                                                    <thead>
                                                        <tr className="bg-gray-100 text-[9px] font-black h-8">
                                                            <th className="border border-gray-900 w-[4%] text-center">م</th>
                                                            <th className="border border-gray-900 w-[11%] text-center">ID</th>
                                                            <th className="border border-gray-900 w-[21%] px-2">اسم الطالب</th>
                                                            <th className="border border-gray-900 w-[22%] px-2">الحفظ</th>
                                                            <th className="border border-gray-900 w-[22%] px-2">المراجعة</th>
                                                            <th className="border border-gray-900 w-[6%] text-center">حضور</th>
                                                            <th className="border border-gray-900 px-2 text-[8px]">ملاحظات ومتابعة</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {chunk.map((s, i) => (
                                                            <tr key={s.id} className="h-[7.8mm] text-[10px]">
                                                                <td className="border border-gray-900 text-center font-bold text-[9px] bg-gray-50/50">
                                                                    {pageIndex * studentsPerPage + i + 1}
                                                                </td>
                                                                <td className="border border-gray-900 text-center font-mono text-[9px] text-gray-600 font-bold bg-gray-50/30">
                                                                    {formatStudentId(s.id)}
                                                                </td>
                                                                <td className="border border-gray-900 px-2 font-black text-[10.5px]" dir="rtl" style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                                                    {s.name}
                                                                </td>
                                                                <td className="border border-gray-900 relative">
                                                                    <div className="absolute top-1.5 left-1.5 w-4.5 h-4.5 border border-black/10 rounded-sm bg-gray-50/80"></div>
                                                                </td>
                                                                <td className="border border-gray-900 relative">
                                                                    <div className="absolute top-1.5 left-1.5 w-4.5 h-4.5 border border-black/10 rounded-sm bg-gray-50/80"></div>
                                                                </td>
                                                                <td className="border border-gray-900"></td>
                                                                <td className="border border-gray-900"></td>
                                                            </tr>
                                                        ))}
                                                        {/* Fillers for empty rows to reach exactly 30 rows per page */}
                                                        {Array.from({ length: Math.max(0, studentsPerPage - chunk.length) }).map((_, i) => (
                                                            <tr key={`filler-${i}`} className="h-[7.8mm]">
                                                                <td className="border border-gray-900 text-center text-[9px] text-gray-300 bg-gray-50/50">
                                                                    {pageIndex * studentsPerPage + chunk.length + i + 1}
                                                                </td>
                                                                <td className="border border-gray-900 bg-gray-50/10"></td>
                                                                <td className="border border-gray-900 px-2 font-bold text-gray-200 text-[10px]">................................</td>
                                                                <td className="border border-gray-900 relative">
                                                                    <div className="absolute top-1.5 left-1.5 w-4.5 h-4.5 border border-black/10 rounded-sm"></div>
                                                                </td>
                                                                <td className="border border-gray-900 relative">
                                                                    <div className="absolute top-1.5 left-1.5 w-4.5 h-4.5 border border-black/10 rounded-sm"></div>
                                                                </td>
                                                                <td className="border border-gray-900"></td>
                                                                <td className="border border-gray-900"></td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>

                                            {/* Signing Footer - Minimalist */}
                                            <div className="mt-4 flex justify-between px-8 pt-4 border-t border-gray-100">
                                                <div className="text-center w-36">
                                                    <p className="font-black text-[10px] text-gray-700 mb-6">توقيع المشرف</p>
                                                    <div className="border-b border-gray-200"></div>
                                                </div>
                                                
                                                <div className="flex flex-col items-center justify-end text-gray-400 font-bold text-[8px] pb-1">
                                                    <span className="bg-gray-50 px-2 py-0.5 rounded border border-gray-100">صفحة {pageIndex + 1} من {studentChunks.length}</span>
                                                </div>

                                                <div className="text-center w-36">
                                                    <p className="font-black text-[10px] text-gray-700 mb-6">توقيع المعلم</p>
                                                    <div className="border-b border-gray-200"></div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Control Buttons */}
                        <div className="p-5 border-t dark:border-gray-800 bg-white dark:bg-gray-800 flex gap-4">
                            {viewMode === 'select' ? (
                                <button
                                    onClick={() => {
                                        if (selectedStudentIds.length === 0) {
                                            addToast('يرجى اختيار طالب واحد على الأقل', 'error');
                                            return;
                                        }
                                        setViewMode('preview');
                                    }}
                                    className="flex-grow bg-primary text-white p-4 rounded-2xl font-black flex items-center justify-center gap-3 shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all outline-none"
                                >
                                    <FaEye size={20} />
                                    <span>معاينة المستند ({studentChunks.length} صفحة)</span>
                                </button>
                            ) : (
                                <>
                                    <button
                                        onClick={generatePdf}
                                        disabled={isGenerating}
                                        className="flex-grow bg-emerald-600 disabled:bg-gray-300 text-white p-4 rounded-2xl font-black flex items-center justify-center gap-3 shadow-xl shadow-emerald-500/20 hover:scale-[1.02] active:scale-95 transition-all outline-none"
                                    >
                                        {isGenerating ? <FaSpinner className="animate-spin" size={20} /> : <FaDownload size={20} />}
                                        <span>{isGenerating ? 'جاري التحميل...' : 'تحميل PDF للملف بالكامل'}</span>
                                    </button>
                                    <button
                                        onClick={() => window.print()}
                                        className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-6 rounded-2xl font-bold flex items-center justify-center border-2 border-gray-100 dark:border-gray-700 hover:bg-gray-200 transition-all opacity-50"
                                        title="الطباعة المباشرة من المتصفح قد لا تكون مطابقة تماماً للمعاينة، يفضل تحميل الـ PDF"
                                    >
                                        <FaPrint size={20} />
                                    </button>
                                </>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default SmartRecitationFormModal;

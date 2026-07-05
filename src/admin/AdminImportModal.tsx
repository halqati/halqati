
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaUpload, FaTimes, FaCheckCircle, FaExclamationTriangle, FaInfoCircle, FaFileImport } from 'react-icons/fa';

interface AdminImportModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const AdminImportModal: React.FC<AdminImportModalProps> = ({ isOpen, onClose }) => {
    const [file, setFile] = useState<File | null>(null);
    const [importing, setImporting] = useState(false);
    const [result, setResult] = useState<{ success: boolean; message: string; details?: any } | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setResult(null);
        }
    };

    const [circlesToImport, setCirclesToImport] = useState<any[]>([]);

    const processBackup = async () => {
        if (!file) return;

        setImporting(true);
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            
            let studentRegistry: any = {};
            let circlesRegistry: any = {};

            // 1. Parse Circles and Students from "Remembrances"
            if (data.Remembrances) {
                // Parse Circles (hlkat)
                if (data.Remembrances.hlkat) {
                    try {
                        const hlkatArray = JSON.parse(data.Remembrances.hlkat);
                        hlkatArray.forEach((h: any) => {
                            const circleId = h.kye || h.id;
                            if (circleId) {
                                circlesRegistry[circleId] = {
                                    id: circleId,
                                    name: h.name || h.circleName || `حلقة ${circleId}`,
                                    teacher: h.teacher || h.teacherName || 'معلم غير معروف',
                                    timing: h.timings || h.timing || 'غير محدد'
                                };
                            }
                        });
                    } catch (e) { console.error("Error parsing hlkat", e); }
                }

                // Parse Students from each circle key in Remembrances
                Object.keys(circlesRegistry).forEach(circleId => {
                    if (data.Remembrances[circleId]) {
                        try {
                            const studentsInCircle = JSON.parse(data.Remembrances[circleId]);
                            if (Array.isArray(studentsInCircle)) {
                                studentsInCircle.forEach((s: any) => {
                                    const studentId = s.kye || s.id || Math.random().toString(36).substring(7);
                                    const registryKey = `${circleId}_${studentId}`;
                                    studentRegistry[registryKey] = {
                                        id: studentId,
                                        name: s.name || s.studentName || s.student_name || s.fullName || s.full_name || s.kye || 'طالب بدون اسم',
                                        phone: s.whatsapp || s.whatsapp_number || s.whatsappNumber || s.phone || s.parentPhone || s.mobile || '',
                                        gender: (s.gns === 'ذكر' || s.gender === 'male' || s.gender === 'ذكر') ? 'male' : 'female',
                                        circleId: circleId
                                    };
                                });
                            }
                        } catch (e) { console.error(`Error parsing students for circle ${circleId}`, e); }
                    }
                });
            }

            // 2. Skip "tasmia" records as requested
            const records: any = {};
            
            // Prepare circles for UI editing
            const detectedCircles = Object.values(circlesRegistry).map((c: any) => ({
                ...c,
                studentCount: Object.values(studentRegistry).filter((s: any) => s.circleId === c.id).length
            }));

            // If no circles found in hlkat but students exist, create a default circle
            if (detectedCircles.length === 0 && Object.keys(studentRegistry).length > 0) {
                detectedCircles.push({
                    id: 'imported_default',
                    name: 'حلقة مستوردة',
                    teacher: 'معلم مستورد',
                    timing: 'غير محدد',
                    studentCount: Object.keys(studentRegistry).length
                });
                // Update student circleIds
                Object.values(studentRegistry).forEach((s: any) => s.circleId = 'imported_default');
            }

            setCirclesToImport(detectedCircles);
            const sampleNames = Object.values(studentRegistry).slice(0, 5).map((s: any) => s.name);

            setResult({
                success: true,
                message: 'تم تحليل الملف بنجاح واستخراج الحلقات والطلاب',
                details: {
                    studentsCount: Object.keys(studentRegistry).length,
                    usersFound: Object.keys(studentRegistry).length > 0,
                    userCount: Object.keys(studentRegistry).length,
                    circlesCount: detectedCircles.length,
                    sampleNames,
                    raw: { studentRegistry, circlesRegistry, records: {} }
                }
            });
        } catch (error) {
            console.error('Import error:', error);
            setResult({
                success: false,
                message: 'فشل في تحليل الملف. تأكد من أنه ملف JSON صحيح.'
            });
        } finally {
            setImporting(false);
        }
    };

    const handleCircleNameChange = (id: string, newName: string) => {
        setCirclesToImport(prev => prev.map(c => c.id === id ? { ...c, name: newName } : c));
    };

    const finalizeImport = () => {
        if (!result || !result.details.raw) return;
        
        // Process final data with edited circle names
        const finalCircles = circlesToImport.map(c => ({
            id: c.id,
            name: c.name,
            teacher: c.teacher,
            timing: c.timing
        }));

        // In a real app, we would pass this to a prop function
        // For this demo, we'll use a custom event or just alert
        const event = new CustomEvent('app:importData', { 
            detail: { 
                circles: finalCircles, 
                students: Object.values(result.details.raw.studentRegistry),
                records: result.details.raw.records
            } 
        });
        window.dispatchEvent(event);
        
        alert(`تم بنجاح استيراد بيانات "السراج":\n- ${finalCircles.length} حلقات\n- ${result.details.studentsCount} طلاب\n\nتمت إضافة البيانات إلى تطبيقك.`);
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden"
                    >
                        <div className="p-6 border-b dark:border-gray-800 flex items-center justify-between bg-primary/5">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                                    <FaFileImport />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-800 dark:text-white">استيراد من "السراج" (النسخة القديمة)</h3>
                                    <p className="text-xs text-gray-500">استعادة الحلقات والطلاب والبيانات الأساسية</p>
                                </div>
                            </div>
                            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-2">
                                <FaTimes />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {!result ? (
                                <>
                                    <div className="space-y-4">
                                        <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl flex gap-3 border border-amber-100 dark:border-amber-900/30">
                                            <FaInfoCircle className="text-amber-600 flex-shrink-0 mt-1" />
                                            <div className="space-y-2">
                                                <p className="text-xs font-bold text-amber-800 dark:text-amber-200">تعليمات الاستيراد من النسخة القديمة:</p>
                                                <ol className="text-[10px] text-amber-700 dark:text-amber-300 list-decimal list-inside space-y-1">
                                                    <li>افتح التطبيق القديم واذهب إلى <b>الإعدادات</b>.</li>
                                                    <li>اضغط على <b>"إنشاء نسخة احتياطية"</b> واحفظ الملف.</li>
                                                    <li>قم برفع الملف هنا لاستعادة بياناتك.</li>
                                                </ol>
                                            </div>
                                        </div>

                                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl flex gap-3 border border-blue-100 dark:border-blue-900/30">
                                            <FaCheckCircle className="text-blue-500 flex-shrink-0 mt-1" />
                                            <div className="space-y-1">
                                                <p className="text-xs font-bold text-blue-800 dark:text-blue-200">ما الذي سيتم استيراده؟</p>
                                                <ul className="text-[10px] text-blue-700 dark:text-blue-300 list-disc list-inside">
                                                    <li>أسماء الحلقات والمعلمين.</li>
                                                    <li>أسماء الطلاب وجنسهم (ذكر/أنثى).</li>
                                                    <li>رقم واتساب ولي الأمر (إن وجد).</li>
                                                    <li>سجلات التسميع والمراجعة والتقييمات.</li>
                                                </ul>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl p-8 text-center hover:border-primary/50 transition-colors cursor-pointer relative">
                                        <input 
                                            type="file" 
                                            accept=".json"
                                            onChange={handleFileChange}
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                        />
                                        <FaUpload className="mx-auto text-4xl text-gray-300 mb-4" />
                                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                            {file ? file.name : 'اسحب الملف هنا أو اضغط للاختيار'}
                                        </p>
                                        <p className="text-[10px] text-gray-400 mt-2">يدعم ملفات JSON فقط</p>
                                    </div>

                                    <button
                                        disabled={!file || importing}
                                        onClick={processBackup}
                                        className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                                            !file || importing 
                                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                                            : 'bg-primary text-white shadow-lg shadow-primary/20 hover:scale-[1.02]'
                                        }`}
                                    >
                                        {importing ? (
                                            <>
                                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                جاري التحليل...
                                            </>
                                        ) : (
                                            <>بدء التحليل</>
                                        )}
                                    </button>
                                </>
                            ) : (
                                <div className="text-center space-y-4">
                                    {result.success ? (
                                        <>
                                            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl border border-green-100 dark:border-green-900/30 text-right">
                                                <div className="flex items-center gap-2 mb-4">
                                                    <FaCheckCircle className="text-green-500" />
                                                    <h4 className="font-bold text-green-800 dark:text-green-200">تم اكتشاف البيانات التالية:</h4>
                                                </div>
                                                
                                                <div className="space-y-4">
                                                    <div>
                                                        <p className="text-xs font-bold text-gray-600 dark:text-gray-400 mb-2">الحلقات المكتشفة (يمكنك تعديل الأسماء):</p>
                                                        <div className="space-y-2">
                                                            {circlesToImport.map((circle) => (
                                                                <div key={circle.id} className="flex items-center gap-2 bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-100 dark:border-gray-700">
                                                                    <input 
                                                                        type="text" 
                                                                        value={circle.name}
                                                                        onChange={(e) => handleCircleNameChange(circle.id, e.target.value)}
                                                                        className="flex-grow text-sm bg-transparent outline-none focus:ring-1 focus:ring-primary rounded px-1 text-right"
                                                                    />
                                                                    <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full whitespace-nowrap">
                                                                        {circle.studentCount} طالب
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-1 gap-4 text-center">
                                                        <div className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
                                                            <p className="text-lg font-bold text-primary">{result.details.studentsCount}</p>
                                                            <p className="text-[10px] text-gray-500">إجمالي الطلاب</p>
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <p className="text-[10px] text-gray-500 mb-1">عينة من الأسماء:</p>
                                                        <div className="flex flex-wrap gap-1 justify-end">
                                                            {result.details.sampleNames.map((name: string, i: number) => (
                                                                <span key={i} className="text-[9px] bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-gray-600 dark:text-gray-400">
                                                                    {name}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={finalizeImport}
                                                className="w-full py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all"
                                            >
                                                تأكيد الاستيراد النهائي
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto text-3xl">
                                                <FaExclamationTriangle />
                                            </div>
                                            <h4 className="text-lg font-bold text-gray-800 dark:text-white">خطأ في الاستيراد</h4>
                                            <p className="text-sm text-gray-500">{result.message}</p>
                                            <button
                                                onClick={() => setResult(null)}
                                                className="w-full py-3 bg-gray-100 text-gray-600 rounded-xl font-bold"
                                            >
                                                حاول مرة أخرى
                                            </button>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default AdminImportModal;

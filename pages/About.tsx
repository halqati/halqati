import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    FaArrowLeft, FaHeart, FaBookOpen, FaUsers, FaCalendarAlt, FaBook, 
    FaChartBar, FaCog, FaPalette, FaTrophy, FaIdCard, FaShareAlt, 
    FaRocket, FaLock, FaSave, FaSearch, FaStar, FaPeopleArrows, FaBell,
    FaCloudDownloadAlt, FaShieldAlt, FaQuestionCircle, FaCheckCircle,
    FaBuilding, FaUserTie, FaUserGraduate, FaClipboardCheck, FaBullhorn,
    FaArchive, FaTimes, FaLayerGroup, FaHistory, FaGift, FaSync, FaInfoCircle
} from 'react-icons/fa';

interface DocumentationSection {
    id: string;
    title: string;
    category: string;
    icon: React.ElementType;
    overview: string;
    benefit: string;
    howItWorks: string;
    whenToUse: string;
    howToUse: string[];
}

const documentationData: DocumentationSection[] = [
    {
        id: 'overview',
        title: 'نبذة عن النظام والأهداف والفئة المستهدفة',
        category: 'أساسيات النظام',
        icon: FaHeart,
        overview: 'نظام إلكتروني متكامل وخفيف مصمم لخدمة حلقات وتحفيظ القرآن الكريم والمراكز القرآنية، يوفر تجربة رقمية فائقة السرعة للمدرسين والمشرفين والإداريين.',
        benefit: 'توفير الوقت والجهد في المتابعة اليدوية، وحفظ بيانات الطلاب وسجلات التسميع بأعلى درجات الدقة والسرعة.',
        howItWorks: 'يعمل النظام عبر واجهة رقمية سلسة تعتمد على معالجة البيانات محلياً مع المزامنة التلقائية عند الاتصال بالإنترنت.',
        whenToUse: 'تُستخدم في الإدارة اليومية للحلقة القرآنية، وتسجيل الحضور والتسميع، واستخراج التقارير.',
        howToUse: [
            'افتتاح التطبيق واختيار أو إنشاء حلقة قرءانية جديدة.',
            'إضافة الطلاب وضبط إعدادات التسميع والنقاط.',
            'البدء في تسجيل الجلسات يومياً واطلاع أولياء الأمور والمشرفين.'
        ]
    },
    {
        id: 'offline_sync',
        title: 'نظام العمل دون اتصال والمزامنة التلقائية',
        category: 'أساسيات النظام',
        icon: FaSync,
        overview: 'تقنية حفظ محلية متطورة تتيح استخدام النظام بالكامل دون الحاجة لاتصال بالإنترنت مع إجراء مزامنة فورية عند توفر الشبكة.',
        benefit: 'ضمان استمرارية العمل حتى في المناطق ذات الاتصال الضعيف أو المعدوم بالإنترنت دون فقدان أي بيانات.',
        howItWorks: 'تُخزن البيانات في قواعد بيانات متصفح الجهاز المحلية (IndexedDB / LocalStorage) وتُزامن تلقائياً مع السحابة فور إعادة الاتصال.',
        whenToUse: 'تعمل التكنولوجيا بشكل تلقائي ومستمر في خلفية النظام دون أي تدخل من المستخدم.',
        howToUse: [
            'استخدم التطبيق بشكل طبيعي حتى لو انقطع الإنترنت.',
            'سيظهر شريط مؤشر حالة المزامنة أعلى الشاشة لبيان حالة الحفظ.',
            'فور الاتصال بالإنترنت، تتم المزامنة تلقائياً وسريعاً.'
        ]
    },
    {
        id: 'centers_circles',
        title: 'إدارة المراكز والحلقات القرآنية',
        category: 'الهيكلة والإدارة',
        icon: FaBuilding,
        overview: 'هيكلة منظمة تمكن من الربط بين المركز القرآني والحلقات التابعة له والتنقل السلس بين الحلقات.',
        benefit: 'إمكانية توحيد المتابعة والإشراف على عدة حلقات قرآنية تحت مظلة مركز واحد أو إدارة مستقلة لكل حلقة.',
        howItWorks: 'يتم إنشاء المركز وتحديد مسميات الحلقات والمشرفين المسندين إليها، مع منح كل حلقة إعداداتها الخاصة.',
        whenToUse: 'تُستخدم عند إشراف المعلم على أكثر من حلقة، أو عند قيام مدير المركز بمتابعة كادر المعلمين.',
        howToUse: [
            'من صفحة الإعدادات اختر "إدارة الحلقات".',
            'اضغط على "+ إنشاء حلقة جديدة" وأدخل الاسم والتفاصيل.',
            'للتنقل بين الحلقات استخدم القائمة المنسدلة أعلى الصفحة الرئيسية.'
        ]
    },
    {
        id: 'supervisors_teachers_permissions',
        title: 'إدارة المعلمين والمشرفين والصلاحيات',
        category: 'الهيكلة والإدارة',
        icon: FaUserTie,
        overview: 'نظام صلاحيات مرن يوزع الأدوار بين معلم الحلقة، والمشرف المباشر، ومدير المركز.',
        benefit: 'حماية البيانات وحصر إمكانات التعديل والحذف على الأشخاص المورثين لهذه الصلاحيات فقط.',
        howItWorks: 'يحدد المشرف أو معلم الحلقة نمط الصلاحيات، حيث يمكن تحديد وضع القراءة فقط، أو الإدارة الكاملة، أو تحفيز أدوار خاصة.',
        whenToUse: 'عند إضافة معلمين مساعدين، أو إسناد حلقة لمشرف متابعة.',
        howToUse: [
            'افتح قسم الإعدادات ثم اختر "إدارة الصلاحيات".',
            'حدد دور المستخدم (معلم، مشرف، مدير مركز).',
            'منح أو سحب صلاحيات التعديل والحذف وتوليد التقارير حسب الحاجة.'
        ]
    },
    {
        id: 'students_management',
        title: 'إدارة الطلاب ونقلهم وتوقيفهم',
        category: 'شؤون الطلاب',
        icon: FaUserGraduate,
        overview: 'وحدة شاملة لإضافة بيانات الطلاب، ترتيبهم بالسحب والإفلات، وتثبيت حالاتهم (نشط، موقوف، منقول).',
        benefit: 'التنظيم الكامل لكشف الحفظ وتحديث قوائم الطلاب دون الحاجة لإعادة إدخال سجلاتهم السابقة.',
        howItWorks: 'تُحفظ بيانات الطالب مع أرقام التواصل وسجل الحضور والنقاط، ويمكن توقيف الطالب مؤقتاً أو نقله لحلقة أخرى مع كامل تاريخه.',
        whenToUse: 'عند تسجيل طالب جديد، أو انقطاع طالب مؤقتاً، أو انتقاله إلى حلقة قرآنية أخرى.',
        howToUse: [
            'من الصفحة الرئيسية اضغط على "+ إضافة طالب".',
            'لتعديل حالة الطالب أو ترتيبه استخدم أيقونات التحكم المجاورة لاسم الطالب.',
            'لنقل طالب اختر زر "نقل الطالب" وحدد الحلقة المستهدفة.'
        ]
    },
    {
        id: 'student_card',
        title: 'بطاقة الطالب الذكية وسجل النقاط',
        category: 'شؤون الطلاب',
        icon: FaIdCard,
        overview: 'ملف شخصي تفاعلي لكل طالب يحتوي على إحصائيات الدقة، شارات التميز، وسجل نقاط التفوق.',
        benefit: 'متابعة أداء الطالب الفردي بدقة عالية وتحفيزه من خلال إظهار نقاطه ورسمه البياني.',
        howItWorks: 'تُحتسب النقاط والنسب تلقائياً بناءً على تقييمات الجلسات اليومية، ويتاح للمعلم إضافة نقاط تشجيعية أو خصم نقاط مع ذكر السبب.',
        whenToUse: 'عند تقييم الطالب، أو مراجعة وليه لأدائه، أو توزيع الجوائز.',
        howToUse: [
            'اضغط على صورة الطالب أو اسمه في الكشف اليومي.',
            'ستفتح البطاقة الذكية وتظهر كافة التفاصيل والرسوم البيانية.',
            'استخدم قسم "تعديل النقاط" لإضافة أو خصم نقاط يدويًا.'
        ]
    },
    {
        id: 'sessions_recording',
        title: 'تسجيل الجلسات اليومية ومسودات الجلسة',
        category: 'التسميع والمتابعة',
        icon: FaCalendarAlt,
        overview: 'محرك تسجيل التسميع اليومي (حفظ، مراجعة صغرى، مراجعة كبرى، حضور) مع خاصية الحفظ كمسودة.',
        benefit: 'سرعة التسجيل الفائقة لكل طالب بحركات لفقية بسيطة وعدم ضياع البيانات أثناء انقطاع التسميع.',
        howItWorks: 'يقوم المعلم بفتح جلسة جديدة، اختيار الطلاب المتواجدين، وتحديد أوجه وسور الحفظ والمراجعة مع تقييم الدرجة.',
        whenToUse: 'تُستخدم في كل حلقة قرآنية يومية.',
        howToUse: [
            'اضغط على "تسجيل جلسة جديدة" في الصفحة الرئيسية.',
            'حدد حالة الحضور والتسميع لكل طالب.',
            'في حال الخروج قبل الاعتماد تُحفظ الجلسة تلقائياً كمسودة لاستكمالها لاحقاً.'
        ]
    },
    {
        id: 'uthmani_quran',
        title: 'المصحف الشريف العثماني التفاعلي',
        category: 'التسميع والمتابعة',
        icon: FaBookOpen,
        overview: 'مصحف الكتروني نصوصه بالخط العثماني المطابق للمصحف الشريف المطبوع مع تحديد الآيات والبحث.',
        benefit: 'تسهيل متابعة المعلم لتلاوة الطالب وتحديد مواضع الحفظ والمراجعة مباشرة من المصحف.',
        howItWorks: 'يعرض النصوص القرءانية بالخط العثماني الحقيقي مفصلة آية بآية مع تصفح السور والأجزاء والصفحات.',
        whenToUse: 'أثناء التسميع المباشر للطالب أو عند البحث عن آية معينة.',
        howToUse: [
            'ادخل إلى قسم "المصحف الشريف" من قائمة الخدمات.',
            'اختر السورة أو الجزء أو الصفحة المراد قراءتها.',
            'يمكنك تحديد الآية لنسخها أو تحديد بداية ونهاية الحفظ.'
        ]
    },
    {
        id: 'parent_followup',
        title: 'المتابعة اليومية ومتابعة أولياء الأمور',
        category: 'التواصل والتقارير',
        icon: FaShareAlt,
        overview: 'نظام إشعار تفاعلي يتيح إرسال تقارير الأداء اليومي والفردي لأولياء الأمور عبر الرسائل أو الواتساب.',
        benefit: 'إشراك ولي الأمر في رحلة حفظ ابنه وتوفير شفافية كاملة لأداء الطالب.',
        howItWorks: 'يولد النظام نصاً منسقاً يحتوي على (المقدار المحفوظ، الدرجة، الحضور، الملاحظات) جاهزاً للإرسال بضغطة زر.',
        whenToUse: 'عقب نهاية كل جلسة قرآنية.',
        howToUse: [
            'بعد اعتماد الجلسة أو من سجل الطالب، اضغط على زر "مشاركة مع ولي الأمر".',
            'اختر إرسال التقرير الفردي أو تقرير الحلقة الشامل.'
        ]
    },
    {
        id: 'tests_plans_activities',
        title: 'الاختبارات والخطط والنشاطات والأخبار',
        category: 'الأنشطة والتخطيط',
        icon: FaClipboardCheck,
        overview: 'حزمة أدوات متكاملة لجدولة الاختبارات المرحلية، وضع الخطة الأسبوعية/الشهرية، ونشر أخبار الحلقة.',
        benefit: 'رفع المستوى المنهجي للحلقة والانتقال من العمل العشوائي إلى التخطيط المؤسسي المحكم.',
        howItWorks: 'يتم إدخال الخطة الزمنية للحفظ ومقارنتها بما تم إنجازه فعلياً مع جدولة الاختبارات وتكريم المتميزين.',
        whenToUse: 'عند بداية كل مرحلة دراسية أو أسبوعياً لتنظيم الأنشطة.',
        howToUse: [
            'من لوحة الخدمات اختر "الخطط" أو "الاختبارات" أو "النشاطات".',
            'انقر على "+ جديد" وأدخل المواعيد والمستهدفين.',
            'ستظهر التنبيهات للطلاب في المواعيد المحددة.'
        ]
    },
    {
        id: 'reports_stats',
        title: 'التقارير بجميع أنواعها والإحصائيات الشاملة',
        category: 'التواصل والتقارير',
        icon: FaChartBar,
        overview: 'لوحة تقارير تحليلية تولد تقارير تفصيلية ورسوم بيانية لأداء الحلقة خلال أي فترة زمنية.',
        benefit: 'مساعدة إدارة المركز والمشرفين على قياس جودة التعليم واتخاذ القرارات التطويرية المناسبة.',
        howItWorks: 'تُعالج البيانات المتراكمة لتحويلها إلى مؤشرات أداء (نسب الحضور، معدل الإنجاز، متوسط الدرجات).',
        whenToUse: 'عند التقييم الشهري أو الفصلي أو تقديم تقارير للمؤسسات الداعمة.',
        howToUse: [
            'افتح قسم "التقارير" أو "الإحصائيات".',
            'حدد الفترة الزمنية ونوع التقرير المطلوب (تقرير شامل، تقرير معلم، تقرير طالب).',
            'اضغط طباعة أو تصدير التقرير.'
        ]
    },
    {
        id: 'points_leaderboard',
        title: 'نظام النقاط ولوحة الشرف والمكافآت',
        category: 'التحفيز والجوائز',
        icon: FaTrophy,
        overview: 'محرك تحفيزي يمنح الطلاب نقاطاً تلقائية بناءً على الحضور المالي والدرجات العالية في التسميع.',
        benefit: 'خلق روح المنافسة الشريفة بين الطلاب وتشجيعهم على الالتزام والاستمرار.',
        howItWorks: 'تُضاف النقاط وفق قواعد قابلة للتعديل من الإعدادات، وتتحدث لوحة الشرف (Leaderboard) في الوقت الفعلي.',
        whenToUse: 'تحفيز مستمر يومي وتوزيع الجوائز في التكريم الدوري.',
        howToUse: [
            'اضبط قيم النقاط للحضور والتسميع من إعدادات الحلقة.',
            'استعرض قائمة "لوحة الشرف" لمعرفة الطلاب المتصدرين.',
            'استخدم قسم "إدارة المكافآت" لاستبدال النقاط بجوائز.'
        ]
    },
    {
        id: 'archive_restore',
        title: 'الأرشيف واستعادة بيانات الطلاب',
        category: 'الهيكلة والإدارة',
        icon: FaArchive,
        overview: 'مستودع آمن لحفظ بيانات الطلاب المنسحبين أو الخريجين مع إمكانية استعادتهم بكامل سجلاتهم التاريخية.',
        benefit: 'تخفيف ازدحام الكشف اليومي مع المحافظة التامة على الأرشيف التاريخي لكل طالب.',
        howItWorks: 'عند تحويل طالب للأرشيف يختفي من الكشف الفعال وتُحفظ سجلاته السابقة، ويمكن إرجاعه بنقرة زر.',
        whenToUse: 'عند تخرج الطالب أو انقطاعه لفترة طويلة.',
        howToUse: [
            'من القائمة الرئيسية اذهب إلى "الأرشيف".',
            'تصفح قائمة الطلاب المؤرشفين.',
            'اضغط "استعادة" لإرجاع الطالب إلى كشف الحلقة الفعال.'
        ]
    },
    {
        id: 'backup_restore',
        title: 'النسخ الاحتياطي والاستعادة واستيراد البيانات',
        category: 'البيانات والأمان',
        icon: FaCloudDownloadAlt,
        overview: 'نظام حماية البيانات يتيح تصدير كافة البيانات كملف نسخ احتياطي مشفر أو نص وإعادة استردادها.',
        benefit: 'الحماية المطلقة للبيانات من الضياع عند تغيير الهاتف أو مسح بيانات المتصفح.',
        howItWorks: 'يتم استخراج ملف يحتوي كافة الجلسات والطلاب والإعدادات، ويمكن تحميله أو رفعه في أي وقت.',
        whenToUse: 'يُنصح بإجرائه أسبوعياً أو قبل إجراء صيانة للهاتف.',
        howToUse: [
            'ادخل إلى الإعدادات > النسخ الاحتياطي والاستعادة.',
            'اضغط "إنشاء نسخة احتياطية" واحفظ الملف على جهازك.',
            'لاستعادة البيانات اختر "استعادة" وحدد الملف المخزن سابقاً.'
        ]
    },
    {
        id: 'customization_addons',
        title: 'التخصيص، المظهر، والإضافات الخاصة',
        category: 'البيانات والأمان',
        icon: FaPalette,
        overview: 'خيارات مرنة لتغيير المظهر (الوضع الليلي / الفاتح)، خيارات التسميع، والإضافات المخصصة.',
        benefit: 'تكييف تجربة استخدام التطبيق لتناسب رغبة كل معلم وراحة عينيه أثناء العمل.',
        howItWorks: 'تتيح لوحة الإعدادات التحكم في الألوان، طريقة عرض التسميع، الإشعارات، ووضع الإدخال السريع.',
        whenToUse: 'عند الرغبة في تحسين تجربة الرؤية أو تسريع طريقة إدخال الدرجات.',
        howToUse: [
            'افتح قسم الإعدادات.',
            'فعّل الوضع الداكن أو خيار الإدخال السريع.',
            'تحكم في الإشعار والتنبيهات الصوتية والمظهر.'
        ]
    }
];

const categories = [
    'الكل',
    'أساسيات النظام',
    'الهيكلة والإدارة',
    'شؤون الطلاب',
    'التسميع والمتابعة',
    'التواصل والتقارير',
    'الأنشطة والتخطيط',
    'التحفيز والجوائز',
    'البيانات والأمان'
];

const About: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('الكل');

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'instant' as any });
        const mainEl = document.querySelector('main');
        if (mainEl) mainEl.scrollTop = 0;
    }, []);

    const filteredSections = documentationData.filter(item => {
        const matchesCategory = selectedCategory === 'الكل' || item.category === selectedCategory;
        const query = searchQuery.trim().toLowerCase();
        if (!query) return matchesCategory;

        const matchesQuery = 
            item.title.toLowerCase().includes(query) ||
            item.overview.toLowerCase().includes(query) ||
            item.benefit.toLowerCase().includes(query) ||
            item.howItWorks.toLowerCase().includes(query) ||
            item.whenToUse.toLowerCase().includes(query) ||
            item.howToUse.some(step => step.toLowerCase().includes(query));

        return matchesCategory && matchesQuery;
    });

    return (
        <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="w-full max-w-4xl mx-auto px-2 sm:px-4 py-3 space-y-5 text-right font-sans"
            dir="rtl"
        >
            {/* Header Area */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-4 sm:p-6 shadow-sm border border-gray-100 dark:border-gray-700/60 space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-3">
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={onBack}
                            className="p-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-2xl transition-all active:scale-95 cursor-pointer"
                            aria-label="رجوع"
                        >
                            <FaArrowLeft size={16} />
                        </button>
                        <div>
                            <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100">
                                الدليل الشامل والنظام
                            </h1>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                وثيقة إرشادية رسمية لجميع ميزات ووظائف نظام إدارة الحلقات القرآنية
                            </p>
                        </div>
                    </div>
                    <div className="hidden sm:flex items-center gap-2 bg-primary/10 dark:bg-accent/10 px-3 py-1.5 rounded-2xl text-xs font-bold text-primary dark:text-accent">
                        <FaInfoCircle size={14} />
                        <span>إصدار النظام التكاملي</span>
                    </div>
                </div>

                {/* Live Search Bar */}
                <div className="relative">
                    <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-gray-400">
                        <FaSearch size={14} />
                    </div>
                    <input 
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="ابحث عن ميزة، أداة، أو كلمة مفتاحية (مثل: التسميع، النقاط، المزامنة)..."
                        className="w-full pr-10 pl-10 py-3 bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700/80 rounded-2xl text-xs sm:text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-accent transition-all placeholder:text-gray-400"
                    />
                    {searchQuery && (
                        <button 
                            onClick={() => setSearchQuery('')}
                            className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                        >
                            <FaTimes size={13} />
                        </button>
                    )}
                </div>

                {/* Category Filters */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                    {categories.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                                selectedCategory === cat
                                    ? 'bg-primary text-white shadow-xs'
                                    : 'bg-gray-100 dark:bg-gray-700/60 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                            }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* Results Count Bar */}
            <div className="flex items-center justify-between px-2 text-xs text-gray-500 dark:text-gray-400 font-medium">
                <span>
                    عرض {filteredSections.length} من أصل {documentationData.length} ميزة
                </span>
                {searchQuery && (
                    <span className="text-primary dark:text-accent font-bold">
                        نتائج البحث عن: "{searchQuery}"
                    </span>
                )}
            </div>

            {/* Sections Container */}
            <div className="space-y-4">
                {filteredSections.length === 0 ? (
                    <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 text-center border border-gray-100 dark:border-gray-700/60 space-y-3">
                        <FaQuestionCircle className="mx-auto text-gray-300 dark:text-gray-600" size={36} />
                        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">لم يتم العثور على أي نتائج</h3>
                        <p className="text-xs text-gray-400 max-w-sm mx-auto">
                            جرب استخدام كلمات بحث مختلفة مثل "المصحف" أو "النقاط" أو اختر تصنيفاً آخر.
                        </p>
                    </div>
                ) : (
                    filteredSections.map((section) => (
                        <motion.div 
                            key={section.id}
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white dark:bg-gray-800 rounded-3xl p-4 sm:p-5 shadow-xs border border-gray-100 dark:border-gray-700/60 space-y-4 hover:border-primary/30 dark:hover:border-accent/30 transition-all"
                        >
                            {/* Section Header */}
                            <div className="flex items-start justify-between gap-3 border-b border-gray-100 dark:border-gray-700/80 pb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-primary/10 dark:bg-accent/10 text-primary dark:text-accent flex items-center justify-center flex-shrink-0">
                                        <section.icon size={18} />
                                    </div>
                                    <div>
                                        <h2 className="text-sm sm:text-base font-bold text-gray-900 dark:text-gray-100">
                                            {section.title}
                                        </h2>
                                        <span className="inline-block mt-0.5 text-[10px] font-semibold text-primary dark:text-accent bg-primary/5 dark:bg-accent/5 px-2 py-0.5 rounded-lg border border-primary/10 dark:border-accent/10">
                                            {section.category}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Section Overview */}
                            <p className="text-xs sm:text-sm leading-relaxed text-gray-700 dark:text-gray-300 font-normal">
                                {section.overview}
                            </p>

                            {/* Detailed Grid: 4 Core Questions */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                                {/* Benefit */}
                                <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl space-y-1">
                                    <h4 className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                                        <FaCheckCircle size={12} />
                                        ما فائدتها؟
                                    </h4>
                                    <p className="text-[11px] sm:text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                                        {section.benefit}
                                    </p>
                                </div>

                                {/* How It Works */}
                                <div className="p-3 bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 rounded-2xl space-y-1">
                                    <h4 className="text-[11px] font-bold text-blue-800 dark:text-blue-300 flex items-center gap-1.5">
                                        <FaCog size={12} />
                                        كيف تعمل؟
                                    </h4>
                                    <p className="text-[11px] sm:text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                                        {section.howItWorks}
                                    </p>
                                </div>

                                {/* When To Use */}
                                <div className="p-3 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-2xl space-y-1 md:col-span-2">
                                    <h4 className="text-[11px] font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                                        <FaHistory size={12} />
                                        متى تُستخدم؟
                                    </h4>
                                    <p className="text-[11px] sm:text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                                        {section.whenToUse}
                                    </p>
                                </div>
                            </div>

                            {/* How To Use Steps */}
                            <div className="p-3.5 bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-700/60 rounded-2xl space-y-2">
                                <h4 className="text-[11px] font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                                    <FaRocket className="text-primary dark:text-accent" size={12} />
                                    طريقة الاستخدام والتفعيل خطوة بخطوة:
                                </h4>
                                <ol className="space-y-1.5 pr-2">
                                    {section.howToUse.map((step, idx) => (
                                        <li key={idx} className="flex items-start gap-2 text-[11px] sm:text-xs text-gray-600 dark:text-gray-300">
                                            <span className="w-4 h-4 rounded-full bg-primary/10 dark:bg-accent/10 text-primary dark:text-accent font-bold text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">
                                                {idx + 1}
                                            </span>
                                            <span className="leading-relaxed">{step}</span>
                                        </li>
                                    ))}
                                </ol>
                            </div>
                        </motion.div>
                    ))
                )}
            </div>

            {/* Footer Notes */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 text-center border border-gray-100 dark:border-gray-700 space-y-2">
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                    تطبيق إدارة الحلقات القرآنية — مشروع مجاني يبتغي وجه الله تعالى
                </p>
                <p className="text-[11px] text-gray-400 dark:text-gray-500">
                    تم تطوير هذا النظام بأعلى معايير الأداء لخدمة أهل القرآن الكريم المعلمين والمدرسين والمراكز.
                </p>
            </div>
        </motion.div>
    );
};

export default About;

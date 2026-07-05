import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
    FaArrowLeft, FaHeart, FaWrench, FaBookOpen, FaUsers, FaCalendarAlt, FaBook, 
    FaChartBar, FaCog, FaPalette, FaList, 
    FaTrophy, FaIdCard, FaShareAlt, FaRocket, FaFileAlt, FaLock, FaQuestionCircle, FaSave, FaUpload, FaSearch, FaStar, FaPen, FaPeopleArrows, FaBell
} from 'react-icons/fa';

const pageVariants = { initial: {opacity: 0}, animate: {opacity: 1} };

const InfoSection: React.FC<{ title: string; icon: React.ElementType; children: React.ReactNode }> = ({ title, icon: Icon, children }) => (
    <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
        <h3 className="font-bold text-lg flex items-center gap-3 text-primary dark:text-accent">
            <div className="bg-primary/10 dark:bg-accent/10 p-2 rounded-md">
                <Icon className="text-primary dark:text-accent" />
            </div>
            {title}
        </h3>
        <div className="text-sm leading-relaxed text-gray-700 dark:text-gray-300 space-y-2 pl-2 border-r-2 border-primary/20 dark:border-accent/20 pr-4">
            {children}
        </div>
    </div>
);

const About: React.FC<{onBack: () => void}> = ({onBack}) => {
    
    useEffect(() => {
        // Find the main scrollable container and scroll it to the top when the component mounts.
        const mainContentArea = document.querySelector('main');
        if (mainContentArea) {
            mainContentArea.scrollTop = 0;
        }
    }, []);
    
    return (
        <motion.div variants={pageVariants} initial="initial" animate="animate" className="bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="p-4">
                <div className="flex items-center gap-3 mb-4 pb-4 border-b dark:border-gray-700">
                    <button onClick={onBack}><FaArrowLeft /></button>
                    <h2 className="text-xl font-bold text-primary dark:text-accent">حول التطبيق</h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm leading-relaxed">
                    <InfoSection title="رسالة التطبيق" icon={FaHeart}>
                        <p>
                            هذا التطبيق هو مساعدك الرقمي لإدارة حلقتك القرآنية بكل سهولة وبساطة. وُلدت فكرته من نقاش مع طفل صغير في مركز لتحفيظ القرآن، فسبحان من ألهم الفكرة ويسّر تطبيقها لخدمة أهل القرآن.
                        </p>
                        <p>
                            <strong>رسالتنا:</strong> أن يكون هذا التطبيق عوناً لك يا معلم القرآن، لتتفرغ للتعليم والتربية، بينما يتولى عنك عناء التنظيم والمتابعة اليدوية، مما يرفع من جودة الحلقة ويحفز الطلاب.
                        </p>
                    </InfoSection>

                    <InfoSection title="دليلك الشامل للميزات" icon={FaRocket}>
                        <ul className="list-disc pr-5 space-y-5">
                            <li>
                                <strong>إدارة الطلاب <FaUsers className="inline mx-1"/>:</strong>
                                <ul className="list-[circle] pr-4 mt-2 space-y-2">
                                    <li>أضف طلابك، بياناتهم، صورهم، وأرقام أولياء الأمور.</li>
                                    <li>أوقفهم مؤقتاً عن الحفظ أو المراجعة، وأعد ترتيبهم بالسحب والإفلات لتسهيل كشف الحضور.</li>
                                    <li><strong>نقل طالب <FaPeopleArrows className="inline mx-1"/>:</strong> انقل طالباً إلى حلقة أخرى مع كامل سجله التاريخي (الجلسات، النقاط، الإحصائيات).</li>
                                </ul>
                            </li>
                             <li>
                                <strong>بطاقة الطالب الذكية <FaIdCard className="inline mx-1"/>:</strong>
                                 <ul className="list-[circle] pr-4 mt-2 space-y-2">
                                    <li>بضغطة على صورة الطالب، تظهر لوحة تحكم شاملة لأدائه: نسبة الحضور، الالتزام، ترتيبه، ورسم بياني لتطوره.</li>
                                     <li><strong>سجل النقاط <FaStar className="inline mx-1"/>:</strong> اطلع على سجل مفصل لكل نقطة اكتسبها الطالب أو فقدها.</li>
                                     <li><strong>تعديل النقاط:</strong> أضف أو اخصم نقاطاً يدوياً كمكافأة أو عقوبة مع ذكر السبب.</li>
                                </ul>
                            </li>
                            <li>
                                <strong>تسجيل الجلسات <FaCalendarAlt className="inline mx-1"/>:</strong>
                                 <ul className="list-[circle] pr-4 mt-2 space-y-2">
                                     <li>أنشئ جلسات يومية وسجل الحضور والتسميع بضغطة زر.</li>
                                     <li><strong>تحديد الطلاب:</strong> اختر هل الجلسة لجميع الطلاب أم لمجموعة محددة منهم.</li>
                                     <li><strong>وضع الدرس:</strong> يمكنك تحويل الجلسة إلى "درس" لتسجيل الحضور فقط (مثل درس فقه، سيرة...).</li>
                                     <li><strong>حفظ المسودات <FaSave className="inline mx-1"/>:</strong> فعّل الحفظ التلقائي من الإعدادات لحفظ أي جلسة غير مكتملة كمسودة عند الخروج.</li>
                                </ul>
                            </li>
                            <li>
                                <strong>السجل الفردي للطلاب <FaBook className="inline mx-1"/>:</strong>
                                 <ul className="list-[circle] pr-4 mt-2 space-y-2">
                                     <li>استعرض السجل اليومي المفصل لأي طالب.</li>
                                     <li><strong>البحث بالتاريخ <FaSearch className="inline mx-1"/>:</strong> انتقل بسرعة إلى سجل يوم معين لمعرفة أداء الطالب فيه.</li>
                                     <li><strong>إنشاء تقارير:</strong> أنشئ تقريراً خاصاً بالطالب لأي فترة زمنية، وخصص محتواه (الحضور، التسميع...)، ثم احفظه أو شاركه.</li>
                                </ul>
                            </li>
                             <li>
                                <strong>الإحصائيات والتقارير <FaChartBar className="inline mx-1"/>:</strong>
                                 <ul className="list-[circle] pr-4 mt-2 space-y-2">
                                    <li>اطلع على رسوم بيانية وتحليلات دقيقة لأداء الحلقة (نسب الحضور، الالتزام...).</li>
                                     <li>فلترة البيانات حسب أي فترة زمنية تريدها.</li>
                                     <li><strong>تقارير المشرفين:</strong> بضغطة زر، جهّز تقريراً شاملاً للمشرف يلخص أداء الحلقة بالكامل.</li>
                                </ul>
                            </li>
                            <li>
                                <strong>نظام النقاط والمنافسة <FaTrophy className="inline mx-1"/>:</strong>
                                 <ul className="list-[circle] pr-4 mt-2 space-y-2">
                                     <li><strong>لوحة الشرف (ليدربورد):</strong> اكتشف ترتيب الطلاب الأكثر تفوقاً بناءً على النقاط خلال أي فترة تختارها.</li>
                                     <li><strong>نظام قابل للتخصيص:</strong> من الإعدادات، تحكم بشكل كامل في عدد النقاط الممنوحة لكل شيء (حضور، غياب، تسميع...).</li>
                                </ul>
                            </li>
                            <li>
                                <strong>المشاركة المرنة <FaShareAlt className="inline mx-1"/>:</strong>
                                 <ul className="list-[circle] pr-4 mt-2 space-y-2">
                                    <li><strong>تقرير جماعي:</strong> شارك تقرير الجلسة اليومي كرسالة واحدة في مجموعة الحلقة.</li>
                                     <li><strong>إعلام فردي:</strong> أرسل لكل ولي أمر تقرير ابنه الخاص بضغطة زر.</li>
                                </ul>
                            </li>
                        </ul>
                    </InfoSection>

                    <InfoSection title="الإعدادات والتخصيص" icon={FaCog}>
                        <ul className="list-disc pr-5 space-y-3">
                            <li>
                                <strong>إدارة عدة حلقات:</strong>
                                أنشئ عدة حلقات وتنقل بينها بكل بساطة. كل حلقة لها بياناتها وإعداداتها الخاصة.
                            </li>
                            <li>
                                <strong>الإضافات والمظهر <FaPalette className="inline mx-1"/>:</strong>
                                 تحكم كامل في تجربة استخدامك: الوضع الفاتح والغامق، تفعيل ميزة "آخر تسميع" لتسريع الإدخال، اختيار طريقة إدخال السور (قائمة أو كتابة يدوية)، والمزيد.
                            </li>
                             <li>
                                <strong>إعدادات الإشعارات <FaBell className="inline mx-1"/>:</strong>
                                خصص التنبيهات التي تظهر لك، مثل تنبيهك عند غياب طالب لعدد معين من الأيام.
                            </li>
                             <li>
                                <strong>النسخ الاحتياطي والاستعادة <FaSave className="inline mx-1"/>:</strong>
                                قم بإنشاء نسخة احتياطية من بيانات حلقتك لحفظها في مكان آمن، واسترجعها بسهولة عند الحاجة. (ملاحظة: قد لا تعمل ميزة حفظ الملف على بعض الهواتف، والحل البديل هو نسخ النص).
                            </li>
                        </ul>
                    </InfoSection>

                    <InfoSection title="خصوصية وأمان بياناتك" icon={FaLock}>
                        <p>
                           <strong>بياناتك ملكك وحدك!</strong> كل المعلومات التي تدخلها (بيانات الطلاب، الجلسات، إلخ) تُحفظ بشكل آمن على جهازك فقط ولا يتم رفعها إلى أي خوادم.
                        </p>
                        <p>
                           <strong>يعمل بدون إنترنت:</strong> يمكنك استخدام جميع ميزات التطبيق بالكامل بدون الحاجة لاتصال بالإنترنت.
                        </p>
                         <p className="font-bold mt-2 text-red-500 dark:text-red-400">
                           <strong>مهم جداً!</strong> بما أن البيانات على جهازك فقط، قم بعمل نسخة احتياطية بشكل دوري لضمان عدم ضياع جهدك في حال فقدان الجهاز أو تلفه.
                        </p>
                    </InfoSection>
                    
                     <InfoSection title="انضم لمجتمع التطبيق" icon={FaUsers}>
                        <p>
                            انضم لمجتمع معلمي القرآن المستخدمين للتطبيق على واتساب أو تليجرام لمشاركة الخبرات، الاطّلاع على التحديثات الجديدة، واقتراح الميزات. تجد الروابط في صفحة الإعدادات.
                        </p>
                    </InfoSection>

                    <InfoSection title="رسالة من المطور" icon={FaHeart}>
                        <p>
                            هذا التطبيق مجاني بالكامل، بلا إعلانات، والهدف منه هو وجه الله تعالى. فإن وجدت فيه خيراً أو كان لديك اقتراح يجعله أفضل، فلا تتردد في مراسلتي.
                        </p>
                         <div className="mt-4 p-3 bg-primary/10 dark:bg-accent/10 rounded-lg text-center">
                            <p className="font-bold text-primary dark:text-accent">
                                أفضل دعم تقدمه لي هو أن تدعو لي ولوالدي ولمن أحب بالهداية والجنة والتوفيق.
                            </p>
                            <p className="text-xs mt-2 font-semibold">
                                عبدالله مبارك عبدالسلام المخلافي - اليمن - تعز
                            </p>
                        </div>
                    </InfoSection>
                </div>
            </div>
        </motion.div>
    );
};

export default About;

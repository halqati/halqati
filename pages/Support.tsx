
import React from 'react';
import { motion } from 'framer-motion';
import { FaHeart, FaCrown, FaHandHoldingHeart, FaCopy, FaWhatsapp, FaUniversity, FaEnvelopeOpenText, FaAward, FaChevronRight } from 'react-icons/fa';
import { IoDiamond } from 'react-icons/io5';

interface SupportProps {
    onBack: () => void;
    addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const Support: React.FC<SupportProps> = ({ onBack, addToast }) => {
    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        addToast(`تم نسخ ${label} بنجاح`, 'success');
    };

    const paymentAccounts = [
        {
            title: 'حساب الكريمي - سعودي',
            number: '3162810862',
            icon: FaUniversity,
            color: 'text-amber-600',
            bgColor: 'bg-amber-50 dark:bg-amber-900/10',
            borderColor: 'border-amber-100 dark:border-amber-900/20'
        },
        {
            title: 'حساب الكريمي - يمني',
            number: '3162797394',
            icon: FaUniversity,
            color: 'text-green-600',
            bgColor: 'bg-green-50 dark:bg-green-900/10',
            borderColor: 'border-green-100 dark:border-green-900/20'
        },
        {
            title: 'محفظة جيب (Jeep)',
            number: '779516077',
            icon: FaHandHoldingHeart,
            color: 'text-blue-600',
            bgColor: 'bg-blue-50 dark:bg-blue-900/10',
            borderColor: 'border-blue-100 dark:border-blue-900/20'
        }
    ];

    const benefits = [
        {
            title: 'الأولوية في الميزات',
            desc: 'اقتراحاتك لها الأولوية القصوى في التنفيذ والتطوير المستقبلي.',
            icon: FaCrown,
            color: 'text-yellow-500'
        },
        {
            title: 'دعم الاستمرارية',
            desc: 'مساهمتك تضمن بقاء التطبيق مجانياً وخالياً من الإعلانات للجميع.',
            icon: FaHeart,
            color: 'text-red-500'
        },
        {
            title: 'صدقة جارية',
            desc: 'كل حرف يُحفظ أو يُتلى عبر هذا التطبيق لك فيه أجر إن شاء الله.',
            icon: FaAward,
            color: 'text-emerald-500'
        }
    ];

    return (
        <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6 pb-10"
        >
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 relative overflow-hidden">
                <div className="relative z-10">
                    <button 
                        onClick={onBack}
                        className="mb-4 p-2 bg-gray-50 dark:bg-gray-700 rounded-xl text-gray-500 hover:text-primary transition-colors active:scale-95"
                    >
                        <FaChevronRight size={16} />
                    </button>
                    <div className="flex flex-col items-center text-center">
                        <div className="w-20 h-20 bg-primary/10 dark:bg-accent/10 rounded-full flex items-center justify-center mb-4 relative">
                            <IoDiamond className="text-primary dark:text-accent text-4xl animate-pulse" />
                            <motion.div 
                                animate={{ scale: [1, 1.2, 1] }} 
                                transition={{ repeat: Infinity, duration: 2 }}
                                className="absolute -top-1 -right-1 bg-yellow-400 text-white p-1.5 rounded-full shadow-lg"
                            >
                                <FaCrown size={12} />
                            </motion.div>
                        </div>
                        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">الانتساب والدعم</h1>
                        <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed max-w-xs">
                            ساهم في رحلة تطوير "تطبيق الحلقات" لنستمر في خدمة كتاب الله بعطاء وإبداع.
                        </p>
                    </div>
                </div>
                {/* Background Decor */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-accent/5 rounded-full -ml-16 -mb-16 blur-3xl"></div>
            </div>

            {/* Information Section */}
            <div className="px-1">
                <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
                    <FaAward className="text-yellow-500" />
                    <span>مميزات المنتسبين</span>
                </h2>
                <div className="grid grid-cols-1 gap-3">
                    {benefits.map((benefit, idx) => (
                        <div key={idx} className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 flex gap-4 items-start shadow-sm">
                            <div className={`${benefit.color} p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl`}>
                                <benefit.icon size={20} />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-800 dark:text-gray-100 text-sm mb-1">{benefit.title}</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{benefit.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Payment Details */}
            <div className="px-1">
                <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
                    <FaUniversity className="text-primary dark:text-accent" />
                    <span>طرق الدعم المتاحة</span>
                </h2>
                <div className="space-y-3">
                    {paymentAccounts.map((acc, idx) => (
                        <div 
                            key={idx} 
                            className={`${acc.bgColor} ${acc.borderColor} border p-4 rounded-2xl flex items-center justify-between group transition-all hover:shadow-md cursor-pointer`}
                            onClick={() => copyToClipboard(acc.number, acc.title)}
                        >
                            <div className="flex items-center gap-4">
                                <div className={`${acc.color} p-2 bg-white/50 dark:bg-black/20 rounded-xl`}>
                                    <acc.icon size={18} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-0.5">{acc.title}</p>
                                    <p className="text-lg font-mono font-bold text-gray-700 dark:text-gray-200">{acc.number}</p>
                                </div>
                            </div>
                            <button className="p-2 bg-white/80 dark:bg-black/20 rounded-lg text-gray-400 group-hover:text-primary transition-colors">
                                <FaCopy size={14} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Contact Section */}
            <div className="bg-gradient-to-br from-primary/10 to-accent/10 dark:from-primary/5 dark:to-accent/5 p-6 rounded-3xl border border-primary/20 dark:border-accent/20 text-center shadow-lg shadow-primary/5">
                <FaEnvelopeOpenText className="text-primary dark:text-accent mx-auto mb-3" size={30} />
                <h2 className="font-bold text-gray-800 dark:text-gray-100 mb-2">هل لديك استفسار؟</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-6 px-4">
                    يمكنك التواصل مباشرة معنا لمناقشة ميزات خاصة أو طرق دعم أخرى.
                </p>
                <div className="flex flex-col gap-3">
                    <a 
                        href="https://wa.me/779516077" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="bg-green-500 text-white py-3 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-green-600 transition-all active:scale-95 shadow-lg shadow-green-500/20"
                    >
                        <FaWhatsapp size={18} />
                        تواصل عبر الواتساب
                    </a>
                    <p className="text-[10px] text-gray-400 font-medium">نحن هنا دائماً لسماع مقترحاتكم</p>
                </div>
            </div>

            {/* Footer Note */}
            <div className="text-center px-6">
                <p className="text-[10px] text-gray-400 dark:text-gray-500 leading-relaxed italic">
                    "تطبيق الحلقات" مشروع مجاني بالكامل يبتغي وجه الله وبنائه تم بجهود ذاتية، دعمكم هو الوقود الذي يجعلنا نستمر.
                </p>
            </div>
        </motion.div>
    );
};

export default Support;

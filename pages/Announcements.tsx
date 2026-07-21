import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Announcement } from '../types';
import { FaArrowLeft, FaPlus, FaEdit, FaTrash, FaEye, FaBullhorn } from 'react-icons/fa';
import { formatDate } from '../utils/helpers';

interface AnnouncementsProps {
    announcements: Announcement[];
    isDraft: boolean;
    onBack: () => void;
    onNew: () => void;
    onEdit: (announcement: Announcement) => void;
    onDelete: (announcementId: number) => void;
    onView: (announcement: Announcement) => void;
    recentAnnouncementId?: number | null;
}

const pageVariants = {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 }
};

const Announcements: React.FC<AnnouncementsProps> = ({ 
    announcements, 
    isDraft, 
    onBack, 
    onNew, 
    onEdit, 
    onDelete, 
    onView,
    recentAnnouncementId
}) => {

    const [highlightedId, setHighlightedId] = useState<number | null>(recentAnnouncementId || null);

    useEffect(() => {
        if (recentAnnouncementId) {
            setHighlightedId(recentAnnouncementId);
            const timer = setTimeout(() => {
                setHighlightedId(null);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [recentAnnouncementId]);

    const sortedAnnouncements = [...announcements].sort((a, b) => b.createdAt - a.createdAt);

    return (
        <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
            <div className="flex items-center justify-between mb-6 pb-4 border-b dark:border-gray-700">
                <div className="flex items-center gap-3">
                    <button onClick={onBack}><FaArrowLeft /></button>
                    <h2 className="text-xl font-bold text-primary dark:text-accent">إعلام أولياء الأمور</h2>
                </div>
                <button onClick={onNew} className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm">
                    <FaPlus /> {isDraft ? 'إكمال الإعلان' : 'إعلان جديد'}
                </button>
            </div>
            <div className="space-y-3">
                {sortedAnnouncements.length > 0 ? (
                    sortedAnnouncements.map(announcement => {
                        const isHighlighted = announcement.id === highlightedId;
                        return (
                            <motion.div 
                                key={announcement.id} 
                                animate={isHighlighted ? { 
                                    scale: [1, 1.015, 1],
                                    boxShadow: [
                                        "0 0 0 rgba(16, 85, 65, 0)", 
                                        "0 0 15px rgba(16, 85, 65, 0.4)", 
                                        "0 0 0 rgba(16, 85, 65, 0)"
                                    ]
                                } : {}}
                                transition={{ duration: 1.5, repeat: isHighlighted ? 1 : 0 }}
                                className={`p-3 rounded-lg shadow flex items-center justify-between transition-all duration-1000 ${
                                    isHighlighted 
                                        ? 'bg-emerald-50 border-2 border-emerald-500 dark:bg-emerald-950/30 dark:border-emerald-500/60' 
                                        : 'bg-white dark:bg-gray-800 border border-transparent'
                                }`}
                            >
                                <div className="flex-grow min-w-0 ml-2">
                                    <p className="font-bold truncate">{announcement.title}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                        {formatDate(new Date(announcement.createdAt).toISOString().split('T')[0])}
                                    </p>
                                </div>
                                <div className="flex items-center gap-3 flex-shrink-0">
                                    <button onClick={() => onView(announcement)} className="text-green-500"><FaEye /></button>
                                    <button onClick={() => onEdit(announcement)} className="text-blue-500"><FaEdit /></button>
                                    <button onClick={() => onDelete(announcement.id)} className="text-red-500"><FaTrash /></button>
                                </div>
                            </motion.div>
                        );
                    })
                ) : (
                    <div className="text-center text-gray-500 py-10">
                        <FaBullhorn className="mx-auto text-4xl mb-2 text-gray-400" />
                        <p>لا توجد إعلانات محفوظة.</p>
                        <p className="text-sm">ابدأ بإنشاء إعلان جديد لإرساله للأولياء.</p>
                    </div>
                )}
            </div>
        </motion.div>
    );
};

export default Announcements;

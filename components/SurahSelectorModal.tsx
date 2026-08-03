
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes, FaSearch } from 'react-icons/fa';
import { surahs } from '../constants';
import { normalizeText } from '../utils/helpers';

interface SurahSelectorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (surahName: string) => void;
    title: string;
    surahOrder: 'quranic' | 'reverse';
}

const modalVariants = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
};

const contentVariants = {
    initial: { y: '100%' },
    animate: { y: 0 },
    exit: { y: '100%' },
};

const SurahSelectorModal: React.FC<SurahSelectorModalProps> = ({ isOpen, onClose, onSelect, title, surahOrder }) => {
    const [searchTerm, setSearchTerm] = useState('');

    const sortedSurahs = useMemo(() => {
        const surahList = [...surahs];
        if (surahOrder === 'reverse') {
            return [...surahList].reverse();
        }
        return surahList;
    }, [surahOrder]);
    
    const filteredSurahs = useMemo(() => {
        if (!searchTerm) return sortedSurahs;
        const normalizedSearch = normalizeText(searchTerm);
        return sortedSurahs.filter(s => normalizeText(s.name).includes(normalizedSearch));
    }, [searchTerm, sortedSurahs]);

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    variants={modalVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    className="fixed inset-0 bg-black/60 z-[500] flex flex-col justify-end"
                    onClick={onClose}
                >
                    <motion.div
                        variants={contentVariants}
                        transition={{ type: 'spring', stiffness: 400, damping: 40 }}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white dark:bg-gray-900 rounded-t-[2.5rem] h-[80vh] max-w-lg mx-auto w-full flex flex-col shadow-2xl border-t dark:border-gray-800"
                    >
                        <header className="flex-shrink-0 p-4 border-b dark:border-gray-800 relative text-center">
                            <h2 className="text-base font-bold text-gray-900 dark:text-white">{title}</h2>
                            <button onClick={onClose} className="absolute left-4 top-1/2 -translate-y-1/2 p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 cursor-pointer">
                                <FaTimes />
                            </button>
                        </header>
                        
                        <div className="p-3 flex-shrink-0">
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="ابحث عن سورة..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className="w-full p-2.5 pr-10 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-sm font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-600"
                                />
                                <FaSearch className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400" />
                            </div>
                        </div>

                        <div className="flex-grow overflow-y-auto px-2 pb-4">
                            {filteredSurahs.map((surah) => (
                                <button
                                    key={surah.name}
                                    onClick={() => onSelect(surah.name)}
                                    className="w-full text-right p-3.5 flex justify-between items-center hover:bg-amber-50 dark:hover:bg-gray-800 rounded-xl transition border-b border-gray-100 dark:border-gray-800 cursor-pointer"
                                >
                                    <span className="font-bold text-gray-900 dark:text-gray-100">{surah.name}</span>
                                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-full">{surah.verses} آية</span>
                                </button>
                            ))}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default SurahSelectorModal;


import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, CircleData } from '../types';
import { FaTimes, FaWhatsapp, FaCheck, FaFilter } from 'react-icons/fa';
import { generateActivityParentNotification } from '../utils/helpers';
import StudentAvatar from './StudentAvatar';
import useLocalStorage from '../hooks/useLocalStorage';

interface ActivityNotificationModalProps {
    activity: Activity;
    circleData: CircleData;
    onClose: () => void;
    onNotificationSent: (activityId: number, studentId: number) => void;
    addToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

const modalVariants = {
  initial: { scale: 0.9, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  exit: { scale: 0.9, opacity: 0 },
};

const ActivityNotificationModal: React.FC<ActivityNotificationModalProps> = ({ activity, circleData, onClose, onNotificationSent, addToast }) => {
    const [filter, setFilter] = useLocalStorage<'all' | 'sent' | 'not_sent'>('notification_filter', 'all');
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    
    const sentStatus = activity.parentNotifications || {};

    const filteredStudents = circleData.students
        .filter(s => activity.targetStudentIds.includes(s.id))
        .filter(s => {
            const isSent = sentStatus[s.id];
            if (filter === 'sent') return isSent;
            if (filter === 'not_sent') return !isSent;
            return true;
        })
        .sort((a,b) => a.order-b.order);

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div variants={modalVariants} initial="initial" animate="animate" exit="exit" className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md h-[80vh] flex flex-col transition-colors duration-300">
                <div className="flex justify-between items-center mb-4 flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <h2 className="text-xl font-bold text-primary dark:text-accent">إعلام بالنشاط</h2>
                        <div className="relative">
                            <button 
                                onClick={() => setIsFilterOpen(!isFilterOpen)}
                                className={`p-1 rounded-full transition-all ${filter !== 'all' ? 'text-primary dark:text-accent opacity-100 bg-primary/10 dark:bg-accent/10' : 'text-gray-300 dark:text-gray-600 opacity-50 hover:opacity-100'}`}
                                title="تصفية القائمة"
                            >
                                <FaFilter size={12} />
                            </button>
                            <AnimatePresence>
                                {isFilterOpen && (
                                    <>
                                    <div className="fixed inset-0 z-10" onClick={() => setIsFilterOpen(false)}></div>
                                    <motion.div 
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="absolute top-full right-0 mt-1 w-32 bg-white dark:bg-gray-700 rounded-lg shadow-xl border border-gray-100 dark:border-gray-600 z-20 overflow-hidden text-xs"
                                    >
                                        <button onClick={() => { setFilter('all'); setIsFilterOpen(false); }} className={`block w-full text-right p-2 hover:bg-gray-100 dark:hover:bg-gray-600 ${filter === 'all' ? 'font-bold text-primary dark:text-accent bg-gray-50 dark:bg-gray-600/50' : ''}`}>الكل</button>
                                        <button onClick={() => { setFilter('sent'); setIsFilterOpen(false); }} className={`block w-full text-right p-2 hover:bg-gray-100 dark:hover:bg-gray-600 ${filter === 'sent' ? 'font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20' : ''}`}>تم الإرسال</button>
                                        <button onClick={() => { setFilter('not_sent'); setIsFilterOpen(false); }} className={`block w-full text-right p-2 hover:bg-gray-100 dark:hover:bg-gray-600 ${filter === 'not_sent' ? 'font-bold text-primary dark:text-accent bg-blue-50 dark:bg-blue-900/20' : ''}`}>لم يتم الإرسال</button>
                                    </motion.div>
                                    </>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                    <button onClick={onClose}><FaTimes /></button>
                </div>
                <div className="flex-grow overflow-y-auto space-y-1">
                    {filteredStudents.length === 0 ? (
                        <p className="text-center text-gray-500 py-10">لا يوجد طلاب مطابقين للفلتر.</p>
                    ) : (
                        filteredStudents.map(student => {
                            const isSent = sentStatus[student.id];
                            return (
                                <div key={student.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                    <div className="flex items-center gap-2">
                                      <StudentAvatar photo={student.photo} name={student.name} id={student.id} className="w-8 h-8 rounded-full object-cover" />
                                      <div>
                                        <p className="font-semibold text-sm leading-tight">{student.name}</p>
                                        <p className="text-[10px] text-gray-500">{student.parentPhone || 'لا يوجد رقم'}</p>
                                      </div>
                                    </div>
                                    <a 
                                      href={student.parentPhone ? `https://wa.me/${student.parentPhone}?text=${generateActivityParentNotification(student, activity, circleData)}` : '#'}
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      onClick={(e) => { 
                                          if(!student.parentPhone) { 
                                              e.preventDefault(); 
                                              addToast('لا يوجد رقم ولي أمر مسجل لهذا الطالب.', 'error'); 
                                          } else {
                                              onNotificationSent(activity.id, student.id);
                                          }
                                      }}
                                      className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg transition-colors ${
                                        student.parentPhone
                                          ? (isSent ? 'bg-green-500 text-white' : 'bg-primary text-white')
                                          : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                                      }`}
                                    >
                                      {isSent ? <FaCheck size={10} /> : <FaWhatsapp size={10} />}
                                      {isSent ? 'تم' : 'إرسال'}
                                    </a>
                                </div>
                            );
                        })
                    )}
                </div>
            </motion.div>
        </div>
    );
};

export default ActivityNotificationModal;
